import { useEffect, useState } from "react";

export function N09() {
  const [x, setX] = useState(0);
  useEffect(() => {
    setX((prev) => prev + 1);
  }, []);
  return <p>{x}</p>;
}
