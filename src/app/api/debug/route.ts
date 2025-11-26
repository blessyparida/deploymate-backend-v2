export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import child_process from "child_process";

export async function GET() {
  // Detect git availability
  let gitInfo: { available: boolean; output: string | null } = { available: false, output: null };
  try {
    const res = child_process.spawnSync("git", ["--version"], { encoding: "utf8" });
    if (!res.error && res.status === 0) {
      gitInfo.available = true;
      gitInfo.output = String(res.stdout || res.stderr).trim();
    } else {
      gitInfo.available = false;
      gitInfo.output = res.error ? String((res.error as any).message) : String(res.stderr || res.stdout || null);
    }
  } catch (e: any) {
    gitInfo.available = false;
    gitInfo.output = String(e?.message || e);
  }

  const forceApiEnv = (process.env.FORCE_API_MODE || "").toLowerCase() === "true";
  const runningOnVercel = !!process.env.VERCEL;

  // Masked presence check for PAT
  const hasPAT = !!process.env.GITHUB_PAT;

  const payload = {
    runningOnVercel,
    vercelCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    forceApiEnv,
    FORCE_API_MODE_raw: process.env.FORCE_API_MODE || null,
    git: gitInfo,
    hasPAT,
    // Don't echo secrets back. Only indicate presence.
  };

  return NextResponse.json(payload, { status: 200 });
}
