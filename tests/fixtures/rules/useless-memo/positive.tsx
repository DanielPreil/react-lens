import { useMemo } from "react";

export function TrivialMemo({ name }: { name: string }) {
  const normalized = useMemo(() => name, [name]);

  return <p>{normalized}</p>;
}
