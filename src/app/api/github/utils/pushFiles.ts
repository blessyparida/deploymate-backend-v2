import { Octokit } from "@octokit/rest";
import { getAppOctokit } from "./githubAuth";
import { DetectedStack } from "./types";

interface PushFilesInput {
  owner: string;
  repo: string;
  branch: string;
  detected: DetectedStack;
  generatedConfigs: Record<string, any>;
  installationId: number;
}

export async function pushFilesToRepo({
  owner,
  repo,
  branch,
  detected,
  generatedConfigs,
  installationId,
}: PushFilesInput) {
  // 🔐 Authenticate as GitHub App INSTALLATION
  const octokit = await getAppOctokit({
    owner,
    repo,
    installationId,
  });

  // 📦 Generate actual files to push
  const filesToPush: Record<string, string> = {};

  // ---- vercel.json ----
  if (detected.deployment === "Vercel") {
    filesToPush["vercel.json"] = JSON.stringify(
      {
        version: 2,
        builds: [{ src: "index.js", use: "@vercel/node" }],
        routes: [{ src: "/(.*)", dest: "/" }],
      },
      null,
      2
    );
  }

  // ---- .env.example ----
  filesToPush[".env.example"] = `PORT=3000
NODE_ENV=production
`;

  // ---- README_DEPLOY.md ----
  filesToPush["README_DEPLOY.md"] = `# Deployment Guide

## Detected Stack
- Languages: ${detected.languages.join(", ")}
- Frameworks: ${detected.frameworks.join(", ")}
- Deployment: ${detected.deployment ?? "Unknown"}

## Steps
1. Install dependencies
2. Configure environment variables
3. Deploy using your preferred platform
`;

  const results: { file: string; success: boolean; error?: string }[] = [];

  // 🚀 Commit each file
  for (const [path, content] of Object.entries(filesToPush)) {
    try {
      let sha: string | undefined;

      try {
        const existing = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });

        if (!Array.isArray(existing.data)) {
          sha = existing.data.sha;
        }
      } catch {
        // file does not exist → create new
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: "chore: add deployment configs",
        content: Buffer.from(content).toString("base64"),
        branch,
        sha,
      });

      results.push({ file: path, success: true });
    } catch (err: any) {
      results.push({
        file: path,
        success: false,
        error: err.message,
      });
    }
  }

  return results;
}
