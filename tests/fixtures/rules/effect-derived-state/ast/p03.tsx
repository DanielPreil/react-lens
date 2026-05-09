import { useEffect, useState } from "react";

type User = { id: number; active: boolean };

export function P03({ users }: { users: User[] }) {
  const [filtered, setFiltered] = useState<User[]>([]);
  useEffect(() => {
    setFiltered(users.filter((u) => u.active));
  }, [users]);
  return <p>{filtered.length}</p>;
}
