export async function updateName(name: string) {
  const payload = name.trim();
  "use server";
  return payload;
}
