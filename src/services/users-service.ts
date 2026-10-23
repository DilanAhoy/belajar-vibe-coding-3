import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export class DuplicateEmailError extends Error {
  constructor(message = "Email sudah terdaftar") {
    super(message);
    this.name = "DuplicateEmailError";
  }
}

export const registerUser = async (input: RegisterUserInput) => {
  // Cek apakah email sudah terdaftar
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new DuplicateEmailError("Email sudah terdaftar");
  }

  // Hash password menggunakan bcrypt via Bun.password
  const hashedPassword = await Bun.password.hash(input.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Simpan data user baru
  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return { success: true };
};
