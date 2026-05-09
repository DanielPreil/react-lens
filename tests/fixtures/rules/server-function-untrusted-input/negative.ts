"use server";

const schema = {
  parse: <T>(value: T) => value,
};

declare const authorize: (id: unknown) => Promise<void>;
declare const db: { user: { update: (args: unknown) => Promise<void> } };
export async function updateUser(input: { id: string; name: string }) {
  const parsed = schema.parse(input);
  await authorize(parsed.id);
  await db.user.update({
    where: { id: parsed.id },
    data: { name: parsed.name },
  });
  return { ok: true };
}
