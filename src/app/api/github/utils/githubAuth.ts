// src/app/api/github/utils/githubAuth.ts
import fs from "fs";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export async function getAppOctokit(opts?: { owner?: string; repo?: string; installationId?: string | number }) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyEnv = process.env.GITHUB_PRIVATE_KEY;
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;

  if (!appId) throw new Error("GITHUB_APP_ID is not set");
  // private key: prefer explicit env content; else try path
  let privateKey = privateKeyEnv;
  if (!privateKey && privateKeyPath) {
    privateKey = fs.readFileSync(privateKeyPath, "utf8");
  }
  if (!privateKey) throw new Error("GITHUB_PRIVATE_KEY (or GITHUB_PRIVATE_KEY_PATH) is required");

  const appAuth = createAppAuth({
    appId: Number(appId),
    privateKey,
  });

  // If caller supplied installationId, use it. Otherwise try to resolve by repo.
  let installationId: number | undefined = opts?.installationId ? Number(opts.installationId) : undefined;

  if (!installationId && opts?.owner && opts?.repo) {
    // Use app JWT to list/installations or get repo installation
    const appOctokit = new Octokit({ authStrategy: createAppAuth, auth: { appId: Number(appId), privateKey } });
    try {
      const res = await appOctokit.request("GET /repos/{owner}/{repo}/installation", {
        owner: opts.owner,
        repo: opts.repo,
      });
      installationId = res.data?.id;
    } catch (err) {
      // could be 404 if app not installed; bubble a clear error
      throw new Error(`Could not find app installation for ${opts.owner}/${opts.repo}. Is the GitHub App installed on this repo?`);
    }
  }

  if (!installationId) {
    // try env-provided installation id
    if (process.env.GITHUB_INSTALLATION_ID) installationId = Number(process.env.GITHUB_INSTALLATION_ID);
  }

  if (!installationId) throw new Error("installationId not found. Provide GITHUB_INSTALLATION_ID env or pass owner+repo and install the app on repo.");

  // Exchange installation id for an installation token
  const { token } = await appAuth({ type: "installation", installationId });

  // Return Octokit authenticated as the installation
  const octokit = new Octokit({
    auth: token,
    request: {
      headers: {
        "User-Agent": "DeployMate-Backend",
        Accept: "application/vnd.github+json",
      },
    },
  });

  return octokit;
}
