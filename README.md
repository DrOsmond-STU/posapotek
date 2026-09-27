# FarmaKasir — Purwarupa UI/UX POS Apotek

Purwarupa (prototype) interaktif aplikasi **POS & manajemen apotek multi-cabang**: penjualan obat, resep dokter, obat racikan, stok & kedaluwarsa, pembelian ke PBF, hingga laporan cabang, konsolidasi, dan sales.

Tema: **biru gradasi**, **tombol melayang berbayang** (efek elevasi, bayangan berwarna, terangkat saat hover), dan **warna tombol berbeda per fungsi** agar mudah dikenali.

## Cara menjalankan

Tidak perlu build. Buka `index.html` langsung di browser, atau jalankan server statis:

```bash
npx serve .          # atau: python3 -m http.server 8080
```

Versi satu file (semua CSS/JS digabung) tersedia di `dist/farmakasir-prototype.html`. Untuk membuat ulang:

```bash
node scripts/build-single.mjs              # dist/farmakasir-prototype.html
node scripts/build-single.mjs --fragment   # dist/farmakasir-artifact.html (untuk hosting artifact)
```

Butuh koneksi internet untuk font (Google Fonts: Plus Jakarta Sans, JetBrains Mono, Material Symbols) dan Chart.js (cdnjs).

## Modul & halaman

| Grup | Halaman (route) |
|---|---|
| Utama | Dashboard (`#dashboard`), Login (`#login`) |
| Transaksi | Kasir/POS (`#kasir`), Resep Dokter (`#resep`), Obat Racikan (`#racikan`), Retur Penjualan (`#retur`), Riwayat Transaksi (`#riwayat`), Shift & Kas (`#shift`) |
| Persediaan | Master Obat (`#obat`), Stok Obat (`#stok`), Stok Kedaluwarsa (`#kadaluarsa`), Stok Opname (`#opname`), Mutasi Antar Cabang (`#mutasi`), Kartu Stok (`#kartustok`) |
| Pembelian | Surat Pesanan (`#pesanan`), Penerimaan Barang (`#penerimaan`), Retur Pembelian (`#returbeli`), Hutang Supplier (`#hutang`), Supplier/PBF (`#supplier`) |
| Relasi | Pasien & Member (`#pelanggan`), Dokter (`#dokter`) |
| Laporan | Penjualan, Cabang, Konsolidasi, Sales, Laba Rugi, Persediaan, Pembelian, Kedaluwarsa, Narkotika & Psikotropika/SIPNAP (`#lap-*`) |
| Pengaturan | Manajemen Cabang, Pengguna & Hak Akses, Pengaturan Sistem, Log Aktivitas, **Panduan UI / Style Guide** (`#panduan`) |

## Bahasa warna tombol

| Varian | Warna | Fungsi |
|---|---|---|
| `primary` | Biru | Aksi utama: simpan, proses, navigasi |
| `success` | Hijau | Tambah, bayar, setujui, terima |
| `warning` | Oranye | Ubah/edit, tahan transaksi, penyesuaian |
| `danger` | Merah | Hapus, batal, void, pemusnahan, PDF |
| `info` | Cyan | Lihat detail, cek, preview |
| `purple` | Ungu | Resep, racikan, fitur farmasi khusus |
| `teal` | Toska | Export Excel, cetak, sinkronisasi |
| `dark` | Abu gelap | Kembali, tutup, riwayat |
| `pink` | Merah muda | Promo, diskon, member |

Detail lengkap (palet, tipografi, komponen, penandaan golongan obat) ada di halaman **Panduan UI** (`#panduan`).

## Struktur

```
index.html
assets/css/app.css        # design tokens (terang & gelap) + seluruh komponen
assets/js/data.js         # data contoh (fiktif)
assets/js/ui.js           # helper komponen (tombol, kartu, tabel, modal, toast, grafik)
assets/js/app.js          # shell, navigasi, router hash
assets/js/pages/*.js      # satu file per grup modul
scripts/build-single.mjs  # penggabung satu file
```

Semua data bersifat contoh/fiktif untuk keperluan demo.
