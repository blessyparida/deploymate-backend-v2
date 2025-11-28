// src/app/api/github/analyze/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cloneRepo } from "../utils/clonerepo";
import { DetectedStack } from "../utils/types";
import { detectStack } from "../utils/detectstack";
import { generateConfigs } from "../utils/generateconfigs";
import { generateGithubActions } from "../utils/githubactions";

// ----------------------
// 🛡️ Allowed Origins
// ----------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://deploymate-frontend-959o4z711-blessy-paridas-projects.vercel.app",
    "https://deploymate-frontend.vercel.app", // deployed frontend
];

// ----------------------
// ⚙️ CORS HEADERS
// ----------------------
function corsHeaders(requestOrigin: string | null) {
  // Normalize + handle undefined origin
  const origin = requestOrigin?.trim().replace(/\/$/, "") ?? null;

  const originIsAllowed =
    !origin || // allow when origin missing (Postman, mobile Chrome)
    allowedOrigins.includes(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    origin.includes("deploymate-frontend");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };

  // If allowed → set origin
  if (originIsAllowed) {
    headers["Access-Control-Allow-Origin"] = origin ?? "*"; // fallback
  }

  return headers;
}


// ----------------------
// ⚙️ OPTIONS (Preflight)
// ----------------------
export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// ----------------------
// 👇 Clone Result Interface
// ----------------------
interface CloneResult {
  owner: string;
  repo: string;
  branch: string;
  repoDir: string | null;
  files: string[];
  note?: string;
}

// ----------------------
// 🚀 POST — MAIN API
// ----------------------
export async function POST(req: Request) {
  let origin: string | null = null;
  let cloneNote: string | null = null;

  try {
    origin = req.headers.get("origin");
    console.log("🌐 Incoming POST request");
    console.log("Origin header:", origin);
    console.log("Headers:", Array.from(req.headers.entries()));

    const isAllowed =
      origin === null || origin?.includes("deploymate-frontend") || allowedOrigins.includes(origin ?? "");

    if (!isAllowed) {
      return new NextResponse("CORS Error", {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    const { repoUrl } = await req.json();
    console.log("📥 repoUrl received:", repoUrl);
    if (!repoUrl) throw new Error("repoUrl is required");

    // 1️⃣ Clone Repo
    const cloneResult: CloneResult = await cloneRepo(repoUrl);
    const { owner, repo, branch, repoDir, files, note } = cloneResult;

    cloneNote = note || null;
    if (note) console.log("🔎 cloneRepo note:", note);

    // 2️⃣ Detect Stack — FIXED LINE (IMPORTANT)
    const detectedResult = detectStack(files);

    if ("error" in detectedResult) {
      return NextResponse.json(
        { success: false, error: detectedResult.error },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const detected: DetectedStack = detectedResult;

    // 3️⃣ Generate Configs
    const generated = generateConfigs(repoDir ?? null, detected);

    // 4️⃣ Auto PR (if GitHub credentials exist)
    let prResult = null;
    const canAutoPR = Boolean(
      process.env.GITHUB_PAT ||
        process.env.GITHUB_APP_ID ||
        process.env.GITHUB_INSTALLATION_ID
    );

    if (Object.keys(generated).length && canAutoPR) {
      try {
        prResult = await generateGithubActions({
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
        cloneNote,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    console.error("❌ Error in POST:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || String(err),
        errorStack: err?.stack || null,
        cloneNote,
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// ----------------------
// 🧪 TEST GET
// ----------------------
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  return NextResponse.json({ message: "API Running 🚀" }, { headers: corsHeaders(origin) });
}
