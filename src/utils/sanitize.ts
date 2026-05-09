export function sanitizeForRegexRules(input: string): string {
  let out = "";
  let i = 0;
  let mode: "normal" | "single" | "double" | "lineComment" | "blockComment" = "normal";

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (mode === "normal") {
      if (ch === "'" ) {
        mode = "single";
        out += " ";
      } else if (ch === '"') {
        mode = "double";
        out += " ";
      } else if (ch === "/" && next === "/") {
        mode = "lineComment";
        out += "  ";
        i += 1;
      } else if (ch === "/" && next === "*") {
        mode = "blockComment";
        out += "  ";
        i += 1;
      } else {
        out += ch;
      }
      i += 1;
      continue;
    }

    if (mode === "single") {
      if (ch === "\\" && i + 1 < input.length) {
        out += "  ";
        i += 2;
        continue;
      }

      if (ch === "'") {
        mode = "normal";
        out += " ";
      } else {
        out += ch === "\n" ? "\n" : " ";
      }
      i += 1;
      continue;
    }

    if (mode === "double") {
      if (ch === "\\" && i + 1 < input.length) {
        out += "  ";
        i += 2;
        continue;
      }

      if (ch === '"') {
        mode = "normal";
        out += " ";
      } else {
        out += ch === "\n" ? "\n" : " ";
      }
      i += 1;
      continue;
    }

    if (mode === "lineComment") {
      if (ch === "\n") {
        mode = "normal";
        out += "\n";
      } else {
        out += " ";
      }
      i += 1;
      continue;
    }

    if (mode === "blockComment") {
      if (ch === "*" && next === "/") {
        mode = "normal";
        out += "  ";
        i += 2;
      } else {
        out += ch === "\n" ? "\n" : " ";
        i += 1;
      }
    }
  }

  return out;
}
