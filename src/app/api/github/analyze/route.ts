export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

import { cloneRepo } from "../utils/clonerepo";
import { detectStack } from "../utils/detectstack";
import { generateConfigs } from "../utils/generateconfigs";
import { pushFilesToRepo } from "../utils/pushFiles";
import { generateGithubActions } from "../utils/githubactions";
import { DetectedStack } from "../utils/types";

// ----------------------
// 🛡️ Allowed Origins
// ----------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://deploymate-frontend.vercel.app",
];

// ----------------------
// ⚙️ CORS HEADERS
// ----------------------
function corsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin?.trim().replace(/\/$/, "") ?? null;

  const allowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    origin.includes("deploymate-frontend");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };

  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin ?? "*";
  }

  return headers;
}

// ----------------------
// 🔑 Get Installation ID (Option A Core)
// ----------------------
async function getInstallationIdForRepo(owner: string, repo: string) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error("GitHub App credentials missing");
  }

  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: Number(appId),
      privateKey,
    },
  });

  const res = await appOctokit.request(
    "GET /repos/{owner}/{repo}/installation",
    { owner, repo }
  );

  return res.data.id;
}

// ----------------------
// ⚙️ OPTIONS
// ----------------------
export function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

// ----------------------
// 🚀 POST
// ----------------------
export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const { repoUrl } = await req.json();
    if (!repoUrl) throw new Error("repoUrl is required");

    // 🔍 Extract owner/repo
    const cleaned = repoUrl.replace(".git", "");
    const parts = cleaned.split("/");
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];

    if (!owner || !repo) {
      throw new Error("Invalid GitHub repository URL");
    }

    // 🔑 Dynamically fetch installation ID (Option A)
    const installationId = await getInstallationIdForRepo(owner, repo);

    // 1️⃣ Clone repo via GitHub App
    const {
      branch,
      files,
      packageJson,
      note,
    } = await cloneRepo(repoUrl, installationId);

    // 2️⃣ Detect stack
    const detectedResult = detectStack({ files, packageJson });
    if ("error" in detectedResult) {
      return NextResponse.json(
        { success: false, error: detectedResult.error },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const detected: DetectedStack = detectedResult;

    // 3️⃣ Generate configs
    const generatedConfigs = generateConfigs(detected);

    // 4️⃣ Push files to repo
    const pushResult = await pushFilesToRepo({
      owner,
      repo,
      branch,
      detected,
      generatedConfigs,
      installationId,
    });

    // 5️⃣ Create GitHub Actions PR
    const prResult = await generateGithubActions({
      owner,
      repo,
      branch,
      installationId,
      generatedFiles: generatedConfigs as Record<string, any>,
    });

    return NextResponse.json(
      {
        success: true,
        mode: "api-mode",
        repo: `${owner}/${repo}`,
        branch,
        detected,
        generatedConfigs,
        pushResult,
        pullRequest: prResult,
        cloneNote: note,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    console.error("❌ analyze error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// ----------------------
// 🧪 GET
// ----------------------
export async function GET(req: Request) {
  return NextResponse.json(
    { message: "API Running 🚀" },
    { headers: corsHeaders(req.headers.get("origin")) }
  );
}
