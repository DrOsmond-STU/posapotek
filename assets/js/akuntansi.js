/* =====================================================================
   Mesin akuntansi (window.GL) — satu sumber data untuk:
   COA, jurnal umum, buku besar, neraca saldo, neraca, laba rugi & konsolidasi.
   Jurnal dibentuk otomatis dari transaksi operasional (kasir, resep, pembelian,
   hutang, mutasi, kedaluwarsa, penggajian, penyesuaian) + jurnal manual.
   Semua angka fiktif & deterministik.
   ===================================================================== */
(function () {
  const R = Math.round;
  const TODAY = DB.TODAY;
  const Y = TODAY.getFullYear();
  const M = TODAY.getMonth();
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  /* ---------------- Chart of Account ----------------
     [kode, nama, normal, header?]  tipe diturunkan dari digit pertama */
  const RAW = [
    ["1", "ASET", "D", 1],
    ["1-1000", "Aset Lancar", "D", 1],
    ["1-1100", "Kas & Setara Kas", "D", 1],
    ["1-1101", "Kas Kecil Kasir", "D"],
    ["1-1102", "Kas Besar (Brankas)", "D"],
    ["1-1103", "Bank BCA - Operasional", "D"],
    ["1-1104", "Bank Mandiri - Settlement EDC/QRIS", "D"],
    ["1-1200", "Piutang", "D", 1],
    ["1-1201", "Piutang Usaha B2B (Klinik & Praktik)", "D"],
    ["1-1202", "Piutang Klaim BPJS PRB", "D"],
    ["1-1203", "Piutang Settlement Kartu & QRIS", "D"],
    ["1-1204", "Piutang Antar Cabang", "D"],
    ["1-1300", "Persediaan", "D", 1],
    ["1-1301", "Persediaan Obat", "D"],
    ["1-1302", "Persediaan Alat Kesehatan", "D"],
    ["1-1303", "Persediaan Karantina (ED/Rusak)", "D"],
    ["1-1400", "Pajak & Biaya Dibayar Dimuka", "D", 1],
    ["1-1401", "PPN Masukan", "D"],
    ["1-1402", "PPh 25 Dibayar Dimuka", "D"],
    ["1-1403", "Sewa Dibayar Dimuka", "D"],
    ["1-2000", "Aset Tidak Lancar", "D", 1],
    ["1-2101", "Peralatan Apotek (Rak, Lemari Pendingin)", "D"],
    ["1-2102", "Perangkat Komputer & POS", "D"],
    ["1-2103", "Kendaraan Operasional", "D"],
    ["1-2104", "Renovasi Gedung Sewa", "D"],
    ["1-2109", "Akumulasi Penyusutan", "K"],
    ["2", "LIABILITAS", "K", 1],
    ["2-1000", "Liabilitas Jangka Pendek", "K", 1],
    ["2-1101", "Hutang Usaha (PBF)", "K"],
    ["2-1102", "Hutang Antar Cabang", "K"],
    ["2-1201", "PPN Keluaran", "K"],
    ["2-1202", "Hutang PPh 21", "K"],
    ["2-1203", "Hutang PPh Badan (PPh 29)", "K"],
    ["2-1301", "Beban Masih Harus Dibayar", "K"],
    ["2-1302", "Pendapatan Diterima Dimuka (Poin Member)", "K"],
    ["2-2000", "Liabilitas Jangka Panjang", "K", 1],
    ["2-2101", "Hutang Bank Jangka Panjang", "K"],
    ["3", "EKUITAS", "K", 1],
    ["3-1101", "Modal Disetor", "K"],
    ["3-1201", "Saldo Laba Ditahan", "K"],
    ["3-1301", "Laba Tahun Berjalan", "K"],
    ["3-1401", "Dividen / Prive", "D"],
    ["4", "PENDAPATAN", "K", 1],
    ["4-1000", "Penjualan", "K", 1],
    ["4-1101", "Penjualan Obat Bebas (Swamedikasi)", "K"],
    ["4-1102", "Penjualan Obat Resep", "K"],
    ["4-1103", "Penjualan Obat Racikan", "K"],
    ["4-1104", "Penjualan B2B (Klinik & Praktik)", "K"],
    ["4-1105", "Penjualan BPJS PRB", "K"],
    ["4-1201", "Pendapatan Jasa (Tuslah, Embalase, Racik)", "K"],
    ["4-1301", "Diskon Penjualan", "D"],
    ["4-1302", "Retur Penjualan", "D"],
    ["4-1401", "Penjualan Internal Antar Cabang", "K"],
    ["5", "HARGA POKOK PENJUALAN", "D", 1],
    ["5-1101", "HPP Obat & Alkes", "D"],
    ["5-1102", "HPP Internal Antar Cabang", "D"],
    ["5-1201", "Kerugian Obat Kedaluwarsa", "D"],
    ["5-1202", "Selisih Stok Opname", "D"],
    ["6", "BEBAN USAHA", "D", 1],
    ["6-1101", "Beban Gaji & Tunjangan", "D"],
    ["6-1102", "Beban BPJS Ketenagakerjaan & Kesehatan", "D"],
    ["6-1201", "Beban Sewa Gedung", "D"],
    ["6-1202", "Beban Listrik, Air & Internet", "D"],
    ["6-1301", "Beban Penyusutan", "D"],
    ["6-1401", "Beban Pemasaran & Promosi", "D"],
    ["6-1402", "Beban Administrasi Bank & MDR", "D"],
    ["6-1501", "Beban ATK & Perlengkapan", "D"],
    ["6-1502", "Beban Pemeliharaan & Perbaikan", "D"],
    ["6-1601", "Beban Perizinan (SIA, SIPA, STRA)", "D"],
    ["6-1901", "Beban Operasional Lain", "D"],
    ["7", "PENDAPATAN & BEBAN LAIN-LAIN", "K", 1],
    ["7-1101", "Rebate & Bonus PBF", "K"],
    ["7-1102", "Pendapatan Jasa Giro", "K"],
    ["7-2101", "Beban Bunga Pinjaman", "D"],
    ["8", "PAJAK PENGHASILAN", "D", 1],
    ["8-1101", "Beban PPh Badan", "D"],
  ];
  const TIPE = { 1: "Aset", 2: "Liabilitas", 3: "Ekuitas", 4: "Pendapatan", 5: "HPP", 6: "Beban", 7: "Lain-lain", 8: "Pajak" };
  const HEAD = new Set(RAW.filter((r) => r[3]).map((r) => r[0]));
  const parentOf = (kode) => {
    if (kode.length === 1) return null;
    if (/000$/.test(kode)) return kode[0];
    const p3 = kode.slice(0, 4) + "00";
    if (p3 !== kode && HEAD.has(p3)) return p3;
    const p2 = kode.slice(0, 3) + "000";
    return HEAD.has(p2) ? p2 : kode[0];
  };
  const COA = [];
  RAW.forEach(([kode, nama, normal, header]) => {
    const parent = parentOf(kode);
    const level = parent ? COA.find((a) => a.kode === parent).level + 1 : 1;
    COA.push({ kode, nama, normal, header: !!header, level, parent, tipe: TIPE[kode[0]], laporan: +kode[0] <= 3 ? "Neraca" : "Laba Rugi", aktif: true });
  });
  const akun = (k) => COA.find((a) => a.kode === k);
  const DETAIL = COA.filter((a) => !a.header);
  const isNeraca = (k) => +k[0] <= 3;

  /* ---------------- util ---------------- */
  const rng = (s) => { let x = s % 2147483647 || 1; return () => { x = (x * 48271) % 2147483647; return x / 2147483647; }; };
  const CAB = DB.cabang;
  const BASE = CAB[0].omzet;
  const SEWA = { PST: 42e6, BKS: 28e6, DPK: 24e6, TGR: 26e6, BGR: 18e6 };
  const LISTRIK = { PST: 14.2e6, BKS: 9.6e6, DPK: 8.3e6, TGR: 9.1e6, BGR: 6.2e6 };
  const SUSUT = { PST: 11.4e6, BKS: 6.6e6, DPK: 5.9e6, TGR: 6.3e6, BGR: 4.4e6 };
  const HPP_R = { PST: 0.689, BKS: 0.682, DPK: 0.698, TGR: 0.686, BGR: 0.705 };
  const MDR = 0.0072;
  const yymm = (y, m) => String(y).slice(2) + String(m + 1).padStart(2, "0");

  /* ---------------- pembangkit jurnal per bulan ---------------- */
  const cache = {};
  function genMonth(off) {
    if (cache[off]) return cache[off];
    const d0 = new Date(Y, M + off, 1);
    const y = d0.getFullYear(), m = d0.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const upto = off === 0 ? TODAY.getDate() : last;
    const endDay = Math.min(last, upto);
    const out = [];
    const seq = {};
    const no = (pre, cab) => { const k = pre + cab; seq[k] = (seq[k] || 0) + 1; return `${pre}/${cab}/${yymm(y, m)}/${String(seq[k]).padStart(3, "0")}`; };
    const J = (day, cab, pre, sumber, ref, ket, lines) => {
      const L = lines.filter((l) => l && (l.d || l.k)).map((l) => ({ akun: l.akun, d: R(l.d || 0), k: R(l.k || 0) }));
      const dt = L.reduce((s, l) => s + l.d, 0), kt = L.reduce((s, l) => s + l.k, 0);
      if (dt !== kt) { const fix = L[L.length - 1]; if (fix.k) fix.k += dt - kt; else fix.d += kt - dt; }
      out.push({ no: no(pre, cab), tgl: iso(new Date(y, m, day)), cabang: cab, sumber, ref, ket, lines: L, status: "Posted", user: sumber === "Manual" ? "Teguh S. (Keuangan)" : "Sistem" });
    };

    CAB.forEach((c, ci) => {
      const r = rng((y * 100 + m) * 10 + ci + 7);
      const f = (a, b) => a + r() * (b - a);
      const s = c.omzet / BASE;
      const monthly = c.omzet * (1 + off * 0.006) * f(0.97, 1.03);
      let pendHari = [];
      // --- penjualan harian (rekap kasir & resep) + HPP ---
      for (let d = 1; d <= endDay; d++) {
        const wd = new Date(y, m, d).getDay();
        const bruto = monthly / last * (wd === 0 || wd === 6 ? 1.12 : 0.95) * f(0.9, 1.1);
        const bebas = bruto * 0.62, resepV = bruto * 0.21, racik = bruto * 0.045, b2b = c.id === "PST" ? bruto * 0.07 : bruto * 0.02, bpjs = bruto * 0.045;
        const jasa = bruto * 0.012;
        const diskon = (bebas + resepV) * 0.021;
        const net = bebas + resepV + racik + b2b + bpjs + jasa - diskon;
        const ppn = net * 0.11;
        const tot = net + ppn;
        const bpjsTot = bpjs * 1.11, b2bTot = b2b * 1.11;
        const tunai = (tot - bpjsTot - b2bTot) * 0.42;
        const nonTunai = tot - bpjsTot - b2bTot - tunai;
        const ref = `INV/${c.id}/${String(d).padStart(2, "0")}${String(m + 1).padStart(2, "0")}/0001–${String(R(c.trx / 30 * f(0.9, 1.1))).padStart(4, "0")}`;
        J(d, c.id, "PJ", "Kasir & Resep", ref, `Rekap penjualan kasir & resep ${d} ${BULAN[m]}`, [
          { akun: "1-1101", d: tunai }, { akun: "1-1203", d: nonTunai }, { akun: "1-1201", d: b2bTot }, { akun: "1-1202", d: bpjsTot },
          { akun: "4-1301", d: diskon },
          { akun: "4-1101", k: bebas }, { akun: "4-1102", k: resepV }, { akun: "4-1103", k: racik }, { akun: "4-1104", k: b2b }, { akun: "4-1105", k: bpjs },
          { akun: "4-1201", k: jasa }, { akun: "2-1201", k: ppn },
        ]);
        const hpp = (net - jasa) * HPP_R[c.id] * f(0.99, 1.01);
        J(d, c.id, "PJ", "Kasir & Resep", "FEFO otomatis", `HPP penjualan ${d} ${BULAN[m]} (metode FEFO)`, [
          { akun: "5-1101", d: hpp }, { akun: "1-1301", k: hpp * 0.93 }, { akun: "1-1302", k: hpp * 0.07 },
        ]);
        pendHari.push({ d, tunai, nonTunai, hpp, b2bTot });
        // setoran kas ke bank (H+0 sore) & settlement EDC/QRIS (H+1)
        J(d, c.id, "KM", "Kas & Bank", `STR/${c.id}/${String(d).padStart(2, "0")}`, "Setoran kas harian ke Bank BCA", [
          { akun: "1-1103", d: tunai * 0.96 }, { akun: "1-1101", k: tunai * 0.96 },
        ]);
        if (d > 1) {
          const p = pendHari[pendHari.length - 2];
          J(d, c.id, "BK", "Kas & Bank", `STL/EDC-QRIS/${String(d - 1).padStart(2, "0")}`, `Settlement EDC & QRIS transaksi tgl ${d - 1}`, [
            { akun: "1-1104", d: p.nonTunai * (1 - MDR) }, { akun: "6-1402", d: p.nonTunai * MDR }, { akun: "1-1203", k: p.nonTunai },
          ]);
        }
        // pembelian ke PBF tiap 3 hari
        if (d % 3 === 0) {
          const buy = pendHari.slice(-3).reduce((a, x) => a + x.hpp, 0) * f(0.98, 1.08);
          const sp = DB.supplier[(d / 3 + ci) % DB.supplier.length];
          J(d, c.id, "PB", "Pembelian", `FKT/${sp.id}/${yymm(y, m)}${String(d).padStart(2, "0")}`, `Penerimaan barang dari ${sp.nama}`, [
            { akun: "1-1301", d: buy * 0.93 }, { akun: "1-1302", d: buy * 0.07 }, { akun: "1-1401", d: buy * 0.11 }, { akun: "2-1101", k: buy * 1.11 },
          ]);
        }
        // pembayaran hutang PBF tiap Jumat
        if (wd === 5) {
          const pay = monthly * HPP_R[c.id] * 1.11 * 0.9 / 4.3 * f(0.95, 1.05);
          J(d, c.id, "BK", "Hutang Supplier", `PAY/${c.id}/${String(d).padStart(2, "0")}`, "Pembayaran hutang PBF jatuh tempo (TOP 30–45 hari)", [
            { akun: "2-1101", d: pay }, { akun: "1-1104", k: pay * 0.6 }, { akun: "1-1103", k: pay * 0.4 },
          ]);
        }
        // pelunasan piutang B2B tiap Senin
        if (wd === 1 && pendHari.length > 3) {
          const col = pendHari.slice(-7).reduce((a, x) => a + x.b2bTot, 0) * f(0.9, 1.05);
          J(d, c.id, "BK", "Piutang", `RCV/B2B/${c.id}/${String(d).padStart(2, "0")}`, "Pelunasan piutang klinik & praktik dokter", [
            { akun: "1-1103", d: col }, { akun: "1-1201", k: col },
          ]);
        }
        // retur penjualan tiap Sabtu
        if (wd === 6) {
          const rt = bruto * 0.035;
          J(d, c.id, "PJ", "Retur Penjualan", `RTR/${c.id}/${String(d).padStart(2, "0")}`, "Retur penjualan (kemasan rusak / salah obat)", [
            { akun: "4-1302", d: rt }, { akun: "2-1201", d: rt * 0.11 }, { akun: "1-1101", k: rt * 1.11 },
          ]);
          J(d, c.id, "PJ", "Retur Penjualan", `RTR/${c.id}/${String(d).padStart(2, "0")}`, "Pengembalian stok dari retur penjualan", [
            { akun: "1-1301", d: rt * HPP_R[c.id] }, { akun: "5-1101", k: rt * HPP_R[c.id] },
          ]);
        }
      }
      const dim = (dd) => Math.min(dd, endDay);
      // --- kejadian bulanan ---
      J(1, c.id, "PY", "Penyesuaian", `AMR/SEWA/${c.id}`, "Amortisasi sewa gedung dibayar dimuka", [
        { akun: "6-1201", d: SEWA[c.id] }, { akun: "1-1403", k: SEWA[c.id] },
      ]);
      if (endDay >= 5) J(5, c.id, "KK", "Kas & Bank", `KK/${c.id}/ATK`, "Pembelian ATK, kertas puyer, plastik klip & etiket", [
        { akun: "6-1501", d: 2.4e6 * s * f(0.9, 1.1) }, { akun: "1-1101", k: 2.4e6 * s },
      ]);
      if (endDay >= 10) J(10, c.id, "BK", "Kas & Bank", `PRM/${c.id}`, "Promosi member & diskon marketplace", [
        { akun: "6-1401", d: monthly * 0.015 }, { akun: "1-1103", k: monthly * 0.015 },
      ]);
      if (c.id === "PST" && endDay >= 12) J(12, c.id, "BK", "Kas & Bank", "KRD/BCA/0921", "Angsuran pinjaman investasi BCA (pokok + bunga)", [
        { akun: "2-2101", d: 21e6 }, { akun: "7-2101", d: 4.9e6 }, { akun: "1-1103", k: 25.9e6 },
      ]);
      if (endDay >= 15) {
        J(15, c.id, "BK", "Piutang", `KLM/BPJS/${c.id}`, "Penerimaan klaim BPJS PRB bulan lalu", [
          { akun: "1-1103", d: monthly * 0.045 * 1.11 * f(0.9, 1) }, { akun: "1-1202", k: monthly * 0.045 * 1.11 * f(0.9, 1) },
        ]);
        J(15, c.id, "BK", "Pajak", `SSP/PPH25/${c.id}`, "Setoran angsuran PPh Pasal 25", [
          { akun: "1-1402", d: monthly * 0.0095 }, { akun: "1-1103", k: monthly * 0.0095 },
        ]);
        J(15, c.id, "PY", "Pembelian", `REB/PBF/${c.id}`, "Rebate & bonus pencapaian target PBF (potong hutang)", [
          { akun: "2-1101", d: monthly * 0.0038 }, { akun: "7-1101", k: monthly * 0.0038 },
        ]);
      }
      if (endDay >= 18) {
        const ed = monthly * 0.0028 * f(0.7, 1.3);
        J(18, c.id, "PY", "Kedaluwarsa", `BAP/${c.id}/${yymm(y, m)}`, "Pemusnahan obat kedaluwarsa (berita acara)", [
          { akun: "5-1201", d: ed }, { akun: "1-1301", k: ed },
        ]);
      }
      if (endDay >= 20) {
        const ppnK = c.omzet * 0.11 * 0.97, ppnM = c.omzet * 0.672 * 1.04 * 0.11;
        J(20, c.id, "BK", "Pajak", `SSP/PPN/${c.id}`, "Setor PPN masa bulan lalu (PPN keluaran − masukan)", [
          { akun: "2-1201", d: ppnK }, { akun: "1-1401", k: ppnM }, { akun: "1-1103", k: ppnK - ppnM },
        ]);
      }
      if (endDay >= 20) J(20, c.id, "BK", "Kas & Bank", `PLN/PDAM/${c.id}`, "Pembayaran listrik, air & internet", [
        { akun: "6-1202", d: LISTRIK[c.id] * f(0.95, 1.05) }, { akun: "1-1103", k: LISTRIK[c.id] },
      ]);
      if (endDay >= 22) J(22, c.id, "PY", "Stok Opname", `OPN/${c.id}/${yymm(y, m)}`, "Penyesuaian selisih stok opname", [
        { akun: "5-1202", d: monthly * 0.0006 * f(0.5, 1.5) }, { akun: "1-1301", k: monthly * 0.0006 },
      ]);
      if (endDay >= 25) {
        const gaji = c.karyawan * 8.2e6;
        J(25, c.id, "BK", "Penggajian", `GJ/${c.id}/${yymm(y, m)}`, `Pembayaran gaji ${c.karyawan} karyawan & BPJS`, [
          { akun: "6-1101", d: gaji }, { akun: "6-1102", d: gaji * 0.057 },
          { akun: "2-1202", k: gaji * 0.045 }, { akun: "1-1103", k: gaji * 1.012 },
        ]);
      }
      // penyesuaian akhir periode (bulan berjalan: per hari ini)
      J(dim(last), c.id, "PY", "Penyesuaian", `PNY/${c.id}/${yymm(y, m)}`, "Penyusutan aset tetap (garis lurus)", [
        { akun: "6-1301", d: SUSUT[c.id] }, { akun: "1-2109", k: SUSUT[c.id] },
      ]);
      J(dim(last), c.id, "PY", "Penyesuaian", `AKR/${c.id}/${yymm(y, m)}`, "Akrual beban pemeliharaan, perizinan & operasional lain", [
        { akun: "6-1502", d: 3.1e6 * s }, { akun: "6-1601", d: 0.9e6 * s }, { akun: "6-1901", d: monthly * 0.011 }, { akun: "2-1301", k: 4e6 * s + monthly * 0.011 },
      ]);
      J(dim(last), c.id, "BK", "Kas & Bank", `JSG/${c.id}`, "Jasa giro & pajak jasa giro", [
        { akun: "1-1103", d: monthly * 0.0005 }, { akun: "7-1102", k: monthly * 0.0005 },
      ]);
    });

    // --- mutasi antar cabang (dicatat pada harga pokok) ---
    const MUT = [["PST", "BGR", 6.42e6, 3], ["BKS", "DPK", 3.18e6, 9], ["PST", "TGR", 9.87e6, 14], ["TGR", "PST", 1.24e6, 21]];
    MUT.forEach(([a, b, v0, day], i) => {
      if (day > endDay) return;
      const v = v0 * (1 + ((off * 7 + i) % 5) * 0.08);
      const ref = `MUT/${yymm(y, m)}/${String(11 + i).padStart(3, "0")}`;
      J(day, a, "MT", "Mutasi Cabang", ref, `Mutasi keluar ke ${UI.cabangNama(b)}`, [
        { akun: "1-1204", d: v }, { akun: "4-1401", k: v },
      ]);
      J(day, a, "MT", "Mutasi Cabang", ref, "HPP mutasi keluar", [
        { akun: "5-1102", d: v }, { akun: "1-1301", k: v },
      ]);
      J(day, b, "MT", "Mutasi Cabang", ref, `Mutasi masuk dari ${UI.cabangNama(a)}`, [
        { akun: "1-1301", d: v }, { akun: "2-1102", k: v },
      ]);
    });

    // --- estimasi PPh badan per cabang (setelah seluruh transaksi) ---
    CAB.forEach((c) => {
      const lr = sumLR(out.filter((j) => j.cabang === c.id));
      const tax = Math.max(0, R(lr * 0.22));
      if (tax) J(endDay, c.id, "PY", "Pajak", `PPH/${c.id}/${yymm(y, m)}`, "Estimasi beban PPh Badan 22% periode berjalan", [
        { akun: "8-1101", d: tax }, { akun: "2-1203", k: tax },
      ]);
    });

    // --- jurnal manual contoh (bulan berjalan) ---
    if (off === 0) {
      if (endDay >= 8) J(8, "PST", "JM", "Manual", "MEMO/KEU/0917", "Reklasifikasi biaya kirim PBF ke persediaan", [
        { akun: "1-1301", d: 1.85e6 }, { akun: "6-1901", k: 1.85e6 },
      ]);
      if (endDay >= 16) J(16, "BKS", "JM", "Manual", "MEMO/KEU/0921", "Koreksi salah posting beban listrik ke ATK", [
        { akun: "6-1202", d: 640000 }, { akun: "6-1501", k: 640000 },
      ]);
      if (endDay >= 24) J(24, "PST", "JM", "Manual", "SK/DIR/2026/09", "Pembagian dividen interim ke pemegang saham", [
        { akun: "3-1401", d: 75e6 }, { akun: "1-1103", k: 75e6 },
      ]);
    }
    out.sort((a, b) => a.tgl.localeCompare(b.tgl) || a.cabang.localeCompare(b.cabang));
    cache[off] = { y, m, label: `${BULAN[m]} ${y}`, from: iso(d0), to: iso(new Date(y, m, endDay)), journals: out };
    return cache[off];
  }
  function sumLR(journals) {
    let v = 0;
    journals.forEach((j) => j.lines.forEach((l) => { if (!isNeraca(l.akun) && l.akun[0] !== "8") v += l.k - l.d; }));
    return v;
  }

  /* ---------------- saldo awal (1 bulan berjalan) ---------------- */
  const OPEN = {};
  function opening(cab) {
    if (OPEN[cab]) return OPEN[cab];
    const c = CAB.find((x) => x.id === cab);
    const s = c.omzet / BASE;
    const shareH = c.omzet / CAB.reduce((a, x) => a + x.omzet, 0);
    const o = {
      "1-1101": 5e6, "1-1102": 25e6 * s, "1-1103": 385e6 * s, "1-1104": 96e6 * s,
      "1-1201": cab === "PST" ? 182e6 : 36e6 * s, "1-1202": c.omzet * 0.045 * 1.11, "1-1203": c.omzet / 30 * 0.5,
      "1-1204": { PST: 96e6, BKS: 12e6 }[cab] || 0,
      "1-1301": c.omzet * 1.08, "1-1302": c.omzet * 0.08, "1-1303": 3.2e6 * s,
      "1-1401": c.omzet * 0.672 * 1.04 * 0.11, "1-1402": c.omzet * 0.0095 * M, "1-1403": SEWA[cab] * (12 - M),
      "1-2101": 420e6 * s, "1-2102": 150e6 * s, "1-2103": cab === "PST" ? 285e6 : 0, "1-2104": 380e6 * s,
      "1-2109": -(SUSUT[cab] * (20 + M)),
      "2-1101": -(DB.supplier.reduce((a, x) => a + x.hutang, 0) * shareH), "2-1102": -({ DPK: 27e6, TGR: 34e6, BGR: 47e6 }[cab] || 0),
      "2-1201": -(c.omzet * 0.11 * 0.97), "2-1202": -(c.karyawan * 8.2e6 * 0.045), "2-1203": -(c.omzet * 0.014),
      "2-1301": -(c.omzet * 0.012), "2-1302": -(c.omzet * 0.004), "2-2101": cab === "PST" ? -(504e6 - 21e6 * M) : 0,
      "3-1101": -(cab === "PST" ? 1.25e9 : 0.5e9 * s + 150e6),
      "3-1401": 0,
    };
    // laba tahun berjalan s.d. bulan lalu = akumulasi laba rugi Januari..bulan lalu dari jurnal
    let ytd = 0;
    for (let off = -M; off < 0; off++) {
      genMonth(off).journals.filter((j) => j.cabang === cab).forEach((j) => j.lines.forEach((l) => { if (!isNeraca(l.akun)) ytd += l.k - l.d; }));
    }
    o["3-1301"] = -ytd;
    Object.keys(o).forEach((k) => { o[k] = R(o[k]); });
    // saldo laba ditahan = penyeimbang
    const net = Object.values(o).reduce((a, v) => a + v, 0);
    o["3-1201"] = -net;
    OPEN[cab] = o;
    return o;
  }

  /* ---------------- API ---------------- */
  const cur = () => genMonth(0);
  const inScope = (cab) => (j) => cab === "ALL" || !cab || j.cabang === cab;
  const cabList = (cab) => (cab === "ALL" || !cab ? CAB.map((c) => c.id) : [cab]);

  const journals = (cab = "ALL", off = 0) => genMonth(off).journals.filter(inScope(cab));

  // saldo awal (bertanda: debit +, kredit −) per akun
  const saldoAwal = (kode, cab = "ALL") => cabList(cab).reduce((a, c) => a + (opening(c)[kode] || 0), 0);

  function mutasi(cab = "ALL", off = 0) {
    const mv = {};
    journals(cab, off).forEach((j) => j.lines.forEach((l) => {
      const x = mv[l.akun] || (mv[l.akun] = { d: 0, k: 0 });
      x.d += l.d; x.k += l.k;
    }));
    return mv;
  }

  /* Neraca saldo: baris per akun detail. Akun nominal (4–8) saldo awal 0 (periode bulan berjalan). */
  function trial(cab = "ALL") {
    const mv = mutasi(cab, 0);
    return DETAIL.map((a) => {
      const awal = isNeraca(a.kode) ? saldoAwal(a.kode, cab) : 0;
      const d = (mv[a.kode] || {}).d || 0, k = (mv[a.kode] || {}).k || 0;
      return { ...a, awal, d, k, akhir: awal + d - k };
    });
  }

  function ledger(kode, cab = "ALL") {
    const awal = isNeraca(kode) ? saldoAwal(kode, cab) : 0;
    let run = awal;
    const rows = [];
    journals(cab, 0).forEach((j) => j.lines.forEach((l) => {
      if (l.akun !== kode) return;
      run += l.d - l.k;
      rows.push({ tgl: j.tgl, no: j.no, ref: j.ref, ket: j.ket, cabang: j.cabang, sumber: j.sumber, d: l.d, k: l.k, saldo: run });
    }));
    return { awal, rows, akhir: run, d: rows.reduce((a, r) => a + r.d, 0), k: rows.reduce((a, r) => a + r.k, 0) };
  }

  /* Laba rugi dari jurnal. months = jumlah bulan terakhir (termasuk bulan berjalan), off = geser periode */
  function labaRugi(cab = "ALL", months = 1, off = 0) {
    const sumK = {};
    for (let i = 0; i < months; i++) {
      const mv = mutasi(cab, off - i);
      Object.entries(mv).forEach(([k, v]) => { sumK[k] = (sumK[k] || 0) + (v.k - v.d); });
    }
    const g = (k) => sumK[k] || 0; // saldo sisi kredit (pendapatan +, beban −)
    const ALL = cab === "ALL";
    const o = {};
    o.internal = g("4-1401");
    o.penjualan = g("4-1101") + g("4-1102") + g("4-1103") + g("4-1104") + g("4-1105");
    o.jasa = g("4-1201");
    o.bruto = o.penjualan + o.jasa + (ALL ? 0 : o.internal);
    o.diskon = -g("4-1301");
    o.retur = -g("4-1302");
    o.bersih = o.bruto - o.diskon - o.retur;
    o.hppObat = -g("5-1101");
    o.hppInternal = -g("5-1102");
    o.ed = -g("5-1201");
    o.opname = -g("5-1202");
    o.hpp = o.hppObat + o.ed + o.opname + (ALL ? 0 : o.hppInternal);
    o.lk = o.bersih - o.hpp;
    o.gaji = -(g("6-1101") + g("6-1102"));
    o.sewa = -g("6-1201");
    o.listrik = -g("6-1202");
    o.susut = -g("6-1301");
    o.promo = -g("6-1401");
    o.bank = -g("6-1402");
    o.lain = -(g("6-1501") + g("6-1502") + g("6-1601") + g("6-1901"));
    o.beban = o.gaji + o.sewa + o.listrik + o.susut + o.promo + o.bank + o.lain;
    o.lo = o.lk - o.beban;
    o.rebate = g("7-1101");
    o.bunga = g("7-1102");
    o.bBunga = -g("7-2101");
    o.pendLain = o.rebate + o.bunga - o.bBunga;
    o.lsp = o.lo + o.pendLain;
    o.pajak = -g("8-1101");
    o.lb = o.lsp - o.pajak;
    o.raw = sumK;
    return o;
  }

  /* Neraca per tanggal (awal bulan / hari ini). Laba bulan berjalan masuk ke Laba Tahun Berjalan. */
  function neraca(cab = "ALL", when = "akhir") {
    const tb = trial(cab);
    const val = {};
    tb.forEach((r) => { if (isNeraca(r.kode)) val[r.kode] = when === "awal" ? r.awal : r.akhir; });
    if (when === "akhir") {
      const lb = tb.filter((r) => !isNeraca(r.kode)).reduce((a, r) => a + r.akhir, 0); // debit − kredit
      val["3-1301"] = (val["3-1301"] || 0) + lb;
    }
    const sumP = (pre) => Object.entries(val).filter(([k]) => k.startsWith(pre)).reduce((a, [, v]) => a + v, 0);
    const o = {
      val,
      kas: sumP("1-11"), piutang: sumP("1-1201") + sumP("1-1202") + sumP("1-1203"), piutangAC: val["1-1204"] || 0,
      persediaan: sumP("1-13"), dimuka: sumP("1-14"),
      tetapBruto: sumP("1-21") - (val["1-2109"] || 0), akumSusut: val["1-2109"] || 0,
      hutang: -(val["2-1101"] || 0), hutangAC: -(val["2-1102"] || 0),
      pajak: -(sumP("2-12") + sumP("2-13")), bankLoan: -(val["2-2101"] || 0),
      modal: -(val["3-1101"] || 0), ditahan: -(val["3-1201"] || 0), lbj: -(val["3-1301"] || 0), prive: val["3-1401"] || 0,
    };
    o.tetap = o.tetapBruto + o.akumSusut;
    o.al = o.kas + o.piutang + o.piutangAC + o.persediaan + o.dimuka;
    o.aset = o.al + o.tetap;
    o.liabPendek = o.hutang + o.hutangAC + o.pajak;
    o.liab = o.liabPendek + o.bankLoan;
    o.ekuitas = o.modal + o.ditahan + o.lbj - o.prive;
    o.le = o.liab + o.ekuitas;
    return o;
  }

  /* Eliminasi konsolidasi (transaksi antar cabang) */
  function eliminasi() {
    const lr = labaRugi("ALL");
    const nr = neraca("ALL");
    return { penjualanInternal: lr.internal, hppInternal: lr.hppInternal, piutangAC: nr.piutangAC, hutangAC: nr.hutangAC };
  }

  /* Arus kas metode langsung dari jurnal: setiap baris akun kas (1-11xx) diklasifikasi menurut akun lawannya */
  function arusKas(cab = "ALL") {
    const o = { terima: 0, pbf: 0, gaji: 0, ops: 0, pajak: 0, aset: 0, pinjaman: 0, modal: 0, dividen: 0 };
    journals(cab, 0).forEach((j) => {
      const cash = j.lines.filter((l) => l.akun.startsWith("1-11")).reduce((a, l) => a + l.d - l.k, 0);
      if (!cash) return;
      const has = (pre) => j.lines.some((l) => l.akun.startsWith(pre));
      const key = has("2-2101") ? "pinjaman" : has("3-1101") ? "modal" : has("3-1401") ? "dividen" : has("1-21") ? "aset"
        : has("2-1101") ? "pbf" : has("6-1101") ? "gaji" : (has("1-1402") || has("8-") || (has("2-1201") && !has("4-"))) ? "pajak"
        : (has("4-") || has("1-1201") || has("1-1202") || has("1-1203") || has("7-1102")) ? "terima" : "ops";
      o[key] += cash;
    });
    Object.keys(o).forEach((k) => { o[k] = R(o[k]); });
    o.op = o.terima + o.pbf + o.gaji + o.ops + o.pajak;
    o.inv = o.aset;
    o.dana = o.pinjaman + o.modal + o.dividen;
    o.naik = o.op + o.inv + o.dana;
    o.awal = neraca(cab, "awal").kas;
    o.akhir = neraca(cab, "akhir").kas;
    return o;
  }

  /* Tambah jurnal manual → langsung mempengaruhi buku besar, neraca saldo, neraca & laba rugi */
  function addJournal({ tgl, cabang, ref, ket, lines }) {
    const L = lines.filter((l) => l.akun && (l.d || l.k)).map((l) => ({ akun: l.akun, d: R(+l.d || 0), k: R(+l.k || 0) }));
    const d = L.reduce((a, l) => a + l.d, 0), k = L.reduce((a, l) => a + l.k, 0);
    if (!L.length || d !== k) throw new Error("Jurnal tidak seimbang");
    if (L.some((l) => !akun(l.akun) || akun(l.akun).header)) throw new Error("Akun tidak valid");
    const p = cur();
    const n = p.journals.filter((j) => j.no.startsWith(`JM/${cabang}/`)).length + 1;
    const j = { no: `JM/${cabang}/${yymm(p.y, p.m)}/${String(n).padStart(3, "0")}`, tgl, cabang, sumber: "Manual", ref: ref || "-", ket, lines: L, status: "Posted", user: "Rina W. (Apoteker PJ)" };
    p.journals.push(j);
    p.journals.sort((a, b) => a.tgl.localeCompare(b.tgl) || a.cabang.localeCompare(b.cabang));
    return j;
  }

  /* Pemetaan akun otomatis: transaksi operasional → jurnal */
  const MAPPING = [
    ["Kasir (POS) – penjualan bebas", "Kas Kecil / Piutang Settlement", "Penjualan Obat Bebas, PPN Keluaran", "1-1101, 1-1203 / 4-1101, 2-1201", "kasir"],
    ["Resep dokter & racikan", "Kas / Piutang BPJS PRB", "Penjualan Resep/Racikan, Pendapatan Jasa", "1-1101, 1-1202 / 4-1102, 4-1103, 4-1201", "resep"],
    ["HPP penjualan (FEFO)", "HPP Obat & Alkes", "Persediaan Obat / Alkes", "5-1101 / 1-1301, 1-1302", "stok"],
    ["Diskon & promo member", "Diskon Penjualan", "(bagian jurnal penjualan)", "4-1301", "kasir"],
    ["Retur penjualan", "Retur Penjualan, PPN Keluaran", "Kas Kecil", "4-1302, 2-1201 / 1-1101", "retur"],
    ["Setoran kas & settlement EDC/QRIS", "Bank BCA / Bank Mandiri, Beban MDR", "Kas Kecil / Piutang Settlement", "1-1103, 1-1104, 6-1402 / 1-1101, 1-1203", "shift"],
    ["Penerimaan barang (faktur PBF)", "Persediaan, PPN Masukan", "Hutang Usaha (PBF)", "1-1301, 1-1302, 1-1401 / 2-1101", "penerimaan"],
    ["Pembayaran hutang PBF", "Hutang Usaha (PBF)", "Bank BCA", "2-1101 / 1-1103", "hutang"],
    ["Retur pembelian & rebate PBF", "Hutang Usaha (PBF)", "Persediaan / Rebate PBF", "2-1101 / 1-1301, 7-1101", "returbeli"],
    ["Mutasi antar cabang (pengirim)", "Piutang Antar Cabang, HPP Internal", "Penjualan Internal, Persediaan", "1-1204, 5-1102 / 4-1401, 1-1301", "mutasi"],
    ["Mutasi antar cabang (penerima)", "Persediaan Obat", "Hutang Antar Cabang", "1-1301 / 2-1102", "mutasi"],
    ["Pemusnahan obat kedaluwarsa", "Kerugian Obat Kedaluwarsa", "Persediaan Obat", "5-1201 / 1-1301", "kadaluarsa"],
    ["Stok opname (selisih)", "Selisih Stok Opname", "Persediaan Obat", "5-1202 / 1-1301", "opname"],
    ["Penggajian", "Beban Gaji, Beban BPJS", "Bank BCA, Hutang PPh 21", "6-1101, 6-1102 / 1-1103, 2-1202", "pengguna"],
    ["Penyusutan & akrual akhir bulan", "Beban Penyusutan, Beban lain", "Akumulasi Penyusutan, Beban Masih Harus Dibayar", "6-1301, 6-15xx / 1-2109, 2-1301", "jurnal"],
    ["Estimasi PPh Badan", "Beban PPh Badan", "Hutang PPh Badan", "8-1101 / 2-1203", "jurnal"],
  ];

  const SUMBER = ["Kasir & Resep", "Retur Penjualan", "Pembelian", "Hutang Supplier", "Piutang", "Kas & Bank", "Mutasi Cabang", "Kedaluwarsa", "Stok Opname", "Penggajian", "Penyesuaian", "Pajak", "Manual"];
  const SUMBER_TONE = { "Kasir & Resep": "blue", "Retur Penjualan": "purple", Pembelian: "amber", "Hutang Supplier": "amber", Piutang: "cyan", "Kas & Bank": "teal", "Mutasi Cabang": "pink", Kedaluwarsa: "red", "Stok Opname": "gray", Penggajian: "green", Penyesuaian: "gray", Pajak: "red", Manual: "purple" };

  window.GL = {
    COA, DETAIL, akun, isNeraca, TIPE, BULAN,
    periode: () => { const p = cur(); return { label: p.label, from: p.from, to: p.to, y: p.y, m: p.m }; },
    periodeLalu: () => { const p = genMonth(-1); return { label: p.label, from: p.from, to: p.to }; },
    journals, saldoAwal, trial, ledger, labaRugi, neraca, eliminasi, addJournal, mutasi, arusKas,
    MAPPING, SUMBER, SUMBER_TONE,
    ui: { akun: "1-1103", cabang: null, sumber: "Semua" },
  };
})();
