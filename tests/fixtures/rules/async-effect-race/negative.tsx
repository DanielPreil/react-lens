import { useEffect, useState } from "react";

export function AsyncSafe({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      const response = await fetch(`/api?q=${query}`, { signal: controller.signal });
      const data = await response.json();
      setResults(data);
    };

    run();

    return () => {
      controller.abort();
    };
  }, [query]);

  return <div>{results.length}</div>;
}
