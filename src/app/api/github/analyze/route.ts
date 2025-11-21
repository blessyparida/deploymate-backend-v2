// src/app/api/github/analyze/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { cloneRepo } from '../utils/clonerepo';
import { detectStack } from '../utils/detectstack';
import { generateConfigs } from '../utils/generateconfigs';
import { commitAndPR } from '../utils/githubactions';

// ----------------------
// 🛡️ Allowed Origins
// ----------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://deploymate-frontend-959o4z711-blessy-paridas-projects.vercel.app",
];

// ----------------------
// 🛡️ CORS Headers
// ----------------------
function corsHeaders(origin: string | null) {
  const isAllowed =
    origin?.includes("deploymate-frontend") ||
    allowedOrigins.includes(origin ?? "");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ----------------------
// ⚙️ OPTIONS (MUST EXIST)
// ----------------------
export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// ----------------------
// 🚀 POST – MAIN API
// ----------------------
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");

    // ❌ Reject If CORS Not Allowed
    if (origin && !allowedOrigins.includes(origin ?? "")) {
      return new NextResponse("CORS Error", {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    // 🧠 Get repoUrl
    const { repoUrl } = await req.json();
    if (!repoUrl) throw new Error("repoUrl is required");

    // 1️⃣ Clone Repo
    const { owner, repo, branch, repoDir } = await cloneRepo(repoUrl);

    // 2️⃣ Detect Stack
    const detected = detectStack(repoDir);

    // 3️⃣ Generate Files
    const generated = generateConfigs(repoDir, detected);

    // 4️⃣ Create PR
    const prResult = await commitAndPR({
      owner,
      repo,
      branch,
      repoDir,
      generatedFiles: generated,
    });

    // 5️⃣ Success Response
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

// TEST GET
export async function GET() {
  const headers = corsHeaders("*");
  return NextResponse.json(
    { message: "API Running 🚀" },
    { headers }
  );
}
