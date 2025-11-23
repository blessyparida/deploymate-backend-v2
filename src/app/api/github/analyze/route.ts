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
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : "*",
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
  let origin: string | null = null;
  let cloneNote: string | null = null;
  try {
    origin = req.headers.get("origin");

    // Allow requests with no Origin (e.g., Postman) and explicitly allowed origins.
    const isAllowed =
      origin === null ||
      origin?.includes("deploymate-frontend") ||
      allowedOrigins.includes(origin ?? "");

    if (!isAllowed) {
      return new NextResponse("CORS Error", {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    const { repoUrl } = await req.json();
    if (!repoUrl) throw new Error("repoUrl is required");

    // 1️⃣ Clone Repo (OR use API mode)
    const cloneResult = await cloneRepo(repoUrl);
    const { owner, repo, branch, repoDir, files, note } = cloneResult as any;
    cloneNote = note || null;
    if (note) console.log("🔎 cloneRepo note:", note);

    // 🧠 Detect stack from local OR API list
    const detected = detectStack(repoDir ?? files);

    // ❌ If no detection possible — stop
    if (detected.error) {
      return NextResponse.json(
        { success: false, error: detected.error },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // 3️⃣ Generate Files — in-memory or on-disk depending on repoDir
    const generated = generateConfigs(repoDir ?? null, detected);

    // 4️⃣ Create PR — attempt in API-mode as well if credentials are available
    let prResult = null;

    const canAutoPR = Boolean(
      process.env.GITHUB_PAT || process.env.GITHUB_APP_ID || process.env.GITHUB_INSTALLATION_ID
    );

    if (Object.keys(generated).length && canAutoPR) {
      try {
        prResult = await commitAndPR({
          owner,
          repo,
          branch,
          repoDir: repoDir ?? null,
          generatedFiles: generated,
        });
      } catch (err: any) {
        console.error("❌ PR creation failed:", err);
        prResult = [{ success: false, error: err.message }];
      }
    }

    // 5️⃣ Success Response
    return NextResponse.json(
      {
        success: true,
        mode: repoDir ? "local-clone" : "api-mode",
        repo: `${owner}/${repo}`,
        branch,
        detected,
        generated: repoDir ? Object.keys(generated) : [],
        pullRequest: prResult,
        cloneNote: note || null,
      },
      { headers: corsHeaders(origin) }
    );

  } catch (err: any) {
    console.error("❌ Error in POST:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || String(err),
        errorStack: (err && err.stack) || null,
        cloneNote: cloneNote || null,
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// TEST GET
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  return NextResponse.json({ message: "API Running 🚀" }, { headers });
}
