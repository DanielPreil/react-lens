"use server";

export async function updateUser(input: { id: string; name: string }) {
  await db.user.update({ where: { id: input.id }, data: { name: input.name } });
  return { ok: true };
}
