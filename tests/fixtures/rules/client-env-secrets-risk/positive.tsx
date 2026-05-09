"use client";

export function SecretLeak() {
  return <span>{process.env.DB_PASSWORD}</span>;
}
