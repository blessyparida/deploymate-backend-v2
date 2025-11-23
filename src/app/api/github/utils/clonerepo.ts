// src/app/api/github/utils/clonerepo.ts

import { Octokit } from "@octokit/rest";

export async function cloneRepo(repoUrl: string) {
  try {
    const urlParts = repoUrl.split("/");
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    const branch = "main";

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 📁 List all files from GitHub API
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "",
    });

    // Only return file names (no disk folder)
    const fileList =
      Array.isArray(data) ? data.map((file) => file.name) : [];

    return {
      owner,
      repo,
      branch,
      repoDir: null, // ⚠️ No local filesystem!
      files: fileList,
    };
  } catch {
    throw new Error("GitHub repo fetch failed");
  }
}
