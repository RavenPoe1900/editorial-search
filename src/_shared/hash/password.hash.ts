import bcrypt from "bcrypt";

export async function hashPassword(plaintextPassword: string) {
  const hash = await bcrypt.hash(plaintextPassword, 10);
  return hash;
}

export async function comparePassword(plaintextPassword: string, hash: string) {
  const result = await bcrypt.compare(plaintextPassword, hash);
  return result;
}