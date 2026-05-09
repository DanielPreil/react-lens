import { useEffect, useState } from "react";

export function AsyncRaceAwait({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    async function run() {
      const response = await fetch(`/api?q=${query}`);
      const data = await response.json();
      setResults(data);
    }

    run();
  }, [query]);

  return <div>{results.length}</div>;
}
