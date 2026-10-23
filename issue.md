# Task: Implementasi Swagger UI / OpenAPI Documentation (@elysiajs/swagger)

## 1. Deskripsi & Tujuan
Menambahkan dokumentasi interaktif API berbasis OpenAPI / Swagger UI ke dalam aplikasi ElysiaJS. Fitur ini bertujuan untuk memudahkan developer, frontend engineer, maupun consumer API dalam mempelajari spesifikasi endpoint, struktur payload request/response, dan mencoba (*testing*) pemanggilan API secara langsung dan visual melalui web browser.

Dokumen ini disusun sebagai panduan implementasi langkah demi langkah (*step-by-step roadmap*) yang detail dan mudah dieksekusi oleh junior programmer atau model AI pelaksana.

---

## 2. Library & Dependensi
- **Plugin Resmi**: [`@elysiajs/swagger`](https://elysiajs.com/plugins/swagger.html)
- **Runtime**: Bun (`bun add @elysiajs/swagger`)

---

## 3. Panduan Implementasi Bertahap (Step-by-Step Roadmap)

### Langkah 1: Instalasi Plugin Swagger
Buka terminal di root direktori proyek dan jalankan perintah instalasi:
```bash
bun add @elysiajs/swagger
```
Pastikan `@elysiajs/swagger` tercatat pada bagian `dependencies` di berkas `package.json`.

---

### Langkah 2: Registrasi Plugin di Server Entry Point (`src/index.ts`)
1. Buka berkas `src/index.ts`.
2. Import plugin `swagger` dari `@elysiajs/swagger`:
   ```ts
   import { swagger } from "@elysiajs/swagger";
   ```
3. Daftarkan plugin menggunakan `.use(swagger({...}))` pada instance `app`. Letakkan sebelum route modular.
4. Konfigurasikan metadata dokumentasi OpenAPI, minimal memuat:
   ```ts
   export const app = new Elysia()
     .use(
       swagger({
         path: "/swagger", // Path endpoint untuk mengakses UI Swagger
         documentation: {
           info: {
             title: "User Management & Authentication API",
             version: "1.0.0",
             description: "Dokumentasi interaktif RESTful API untuk sistem autentikasi dan manajemen sesi pengguna.",
           },
           tags: [
             { name: "Users", description: "Endpoint registrasi, autentikasi, profil, dan sesi pengguna" },
             { name: "System", description: "Endpoint kesehatan dan status aplikasi" },
           ],
           components: {
             securitySchemes: {
               bearerAuth: {
                 type: "http",
                 scheme: "bearer",
                 bearerFormat: "UUID",
                 description: "Masukkan token sesi yang didapatkan dari endpoint login",
               },
             },
           },
         },
       })
     )
     .get("/", () => ({ ... }), {
       detail: { tags: ["System"], summary: "Root Server Info" },
     })
     .use(healthRoutes)
     .use(usersRoute);
   ```

---

### Langkah 3: Tambahkan Metadata OpenAPI pada Route (`src/routes/users-route.ts`)
Buka berkas `src/routes/users-route.ts`. Pada setiap handler route, tambahkan properti `detail` di dalam objek konfigurasi/schema untuk memperkaya tampilan dokumentasi Swagger:

1. **`POST /` (Register)**:
   ```ts
   detail: {
     tags: ["Users"],
     summary: "Registrasi Pengguna Baru",
     description: "Mendaftarkan user baru dengan validasi panjang nama/email dan password yang di-hash menggunakan bcrypt.",
   }
   ```

2. **`POST /login` (Login)**:
   ```ts
   detail: {
     tags: ["Users"],
     summary: "Login Pengguna",
     description: "Memverifikasi kredensial email dan password serta menghasilkan token sesi UUID v4.",
   }
   ```

3. **`GET /current` (Get Current User)**:
   ```ts
   detail: {
     tags: ["Users"],
     summary: "Mendapatkan Data Profil Pengguna Saat Ini",
     description: "Mengambil informasi pengguna yang sedang terautentikasi berdasarkan token sesi Bearer. Kolom password tidak disertakan.",
     security: [{ bearerAuth: [] }],
   }
   ```

4. **`DELETE /logout` (Logout)**:
   ```ts
   detail: {
     tags: ["Users"],
     summary: "Logout Pengguna",
     description: "Menghapus token sesi aktif dari database tabel sessions.",
     security: [{ bearerAuth: [] }],
   }
   ```

---

### Langkah 4: Verifikasi & Pengujian Fitur

1. **Pemeriksaan Tipe Data (Typecheck)**:
   Pastikan tidak ada konflik tipe atau error TypeScript:
   ```bash
   bun run typecheck
   ```
2. **Menjalankan Unit Test**:
   Pastikan seluruh 19 skenario pengujian yang sudah ada tetap lolos tanpa terganggu oleh penambahan plugin:
   ```bash
   bun test
   ```
3. **Pengujian Tampilan & Endpoint Swagger**:
   - Jalankan server development:
     ```bash
     bun run dev
     ```
   - Buka browser dan akses URL: `http://localhost:3000/swagger`.
     - Verifikasi tampilan Swagger UI termuat dengan benar.
     - Periksa apakah seluruh endpoint (`/api/users`, `/api/users/login`, `/api/users/current`, `/api/users/logout`) terdaftar rapi di bawah tag **Users**.
   - Akses spesifikasi OpenAPI JSON via cURL atau browser:
     ```bash
     curl -i http://localhost:3000/swagger/json
     ```
     - Pastikan mengembalikan format JSON OpenAPI 3.0 / 3.1 dengan status code `200 OK`.

---

## 4. Acceptance Criteria
- [ ] Dependency `@elysiajs/swagger` terpasang di `package.json`.
- [ ] Endpoint `/swagger` dapat diakses di browser dan menampilkan antarmuka Swagger UI secara interaktif.
- [ ] Endpoint `/swagger/json` mengembalikan dokumen spesifikasi OpenAPI yang valid.
- [ ] Seluruh endpoint (`Register`, `Login`, `Current User`, `Logout`) memiliki `tags`, `summary`, dan `description` yang informatif.
- [ ] Endpoint terproteksi (`/current` dan `/logout`) memiliki konfigurasi keamanan `bearerAuth` di Swagger UI.
- [ ] Perintah `bun run typecheck` lolos tanpa error TypeScript.
- [ ] Seluruh skenario pengujian pada `bun test` tetap berstatus **PASS** (19 pass, 0 fail).
