// src/app/api/github/utils/types.ts
export interface DetectedStack {
  languages: string[];      // detected languages, e.g., ['JavaScript', 'TypeScript']
  frameworks: string[];     // detected frameworks, e.g., ['React', 'Express']
  frontend?: string;
  backend?: string;
  database?: string;
  deployment?: string;
}

export interface DetectStackError {
  error: string;
}
