import simpleGit from "simple-git";
import path from "path";
import fs from "fs";
import os from "os";
import https from "https";

type CloneResult = { repoDir: string; branch: string; owner: string; repo: string };

// --- Helper to fetch JSON safely ---
async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "deploymate" } }, (res) => {
      const statusCode = res.statusCode || 0;
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (statusCode < 200 || statusCode >= 300) {
          return reject(new Error(`GitHub API returned status ${statusCode}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Failed to parse JSON from GitHub API"));
        }
      });
    });
    req.on("error", (err) => reject(err));
  });
}

// --- Parse GitHub URL ---
export function parseOwnerRepo(input: any): { owner: string; repo: string } | null {
  if (typeof input !== "string") {
    console.error("❌ parseOwnerRepo() expected a string but got:", input);
    return null;
  }

  const trimmed = input.trim();

  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };

  const httpsMatch = trimmed.match(/github\.com\/([^\/\s]+)\/([^\/\s#]+)(?:\.git)?/i);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };

  const sshMatch = trimmed.match(/git@github\.com:([^\/\s]+)\/([^\/\s]+)(?:\.git)?/i);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2].replace(/\.git$/, "") };

  console.error("⚠️ Invalid GitHub URL format:", input);
  return null;
}

// --- Safe remove folder ---
function safeRemoveDir(dirPath: string) {
  try {
    if (fs.existsSync(dirPath)) {
      if ("rmSync" in fs) {
        (fs as any).rmSync(dirPath, { recursive: true, force: true });
      } else {
        (fs as any).rmdirSync(dirPath, { recursive: true });
      }
    }
  } catch (err) {
    console.warn("⚠️ Cleanup failed for:", dirPath, (err as Error).message);
  }
}

// --- Clone Repo ---
export async function cloneRepo(repoUrl: string): Promise<CloneResult> {
  const parsed = parseOwnerRepo(repoUrl);
  if (!parsed) throw new Error("Invalid GitHub repository URL.");

  const { owner, repo } = parsed;
  const git = simpleGit();
  const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), "deploymate-"));

  // Get default branch via GitHub API
  let defaultBranch = "main";
  try {
    const infoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const info = await fetchJson(infoUrl);
    if (info && info.default_branch) {
      defaultBranch = info.default_branch;
      console.log(`🔹 Default branch detected: ${defaultBranch}`);
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch branch info:", (err as Error).message);
  }

  const tryBranches = [defaultBranch, "canary", "main", "master"];
  let lastError: unknown = null;

  for (const branch of tryBranches) {
    const repoDir = path.join(tmpParent, `${repo}-${branch}-${Date.now()}`);
    try {
      console.log(`📦 Attempting clone: ${owner}/${repo} (${branch})`);
      await git.clone(`https://github.com/${owner}/${repo}.git`, repoDir, [
        "--depth",
        "1",
        "--branch",
        branch,
      ]);
      console.log(`✅ Cloned branch: ${branch}`);
      return { repoDir, branch, owner, repo };
    } catch (err) {
      safeRemoveDir(repoDir);
      console.warn(`⚠️ Clone failed for '${branch}':`, (err as Error).message);
      lastError = err;
    }
  }

  throw new Error(
    `No valid branch found for ${owner}/${repo}. Last error: ${
      (lastError as Error)?.message || lastError
    }`
  );
}
