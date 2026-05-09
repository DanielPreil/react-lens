import { useEffect, useState } from "react";

export function N02({ q }: { q: string }) {
  const [data, setData] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/api?q=${q}`).then((r) => r.json()).then(setData);
  }, [q]);
  return <p>{data.length}</p>;
}
