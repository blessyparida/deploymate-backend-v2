// src/app/api/github/utils/githubAuth.ts
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

interface GetAppOctokitOptions {
  owner?: string;
  repo?: string;
  installationId?: string | number;
}

export async function getAppOctokit(opts?: GetAppOctokitOptions) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId) {
    throw new Error("GITHUB_APP_ID is not set");
  }

  if (!privateKey) {
    throw new Error("GITHUB_PRIVATE_KEY is not set (must be full PEM key as env var)");
  }

  const appAuth = createAppAuth({
    appId: Number(appId),
    privateKey,
  });

  let installationId: number | undefined =
    opts?.installationId ? Number(opts.installationId) : undefined;

  
  if (!installationId && opts?.owner && opts?.repo) {
    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId: Number(appId), privateKey },
    });

    try {
      const res = await appOctokit.request(
        "GET /repos/{owner}/{repo}/installation",
        {
          owner: opts.owner,
          repo: opts.repo,
        }
      );
      installationId = res.data?.id;
    } catch {
      throw new Error(
        `GitHub App is not installed on ${opts.owner}/${opts.repo}`
      );
    }
  }

  // Final fallback: env installation ID
  if (!installationId && process.env.GITHUB_INSTALLATION_ID) {
    installationId = Number(process.env.GITHUB_INSTALLATION_ID);
  }

  if (!installationId) {
    throw new Error(
      "installationId not found. Provide GITHUB_INSTALLATION_ID or pass owner+repo with app installed."
    );
  }

  // Exchange for installation token
  const { token } = await appAuth({
    type: "installation",
    installationId,
  });

  return new Octokit({
    auth: token,
    request: {
      headers: {
        "User-Agent": "DeployMate-Backend",
        Accept: "application/vnd.github+json",
      },
    },
  });
}
