import { describe, it, expect, beforeEach, afterEach, afterAll } from "bun:test";
import { app } from "../src";
import { db, connectionPool } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Helper untuk membersihkan database sebelum dan sesudah setiap test
async function clearDatabase() {
  await db.delete(sessions);
  await db.delete(users);
}

describe("Users API Integration Tests", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await connectionPool.end();
  });

  // ==========================================
  // 1. POST /api/users (Register)
  // ==========================================
  describe("POST /api/users (Register)", () => {
    it("harus berhasil mendaftarkan user baru dengan data valid (200 OK)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan",
            email: "dilan@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json).toEqual({ data: "OK" });

      // Verifikasi user tersimpan di DB & password ter-hash
      const [savedUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "dilan@example.com"))
        .limit(1);

      expect(savedUser).toBeDefined();
      expect(savedUser?.name).toBe("Dilan");
      expect(savedUser?.password).not.toBe("password123");
      const isMatch = await Bun.password.verify("password123", savedUser?.password || "");
      expect(isMatch).toBe(true);
    });

    it("harus gagal jika email sudah terdaftar (400 Bad Request)", async () => {
      // Registrasi pertama
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan",
            email: "dilan@example.com",
            password: "password123",
          }),
        })
      );

      // Registrasi kedua dengan email sama
      const duplicateRes = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan Duplicate",
            email: "dilan@example.com",
            password: "newpassword",
          }),
        })
      );

      expect(duplicateRes.status).toBe(400);
      const json = (await duplicateRes.json()) as any;
      expect(json.error).toBe("Email sudah terdaftar");
    });

    it("harus gagal jika panjang name melebihi 255 karakter (400 Bad Request)", async () => {
      const longName = "A".repeat(256);
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: longName,
            email: "toolong@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBeDefined();
    });

    it("harus gagal jika name kurang dari 1 karakter (400 Bad Request)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            email: "empty@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
    });

    it("harus gagal jika format email tidak valid (400 Bad Request)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan",
            email: "bukan-email-valid",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
    });

    it("harus gagal jika email melebihi 255 karakter (400 Bad Request)", async () => {
      const longEmail = "a".repeat(250) + "@b.com";
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan",
            email: longEmail,
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
    });

    it("harus gagal jika password kosong (400 Bad Request)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan",
            email: "dilan@example.com",
            password: "",
          }),
        })
      );

      expect(response.status).toBe(400);
    });
  });

  // ==========================================
  // 2. POST /api/users/login (Login)
  // ==========================================
  describe("POST /api/users/login (Login)", () => {
    beforeEach(async () => {
      // Siapkan user default
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan Login",
            email: "dilan_login@example.com",
            password: "password123",
          }),
        })
      );
    });

    it("harus berhasil login dengan kredensial benar dan membuat record session (200 OK)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "dilan_login@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toBeDefined();
      expect(typeof json.data).toBe("string");

      // Verifikasi token tercatat di tabel sessions
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, json.data))
        .limit(1);

      expect(session).toBeDefined();
      expect(session?.token).toBe(json.data);
    });

    it("harus gagal login jika password salah (400 Bad Request)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "dilan_login@example.com",
            password: "wrongpassword",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Email atau password salah");
    });

    it("harus gagal login jika email tidak ditemukan (400 Bad Request)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "notfound@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Email atau password salah");
    });
  });

  // ==========================================
  // 3. GET /api/users/current (Current User)
  // ==========================================
  describe("GET /api/users/current (Get Current User)", () => {
    let validToken: string;

    beforeEach(async () => {
      // Registrasi dan login user untuk mendapatkan token aktif
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan Current",
            email: "dilan_current@example.com",
            password: "password123",
          }),
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "dilan_current@example.com",
            password: "password123",
          }),
        })
      );
      const json = (await loginRes.json()) as any;
      validToken = json.data;
    });

    it("harus berhasil mengambil data user profil dengan token valid (200 OK)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("Dilan Current");
      expect(json.data.email).toBe("dilan_current@example.com");
      expect(json.data.created_at).toBeDefined();
      expect(json.data.password).toBeUndefined(); // Password tidak boleh diekspos
    });

    it("harus berhasil memproses token dengan awalan huruf kecil 'bearer ' (200 OK)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data.name).toBe("Dilan Current");
    });

    it("harus gagal jika tanpa header Authorization (401 Unauthorized)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as any;
      expect(json.error).toBe("unauthorized");
    });

    it("harus gagal jika format header bukan Bearer (401 Unauthorized)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Basic ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as any;
      expect(json.error).toBe("unauthorized");
    });

    it("harus gagal jika token tidak valid / tidak ada di DB (401 Unauthorized)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: "Bearer random-invalid-token",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as any;
      expect(json.error).toBe("unauthorized");
    });
  });

  // ==========================================
  // 4. DELETE /api/users/logout (Logout)
  // ==========================================
  describe("DELETE /api/users/logout (Logout)", () => {
    let validToken: string;

    beforeEach(async () => {
      // Registrasi dan login user untuk mendapatkan token aktif
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dilan Logout",
            email: "dilan_logout@example.com",
            password: "password123",
          }),
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "dilan_logout@example.com",
            password: "password123",
          }),
        })
      );
      const json = (await loginRes.json()) as any;
      validToken = json.data;
    });

    it("harus berhasil logout dan menghapus token session dari database (200 OK)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json).toEqual({ data: "OK" });

      // Verifikasi token terhapus dari tabel sessions
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, validToken))
        .limit(1);

      expect(session).toBeUndefined();
    });

    it("harus menolak request GET /current setelah user logout (401 Unauthorized)", async () => {
      // Logout terlebih dahulu
      await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      // Coba akses current user dengan token yang sama
      const currentRes = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(currentRes.status).toBe(401);
      const json = (await currentRes.json()) as any;
      expect(json.error).toBe("unauthorized");
    });

    it("harus gagal jika mencoba logout ulang dengan token yang sudah di-logout (401 Unauthorized)", async () => {
      // Logout pertama
      await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      // Logout kedua
      const secondLogoutRes = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(secondLogoutRes.status).toBe(401);
      const json = (await secondLogoutRes.json()) as any;
      expect(json.error).toBe("unauthorized");
    });

    it("harus gagal jika logout tanpa menyertakan header Authorization (401 Unauthorized)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as any;
      expect(json.error).toBe("unauthorized");
    });
  });
});
