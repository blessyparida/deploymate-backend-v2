// app/api/github/analyze/route.ts
import { NextResponse } from 'next/server';
import { cloneRepo } from '../utils/clonerepo';
import { detectStack } from '../utils/detectstack';
import { generateConfigs } from '../utils/generateconfigs';
import { commitAndPR } from '../utils/githubactions';
export const runtime = "edge";


export const dynamic = "force-dynamic"; // Important for Vercel server runtime

// Allowed Origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://deploymate-frontend-959o4z711-blessy-paridas-projects.vercel.app",
];

// CORS Headers (function)
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin ?? "")
      ? origin!
      : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// OPTIONS 🔥 (must exist before POST)
export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// POST 💥 Main Logic
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");

    // CORS Validation
    if (!allowedOrigins.includes(origin ?? "")) {
      return new NextResponse("CORS Error", {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    // 🔹 Extract repo URL from body
    const { repoUrl } = await req.json();
    if (!repoUrl) throw new Error("repoUrl is required");

    console.log("📦 Received repoUrl:", repoUrl);

    // 1️⃣ Clone Repo
    const { owner, repo, branch, repoDir } = await cloneRepo(repoUrl);

    // 2️⃣ Detect Stack
    const detected = detectStack(repoDir);

    // 3️⃣ Generate Config Files
    const generated = generateConfigs(repoDir, detected);

    // 4️⃣ Create PR
    const prResult = await commitAndPR({
      owner,
      repo,
      branch,
      repoDir,
      generatedFiles: generated,
    });

    // 5️⃣ Respond
    return NextResponse.json(
      {
        success: true,
        repo: `${owner}/${repo}`,
        branch,
        detected,
        generated: Object.keys(generated),
        pullRequest: prResult,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    console.error("❌ Error in POST:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// Optional GET for testing 🚀
export async function GET() {
  return NextResponse.json({ message: "API Running 🚀" });
}