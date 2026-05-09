import { useEffect, useState } from "react";

export function N04() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{tick}</p>;
}
