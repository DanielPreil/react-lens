import { useState } from "react";

export function Broken({ flag }: { flag: boolean }) {
  if (flag) {
    useState(0);
  }
  return null;
}
