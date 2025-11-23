// src/app/api/github/utils/clonerepo.ts

import { Octokit } from "@octokit/rest";
import child_process from "child_process";

export async function cloneRepo(repoUrl: string) {
  try {
    const urlParts = repoUrl.split("/");
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    let branch = "main";

    // Honor explicit env var to force API-only mode (useful for deployments)
    // Force API mode if explicitly requested, or if running on Vercel (serverless)
    const forceApiEnv = (process.env.FORCE_API_MODE || "").toLowerCase() === "true";
    const runningOnVercel = !!process.env.VERCEL;
    const forceApi = forceApiEnv || runningOnVercel;

    // Check if `git` binary is available in PATH. In many serverless deployments
    // (Vercel, some containers) `git` may not be installed which causes
    // `spawn git ENOENT`. If git is missing we fall back to GitHub API mode.
    let gitAvailable = true;
    if (forceApi) {
      gitAvailable = false;
      console.log("⚠️ FORCE_API_MODE=true — skipping git checks and using API mode");
    } else {
      try {
        const res = child_process.spawnSync("git", ["--version"]);
        if (res.error || res.status !== 0) {
          gitAvailable = false;
        }
      } catch {
        gitAvailable = false;
      }
    }

    // Use PAT if provided (common for deployments), otherwise fallback to GITHUB_TOKEN
    const authToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: authToken });

    // Attempt to resolve the repository default branch via GitHub API so we don't
    // assume "main" (some repos use "master" or other defaults).
    try {
      const info = await octokit.repos.get({ owner, repo });
      if (info && info.data && info.data.default_branch) {
        branch = info.data.default_branch;
      }
    } catch (err) {
      // If repo info can't be fetched, continue with the default 'main'. The
      // commit/PR flow will surface a clearer error if the branch doesn't exist.
      console.warn(
        "⚠️ Could not fetch repo info to determine default branch:",
        (err as any)?.message || String(err)
      );
    }

    // If git is not available, use GitHub API mode (no local clone).
    if (!gitAvailable) {
      // 📁 List all files from GitHub API
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: "",
      });

      // Only return file names (no disk folder)
      const fileList = Array.isArray(data) ? data.map((file) => file.name) : [];

      return {
        owner,
        repo,
        branch,
        repoDir: null, // API-only mode — no local clone
        files: fileList,
        note: "git-not-found-fell-back-to-api",
      };
    }

    // If git is available, but we don't want to depend on a filesystem clone
    // in all environments, you can implement a local clone here (e.g. using
    // simple-git). For now we still use API mode by default to keep behavior
    // consistent across environments. If you prefer a local clone when git
    // exists, replace this block with a simple-git clone implementation.
    const { data } = await octokit.repos.getContent({ owner, repo, path: "" });
    const fileList = Array.isArray(data) ? data.map((file) => file.name) : [];

    return {
      owner,
      repo,
      branch,
      repoDir: null,
      files: fileList,
    };
  } catch (err: any) {
    console.error("❌ cloneRepo error:", err?.message || err);
    throw new Error("GitHub repo fetch failed: " + (err?.message || String(err)));
  }
}
