export function N01({ first, last }: { first: string; last: string }) {
  const fullName = `${first} ${last}`;
  return <p>{fullName}</p>;
}
