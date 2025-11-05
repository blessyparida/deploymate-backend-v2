import { NextResponse } from "next/server";
import { cloneRepo } from "../utils/clonerepo";
import { detectStack } from "../utils/detectstack";
import { generateConfigs } from "../utils/generateconfigs";
import { commitAndPR } from "../utils/githubactions";

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();
    console.log("📦 Received repoUrl:", repoUrl);

    if (!repoUrl) throw new Error("repoUrl is required");

    // 1️⃣ Clone repo
    const { owner, repo, branch, repoDir } = await cloneRepo(repoUrl);

    // 2️⃣ Detect stack
    const detected = detectStack(repoDir);

    // 3️⃣ Generate config files
    const generated = generateConfigs(repoDir, detected);

    // 4️⃣ Commit all generated files in a single PR
    const prResult = await commitAndPR({
      owner,
      repo,
      branch,
      repoDir,
      generatedFiles: generated, // all files bundled in one PR
    });

    // 5️⃣ Return success response
    return NextResponse.json({
      success: true,
      repo: `${owner}/${repo}`,
      branch,
      detected,
      generated: Object.keys(generated),
      pullRequest: prResult, // single PR now
    });

  }  catch (err: any) {
  console.error("❌ Error in analyze route:", err);
  return NextResponse.json(
    { success: false, error: err.message || "Unknown error" },
    { status: 500 }
  );
}
}


