import { timingSafeEqual } from "crypto";

export function isAdminKeyValid(key: string | undefined | null): boolean {
  const secret = process.env.ADMIN_SECRET;

  if (!secret || !key) {
    return false;
  }

  const provided = Buffer.from(key);
  const expected = Buffer.from(secret);

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
