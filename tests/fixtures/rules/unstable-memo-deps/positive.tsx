import { useMemo } from "react";

export function BadDeps({ list }: { list: string[] }) {
  const result = useMemo(() => list.join(","), [list, { mode: "x" }]);
  return <p>{result}</p>;
}
