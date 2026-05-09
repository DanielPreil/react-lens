export function DerivedRender({ first, last }: { first: string; last: string }) {
  const fullName = `${first} ${last}`;
  return <p>{fullName}</p>;
}
