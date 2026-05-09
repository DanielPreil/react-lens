"use client";

import { useState } from "react";

export default function ClientPage() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
