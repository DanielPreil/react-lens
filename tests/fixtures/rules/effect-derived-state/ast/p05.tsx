import { useEffect, useState } from "react";

export function P05({ status }: { status: "ok" | "fail" }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (status === "ok") {
      setLabel("Ready");
      return;
    }
    setLabel("Error");
  }, [status]);
  return <p>{label}</p>;
}
