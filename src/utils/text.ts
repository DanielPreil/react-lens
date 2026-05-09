export function indexToLineColumn(text: string, idx: number): { line: number; column: number } {
  const bounded = Math.max(0, Math.min(idx, text.length));
  const prefix = text.slice(0, bounded);
  const lines = prefix.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}
