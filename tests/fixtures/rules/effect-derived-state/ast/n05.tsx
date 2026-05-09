import { useLayoutEffect, useState } from "react";

export function N05({ value }: { value: number }) {
  const [x, setX] = useState(0);
  useLayoutEffect(() => {
    setX(value);
  }, [value]);
  return <p>{x}</p>;
}
