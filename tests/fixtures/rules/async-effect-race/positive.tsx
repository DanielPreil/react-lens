import { useEffect, useState } from "react";

export function AsyncRace({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api?q=${query}`)
      .then((r) => r.json())
      .then(setResults);
  }, [query]);

  return <div>{results.length}</div>;
}
