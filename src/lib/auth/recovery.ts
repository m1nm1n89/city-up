import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  BCRYPT_ROUNDS,
  RECOVERY_CODE_ALPHABET,
  RECOVERY_CODE_LENGTH,
} from "./constants";

export function generateRecoveryCode(): string {
  const alphabetLength = RECOVERY_CODE_ALPHABET.length;
  // 2-byte buckets give us 65,536 possible values per char; rejection-sample
  // any value above the largest exact multiple of alphabetLength to avoid bias.
  const limit = Math.floor(65536 / alphabetLength) * alphabetLength;
  const out: string[] = [];

  while (out.length < RECOVERY_CODE_LENGTH) {
    const buf = randomBytes((RECOVERY_CODE_LENGTH - out.length) * 2);
    for (let i = 0; i < buf.length && out.length < RECOVERY_CODE_LENGTH; i += 2) {
      const v = (buf[i] << 8) | buf[i + 1];
      if (v < limit) {
        out.push(RECOVERY_CODE_ALPHABET[v % alphabetLength]);
      }
    }
  }

  return out.join("");
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

export async function verifyRecoveryCode(
  code: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
