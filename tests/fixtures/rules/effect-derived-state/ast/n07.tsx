import { useEffect } from "react";

export function N07({ value }: { value: number }) {
  useEffect(() => {
    console.log(value);
  }, [value]);
  return null;
}
