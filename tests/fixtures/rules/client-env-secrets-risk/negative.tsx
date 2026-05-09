"use client";

export function PublicEnvRead() {
  return <span>{process.env.NEXT_PUBLIC_ANALYTICS_ID}</span>;
}
