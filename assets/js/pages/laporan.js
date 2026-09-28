/* =====================================================================
   Laporan — Penjualan, Cabang, Konsolidasi, Sales, Laba Rugi, Persediaan,
   Pembelian, Kedaluwarsa, Narkotika & Psikotropika (SIPNAP)
   Semua angka turunan dari window.DB + data lokal deterministik.
   ===================================================================== */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, pct, short, table, status, badge, chart, legend, progress, tgl, esc, rpTick, tabs, input, select, textarea, alert, modal } = UI;

  /* ---------- Utilitas umum ---------- */
  // PRNG deterministik (mulberry32) — tiap generator punya seed sendiri agar render berulang tetap sama
  const mk = (seed) => {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.i = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
    r.f = (lo, hi) => lo + r() * (hi - lo);
    return r;
  };
  const R = Math.round;
  const sum = (arr, f = (x) => x) => arr.reduce((s, x, i) => s + (Number(f(x, i)) || 0), 0);
  const div = (a, b) => (b ? a / b : 0);
  const chg = (a, b) => div(a - b, Math.abs(b)) * 100;
  const dec1 = (n) => (n || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const inisial = (n) => String(n).replace(/^(apt|dr|drg)\.\s*/i, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const hariSingkat = (s) => new Date(s).toLocaleDateString("id-ID", { weekday: "short" });
  const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const Y = DB.TODAY.getFullYear();
  const M0 = DB.TODAY.getMonth();
  const YYMM = String(Y).slice(2) + String(M0 + 1).padStart(2, "0");
  const tglBulanIni = (d) => new Date(Y, M0, Math.max(1, Math.min(d, DB.TODAY.getDate())));

  /* ---------- Cabang & skala ---------- */
  const CAB = DB.cabang;
  const TOT_OMZET = sum(CAB, (c) => c.omzet);
  const cabIdx = (id) => CAB.findIndex((c) => c.id === id);
  const cabShort = (id) => UI.cabangNama(id).replace(/^Cabang\s+/, "");
  const share = (id) => (id === "ALL" ? 1 : div((CAB.find((c) => c.id === id) || {}).omzet, TOT_OMZET));
  const scopeCabs = (st) => (st.cabang === "ALL" ? CAB : CAB.filter((c) => c.id === st.cabang));
  const scopeName = (st) => (st.cabang === "ALL" ? "Semua Cabang" : UI.cabangNama(st.cabang));
  const BULAN = DB.bulanan.map((b) => b.bulan);
  const LAST = DB.bulanan.length - 1;

  /* ---------- Bahasa grafik ----------
     Warna kategorikal tetap: setiap cabang SELALU memakai warna yang sama (urutan DB.cabang → k.c1..k.c5). */
  const CAB_CSS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const cabColor = (k, id) => [k.c1, k.c2, k.c3, k.c4, k.c5][cabIdx(id)];
  const cabLegend = (list = CAB, extra = []) => (list.length + extra.length < 2 ? "" : legend([...list.map((c) => [cabShort(c.id), CAB_CSS[cabIdx(c.id)]]), ...extra]));
  const TARGET_CSS = "color-mix(in srgb, var(--chart-text) 30%, transparent)";
  const FADE_CSS = "color-mix(in srgb, var(--chart-1) 35%, transparent)";
  const targetFill = (k) => k.text + "4d";
  const fade = (c) => c + "59";
  const BAR = { borderRadius: 4, borderSkipped: "bottom" };
  const HBAR = { borderRadius: 4, borderSkipped: "left" };
  const tipRp = (axis = "y") => ({ callbacks: { label: (c) => ` ${c.dataset.label}: ${rp(c.parsed[axis])}` } });
  const tipPie = () => ({ callbacks: { label: (c) => { const t = sum(c.dataset.data); return ` ${c.label}: ${rp(c.raw)} (${pct(div(c.raw, t) * 100)})`; } } });
  const axRp = (k, o = {}) => ({ beginAtZero: true, ticks: { callback: rpTick }, grid: { color: k.grid }, ...o });
  const axNum = (k, o = {}) => ({ beginAtZero: true, grid: { color: k.grid }, ...o });
  const axCat = (o = {}) => ({ grid: { display: false }, ...o });

  /* ---------- Kerangka halaman laporan ---------- */
  const header = (title, sub, extra = "") => UI.pageHeader({
    title, sub, crumbs: ["Laporan", title],
    actions: `${extra}${btn("Excel", "teal", { icon: "table_view", attrs: `data-toast="${esc(title)} diekspor ke Excel (.xlsx)"` })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: `data-toast="${esc(title)} diekspor ke PDF"` })}${btn("Jadwalkan Email", "glass", { icon: "schedule_send", attrs: `data-lap-email="${esc(title)}"` })}`,
  });
  const fbar = (extra = "") => UI.filterBar(extra, `${btn("Tampilkan", "primary", { icon: "filter_alt", attrs: 'data-toast="Filter diterapkan"' })}${btn("Reset", "light", { icon: "restart_alt", attrs: 'data-toast="Filter dikembalikan ke default" data-tone="info"' })}`);
  const viewTabs = (g, active = "grafik") => tabs(g, [{ id: "grafik", label: "Grafik", icon: "bar_chart" }, { id: "tabel", label: "Tabel", icon: "table_rows" }], active);
  const panel = (g, id, html, visible = false) => `<div data-panel-group="${g}" data-panel="${id}" ${visible ? "" : "hidden"}><div class="stack">${html}</div></div>`;
  const tr = (cells) => `<tr>${cells.map((c) => (typeof c === "object" && c !== null ? `<td class="${c.cls || ""}" ${c.span ? `colspan="${c.span}"` : ""}>${c.v}</td>` : `<td class="num">${c}</td>`)).join("")}</tr>`;
  const dash = `<span class="muted">—</span>`;
  // Kartu hero berlatar biru: delta negatif ditulis di teks kaki agar tetap terbaca
  const heroDelta = (d) => (d >= 0 ? { delta: d, foot: "vs bulan lalu" } : { foot: `${pct(d)} vs bulan lalu` });
  const deltaBadge = (d, goodUp = true) => (Math.abs(d) < 0.05 ? badge("0,0%", "gray") : badge(`${d > 0 ? "+" : ""}${pct(d)}`, (d > 0) === goodUp ? "green" : "red", { icon: d > 0 ? "arrow_upward" : "arrow_downward" }));
  const abcBadge = (c) => badge(`Kelas ${c}`, { A: "purple", B: "blue", C: "gray" }[c]);
  const swatch = (i) => `<i style="width:10px;height:10px;border-radius:3px;background:${CAB_CSS[i]};display:inline-block;margin-right:8px"></i>`;
  const avatar = (nama, sm = true) => `<div class="avatar ${sm ? "sm" : ""}">${esc(inisial(nama))}</div>`;

  const openEmail = (nama) => modal.open({
    title: "Jadwalkan pengiriman laporan", icon: "schedule_send",
    body: `${alert("info", "info", esc(nama), "Laporan dibuat otomatis oleh sistem pada jadwal di bawah dan dikirim sebagai lampiran ke semua penerima.")}
      <div class="form-grid" style="margin-top:16px">
        ${input("Penerima (pisahkan dengan koma)", { value: "anton@sehatbersama.id, teguh@sehatbersama.id", icon: "mail", cls: "full" })}
        ${select("Frekuensi", ["Harian · 07.00", "Mingguan · Senin 07.00", "Bulanan · tanggal 1, 07.00"], { value: "Mingguan · Senin 07.00" })}
        ${select("Format lampiran", ["PDF", "Excel (.xlsx)", "PDF + Excel"], { value: "PDF + Excel" })}
        ${select("Cabang", UI.cabangOptions(), { value: window.APP?.state.cabang || "ALL" })}
        ${select("Periode data", ["Periode berjalan", "Periode sebelumnya (tutup buku)"])}
        ${textarea("Catatan untuk penerima", { ph: "Opsional, mis. mohon ditinjau sebelum rapat bulanan", cls: "full" })}
      </div>`,
    foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Jadwal", "primary", { icon: "save", attrs: `data-close data-toast="Jadwal email ${esc(nama)} disimpan"` })}`,
  });
  const bindCommon = (root) => root.querySelectorAll("[data-lap-email]").forEach((b) => b.addEventListener("click", () => openEmail(b.dataset.lapEmail)));

  /* =====================================================================
     Data turunan bersama
     ===================================================================== */
  // Kategori: [nama, porsi penjualan %, rasio HPP, DIO dasar (hari), VEN]
  const KAT = [
    ["Analgesik & Antipiretik", 11.8, 0.64, 38, "E"], ["Antibiotik", 12.6, 0.69, 41, "V"], ["Batuk & Flu", 10.4, 0.66, 36, "E"],
    ["Saluran Cerna", 8.1, 0.67, 44, "E"], ["Kardiovaskular", 13.9, 0.71, 52, "V"], ["Diabetes", 9.2, 0.72, 49, "V"],
    ["Vitamin & Suplemen", 12.3, 0.62, 58, "N"], ["Kulit & Topikal", 4.6, 0.6, 71, "E"], ["Mata & THT", 3.1, 0.63, 83, "E"],
    ["Alat Kesehatan", 6.2, 0.65, 96, "N"], ["Ibu & Anak", 5.3, 0.68, 62, "E"], ["Psikotropika & Narkotika", 2.5, 0.61, 67, "E"],
  ];
  const HPP_R = [0.672, 0.664, 0.681, 0.668, 0.689]; // rasio HPP per cabang (urutan DB.cabang)

  // Omzet bulanan per cabang (12 bulan, bulan terakhir = omzet bulan berjalan di DB.cabang)
  const CAB_BULAN = CAB.map((c, i) => {
    const r = mk(900 + i);
    const last = DB.bulanan[LAST].pendapatan;
    return DB.bulanan.map((b, m) => (m === LAST ? c.omzet : R(c.omzet * (b.pendapatan / last) * r.f(0.95, 1.05))));
  });

  // Nilai persediaan (harga pokok) per kategori × cabang, diturunkan dari HPP & DIO
  const STOK = (() => {
    const r = mk(733);
    const hppBulan = DB.bulanan[LAST].hpp;
    return KAT.map(([, w, , dio]) => {
      const row = {};
      CAB.forEach((c) => { row[c.id] = R(hppBulan * (w / 100) * share(c.id) * (dio / 30) * r.f(0.82, 1.22)); });
      return row;
    });
  })();
  const stokCab = (id) => sum(STOK, (row) => row[id]);

  // Kedaluwarsa per cabang per bulan
  const ED = CAB.map((c, i) => {
    const r = mk(1200 + i);
    return DB.bulanan.map(() => {
      const nilai = R(c.omzet * r.f(0.0012, 0.0046));
      const diajukan = R(nilai * r.f(0.6, 0.8));
      const disetujui = R(diajukan * r.f(0.55, 0.85));
      const musnah = nilai - diajukan;
      const ditolak = diajukan - disetujui;
      return { batch: r.i(3, 14), nilai, diajukan, disetujui, ditolak, musnah, rugi: musnah + ditolak };
    });
  });

  // Estimasi qty terjual per bulan (semua cabang) per item — dipakai laporan penjualan & persediaan
  const DEAD = ["OB0028", "OB0030", "OB0042"];
  const QTY = DB.obat.map((o, i) => {
    const r = mk(600 + i);
    if (DEAD.includes(o.kode)) return 0;
    const h = o.hargaJual;
    return h <= 10000 ? r.i(900, 2400) : h <= 30000 ? r.i(300, 1100) : h <= 100000 ? r.i(90, 420) : r.i(12, 40);
  });

  const SUPPLIER_W = [26.4, 31.2, 21.8, 11.3, 9.3]; // porsi pembelian per PBF (urutan DB.supplier)

  /* =====================================================================
     1. LAPORAN PENJUALAN
     ===================================================================== */
  const JAM_W = [2.1, 4.6, 7.4, 8.2, 7.1, 6.0, 5.4, 5.2, 5.6, 6.3, 7.9, 8.8, 8.1, 6.4, 4.8, 3.4, 2.7]; // 07.00–23.00
  const JAM_B = [0.85, 0.9, 1, 1.05, 1.02, 0.98, 0.95, 0.94, 0.97, 1, 1.06, 1.1, 1.12, 1.08, 1, 0.92, 0.88];
  // [metode, % trx, % nominal, MDR %]
  const BAYAR = [["Tunai", 41.2, 36.4, 0], ["QRIS", 33.5, 30.8, 0.3], ["Kartu Debit", 14.8, 17.6, 0.15], ["Kartu Kredit", 5.9, 8.9, 1.8], ["Transfer / Tempo", 4.6, 6.3, 0]];
  // [jenis, % trx, bobot diskon relatif, rasio HPP, warna badge]
  const JENIS = [["Umum (swamedikasi)", 71.5, 1.15, 0.69, "gray"], ["Resep dokter", 18.2, 0.55, 0.64, "blue"], ["Racikan", 4.9, 0.35, 0.58, "purple"], ["B2B (klinik & praktik)", 1.1, 2.0, 0.82, "teal"], ["BPJS PRB", 4.3, 0, 0.86, "green"]];

  function modelPenjualan(st) {
    const f = share(st.cabang);
    const r = mk(311);
    const hari = DB.harian.map((h) => {
      const umum = R(h.umum * f);
      const resepAll = R(h.resep * f);
      const racikan = R(resepAll * r.f(0.18, 0.25));
      const resep = resepAll - racikan;
      const bruto = umum + resep + racikan;
      const diskon = R(bruto * r.f(0.017, 0.026));
      const retur = R(bruto * r.f(0.003, 0.009));
      const netto = bruto - diskon - retur;
      const hpp = R(netto * r.f(0.662, 0.694));
      const trx = Math.max(1, R(h.trx * f));
      return { tgl: h.tgl, trx, item: R(trx * r.f(2.4, 3.0)), umum, resep, racikan, bruto, diskon, retur, netto, hpp, laba: netto - hpp };
    });
    const T = {};
    ["trx", "item", "umum", "resep", "racikan", "bruto", "diskon", "retur", "netto", "hpp", "laba"].forEach((k) => { T[k] = sum(hari, (h) => h[k]); });

    // Per kategori (HPP diskalakan agar total sama dengan HPP harian)
    let rest = T.netto;
    const katRaw = KAT.map(([nama, w, hr], i) => {
      const omzet = i === KAT.length - 1 ? rest : R(T.netto * w / 100);
      rest -= omzet;
      const items = DB.obat.filter((o) => o.kategori === nama);
      const avgHarga = div(sum(items, (o) => o.hargaJual), items.length) || 20000;
      return { nama, sku: items.length, qty: R(omzet / avgHarga), omzet, hppRaw: omzet * hr };
    });
    const kScale = div(T.hpp, sum(katRaw, (x) => x.hppRaw));
    const kat = katRaw.map((x) => { const hpp = R(x.hppRaw * kScale); return { ...x, hpp, laba: x.omzet - hpp }; });

    // Per produk + kelas ABC (Pareto nilai penjualan)
    const prod = DB.obat.map((o, i) => {
      const qty = QTY[i] ? Math.max(1, R(QTY[i] * f)) : 0;
      return { o, qty, omzet: qty * o.hargaJual, hpp: qty * o.hargaBeli };
    }).sort((a, b) => b.omzet - a.omzet);
    const totP = sum(prod, (p) => p.omzet);
    let cum = 0;
    prod.forEach((p) => {
      const before = div(cum, totP);
      cum += p.omzet;
      p.abc = before < 0.8 ? "A" : before < 0.95 ? "B" : "C";
      p.laba = p.omzet - p.hpp;
      p.kontrib = div(p.omzet, T.netto) * 100;
    });

    // Metode bayar
    const bayar = BAYAR.map(([nama, pt, pn, mdr]) => {
      const nominal = R(T.netto * pn / 100);
      const biaya = R(nominal * mdr / 100);
      return { nama, trx: R(T.trx * pt / 100), nominal, mdr, biaya, bersih: nominal - biaya };
    });

    // Per jam (rata-rata per hari)
    const days = hari.length;
    const jamRaw = JAM_W.map((w, i) => ({ jam: 7 + i, trx: T.trx / days * w / 100, omzetRaw: w * JAM_B[i] }));
    const jScale = div(T.netto / days, sum(jamRaw, (j) => j.omzetRaw));
    const jam = jamRaw.map((j) => ({ ...j, omzet: j.omzetRaw * jScale }));
    const peak = [...jam].sort((a, b) => b.trx - a.trx).slice(0, 3).map((j) => j.jam);

    // Per jenis (Umum mencakup B2B; Resep mencakup BPJS PRB)
    const b2b = R(T.umum * 0.11);
    const prb = R(T.resep * 0.14);
    const brutoJenis = [T.umum - b2b, T.resep - prb, T.racikan, b2b, prb];
    const dRaw = brutoJenis.map((b, i) => b * JENIS[i][2]);
    const rRaw = brutoJenis.map((b) => b);
    const jenisRows = JENIS.map(([nama, pt, , hr, tone], i) => {
      const bruto = brutoJenis[i];
      const diskon = R(T.diskon * div(dRaw[i], sum(dRaw)));
      const retur = R(T.retur * div(rRaw[i], sum(rRaw)));
      const netto = bruto - diskon - retur;
      return { nama, tone, trx: R(T.trx * pt / 100), bruto, diskon, retur, netto, hppRaw: netto * hr };
    });
    const jhScale = div(T.hpp, sum(jenisRows, (j) => j.hppRaw));
    jenisRows.forEach((j) => { j.hpp = R(j.hppRaw * jhScale); j.laba = j.netto - j.hpp; });

    return { f, hari, T, kat, prod, bayar, jam, peak, jenis: jenisRows, days };
  }

  window.PAGES["lap-penjualan"] = {
    render({ state }) {
      const M = modelPenjualan(state);
      const { T, hari, days } = M;
      const lbl = hari.map((h) => h.tgl.slice(8) + "/" + h.tgl.slice(5, 7));
      const katSorted = [...M.kat].sort((a, b) => b.omzet - a.omzet);
      const top = M.prod.slice(0, 20);
      const abcSum = ["A", "B", "C"].map((c) => { const l = M.prod.filter((p) => p.abc === c); return { c, n: l.length, v: sum(l, (p) => p.omzet) }; });
      const totProd = sum(M.prod, (p) => p.omzet);
      const jamTot = sum(M.jam, (j) => j.trx);
      const peakTxt = M.peak.map((h) => `${String(h).padStart(2, "0")}.00`).sort().join(", ");

      return `
      ${header("Laporan Penjualan", `Rekap penjualan <b>${esc(scopeName(state))}</b> · ${tgl(hari[0].tgl)} – ${tgl(hari[days - 1].tgl)} (${days} hari)`)}
      ${fbar(`${select("Jenis penjualan", ["Semua jenis", ...JENIS.map((j) => j[0])])}${select("Kasir / TTK", ["Semua petugas", ...DB.sales.map((s) => s.nama)])}`)}

      <div class="grid g-4">
        ${stat({ label: "Omzet bruto", value: short(T.bruto), icon: "payments", tone: "primary", delta: 6.4, foot: "vs 30 hari sebelumnya", hero: true })}
        ${stat({ label: "Jumlah transaksi", value: num(T.trx), icon: "receipt_long", tone: "success", delta: 3.1, foot: `${num(T.trx / days)} struk per hari` })}
        ${stat({ label: "Rata-rata per struk", value: rp(div(T.netto, T.trx)), icon: "shopping_basket", tone: "info", delta: 2.2, foot: "penjualan bersih / transaksi" })}
        ${stat({ label: "Item terjual", value: num(T.item), icon: "medication", tone: "teal", delta: 4.0, foot: `${dec1(div(T.item, T.trx))} item per struk` })}
        ${stat({ label: "Diskon diberikan", value: short(T.diskon), icon: "sell", tone: "pink", foot: `${pct(div(T.diskon, T.bruto) * 100)} dari omzet bruto` })}
        ${stat({ label: "Retur penjualan", value: short(T.retur), icon: "assignment_return", tone: "warning", foot: `${pct(div(T.retur, T.bruto) * 100)} dari omzet bruto` })}
        ${stat({ label: "Penjualan bersih", value: short(T.netto), icon: "account_balance_wallet", tone: "purple", delta: 6.8, foot: "bruto − diskon − retur" })}
        ${stat({ label: "Laba kotor", value: short(T.laba), icon: "savings", tone: "teal", delta: 5.2, foot: `margin ${pct(div(T.laba, T.netto) * 100)}` })}
      </div>

      ${tabs("lpj", [
        { id: "harian", label: "Harian", icon: "calendar_month" }, { id: "kategori", label: "Per Kategori", icon: "category" },
        { id: "produk", label: "Per Produk", icon: "medication" }, { id: "bayar", label: "Metode Bayar", icon: "credit_card" },
        { id: "jam", label: "Per Jam", icon: "schedule" }, { id: "jenis", label: "Per Jenis", icon: "sell" },
      ], "harian")}

      ${panel("lpj", "harian", `
        ${card({
          title: "Penjualan bersih & laba kotor harian", desc: "Dalam rupiah, setelah diskon dan retur", icon: "show_chart",
          body: `${legend([["Penjualan bersih", "var(--chart-1)"], ["Laba kotor", "var(--chart-2)"]])}
            ${chart("lpj-ch-harian", (k, el) => ({
              type: "line",
              data: { labels: lbl, datasets: [
                { label: "Penjualan bersih", data: hari.map((h) => h.netto), borderColor: k.c1, backgroundColor: UI.areaFill(el, k.c1), fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 },
                { label: "Laba kotor", data: hari.map((h) => h.laba), borderColor: k.c2, backgroundColor: "transparent", tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 },
              ] },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: axRp(k), x: axCat({ ticks: { maxTicksLimit: 10 } }) }, plugins: { tooltip: tipRp() } },
            }))}`,
        })}
        ${card({
          title: "Rincian penjualan per tanggal", desc: "Nilai dalam rupiah · Umum mencakup B2B, Resep mencakup BPJS PRB", icon: "table_rows", flush: true,
          body: table({
            cls: "compact",
            columns: [
              { label: "Tanggal", render: (h) => `<span class="strong">${tgl(h.tgl)}</span><div class="t-sub">${hariSingkat(h.tgl)}</div>` },
              { label: "Trx", cls: "num", render: (h) => num(h.trx) },
              { label: "Umum", cls: "num", render: (h) => num(h.umum) },
              { label: "Resep", cls: "num", render: (h) => num(h.resep) },
              { label: "Racikan", cls: "num", render: (h) => num(h.racikan) },
              { label: "Diskon", cls: "num", render: (h) => num(h.diskon) },
              { label: "Retur", cls: "num", render: (h) => num(h.retur) },
              { label: "Netto", cls: "num", render: (h) => `<b>${num(h.netto)}</b>` },
              { label: "HPP", cls: "num", render: (h) => num(h.hpp) },
              { label: "Laba kotor", cls: "num", render: (h) => num(h.laba) },
              { label: "Margin", cls: "num", render: (h) => pct(div(h.laba, h.netto) * 100) },
            ],
            rows: [...hari].reverse(),
            foot: tr([{ v: `Total ${days} hari` }, num(T.trx), num(T.umum), num(T.resep), num(T.racikan), num(T.diskon), num(T.retur), num(T.netto), num(T.hpp), num(T.laba), pct(div(T.laba, T.netto) * 100)]),
          }),
        })}`, true)}

      ${panel("lpj", "kategori", `
        ${card({
          title: "Penjualan bersih per kategori", desc: "Diurutkan dari nilai terbesar", icon: "category", tone: "purple",
          body: chart("lpj-ch-kat", (k) => ({
            type: "bar",
            data: { labels: katSorted.map((x) => x.nama), datasets: [{ label: "Penjualan bersih", data: katSorted.map((x) => x.omzet), backgroundColor: k.c1, ...HBAR, maxBarThickness: 22 }] },
            options: { indexAxis: "y", scales: { x: axRp(k), y: axCat() }, plugins: { tooltip: tipRp("x") } },
          }), "lg"),
        })}
        ${card({
          title: "Rincian per kategori", desc: "Nilai dalam rupiah", icon: "table_rows", flush: true,
          body: table({
            columns: [
              { label: "Kategori", render: (x) => `<span class="strong">${esc(x.nama)}</span><div class="t-sub">${x.sku} SKU</div>` },
              { label: "Qty terjual", cls: "num", render: (x) => num(x.qty) },
              { label: "Penjualan bersih", cls: "num", render: (x) => num(x.omzet) },
              { label: "HPP", cls: "num", render: (x) => num(x.hpp) },
              { label: "Laba kotor", cls: "num", render: (x) => num(x.laba) },
              { label: "Margin", cls: "num", render: (x) => pct(div(x.laba, x.omzet) * 100) },
              { label: "Kontribusi", render: (x) => `<div class="row" style="gap:8px;min-width:140px"><div style="flex:1">${progress(x.omzet, katSorted[0].omzet)}</div><span class="small num">${pct(div(x.omzet, T.netto) * 100)}</span></div>` },
            ],
            rows: katSorted,
            foot: tr([{ v: "Total" }, num(sum(M.kat, (x) => x.qty)), num(T.netto), num(T.hpp), num(T.laba), pct(div(T.laba, T.netto) * 100), { v: "100,0%", cls: "num" }]),
          }),
        })}`)}

      ${panel("lpj", "produk", `
        <div class="grid g-3">
          ${abcSum.map((a) => stat({ label: `Kelas ${a.c} · ${a.n} SKU`, value: pct(div(a.v, totProd) * 100), icon: { A: "workspace_premium", B: "star_half", C: "low_priority" }[a.c], tone: { A: "purple", B: "primary", C: "dark" }[a.c], foot: `${short(a.v)} · ${{ A: "80% nilai teratas, kontrol ketat", B: "15% berikutnya", C: "5% sisa, tinjau ulang stok" }[a.c]}` })).join("")}
        </div>
        ${card({
          title: "20 produk terlaris", desc: `Berdasarkan nilai penjualan · kontribusi terhadap penjualan bersih ${short(T.netto)}`, icon: "local_fire_department", tone: "amber", flush: true,
          body: table({
            columns: [
              { label: "#", cls: "num", render: (p, i) => `<b>${i + 1}</b>` },
              { label: "Obat", render: (p) => `<div class="t-main">${esc(p.o.nama)}</div><div class="t-sub">${p.o.kode} · ${esc(p.o.kategori)}</div>` },
              { label: "Golongan", render: (p) => UI.golongan(p.o.golongan) },
              { label: "Qty", cls: "num", render: (p) => `${num(p.qty)} <span class="t-sub">${esc(p.o.satuan)}</span>` },
              { label: "Omzet", cls: "num", render: (p) => `<b>${num(p.omzet)}</b>` },
              { label: "HPP", cls: "num", render: (p) => num(p.hpp) },
              { label: "Margin", cls: "num", render: (p) => pct(div(p.laba, p.omzet) * 100) },
              { label: "Kontribusi", cls: "num", render: (p) => pct(p.kontrib, 2) },
              { label: "Kelas", render: (p) => abcBadge(p.abc) },
            ],
            rows: top,
            foot: tr([{ v: "Total 20 produk", span: 3 }, num(sum(top, (p) => p.qty)), num(sum(top, (p) => p.omzet)), num(sum(top, (p) => p.hpp)), pct(div(sum(top, (p) => p.laba), sum(top, (p) => p.omzet)) * 100), pct(sum(top, (p) => p.kontrib), 2), { v: "" }]),
          }),
        })}`)}

      ${panel("lpj", "bayar", `
        <div class="grid g-1-2">
          ${card({
            title: "Komposisi nominal", desc: "Penjualan bersih per metode bayar", icon: "donut_small", tone: "cyan",
            body: `${chart("lpj-ch-bayar", (k) => ({
              type: "doughnut",
              data: { labels: M.bayar.map((b) => b.nama), datasets: [{ data: M.bayar.map((b) => b.nominal), backgroundColor: [k.c1, k.c2, k.c3, k.c4, k.c5], borderColor: k.surface, borderWidth: 2 }] },
              options: { cutout: "66%", plugins: { tooltip: tipPie() } },
            }), "sm")}
            <div style="margin-top:14px">${legend(M.bayar.map((b, i) => [b.nama, CAB_CSS[i]]))}</div>`,
          })}
          ${card({
            title: "Rincian metode bayar", desc: "MDR = biaya merchant yang dipotong bank / penyedia QRIS", icon: "credit_card", flush: true,
            body: table({
              columns: [
                { label: "Metode", render: (b) => `<span class="strong">${b.nama}</span>` },
                { label: "Trx", cls: "num", render: (b) => num(b.trx) },
                { label: "% trx", cls: "num", render: (b) => pct(div(b.trx, T.trx) * 100) },
                { label: "Nominal", cls: "num", render: (b) => num(b.nominal) },
                { label: "Rata-rata", cls: "num", render: (b) => num(div(b.nominal, b.trx)) },
                { label: "MDR", cls: "num", render: (b) => (b.mdr ? pct(b.mdr, 2) : dash) },
                { label: "Biaya MDR", cls: "num", render: (b) => (b.biaya ? num(b.biaya) : dash) },
                { label: "Dana diterima", cls: "num", render: (b) => `<b>${num(b.bersih)}</b>` },
              ],
              rows: M.bayar,
              foot: tr([{ v: "Total" }, num(sum(M.bayar, (b) => b.trx)), "100,0%", num(sum(M.bayar, (b) => b.nominal)), num(div(sum(M.bayar, (b) => b.nominal), sum(M.bayar, (b) => b.trx))), "", num(sum(M.bayar, (b) => b.biaya)), num(sum(M.bayar, (b) => b.bersih))]),
            }),
          })}
        </div>`)}

      ${panel("lpj", "jam", `
        <div class="grid g-2-1">
          ${card({
            title: "Transaksi per jam", desc: "Rata-rata transaksi per hari, jam 07.00–23.00", icon: "schedule",
            tools: viewTabs("lpj-jam"),
            body: `${panel("lpj-jam", "grafik", `${legend([["Jam sibuk (3 tertinggi)", "var(--chart-1)"], ["Jam lainnya", FADE_CSS]])}
              ${chart("lpj-ch-jam", (k) => ({
                type: "bar",
                data: { labels: M.jam.map((j) => String(j.jam).padStart(2, "0") + ".00"), datasets: [{ label: "Transaksi per hari", data: M.jam.map((j) => R(j.trx)), backgroundColor: M.jam.map((j) => (M.peak.includes(j.jam) ? k.c1 : fade(k.c1))), ...BAR }] },
                options: { scales: { y: axNum(k), x: axCat() }, plugins: { tooltip: { callbacks: { label: (c) => ` ${num(c.raw)} transaksi/hari · omzet ${rp(M.jam[c.dataIndex].omzet)}` } } } },
              }))}`, true)}
              ${panel("lpj-jam", "tabel", table({
                cls: "compact",
                columns: [
                  { label: "Jam", render: (j) => `<span class="mono">${String(j.jam).padStart(2, "0")}.00–${String(j.jam).padStart(2, "0")}.59</span> ${M.peak.includes(j.jam) ? badge("Sibuk", "blue") : ""}` },
                  { label: "Trx/hari", cls: "num", render: (j) => num(j.trx) },
                  { label: "% trx", cls: "num", render: (j) => pct(div(j.trx, jamTot) * 100) },
                  { label: "Omzet/hari", cls: "num", render: (j) => num(j.omzet) },
                  { label: "Rata-rata struk", cls: "num", render: (j) => num(div(j.omzet, j.trx)) },
                ],
                rows: M.jam,
                foot: tr([{ v: "Total per hari" }, num(jamTot), "100,0%", num(sum(M.jam, (j) => j.omzet)), num(div(sum(M.jam, (j) => j.omzet), jamTot))]),
              }))}`,
          })}
          ${card({
            title: "Analisis jam sibuk", desc: "Dasar penjadwalan shift kasir & TTK", icon: "insights", tone: "amber",
            body: `<div class="stack">
              ${[...M.jam].sort((a, b) => b.trx - a.trx).slice(0, 5).map((j, i) => `<div class="stack" style="gap:6px"><div class="row between"><span class="strong small">${i + 1}. ${String(j.jam).padStart(2, "0")}.00–${String(j.jam + 1).padStart(2, "0")}.00</span><span class="small num">${num(j.trx)} trx/hari</span></div>${progress(j.trx, M.jam.reduce((m, x) => Math.max(m, x.trx), 0), i < 3 ? "" : "green")}</div>`).join("")}
              ${alert("info", "tips_and_updates", "Rekomendasi", `Jam tersibuk: <strong>${peakTxt}</strong>. Tambahkan 1 kasir dan 1 TTK pada shift sore (16.00–21.00) saat resep dari praktik dokter sore masuk.`)}
            </div>`,
          })}
        </div>`)}

      ${panel("lpj", "jenis", `
        <div class="grid g-1-2">
          ${card({
            title: "Komposisi per jenis", desc: "Penjualan bersih", icon: "donut_small", tone: "purple",
            body: `${chart("lpj-ch-jenis", (k) => ({
              type: "doughnut",
              data: { labels: M.jenis.map((j) => j.nama), datasets: [{ data: M.jenis.map((j) => j.netto), backgroundColor: [k.c1, k.c2, k.c3, k.c4, k.c5], borderColor: k.surface, borderWidth: 2 }] },
              options: { cutout: "66%", plugins: { tooltip: tipPie() } },
            }), "sm")}
            <div style="margin-top:14px">${legend(M.jenis.map((j, i) => [j.nama, CAB_CSS[i]]))}</div>`,
          })}
          ${card({
            title: "Rincian per jenis penjualan", desc: "Nilai dalam rupiah", icon: "sell", flush: true,
            body: table({
              columns: [
                { label: "Jenis", render: (j) => badge(j.nama, j.tone, { dot: true }) },
                { label: "Trx", cls: "num", render: (j) => num(j.trx) },
                { label: "Bruto", cls: "num", render: (j) => num(j.bruto) },
                { label: "Diskon", cls: "num", render: (j) => num(j.diskon) },
                { label: "Retur", cls: "num", render: (j) => num(j.retur) },
                { label: "Netto", cls: "num", render: (j) => `<b>${num(j.netto)}</b>` },
                { label: "Rata-rata", cls: "num", render: (j) => num(div(j.netto, j.trx)) },
                { label: "Margin", cls: "num", render: (j) => pct(div(j.laba, j.netto) * 100) },
                { label: "Kontribusi", cls: "num", render: (j) => pct(div(j.netto, T.netto) * 100) },
              ],
              rows: M.jenis,
              foot: tr([{ v: "Total" }, num(sum(M.jenis, (j) => j.trx)), num(sum(M.jenis, (j) => j.bruto)), num(sum(M.jenis, (j) => j.diskon)), num(sum(M.jenis, (j) => j.retur)), num(sum(M.jenis, (j) => j.netto)), num(div(sum(M.jenis, (j) => j.netto), sum(M.jenis, (j) => j.trx))), pct(div(T.laba, T.netto) * 100), "100,0%"]),
            }),
          })}
        </div>`)}`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     2. LAPORAN CABANG
     ===================================================================== */
  const cabangKpi = () => CAB.map((c, i) => {
    const hpp = R(c.omzet * HPP_R[i]);
    const stok = stokCab(c.id);
    return {
      ...c, i, pct: div(c.omzet, c.target) * 100, avg: div(c.omzet, c.trx), hpp, laba: c.omzet - hpp, margin: (1 - HPP_R[i]) * 100,
      stok, dio: div(stok, hpp) * 30, ed: ED[i][LAST].rugi, resep: R(c.trx * [0.31, 0.27, 0.29, 0.3, 0.24][i]),
    };
  });

  const cabangDetail = (c) => {
    const bulan = CAB_BULAN[c.i];
    const max = Math.max(...bulan);
    modal.open({
      title: esc(c.nama), icon: "store", size: "lg",
      body: `<div class="stack">
        <div class="grid g-2">
          <dl class="kv">
            <dt>Apoteker PJ</dt><dd>${esc(c.apoteker)}</dd><dt>Kota</dt><dd>${esc(c.kota)}</dd>
            <dt>Jam operasional</dt><dd>${esc(c.jam)}</dd><dt>Jumlah karyawan</dt><dd>${c.karyawan} orang</dd>
          </dl>
          <div class="stack" style="gap:8px">
            <div class="row between"><span class="small muted">Pencapaian target bulan ini</span><b class="num">${pct(c.pct)}</b></div>
            ${progress(c.omzet, c.target, c.pct >= 100 ? "green" : c.pct >= 90 ? "" : "amber")}
            <div class="small muted num">${rp(c.omzet)} dari target ${rp(c.target)}</div>
          </div>
        </div>
        <div class="grid g-3">
          ${stat({ label: "Omzet", value: short(c.omzet), icon: "payments", tone: "primary" })}
          ${stat({ label: "Transaksi", value: num(c.trx), icon: "receipt_long", tone: "success", foot: `rata-rata ${rp(c.avg)}` })}
          ${stat({ label: "Laba kotor", value: short(c.laba), icon: "savings", tone: "teal", foot: `margin ${pct(c.margin)}` })}
          ${stat({ label: "Nilai stok", value: short(c.stok), icon: "warehouse", tone: "info", foot: `${num(c.dio)} hari persediaan` })}
          ${stat({ label: "Kerugian ED", value: short(c.ed), icon: "event_busy", tone: "danger", foot: "bulan ini, setelah retur PBF" })}
          ${stat({ label: "Resep dilayani", value: num(c.resep), icon: "prescriptions", tone: "purple", foot: `${pct(div(c.resep, c.trx) * 100)} dari transaksi` })}
        </div>
        ${table({
          cls: "compact",
          columns: [
            { label: "Bulan", render: (r) => `<span class="strong">${r.b}</span>` },
            { label: "Omzet", cls: "num", render: (r) => rp(r.v) },
            { label: "", render: (r) => `<div style="min-width:160px">${progress(r.v, max)}</div>` },
            { label: "Perubahan", cls: "num", render: (r) => (r.p === null ? dash : deltaBadge(r.p)) },
          ],
          rows: bulan.map((v, m) => ({ b: BULAN[m], v, p: m ? chg(v, bulan[m - 1]) : null })).slice(-6).reverse(),
        })}
      </div>`,
      foot: `${btn("Tutup", "dark", { icon: "close", attrs: "data-close" })}${btn("Unduh PDF", "danger", { icon: "picture_as_pdf", attrs: `data-toast="Rapor ${esc(c.nama)} diunduh (PDF)"` })}`,
    });
  };

  window.PAGES["lap-cabang"] = {
    render({ state }) {
      const K = cabangKpi();
      const T = { omzet: sum(K, (c) => c.omzet), target: sum(K, (c) => c.target), trx: sum(K, (c) => c.trx), hpp: sum(K, (c) => c.hpp), laba: sum(K, (c) => c.laba), stok: sum(K, (c) => c.stok), ed: sum(K, (c) => c.ed), resep: sum(K, (c) => c.resep) };
      const rank = [...K].sort((a, b) => b.pct - a.pct);
      const best = rank[0];
      const tercapai = K.filter((c) => c.pct >= 100).length;
      const medal = ["workspace_premium", "military_tech", "military_tech", "emoji_events", "emoji_events"];

      return `
      ${header("Laporan Cabang", `Perbandingan kinerja ${CAB.length} cabang · bulan berjalan ${NAMA_BULAN[M0]} ${Y}${state.cabang !== "ALL" ? ` · cabang aktif <b>${esc(scopeName(state))}</b> ditandai` : ""}`)}
      ${fbar(select("Urutkan", ["Pencapaian target", "Omzet", "Laba kotor", "Margin"]))}

      <div class="grid g-4">
        ${stat({ label: "Omzet seluruh cabang", value: short(T.omzet), icon: "payments", tone: "primary", delta: 5.6, foot: "vs bulan lalu", hero: true })}
        ${stat({ label: "Pencapaian target grup", value: pct(div(T.omzet, T.target) * 100), icon: "flag", tone: "success", foot: `${tercapai} dari ${CAB.length} cabang mencapai target` })}
        ${stat({ label: "Cabang terbaik", value: esc(cabShort(best.id)), icon: "emoji_events", tone: "warning", foot: `pencapaian ${pct(best.pct)}` })}
        ${stat({ label: "Laba kotor grup", value: short(T.laba), icon: "savings", tone: "teal", delta: 4.1, foot: `margin ${pct(div(T.laba, T.omzet) * 100)}` })}
      </div>

      <div class="grid g-2">
        ${card({
          title: "Omzet vs target per cabang", desc: "Bulan berjalan, dalam rupiah", icon: "bar_chart",
          body: `${cabLegend(CAB, [["Target", TARGET_CSS]])}
            ${chart("lcb-ch-target", (k) => ({
              type: "bar",
              data: { labels: K.map((c) => cabShort(c.id)), datasets: [
                { label: "Realisasi", data: K.map((c) => c.omzet), backgroundColor: K.map((c) => cabColor(k, c.id)), ...BAR, maxBarThickness: 34 },
                { label: "Target", data: K.map((c) => c.target), backgroundColor: targetFill(k), ...BAR, maxBarThickness: 34 },
              ] },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: axRp(k), x: axCat() }, plugins: { tooltip: tipRp() } },
            }))}`,
        })}
        ${card({
          title: "Tren omzet bulanan per cabang", desc: "12 bulan terakhir", icon: "show_chart", tone: "purple",
          tools: viewTabs("lcb-tren"),
          body: `${panel("lcb-tren", "grafik", `${cabLegend()}
            ${chart("lcb-ch-tren", (k) => ({
              type: "line",
              data: { labels: BULAN, datasets: CAB.map((c, i) => ({ label: cabShort(c.id), data: CAB_BULAN[i], borderColor: cabColor(k, c.id), backgroundColor: "transparent", tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 })) },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: axRp(k, { beginAtZero: false }), x: axCat() }, plugins: { tooltip: tipRp() } },
            }))}`, true)}
            ${panel("lcb-tren", "tabel", table({
              cls: "compact",
              columns: [{ label: "Bulan", render: (r) => `<b>${r.b}</b>` }, ...CAB.map((c, i) => ({ label: esc(cabShort(c.id)), cls: "num", render: (r) => short(CAB_BULAN[i][r.m]) })), { label: "Total", cls: "num", render: (r) => `<b>${short(sum(CAB_BULAN, (row) => row[r.m]))}</b>` }],
              rows: BULAN.map((b, m) => ({ b, m })).reverse(),
            }))}`,
        })}
      </div>

      <div class="grid g-5">
        ${rank.map((c, i) => card({
          body: `<div class="stack" style="gap:10px">
            <div class="row between"><span class="badge ${i === 0 ? "amber" : i < 3 ? "blue" : "gray"}">${icon(medal[i])}Peringkat ${i + 1}</span>${c.id === state.cabang ? badge("Aktif", "green", { dot: true }) : ""}</div>
            <div><div class="strong">${esc(cabShort(c.id))}</div><div class="small muted">${esc(c.apoteker)}</div></div>
            <div class="row between"><b class="num" style="font-size:22px">${pct(c.pct)}</b>${c.pct >= 100 ? status("Tercapai") : badge("Di bawah target", "amber", { dot: true })}</div>
            ${progress(c.omzet, c.target, c.pct >= 100 ? "green" : c.pct >= 90 ? "" : "amber")}
            <div class="small muted num">${short(c.omzet)} / ${short(c.target)}</div>
            ${btn("Detail", "info", { icon: "visibility", size: "sm", attrs: `data-cab-detail="${c.id}"` })}
          </div>`,
        })).join("")}
      </div>

      ${card({
        title: "Perbandingan kinerja cabang", desc: "Bulan berjalan · nilai dalam rupiah · ED = kerugian kedaluwarsa setelah retur PBF", icon: "table_rows", flush: true,
        body: table({
          columns: [
            { label: "Cabang", render: (c) => `<div class="t-main nowrap">${swatch(c.i)}${esc(cabShort(c.id))} ${c.id === state.cabang ? badge("Aktif", "green") : ""}</div><div class="t-sub nowrap">${esc(c.kota)} · ${c.jam}</div>` },
            { label: "Apoteker PJ", render: (c) => esc(c.apoteker) },
            { label: "Omzet", cls: "num", render: (c) => `<b>${num(c.omzet)}</b>` },
            { label: "Target", cls: "num", render: (c) => num(c.target) },
            { label: "Pencapaian", render: (c) => `<div style="min-width:120px" class="stack"><span class="small num strong">${pct(c.pct)}</span>${progress(c.omzet, c.target, c.pct >= 100 ? "green" : c.pct >= 90 ? "" : "amber")}</div>` },
            { label: "Trx", cls: "num", render: (c) => num(c.trx) },
            { label: "Rata-rata struk", cls: "num", render: (c) => num(c.avg) },
            { label: "HPP", cls: "num", render: (c) => num(c.hpp) },
            { label: "Laba kotor", cls: "num", render: (c) => num(c.laba) },
            { label: "Margin", cls: "num", render: (c) => pct(c.margin) },
            { label: "Nilai stok", cls: "num", render: (c) => num(c.stok) },
            { label: "ED loss", cls: "num", render: (c) => num(c.ed) },
            { label: "Resep", cls: "num", render: (c) => num(c.resep) },
            { label: "", cls: "actions", render: (c) => btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-cab-detail="${c.id}"` }) },
          ],
          rows: K,
          foot: tr([{ v: `Total ${CAB.length} cabang`, span: 2 }, num(T.omzet), num(T.target), { v: `<span class="num">${pct(div(T.omzet, T.target) * 100)}</span>` }, num(T.trx), num(div(T.omzet, T.trx)), num(T.hpp), num(T.laba), pct(div(T.laba, T.omzet) * 100), num(T.stok), num(T.ed), num(T.resep), { v: "" }]),
        }),
      })}`;
    },
    mount(root) {
      bindCommon(root);
      const K = cabangKpi();
      root.querySelectorAll("[data-cab-detail]").forEach((b) => b.addEventListener("click", () => cabangDetail(K.find((c) => c.id === b.dataset.cabDetail))));
    },
  };

  /* =====================================================================
     3. LAPORAN KONSOLIDASI
     ===================================================================== */
  const FIX = { // beban tetap per bulan per cabang (urutan DB.cabang)
    sewa: [42e6, 28e6, 24e6, 26e6, 18e6],
    listrik: [14.2e6, 9.6e6, 8.3e6, 9.1e6, 6.2e6],
    susut: [11.4e6, 6.6e6, 5.9e6, 6.3e6, 4.4e6],
  };
  const INTERNAL = [0.024, 0.006, 0.002, 0.003, 0]; // mutasi keluar ke cabang lain (dicatat sbg penjualan internal pada harga pokok)
  const LR_KEYS = ["bruto", "diskon", "retur", "bersih", "hpp", "lk", "gaji", "sewa", "listrik", "susut", "lain", "lo", "pendLain", "lsp", "pajak", "lb"];

  // Sumber: jurnal (window.GL) — konsisten dengan neraca saldo, buku besar & neraca
  function lrKons(n) {
    const cols = CAB.map((c) => {
      const o = GL.labaRugi(c.id, n);
      return { bruto: o.bruto, diskon: o.diskon, retur: o.retur, bersih: o.bersih, hpp: o.hpp, lk: o.lk, gaji: o.gaji, sewa: o.sewa, listrik: o.listrik, susut: o.susut, lain: o.promo + o.bank + o.lain, lo: o.lo, pendLain: o.pendLain, lsp: o.lsp, pajak: o.pajak, lb: o.lb, internal: o.internal };
    });
    const tot = sum(cols, (c) => c.internal);
    const elim = {};
    LR_KEYS.forEach((k) => { elim[k] = 0; });
    elim.bruto = -tot; elim.bersih = -tot; elim.hpp = -tot;
    const kons = {};
    LR_KEYS.forEach((k) => { kons[k] = sum(cols, (c) => c[k]) + elim[k]; });
    return { cols, elim, kons, internal: tot };
  }

  const LR_DEF = [
    { g: "Pendapatan" },
    { k: "bruto", l: "Penjualan bruto" }, { k: "diskon", l: "Diskon penjualan", neg: 1 }, { k: "retur", l: "Retur penjualan", neg: 1 },
    { k: "bersih", l: "Penjualan bersih", sub: 1 },
    { g: "Beban pokok" },
    { k: "hpp", l: "Harga pokok penjualan (HPP)", neg: 1 }, { k: "lk", l: "Laba kotor", sub: 1 },
    { g: "Beban usaha" },
    { k: "gaji", l: "Beban gaji & tunjangan", neg: 1 }, { k: "sewa", l: "Beban sewa gedung", neg: 1 }, { k: "listrik", l: "Listrik & air", neg: 1 },
    { k: "susut", l: "Penyusutan aset tetap", neg: 1 }, { k: "lain", l: "Beban lain (pemasaran, admin, MDR)", neg: 1 },
    { k: "lo", l: "Laba operasional", sub: 1 },
    { g: "Pendapatan lain & pajak" },
    { k: "pendLain", l: "Pendapatan lain (rebate PBF, jasa giro)" }, { k: "lsp", l: "Laba sebelum pajak", sub: 1 },
    { k: "pajak", l: "PPh Badan 22% (tarif umum Pasal 17)", neg: 1 },
    { k: "lb", l: "Laba bersih", foot: 1 },
  ];

  // Nilai dalam ribuan rupiah; tanda kurung = pengurang
  const acc = (v) => (v === 0 ? dash : v < 0 ? `(${num(-v / 1000)})` : num(v / 1000));
  const stmt = (defs, heads, cols) => {
    const cell = (d, c) => `<td class="num ${d.sub || d.foot ? "strong" : ""}">${acc((d.neg ? -1 : 1) * (c[d.k] || 0))}</td>`;
    const body = defs.filter((d) => !d.foot).map((d) => (d.g
      ? `<tr class="group"><td colspan="${heads.length + 1}">${d.g}</td></tr>`
      : `<tr><td class="${d.sub ? "strong" : ""}" style="${d.sub ? "" : "padding-left:28px"}">${d.l}</td>${cols.map((c) => cell(d, c)).join("")}</tr>`)).join("");
    const foot = defs.filter((d) => d.foot).map((d) => `<tr><td>${d.l}</td>${cols.map((c) => cell(d, c)).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Keterangan <span class="t-sub">(Rp ribuan)</span></th>${heads.map((h) => `<th class="num">${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ""}</table></div>`;
  };
  const konsHeads = [...CAB.map((c) => `<span title="${esc(c.nama)}">${esc(cabShort(c.id))}</span>`), "Eliminasi", "Konsolidasi"];

  function neraca() {
    const KEYS = ["kas", "piutang", "piutangAC", "persediaan", "dimuka", "al", "tetap", "aset", "hutang", "hutangAC", "pajak", "liabPendek", "bankLoan", "liab", "ekuitas", "le"];
    const cols = CAB.map((c) => { const n = GL.neraca(c.id); const o = {}; KEYS.forEach((k) => { o[k] = n[k]; }); return o; });
    const ac = sum(cols, (c) => c.piutangAC);
    const elim = { piutangAC: -ac, al: -ac, aset: -ac, hutangAC: -ac, liabPendek: -ac, liab: -ac, le: -ac };
    const kons = {};
    KEYS.forEach((k) => { kons[k] = sum(cols, (c) => c[k]) + (elim[k] || 0); });
    return { cols, elim, kons };
  }
  const NERACA_DEF = [
    { g: "Aset lancar" },
    { k: "kas", l: "Kas & bank" }, { k: "piutang", l: "Piutang usaha (B2B, BPJS, settlement kartu/QRIS)" }, { k: "piutangAC", l: "Piutang antar cabang" },
    { k: "persediaan", l: "Persediaan obat & alkes" }, { k: "dimuka", l: "Pajak & biaya dibayar dimuka" }, { k: "al", l: "Total aset lancar", sub: 1 },
    { g: "Aset tidak lancar" },
    { k: "tetap", l: "Aset tetap (neto)" }, { k: "aset", l: "Total aset", sub: 1 },
    { g: "Liabilitas" },
    { k: "hutang", l: "Hutang usaha (PBF)" }, { k: "hutangAC", l: "Hutang antar cabang" }, { k: "pajak", l: "Hutang pajak & beban akrual" },
    { k: "liabPendek", l: "Total liabilitas jangka pendek", sub: 1 }, { k: "bankLoan", l: "Hutang bank jangka panjang" },
    { k: "liab", l: "Total liabilitas", sub: 1 },
    { g: "Ekuitas" },
    { k: "ekuitas", l: "Ekuitas (modal, saldo laba & laba berjalan)" },
    { k: "le", l: "Total liabilitas & ekuitas", foot: 1 },
  ];

  window.PAGES["lap-konsolidasi"] = {
    render({ state }) {
      const P = { bulan: lrKons(1), kuartal: lrKons(3), tahun: lrKons(12) };
      const K = P.bulan.kons;
      const N = neraca();
      const AK = GL.arusKas("ALL");
      const ak = [
        { g: "Arus kas dari aktivitas operasi" },
        { k: "terima", l: "Penerimaan dari pelanggan (tunai, settlement kartu/QRIS, B2B, BPJS)" },
        { k: "pbf", l: "Pembayaran ke PBF / pemasok" },
        { k: "gaji", l: "Pembayaran gaji & tunjangan" },
        { k: "ops", l: "Pembayaran sewa, listrik & beban operasional" },
        { k: "pajak", l: "Pembayaran pajak (PPN, PPh 25)" },
        { k: "op", l: "Arus kas bersih dari aktivitas operasi", sub: 1 },
        { g: "Arus kas dari aktivitas investasi" },
        { k: "aset", l: "Pembelian aset tetap" },
        { k: "inv", l: "Arus kas bersih dari aktivitas investasi", sub: 1 },
        { g: "Arus kas dari aktivitas pendanaan" },
        { k: "pinjaman", l: "Pembayaran pokok & bunga pinjaman bank" },
        { k: "modal", l: "Setoran modal" },
        { k: "dividen", l: "Pembagian dividen interim" },
        { k: "dana", l: "Arus kas bersih dari aktivitas pendanaan", sub: 1 },
        { g: "Ringkasan" },
        { k: "naik", l: "Kenaikan (penurunan) kas bersih", sub: 1 },
        { k: "awal", l: "Kas & bank awal periode" },
        { k: "akhir", l: "Kas & bank akhir periode", foot: 1 },
      ];
      const akv = AK;
      const tren = BULAN.map((bl, i) => { const o = GL.labaRugi("ALL", 1, i - LAST); return { bulan: bl, pendapatan: o.bersih, hpp: o.hpp, biaya: o.beban, laba: o.lo }; });
      const trenT = { p: sum(tren, (b) => b.pendapatan), h: sum(tren, (b) => b.hpp), b: sum(tren, (b) => b.biaya), l: sum(tren, (b) => b.laba) };

      return `
      ${header("Laporan Konsolidasi", `${esc(DB.apotek.badanUsaha)} · gabungan ${CAB.length} cabang · periode ${NAMA_BULAN[M0]} ${Y}`)}
      ${alert("info", "account_tree", "Tentang konsolidasi", ` Laporan ini menggabungkan laporan keuangan seluruh cabang lalu mengeliminasi transaksi internal. <strong>Mutasi stok antar cabang</strong> dicatat cabang pengirim sebagai penjualan internal pada harga pokok, sehingga penjualan dan HPP internal (${short(P.bulan.internal)} bulan ini) dieliminasi tanpa memengaruhi laba. <strong>Piutang/hutang antar cabang</strong> juga saling hapus di posisi keuangan.`)}
      ${state.cabang !== "ALL" ? alert("warn", "info", "Cabang aktif diabaikan", ` Laporan konsolidasi selalu mencakup semua cabang, meskipun cabang aktif saat ini ${esc(scopeName(state))}.`) : ""}
      ${fbar(`${select("Periode", ["Bulanan", "Kuartal", "Tahunan"])}${select("Satuan", ["Ribuan rupiah", "Rupiah penuh", "Jutaan rupiah"])}`)}

      <div class="grid g-4">
        ${stat({ label: "Penjualan bersih konsolidasi", value: short(K.bersih), icon: "payments", tone: "primary", delta: 5.6, foot: "setelah eliminasi", hero: true })}
        ${stat({ label: "Laba kotor", value: short(K.lk), icon: "savings", tone: "teal", foot: `margin ${pct(div(K.lk, K.bersih) * 100)}` })}
        ${stat({ label: "Laba bersih", value: short(K.lb), icon: "account_balance", tone: "success", delta: 3.8, foot: `margin bersih ${pct(div(K.lb, K.bersih) * 100)}` })}
        ${stat({ label: "Eliminasi antar cabang", value: short(P.bulan.internal), icon: "swap_horiz", tone: "purple", foot: `${DB.mutasi.length} mutasi terakhir · ${short(sum(DB.mutasi, (m) => m.nilai))}` })}
      </div>

      ${tabs("lks", [
        { id: "lr", label: "Laba Rugi Konsolidasi", icon: "balance" }, { id: "neraca", label: "Posisi Keuangan", icon: "account_balance" },
        { id: "aruskas", label: "Arus Kas", icon: "currency_exchange" }, { id: "tren", label: "Tren 12 Bulan", icon: "show_chart" },
      ], "lr")}

      ${panel("lks", "lr", card({
        title: "Laba rugi konsolidasi", desc: "Kolom per cabang, eliminasi transaksi internal, dan hasil konsolidasi", icon: "balance",
        tools: tabs("lks-per", [{ id: "bulan", label: "Bulanan" }, { id: "kuartal", label: "Kuartal" }, { id: "tahun", label: "Tahunan" }], "bulan"),
        flush: true,
        body: ["bulan", "kuartal", "tahun"].map((p, i) => panel("lks-per", p, stmt(LR_DEF, konsHeads, [...P[p].cols, P[p].elim, P[p].kons]), i === 0)).join(""),
        foot: `<span class="small muted">${icon("info")} Pajak memakai PPh Badan tarif umum 22% (peredaran bruto grup di atas Rp 50 M/tahun, sehingga PPh final 0,5% UMKM dan fasilitas Pasal 31E tidak berlaku). Angka estimasi sebelum koreksi fiskal.</span>`,
      }), true)}

      ${panel("lks", "neraca", `
        <div class="grid g-4">
          ${stat({ label: "Total aset", value: short(N.kons.aset), icon: "account_balance", tone: "primary" })}
          ${stat({ label: "Rasio lancar", value: dec1(div(N.kons.al, N.kons.liab)) + "×", icon: "water_drop", tone: "success", foot: "aset lancar / liabilitas" })}
          ${stat({ label: "Persediaan thd aset", value: pct(div(N.kons.persediaan, N.kons.aset) * 100), icon: "warehouse", tone: "info" })}
          ${stat({ label: "Rasio utang thd ekuitas", value: dec1(div(N.kons.liab, N.kons.ekuitas)) + "×", icon: "scale", tone: "warning" })}
        </div>
        ${card({
          title: "Posisi keuangan ringkas", desc: `Per ${tgl(DB.TODAY)} · piutang & hutang antar cabang dieliminasi`, icon: "account_balance", flush: true,
          body: stmt(NERACA_DEF, konsHeads, [...N.cols, N.elim, N.kons]),
        })}`)}

      ${panel("lks", "aruskas", `
        <div class="grid g-3">
          ${stat({ label: "Arus kas operasi", value: short(akv.op), icon: "autorenew", tone: "success", foot: "metode langsung" })}
          ${stat({ label: "Arus kas investasi", value: short(akv.inv), icon: "construction", tone: "warning" })}
          ${stat({ label: "Arus kas pendanaan", value: short(akv.dana), icon: "account_balance", tone: "purple" })}
        </div>
        ${card({
          title: "Laporan arus kas ringkas (konsolidasi)", desc: `Bulan ${NAMA_BULAN[M0]} ${Y} · metode langsung`, icon: "currency_exchange", flush: true,
          body: stmt(ak.map((d) => ({ ...d, neg: 0 })), ["Konsolidasi"], [akv]),
        })}`)}

      ${panel("lks", "tren", `
        <div class="grid g-2">
          ${card({
            title: "Komposisi pendapatan 12 bulan", desc: "Tinggi batang = pendapatan bersih konsolidasi (HPP + beban + laba)", icon: "stacked_bar_chart",
            body: `${legend([["HPP", "var(--chart-1)"], ["Beban usaha", "var(--chart-2)"], ["Laba operasional", "var(--chart-3)"]])}
              ${chart("lks-ch-komposisi", (k) => ({
                type: "bar",
                data: { labels: BULAN, datasets: [
                  { label: "HPP", data: tren.map((b) => b.hpp), backgroundColor: k.c1, ...BAR, stack: "s" },
                  { label: "Beban usaha", data: tren.map((b) => b.biaya), backgroundColor: k.c2, ...BAR, stack: "s" },
                  { label: "Laba operasional", data: tren.map((b) => b.laba), backgroundColor: k.c3, ...BAR, stack: "s" },
                ] },
                options: { interaction: { mode: "index", intersect: false }, scales: { y: axRp(k, { stacked: true }), x: axCat({ stacked: true }) }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${rp(c.raw)}`, footer: (items) => `Pendapatan: ${rp(tren[items[0].dataIndex].pendapatan)}` } } } },
              }))}`,
          })}
          ${card({
            title: "Margin laba operasional", desc: "Laba operasional ÷ pendapatan, dalam persen", icon: "percent", tone: "green",
            body: chart("lks-ch-margin", (k) => ({
              type: "line",
              data: { labels: BULAN, datasets: [{ label: "Margin laba", data: tren.map((b) => +(div(b.laba, b.pendapatan) * 100).toFixed(2)), borderColor: k.c3, backgroundColor: "transparent", tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 }] },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: { grid: { color: k.grid }, ticks: { callback: (v) => v + "%" } }, x: axCat() }, plugins: { tooltip: { callbacks: { label: (c) => ` Margin: ${pct(c.raw)}` } } } },
            })),
          })}
        </div>
        ${card({
          title: "Tren bulanan konsolidasi", desc: "Nilai dalam rupiah", icon: "table_rows", flush: true,
          body: table({
            columns: [
              { label: "Bulan", render: (b) => `<b>${b.bulan}</b>` },
              { label: "Pendapatan", cls: "num", render: (b) => num(b.pendapatan) },
              { label: "HPP", cls: "num", render: (b) => num(b.hpp) },
              { label: "Beban usaha", cls: "num", render: (b) => num(b.biaya) },
              { label: "Laba operasional", cls: "num", render: (b) => `<b>${num(b.laba)}</b>` },
              { label: "Margin", cls: "num", render: (b) => pct(div(b.laba, b.pendapatan) * 100) },
            ],
            rows: [...tren].reverse(),
            foot: tr([{ v: "Total 12 bulan" }, num(trenT.p), num(trenT.h), num(trenT.b), num(trenT.l), pct(div(trenT.l, trenT.p) * 100)]),
          }),
        })}`)}`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     4. LAPORAN SALES
     ===================================================================== */
  const B2B = [
    { nama: "Klinik Pratama Sehat", tipe: "Klinik Pratama", kota: "Jakarta Selatan", omzet: 128400000, faktur: 14, piutang: 34500000, top: 30, jt: 6 },
    { nama: "Klinik Tumbuh Kembang", tipe: "Klinik Utama Anak", kota: "Jakarta Selatan", omzet: 96200000, faktur: 11, piutang: 41800000, top: 30, jt: -4 },
    { nama: "Praktik dr. Bambang Susilo", tipe: "Praktik Dokter Mandiri", kota: "Jakarta Selatan", omzet: 61800000, faktur: 9, piutang: 12600000, top: 14, jt: 3 },
    { nama: "Klinik Gigi Senyum Ceria", tipe: "Klinik Gigi", kota: "Depok", omzet: 44500000, faktur: 6, piutang: 18900000, top: 30, jt: 12 },
    { nama: "Klinik Derma Glow", tipe: "Klinik Kecantikan", kota: "Tangerang Selatan", omzet: 38900000, faktur: 5, piutang: 22700000, top: 45, jt: -17 },
    { nama: "Praktik Bersama dr. Fajar, Sp.KK", tipe: "Praktik Dokter Spesialis", kota: "Jakarta Selatan", omzet: 29700000, faktur: 4, piutang: 0, top: 14, jt: null },
    { nama: "Klinik Pratama Medika Bekasi", tipe: "Klinik Pratama", kota: "Bekasi", omzet: 22000000, faktur: 3, piutang: 22000000, top: 30, jt: 21 },
  ];
  const b2bStatus = (c) => (!c.piutang ? badge("Lunas", "green", { dot: true }) : c.jt < 0 ? badge(`Terlambat ${-c.jt} hari`, "red", { dot: true }) : c.jt <= 7 ? badge("Jatuh tempo ≤ 7 hari", "amber", { dot: true }) : badge("Lancar", "blue", { dot: true }));
  const salesKpi = (s) => {
    const p = div(s.omzet, s.target) * 100;
    const komisi = p >= 90 ? R(s.omzet * 0.01 + Math.max(0, s.omzet - s.target) * 0.02) : 0;
    const tier = p >= 105 ? ["Platinum", "purple"] : p >= 100 ? ["Gold", "amber"] : p >= 90 ? ["Silver", "cyan"] : ["Pembinaan", "red"];
    return { ...s, p, komisi, tier, avg: div(s.omzet, s.trx) };
  };

  window.PAGES["lap-sales"] = {
    render({ state }) {
      const S = DB.sales.filter((s) => state.cabang === "ALL" || s.cabang === state.cabang).map(salesKpi);
      const rank = [...S].sort((a, b) => b.p - a.p);
      const T = { target: sum(S, (s) => s.target), omzet: sum(S, (s) => s.omzet), trx: sum(S, (s) => s.trx), resep: sum(S, (s) => s.resep), upsell: sum(S, (s) => s.upsell), komisi: sum(S, (s) => s.komisi) };
      const top = rank[0];
      const B = { omzet: sum(B2B, (c) => c.omzet), faktur: sum(B2B, (c) => c.faktur), piutang: sum(B2B, (c) => c.piutang), telat: sum(B2B.filter((c) => c.piutang && c.jt < 0), (c) => c.piutang) };

      return `
      ${header("Laporan Sales", `Kinerja kasir, TTK, dan sales B2B · <b>${esc(scopeName(state))}</b> · ${NAMA_BULAN[M0]} ${Y}`)}
      ${fbar(select("Jabatan", ["Semua jabatan", "Kasir", "TTK", "Sales B2B (Klinik)"]))}

      <div class="grid g-4">
        ${stat({ label: "Omzet tim", value: short(T.omzet), icon: "groups", tone: "primary", delta: 4.9, foot: `${S.length} orang`, hero: true })}
        ${stat({ label: "Pencapaian target tim", value: pct(div(T.omzet, T.target) * 100), icon: "flag", tone: "success", foot: `target ${short(T.target)}` })}
        ${stat({ label: "Top performer", value: esc(top.nama.split(" ")[0]), icon: "emoji_events", tone: "warning", foot: `${pct(top.p)} · ${esc(top.jabatan)}` })}
        ${stat({ label: "Total komisi", value: short(T.komisi), icon: "redeem", tone: "pink", foot: `${S.filter((s) => s.komisi).length} orang memenuhi syarat` })}
      </div>

      <div class="grid g-3">
        ${rank.slice(0, 3).map((s, i) => card({
          body: `<div class="row" style="gap:14px">
            ${avatar(s.nama, false)}
            <div class="grow" style="flex:1;min-width:0"><div class="strong">${esc(s.nama)}</div><div class="small muted">${esc(s.jabatan)} · ${esc(cabShort(s.cabang))}</div></div>
            <span class="badge ${["amber", "blue", "teal"][i]}">${icon(i === 0 ? "workspace_premium" : "military_tech")}#${i + 1}</span>
          </div>
          <div class="row between" style="margin-top:14px"><b class="num" style="font-size:22px">${pct(s.p)}</b>${badge(s.tier[0], s.tier[1])}</div>
          <div style="margin:8px 0">${progress(Math.min(s.omzet, s.target), s.target, s.p >= 100 ? "green" : "")}</div>
          <div class="row between small muted"><span class="num">${short(s.omzet)} / ${short(s.target)}</span><span>komisi <b class="num">${short(s.komisi)}</b></span></div>`,
        })).join("")}
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Realisasi vs target per orang", desc: "Bulan berjalan, dalam rupiah", icon: "bar_chart",
          body: `${legend([["Realisasi", "var(--chart-1)"], ["Target", TARGET_CSS]])}
            ${chart("lsl-ch-target", (k) => ({
              type: "bar",
              data: { labels: S.map((s) => s.nama), datasets: [
                { label: "Realisasi", data: S.map((s) => s.omzet), backgroundColor: k.c1, ...HBAR, maxBarThickness: 16 },
                { label: "Target", data: S.map((s) => s.target), backgroundColor: targetFill(k), ...HBAR, maxBarThickness: 16 },
              ] },
              options: { indexAxis: "y", interaction: { mode: "index", intersect: false }, scales: { x: axRp(k), y: axCat() }, plugins: { tooltip: tipRp("x") } },
            }), "lg")}`,
        })}
        ${card({
          title: "Skema komisi & tier", desc: "Berlaku mulai periode ini", icon: "redeem", tone: "pink",
          body: `<div class="stack">
            <dl class="kv">
              <dt>Syarat komisi</dt><dd>Pencapaian ≥ 90%</dd>
              <dt>Komisi dasar</dt><dd>1% × realisasi</dd>
              <dt>Bonus</dt><dd>2% × kelebihan target</dd>
            </dl>
            <div class="divider"></div>
            <div class="stack" style="gap:8px">
              <div class="row between">${badge("Platinum", "purple")}<span class="small muted">≥ 105% target</span></div>
              <div class="row between">${badge("Gold", "amber")}<span class="small muted">100–104,9%</span></div>
              <div class="row between">${badge("Silver", "cyan")}<span class="small muted">90–99,9%</span></div>
              <div class="row between">${badge("Pembinaan", "red")}<span class="small muted">&lt; 90%, tanpa komisi</span></div>
            </div>
            ${alert("info", "info", "Upselling", "Dihitung dari penawaran produk pendamping (vitamin, probiotik, alkes) yang tercatat di kasir.")}
          </div>`,
        })}
      </div>

      ${card({
        title: "Kinerja per petugas", desc: "Nilai dalam rupiah · diurutkan menurut pencapaian", icon: "badge", flush: true,
        body: table({
          columns: [
            { label: "#", cls: "num", render: (s, i) => `<b>${i + 1}</b>` },
            { label: "Nama", render: (s) => `<div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(s.nama)}<div><div class="t-main nowrap">${esc(s.nama)}</div><div class="t-sub">${s.id}</div></div></div>` },
            { label: "Jabatan", render: (s) => esc(s.jabatan) },
            { label: "Cabang", render: (s) => esc(cabShort(s.cabang)) },
            { label: "Target", cls: "num", render: (s) => num(s.target) },
            { label: "Realisasi", cls: "num", render: (s) => `<b>${num(s.omzet)}</b>` },
            { label: "Pencapaian", render: (s) => `<div style="min-width:110px" class="stack"><span class="small num strong">${pct(s.p)}</span>${progress(Math.min(s.omzet, s.target), s.target, s.p >= 100 ? "green" : s.p >= 90 ? "" : "amber")}</div>` },
            { label: "Trx", cls: "num", render: (s) => num(s.trx) },
            { label: "Rata-rata/trx", cls: "num", render: (s) => num(s.avg) },
            { label: "Resep", cls: "num", render: (s) => (s.resep ? num(s.resep) : dash) },
            { label: "Upselling", cls: "num", render: (s) => (s.upsell ? num(s.upsell) : dash) },
            { label: "Komisi", cls: "num", render: (s) => (s.komisi ? `<b>${num(s.komisi)}</b>` : dash) },
            { label: "Tier", render: (s) => badge(s.tier[0], s.tier[1]) },
          ],
          rows: rank,
          foot: tr([{ v: `Total ${S.length} orang`, span: 4 }, num(T.target), num(T.omzet), { v: `<span class="num">${pct(div(T.omzet, T.target) * 100)}</span>` }, num(T.trx), num(div(T.omzet, T.trx)), num(T.resep), num(T.upsell), num(T.komisi), { v: "" }]),
        }),
      })}

      <div class="grid g-4">
        ${stat({ label: "Omzet B2B / klinik", value: short(B.omzet), icon: "domain", tone: "teal", foot: `${B2B.length} pelanggan · ${B.faktur} faktur` })}
        ${stat({ label: "Piutang berjalan", value: short(B.piutang), icon: "request_quote", tone: "warning", foot: `${pct(div(B.piutang, B.omzet) * 100)} dari omzet B2B` })}
        ${stat({ label: "Piutang lewat jatuh tempo", value: short(B.telat), icon: "running_with_errors", tone: "danger", foot: `${B2B.filter((c) => c.piutang && c.jt < 0).length} pelanggan perlu ditagih` })}
        ${stat({ label: "Rata-rata TOP", value: `${R(div(sum(B2B, (c) => c.top), B2B.length))} hari`, icon: "event_repeat", tone: "info", foot: "term of payment" })}
      </div>
      ${card({
        title: "Penjualan B2B / Klinik", desc: "Dikelola tim Sales B2B Cabang Pusat · nilai dalam rupiah", icon: "domain", tone: "teal", flush: true,
        tools: btn("Kirim pengingat tagihan", "primary", { size: "sm", icon: "send", attrs: 'data-toast="Pengingat tagihan dikirim ke pelanggan jatuh tempo"' }),
        body: table({
          columns: [
            { label: "Pelanggan", render: (c) => `<div class="t-main">${esc(c.nama)}</div><div class="t-sub">${esc(c.tipe)} · ${esc(c.kota)}</div>` },
            { label: "PIC", render: () => "Bayu Kurniawan" },
            { label: "Omzet bulan ini", cls: "num", render: (c) => `<b>${num(c.omzet)}</b>` },
            { label: "Faktur", cls: "num", render: (c) => num(c.faktur) },
            { label: "Piutang", cls: "num", render: (c) => (c.piutang ? num(c.piutang) : dash) },
            { label: "TOP", cls: "num nowrap", render: (c) => `${c.top} hari` },
            { label: "Jatuh tempo", render: (c) => (c.jt === null ? dash : tgl(DB.addDays(c.jt))) },
            { label: "Status", render: (c) => b2bStatus(c) },
            { label: "", cls: "actions", render: (c) => `<div style="min-width:72px">${UI.rowActions(["view", "send"], c.nama)}</div>` },
          ],
          rows: B2B,
          foot: tr([{ v: `Total ${B2B.length} pelanggan`, span: 2 }, num(B.omzet), num(B.faktur), num(B.piutang), { v: "", span: 4 }]),
        }),
      })}`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     5. LABA RUGI (entitas tunggal: cabang aktif atau gabungan)
     ===================================================================== */
  const BEBAN = [["gaji", "Gaji & tunjangan karyawan", 0.5], ["sewa", "Sewa gedung", 0.17], ["listrik", "Listrik, air & internet", 0.07], ["susut", "Penyusutan aset tetap", 0.06], ["promo", "Pemasaran & promosi", 0.06], ["bank", "Administrasi bank & MDR", 0.06], ["lain", "Beban operasional lain", 0.08]];
  // Sumber: jurnal (window.GL). m = indeks DB.bulanan (LAST = bulan berjalan s.d. hari ini)
  function lrBulan(st, m) {
    return GL.labaRugi(st.cabang, 1, m - LAST);
  }
  const LR1 = [
    { g: "Pendapatan" },
    { k: "bruto", l: "Penjualan bruto" }, { k: "diskon", l: "Diskon penjualan", neg: 1 }, { k: "retur", l: "Retur penjualan", neg: 1 },
    { k: "bersih", l: "Penjualan bersih", sub: 1 },
    { g: "Beban pokok penjualan" },
    { k: "hpp", l: "Harga pokok penjualan (HPP)", neg: 1 }, { k: "lk", l: "Laba kotor", sub: 1 },
    { g: "Beban usaha" },
    ...BEBAN.map(([k, l]) => ({ k, l, neg: 1 })),
    { k: "beban", l: "Total beban usaha", sub: 1, neg: 1 }, { k: "lo", l: "Laba operasional", sub: 1 },
    { g: "Pendapatan (beban) lain-lain" },
    { k: "rebate", l: "Rebate & bonus PBF" }, { k: "bunga", l: "Pendapatan bunga / jasa giro" }, { k: "bBunga", l: "Beban bunga pinjaman", neg: 1 },
    { k: "lsp", l: "Laba sebelum pajak", sub: 1 }, { k: "pajak", l: "PPh Badan 22%", neg: 1 },
    { k: "lb", l: "Laba bersih", foot: 1 },
  ];

  window.PAGES["lap-labarugi"] = {
    render({ state }) {
      const cur = lrBulan(state, LAST);
      const prev = lrBulan(state, LAST - 1);
      const lain = cur.rebate + cur.bunga - cur.bBunga;
      const wf = [
        ["Penjualan bersih", 0, cur.bersih, "tot"], ["HPP", cur.lk, cur.bersih, "dec"], ["Laba kotor", 0, cur.lk, "tot"],
        ["Beban usaha", cur.lo, cur.lk, "dec"], ["Laba operasional", 0, cur.lo, "tot"],
        ["Lain-lain (neto)", Math.min(cur.lo, cur.lsp), Math.max(cur.lo, cur.lsp), lain >= 0 ? "inc" : "dec"],
        ["Pajak", cur.lb, cur.lsp, "dec"], ["Laba bersih", 0, cur.lb, "tot"],
      ];
      const row = (d) => {
        const s = d.neg ? -1 : 1;
        const a = s * cur[d.k], b = s * prev[d.k];
        const dlt = chg(cur[d.k], prev[d.k]);
        const cls = d.sub || d.foot ? "strong" : "";
        return `<tr><td class="${cls}" style="${d.sub || d.foot ? "" : "padding-left:28px"}">${d.l}</td>
          <td class="num ${cls}">${acc(a)}</td><td class="num muted">${pct(div(cur[d.k], cur.bersih) * 100)}</td>
          <td class="num ${cls}">${acc(b)}</td><td class="num muted">${pct(div(prev[d.k], prev.bersih) * 100)}</td>
          <td class="num">${acc(a - b)}</td><td class="num">${deltaBadge(dlt, !d.neg)}</td></tr>`;
      };
      const body = LR1.filter((d) => !d.foot).map((d) => (d.g ? `<tr class="group"><td colspan="7">${d.g}</td></tr>` : row(d))).join("");
      const foot = LR1.filter((d) => d.foot).map(row).join("");

      return `
      ${header("Laba Rugi", `Laporan laba rugi <b>${esc(state.cabang === "ALL" ? "gabungan semua cabang (setelah eliminasi)" : scopeName(state))}</b> · ${NAMA_BULAN[M0]} ${Y} (s.d. ${tgl(DB.TODAY)}) dibanding bulan lalu. Disusun dari jurnal umum & neraca saldo.`)}
      ${fbar(select("Bandingkan dengan", ["Bulan lalu", "Bulan yang sama tahun lalu", "Anggaran (budget)"]))}

      <div class="grid g-4">
        ${stat({ label: "Penjualan bersih", value: short(cur.bersih), icon: "payments", tone: "primary", ...heroDelta(chg(cur.bersih, prev.bersih)), hero: true })}
        ${stat({ label: "Laba kotor", value: short(cur.lk), icon: "savings", tone: "teal", delta: chg(cur.lk, prev.lk), foot: `margin ${pct(div(cur.lk, cur.bersih) * 100)}` })}
        ${stat({ label: "Laba operasional", value: short(cur.lo), icon: "trending_up", tone: "info", delta: chg(cur.lo, prev.lo), foot: `margin ${pct(div(cur.lo, cur.bersih) * 100)}` })}
        ${stat({ label: "Laba bersih", value: short(cur.lb), icon: "account_balance", tone: "success", delta: chg(cur.lb, prev.lb), foot: `margin bersih ${pct(div(cur.lb, cur.bersih) * 100)}` })}
      </div>

      ${card({
          title: "Laporan laba rugi", desc: `${BULAN[LAST]} vs ${BULAN[LAST - 1]} · % terhadap penjualan bersih`, icon: "balance", flush: true,
          body: `<div class="table-wrap"><table class="tbl compact">
            <thead><tr><th>Keterangan <span class="t-sub">(Rp ribuan)</span></th><th class="num">Bulan ini</th><th class="num">%</th><th class="num">Bulan lalu</th><th class="num">%</th><th class="num">Selisih</th><th class="num">Perubahan</th></tr></thead>
            <tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>`,
          foot: `<span class="small muted">${icon("info")} Bulan ini = bulan berjalan s.d. hari ini. PPh Badan tarif umum 22% (estimasi, sebelum koreksi fiskal). Angka dalam kurung adalah pengurang.</span><span class="spacer"></span>${btn("Jurnal Umum", "info", { size: "sm", icon: "edit_note", attrs: 'data-go="jurnal"' })}${btn("Neraca Saldo", "purple", { size: "sm", icon: "balance", attrs: 'data-go="neracasaldo"' })}${btn("Neraca", "primary", { size: "sm", icon: "account_balance", attrs: 'data-go="neraca"' })}`,
        })}
      <div class="grid g-3-2">
          ${card({
            title: "Dari pendapatan ke laba bersih", desc: "Grafik air terjun bulan ini, dalam rupiah", icon: "waterfall_chart",
            body: `${legend([["Subtotal", "var(--chart-1)"], ["Pengurang", "var(--chart-2)"], ["Penambah", "var(--chart-3)"]])}
              ${chart("llr-ch-waterfall", (k) => ({
                type: "bar",
                data: { labels: wf.map((w) => w[0]), datasets: [{ label: "Nilai", data: wf.map((w) => [w[1], w[2]]), backgroundColor: wf.map((w) => ({ tot: k.c1, dec: k.c2, inc: k.c3 }[w[3]])), ...BAR }] },
                options: { scales: { y: axRp(k), x: axCat({ ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } }) }, plugins: { tooltip: { callbacks: { label: (c) => { const w = wf[c.dataIndex]; return ` ${w[3] === "dec" ? "−" : w[3] === "inc" ? "+" : ""}${rp(Math.abs(w[2] - w[1]))}`; } } } } },
              }), "lg")}`,
          })}
          ${card({
            title: "Komposisi beban usaha", desc: `Total ${short(cur.beban)} · ${pct(div(cur.beban, cur.bersih) * 100)} dari penjualan`, icon: "pie_chart", tone: "amber",
            body: `<div class="stack">${BEBAN.map(([k, l]) => `<div class="stack" style="gap:6px"><div class="row between"><span class="small strong">${l}</span><span class="small num">${short(cur[k])} · ${pct(div(cur[k], cur.beban) * 100)}</span></div>${progress(cur[k], cur.beban)}</div>`).join("")}</div>`,
          })}
      </div>`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     6. LAPORAN PERSEDIAAN
     ===================================================================== */
  const SKU_AKTIF = { ALL: 3412, PST: 3184, BKS: 2610, DPK: 2395, TGR: 2472, BGR: 1980 };
  const VEN_OVERRIDE = { OB0016: "V", OB0034: "V", OB0033: "N", OB0032: "N" };
  const VEN_LABEL = { V: "Vital", E: "Esensial", N: "Non-esensial" };
  const prioritas = (abc, ven) => (abc === "A" || ven === "V" ? "I" : abc === "C" && ven === "N" ? "III" : "II");
  const PRIO_TONE = { I: "red", II: "amber", III: "gray" };

  function modelStok(st) {
    const cabs = scopeCabs(st);
    const f = share(st.cabang);
    const hpp12 = sum(DB.bulanan, (b) => b.hpp) * f;
    const kat = KAT.map(([nama, w, , dioBase, ven], i) => {
      const nilai = sum(cabs, (c) => STOK[i][c.id]);
      const hppTahun = R(hpp12 * w / 100);
      const to = div(hppTahun, nilai);
      const target = dioBase < 50 ? 45 : dioBase < 75 ? 60 : 90;
      return { nama, i, ven, nilai, hppTahun, to, dio: div(365, to), target };
    });
    const items = DB.obat.map((o, i) => {
      const r = mk(3100 + i);
      const stok = sum(cabs, (c) => o.stok[c.id] || 0);
      const qty90 = QTY[i] ? Math.max(1, R(QTY[i] * 3 * f)) : 0;
      const avg = qty90 / 90;
      const cover = avg ? stok / avg : Infinity;
      const last = qty90 ? (cover < 30 ? 0 : r.i(1, 9)) : r.i(96, 170);
      const ven = VEN_OVERRIDE[o.kode] || (KAT.find((x) => x[0] === o.kategori) || [])[4] || "E";
      return { o, stok, qty90, avg, cover, last, nilai: stok * o.hargaBeli, usage: qty90 * 4 * o.hargaBeli, ven };
    });
    const totU = sum(items, (x) => x.usage);
    let cum = 0;
    [...items].sort((a, b) => b.usage - a.usage).forEach((x) => { const before = div(cum, totU); cum += x.usage; x.abc = before < 0.8 ? "A" : before < 0.95 ? "B" : "C"; x.prio = prioritas(x.abc, x.ven); });
    const moving = items.filter((x) => x.qty90 > 0).sort((a, b) => a.cover - b.cover);
    return {
      cabs, kat, items, nilai: sum(kat, (k) => k.nilai), hppTahun: sum(kat, (k) => k.hppTahun),
      fast: moving.slice(0, 10), slow: moving.slice(-10).reverse(), dead: items.filter((x) => x.qty90 === 0),
    };
  }
  const coverTxt = (x) => (x.cover === Infinity ? dash : `${num(x.cover)} hari`);
  const moveTable = (list, kind) => table({
    columns: [
      { label: "Obat", render: (x) => `<div class="t-main">${esc(x.o.nama)}</div><div class="t-sub">${x.o.kode} · ${esc(x.o.kategori)}</div>` },
      { label: "Golongan", render: (x) => UI.golongan(x.o.golongan) },
      { label: "Stok", cls: "num", render: (x) => `${num(x.stok)} <span class="t-sub">${esc(x.o.satuan)}</span>` },
      { label: "Terjual 90 hari", cls: "num", render: (x) => num(x.qty90) },
      { label: "Rata-rata/hari", cls: "num", render: (x) => dec1(x.avg) },
      { label: "Days cover", cls: "num", render: (x) => coverTxt(x) },
      { label: "Terakhir terjual", render: (x) => (x.last === 0 ? "Hari ini" : `${x.last} hari lalu`) },
      { label: "Nilai stok", cls: "num", render: (x) => num(x.nilai) },
      { label: "Rekomendasi", render: (x) => (kind === "fast"
        ? (x.stok === 0 ? badge("Habis · segera SP", "red", { dot: true }) : x.cover < 14 ? badge("Tambah SP", "amber", { dot: true }) : badge("Stok aman", "green", { dot: true }))
        : kind === "slow" ? (x.cover > 180 ? badge("Mutasi ke cabang lain", "purple", { dot: true }) : badge("Kurangi pesanan", "amber", { dot: true }))
          : badge("Retur PBF / promo bundling", "red", { dot: true })) },
    ],
    rows: list,
    foot: tr([{ v: `${list.length} item`, span: 2 }, num(sum(list, (x) => x.stok)), num(sum(list, (x) => x.qty90)), dec1(sum(list, (x) => x.avg)), "", { v: "" }, num(sum(list, (x) => x.nilai)), { v: "" }]),
  });

  window.PAGES["lap-stok"] = {
    render({ state }) {
      const M = modelStok(state);
      const to = div(M.hppTahun, M.nilai);
      const dio = div(365, to);
      const nearED = DB.batches.filter((b) => b.sisaHari >= 0 && b.sisaHari <= 90 && M.cabs.some((c) => c.id === b.cabang));
      const katSorted = [...M.kat].sort((a, b) => b.nilai - a.nilai);
      const matrix = ["A", "B", "C"].map((a) => ({ a, cells: ["V", "E", "N"].map((v) => { const l = M.items.filter((x) => x.abc === a && x.ven === v); return { v, n: l.length, nilai: sum(l, (x) => x.nilai), p: prioritas(a, v) }; }) }));
      const deadVal = R(M.nilai * 0.036);
      const allCab = CAB.map((c) => ({ ...c, nilai: stokCab(c.id) }));

      return `
      ${header("Laporan Persediaan", `Nilai persediaan (harga pokok) <b>${esc(scopeName(state))}</b> per ${tgl(DB.TODAY)} · analisis pergerakan, perputaran, dan ABC-VEN`)}
      ${fbar(`${select("Kategori", ["Semua kategori", ...DB.kategori])}${select("Golongan", ["Semua golongan", ...Object.values(DB.golonganLabel)])}`)}

      <div class="grid g-3">
        ${stat({ label: "Nilai persediaan", value: short(M.nilai), icon: "warehouse", tone: "primary", delta: 2.4, foot: "vs akhir bulan lalu", hero: true })}
        ${stat({ label: "SKU aktif", value: num(SKU_AKTIF[state.cabang] || SKU_AKTIF.ALL), icon: "medication", tone: "info", foot: `${KAT.length} kategori` })}
        ${stat({ label: "Perputaran persediaan", value: `${dec1(to)}×/tahun`, icon: "autorenew", tone: "success", foot: "HPP 12 bulan ÷ nilai persediaan" })}
        ${stat({ label: "Days inventory (DIO)", value: `${num(dio)} hari`, icon: "hourglass_top", tone: dio > 60 ? "warning" : "teal", foot: "target grup ≤ 60 hari" })}
        ${stat({ label: "Dead stock (≥ 90 hari)", value: short(deadVal), icon: "block", tone: "danger", foot: `${pct(div(deadVal, M.nilai) * 100)} dari persediaan` })}
        ${stat({ label: "Batch ED ≤ 90 hari", value: `${nearED.length} batch`, icon: "event_busy", tone: "pink", foot: `nilai ${short(sum(nearED, (b) => b.qty * b.hargaBeli))} · prioritaskan FEFO` })}
      </div>

      ${tabs("lst", [
        { id: "nilai", label: "Nilai Persediaan", icon: "warehouse" }, { id: "gerak", label: "Fast / Slow / Dead", icon: "speed" },
        { id: "turnover", label: "Turnover & DIO", icon: "autorenew" }, { id: "abcven", label: "Matriks ABC-VEN", icon: "grid_view" },
      ], "nilai")}

      ${panel("lst", "nilai", `
        <div class="grid g-1-2">
          ${card({
            title: "Nilai persediaan per cabang", desc: "Seluruh cabang, harga pokok", icon: "store",
            body: chart("lst-ch-cabang", (k) => ({
              type: "bar",
              data: { labels: allCab.map((c) => cabShort(c.id)), datasets: [{ label: "Nilai persediaan", data: allCab.map((c) => c.nilai), backgroundColor: allCab.map((c) => cabColor(k, c.id)), ...BAR, maxBarThickness: 40 }] },
              options: { scales: { y: axRp(k), x: axCat() }, plugins: { tooltip: tipRp() } },
            }), "lg"),
          })}
          ${card({
            title: "Nilai persediaan per kategori", desc: "Ditumpuk per cabang", icon: "category", tone: "purple",
            body: `${cabLegend(M.cabs)}
              ${chart("lst-ch-kat", (k) => ({
                type: "bar",
                data: { labels: katSorted.map((x) => x.nama), datasets: M.cabs.map((c) => ({ label: cabShort(c.id), data: katSorted.map((x) => STOK[x.i][c.id]), backgroundColor: cabColor(k, c.id), ...HBAR, stack: "s", maxBarThickness: 20 })) },
                options: { indexAxis: "y", interaction: { mode: "index", intersect: false }, scales: { x: axRp(k, { stacked: true }), y: axCat({ stacked: true }) }, plugins: { tooltip: tipRp("x") } },
              }), "lg")}`,
          })}
        </div>
        ${card({
          title: "Nilai persediaan kategori × cabang", desc: "Harga pokok, dalam rupiah", icon: "table_rows", flush: true,
          body: table({
            columns: [
              { label: "Kategori", render: (x) => `<span class="strong">${esc(x.nama)}</span>` },
              ...M.cabs.map((c) => ({ label: esc(cabShort(c.id)), cls: "num", render: (x) => num(STOK[x.i][c.id]) })),
              { label: "Total", cls: "num", render: (x) => `<b>${num(x.nilai)}</b>` },
              { label: "Porsi", cls: "num", render: (x) => pct(div(x.nilai, M.nilai) * 100) },
            ],
            rows: katSorted,
            foot: tr([{ v: "Total" }, ...M.cabs.map((c) => num(sum(STOK, (row) => row[c.id]))), num(M.nilai), "100,0%"]),
          }),
        })}`, true)}

      ${panel("lst", "gerak", `
        ${alert("info", "speed", "Metode klasifikasi", " Fast moving = days cover terendah (stok habis paling cepat), slow moving = days cover tertinggi, dead stock = tidak ada penjualan ≥ 90 hari. Days cover = stok ÷ rata-rata penjualan per hari (90 hari terakhir).")}
        ${card({
          title: "Analisis pergerakan stok", desc: `${esc(scopeName(state))} · item dengan data penjualan 90 hari`, icon: "speed", flush: true,
          tools: tabs("lst-gerak", [{ id: "fast", label: "Fast moving", icon: "bolt", n: M.fast.length }, { id: "slow", label: "Slow moving", icon: "hourglass_bottom", n: M.slow.length }, { id: "dead", label: "Dead stock", icon: "block", n: M.dead.length }], "fast"),
          body: `${panel("lst-gerak", "fast", moveTable(M.fast, "fast"), true)}${panel("lst-gerak", "slow", moveTable(M.slow, "slow"))}${panel("lst-gerak", "dead", moveTable(M.dead, "dead"))}`,
        })}`)}

      ${panel("lst", "turnover", `
        <div class="grid g-2">
          ${card({
            title: "Days inventory per kategori", desc: "Hari persediaan aktual vs target", icon: "hourglass_top", tone: "cyan",
            body: `${legend([["DIO aktual", "var(--chart-1)"], ["Target DIO", TARGET_CSS]])}
              ${chart("lst-ch-dio", (k) => ({
                type: "bar",
                data: { labels: M.kat.map((x) => x.nama), datasets: [
                  { label: "DIO aktual", data: M.kat.map((x) => R(x.dio)), backgroundColor: k.c1, ...HBAR, maxBarThickness: 14 },
                  { label: "Target DIO", data: M.kat.map((x) => x.target), backgroundColor: targetFill(k), ...HBAR, maxBarThickness: 14 },
                ] },
                options: { indexAxis: "y", interaction: { mode: "index", intersect: false }, scales: { x: axNum(k, { ticks: { callback: (v) => v + " hr" } }), y: axCat() }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${num(c.parsed.x)} hari` } } } },
              }), "lg")}`,
          })}
          ${card({
            title: "Rumus & interpretasi", icon: "functions", tone: "purple",
            body: `<div class="stack">
              <dl class="kv">
                <dt>Turnover ratio</dt><dd>HPP 12 bulan ÷ nilai persediaan</dd>
                <dt>Days inventory (DIO)</dt><dd>365 ÷ turnover ratio</dd>
                <dt>Target obat cepat laku</dt><dd>≤ 45 hari</dd>
                <dt>Target vitamin, topikal, ibu & anak</dt><dd>≤ 60 hari</dd>
                <dt>Target alkes, mata & THT</dt><dd>≤ 90 hari</dd>
              </dl>
              ${alert("warn", "warning", "Perhatian", ` ${M.kat.filter((x) => x.dio > x.target * 1.2).length} kategori melebihi target DIO lebih dari 20%. Tinjau ulang parameter stok minimum/maksimum dan frekuensi SP.`)}
            </div>`,
          })}
        </div>
        ${card({
          title: "Perputaran persediaan per kategori", desc: "Nilai dalam rupiah", icon: "table_rows", flush: true,
          body: table({
            columns: [
              { label: "Kategori", render: (x) => `<span class="strong">${esc(x.nama)}</span>` },
              { label: "HPP 12 bulan", cls: "num", render: (x) => num(x.hppTahun) },
              { label: "Nilai persediaan", cls: "num", render: (x) => num(x.nilai) },
              { label: "Turnover", cls: "num", render: (x) => `${dec1(x.to)}×` },
              { label: "DIO", cls: "num", render: (x) => `<b>${num(x.dio)} hari</b>` },
              { label: "Target", cls: "num", render: (x) => `${x.target} hari` },
              { label: "Status", render: (x) => (x.dio <= x.target ? badge("Sehat", "green", { dot: true }) : x.dio <= x.target * 1.2 ? badge("Waspada", "amber", { dot: true }) : badge("Berlebih", "red", { dot: true })) },
            ],
            rows: M.kat,
            foot: tr([{ v: "Total" }, num(M.hppTahun), num(M.nilai), `${dec1(to)}×`, `${num(dio)} hari`, { v: "" }, { v: "" }]),
          }),
        })}`)}

      ${panel("lst", "abcven", `
        <div class="grid g-1-2">
          ${card({
            title: "Kriteria", icon: "rule", tone: "purple",
            body: `<div class="stack">
              <dl class="kv">
                <dt>${abcBadge("A")}</dt><dd>80% nilai pemakaian</dd>
                <dt>${abcBadge("B")}</dt><dd>15% berikutnya</dd>
                <dt>${abcBadge("C")}</dt><dd>5% sisa</dd>
                <dt>Vital (V)</dt><dd>penyelamat jiwa / penyakit kronis</dd>
                <dt>Esensial (E)</dt><dd>efektif untuk penyakit umum</dd>
                <dt>Non-esensial (N)</dt><dd>suplemen, alkes penunjang</dd>
              </dl>
              <div class="divider"></div>
              <div class="stack" style="gap:8px">
                <div class="row between">${badge("Prioritas I", "red")}<span class="small muted">AV, AE, AN, BV, CV — kontrol ketat, tidak boleh kosong</span></div>
                <div class="row between">${badge("Prioritas II", "amber")}<span class="small muted">BE, BN, CE — kontrol sedang</span></div>
                <div class="row between">${badge("Prioritas III", "gray")}<span class="small muted">CN — kontrol longgar, kandidat dihapus</span></div>
              </div>
            </div>`,
          })}
          ${card({
            title: "Matriks ABC × VEN", desc: "Jumlah item dan nilai stok per sel", icon: "grid_view", flush: true,
            body: `<div class="table-wrap"><table class="tbl">
              <thead><tr><th>Kelas ABC</th>${["V", "E", "N"].map((v) => `<th>${VEN_LABEL[v]} (${v})</th>`).join("")}<th class="num">Total</th></tr></thead>
              <tbody>${matrix.map((r) => `<tr><td>${abcBadge(r.a)}</td>${r.cells.map((c) => `<td><div class="row between" style="gap:8px"><div><div class="t-main num">${c.n} item</div><div class="t-sub num">${short(c.nilai)}</div></div>${badge(r.a + c.v + " · " + c.p, PRIO_TONE[c.p])}</div></td>`).join("")}<td class="num"><b>${sum(r.cells, (c) => c.n)}</b><div class="t-sub">${short(sum(r.cells, (c) => c.nilai))}</div></td></tr>`).join("")}</tbody>
              <tfoot><tr><td>Total</td>${["V", "E", "N"].map((v, j) => `<td class="num">${sum(matrix, (r) => r.cells[j].n)} item · ${short(sum(matrix, (r) => r.cells[j].nilai))}</td>`).join("")}<td class="num">${M.items.length} item</td></tr></tfoot>
            </table></div>`,
          })}
        </div>
        ${card({
          title: "Klasifikasi per item", desc: "Diurutkan menurut prioritas lalu nilai pemakaian tahunan", icon: "table_rows", flush: true,
          body: table({
            cls: "compact",
            columns: [
              { label: "Obat", render: (x) => `<div class="t-main">${esc(x.o.nama)}</div><div class="t-sub">${x.o.kode} · ${esc(x.o.kategori)}</div>` },
              { label: "Golongan", render: (x) => UI.golongan(x.o.golongan) },
              { label: "Pemakaian/tahun", cls: "num", render: (x) => num(x.usage) },
              { label: "Nilai stok", cls: "num", render: (x) => num(x.nilai) },
              { label: "ABC", render: (x) => abcBadge(x.abc) },
              { label: "VEN", render: (x) => badge(VEN_LABEL[x.ven], { V: "red", E: "blue", N: "gray" }[x.ven]) },
              { label: "Prioritas", render: (x) => badge(`Prioritas ${x.prio}`, PRIO_TONE[x.prio], { dot: true }) },
            ],
            rows: [...M.items].sort((a, b) => a.prio.length - b.prio.length || b.usage - a.usage),
            foot: tr([{ v: `${M.items.length} item`, span: 2 }, num(sum(M.items, (x) => x.usage)), num(sum(M.items, (x) => x.nilai)), { v: "", span: 3 }]),
          }),
        })}`)}`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     7. LAPORAN PEMBELIAN
     ===================================================================== */
  const BELI = CAB.map((c, i) => { const r = mk(4000 + i); return DB.bulanan.map((b) => R(b.hpp * share(c.id) * r.f(0.95, 1.07))); });
  // [pbf index, diskon %, fill rate %, lead time hari]
  const SUP_KPI = [[3.5, 96.8, 1.2], [4.2, 94.2, 1.8], [3.8, 97.5, 1.4], [2.5, 91.3, 2.6], [3.0, 93.6, 3.1]];
  const JENIS_SP = [
    ["Reguler", 93.1, 0.12, "SP biasa, ditandatangani apoteker atau TTK yang diberi wewenang"],
    ["Narkotika", 0.9, 12, "SP khusus narkotika, 1 SP untuk 1 jenis obat, TTD Apoteker PJ + SIPA, ke PBF pemegang izin khusus"],
    ["Psikotropika", 1.6, 6, "SP khusus psikotropika, boleh lebih dari 1 jenis, TTD Apoteker PJ + SIPA"],
    ["Prekursor", 2.4, 5, "SP khusus prekursor farmasi, TTD Apoteker PJ, mencantumkan nomor SIPA & SIA"],
    ["OOT", 2.0, 5, "SP khusus obat-obat tertentu (OOT), TTD Apoteker PJ, jumlah wajar sesuai kebutuhan"],
  ];

  function modelBeli(st) {
    const cabs = scopeCabs(st);
    const bulan = DB.bulanan.map((b, m) => sum(cabs, (c) => BELI[cabIdx(c.id)][m]));
    const cur = bulan[LAST];
    const sup = DB.supplier.map((s, i) => {
      const [disc, fill, lead] = SUP_KPI[i];
      const total = R(cur * SUPPLIER_W[i] / 100);
      const dpp = R(total / 1.11);
      const ppn = total - dpp;
      const diskon = R(dpp * disc / (100 - disc));
      const sp = Math.max(1, R(total / 18.5e6));
      return { ...s, total, dpp, ppn, diskon, bruto: dpp + diskon, disc, fill, lead, sp, faktur: R(sp * 1.12), retur: R(total * [0.004, 0.006, 0.003, 0.009, 0.007][i]), hutangS: R(s.hutang * share(st.cabang)) };
    });
    const jenis = JENIS_SP.map(([nama, w, avgJt, ket]) => { const nilai = R(cur * w / 100); return { nama, nilai, ket, sp: Math.max(1, R(nilai / (avgJt * 1e6 * (nama === "Reguler" ? 150 : 1)))) }; });
    return { cabs, bulan, cur, sup, jenis };
  }
  const SP_STATUS = ["Selesai", "Selesai", "Diterima Sebagian", "Dikirim", "Selesai", "Menunggu TTD Apoteker", "Selesai", "Draft"];
  const spList = (st) => {
    const r = mk(4400);
    const gen = Array.from({ length: 14 }, (_, i) => {
      const c = CAB[i % CAB.length];
      const j = r() < 0.8 ? "Reguler" : ["Psikotropika", "Prekursor", "OOT", "Narkotika"][r.i(0, 3)];
      const s = DB.supplier[j === "Narkotika" ? 0 : r.i(0, 4)];
      const d = -r.i(2, 27);
      return { no: `SP/${c.id}/${YYMM}/${String(40 - i).padStart(3, "0")}`, tgl: DB.iso(DB.addDays(d)), cabang: c.id, supplier: s.nama, jenis: j, item: j === "Reguler" ? r.i(8, 32) : r.i(1, 3), total: j === "Reguler" ? r.i(9, 48) * 1e6 + r.i(0, 99) * 1e4 : r.i(9, 45) * 1e5, status: SP_STATUS[r.i(0, SP_STATUS.length - 1)] };
    });
    return [...DB.po.map((p) => ({ ...p, cabang: "PST" })), ...gen].filter((p) => st.cabang === "ALL" || p.cabang === st.cabang).sort((a, b) => b.tgl.localeCompare(a.tgl));
  };
  const jenisTone = { Reguler: "gray", Narkotika: "red", Psikotropika: "purple", Prekursor: "amber", OOT: "cyan" };

  window.PAGES["lap-pembelian"] = {
    render({ state }) {
      const M = modelBeli(state);
      const S = spList(state);
      const T = { total: sum(M.sup, (s) => s.total), dpp: sum(M.sup, (s) => s.dpp), ppn: sum(M.sup, (s) => s.ppn), diskon: sum(M.sup, (s) => s.diskon), bruto: sum(M.sup, (s) => s.bruto), sp: sum(M.sup, (s) => s.sp), faktur: sum(M.sup, (s) => s.faktur), retur: sum(M.sup, (s) => s.retur), hutang: sum(M.sup, (s) => s.hutangS) };
      const wAvg = (k) => div(sum(M.sup, (s) => s[k] * s.total), T.total);
      const supSorted = [...M.sup].sort((a, b) => b.total - a.total);
      const khusus = M.jenis.filter((j) => j.nama !== "Reguler");

      return `
      ${header("Laporan Pembelian", `Pembelian dari PBF <b>${esc(scopeName(state))}</b> · ${NAMA_BULAN[M0]} ${Y} · nilai termasuk PPN`)}
      ${fbar(`${select("Supplier / PBF", ["Semua PBF", ...DB.supplier.map((s) => s.nama)])}${select("Jenis SP", ["Semua jenis", ...JENIS_SP.map((j) => j[0])])}`)}

      <div class="grid g-3">
        ${stat({ label: "Total pembelian", value: short(T.total), icon: "shopping_bag", tone: "primary", ...heroDelta(chg(M.cur, M.bulan[LAST - 1])), hero: true })}
        ${stat({ label: "Surat pesanan (SP)", value: num(T.sp), icon: "shopping_cart_checkout", tone: "info", foot: `${num(T.faktur)} faktur diterima` })}
        ${stat({ label: "Diskon dari PBF", value: short(T.diskon), icon: "sell", tone: "pink", foot: `rata-rata ${pct(div(T.diskon, T.bruto) * 100)} dari harga bruto` })}
        ${stat({ label: "Fill rate", value: pct(wAvg("fill")), icon: "inventory", tone: "success", foot: "item diterima ÷ item dipesan" })}
        ${stat({ label: "Rata-rata lead time", value: `${dec1(wAvg("lead"))} hari`, icon: "local_shipping", tone: "teal", foot: "SP dikirim → barang diterima" })}
        ${stat({ label: "Hutang PBF berjalan", value: short(T.hutang), icon: "request_quote", tone: "warning", foot: `${DB.supplier.length} PBF · lihat modul Hutang` })}
      </div>

      ${tabs("lpb", [
        { id: "supplier", label: "Per Supplier", icon: "factory" }, { id: "bulan", label: "Per Bulan", icon: "calendar_month" },
        { id: "jenis", label: "Per Jenis SP", icon: "description" }, { id: "sp", label: "Daftar SP", icon: "list", n: S.length },
      ], "supplier")}

      ${panel("lpb", "supplier", `
        ${card({
          title: "Pembelian per PBF", desc: "Bulan ini, termasuk PPN", icon: "factory",
          body: chart("lpb-ch-sup", (k) => ({
            type: "bar",
            data: { labels: supSorted.map((s) => s.nama.replace(/^PT\s+/, "")), datasets: [{ label: "Pembelian", data: supSorted.map((s) => s.total), backgroundColor: k.c1, ...HBAR, maxBarThickness: 24 }] },
            options: { indexAxis: "y", scales: { x: axRp(k), y: axCat() }, plugins: { tooltip: tipRp("x") } },
          })),
        })}
        ${card({
          title: "Rincian per PBF", desc: "Nilai dalam rupiah · PPN 12% × DPP nilai lain 11/12 (efektif 11%)", icon: "table_rows", flush: true,
          body: table({
            columns: [
              { label: "PBF", render: (s) => `<div class="t-main nowrap">${esc(s.nama.replace(/^PT\s+/, ""))}</div><div class="t-sub nowrap">${esc(s.izin)} · ${esc(s.kota)}</div>` },
              { label: "SP", cls: "num", render: (s) => num(s.sp) },
              { label: "Faktur", cls: "num", render: (s) => num(s.faktur) },
              { label: "Bruto", cls: "num", render: (s) => num(s.bruto) },
              { label: "Diskon", cls: "num", render: (s) => `${num(s.diskon)}<div class="t-sub">${pct(s.disc)}</div>` },
              { label: "DPP", cls: "num", render: (s) => num(s.dpp) },
              { label: "PPN", cls: "num", render: (s) => num(s.ppn) },
              { label: "Total", cls: "num", render: (s) => `<b>${num(s.total)}</b>` },
              { label: "Retur", cls: "num", render: (s) => num(s.retur) },
              { label: "Fill rate", cls: "num", render: (s) => (s.fill >= 95 ? badge(pct(s.fill), "green") : badge(pct(s.fill), "amber")) },
              { label: "Lead time", cls: "num nowrap", render: (s) => `${dec1(s.lead)} hari` },
              { label: "TOP", cls: "num nowrap", render: (s) => `${s.top} hari` },
              { label: "Hutang", cls: "num", render: (s) => num(s.hutangS) },
            ],
            rows: M.sup,
            foot: tr([{ v: "Total" }, num(T.sp), num(T.faktur), num(T.bruto), num(T.diskon), num(T.dpp), num(T.ppn), num(T.total), num(T.retur), pct(wAvg("fill")), `${dec1(wAvg("lead"))} hari`, "", num(T.hutang)]),
          }),
        })}`, true)}

      ${panel("lpb", "bulan", `
        ${card({
          title: "Pembelian bulanan per cabang", desc: "12 bulan terakhir, termasuk PPN", icon: "stacked_bar_chart",
          tools: viewTabs("lpb-view"),
          body: `${panel("lpb-view", "grafik", `${cabLegend(M.cabs)}
            ${chart("lpb-ch-bulan", (k) => ({
              type: "bar",
              data: { labels: BULAN, datasets: M.cabs.map((c) => ({ label: cabShort(c.id), data: BELI[cabIdx(c.id)], backgroundColor: cabColor(k, c.id), ...BAR, stack: "s" })) },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: axRp(k, { stacked: true }), x: axCat({ stacked: true }) }, plugins: { tooltip: tipRp() } },
            }), "lg")}`, true)}
            ${panel("lpb-view", "tabel", table({
              cls: "compact",
              columns: [
                { label: "Bulan", render: (r) => `<b>${r.b}</b>` },
                ...M.cabs.map((c) => ({ label: esc(cabShort(c.id)), cls: "num", render: (r) => num(BELI[cabIdx(c.id)][r.m]) })),
                { label: "Total", cls: "num", render: (r) => `<b>${num(M.bulan[r.m])}</b>` },
                { label: "Perubahan", cls: "num", render: (r) => (r.m ? deltaBadge(chg(M.bulan[r.m], M.bulan[r.m - 1]), false) : dash) },
              ],
              rows: BULAN.map((b, m) => ({ b, m })).reverse(),
              foot: tr([{ v: "Total 12 bulan" }, ...M.cabs.map((c) => num(sum(BELI[cabIdx(c.id)]))), num(sum(M.bulan)), { v: "" }]),
            }))}`,
        })}`)}

      ${panel("lpb", "jenis", `
        <div class="grid g-1-2">
          ${card({
            title: "Nilai SP khusus", desc: "Di luar SP reguler, dalam rupiah", icon: "shield", tone: "purple",
            body: chart("lpb-ch-jenis", (k) => ({
              type: "bar",
              data: { labels: khusus.map((j) => j.nama), datasets: [{ label: "Nilai SP", data: khusus.map((j) => j.nilai), backgroundColor: k.c1, ...BAR, maxBarThickness: 40 }] },
              options: { scales: { y: axRp(k), x: axCat() }, plugins: { tooltip: tipRp() } },
            })),
          })}
          ${card({
            title: "Pembelian per jenis SP", desc: "Sesuai ketentuan pengadaan obat golongan khusus", icon: "description", flush: true,
            body: table({
              columns: [
                { label: "Jenis SP", render: (j) => badge(j.nama, jenisTone[j.nama], { dot: true }) },
                { label: "Jumlah SP", cls: "num", render: (j) => num(j.sp) },
                { label: "Nilai", cls: "num", render: (j) => `<b>${num(j.nilai)}</b>` },
                { label: "Porsi", cls: "num", render: (j) => pct(div(j.nilai, M.cur) * 100) },
                { label: "Ketentuan", render: (j) => `<span class="small">${esc(j.ket)}</span>` },
              ],
              rows: M.jenis,
              foot: tr([{ v: "Total" }, num(sum(M.jenis, (j) => j.sp)), num(sum(M.jenis, (j) => j.nilai)), "100,0%", { v: "" }]),
            }),
          })}
        </div>`)}

      ${panel("lpb", "sp", card({
        title: "Daftar surat pesanan", desc: `${esc(scopeName(state))} · bulan ini`, icon: "list", flush: true,
        body: table({
          columns: [
            { label: "No. SP", render: (p) => `<span class="mono strong nowrap">${p.no}</span><div class="t-sub">${tgl(p.tgl)}</div>` },
            { label: "Cabang", render: (p) => esc(cabShort(p.cabang)) },
            { label: "Supplier", render: (p) => esc(p.supplier) },
            { label: "Jenis", render: (p) => badge(p.jenis, jenisTone[p.jenis]) },
            { label: "Item", cls: "num", render: (p) => num(p.item) },
            { label: "Total", cls: "num", render: (p) => `<b>${num(p.total)}</b>` },
            { label: "Status", render: (p) => status(p.status) },
            { label: "", cls: "actions", render: (p) => `<div style="min-width:72px">${UI.rowActions(["view", "print"], p.no)}</div>` },
          ],
          rows: S,
          foot: tr([{ v: `${S.length} SP`, span: 4 }, num(sum(S, (p) => p.item)), num(sum(S, (p) => p.total)), { v: "", span: 2 }]),
        }),
      }))}`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     8. LAPORAN KEDALUWARSA
     ===================================================================== */
  const edHistory = () => {
    const r = mk(5100);
    const pool = DB.obat.filter((o) => !["Alat Kesehatan"].includes(o.kategori));
    return Array.from({ length: 16 }, (_, i) => {
      const o = pool[r.i(0, pool.length - 1)];
      const c = CAB[r.i(0, CAB.length - 1)];
      const d = -r.i(6, 320);
      const retur = r() < 0.62 && !["narkotika", "psikotropika"].includes(o.golongan);
      const st = retur ? ["Disetujui", "Disetujui", "Ditolak", "Diproses"][r.i(0, 3)] : "Selesai";
      const qty = r.i(3, 40);
      const nilai = qty * o.hargaBeli;
      const dt = DB.addDays(d);
      const yymm = String(dt.getFullYear()).slice(2) + String(dt.getMonth() + 1).padStart(2, "0");
      return {
        tgl: DB.iso(dt), no: retur ? `RTB/${c.id}/${yymm}/${String(r.i(1, 40)).padStart(3, "0")}` : `BA-PMS/${c.id}/${yymm}/${String(r.i(1, 9)).padStart(3, "0")}`,
        o, cabang: c.id, batch: `${o.pabrik.slice(0, 2).toUpperCase()}${r.i(2100, 2399)}${String.fromCharCode(65 + r.i(0, 2))}`, ed: DB.iso(DB.addDays(d - r.i(5, 40))),
        qty, nilai, tindakan: retur ? "Retur PBF" : "Pemusnahan", status: st, kembali: st === "Disetujui" ? nilai : 0,
        pbf: retur ? DB.supplier[r.i(0, 4)].nama : "—",
      };
    });
  };
  const PBF_REC = [68, 54, 72, 41, 58]; // tingkat persetujuan retur ED per PBF (%)
  const PBF_PROSES = [14, 21, 12, 35, 18];

  window.PAGES["lap-kadaluarsa"] = {
    render({ state }) {
      const cabs = scopeCabs(state);
      const edRows = cabs.map((c) => { const i = cabIdx(c.id); const a = {}; ["batch", "nilai", "diajukan", "disetujui", "ditolak", "musnah", "rugi"].forEach((k) => { a[k] = sum(ED[i], (m) => m[k]); }); return { c, i, ...a, omzet12: sum(CAB_BULAN[i]) }; });
      const T = {};
      ["batch", "nilai", "diajukan", "disetujui", "ditolak", "musnah", "rugi", "omzet12"].forEach((k) => { T[k] = sum(edRows, (r) => r[k]); });
      const recBulan = DB.bulanan.map((b, m) => div(sum(cabs, (c) => ED[cabIdx(c.id)][m].disetujui), sum(cabs, (c) => ED[cabIdx(c.id)][m].nilai)) * 100);
      const inScope = (id) => cabs.some((c) => c.id === id);
      const expired = DB.batches.filter((b) => b.sisaHari < 0 && inScope(b.cabang));
      const near = DB.batches.filter((b) => b.sisaHari >= 0 && b.sisaHari <= 90 && inScope(b.cabang));
      const cur = expired.map((b) => ({ tgl: DB.iso(DB.TODAY), no: "—", o: DB.obat.find((o) => o.kode === b.kode), cabang: b.cabang, batch: b.batch, ed: b.ed, qty: b.qty, nilai: b.qty * b.hargaBeli, tindakan: "Karantina", status: "Kedaluwarsa", kembali: 0, pbf: b.supplier }));
      const list = [...cur, ...edHistory().filter((h) => inScope(h.cabang)).sort((a, b) => b.tgl.localeCompare(a.tgl))];
      const pbfRaw = DB.supplier.map((s, i) => ({ s, diajukan: R(T.diajukan * SUPPLIER_W[i] / 100), rate: PBF_REC[i] }));
      const recScale = div(T.disetujui, sum(pbfRaw, (p) => p.diajukan * p.rate / 100));
      const pbf = pbfRaw.map((p, i) => { const disetujui = R(p.diajukan * p.rate / 100 * recScale); return { ...p, disetujui, ditolak: p.diajukan - disetujui, rec: div(disetujui, p.diajukan) * 100, proses: PBF_PROSES[i] }; });

      return `
      ${header("Laporan Kedaluwarsa", `Kerugian akibat obat kedaluwarsa (ED) <b>${esc(scopeName(state))}</b> · 12 bulan terakhir · nilai harga pokok`, btn("Buat BA Pemusnahan", "danger", { icon: "delete_forever", attrs: 'data-go="kadaluarsa"' }))}
      ${fbar(`${select("Tindakan", ["Semua tindakan", "Retur PBF", "Pemusnahan", "Karantina"])}${select("PBF", ["Semua PBF", ...DB.supplier.map((s) => s.nama)])}`)}

      <div class="grid g-4">
        ${stat({ label: "Nilai obat ED (12 bulan)", value: short(T.nilai), icon: "event_busy", tone: "danger", foot: `${num(T.batch)} batch`, hero: true })}
        ${stat({ label: "Kerugian bersih", value: short(T.rugi), icon: "money_off", tone: "warning", foot: `${pct(div(T.rugi, T.omzet12) * 100, 2)} dari omzet` })}
        ${stat({ label: "Recovery rate", value: pct(div(T.disetujui, T.nilai) * 100), icon: "assignment_return", tone: "success", foot: `${short(T.disetujui)} dikembalikan PBF` })}
        ${stat({ label: "ED saat ini / ≤ 90 hari", value: `${expired.length} / ${near.length} batch`, icon: "hourglass_bottom", tone: "pink", foot: `berisiko ${short(sum(near, (b) => b.qty * b.hargaBeli))}` })}
      </div>

      <div class="grid g-3-2">
        ${card({
          title: "Kerugian bersih ED per bulan", desc: "Ditumpuk per cabang, setelah retur PBF disetujui", icon: "stacked_bar_chart", tone: "red",
          body: `${cabLegend(cabs)}
            ${chart("led-ch-bulan", (k) => ({
              type: "bar",
              data: { labels: BULAN, datasets: cabs.map((c) => ({ label: cabShort(c.id), data: ED[cabIdx(c.id)].map((m) => m.rugi), backgroundColor: cabColor(k, c.id), ...BAR, stack: "s" })) },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: axRp(k, { stacked: true }), x: axCat({ stacked: true }) }, plugins: { tooltip: tipRp() } },
            }))}`,
        })}
        ${card({
          title: "Recovery rate bulanan", desc: "Nilai retur disetujui PBF ÷ nilai ED, dalam persen", icon: "percent", tone: "green",
          body: chart("led-ch-rec", (k) => ({
            type: "line",
            data: { labels: BULAN, datasets: [{ label: "Recovery rate", data: recBulan.map((v) => +v.toFixed(1)), borderColor: k.c1, backgroundColor: "transparent", tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 }] },
            options: { interaction: { mode: "index", intersect: false }, scales: { y: { min: 0, max: 100, grid: { color: k.grid }, ticks: { callback: (v) => v + "%" } }, x: axCat() }, plugins: { tooltip: { callbacks: { label: (c) => ` Recovery: ${pct(c.raw)}` } } } },
          })),
        })}
      </div>

      ${card({
        title: "Rekap ED per cabang", desc: "12 bulan terakhir · nilai dalam rupiah", icon: "store", flush: true,
        body: table({
          columns: [
            { label: "Cabang", render: (r) => `<span class="strong nowrap">${swatch(r.i)}${esc(cabShort(r.c.id))}</span>` },
            { label: "Batch", cls: "num", render: (r) => num(r.batch) },
            { label: "Nilai ED", cls: "num", render: (r) => num(r.nilai) },
            { label: "Retur diajukan", cls: "num", render: (r) => num(r.diajukan) },
            { label: "Retur disetujui", cls: "num", render: (r) => num(r.disetujui) },
            { label: "Retur ditolak", cls: "num", render: (r) => num(r.ditolak) },
            { label: "Dimusnahkan", cls: "num", render: (r) => num(r.musnah) },
            { label: "Kerugian bersih", cls: "num", render: (r) => `<b>${num(r.rugi)}</b>` },
            { label: "Recovery", cls: "num", render: (r) => pct(div(r.disetujui, r.nilai) * 100) },
            { label: "% omzet", cls: "num", render: (r) => pct(div(r.rugi, r.omzet12) * 100, 2) },
          ],
          rows: edRows,
          foot: tr([{ v: "Total" }, num(T.batch), num(T.nilai), num(T.diajukan), num(T.disetujui), num(T.ditolak), num(T.musnah), num(T.rugi), pct(div(T.disetujui, T.nilai) * 100), pct(div(T.rugi, T.omzet12) * 100, 2)]),
        }),
      })}

      ${tabs("led", [{ id: "item", label: "Daftar item ED", icon: "list", n: list.length }, { id: "pbf", label: "Recovery per PBF", icon: "factory" }], "item")}

      ${panel("led", "item", `
        ${alert("warn", "gavel", "Ketentuan pemusnahan", " Pemusnahan narkotika & psikotropika wajib disaksikan petugas Dinas Kesehatan / Balai POM dan dibuatkan Berita Acara Pemusnahan. Obat lain disaksikan Apoteker PJ dan minimal 1 petugas apotek.")}
        ${card({
          title: "Item kedaluwarsa, diretur & dimusnahkan", desc: "Termasuk batch yang sedang dikarantina · nilai dalam rupiah", icon: "delete_sweep", flush: true,
          body: table({
            columns: [
              { label: "Tanggal", render: (x) => `<span class="nowrap">${tgl(x.tgl)}</span>` },
              { label: "No. dokumen", render: (x) => `<span class="mono nowrap">${x.no}</span>` },
              { label: "Obat", render: (x) => `<div class="t-main nowrap">${esc(x.o.nama)}</div><div class="t-sub">${UI.golongan(x.o.golongan)}</div>` },
              { label: "Batch / ED", render: (x) => `<span class="mono">${x.batch}</span><div class="t-sub nowrap">ED ${tgl(x.ed)}</div>` },
              { label: "Cabang", render: (x) => esc(cabShort(x.cabang)) },
              { label: "Qty", cls: "num", render: (x) => `${num(x.qty)} <span class="t-sub">${esc(x.o.satuan)}</span>` },
              { label: "Nilai", cls: "num", render: (x) => num(x.nilai) },
              { label: "Tindakan", render: (x) => badge(x.tindakan, { "Retur PBF": "blue", Pemusnahan: "red", Karantina: "amber" }[x.tindakan]) },
              { label: "PBF", render: (x) => `<span class="small">${esc(x.pbf.replace(/^PT\s+/, ""))}</span>` },
              { label: "Status", render: (x) => status(x.status) },
              { label: "Nilai kembali", cls: "num", render: (x) => (x.kembali ? num(x.kembali) : dash) },
              { label: "", cls: "actions", render: (x) => `<div style="min-width:72px">${UI.rowActions(["view", "print"], x.no === "—" ? x.batch : x.no)}</div>` },
            ],
            rows: list,
            foot: tr([{ v: `${list.length} item`, span: 5 }, num(sum(list, (x) => x.qty)), num(sum(list, (x) => x.nilai)), { v: "", span: 3 }, num(sum(list, (x) => x.kembali)), { v: "" }]),
          }),
        })}`, true)}

      ${panel("led", "pbf", `
        <div class="grid g-1-2">
          ${card({
            title: "Recovery rate per PBF", desc: "Persentase nilai retur ED yang disetujui", icon: "factory",
            body: chart("led-ch-pbf", (k) => ({
              type: "bar",
              data: { labels: pbf.map((p) => p.s.nama.replace(/^PT\s+/, "")), datasets: [{ label: "Recovery", data: pbf.map((p) => +p.rec.toFixed(1)), backgroundColor: k.c1, ...HBAR, maxBarThickness: 22 }] },
              options: { indexAxis: "y", scales: { x: { min: 0, max: 100, grid: { color: k.grid }, ticks: { callback: (v) => v + "%" } }, y: axCat() }, plugins: { tooltip: { callbacks: { label: (c) => ` Recovery: ${pct(c.raw)} · ${rp(pbf[c.dataIndex].disetujui)}` } } } },
            })),
          })}
          ${card({
            title: "Retur ED ke PBF", desc: "12 bulan terakhir · nilai dalam rupiah", icon: "assignment_return", flush: true,
            body: table({
              columns: [
                { label: "PBF", render: (p) => `<div class="t-main">${esc(p.s.nama)}</div><div class="t-sub">${esc(p.s.cp)} · ${esc(p.s.hp)}</div>` },
                { label: "Diajukan", cls: "num", render: (p) => num(p.diajukan) },
                { label: "Disetujui", cls: "num", render: (p) => num(p.disetujui) },
                { label: "Ditolak", cls: "num", render: (p) => num(p.ditolak) },
                { label: "Recovery", cls: "num", render: (p) => badge(pct(p.rec), p.rec >= 60 ? "green" : p.rec >= 50 ? "amber" : "red") },
                { label: "Lama proses", cls: "num", render: (p) => `${p.proses} hari` },
              ],
              rows: pbf,
              foot: tr([{ v: "Total" }, num(sum(pbf, (p) => p.diajukan)), num(sum(pbf, (p) => p.disetujui)), num(sum(pbf, (p) => p.ditolak)), pct(div(sum(pbf, (p) => p.disetujui), sum(pbf, (p) => p.diajukan)) * 100), { v: "" }]),
            }),
          })}
        </div>`)}`;
    },
    mount(root) { bindCommon(root); },
  };

  /* =====================================================================
     9. NARKOTIKA & PSIKOTROPIKA (SIPNAP) + PREKURSOR & OOT
     ===================================================================== */
  const napzaDb = DB.obat.filter((o) => ["narkotika", "psikotropika"].includes(o.golongan)).map((o) => ({ kode: o.kode, nama: o.nama, generik: o.generik, golongan: o.golongan, sub: o.golongan === "narkotika" ? "Gol. III" : "Gol. IV", satuan: "Tablet", hargaBeli: Math.round(o.hargaBeli / o.isi) }));
  const NAPZA = [
    ...napzaDb,
    { kode: "NK0101", nama: "Codipront Kapsul", generik: "Kodein + Feniltoloksamin", golongan: "narkotika", sub: "Gol. III", satuan: "Kapsul", hargaBeli: 5200 },
    { kode: "NK0102", nama: "MST Continus 10 mg", generik: "Morfin sulfat", golongan: "narkotika", sub: "Gol. II", satuan: "Tablet", hargaBeli: 14800 },
    { kode: "NK0103", nama: "Petidin HCl 50 mg/ml", generik: "Petidin", golongan: "narkotika", sub: "Gol. II", satuan: "Ampul", hargaBeli: 21500 },
    { kode: "PS0201", nama: "Clobazam 10 mg", generik: "Klobazam", golongan: "psikotropika", sub: "Gol. IV", satuan: "Tablet", hargaBeli: 3900 },
    { kode: "PS0202", nama: "Lorazepam 1 mg", generik: "Lorazepam", golongan: "psikotropika", sub: "Gol. IV", satuan: "Tablet", hargaBeli: 2700 },
    { kode: "PS0203", nama: "Fenobarbital 30 mg", generik: "Fenobarbital", golongan: "psikotropika", sub: "Gol. IV", satuan: "Tablet", hargaBeli: 450 },
    { kode: "PS0204", nama: "Estazolam 1 mg", generik: "Estazolam", golongan: "psikotropika", sub: "Gol. IV", satuan: "Tablet", hargaBeli: 2100 },
    { kode: "PS0205", nama: "Klonazepam 2 mg", generik: "Klonazepam", golongan: "psikotropika", sub: "Gol. IV", satuan: "Tablet", hargaBeli: 2900 },
  ];
  const prekDb = DB.obat.filter((o) => ["prekursor", "oot"].includes(o.golongan)).map((o) => ({ kode: o.kode, nama: o.nama, generik: o.generik, golongan: o.golongan, satuan: "Tablet", batas: o.golongan === "prekursor" ? 20 : 10 }));
  const PREK = [
    ...prekDb,
    { kode: "PK0301", nama: "Tremenza Tablet", generik: "Pseudoefedrin HCl + Triprolidin HCl", golongan: "prekursor", satuan: "Tablet", batas: 20 },
    { kode: "PK0302", nama: "Efedrin HCl 25 mg", generik: "Efedrin HCl", golongan: "prekursor", satuan: "Tablet", batas: 20 },
    { kode: "OT0401", nama: "Tramadol HCl 50 mg", generik: "Tramadol HCl", golongan: "oot", satuan: "Kapsul", batas: 10 },
    { kode: "OT0402", nama: "Triheksifenidil 2 mg", generik: "Triheksifenidil HCl", golongan: "oot", satuan: "Tablet", batas: 10 },
    { kode: "OT0403", nama: "Haloperidol 5 mg", generik: "Haloperidol", golongan: "oot", satuan: "Tablet", batas: 10 },
    { kode: "OT0404", nama: "Amitriptilin 25 mg", generik: "Amitriptilin HCl", golongan: "oot", satuan: "Tablet", batas: 10 },
    { kode: "OT0405", nama: "Klorpromazin 100 mg", generik: "Klorpromazin HCl", golongan: "oot", satuan: "Tablet", batas: 10 },
  ];
  const PASIEN = ["Sutrisno", "Hj. Mariam", "Yohanes K.", "Ratna Dewi", "Bambang W.", "Fitriani", "Hendra Wijaya", "Ahmad Fauzi", "Lestari P.", "Joko Susanto", "Sri Wahyuni", "Andreas T."];

  const napzaMove = (item, idx, cabId) => {
    const r = mk(7000 + idx * 13 + cabIdx(cabId) * 101);
    const narko = item.golongan === "narkotika";
    const inj = item.satuan === "Ampul";
    const awal = inj ? r.i(4, 20) : r.i(40, 220);
    const masuk = Array.from({ length: r.i(0, 2) }, () => ({
      tgl: tglBulanIni(r.i(2, 24)), pbf: narko ? DB.supplier[0].nama : DB.supplier[r.i(0, 2)].nama,
      faktur: `${narko ? "KFTD" : ["KFTD", "APL", "EPM"][r.i(0, 2)]}/${YYMM}/${String(r.i(100, 999)).padStart(5, "0")}`, batch: `NZ${r.i(1000, 9999)}`, qty: inj ? 10 : 100,
    }));
    const nKeluar = r.i(2, 6);
    const keluar = Array.from({ length: nKeluar }, () => ({
      tgl: tglBulanIni(r.i(1, 27)), resep: `RSP/${cabId}/${YYMM}/${String(r.i(1, 480)).padStart(4, "0")}`,
      dokter: DB.dokter[r.i(0, DB.dokter.length - 1)].nama, pasien: PASIEN[r.i(0, PASIEN.length - 1)], qty: inj ? r.i(1, 2) : r.i(5, 30),
    }));
    const totMasuk = sum(masuk, (m) => m.qty);
    let totKeluar = sum(keluar, (k) => k.qty);
    const avail = awal + totMasuk;
    if (totKeluar > avail) { keluar.splice(1); keluar[0].qty = Math.max(0, Math.min(keluar[0].qty, avail)); totKeluar = keluar[0].qty; }
    const lain = !inj && r() < 0.15 ? Math.min(r.i(2, 10), avail - totKeluar) : 0;
    return { masuk, keluar, awal, totMasuk, totKeluar, lain, akhir: avail - totKeluar - lain };
  };
  const napzaReport = (st) => NAPZA.map((it, idx) => {
    const cabs = scopeCabs(st);
    const mv = cabs.map((c) => ({ c, ...napzaMove(it, idx, c.id) }));
    return {
      ...it, awal: sum(mv, (m) => m.awal), totMasuk: sum(mv, (m) => m.totMasuk), totKeluar: sum(mv, (m) => m.totKeluar), lain: sum(mv, (m) => m.lain), akhir: sum(mv, (m) => m.akhir),
      masuk: mv.flatMap((m) => m.masuk.map((x) => ({ ...x, cabang: m.c.id }))).sort((a, b) => a.tgl - b.tgl),
      keluar: mv.flatMap((m) => m.keluar.map((x) => ({ ...x, cabang: m.c.id }))).sort((a, b) => a.tgl - b.tgl),
    };
  });
  const prekReport = (st) => PREK.map((it, idx) => {
    const cabs = scopeCabs(st);
    const r = mk(8000 + idx);
    const f = sum(cabs, (c) => share(c.id));
    const awal = R(r.i(150, 600) * f) + 10;
    const masuk = r() < 0.6 ? R(r.i(1, 3) * 100 * f) : 0;
    const resep = R(r.i(20, 140) * f);
    const bebas = it.golongan === "prekursor" ? R(r.i(30, 180) * f) : 0;
    const tolak = r.i(0, it.golongan === "oot" ? 9 : 4);
    const keluar = Math.min(awal + masuk, resep + bebas);
    return { ...it, awal, masuk, resep: Math.min(resep, keluar), bebas: keluar - Math.min(resep, keluar), akhir: awal + masuk - keluar, tolak };
  });

  const napzaDetail = (it, st) => modal.open({
    title: `Rincian mutasi · ${esc(it.nama)}`, icon: "shield", size: "xl",
    body: `<div class="stack">
      <div class="row" style="gap:10px;flex-wrap:wrap">${UI.golongan(it.golongan)}${badge(it.sub, "gray")}<span class="small muted">${esc(it.generik)} · satuan ${esc(it.satuan)} · ${esc(scopeName(st))} · ${NAMA_BULAN[M0]} ${Y}</span></div>
      <div class="grid g-4">
        ${stat({ label: "Stok awal", value: num(it.awal), icon: "inventory_2", tone: "dark" })}
        ${stat({ label: "Pemasukan", value: num(it.totMasuk), icon: "move_to_inbox", tone: "success" })}
        ${stat({ label: "Pengeluaran", value: num(it.totKeluar + it.lain), icon: "outbox", tone: "danger" })}
        ${stat({ label: "Stok akhir", value: num(it.akhir), icon: "inventory", tone: "primary" })}
      </div>
      <h4>Pemasukan dari PBF</h4>
      ${table({
        cls: "compact", empty: "Tidak ada pemasukan bulan ini",
        columns: [
          { label: "Tanggal", render: (x) => tgl(x.tgl) }, { label: "No. faktur", render: (x) => `<span class="mono">${x.faktur}</span>` },
          { label: "PBF", render: (x) => esc(x.pbf) }, { label: "Batch", render: (x) => `<span class="mono">${x.batch}</span>` },
          { label: "Cabang", render: (x) => esc(cabShort(x.cabang)) }, { label: "Qty", cls: "num", render: (x) => num(x.qty) },
        ],
        rows: it.masuk,
        foot: it.masuk.length ? tr([{ v: "Total pemasukan", span: 5 }, num(it.totMasuk)]) : "",
      })}
      <h4>Pengeluaran berdasarkan resep</h4>
      ${table({
        cls: "compact", empty: "Tidak ada pengeluaran bulan ini",
        columns: [
          { label: "Tanggal", render: (x) => tgl(x.tgl) }, { label: "No. resep", render: (x) => `<span class="mono">${x.resep}</span>` },
          { label: "Dokter", render: (x) => esc(x.dokter) }, { label: "Pasien", render: (x) => esc(x.pasien) },
          { label: "Cabang", render: (x) => esc(cabShort(x.cabang)) }, { label: "Qty", cls: "num", render: (x) => num(x.qty) },
        ],
        rows: it.keluar,
        foot: it.keluar.length ? tr([{ v: "Total pengeluaran resep", span: 5 }, num(it.totKeluar)]) : "",
      })}
      ${it.lain ? alert("warn", "delete_forever", "Pengeluaran lain", ` ${num(it.lain)} ${esc(it.satuan.toLowerCase())} dimusnahkan (rusak/ED) dengan Berita Acara Pemusnahan disaksikan Dinas Kesehatan.`) : ""}
    </div>`,
    foot: `${btn("Tutup", "dark", { icon: "close", attrs: "data-close" })}${btn("Cetak kartu stok", "teal", { icon: "print", attrs: `data-toast="Kartu stok ${esc(it.nama)} dicetak"` })}`,
  });

  window.PAGES["lap-narkotika"] = {
    render({ state }) {
      const rows = napzaReport(state);
      const narko = rows.filter((r) => r.golongan === "narkotika");
      const psiko = rows.filter((r) => r.golongan === "psikotropika");
      const prek = prekReport(state);
      const tenggat = new Date(Y, M0 + 1, 10);
      const sisa = Math.ceil((tenggat - DB.TODAY) / 864e5);
      const resepN = sum(rows, (r) => r.keluar.length);
      const cabs = scopeCabs(state);
      const riwayat = [];
      for (let p = 0; p <= (state.cabang === "ALL" ? 2 : 5); p++) {
        const per = new Date(Y, M0 - p, 1);
        cabs.forEach((c) => {
          const r = mk(9000 + p * 17 + cabIdx(c.id));
          const late = p === 1 && c.id === "BGR";
          const kirim = p === 0 ? null : new Date(per.getFullYear(), per.getMonth() + 1, late ? 12 : r.i(3, 9));
          riwayat.push({ per, c, kirim, late, n: narko.length, ps: psiko.length, noTT: kirim ? `SIPNAP/${c.id}/${String(per.getFullYear()).slice(2)}${String(per.getMonth() + 1).padStart(2, "0")}/${r.i(10000, 99999)}` : "—" });
        });
      }
      const napzaCols = [
        { label: "No", cls: "num", render: (r, i) => i + 1 },
        { label: "Nama obat", render: (r) => `<div class="t-main">${esc(r.nama)}</div><div class="t-sub">${r.kode} · ${esc(r.generik)}</div>` },
        { label: "Golongan", render: (r) => `${UI.golongan(r.golongan)} <span class="t-sub">${r.sub}</span>` },
        { label: "Satuan", render: (r) => esc(r.satuan) },
        { label: "Stok awal", cls: "num", render: (r) => num(r.awal) },
        { label: "Pemasukan", cls: "num", render: (r) => (r.totMasuk ? `<b>${num(r.totMasuk)}</b><div class="t-sub">${r.masuk.map((m) => `${esc(m.pbf.replace(/^PT\s+/, "").split(" ").slice(0, 2).join(" "))} · ${m.faktur}`).slice(0, 2).join("<br>")}</div>` : dash) },
        { label: "Keluar (resep)", cls: "num", render: (r) => `<b>${num(r.totKeluar)}</b><div class="t-sub">${r.keluar.length} resep · ${new Set(r.keluar.map((k) => k.dokter)).size} dokter</div>` },
        { label: "Keluar lain", cls: "num", render: (r) => (r.lain ? `${num(r.lain)}<div class="t-sub">pemusnahan</div>` : dash) },
        { label: "Stok akhir", cls: "num", render: (r) => `<b>${num(r.akhir)}</b>` },
        { label: "", cls: "actions", render: (r) => btn("", "info", { icon: "visibility", size: "sm", title: "Rincian pemasukan & pengeluaran", attrs: `data-napza="${r.kode}"` }) },
      ];
      const napzaFoot = (list) => tr([{ v: `${list.length} item`, span: 4 }, num(sum(list, (r) => r.awal)), num(sum(list, (r) => r.totMasuk)), num(sum(list, (r) => r.totKeluar)), num(sum(list, (r) => r.lain)), num(sum(list, (r) => r.akhir)), { v: "" }]);
      const statusBelum = `<span data-sipnap-status>${badge("Belum dikirim", "amber", { dot: true })}</span>`;

      return `
      ${header("Laporan Narkotika & Psikotropika", `Format pelaporan SIPNAP <b>${esc(scopeName(state))}</b> · periode ${NAMA_BULAN[M0]} ${Y}`, btn("Kirim ke SIPNAP", "purple", { icon: "send", attrs: "data-sipnap" }))}
      ${alert(sisa <= 5 ? "danger" : "warn", "event", `Batas pengiriman ${tgl(tenggat)} (${sisa} hari lagi)`, ` Laporan pemasukan dan pengeluaran narkotika & psikotropika wajib dikirim melalui SIPNAP paling lambat <strong>tanggal 10 bulan berikutnya</strong>, ditandatangani Apoteker Penanggung Jawab. Setiap cabang melapor sesuai SIA masing-masing.`)}
      ${state.cabang === "ALL" ? alert("info", "info", "Tampilan rekap", " Anda melihat rekap semua cabang. Pengiriman ke SIPNAP dilakukan per cabang — pilih cabang aktif untuk melihat laporan yang akan dikirim.") : ""}
      ${fbar(`${select("Periode", Array.from({ length: 6 }, (_, p) => { const d = new Date(Y, M0 - p, 1); return `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`; }))}${select("Golongan", ["Narkotika & psikotropika", "Narkotika", "Psikotropika", "Prekursor", "OOT"])}`)}

      <div class="grid g-4">
        ${stat({ label: "Periode laporan", value: `${NAMA_BULAN[M0]} ${Y}`, icon: "calendar_month", tone: "primary", foot: `tenggat ${tgl(tenggat)}`, hero: true })}
        ${stat({ label: "Item narkotika", value: `${narko.length} item`, icon: "shield", tone: "danger", foot: `stok akhir ${num(sum(narko, (r) => r.akhir))} unit` })}
        ${stat({ label: "Item psikotropika", value: `${psiko.length} item`, icon: "psychology", tone: "purple", foot: `stok akhir ${num(sum(psiko, (r) => r.akhir))} unit` })}
        ${stat({ label: "Resep dilayani", value: num(resepN), icon: "prescriptions", tone: "info", foot: `status SIPNAP: <span data-sipnap-status>${badge("Belum", "amber", { dot: true })}</span>` })}
      </div>

      ${tabs("lnz", [
        { id: "narkotika", label: "Narkotika", icon: "shield", n: narko.length }, { id: "psikotropika", label: "Psikotropika", icon: "psychology", n: psiko.length },
        { id: "prekursor", label: "Prekursor & OOT", icon: "science", n: prek.length }, { id: "riwayat", label: "Riwayat Pengiriman", icon: "history" },
      ], "narkotika")}

      ${panel("lnz", "narkotika", card({
        title: "Laporan penggunaan narkotika", desc: `Satuan terkecil · pemasukan hanya dari PBF pemegang izin khusus narkotika`, icon: "shield", tone: "red", flush: true,
        tools: statusBelum,
        body: table({ columns: napzaCols, rows: narko, foot: napzaFoot(narko) }),
      }), true)}

      ${panel("lnz", "psikotropika", card({
        title: "Laporan penggunaan psikotropika", desc: "Satuan terkecil · pengeluaran hanya berdasarkan resep dokter", icon: "psychology", tone: "purple", flush: true,
        tools: statusBelum,
        body: table({ columns: napzaCols, rows: psiko, foot: napzaFoot(psiko) }),
      }))}

      ${panel("lnz", "prekursor", `
        ${alert("info", "science", "Pengawasan prekursor & OOT", " Pemasukan dan pengeluaran prekursor farmasi serta obat-obat tertentu (OOT) dicatat pada kartu stok dan dokumennya disimpan untuk pemeriksaan Balai POM. Penjualan dibatasi dalam jumlah wajar; permintaan berulang atau berlebihan ditolak dan dicatat.")}
        ${card({
          title: "Mutasi prekursor farmasi & OOT", desc: `${esc(scopeName(state))} · ${NAMA_BULAN[M0]} ${Y}`, icon: "science", tone: "amber", flush: true,
          body: table({
            columns: [
              { label: "Nama obat", render: (r) => `<div class="t-main">${esc(r.nama)}</div><div class="t-sub">${r.kode} · ${esc(r.generik)}</div>` },
              { label: "Golongan", render: (r) => UI.golongan(r.golongan) },
              { label: "Satuan", render: (r) => esc(r.satuan) },
              { label: "Stok awal", cls: "num", render: (r) => num(r.awal) },
              { label: "Masuk", cls: "num", render: (r) => (r.masuk ? num(r.masuk) : dash) },
              { label: "Keluar resep", cls: "num", render: (r) => num(r.resep) },
              { label: "Keluar non-resep", cls: "num", render: (r) => (r.bebas ? num(r.bebas) : dash) },
              { label: "Stok akhir", cls: "num", render: (r) => `<b>${num(r.akhir)}</b>` },
              { label: "Batas/transaksi", cls: "num", render: (r) => `${r.batas} ${esc(r.satuan.toLowerCase())}` },
              { label: "Permintaan ditolak", cls: "num", render: (r) => (r.tolak ? badge(`${r.tolak}×`, r.tolak >= 5 ? "red" : "amber") : dash) },
            ],
            rows: prek,
            foot: tr([{ v: `${prek.length} item`, span: 3 }, num(sum(prek, (r) => r.awal)), num(sum(prek, (r) => r.masuk)), num(sum(prek, (r) => r.resep)), num(sum(prek, (r) => r.bebas)), num(sum(prek, (r) => r.akhir)), "", num(sum(prek, (r) => r.tolak)) + "×"]),
          }),
        })}`)}

      ${panel("lnz", "riwayat", card({
        title: "Riwayat pengiriman SIPNAP", desc: "Tanda terima elektronik disimpan minimal 3 tahun", icon: "history", flush: true,
        tools: btn("Kirim ke SIPNAP", "purple", { size: "sm", icon: "send", attrs: "data-sipnap" }),
        body: table({
          columns: [
            { label: "Periode", render: (x) => `<b>${NAMA_BULAN[x.per.getMonth()]} ${x.per.getFullYear()}</b>` },
            { label: "Cabang", render: (x) => esc(cabShort(x.c.id)) },
            { label: "Apoteker PJ", render: (x) => esc(x.c.apoteker) },
            { label: "Narkotika", cls: "num", render: (x) => `${x.n} item` },
            { label: "Psikotropika", cls: "num", render: (x) => `${x.ps} item` },
            { label: "Tanggal kirim", render: (x) => (x.kirim ? tgl(x.kirim) : dash) },
            { label: "No. tanda terima", render: (x) => `<span class="mono">${x.noTT}</span>` },
            { label: "Status", render: (x) => (!x.kirim ? statusBelum : x.late ? badge("Terkirim (terlambat)", "red", { dot: true }) : badge("Terkirim", "green", { dot: true })) },
          ],
          rows: riwayat,
          foot: tr([{ v: `${riwayat.length} laporan`, span: 3 }, `${sum(riwayat, (x) => x.n)} item`, `${sum(riwayat, (x) => x.ps)} item`, { v: `${riwayat.filter((x) => x.kirim).length} terkirim · ${riwayat.filter((x) => !x.kirim).length} belum`, span: 3 }]),
        }),
      }))}`;
    },
    mount(root, { state }) {
      bindCommon(root);
      const rows = napzaReport(state);
      root.querySelectorAll("[data-napza]").forEach((b) => b.addEventListener("click", () => napzaDetail(rows.find((r) => r.kode === b.dataset.napza), state)));
      root.querySelectorAll("[data-sipnap]").forEach((b) => b.addEventListener("click", () => UI.confirmBox({
        title: "Kirim laporan ke SIPNAP", icon: "send", okLabel: "Kirim sekarang", okVariant: "purple",
        msg: `Laporan narkotika & psikotropika <b>${esc(scopeName(state))}</b> periode <b>${NAMA_BULAN[M0]} ${Y}</b> akan dikirim ke SIPNAP atas nama Apoteker Penanggung Jawab. Pastikan stok akhir sudah sesuai dengan stok fisik.`,
        onOk: () => {
          root.querySelectorAll("[data-sipnap-status]").forEach((el) => { el.innerHTML = badge("Terkirim", "green", { dot: true }); });
          UI.toast(`Laporan SIPNAP ${NAMA_BULAN[M0]} ${Y} terkirim · tanda terima diterbitkan`, "success");
        },
      })));
    },
  };
})();
