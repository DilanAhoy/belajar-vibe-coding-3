import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  DuplicateEmailError,
  InvalidCredentialsError,
  UnauthorizedError,
} from "../services/users-service";

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: error.message,
      };
    }
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        await registerUser(body);
        set.status = 200; // atau 201
        return {
          data: "OK",
        };
      } catch (error: any) {
        if (error instanceof DuplicateEmailError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }

        set.status = 500;
        return {
          error: error?.message || "Internal server error",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.String({ format: "email", maxLength: 255 }),
        password: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object(
          {
            data: t.String({
              examples: ["OK"],
            }),
          },
          {
            description: "Registrasi berhasil",
            examples: [{ data: "OK" }],
          }
        ),
        400: t.Object(
          {
            error: t.String({
              examples: ["Validation error: email already registered"],
            }),
          },
          {
            description: "Validasi gagal atau email sudah terdaftar",
            examples: [{ error: "Validation error: email already registered" }],
          }
        ),
      },
      detail: {
        tags: ["Users"],
        summary: "Registrasi Pengguna Baru",
        description:
          "Mendaftarkan user baru dengan validasi panjang nama/email dan password yang di-hash menggunakan bcrypt.",
      },
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        set.status = 200;
        return {
          data: result.token,
        };
      } catch (error: any) {
        if (error instanceof InvalidCredentialsError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }

        set.status = 500;
        return {
          error: error?.message || "Internal server error",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object(
          {
            data: t.String({
              examples: ["123e4567-e89b-12d3-a456-426614174000"],
            }),
          },
          {
            description: "Login berhasil",
            examples: [
              { data: "123e4567-e89b-12d3-a456-426614174000" },
            ],
          }
        ),
        400: t.Object(
          {
            error: t.String({
              examples: ["Invalid email or password"],
            }),
          },
          {
            description: "Kredensial tidak valid",
            examples: [{ error: "Invalid email or password" }],
          }
        ),
      },
      detail: {
        tags: ["Users"],
        summary: "Login Pengguna",
        description:
          "Memverifikasi kredensial email dan password serta menghasilkan token sesi UUID v4.",
      },
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      const token = extractBearerToken(headers["authorization"]);
      if (!token) {
        set.status = 401;
        return {
          error: "unauthorized",
        };
      }

      try {
        const user = await getCurrentUser(token);
        set.status = 200;
        return {
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at:
              typeof user.created_at === "string"
                ? user.created_at
                : (user.created_at as Date)?.toISOString?.() ?? String(user.created_at),
          },
        };
      } catch (error: any) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return {
            error: "unauthorized",
          };
        }

        set.status = 500;
        return {
          error: error?.message || "Internal server error",
        };
      }
    },
    {
      response: {
        200: t.Object(
          {
            data: t.Object({
              id: t.Number({ examples: [1] }),
              name: t.String({ examples: ["Dilan"] }),
              email: t.String({ examples: ["dilan@example.com"] }),
              created_at: t.String({
                examples: ["2026-10-23T12:00:00.000Z"],
              }),
            }),
          },
          {
            description: "Data profil pengguna saat ini",
            examples: [
              {
                data: {
                  id: 1,
                  name: "Dilan",
                  email: "dilan@example.com",
                  created_at: "2026-10-23T12:00:00.000Z",
                },
              },
            ],
          }
        ),
        401: t.Object(
          {
            error: t.String({
              examples: ["Unauthorized"],
            }),
          },
          {
            description: "Token tidak valid atau sesi kadaluarsa",
            examples: [{ error: "Unauthorized" }],
          }
        ),
      },
      detail: {
        tags: ["Users"],
        summary: "Mendapatkan Data Profil Pengguna Saat Ini",
        description:
          "Mengambil informasi pengguna yang sedang terautentikasi berdasarkan token sesi Bearer. Kolom password tidak disertakan.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      const token = extractBearerToken(headers["authorization"]);
      if (!token) {
        set.status = 401;
        return {
          error: "unauthorized",
        };
      }

      try {
        await logoutUser(token);
        set.status = 200;
        return {
          data: "OK",
        };
      } catch (error: any) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return {
            error: "unauthorized",
          };
        }

        set.status = 500;
        return {
          error: error?.message || "Internal server error",
        };
      }
    },
    {
      response: {
        200: t.Object(
          {
            data: t.String({
              examples: ["OK"],
            }),
          },
          {
            description: "Logout berhasil",
            examples: [{ data: "OK" }],
          }
        ),
        401: t.Object(
          {
            error: t.String({
              examples: ["Unauthorized"],
            }),
          },
          {
            description: "Token tidak valid atau sesi kadaluarsa",
            examples: [{ error: "Unauthorized" }],
          }
        ),
      },
      detail: {
        tags: ["Users"],
        summary: "Logout Pengguna",
        description: "Menghapus token sesi aktif dari database tabel sessions.",
        security: [{ bearerAuth: [] }],
      },
    }
  );
