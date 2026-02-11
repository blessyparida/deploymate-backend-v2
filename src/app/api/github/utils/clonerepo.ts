import { Buffer } from "buffer";
import { getInstallationOctokit } from "./getInstallationOctokit";

export interface CloneResult {
  owner: string;
  repo: string;
  branch: string;
  repoDir: null;
  files: string[];
  packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } | null;
  note?: string;
}

export async function cloneRepo(
  repoUrl: string,
  installationId: number
): Promise<CloneResult> {
  try {
    const parts = repoUrl.replace(/:\/\//, "/").split("/").filter(Boolean);
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1].replace(/\.git$/, "");

    const octokit = await getInstallationOctokit({ installationId });

    
    const repoInfo = await octokit.repos.get({ owner, repo });
    const branch = repoInfo.data.default_branch || "main";

    
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "",
      ref: branch,
    });

    const files = Array.isArray(data) ? data.map(f => f.name) : [];

    
    let packageJson = null;

    if (files.includes("package.json")) {
      const pkgData = await octokit.repos.getContent({
        owner,
        repo,
        path: "package.json",
        ref: branch,
      });

      if (!Array.isArray(pkgData.data) && "content" in pkgData.data) {
        packageJson = JSON.parse(
          Buffer.from(pkgData.data.content, "base64").toString("utf-8")
        );
      }
    }

    return {
      owner,
      repo,
      branch,
      repoDir: null,
      files,
      packageJson,
      note: "api-mode",
    };
  } catch (err: any) {
    console.error("cloneRepo failed:", err);
    throw new Error(err.message || "GitHub fetch failed");
  }
}
