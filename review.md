### 🔍 Code Review - PR #11: Implement Logout User API

Secara fungsionalitas dan pemenuhan acceptance criteria, fitur logout pada PR ini sudah berjalan baik dan sesuai spesifikasi issue #10. Berikut beberapa saran perbaikan (*improvements*) dari aspek performa, logic handling, dan clean code yang dapat dipertimbangkan:

---

#### 1. ⚡ Optimasi Performa Database (Mengurangi Round-Trip Query)
**Lokasi**: `src/services/users-service.ts` (`logoutUser`)
- **Kondisi saat ini**: Menjalankan 2 kali query round-trip ke database:
  1. `SELECT id FROM sessions WHERE token = ? LIMIT 1`
  2. `DELETE FROM sessions WHERE id = ?`
- **Saran Perbaikan**:
  Jalankan operasi `DELETE` secara langsung dalam 1 query, lalu periksa jumlah baris yang terhapus (`affectedRows`):
  ```ts
  export const logoutUser = async (token: string) => {
    const [result] = await db
      .delete(sessions)
      .where(eq(sessions.token, token));

    if (result.affectedRows === 0) {
      throw new UnauthorizedError("unauthorized");
    }

    return { success: true };
  };
  ```
  *Dampak*: Memangkas latensi jaringan sebesar ~50% pada endpoint logout karena hanya memerlukan 1 kali round-trip ke MySQL.

---

#### 2. 🛡️ Penanganan Format Header Authorization (Inkonsistensi Case-Sensitivity)
**Lokasi**: `src/routes/users-route.ts`
- **Kondisi saat ini**:
  ```ts
  if (!authHeader || !authHeader.startsWith("Bearer ")) // Case-sensitive
  const token = authHeader.replace(/^Bearer\s+/i, "").trim(); // Case-insensitive
  ```
  Jika client/frontend mengirimkan header `Authorization: bearer <token>` (huruf kecil), request akan langsung ditolak dengan status 401.
- **Saran Perbaikan**:
  Gunakan regex case-insensitive yang konsisten:
  ```ts
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    set.status = 401;
    return { error: "unauthorized" };
  }
  ```

---

#### 3. 🧹 Clean Code & DRY (*Don't Repeat Yourself*)
**Lokasi**: `src/routes/users-route.ts`
- **Kondisi saat ini**: Logika pengecekan dan ekstraksi Bearer token pada `GET /current` dan `DELETE /logout` ditulis ulang secara identik (*duplicate code*).
- **Saran Perbaikan**:
  Ekstrak logika tersebut ke dalam satu helper function:
  ```ts
  function extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) return null;
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    return token || null;
  }
  ```
  Di handler route cukup memanggil helper tersebut agar kode lebih rapi, konsisten, dan mudah dimaintain jika ada endpoint terproteksi lainnya.

---

#### 4. 📌 Catatan Skema Database (Indexing pada Kolom `token`)
**Lokasi**: `src/db/schema.ts`
- Kolom `token` di tabel `sessions` saat ini belum memiliki index atau constraint `unique()`. Seiring bertambahnya data sesi, query lookup/delete berdasarkan `token` dapat memicu *full table scan*. Menambahkan constraint `.unique()` pada `sessions.token` akan membuat MySQL membuat B-Tree index yang menjaga performa query tetap instan.
