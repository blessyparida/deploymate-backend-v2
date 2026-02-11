 
import { DetectedStack } from "./types";

export type GeneratedConfigs = Record<string, string>;

export function generateConfigs(detected: DetectedStack): GeneratedConfigs {
  const files: Record<string, string> = {};

  
  if (detected.frameworks.includes("Express")) {
    files["vercel.json"] = JSON.stringify(
      {
        version: 2,
        builds: [{ src: "index.js", use: "@vercel/node" }],
        routes: [{ src: "/(.*)", dest: "index.js" }],
      },
      null,
      2
    );

    files[".env.example"] = `PORT=3000
# Add your environment variables here
`;

    files["README_DEPLOY.md"] = `# Deployment Guide

This project was auto-configured for deployment.

## Vercel
- Entry: index.js
- Framework: Express
`;
  }

  
  if (detected.frameworks.includes("React")) {
    files["vercel.json"] = JSON.stringify(
      {
        rewrites: [{ source: "/(.*)", destination: "/" }],
      },
      null,
      2
    );
  }

  
  return files;
}
