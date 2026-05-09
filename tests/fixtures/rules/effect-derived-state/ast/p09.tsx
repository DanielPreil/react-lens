import { useEffect, useState } from "react";

export function P09({ step }: { step: number }) {
  const [base, setBase] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(base + step);
  }, [base, step]);

  return <button onClick={() => setBase((v) => v + 1)}>{total}</button>;
}
