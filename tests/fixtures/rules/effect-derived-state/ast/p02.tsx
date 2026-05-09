import { useEffect, useState } from "react";

export function P02({ query }: { query: string }) {
  const [normalized, setNormalized] = useState("");
  useEffect(() => {
    setNormalized(query.trim().toLowerCase());
  }, [query]);
  return <p>{normalized}</p>;
}
