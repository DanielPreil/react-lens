import { useEffect } from "react";

export function MissingCleanup() {
  useEffect(() => {
    const onResize = () => console.log(window.innerWidth);
    window.addEventListener("resize", onResize);
  }, []);

  return null;
}
