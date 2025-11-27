// src/app/api/github/utils/generateconfigs.ts
import { DetectedStack } from "./types";

export function generateConfigs(repoDir: string | null, detected: DetectedStack) {
  const configs: Record<string, any> = {};

  // Languages
  if (detected.languages.includes("JavaScript") || detected.languages.includes("TypeScript")) {
    configs.eslint = {
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"]
    };
  }

  if (detected.languages.includes("Python")) {
    configs.flake8 = {
      maxLineLength: 120,
      ignore: ["E501", "W503"]
    };
  }

  // Frameworks
  if (detected.frameworks.includes("React")) {
    configs.react = {
      recommendedPackages: ["react-router-dom", "axios"],
      fileStructure: ["src/components", "src/pages", "src/context"]
    };
  }

  if (detected.frameworks.includes("Express")) {
    configs.express = {
      folderStructure: ["routes", "controllers", "middlewares"],
      devDependencies: ["nodemon", "dotenv"]
    };
  }

  return configs;
}
