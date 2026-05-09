import { useEffect, useState } from "react";

export function P10({ count }: { count: number }) {
  const [countText, setCountText] = useState("");
  useEffect(() => {
    setCountText(`Count: ${count}`);
  }, [count]);
  return <p>{countText}</p>;
}
