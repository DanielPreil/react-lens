import { useEffect, useState } from "react";

function submit(): void {
  console.log("save");
}

export function EventFlag() {
  const [shouldSave, setShouldSave] = useState(false);

  useEffect(() => {
    if (shouldSave) {
      submit();
    }
  }, [shouldSave]);

  return <button onClick={() => setShouldSave(true)}>Save</button>;
}
