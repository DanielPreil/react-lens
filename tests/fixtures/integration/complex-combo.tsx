import React, { useEffect, useMemo, useState } from "react";

const Child = React.memo(function Child({ rows }: { rows: Array<{ id: number }> }) {
  return <div>{rows.length}</div>;
});

export function Complex({ q }: { q: string }) {
  const [value, setValue] = useState("");
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    setValue(q.trim());
  }, [q]);

  useEffect(() => {
    fetch(`/api?q=${q}`).then((r) => r.json()).then(setData);
  }, [q]);

  const t = useMemo(() => value.toLowerCase(), [value]);

  return <Child rows={[{ id: t.length }]} />;
}
