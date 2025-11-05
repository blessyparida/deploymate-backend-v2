import fs from "fs";
import path from "path";

export function detectStack(repoDir: string) {
  const results: Record<string, string> = {};

  const getAllFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? getAllFiles(path.join(dir, e.name))
        : path.join(dir, e.name)
    );

  const files = getAllFiles(repoDir);
  const read = (f: string) => {
    try {
      return fs.readFileSync(f, "utf-8");
    } catch {
      return "";
    }
  };

  // 🧠 Scan all package.json files
  const pkgFiles = files.filter((f) => f.endsWith("package.json"));
  for (const pkg of pkgFiles) {
    const json = JSON.parse(read(pkg));
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

  if (!results.language) results.language = "JavaScript";

  // detect Python case
  if (files.some((f) => f.endsWith("requirements.txt"))) {
    const txt = read(files.find((f) => f.endsWith("requirements.txt"))!);
    if (/flask/i.test(txt)) results.backend = "Flask";
    if (/fastapi/i.test(txt)) results.backend = "FastAPI";
    results.language = "Python";
  }

  // deployment hints
  if (files.some((f) => f.endsWith("vercel.json"))) results.deployment = "Vercel";
  else if (files.some((f) => f.endsWith("Dockerfile"))) results.deployment = "Docker";

  return results;
}
