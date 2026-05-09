import { useEffect, useState } from "react";

export function N06({ value }: { value: number }) {
  const [x, setX] = useState(0);
  useEffect(() => {
    const apply = () => setX(value);
    void apply;
  }, [value]);
  return <p>{x}</p>;
}
