import { useEffect, useState } from "react";

export function P08({ first, last, title }: { first: string; last: string; title: string }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    setDisplay(`${title} ${first} ${last}`.trim());
  }, [first, last, title]);
  return <p>{display}</p>;
}
