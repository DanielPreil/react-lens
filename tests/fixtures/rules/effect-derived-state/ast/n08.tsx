import { useEffect, useState } from "react";

export function N08({ value }: { value: number }) {
  const [x, setX] = useState(0);
  useEffect(() => {
    Promise.resolve(value).then(setX);
  }, [value]);
  return <p>{x}</p>;
}
