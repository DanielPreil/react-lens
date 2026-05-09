import fg from "fast-glob";

export async function findFiles(include: string[], ignore: string[], cwd: string): Promise<string[]> {
  const primary = await fg(include, {
    cwd,
    ignore,
    absolute: true,
    onlyFiles: true
  });

  if (primary.length > 0) {
    return primary;
  }

  return fg(["**/*.{ts,tsx,js,jsx}"], {
    cwd,
    ignore,
    absolute: true,
    onlyFiles: true
  });
}
