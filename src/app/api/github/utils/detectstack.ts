// src/app/api/github/utils/detectstack.ts
import { DetectedStack, DetectStackError } from "./types";

// Only API-mode: receives list of filenames
export function detectStack(files: string[] | null): DetectedStack | DetectStackError {
  if (!files || !files.length) {
    return { error: "No files available. Stack could not be detected." };
  }

  const results: DetectedStack = { languages: [], frameworks: [] };

  // Check package.json
  const pkgFile = files.find(f => f.endsWith("package.json"));
  if (pkgFile) {
    try {
      // Fetch package.json content via download_url if needed in API mode
      // Here we just assume dependency names from filenames for simplicity
      const deps = files.map(f => f.toLowerCase());

      if (deps.some(d => d.includes("express"))) results.frameworks.push("Express");
      if (deps.some(d => d.includes("react"))) results.frameworks.push("React");
      if (deps.some(d => d.includes("next"))) results.frameworks.push("Next");
      if (deps.some(d => d.includes("vue"))) results.frameworks.push("Vue");
      if (deps.some(d => d.includes("typescript"))) results.languages.push("TypeScript");
    } catch {
      // fallback
    }
  }

  if (!results.languages.length) results.languages.push("JavaScript");

  // Python detection
  if (files.some(f => f.includes("requirements.txt"))) {
    results.languages.push("Python");
    if (files.some(f => f.toLowerCase().includes("flask"))) results.frameworks.push("Flask");
    if (files.some(f => f.toLowerCase().includes("fastapi"))) results.frameworks.push("FastAPI");
  }

  // Deployment detection
  if (files.some(f => f.includes("vercel.json"))) results.deployment = "Vercel";
  else if (files.some(f => f.includes("dockerfile"))) results.deployment = "Docker";

  return results;
}
