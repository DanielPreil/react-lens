import { useEffect, useState } from "react";

export function P01({ first, last }: { first: string; last: string }) {
  const [fullName, setFullName] = useState("");
  useEffect(() => {
    setFullName(`${first} ${last}`);
  }, [first, last]);
  return <p>{fullName}</p>;
}
