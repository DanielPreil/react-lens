import React from "react";

export function P07({ count }: { count: number }) {
  const [next, setNext] = React.useState(0);
  React.useEffect(() => {
    setNext(count + 1);
  }, [count]);
  return <p>{next}</p>;
}
