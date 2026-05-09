import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findFiles } from "../../src/scanner/findFiles.js";

describe("findFiles fallback behavior", () => {
  it("falls back to generic ts/js glob when include patterns match nothing", async () => {
    const root = await mkdtemp(join(tmpdir(), "react-lens-find-files-"));
    const appDir = join(root, "app");
    await mkdir(appDir, { recursive: true });
    await writeFile(join(appDir, "page.tsx"), "export default function Page() { return null; }\n", "utf8");

    const files = await findFiles(["src/**/*.{ts,tsx,js,jsx}"], ["node_modules/**", "dist/**"], root);
    expect(files.some((f) => f.endsWith("/app/page.tsx"))).toBe(true);
  });
});
