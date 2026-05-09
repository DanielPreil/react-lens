import { useEffect, useState } from "react";

export function EventFlag() {
  const [shouldSave, setShouldSave] = useState(false);

  useEffect(() => {
    if (shouldSave) {
      console.log("save");
    }
  }, [shouldSave]);

  return <button onClick={() => setShouldSave(true)}>Save</button>;
}
