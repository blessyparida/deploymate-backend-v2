import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

interface GetInstallationOctokitParams {
  installationId: number;
}

export async function getInstallationOctokit({
  installationId,
}: GetInstallationOctokitParams) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId) throw new Error("GITHUB_APP_ID is missing");
  if (!privateKey) throw new Error("GITHUB_PRIVATE_KEY is missing");

  const auth = createAppAuth({
    appId: Number(appId),
    privateKey,
    installationId,
  });

  const installationAuth = await auth({ type: "installation" });

  return new Octokit({
    auth: installationAuth.token,
    request: {
      headers: {
        "User-Agent": "DeployMate",
        Accept: "application/vnd.github+json",
      },
    },
  });
}
