// src/app/api/github/utils/types.ts

export interface DetectedStack {
  languages: string[];   // e.g. ["JavaScript", "TypeScript"]
  frameworks: string[];  // e.g. ["React", "Express"]
  deployment?: string;   // e.g. "Vercel", "Docker", "Render"
}

export interface DetectStackError {
  error: string;
}
