# TIS LKS Instalasi Listrik

Aplikasi web untuk memantau pelatihan LKS Electrical Installations. Fiturnya: jadwal, try out (TO), marking scheme, penilaian per aspek, gate test, laporan cetak, jurnal latihan, dan seleksi peserta.

- **Tampilan:** halaman web di GitHub Pages, gratis.
- **Data:** database Supabase, gratis.
- **Perangkat:** bisa dibuka dan diedit dari HP maupun laptop. Data langsung sama di semua perangkat.
- **Jangka panjang:** bisa dipakai bertahun-tahun. Setiap musim baru dibuat dari menu **Pengaturan › Musim**.

Pemasangan cukup **sekali** dan sebaiknya memakai laptop. Waktunya sekitar 30–45 menit.

---

## Isi folder

| Berkas | Fungsi |
| --- | --- |
| `index.html` | Halaman utama |
| `app.js`, `views.js`, `settings.js`, `main.js` | Program aplikasi |
| `style.css` | Tampilan |
| `config.js` | **Satu-satunya berkas yang perlu Bapak ubah** (alamat & kunci Supabase) |
| `seed.js` | Template musim bawaan (jadwal 2026–2027, 8 TO, marking scheme, gate) |
| `setup.sql` | Skrip pembuat database, dijalankan sekali di Supabase |
| `manifest.webmanifest`, `icon.svg` | Agar bisa dipasang di layar utama HP |

---

## Langkah 0 · Coba dulu tanpa database (opsional)

Buka `index.html` lewat server lokal, atau langsung unggah ke GitHub Pages (Langkah 3) dengan `config.js` masih kosong. Aplikasi berjalan dalam **MODE DEMO**: semua menu bisa dicoba, tetapi data hanya tersimpan di browser itu.

---

## Langkah 1 · Buat database di Supabase

1. Buka **https://supabase.com**, lalu klik **Start your project** dan daftar (bisa memakai akun GitHub atau Google).
2. Klik **New project**, lalu isi:
   - **Name:** `tis-lks`
   - **Database Password:** buat kata sandi kuat dan simpan.
   - **Region:** Southeast Asia (Singapore).
   - Klik **Create new project** dan tunggu ±2 menit.
3. Di menu kiri, buka **SQL Editor** › **New query**.
4. Buka berkas `setup.sql` dengan Notepad, salin **seluruh** isinya, tempel ke SQL Editor, lalu klik **Run**. Bila muncul *Success. No rows returned*, database sudah siap. Musim "LKS EI 2026–2027" beserta jadwal, 8 TO, marking scheme, gate, dan 2 peserta contoh juga sudah terisi.
5. Ambil kunci koneksi: klik tombol **Connect** di atas (atau **Project Settings › API**). Salin dua nilai berikut:
   - **Project URL**, contoh `https://abcdxyz.supabase.co`
   - **anon public key**, berupa teks panjang yang diawali `eyJ...`

   Kunci *anon* memang aman ditaruh di halaman web karena data dilindungi aturan keamanan di `setup.sql`. **Jangan** pernah memakai kunci *service_role*.

## Langkah 2 · Buat akun pengguna pertama (admin)

1. Di Supabase, buka **Authentication › Users › Add user › Create new user**.
2. Isi e-mail dan kata sandi Bapak, **centang Auto Confirm User**, lalu klik **Create user**.
3. Pengguna **pertama** otomatis menjadi **Admin**. Pengguna berikutnya otomatis menjadi **Pengamat**, dan perannya bisa diubah dari aplikasi (Pengaturan › Pengguna).

| Peran | Hak |
| --- | --- |
| Admin (pembina) | Semua menu, termasuk Pengaturan dan mengunci nilai |
| Juri (asisten) | Mengisi nilai TO, centang jadwal, gate, jurnal |
| Pengamat (siswa/guru lain) | Hanya melihat |

Ulangi langkah ini untuk 2 asisten (lalu jadikan **Juri**) dan untuk siswa bila perlu (biarkan **Pengamat**).

## Langkah 3 · Pasang halaman di GitHub Pages

1. Buka **https://github.com**, lalu daftar atau masuk.
2. Klik **+ › New repository**. Isi nama `tis-lks`, pilih **Public**, lalu klik **Create repository**.
3. Klik tautan **uploading an existing file**. Seret **semua berkas** dari folder ini ke halaman itu, lalu klik **Commit changes**.
4. Buka berkas `config.js` di GitHub, klik ikon pensil (Edit), lalu isi:
   ```js
   SUPABASE_URL: "https://abcdxyz.supabase.co",
   SUPABASE_ANON_KEY: "eyJ...kunci-panjang...",
   SCHOOL: "SMK Negeri ..."
   ```
   Klik **Commit changes**.
5. Buka **Settings › Pages**. Di bagian *Build and deployment*, pilih **Source: Deploy from a branch**, **Branch: main / (root)**, lalu klik **Save**.
6. Tunggu 1–2 menit. Alamat aplikasi muncul di halaman itu, misalnya `https://namaakun.github.io/tis-lks/`.

## Langkah 4 · Masuk dan atur

1. Buka alamat aplikasi, lalu masuk dengan akun admin dari Langkah 2.
2. Buka **Peserta**: ganti nama kedua siswa.
3. Buka **Pengaturan › Pengguna**: ubah peran kedua asisten menjadi **Juri**.
4. Selesai. Jadwal, TO, dan marking scheme sudah terisi sesuai program.

## Langkah 5 · Pasang di HP

- **Android (Chrome):** buka alamat aplikasi, ketuk menu ⋮ › **Tambahkan ke layar utama**.
- **iPhone (Safari):** buka alamat aplikasi, ketuk tombol bagikan › **Tambah ke Layar Utama**.

Ikon TIS akan muncul seperti aplikasi biasa. Setiap juri masuk dengan akunnya sendiri.

---

## Pemakaian jangka panjang

- **Musim baru (tahun depan):** Pengaturan › Musim › *Buat musim baru*. Jadwal, TO, scheme, dan gate disalin dengan tanggal digeser otomatis (misalnya 52 minggu). Data musim lama tetap tersimpan dan bisa dibuka kapan saja lewat pilihan *Musim* di bagian atas.
- **Ubah jadwal, TO, marking scheme, gate, angka teknis, bobot seleksi:** semua lewat menu Pengaturan, dan bisa dari HP.
- **Cadangan:** Pengaturan › Backup › *Unduh cadangan* setiap bulan, lalu simpan di Google Drive.
- **Batas paket gratis Supabase:** 500 MB database. Ini jauh lebih dari cukup untuk data latihan bertahun-tahun. Proyek gratis yang **tidak dibuka selama 7 hari** akan dijeda otomatis oleh Supabase. Cukup buka dashboard Supabase dan klik **Restore** bila itu terjadi. Selama aplikasi dipakai rutin, hal ini tidak terjadi.
- **Lupa kata sandi:** admin membuka Supabase › Authentication › Users › pilih pengguna › *Send password recovery*, atau hapus lalu buat ulang akunnya.

## Masalah yang sering ditemui

| Gejala | Penyebab dan solusi |
| --- | --- |
| Muncul pita kuning MODE DEMO | `config.js` belum diisi atau salah ketik. Periksa tanda kutip dan koma. |
| "E-mail atau kata sandi salah" | Periksa huruf besar/kecil. Pastikan akun dibuat dengan *Auto Confirm User*. |
| Kotak nilai tidak bisa diisi | Peran Anda Pengamat, atau TO sudah dikunci admin. |
| "Akun Anda tidak punya izin" | Minta admin mengubah peran Anda menjadi Juri. |
| Tampilan belum berubah setelah update | Muat ulang halaman, atau tutup dan buka lagi aplikasi di HP. |
| Kaki halaman tertulis OFFLINE | Internet terputus. Nilai yang gagal disimpan bertanda ✗. Isi ulang setelah online. |

Versi aplikasi: lihat kaki halaman (misalnya `v2027.1`).
