import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export class DuplicateEmailError extends Error {
  constructor(message = "Email sudah terdaftar") {
    super(message);
    this.name = "DuplicateEmailError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = "Email atau password salah") {
    super(message);
    this.name = "InvalidCredentialsError";
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

export const loginUser = async (input: LoginUserInput) => {
  // Cari user berdasarkan email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new InvalidCredentialsError("Email atau password salah");
  }

  // Verifikasi password hash bcrypt
  const isPasswordValid = await Bun.password.verify(input.password, user.password);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError("Email atau password salah");
  }

  // Generate UUID token untuk sesi user
  const token = crypto.randomUUID();

  // Simpan session baru
  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return { token };
};
