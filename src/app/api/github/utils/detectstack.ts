// src/app/api/github/utils/detectstack.ts
import { DetectedStack, DetectStackError } from "./types";

interface DetectStackInput {
  files: string[] | null;
  packageJson?: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } | null;
}

export function detectStack({
  files,
  packageJson,
}: DetectStackInput): DetectedStack | DetectStackError {
  if (!files || files.length === 0) {
    return { error: "No files available. Stack could not be detected." };
  }

  const deps = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  };

  const stack: DetectedStack = {
    languages: [],
    frameworks: [],
  };

  // ---------- Language detection ----------
  if (files.some(f => f.endsWith(".ts") || f === "tsconfig.json")) {
    stack.languages.push("TypeScript");
  } else {
    stack.languages.push("JavaScript");
  }

  if (files.includes("requirements.txt") || files.includes("pyproject.toml")) {
    stack.languages.push("Python");
  }

  // ---------- Frontend frameworks ----------
  if (deps?.react) stack.frameworks.push("React");
  if (deps?.next) stack.frameworks.push("Next.js");
  if (deps?.vue) stack.frameworks.push("Vue");
  if (deps?.svelte) stack.frameworks.push("Svelte");

  // ---------- Backend frameworks ----------
  if (deps?.express) stack.frameworks.push("Express");
  if (deps?.fastify) stack.frameworks.push("Fastify");
  if (deps?.["@nestjs/core"]) stack.frameworks.push("NestJS");

  // ---------- Python frameworks ----------
  if (files.includes("requirements.txt")) {
    if (files.some(f => f.toLowerCase().includes("flask"))) {
      stack.frameworks.push("Flask");
    }
    if (files.some(f => f.toLowerCase().includes("fastapi"))) {
      stack.frameworks.push("FastAPI");
    }
  }

  // ---------- Deployment hints ----------
  if (files.includes("vercel.json")) stack.deployment = "Vercel";
  else if (files.some(f => f.toLowerCase() === "dockerfile")) stack.deployment = "Docker";
  else if (files.includes("render.yaml")) stack.deployment = "Render";

  return stack;
}
