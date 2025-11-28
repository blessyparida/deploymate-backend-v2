// src/app/api/github/utils/clonerepo.ts
import { Octokit } from "@octokit/rest";

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
    const urlParts = repoUrl.replace(/:\/\//, '/').split("/").filter(Boolean);
    // owner is the second-last segment, repo is the last segment
    const owner = urlParts[urlParts.length - 2];
    // strip optional trailing .git or trailing slash
    const repoRaw = urlParts[urlParts.length - 1] || "";
    const repo = repoRaw.replace(/\.git$/i, "").replace(/\/$/, "");
    //let branch = "main";

    const ALWAYS_USE_API =
      process.env.FORCE_API_MODE?.toLowerCase() === "true" ||
      process.env.VERCEL === "1";

    // Auth via PAT or token
    const authToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: authToken });

    // Fetch default branch from GitHub API
    console.log("Fetching GitHub repo metadata:", { owner, repo, repoUrl });
    let branch = ""; // start empty
    try {
      const info = await octokit.repos.get({ owner, repo, });
      branch = info.data.default_branch;
    } catch {
      console.warn("⚠️ Could not fetch default branch. Using 'main'.");
      branch = "main"
    }
    console.log({ owner, repo, branch });


    // Always use API mode on Vercel → fetch file list
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
