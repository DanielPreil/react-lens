import { useEffect, useState } from "react";

export function P04({ first, last }: { first: string; last: string }) {
  const [profile, setProfile] = useState({ name: "" });
  useEffect(() => {
    setProfile({ name: `${first} ${last}` });
  }, [first, last]);
  return <p>{profile.name}</p>;
}
