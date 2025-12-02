// src/app/api/github/utils/clonerepo.ts
import { Octokit } from "@octokit/rest";
import { getAppOctokit } from "./githubAuth"; // <— GitHub App auth

export interface CloneResult {
  owner: string;
  repo: string;
  branch: string;
  repoDir: null; // always null on Vercel
  files: string[];
  note?: string;
}

export async function cloneRepo(repoUrl: string): Promise<CloneResult> {
  console.log("cloneRepo called with repoUrl:", repoUrl);

  try {
    const urlParts = repoUrl.replace(/:\/\//, "/").split("/").filter(Boolean);
    const owner = urlParts[urlParts.length - 2];
    const repoRaw = urlParts[urlParts.length - 1] || "";
    const repo = repoRaw.replace(/\.git$/i, "").replace(/\/$/, "");

    // ⚡ Use GitHub App authentication
    const octokit = await getAppOctokit();

    // Fetch default branch from GitHub API
    console.log("Fetching GitHub repo metadata:", { owner, repo, repoUrl });
    let branch = "";
    try {
      const info = await octokit.repos.get({ owner, repo });
      branch = info.data.default_branch;
    } catch {
      console.warn("⚠️ Could not fetch default branch. Using 'main'.");
      branch = "main";
    }
    console.log({ owner, repo, branch });

    // Fetch repo content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "",
      ref: branch,
    });

    const fileList = Array.isArray(data) ? data.map((file) => file.name) : [];

    return {
      owner,
      repo,
      branch,
      repoDir: null,
      files: fileList,
      note: "api-mode",
    };
  } catch (err: any) {
    console.error("❌ cloneRepo error:", err?.message || err);
    throw new Error("GitHub repo fetch failed: " + (err?.message || String(err)));
  }
}
