import { Octokit } from "@octokit/rest";
import jwt from "jsonwebtoken";
import fs from "fs";

const APP_ID = process.env.GITHUB_APP_ID!;
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID!;
const PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;

async function main() {
  //  Load private key
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");

  // Create JWT (App authentication)
  const now = Math.floor(Date.now() / 1000);
  const jwtToken = jwt.sign(
    {
      iat: now - 60,
      exp: now + 10 * 60,
      iss: APP_ID,
    },
    privateKey,
    { algorithm: "RS256" }
  );

  // Create app-level Octokit instance
  const appOctokit = new Octokit({
    auth: jwtToken,
  });

  console.log("✅ GitHub App JWT generated successfully.");

  //Exchange for installation access token
  const { data: tokenData } = await appOctokit.apps.createInstallationAccessToken({
    installation_id: Number(INSTALLATION_ID),
  });

  console.log("Installation Token retrieved:", tokenData.token.slice(0, 10) + "...");

  //Test API call using installation token
  const userOctokit = new Octokit({ auth: tokenData.token });
  const { data: repos } = await userOctokit.apps.listReposAccessibleToInstallation();

  console.log(` Accessible repos (${repos.repositories.length}):`);
  repos.repositories.forEach((r) => console.log("  -", r.full_name));
}

main().catch((err) => {
  console.error(" Auth test failed:", err.message);
});
