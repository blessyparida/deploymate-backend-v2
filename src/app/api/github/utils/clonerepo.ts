// src/app/api/github/utils/clonerepo.ts

import { Octokit } from "@octokit/rest";
import child_process from "child_process";

export async function cloneRepo(repoUrl: string) {
  try {
    const urlParts = repoUrl.split("/");
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    const branch = "main";

    // Check if `git` binary is available in PATH. In many serverless deployments
    // (Vercel, some containers) `git` may not be installed which causes
    // `spawn git ENOENT`. If git is missing we fall back to GitHub API mode.
    let gitAvailable = true;
    try {
      const res = child_process.spawnSync("git", ["--version"]);
      if (res.error || res.status !== 0) {
        gitAvailable = false;
      }
    } catch {
      gitAvailable = false;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

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
