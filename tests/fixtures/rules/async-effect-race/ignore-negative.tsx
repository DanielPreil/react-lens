import { useEffect, useState } from "react";

export function AsyncSafeIgnore({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      const response = await fetch(`/api?q=${query}`);
      const data = await response.json();
      if (!ignore) {
        setResults(data);
      }
    }

    run();

    return () => {
      ignore = true;
    };
  }, [query]);

  return <div>{results.length}</div>;
}
