import { useEffect, useState } from "react";

export function P06({ value }: { value: number }) {
  const [text, setText] = useState("");
  useEffect(function syncText() {
    setText(String(value));
  }, [value]);
  return <p>{text}</p>;
}
