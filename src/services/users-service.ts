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

export class UnauthorizedError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Mendaftarkan pengguna baru ke database.
 * Memeriksa apakah email sudah terdaftar sebelumnya, melakukan hashing pada password
 * menggunakan algoritma bcrypt, dan menyimpan data akun ke tabel users.
 *
 * @param {RegisterUserInput} input - Data pendaftaran pengguna yang mencakup name, email, dan password.
 * @returns {Promise<{ success: boolean }>} Objek status keberhasilan pendaftaran user.
 * @throws {DuplicateEmailError} Dilempar jika alamat email sudah terdaftar di database.
 */
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

/**
 * Mengautentikasi pengguna berdasarkan email dan password.
 * Memverifikasi hash password bcrypt, membuat token sesi baru (UUID v4),
 * dan menyimpannya ke tabel sessions untuk melacak sesi aktif pengguna.
 *
 * @param {LoginUserInput} input - Kredensial login pengguna yang mencakup email dan password.
 * @returns {Promise<{ token: string }>} Objek berisi token sesi unik berbentuk UUID v4.
 * @throws {InvalidCredentialsError} Dilempar jika email tidak ditemukan atau password tidak cocok.
 */
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

/**
 * Mengambil data profil pengguna yang sedang aktif berdasarkan token sesi.
 * Melakukan query relasi inner join antara tabel sessions dan users,
 * serta memastikan kolom password tidak pernah disertakan demi keamanan.
 *
 * @param {string} token - Token sesi UUID pengguna yang tersimpan di tabel sessions.
 * @returns {Promise<{ id: number; name: string; email: string; created_at: Date }>} Objek profil pengguna yang terautentikasi.
 * @throws {UnauthorizedError} Dilempar jika sesi tidak ditemukan atau token tidak valid.
 */
export const getCurrentUser = async (token: string) => {
  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      created_at: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!result) {
    throw new UnauthorizedError("unauthorized");
  }

  return result;
};

/**
 * Mengakhiri sesi pengguna (logout) dengan menghapus record sesi dari database.
 * Melakukan single query DELETE ke tabel sessions berdasarkan token dan memvalidasi
 * jumlah baris yang terhapus untuk memastikan keberadaan sesi.
 *
 * @param {string} token - Token sesi UUID yang akan dihapus dari tabel sessions.
 * @returns {Promise<{ success: boolean }>} Objek status keberhasilan logout.
 * @throws {UnauthorizedError} Dilempar jika token sesi tidak ditemukan atau sudah pernah dihapus.
 */
export const logoutUser = async (token: string) => {
  const [result]: any = await db
    .delete(sessions)
    .where(eq(sessions.token, token));

  if (result.affectedRows === 0) {
    throw new UnauthorizedError("unauthorized");
  }

  return { success: true };
};
