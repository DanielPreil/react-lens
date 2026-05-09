import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { configSchema } from "./schema.js";
import { defaultConfig, type ReactLensConfig } from "./defaultConfig.js";

const CANDIDATES = ["react-lens.config.json"];

export async function loadConfig(cwd: string): Promise<ReactLensConfig> {
  for (const candidate of CANDIDATES) {
    const fullPath = resolve(cwd, candidate);
    try {
      await access(fullPath);
      const raw = await readFile(fullPath, "utf8");
      const parsed = JSON.parse(raw);
      const merged = {
        ...defaultConfig,
        ...parsed,
        rules: { ...defaultConfig.rules, ...(parsed.rules ?? {}) }
      };
      return configSchema.parse(merged);
    } catch {
      continue;
    }
  }

  return defaultConfig;
}
