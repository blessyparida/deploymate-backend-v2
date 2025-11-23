// src/app/api/github/utils/detectstack.ts

import fs from "fs";
import path from "path";

// Accept BOTH local or API mode
export function detectStack(input: string | null | string[]) {
  const results: Record<string, string> = {};
  let files: string[] = [];

  // ---------------------------------------
  // 📦 1️⃣ If repoDir exists (LOCAL MODE)
  // ---------------------------------------
  if (typeof input === "string") {
    try {
      const getAllFiles = (dir: string): string[] =>
        fs
          .readdirSync(dir, { withFileTypes: true })
          .flatMap((e) =>
            e.isDirectory()
              ? getAllFiles(path.join(dir, e.name))
              : path.join(dir, e.name)
          );

      files = getAllFiles(input);
    } catch {
      console.warn("⚠️ repoDir not available → switching to API mode");
    }
  }

  // ---------------------------------------
  // 🌐 2️⃣ If input is file list (API MODE)
  // ---------------------------------------
  if (Array.isArray(input)) {
    files = input; // already filenames
  }

  // ---------------------------------------
  // ❌ 3️⃣ If STILL empty → cannot detect
  // ---------------------------------------
  if (!files.length) {
    return { error: "No files available. Stack could not be detected." };
  }

  // Small helper to read file content (only for local mode)
  const read = (f: string) => {
    try {
      return fs.readFileSync(f, "utf-8");
    } catch {
      return "";
    }
  };

  // ---------------------------------------
  // 🧠 4️⃣ Analyze
  // package.json → JS/TS
  // requirements.txt → Python
  // Dockerfile / vercel.json → deployment
  // ---------------------------------------

  // 🧠 Check package.json
  const pkgFiles = files.filter((f) => f.includes("package.json"));
  for (const pkg of pkgFiles) {
    const json = typeof input === "string" ? JSON.parse(read(pkg)) : null;

    if (json) {
      const deps = Object.keys({
        ...json.dependencies,
        ...json.devDependencies,
      });

      if (deps.includes("express")) results.backend = "Express.js";
      if (deps.includes("next")) results.frontend = "Next.js";
      if (deps.includes("react")) results.frontend = "React";
      if (deps.includes("vue")) results.frontend = "Vue";
      if (deps.includes("typescript")) results.language = "TypeScript";
    }
  }

  if (!results.language && pkgFiles.length) {
    results.language = "JavaScript";
  }

  // 🧠 Python (requirements.txt)
  const reqFile = files.find((f) => f.includes("requirements.txt"));
  if (reqFile) {
    if (typeof input === "string") {
      const txt = read(reqFile);
      if (/flask/i.test(txt)) results.backend = "Flask";
      if (/fastapi/i.test(txt)) results.backend = "FastAPI";
    }
    results.language = "Python";
  }

  // 🧠 Deployment
  if (files.some((f) => f.includes("vercel.json"))) results.deployment = "Vercel";
  else if (files.some((f) => f.includes("Dockerfile"))) results.deployment = "Docker";

  return results;
}
