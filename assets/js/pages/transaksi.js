/* =====================================================================
   Transaksi: Resep Dokter, Obat Racikan, Retur Penjualan,
   Riwayat Transaksi, Shift & Kas
   ===================================================================== */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, short, table, status, badge, esc, tgl, alert, input, select, textarea, progress, golongan, rowActions, pager } = UI;

  /* ================================================================
     Helper umum
     ================================================================ */
  const A = DB.apotek;
  const EXTRA_OBAT = {
    XT0001: { kode: "XT0001", nama: "Salbutamol 2 mg", generik: "Salbutamol sulfat", kategori: "Batuk & Flu", golongan: "keras", bentuk: "Tablet", satuan: "Strip", isi: 10, hargaBeli: 1600, hargaJual: 3000, hargaResep: 3300, stok: { PST: 140, BKS: 90, DPK: 60, TGR: 75, BGR: 40 } },
  };
  const ob = (k) => DB.obat.find((o) => o.kode === k) || EXTRA_OBAT[k];
  const SAT = { Botol: "btl", Tube: "tube", Pot: "pot", Sachet: "sach", Box: "box", Pcs: "pcs", Unit: "unit", Strip: "strip" };
  const BENTUK_UNIT = { Tablet: "tab", Kaplet: "kapl", Kapsul: "kaps", "Tablet Kunyah": "tab", "Tablet Effervescent": "tab" };
  const unitOf = (o) => (o.isi > 1 && BENTUK_UNIT[o.bentuk]) || SAT[o.satuan] || o.satuan.toLowerCase();
  const perUnit = (o) => o.hargaResep / o.isi;
  const beliUnit = (o) => o.hargaBeli / o.isi;
  const r100 = (n) => Math.round(n / 100) * 100;
  const dec = (n, d = 2) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: d });
  const roman = (n) => {
    const m = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let s = "", x = Math.round(n);
    m.forEach(([v, r]) => { while (x >= v) { s += r; x -= v; } });
    return s || "0";
  };
  const addMin = (hm, m) => {
    const [h, mi] = hm.split(":").map(Number);
    const t = h * 60 + mi + m;
    return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const initials = (s) => s.replace(/^(dr|drg|apt)\.\s*/, "").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const dokterBy = (nama) => DB.dokter.find((d) => d.nama === nama) || { nama, sip: "-", spesialis: "-", faskes: "-", hp: "-" };
  const pasienBy = (nama) => DB.pelanggan.find((p) => p.nama === nama);
  const umurDari = (lahir) => (!lahir || lahir === "-" ? "-" : `${Math.floor((DB.TODAY - new Date(lahir)) / (365.25 * 864e5))} th`);
  const fefo = (k) => DB.batches.filter((b) => b.kode === k && b.sisaHari > 30).sort((a, b) => a.sisaHari - b.sisaHari)[0];
  const suffix = (no) => no.split("/").pop();
  const TUSLAH = 3000, EMBALASE = 1000;

  /* Kop apotek dipakai di etiket, salinan resep & struk */
  const kop = (small = false) => `<b>${esc(A.nama.toUpperCase())}</b><div style="font-weight:400;font-size:${small ? "10.5px" : "11.5px"}">${esc(A.alamat)} · Telp ${esc(A.telp)}<br>APA: ${esc(A.apotekerPJ)} · ${esc(A.sipa)}</div>`;

  /* ================================================================
     Data racikan: kekuatan sediaan, rentang dosis anak, bentuk sediaan
     ================================================================ */
  // [kekuatan per unit, satuan dosis, nama unit]
  const KEK = {
    OB0001: [500, "mg", "tab"], OB0003: [400, "mg", "tab"], OB0004: [500, "mg", "kapl"], OB0010: [15, "mg", "tab"], OB0012: [30, "mg", "tab"],
    OB0013: [20, "mg", "kaps"], OB0018: [25, "mg", "tab"], OB0039: [0.5, "mg", "tab"], OB0040: [10, "mg", "tab"], OB0041: [4, "mg", "tab"],
    OB0026: [5, "g", "tube"], OB0028: [10, "g", "pot"], XT0001: [2, "mg", "tab"],
  };
  const kekOf = (k) => KEK[k] || [1, "unit", unitOf(ob(k))];
  // rentang dosis anak per sekali minum (mg/kgBB)
  const PED = { OB0001: [10, 15], OB0012: [0.3, 0.5], OB0041: [0.05, 0.1], OB0010: [0.2, 0.35], XT0001: [0.05, 0.15], OB0039: [0.01, 0.05], OB0040: [0.1, 0.25], OB0003: [5, 10], OB0018: [0.3, 0.5] };
  const NO_CRUSH = {
    OB0013: "Omeprazole berupa kapsul berisi pelet salut enterik — tidak boleh digerus/dibuka menjadi puyer karena zat aktif rusak oleh asam lambung. Konsultasikan ke dokter: gunakan sediaan suspensi/MUPS atau ganti terapi.",
  };
  const BENTUK = {
    "Puyer / Serbuk bagi": { unit: "bungkus", jasa: 1000, emb: 250, embLbl: "Kertas perkamen + plastik klip", latin: "pulv.", etiket: "putih", ic: "grain" },
    Kapsul: { unit: "kapsul", jasa: 1500, emb: 300, embLbl: "Cangkang kapsul kosong no. 1 + pot", latin: "caps.", etiket: "putih", ic: "pill" },
    Salep: { unit: "pot", jasa: 5000, emb: 3500, embLbl: "Pot salep 20 g", latin: "ungt.", etiket: "biru", ic: "sanitizer" },
    Krim: { unit: "pot", jasa: 5000, emb: 3500, embLbl: "Pot krim 20 g", latin: "cream.", etiket: "biru", ic: "sanitizer" },
    "Sirup / Suspensi": { unit: "botol", jasa: 7500, emb: 4000, embLbl: "Botol 60 ml + sendok takar", latin: "susp.", etiket: "putih", ic: "water_bottle" },
  };

  /* Kalkulasi racikan (dipakai di halaman racikan & harga R/ racikan pada resep) */
  const calcRacik = (f) => {
    const rows = f.komp.map(([k, dosis]) => {
      const o = ob(k);
      const [kek, u, per] = kekOf(k);
      const total = dosis * f.n;
      const units = total / kek;
      const bulat = Math.ceil(units - 1e-9);
      const rng = u === "mg" ? PED[k] || null : null;
      const kg = f.bb > 0 && u === "mg" ? dosis / f.bb : null;
      const tone = !rng || kg === null ? "" : kg < rng[0] ? "amber" : kg > rng[1] ? "red" : "green";
      return { k, o, kek, u, per, dosis, total, units, bulat, harga: bulat * perUnit(o), hpp: bulat * beliUnit(o), rng, kg, tone };
    });
    const bahan = rows.reduce((s, r) => s + r.harga, 0);
    const hppBahan = rows.reduce((s, r) => s + r.hpp, 0);
    const jasaTot = f.jasa * f.n;
    const embTot = f.emb * f.n;
    const total = r100(bahan + jasaTot + embTot + (f.tuslah || 0));
    const margin = total ? ((total - hppBahan - embTot) / total) * 100 : 0;
    return { rows, bahan, hppBahan, jasaTot, embTot, tuslah: f.tuslah || 0, total, perUnit: f.n ? total / f.n : 0, margin };
  };
  const racikLineHarga = (l) => calcRacik({ n: l.n, bb: 0, jasa: BENTUK[l.bentuk].jasa, emb: BENTUK[l.bentuk].emb, tuslah: 0, komp: l.komp }).total;
  const lineHarga = (l) => (l.rc ? racikLineHarga(l) : r100(l.n * perUnit(ob(l.k))));

  /* ================================================================
     Detail resep (R/) untuk setiap resep di DB.resep
     ================================================================ */
  const RD = {
    "RSP/PST/2609/0088": {
      bb: 72, alergi: "Penisilin", jenis: "Umum", alamat: "Jl. Cilandak KKO No. 12, Jakarta Selatan",
      lines: [
        { k: "OB0017", n: 30, s: "1 dd tab 1", e: "1 x sehari 1 tablet", a: "Pagi hari, sesudah makan" },
        { k: "OB0019", n: 30, s: "1 dd tab 1 h.s.", e: "1 x sehari 1 tablet", a: "Malam sebelum tidur" },
        { k: "OB0021", n: 60, s: "2 dd tab 1 p.c.", e: "2 x sehari 1 tablet", a: "Sesudah makan pagi & malam" },
        { k: "OB0013", n: 30, s: "1 dd caps 1 a.c.", e: "1 x sehari 1 kapsul", a: "30 menit sebelum makan pagi" },
      ],
      temuan: [["success", "Skrining lengkap, tidak ada DRP", "Pasien alergi penisilin — tidak ada antibiotik beta-laktam pada resep. Dosis & frekuensi sesuai."]],
      pio: "Metformin diminum sesudah makan untuk mengurangi mual. Hindari jus grapefruit selama memakai simvastatin. Kontrol gula darah & tekanan darah rutin.",
    },
    "RSP/PST/2609/0089": {
      bb: 15, alergi: "-", jenis: "Umum", alamat: "Jl. Margasatwa No. 5, Jakarta Selatan",
      lines: [
        { rc: true, nama: "Puyer Demam Batuk Anak", bentuk: "Puyer / Serbuk bagi", n: 15, komp: [["OB0001", 150], ["OB0012", 6], ["OB0041", 1]], s: "3 dd pulv 1 p.c.", e: "3 x sehari 1 bungkus", a: "Sesudah makan, larutkan dengan sedikit air" },
        { k: "OB0035", n: 1, s: "1 dd cth 1", e: "1 x sehari 1 sendok takar (5 ml)", a: "Selama 10 hari, sesudah makan" },
        { k: "OB0016", n: 5, s: "p.r.n. sach 1", e: "Setiap kali diare 1 sachet", a: "Larutkan dalam 200 ml air matang" },
      ],
      temuan: [["success", "Dosis anak sesuai (BB 15 kg)", "Paracetamol 150 mg = 10 mg/kgBB per dosis (rentang 10–15). Ambroxol 6 mg = 0,4 mg/kgBB. CTM 1 mg = 0,07 mg/kgBB."]],
      pio: "Kocok sirup zinc sebelum digunakan dan lanjutkan 10 hari walau diare sudah berhenti. Puyer dilarutkan dengan sedikit air/ASI di sendok, jangan dicampur ke botol susu.",
    },
    "RSP/PST/2609/0090": {
      bb: 68, alergi: "Sulfa", jenis: "BPJS PRB", alamat: "Jl. Pejaten Raya No. 41, Jakarta Selatan",
      lines: [
        { k: "OB0020", n: 30, s: "1 dd tab 1", e: "1 x sehari 1 tablet", a: "Pagi hari, sesudah makan", iter: 2 },
        { k: "OB0017", n: 30, s: "1 dd tab 1", e: "1 x sehari 1 tablet", a: "Pagi hari", iter: 2 },
        { k: "OB0019", n: 30, s: "1 dd tab 1 h.s.", e: "1 x sehari 1 tablet", a: "Malam sebelum tidur", iter: 2 },
        { k: "OB0018", n: 60, s: "2 dd tab 1 a.c.", e: "2 x sehari 1 tablet", a: "1 jam sebelum makan", iter: 2 },
        { k: "OB0013", n: 30, s: "1 dd caps 1 a.c.", e: "1 x sehari 1 kapsul", a: "30 menit sebelum makan pagi", iter: 2 },
      ],
      temuan: [
        ["danger", "Interaksi obat: Clopidogrel + Omeprazole", "Omeprazole menghambat CYP2C19 sehingga aktivasi clopidogrel turun (risiko kejadian kardiovaskular). Rekomendasi: konfirmasi ke dr. Ratna Sari, Sp.JP untuk penggantian ke Pantoprazole."],
        ["warn", "Amlodipine + Simvastatin", "Dosis simvastatin maksimal 20 mg/hari bila dikombinasi amlodipine — dosis resep 20 mg, sesuai. Pantau keluhan nyeri otot."],
        ["info", "Resep iter 2x", "Buatkan salinan resep (apograph) dengan keterangan iter; obat keras boleh diulang sesuai iter dokter."],
      ],
      pio: "Captopril diminum 1 jam sebelum makan; laporkan bila muncul batuk kering menetap. Jangan menghentikan clopidogrel tanpa persetujuan dokter.",
    },
    "RSP/PST/2609/0091": {
      bb: 58, alergi: "-", jenis: "Asuransi", alamat: "Jl. Ampera Raya No. 17, Jakarta Selatan",
      lines: [
        { rc: true, nama: "Salep Racik Kulit", bentuk: "Salep", n: 1, komp: [["OB0026", 10], ["OB0028", 10]], s: "u.e. 2 dd", e: "2 x sehari dioleskan tipis", a: "Pagi & malam pada kulit yang gatal", luar: true },
        { k: "OB0040", n: 10, s: "1 dd tab 1 h.s.", e: "1 x sehari 1 tablet", a: "Malam sebelum tidur" },
      ],
      temuan: [["info", "Menunggu skrining apoteker", "Resep diterima 11:12, antre verifikasi. Racikan salep perlu cek kompatibilitas basis krim + salep."]],
      pio: "Salep hanya untuk kulit, hindari wajah & lipatan kulit. Cetirizine dapat menimbulkan kantuk, hindari mengemudi.",
    },
    "RSP/PST/2609/0092": {
      bb: 65, alergi: "-", jenis: "Umum", alamat: "Jl. Fatmawati Raya No. 220, Jakarta Selatan",
      lines: [
        { k: "OB0005", n: 15, s: "3 dd caps 1", e: "3 x sehari 1 kapsul", a: "Tiap 8 jam, sesudah makan — HABISKAN" },
        { k: "OB0001", n: 10, s: "3 dd tab 1 p.r.n.", e: "3 x sehari 1 tablet bila perlu", a: "Bila demam/nyeri" },
        { k: "OB0012", n: 10, s: "3 dd tab 1 p.c.", e: "3 x sehari 1 tablet", a: "Sesudah makan" },
      ],
      temuan: [["success", "Skrining & double check selesai", "Tidak ada riwayat alergi. Antibiotik diberikan untuk 5 hari (15 kapsul)."]],
      pio: "Amoxicillin harus dihabiskan walaupun sudah merasa sehat. Paracetamol hanya bila demam, jarak minimal 4–6 jam.",
    },
    "RSP/PST/2509/0071": {
      bb: 62, alergi: "-", jenis: "Umum", alamat: "Jl. Haji Nawi No. 9, Jakarta Selatan",
      lines: [
        { k: "OB0021", n: 60, s: "2 dd tab 1 p.c.", e: "2 x sehari 1 tablet", a: "Sesudah makan", iter: 1 },
        { k: "OB0022", n: 30, s: "1 dd tab 1 a.c.", e: "1 x sehari 1 tablet", a: "Pagi, sesaat sebelum makan", iter: 1 },
        { k: "OB0017", n: 30, s: "1 dd tab 1", e: "1 x sehari 1 tablet", a: "Pagi hari", iter: 1 },
        { k: "OB0019", n: 30, s: "1 dd tab 1 h.s.", e: "1 x sehari 1 tablet", a: "Malam sebelum tidur", iter: 1 },
        { k: "OB0013", n: 30, s: "1 dd caps 1 a.c.", e: "1 x sehari 1 kapsul", a: "30 menit sebelum makan pagi", iter: 1 },
        { k: "OB0024", n: 30, s: "1 dd tab 1 p.c.", e: "1 x sehari 1 tablet", a: "Sesudah makan" },
      ],
      temuan: [["success", "Skrining lengkap", "Pasien diedukasi tanda hipoglikemia (glimepiride)."]],
      pio: "Glimepiride dapat menyebabkan gula darah rendah; selalu sedia permen/gula. Minum obat teratur di jam yang sama.",
    },
  };
  const resepCalc = (d) => {
    const sub = d.lines.reduce((s, l) => s + lineHarga(l), 0);
    const nR = d.lines.length;
    return { sub, nR, tuslah: nR * TUSLAH, emb: nR * EMBALASE, total: sub + nR * (TUSLAH + EMBALASE) };
  };
  const lineNama = (l) => (l.rc ? l.nama : ob(l.k).nama);

  const STEPS = [
    ["Diterima", "inbox", "Resep & identitas pasien diterima TTK"],
    ["Verifikasi", "fact_check", "Skrining administratif, farmasetik, klinis"],
    ["Penyiapan / Peracikan", "science", "Ambil obat (FEFO), racik, beri etiket"],
    ["Pengecekan Ulang", "verified", "Double check oleh apoteker"],
    ["Penyerahan & PIO", "handshake", "Konseling & pemberian informasi obat"],
  ];
  const STEP_NOW = { Diterima: 1, Verifikasi: 1, Diracik: 2, "Siap Diserahkan": 4, Diserahkan: 5 };
  const NEXT_ACT = {
    Diterima: ["Mulai Skrining", "primary", "fact_check"],
    Verifikasi: ["Setujui Verifikasi", "success", "task_alt"],
    Diracik: ["Double Check", "primary", "verified"],
    "Siap Diserahkan": ["Serahkan", "success", "handshake"],
  };
  const PETUGAS = ["Nabila P. (TTK)", "apt. Rina W.", "Nabila P. (TTK)", "apt. Rina W.", "apt. Rina W."];

  const stepsHtml = (st) => {
    const now = STEP_NOW[st] ?? 0;
    return `<div class="steps">${STEPS.map(([l, ic, m], i) => `
      <div class="step ${i < now ? "done" : i === now ? "now" : ""}"><span class="b">${icon(i < now ? "check" : ic)}</span><span>${l}</span><span class="small muted" style="font-weight:500">${m}</span></div>`).join("")}</div>`;
  };

  const flowCard = (no) => {
    const r = DB.resep.find((x) => x.no === no) || DB.resep[0];
    const d = RD[r.no];
    const now = STEP_NOW[r.status] ?? 0;
    const log = STEPS.slice(0, Math.min(now, 5)).map(([l], i) => ({ t: l, jam: addMin(r.jam, [0, 3, 8, 15, 19][i]), who: PETUGAS[i], tone: "green" }));
    if (now < 5) log.push({ t: `${STEPS[now][0]} — sedang berjalan`, jam: "sekarang", who: now === 1 && r.status === "Diterima" ? "Menunggu apoteker" : PETUGAS[now], tone: "amber" });
    const skr = [["Administratif", now >= 2 || r.status === "Verifikasi" ? 6 : 3, 6], ["Farmasetik", now >= 2 ? 4 : r.status === "Verifikasi" ? 3 : 0, 4], ["Klinis", now >= 2 ? 6 : r.status === "Verifikasi" ? 4 : 0, 6]];
    const next = NEXT_ACT[r.status];
    return card({
      id: "rsp-flow-card", title: "Alur pelayanan resep", icon: "timeline", tone: "purple",
      desc: `<span class="mono">${esc(r.no)}</span> · ${esc(r.pasien)} · ${esc(r.dokter)}`,
      tools: `${btn("Detail Resep", "info", { size: "sm", icon: "visibility", attrs: `data-rsp-view="${esc(r.no)}"` })}${next ? btn(next[0], next[1], { size: "sm", icon: next[2], attrs: `data-toast="${esc(next[0])} · ${esc(r.no)}"` }) : badge("Selesai", "green", { icon: "task_alt" })}`,
      body: `${stepsHtml(r.status)}
        <div class="grid g-2" style="margin-top:18px">
          <div>
            <div class="lbl-sm" style="margin-bottom:6px">Log proses</div>
            <div class="timeline" style="padding:0">${log.map((x) => `<div class="tl ${x.tone}"><span class="d"></span><div><div class="t">${esc(x.t)}</div><div class="m">${x.jam} · ${esc(x.who)}</div></div></div>`).join("")}</div>
          </div>
          <div class="stack">
            <div class="lbl-sm">Skrining resep</div>
            ${skr.map(([l, v, m]) => `<div class="stack" style="gap:4px"><div class="row between small"><span>${l}</span><b class="num">${v}/${m}</b></div>${progress(v, m, v === m ? "green" : v ? "amber" : "")}</div>`).join("")}
            ${d.temuan.map(([tone, t, m]) => alert(tone, { success: "task_alt", danger: "report", warn: "warning", info: "info" }[tone], esc(t), esc(m))).join("")}
          </div>
        </div>`,
    });
  };

  /* ---------- Etiket & salinan resep ---------- */
  const etiketHtml = (r, d, l) => {
    const luar = !!l.luar;
    const b = l.rc ? null : fefo(l.k);
    const ket = l.rc ? `${esc(l.nama)} · ${roman(l.n)} ${BENTUK[l.bentuk].unit}` : `${esc(ob(l.k).nama)} · ${l.n} ${unitOf(ob(l.k))}`;
    const ed = l.rc ? `BUD ${tgl(DB.addDays(luar ? 30 : 14))}` : b ? `Batch ${b.batch} · ED ${tgl(b.ed)}` : "";
    return `<div class="etiket ${luar ? "biru" : "putih"}">
      <div class="hd">${kop(true)}</div>
      <div class="row between" style="font-size:11px"><span>No. ${suffix(r.no)}</span><span>${tgl(r.tgl)}</span></div>
      <div style="margin-top:4px"><b>${esc(r.pasien)}</b> <span style="font-size:11px">(${esc(r.umur)})</span></div>
      <div class="sig">${esc(l.e)}</div>
      <div class="center" style="font-weight:600">${esc(l.a)}</div>
      <div class="dashed"></div>
      <div style="font-size:11px">${ket}</div>
      <div style="font-size:10.5px">${ed}</div>
      ${luar ? `<div class="center" style="font-weight:800;margin-top:6px;letter-spacing:.04em">OBAT LUAR — JANGAN DITELAN</div>` : ""}
    </div>`;
  };
  const rLatin = (l) => {
    if (!l.rc) return `<div><b>${esc(ob(l.k).nama)}</b> <span style="font-style:italic">No. ${roman(l.n)}</span></div>`;
    const bt = BENTUK[l.bentuk];
    const tot = l.komp.reduce((s, [, d]) => s + d, 0) * l.n;
    return `${l.komp.map(([k, dsz]) => `<div>${esc(ob(k).nama.replace(/\s[\d,]+\s?(mg|%).*$/, ""))} <span style="font-style:italic">${dec(dsz)} ${kekOf(k)[1]}</span></div>`).join("")}
      <div style="font-style:italic">m.f. ${bt.latin} ${bt.unit === "pot" ? `${dec(tot)} g` : `dtd No. ${roman(l.n)}`}</div>`;
  };
  const resepAsliHtml = (r, d) => {
    const dk = dokterBy(r.dokter);
    return `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;background:var(--surface-2)">
      <div class="center"><b>${esc(dk.nama)}</b><div class="small muted">${esc(dk.sip)} · ${esc(dk.spesialis)}</div><div class="small muted">${esc(r.faskes)} · Telp ${esc(dk.hp)}</div></div>
      <div class="dashed"></div>
      <div class="row between small"><span class="mono">${esc(r.no)}</span><span>Jakarta, ${tgl(r.tgl)}</span></div>
      ${d.lines.map((l) => `
        <div style="display:flex;gap:10px;margin-top:12px">
          <b style="font-family:Georgia,serif;font-size:19px;font-style:italic;line-height:1.1">R/</b>
          <div style="flex:1">${l.iter ? `<div class="small" style="font-style:italic">iter ${l.iter}x</div>` : ""}${rLatin(l)}<div style="font-style:italic;margin-top:2px">S ${esc(l.s)}</div></div>
          <span class="small muted num">${rp(lineHarga(l))}</span>
        </div>`).join("")}
      <div class="dashed" style="margin-top:12px"></div>
      <div class="small"><b>Pro:</b> ${esc(r.pasien)} · ${esc(r.umur)} · BB ${d.bb} kg</div>
      <div class="small muted">${esc(d.alamat)}</div>
    </div>`;
  };
  const apographHtml = (r, d) => {
    const dk = dokterBy(r.dokter);
    return `<div style="border:1px dashed var(--border-strong);border-radius:var(--radius);padding:16px 18px;background:var(--surface)">
      <div class="center">${kop()}</div>
      <div class="dashed"></div>
      <div class="center strong" style="letter-spacing:.16em">SALINAN RESEP</div>
      <dl class="kv small" style="margin:10px 0">
        <dt>No. salinan</dt><dd class="mono">SR/${esc(r.no.split("/").slice(1).join("/"))}</dd>
        <dt>Dari dokter</dt><dd>${esc(dk.nama)}</dd>
        <dt>Tanggal resep</dt><dd>${tgl(r.tgl)}</dd>
        <dt>Dibuat tanggal</dt><dd>${tgl(DB.TODAY)}</dd>
        <dt>Untuk</dt><dd>${esc(r.pasien)} (${esc(r.umur)})</dd>
      </dl>
      <div class="dashed"></div>
      ${d.lines.map((l, i) => `
        <div style="display:flex;gap:10px;margin-top:10px">
          <b style="font-family:Georgia,serif;font-size:17px;font-style:italic;line-height:1.1">R/</b>
          <div style="flex:1">${l.iter ? `<div class="small" style="font-style:italic">iter ${l.iter}x</div>` : ""}${rLatin(l)}<div style="font-style:italic">S ${esc(l.s)}</div></div>
          ${badge(d.nedet && d.nedet.includes(i) ? "nedet" : "det orig", d.nedet && d.nedet.includes(i) ? "amber" : "green")}
        </div>`).join("")}
      <div class="dashed" style="margin-top:12px"></div>
      <div class="row between small"><span class="muted">Cap apotek</span><div style="text-align:right"><i>p.c.c.</i><div style="height:26px"></div><b>${esc(A.apotekerPJ)}</b><div class="muted">${esc(A.sipa)}</div></div></div>
    </div>`;
  };

  const openResep = (no) => {
    const r = DB.resep.find((x) => x.no === no);
    if (!r) return;
    const d = RD[no];
    const c = resepCalc(d);
    const dk = dokterBy(r.dokter);
    UI.modal.open({
      title: `Detail Resep ${suffix(r.no)} — ${esc(r.pasien)}`, icon: "prescriptions", size: "xl",
      body: `
        <div class="row" style="gap:8px">${status(r.status)}${badge(d.jenis, d.jenis === "BPJS PRB" ? "teal" : d.jenis === "Asuransi" ? "cyan" : "gray")}${r.racikan ? badge("Racikan", "purple", { icon: "science" }) : ""}${r.iter ? badge(`Iter ${r.iter}x`, "blue", { icon: "repeat" }) : ""}${d.alergi !== "-" ? badge(`Alergi ${esc(d.alergi)}`, "red", { icon: "warning" }) : ""}<span class="spacer"></span><span class="small muted">${esc(dk.faskes)} · ${esc(dk.sip)}</span></div>
        ${stepsHtml(r.status)}
        <div class="grid g-2">
          <div class="stack">
            <div class="lbl-sm">Resep asli (format klasik)</div>
            ${resepAsliHtml(r, d)}
            <dl class="kv">
              <dt>Subtotal obat (${c.nR} R/)</dt><dd>${rp(c.sub)}</dd>
              <dt>Tuslah (jasa resep ${rp(TUSLAH)} × ${c.nR})</dt><dd>${rp(c.tuslah)}</dd>
              <dt>Embalase (${rp(EMBALASE)} × ${c.nR})</dt><dd>${rp(c.emb)}</dd>
              <dt class="strong">Total</dt><dd style="font-size:16px;color:var(--c-primary)">${rp(c.total)}</dd>
            </dl>
            ${d.temuan.map(([tone, t, m]) => alert(tone, { success: "task_alt", danger: "report", warn: "warning", info: "info" }[tone], esc(t), esc(m))).join("")}
            ${alert("info", "record_voice_over", "Catatan PIO / konseling", esc(d.pio))}
          </div>
          <div class="stack">
            ${UI.tabs("rsp-md", [{ id: "etiket", label: "Etiket", icon: "label" }, { id: "apo", label: "Salinan Resep (Apograph)", icon: "content_copy" }], "etiket")}
            <div data-panel-group="rsp-md" data-panel="etiket">
              <div class="row small muted" style="margin-bottom:10px">${badge("Putih", "gray")} obat dalam (oral) &nbsp; ${badge("Biru", "blue")} obat luar</div>
              <div class="grid g-2" style="gap:12px">${d.lines.map((l) => etiketHtml(r, d, l)).join("")}</div>
            </div>
            <div data-panel-group="rsp-md" data-panel="apo" hidden>${apographHtml(r, d)}</div>
          </div>
        </div>`,
      foot: `${btn("Tutup", "dark", { icon: "close", attrs: "data-close" })}${btn("Cetak Etiket", "teal", { icon: "print", attrs: `data-toast="${d.lines.length} etiket ${esc(suffix(r.no))} dikirim ke printer label"` })}${btn("Cetak Salinan Resep", "purple", { icon: "content_copy", attrs: `data-toast="Salinan resep ${esc(suffix(r.no))} dicetak"` })}${r.status !== "Diserahkan" ? btn("Lanjut ke Kasir", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' }) : ""}`,
    });
  };

  /* ---------- Input resep baru ---------- */
  const ALERGI = {
    Penisilin: { kodes: ["OB0005", "OB0006"], ket: "golongan beta-laktam (penisilin; sefalosporin berisiko reaksi silang)", alt: "makrolida, mis. Azithromycin" },
    Sulfa: { kodes: [], ket: "sulfonamida", alt: "non-sulfonamida" },
    Aspirin: { kodes: ["OB0003", "OB0004"], ket: "AINS/NSAID (reaksi silang aspirin)", alt: "Paracetamol" },
  };
  const PASIEN_BB = { "MB-00121": 72, "MB-00188": 58, "MB-00203": 68, "MB-00245": 52, "MB-00261": 70, "MB-00277": 65, "MB-00290": 62, UMUM: "" };
  const ATURAN = ["Sesudah makan", "Sebelum makan (a.c.)", "Bersama makan", "Bila perlu (p.r.n.)", "Pagi hari", "Malam sebelum tidur", "Habiskan (antibiotik)", "Dioleskan tipis (obat luar)"];
  const NEW_LINES = [
    { k: "OB0005", n: 15, s: "3 dd caps 1", a: "Habiskan (antibiotik)", iter: 0 },
    { k: "OB0001", n: 10, s: "3 dd tab 1 p.r.n.", a: "Bila perlu (p.r.n.)", iter: 0 },
    { k: "OB0012", n: 10, s: "3 dd tab 1 p.c.", a: "Sesudah makan", iter: 0 },
    { rc: true, nama: "Kapsul Batuk Dewasa", bentuk: "Kapsul", n: 10, komp: [["OB0010", 10], ["OB0041", 2]], s: "3 dd caps 1 p.c.", a: "Sesudah makan", iter: 0 },
  ];
  const obatOpts = DB.obat.filter((o) => o.kategori !== "Alat Kesehatan");
  const alergiBox = (p, kodes) => {
    if (!p || p.alergi === "-") return alert("success", "verified_user", "Tidak ada riwayat alergi obat tercatat", "Tetap konfirmasi langsung ke pasien saat penyerahan.");
    const a = ALERGI[p.alergi] || { kodes: [], ket: p.alergi, alt: "-" };
    const hit = kodes.filter((k) => a.kodes.includes(k)).map((k) => ob(k).nama);
    if (hit.length) return alert("danger", "report", `Peringatan alergi: ${esc(p.nama)} alergi ${esc(p.alergi)}`, `R/ ${hit.map(esc).join(", ")} termasuk ${esc(a.ket)}. Jangan diserahkan — hubungi dokter penulis resep untuk penggantian (alternatif: ${esc(a.alt)}) dan catat pada catatan pengobatan pasien.`);
    return alert("warn", "warning", `Riwayat alergi: ${esc(p.alergi)}`, `Tidak ada konflik pada R/ saat ini. Hindari ${esc(a.ket)}.`);
  };
  const lineRow = (l, i, p) => {
    const conflict = p && ALERGI[p.alergi] && !l.rc && ALERGI[p.alergi].kodes.includes(l.k);
    if (l.rc) {
      const h = racikLineHarga(l);
      const bt = BENTUK[l.bentuk];
      return `<tr data-line data-racik="${h}">
        <td class="strong nowrap">R/<span class="rsp-no">${i + 1}</span></td>
        <td>${badge("Racikan", "purple", { icon: "science" })} <b>${esc(l.nama)}</b><div class="t-sub">${l.komp.map(([k, d]) => `${esc(ob(k).nama.replace(/\s[\d,]+\s?mg.*$/, ""))} ${dec(d)} mg`).join(" + ")} · m.f. ${bt.latin} dtd No. ${roman(l.n)}</div></td>
        <td class="num">${l.n}</td><td>${bt.unit}</td>
        <td><input class="input sm rsp-signa" value="${esc(l.s)}" aria-label="Signa" style="min-width:130px"></td>
        <td><select class="select sm" aria-label="Aturan pakai">${ATURAN.map((x) => `<option ${x === l.a ? "selected" : ""}>${x}</option>`).join("")}</select></td>
        <td><input class="input sm" type="number" min="0" value="0" aria-label="Iter" style="width:64px"></td>
        <td class="num strong rsp-harga">${rp(h)}</td>
        <td class="nowrap">${btn("", "purple", { icon: "science", size: "sm", title: "Buka halaman racikan", attrs: 'data-go="racikan"' })} ${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus R/", attrs: 'data-rsp-del="1"' })}</td>
      </tr>`;
    }
    const o = ob(l.k);
    return `<tr data-line class="${conflict ? "row-danger" : ""}">
      <td class="strong nowrap">R/<span class="rsp-no">${i + 1}</span></td>
      <td style="min-width:210px"><select class="select sm rsp-obat" aria-label="Obat R/${i + 1}">${obatOpts.map((x) => `<option value="${x.kode}" ${x.kode === l.k ? "selected" : ""}>${esc(x.nama)}</option>`).join("")}</select><div class="t-sub rsp-gol" style="margin-top:4px">${golongan(o.golongan)} · stok ${num(o.stok.PST)} ${esc(o.satuan.toLowerCase())}</div></td>
      <td><input class="input sm rsp-qty" type="number" min="1" value="${l.n}" aria-label="Jumlah" style="width:76px"><div class="t-sub">No. <span class="rsp-rom">${roman(l.n)}</span></div></td>
      <td class="rsp-sat">${unitOf(o)}</td>
      <td><input class="input sm rsp-signa" value="${esc(l.s)}" aria-label="Signa" style="min-width:130px"></td>
      <td><select class="select sm" aria-label="Aturan pakai">${ATURAN.map((x) => `<option ${x === l.a ? "selected" : ""}>${x}</option>`).join("")}</select></td>
      <td><input class="input sm" type="number" min="0" value="${l.iter || 0}" aria-label="Iter" style="width:64px"></td>
      <td class="num strong rsp-harga">${rp(lineHarga(l))}</td>
      <td class="nowrap">${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus R/", attrs: 'data-rsp-del="1"' })}</td>
    </tr>`;
  };
  const SKRINING = [
    ["Administratif", "badge", [["Nama, umur, jenis kelamin & BB pasien", 1], ["Nama dokter, SIP, alamat & paraf dokter", 1], ["Tanggal penulisan resep", 1], ["Nama obat, kekuatan & jumlah", 1], ["Nomor kartu BPJS/asuransi (bila ada)", 1]]],
    ["Farmasetik", "science", [["Bentuk & kekuatan sediaan tersedia", 1], ["Stabilitas & kompatibilitas bahan racikan", 1], ["Aturan & cara pakai jelas", 1]]],
    ["Klinis", "clinical_notes", [["Ketepatan indikasi & dosis (termasuk dosis anak/lansia)", 1], ["Riwayat alergi & reaksi obat tidak dikehendaki", 0], ["Interaksi obat", 1], ["Duplikasi terapi", 1], ["Kontraindikasi (hamil/menyusui, gangguan ginjal/hati)", 1], ["Lama penggunaan & polifarmasi", 1]]],
  ];
  const SKR_TOTAL = SKRINING.reduce((s, g) => s + g[2].length, 0);
  const SKR_OK = SKRINING.reduce((s, g) => s + g[2].filter((x) => x[1]).length, 0);

  /* ---------- Salinan resep / iter ---------- */
  const SALINAN = [
    { no: "SR/PST/2609/0021", tgl: DB.iso(DB.addDays(-1)), asal: "RSP/PST/2509/0071", pasien: "Lina Marlina", dokter: "dr. Andi Pratama, Sp.PD", r: 6, det: "det orig", nedet: 0, iter: 1, pakai: 0 },
    { no: "SR/PST/2609/0019", tgl: DB.iso(DB.addDays(-6)), asal: "RSP/BKS/2609/0044", pasien: "Agus Salim", dokter: "dr. Ratna Sari, Sp.JP", r: 3, det: "det iter 1x", nedet: 0, iter: 2, pakai: 1 },
    { no: "SR/PST/2609/0017", tgl: DB.iso(DB.addDays(-9)), asal: "Apotek Medika Jaya (luar)", pasien: "Siti Aminah", dokter: "dr. Fajar Nugroho, Sp.KK", r: 2, det: "det 1 R/", nedet: 1, iter: 0, pakai: 0 },
    { no: "SR/PST/2609/0014", tgl: DB.iso(DB.addDays(-14)), asal: "RSP/PST/2609/0012", pasien: "Budi Santoso", dokter: "dr. Andi Pratama, Sp.PD", r: 4, det: "det orig", nedet: 0, iter: 2, pakai: 1 },
    { no: "SR/PST/2509/0098", tgl: DB.iso(DB.addDays(-33)), asal: "RSP/PST/2509/0061", pasien: "Hendra Wijaya", dokter: "dr. Ratna Sari, Sp.JP", r: 5, det: "det iter 3x", nedet: 0, iter: 3, pakai: 3 },
    { no: "SR/PST/2509/0091", tgl: DB.iso(DB.addDays(-38)), asal: "RSP/PST/2509/0057", pasien: "Dewi Lestari", dokter: "dr. Bambang Susilo", r: 3, det: "det 2 R/", nedet: 1, iter: 0, pakai: 0 },
  ];

  /* ================================================================
     ROUTE: resep
     ================================================================ */
  window.PAGES.resep = {
    render({ state }) {
      const cab = state.cabang === "ALL" ? "Semua Cabang" : UI.cabangNama(state.cabang);
      const cnt = (s) => DB.resep.filter((r) => s.includes(r.status)).length;
      const iterAktif = SALINAN.filter((s) => s.iter - s.pakai > 0).length + DB.resep.filter((r) => r.iter > 0 && r.status !== "Diserahkan").length;
      const defP = DB.pelanggan[0];
      const defD = DB.dokter[2];
      const nc = NEW_LINES.reduce((s, l) => s + lineHarga(l), 0);
      const nR = NEW_LINES.length;

      return `
      ${UI.pageHeader({
        title: "Resep Dokter",
        sub: `Pelayanan resep <b>${esc(cab)}</b> sesuai standar pelayanan kefarmasian di apotek: skrining, penyiapan, double check, penyerahan & PIO.`,
        crumbs: ["Transaksi", "Resep Dokter"],
        actions: `${btn("Resep Baru", "success", { icon: "add", attrs: 'data-tab-jump="input"' })}${btn("Antrian Racikan", "purple", { icon: "science", attrs: 'data-go="racikan"' })}${btn("Scan e-Resep", "glass", { icon: "qr_code_scanner", attrs: 'data-toast="Arahkan kamera ke QR e-Resep (SATUSEHAT)" data-tone="info"' })}`,
      })}

      <div class="grid g-5">
        ${stat({ label: "Resep hari ini", value: "38", icon: "prescriptions", tone: "primary", delta: 6.4, foot: "vs kemarin", hero: true })}
        ${stat({ label: "Menunggu verifikasi", value: cnt(["Diterima", "Verifikasi"]), icon: "fact_check", tone: "warning", foot: `${badge("1 temuan DRP", "red", { dot: true })}` })}
        ${stat({ label: "Sedang diracik", value: cnt(["Diracik"]), icon: "science", tone: "purple", foot: "rata-rata 14 mnt/racikan" })}
        ${stat({ label: "Siap diserahkan", value: cnt(["Siap Diserahkan"]), icon: "handshake", tone: "success", foot: "sudah double check" })}
        ${stat({ label: "Iter aktif", value: iterAktif, icon: "repeat", tone: "teal", foot: "salinan resep belum habis" })}
      </div>

      ${UI.tabs("rsp", [
        { id: "antrian", label: "Antrian Resep", icon: "format_list_numbered", n: DB.resep.filter((r) => r.status !== "Diserahkan").length },
        { id: "input", label: "Input Resep Baru", icon: "edit_note" },
        { id: "salinan", label: "Salinan Resep / Iter", icon: "content_copy", n: SALINAN.length },
      ], "antrian")}

      <div data-panel-group="rsp" data-panel="antrian" class="stack" style="gap:20px">
        ${card({
          title: "Antrian resep", desc: `Hari ini & kemarin · ${esc(UI.cabangNama(state.cabang === "ALL" ? "PST" : state.cabang))}`, icon: "format_list_numbered", flush: true,
          body: `<div class="chips" data-chip-group="rsp-f" style="padding:12px 20px"><button type="button" class="chip active">Semua</button><button type="button" class="chip">Perlu verifikasi</button><button type="button" class="chip">Racikan</button><button type="button" class="chip">Iter</button></div>` + table({
            columns: [
              { label: "No. Resep", render: (r) => `<span class="mono strong">${suffix(r.no)}</span><div class="t-sub">${r.tgl === DB.iso(DB.TODAY) ? "Hari ini" : tgl(r.tgl)} · ${r.jam}</div>` },
              { label: "Pasien", render: (r) => { const d = RD[r.no]; return `<div class="row" style="gap:10px;flex-wrap:nowrap"><div class="avatar sm">${initials(r.pasien)}</div><div><div class="t-main">${esc(r.pasien)}</div><div class="t-sub">${esc(r.umur)} · BB ${d.bb} kg ${d.alergi !== "-" ? badge(`Alergi ${esc(d.alergi)}`, "red") : ""}</div></div></div>`; } },
              { label: "Dokter", render: (r) => `${esc(r.dokter)}<div class="t-sub">${esc(r.faskes)}</div>` },
              { label: "R/", render: (r) => `<b>${r.item}</b> item <div class="t-sub">${r.racikan ? badge("Racikan", "purple") : ""} ${r.iter ? badge(`Iter ${r.iter}x`, "blue") : ""} ${badge(RD[r.no].jenis, RD[r.no].jenis === "BPJS PRB" ? "teal" : RD[r.no].jenis === "Asuransi" ? "cyan" : "gray")}</div>` },
              { label: "Total", cls: "num", render: (r) => (r.status === "Diterima" ? `<span class="muted small">Belum dihargai</span><div class="t-sub">est. ${rp(resepCalc(RD[r.no]).total)}</div>` : `<b>${rp(resepCalc(RD[r.no]).total)}</b>`) },
              { label: "Status", render: (r) => status(r.status) },
              { label: "Aksi", cls: "actions", render: (r) => { const n = NEXT_ACT[r.status]; return `<div class="btn-group">${btn("", "dark", { icon: "timeline", size: "sm", title: "Lihat alur", attrs: `data-rsp-flow="${esc(r.no)}"` })}${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-rsp-view="${esc(r.no)}"` })}${btn("", "teal", { icon: "print", size: "sm", title: "Cetak etiket", attrs: `data-toast="Etiket ${suffix(r.no)} dicetak"` })}${n ? btn(n[0], n[1], { icon: n[2], size: "sm", attrs: `data-toast="${esc(n[0])} · ${suffix(r.no)}"` }) : btn("Salinan", "purple", { icon: "content_copy", size: "sm", attrs: `data-toast="Salinan resep ${suffix(r.no)} dibuat"` })}</div>`; } },
            ],
            rows: DB.resep,
            rowCls: (r) => (r.status === "Verifikasi" ? "row-warn" : ""),
          }),
        })}
        ${flowCard("RSP/PST/2609/0090")}
      </div>

      <div data-panel-group="rsp" data-panel="input" hidden>
        <div class="grid g-2-1">
          ${card({
            title: "Input resep baru", desc: "Isi identitas resep, lalu tambahkan R/ satu per satu", icon: "edit_note",
            tools: badge("Draft", "gray", { dot: true }),
            body: `<div class="stack" style="gap:18px">
              <div class="form-grid cols-3">
                ${input("No. resep", { id: "rsp-no", value: "RSP/PST/2609/0093", attrs: "readonly", hint: "Nomor otomatis" })}
                ${input("Tanggal resep", { id: "rsp-tgl", type: "date", value: DB.iso(DB.TODAY) })}
                ${select("Jenis resep", ["Umum", "BPJS PRB", "Asuransi"], { id: "rsp-jenis", value: "Umum" })}
                ${select("Dokter penulis", DB.dokter.map((d) => ({ v: d.id, l: d.nama })), { id: "rsp-dokter", value: defD.id, hint: `<span id="rsp-sip">${esc(defD.sip)} · ${esc(defD.spesialis)}</span>` })}
                ${input("Faskes / alamat praktik", { id: "rsp-faskes", value: defD.faskes })}
                ${input("No. kartu BPJS / polis", { id: "rsp-kartu", value: defP.bpjs, ph: "Opsional" })}
                ${select("Pasien", DB.pelanggan.map((p) => ({ v: p.id, l: `${p.nama} · ${p.id}` })), { id: "rsp-pasien", value: defP.id })}
                ${input("Umur", { id: "rsp-umur", value: umurDari(defP.lahir), attrs: "readonly" })}
                ${input("Berat badan (kg)", { id: "rsp-bb", type: "number", value: PASIEN_BB[defP.id], hint: "Wajib untuk anak & dosis mg/kgBB" })}
              </div>
              <div id="rsp-alergi">${alergiBox(defP, NEW_LINES.filter((l) => !l.rc).map((l) => l.k))}</div>
              <div>
                <div class="row between" style="margin-bottom:10px"><div class="lbl-sm">Daftar R/ (<span id="rsp-nr">${nR}</span> resep)</div>
                  <div class="btn-group">${btn("Tambah R/", "success", { icon: "add", size: "sm", attrs: 'id="rsp-add"' })}${btn("Tambah Racikan", "purple", { icon: "science", size: "sm", attrs: 'data-go="racikan"' })}</div></div>
                <div class="table-wrap" style="border:1px solid var(--border);border-radius:var(--radius)"><table class="tbl compact" id="rsp-lines">
                  <thead><tr><th>R/</th><th>Obat</th><th>Jumlah</th><th>Satuan</th><th>Signa</th><th>Aturan pakai</th><th>Iter</th><th class="num">Harga</th><th></th></tr></thead>
                  <tbody>${NEW_LINES.map((l, i) => lineRow(l, i, defP)).join("")}</tbody>
                </table></div>
                <div class="small muted" style="margin-top:8px">Signa: <span class="mono">dd</span> = de die (sehari) · <span class="mono">p.c.</span> sesudah makan · <span class="mono">a.c.</span> sebelum makan · <span class="mono">h.s.</span> sebelum tidur · <span class="mono">p.r.n.</span> bila perlu · <span class="mono">u.e.</span> pemakaian luar</div>
              </div>
              <div class="grid g-2">
                ${textarea("Catatan untuk dokter / konfirmasi", { value: "Konfirmasi ke dr. Bambang Susilo: pasien alergi penisilin, usulan ganti Amoxicillin ke Azithromycin 500 mg 1 dd 1 (3 hari)." })}
                <dl class="kv" style="align-self:start">
                  <dt>Subtotal obat</dt><dd id="rsp-sub">${rp(nc)}</dd>
                  <dt>Tuslah (${rp(TUSLAH)}/R/)</dt><dd id="rsp-tus">${rp(nR * TUSLAH)}</dd>
                  <dt>Embalase (${rp(EMBALASE)}/R/)</dt><dd id="rsp-emb">${rp(nR * EMBALASE)}</dd>
                  <dt class="strong">Total resep</dt><dd id="rsp-total" style="font-size:20px;font-weight:800;color:var(--c-primary)">${rp(nc + nR * (TUSLAH + EMBALASE))}</dd>
                </dl>
              </div>
            </div>`,
            foot: `${btn("Simpan Draft", "light", { icon: "save", attrs: 'data-toast="Draft resep RSP/PST/2609/0093 disimpan" data-tone="info"' })}${btn("Verifikasi Apoteker", "primary", { icon: "fact_check", attrs: 'data-toast="Resep diverifikasi apt. Rina Wulandari"' })}${btn("Cetak Etiket", "teal", { icon: "print", attrs: 'data-toast="Etiket dikirim ke printer label"' })}${btn("Salinan Resep", "purple", { icon: "content_copy", attrs: 'data-toast="Salinan resep (apograph) dibuat"' })}<span class="spacer"></span>${btn("Lanjut ke Kasir", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' })}`,
          })}
          <div class="stack" style="gap:20px">
            ${card({
              title: "Skrining resep", desc: "Permenkes 73/2016 — wajib sebelum penyiapan", icon: "fact_check", tone: "amber",
              tools: `<b class="num" id="rsp-skr-n">${SKR_OK}/${SKR_TOTAL}</b>`,
              body: `<div class="stack" id="rsp-skr">
                <div id="rsp-skr-bar">${progress(SKR_OK, SKR_TOTAL, "amber")}</div>
                ${SKRINING.map(([g, ic, items]) => `<div class="stack" style="gap:8px"><div class="row lbl-sm" style="gap:6px">${icon(ic)}${g}</div>
                  ${items.map(([t, ok]) => `<label class="check"><input type="checkbox" ${ok ? "checked" : ""}> ${esc(t)}</label>`).join("")}</div>`).join("")}
                ${alert("danger", "report", "Temuan DRP", "Alergi penisilin vs Amoxicillin (R/1). Item skrining klinis belum dapat dicentang sebelum dikonfirmasi ke dokter.")}
              </div>`,
            })}
            ${card({
              title: "PIO & konseling", desc: "Disampaikan saat penyerahan", icon: "record_voice_over", tone: "cyan",
              body: `<div class="stack">
                ${["Nama & indikasi obat", "Cara & waktu minum (sebelum/sesudah makan)", "Lama penggunaan (antibiotik dihabiskan)", "Efek samping & cara mengatasi", "Cara penyimpanan (suhu, jauhkan dari anak)"].map((t, i) => `<label class="check"><input type="checkbox" ${i < 2 ? "checked" : ""}> ${t}</label>`).join("")}
                ${textarea("Catatan konseling", { ph: "Mis. pasien memahami cara pakai, keluarga yang mengambil obat…" })}
              </div>`,
            })}
          </div>
        </div>
      </div>

      <div data-panel-group="rsp" data-panel="salinan" hidden>
        ${card({
          title: "Salinan resep & iter", desc: "Apograph yang diterbitkan / diterima apotek", icon: "content_copy", tone: "purple", flush: true,
          tools: btn("Terima Salinan Luar", "success", { size: "sm", icon: "add", attrs: 'data-toast="Form salinan resep dari apotek lain dibuka" data-tone="info"' }),
          body: `<div style="padding:16px 20px 0">${alert("info", "info", "Ketentuan salinan resep", "<b style='display:inline'>det</b> (detur) = obat sudah diserahkan · <b style='display:inline'>nedet</b> (ne detur) = belum diserahkan · <b style='display:inline'>det orig</b> = diserahkan sesuai resep asli. Salinan wajib ditandatangani apoteker (p.c.c.). Resep yang mengandung narkotika tidak boleh diulang (iter) dan salinannya hanya dapat dilayani di apotek yang menyimpan resep asli.")}</div>
          ${table({
            columns: [
              { label: "No. Salinan", render: (s) => `<span class="mono strong">${esc(s.no)}</span><div class="t-sub">${tgl(s.tgl)}</div>` },
              { label: "Resep asli", render: (s) => `<span class="mono small">${esc(s.asal)}</span>` },
              { label: "Pasien", render: (s) => `<b>${esc(s.pasien)}</b><div class="t-sub">${esc(s.dokter)}</div>` },
              { label: "R/", cls: "num", render: (s) => s.r },
              { label: "Status", render: (s) => `${badge(s.det, "green")} ${s.nedet ? badge(`nedet ${s.nedet} R/`, "amber") : ""}` },
              { label: "Iter", render: (s) => (s.iter ? `<div class="stack" style="gap:4px;min-width:110px"><span class="small">${s.pakai}/${s.iter} dipakai</span>${progress(s.pakai, s.iter, s.pakai >= s.iter ? "red" : "green")}</div>` : `<span class="muted small">Tanpa iter</span>`) },
              { label: "Sisa", render: (s) => (s.iter - s.pakai > 0 ? badge(`${s.iter - s.pakai}x lagi`, "blue") : s.nedet ? badge("Sisa nedet", "amber") : badge("Habis", "gray")) },
              { label: "Aksi", cls: "actions", render: (s) => `<div class="btn-group">${s.iter - s.pakai > 0 || s.nedet ? btn("Tebus", "success", { size: "sm", icon: "shopping_bag", attrs: `data-toast="Salinan ${esc(s.no)} ditebus — lanjut ke kasir"` }) : ""}${rowActions(["view", "print", "copy"], s.no)}</div>` },
            ],
            rows: SALINAN,
          })}`,
        })}
      </div>`;
    },

    mount(root) {
      /* Antrian: alur & detail */
      root.addEventListener("click", (e) => {
        const f = e.target.closest("[data-rsp-flow]");
        if (f) {
          const old = root.querySelector("#rsp-flow-card");
          if (old) { old.outerHTML = flowCard(f.dataset.rspFlow); root.querySelector("#rsp-flow-card").scrollIntoView({ behavior: "smooth", block: "start" }); }
        }
        const v = e.target.closest("[data-rsp-view]");
        if (v) openResep(v.dataset.rspView);
        const j = e.target.closest("[data-tab-jump]");
        if (j) root.querySelector(`[data-tab-group="rsp"] [data-tab="${j.dataset.tabJump}"]`)?.click();
      });

      /* Input resep baru */
      const tbody = root.querySelector("#rsp-lines tbody");
      const selP = root.querySelector("#rsp-pasien");
      const selD = root.querySelector("#rsp-dokter");
      if (!tbody || !selP) return;
      const pasien = () => DB.pelanggan.find((p) => p.id === selP.value);

      const recalc = () => {
        const p = pasien();
        const al = ALERGI[p.alergi];
        let sub = 0;
        const rows = [...tbody.querySelectorAll("tr[data-line]")];
        const kodes = [];
        rows.forEach((tr, i) => {
          tr.querySelector(".rsp-no").textContent = i + 1;
          if (tr.dataset.racik) { sub += +tr.dataset.racik; return; }
          const o = ob(tr.querySelector(".rsp-obat").value);
          const q = Math.max(0, +tr.querySelector(".rsp-qty").value || 0);
          const h = r100(q * perUnit(o));
          sub += h;
          kodes.push(o.kode);
          tr.querySelector(".rsp-harga").textContent = rp(h);
          tr.querySelector(".rsp-sat").textContent = unitOf(o);
          tr.querySelector(".rsp-rom").textContent = roman(q);
          tr.querySelector(".rsp-gol").innerHTML = `${golongan(o.golongan)} · stok ${num(o.stok.PST)} ${esc(o.satuan.toLowerCase())}`;
          tr.classList.toggle("row-danger", !!(al && al.kodes.includes(o.kode)));
        });
        const nR = rows.length;
        root.querySelector("#rsp-nr").textContent = nR;
        root.querySelector("#rsp-sub").textContent = rp(sub);
        root.querySelector("#rsp-tus").textContent = rp(nR * TUSLAH);
        root.querySelector("#rsp-emb").textContent = rp(nR * EMBALASE);
        root.querySelector("#rsp-total").textContent = rp(sub + nR * (TUSLAH + EMBALASE));
        root.querySelector("#rsp-alergi").innerHTML = alergiBox(p, kodes);
      };

      selP.addEventListener("change", () => {
        const p = pasien();
        root.querySelector("#rsp-umur").value = umurDari(p.lahir);
        root.querySelector("#rsp-bb").value = PASIEN_BB[p.id] ?? "";
        root.querySelector("#rsp-kartu").value = p.bpjs === "-" ? "" : p.bpjs;
        recalc();
      });
      selD.addEventListener("change", () => {
        const d = DB.dokter.find((x) => x.id === selD.value);
        root.querySelector("#rsp-sip").textContent = `${d.sip} · ${d.spesialis}`;
        root.querySelector("#rsp-faskes").value = d.faskes;
      });
      tbody.addEventListener("input", (e) => { if (e.target.matches(".rsp-qty")) recalc(); });
      tbody.addEventListener("change", (e) => { if (e.target.matches(".rsp-obat")) recalc(); });
      tbody.addEventListener("click", (e) => {
        const del = e.target.closest("[data-rsp-del]");
        if (!del) return;
        del.closest("tr").remove();
        recalc();
        UI.toast("R/ dihapus dari resep", "info");
      });
      root.querySelector("#rsp-add").addEventListener("click", () => {
        const n = tbody.querySelectorAll("tr[data-line]").length;
        tbody.insertAdjacentHTML("beforeend", lineRow({ k: "OB0040", n: 10, s: "1 dd tab 1", a: "Malam sebelum tidur", iter: 0 }, n, pasien()));
        recalc();
        tbody.lastElementChild.querySelector(".rsp-obat").focus();
      });

      /* Skrining checklist */
      const skr = root.querySelector("#rsp-skr");
      skr.addEventListener("change", () => {
        const all = skr.querySelectorAll("input[type=checkbox]");
        const ok = [...all].filter((c) => c.checked).length;
        root.querySelector("#rsp-skr-n").textContent = `${ok}/${all.length}`;
        root.querySelector("#rsp-skr-bar").innerHTML = progress(ok, all.length, ok === all.length ? "green" : "amber");
      });
    },
  };

  /* ================================================================
     ROUTE: racikan
     ================================================================ */
  const FORMULA = [
    { id: "f0", nama: "Puyer Demam Batuk Anak", bentuk: "Puyer / Serbuk bagi", n: 15, signa: "3 dd pulv 1 p.c.", etiket: "3 x sehari 1 bungkus", aturan: "Sesudah makan", komp: [["OB0001", 150], ["OB0012", 6], ["OB0041", 1]], dokter: "dr. Maria Ulfa, Sp.A", pakai: 42 },
    { id: "f1", nama: "Puyer Batuk Anak", bentuk: "Puyer / Serbuk bagi", n: 15, signa: "3 dd pulv 1 p.c.", etiket: "3 x sehari 1 bungkus", aturan: "Sesudah makan", komp: [["OB0012", 7.5], ["OB0010", 5], ["OB0041", 1]], dokter: "dr. Maria Ulfa, Sp.A", pakai: 31 },
    { id: "f2", nama: "Salep Racik Kulit", bentuk: "Salep", n: 1, signa: "u.e. 2 dd", etiket: "2 x sehari dioleskan tipis", aturan: "Pagi & malam pada kulit yang gatal", komp: [["OB0026", 10], ["OB0028", 10]], dokter: "dr. Fajar Nugroho, Sp.KK", pakai: 18 },
    { id: "f3", nama: "Kapsul Racik Asma", bentuk: "Kapsul", n: 20, signa: "3 dd caps 1 p.c.", etiket: "3 x sehari 1 kapsul", aturan: "Sesudah makan", komp: [["XT0001", 1], ["OB0039", 0.25], ["OB0012", 7.5]], dokter: "dr. Andi Pratama, Sp.PD", pakai: 12 },
  ];
  const RK_ADD = Object.keys(KEK);
  const ATURAN_RK = ["Sesudah makan", "Sebelum makan", "Bila perlu", "Pagi & malam pada kulit yang gatal", "Kocok dahulu, sesudah makan"];

  const rkRowHtml = (x, i) => `<tr data-k="${x.k}">
      <td class="muted">${i + 1}</td>
      <td style="min-width:180px"><b>${esc(x.o.nama)}</b><div class="t-sub">${golongan(x.o.golongan)}</div></td>
      <td class="nowrap">${dec(x.kek)} ${x.u}/${x.per}</td>
      <td><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="input sm rk-dosis" type="number" step="0.01" min="0" value="${x.dosis}" aria-label="Dosis per unit ${esc(x.o.nama)}" style="width:86px"><span class="small muted">${x.u}</span></div></td>
      <td class="num rk-tot">${dec(x.total)} ${x.u}</td>
      <td class="rk-tab nowrap">${rkTabHtml(x)}</td>
      <td class="rk-kg">${rkKgHtml(x)}</td>
      <td class="num rk-hrg strong">${rp(x.harga)}</td>
      <td>${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus bahan", attrs: 'data-rk-del="1"' })}</td>
    </tr>`;
  const rkTabHtml = (x) => `<b class="num">${dec(x.units)} ${x.per}</b><div class="t-sub">${Math.abs(x.units - x.bulat) > 1e-9 ? `dibulatkan ${x.bulat} ${x.per}` : "pas, tanpa sisa"}</div>`;
  const rkKgHtml = (x) => (x.kg === null ? `<span class="small muted">${x.u === "g" ? "topikal" : "—"}</span>` : `${badge(`${dec(x.kg, 2)} mg/kg`, x.tone || "gray")}${x.rng ? `<div class="t-sub">rentang ${dec(x.rng[0])}–${dec(x.rng[1])}</div>` : ""}`);
  const rkCostHtml = (c, f) => {
    const bt = BENTUK[f.bentuk];
    return `<dl class="kv">
      <dt>Harga bahan obat</dt><dd class="nowrap">${rp(c.bahan)}</dd>
      <dt>Jasa racik (${rp(f.jasa)} × ${f.n} ${bt.unit})</dt><dd class="nowrap">${rp(c.jasaTot)}</dd>
      <dt>Embalase — ${esc(bt.embLbl)} (${rp(f.emb)} × ${f.n})</dt><dd class="nowrap">${rp(c.embTot)}</dd>
      <dt>Tuslah (jasa resep)</dt><dd class="nowrap">${rp(c.tuslah)}</dd>
    </dl>
    <div class="dashed"></div>
    <div class="row between"><span class="strong">Total racikan</span><span style="font-size:22px;font-weight:800;color:var(--c-primary)" class="num">${rp(c.total)}</span></div>
    <div class="row between small"><span class="muted">Harga per ${bt.unit}</span><b class="num">${rp(c.perUnit)}</b></div>
    <div class="row between small"><span class="muted">HPP bahan + kemasan</span><b class="num">${rp(c.hppBahan + c.embTot)}</b></div>
    <div class="row between small"><span class="muted">Margin kotor</span>${badge(UI.pct(c.margin), c.margin >= 25 ? "green" : "amber")}</div>`;
  };
  const rkChecksHtml = (c, f) => {
    const out = [];
    c.rows.filter((x) => NO_CRUSH[x.k]).forEach((x) => out.push(alert("danger", "block", `Jangan digerus: ${esc(x.o.nama)}`, esc(NO_CRUSH[x.k]))));
    const ped = c.rows.filter((x) => x.kg !== null && x.rng);
    if (f.bb > 0 && ped.length) {
      const bad = ped.filter((x) => x.tone !== "green");
      out.push(bad.length
        ? alert(bad.some((x) => x.tone === "red") ? "danger" : "warn", "child_care", `Cek dosis anak (BB ${dec(f.bb)} kg): ${bad.length} bahan di luar rentang`, bad.map((x) => `${esc(x.o.nama)} ${dec(x.dosis)} mg = ${dec(x.kg, 2)} mg/kgBB (rentang ${dec(x.rng[0])}–${dec(x.rng[1])})`).join("<br>"))
        : alert("success", "child_care", `Dosis anak sesuai (BB ${dec(f.bb)} kg)`, ped.map((x) => `${esc(x.o.nama)}: ${dec(x.kg, 2)} mg/kgBB`).join(" · ")));
    }
    if (c.rows.some((x) => x.o.golongan === "psikotropika" || x.o.golongan === "narkotika")) out.push(alert("danger", "shield", "Mengandung psikotropika/narkotika", "Wajib dicatat di register & laporan SIPNAP; resep tidak boleh diulang."));
    out.push(alert("info", "info", "Catatan peracikan", "Jangan menggerus tablet salut enterik, salut gula/film khusus, atau lepas lambat (SR/XR/CR). Tambahkan Sacch. lactis q.s. bila bobot per bungkus < 150 mg. BUD racikan padat maks. 25% sisa ED bahan atau 6 bulan (pilih yang lebih singkat)."));
    return out.join("");
  };
  const rkEtiketHtml = (f) => {
    const bt = BENTUK[f.bentuk];
    return `<div class="etiket ${bt.etiket}" style="margin:0 auto">
      <div class="hd">${kop(true)}</div>
      <div class="row between" style="font-size:11px"><span>No. ${esc(suffix(f.ref))}</span><span>${tgl(DB.TODAY)}</span></div>
      <div style="margin-top:4px"><b>${esc(f.pasien)}</b> <span style="font-size:11px">(${esc(f.umur)}${f.bb ? ` · ${dec(f.bb)} kg` : ""})</span></div>
      <div class="sig">${esc(f.etiket)}</div>
      <div class="center" style="font-weight:600">${esc(f.aturan)}</div>
      <div class="dashed"></div>
      <div style="font-size:11px">${esc(f.nama)} · ${f.n} ${bt.unit}</div>
      <div style="font-size:10.5px">BUD ${tgl(DB.addDays(bt.etiket === "biru" ? 30 : 14))} · Peracik: Nabila P. · Cek: apt. Rina W.</div>
      ${bt.etiket === "biru" ? `<div class="center" style="font-weight:800;margin-top:6px;letter-spacing:.04em">OBAT LUAR — JANGAN DITELAN</div>` : ""}
    </div>`;
  };

  window.PAGES.racikan = {
    render() {
      const F = FORMULA[0];
      const bt = BENTUK[F.bentuk];
      const f = { ...F, bb: 15, jasa: bt.jasa, emb: bt.emb, tuslah: TUSLAH, pasien: "Alya Putri (anak)", umur: "4 th", ref: "RSP/PST/2609/0089" };
      const c = calcRacik(f);
      const antri = DB.resep.filter((r) => r.racikan);

      return `
      ${UI.pageHeader({
        title: "Obat Racikan",
        sub: "Hitung kebutuhan bahan, dosis anak (mg/kgBB), harga racikan, dan cetak etiket. Setiap racikan diperiksa ulang oleh apoteker sebelum diserahkan.",
        crumbs: ["Transaksi", "Obat Racikan"],
        actions: `${btn("Antrian Resep", "white", { icon: "prescriptions", attrs: 'data-go="resep"' })}${btn("Riwayat Racikan", "glass", { icon: "history", attrs: 'data-toast="Riwayat racikan 30 hari dibuka" data-tone="info"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Racikan hari ini", value: "24", icon: "science", tone: "purple", delta: 9.1, foot: "vs kemarin", hero: true })}
        ${stat({ label: "Dalam antrian", value: antri.length, icon: "hourglass_top", tone: "warning", foot: antri.map((r) => suffix(r.no)).join(" · ") })}
        ${stat({ label: "Waktu racik rata-rata", value: "14 mnt", icon: "timer", tone: "info", foot: "target ≤ 20 mnt" })}
        ${stat({ label: "Formula tersimpan", value: FORMULA.length, icon: "bookmarks", tone: "teal", foot: "template dokter langganan" })}
      </div>

      <div class="grid g-2-1">
        <div class="stack" style="gap:20px">
          ${card({
            title: "Formula racikan", desc: "Ubah jumlah atau dosis — perhitungan diperbarui otomatis", icon: "science", tone: "purple",
            tools: badge(`Ref. ${suffix(f.ref)}`, "purple", { icon: "prescriptions" }),
            body: `<div class="stack" style="gap:18px">
              <div class="form-grid cols-3">
                ${input("Nama racikan", { id: "rk-nama", value: f.nama })}
                ${select("Bentuk sediaan", Object.keys(BENTUK), { id: "rk-bentuk", value: f.bentuk })}
                ${input(`Jumlah <span id="rk-unit-l">${bt.unit}</span>`, { id: "rk-n", type: "number", value: f.n, attrs: 'min="1"' })}
                ${input("Signa", { id: "rk-signa", value: f.signa, hint: "Mis. 3 dd pulv 1 p.c." })}
                ${input("Aturan pakai (etiket)", { id: "rk-etiket-t", value: f.etiket })}
                ${select("Waktu", ATURAN_RK, { id: "rk-aturan", value: f.aturan })}
                ${select("Resep / dokter", DB.resep.filter((r) => r.racikan).map((r) => ({ v: r.no, l: `${suffix(r.no)} · ${r.dokter}` })), { id: "rk-ref", value: f.ref })}
                ${input("Pasien", { id: "rk-pasien", value: f.pasien })}
                <div class="form-grid" style="gap:10px">${input("Umur", { id: "rk-umur", value: f.umur })}${input("BB (kg)", { id: "rk-bb", type: "number", value: f.bb, attrs: 'step="0.1" min="0"' })}</div>
              </div>
              <div>
                <div class="row between" style="margin-bottom:10px"><div class="lbl-sm">Komposisi bahan per ${'<span class="rk-unit">' + bt.unit + "</span>"}</div>
                  <div class="row" style="gap:8px"><select class="select sm" id="rk-add-sel" aria-label="Pilih bahan" style="width:auto">${RK_ADD.map((k) => `<option value="${k}">${esc(ob(k).nama)}</option>`).join("")}</select>${btn("Tambah Bahan", "success", { size: "sm", icon: "add", attrs: 'id="rk-add"' })}</div></div>
                <div class="table-wrap" style="border:1px solid var(--border);border-radius:var(--radius)"><table class="tbl compact" id="rk-tbl">
                  <thead><tr><th>#</th><th>Obat</th><th>Kekuatan</th><th>Dosis / unit</th><th class="num">Total dibutuhkan</th><th>Jumlah diambil</th><th>Cek mg/kgBB</th><th class="num">Harga</th><th></th></tr></thead>
                  <tbody>${c.rows.map(rkRowHtml).join("")}</tbody>
                </table></div>
              </div>
              <div class="grid g-2">
                <div class="stack">
                  <div class="lbl-sm">Biaya racik</div>
                  <div class="form-grid">
                    ${input(`Jasa racik / <span class="rk-unit">${bt.unit}</span>`, { id: "rk-jasa", type: "number", value: f.jasa, attrs: 'min="0" step="100"' })}
                    ${input(`Embalase / <span class="rk-unit">${bt.unit}</span>`, { id: "rk-emb", type: "number", value: f.emb, attrs: 'min="0" step="50"', hint: `<span id="rk-emb-l">${esc(bt.embLbl)}</span>` })}
                    ${input("Tuslah", { id: "rk-tuslah", type: "number", value: f.tuslah, attrs: 'min="0" step="500"' })}
                  </div>
                </div>
                <div class="stack" id="rk-cost" style="gap:8px">${rkCostHtml(c, f)}</div>
              </div>
            </div>`,
            foot: `${btn("Hitung Ulang", "primary", { icon: "calculate", attrs: 'id="rk-hitung"' })}${btn("Simpan Formula", "purple", { icon: "bookmark_add", attrs: 'id="rk-save"' })}${btn("Cetak Etiket", "teal", { icon: "print", attrs: 'data-toast="Etiket racikan dikirim ke printer label"' })}${btn("Reset", "danger", { icon: "restart_alt", outline: true, attrs: 'id="rk-reset"' })}<span class="spacer"></span>${btn("Kirim ke Kasir", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' })}`,
          })}
          ${card({
            title: "Log racikan hari ini", desc: "Peracik & pemeriksa (double check)", icon: "history", flush: true,
            body: table({
              columns: [
                { label: "Jam", render: (x) => `<span class="mono">${x[0]}</span>` },
                { label: "Resep", render: (x) => `<span class="mono strong">${x[1]}</span><div class="t-sub">${esc(x[2])}</div>` },
                { label: "Sediaan", render: (x) => `${esc(x[3])}<div class="t-sub">${x[4]}</div>` },
                { label: "Peracik", key: 5 },
                { label: "Pemeriksa", key: 6 },
                { label: "Status", render: (x) => status(x[7]) },
              ],
              rows: [
                ["10:55", "0089", "Alya Putri (anak)", "Puyer Demam Batuk Anak", "15 bungkus", "Nabila P.", "apt. Rina W.", "Diracik"],
                ["09:48", "0084", "Kenzo A. (anak)", "Puyer Batuk Anak", "12 bungkus", "Nabila P.", "apt. Rina W.", "Diserahkan"],
                ["09:12", "0081", "Hendra Wijaya", "Kapsul racik", "20 kapsul", "Nabila P.", "apt. Rina W.", "Diserahkan"],
                ["08:30", "0077", "Maya S.", "Salep Racik Kulit", "1 pot 20 g", "Nabila P.", "apt. Rina W.", "Diserahkan"],
              ],
            }),
          })}
        </div>

        <div class="stack" style="gap:20px">
          ${card({
            title: "Preview etiket", desc: "Putih: obat dalam · Biru: obat luar", icon: "label", tone: "teal",
            tools: btn("", "teal", { icon: "print", size: "sm", title: "Cetak etiket", attrs: 'data-toast="Etiket racikan dicetak"' }),
            body: `<div id="rk-etiket">${rkEtiketHtml(f)}</div>`,
          })}
          ${card({
            title: "Peringatan & cek dosis", icon: "health_and_safety", tone: "red",
            body: `<div class="stack" id="rk-checks">${rkChecksHtml(c, f)}</div>`,
          })}
          ${card({
            title: "Formula tersimpan", desc: "Klik Muat untuk memakai template", icon: "bookmarks", tone: "purple", flush: true,
            body: `<div class="list" id="rk-tpl">${FORMULA.map((t) => `
              <div class="list-item"><div class="sq-ico purple">${icon(BENTUK[t.bentuk].ic)}</div>
                <div class="grow"><div class="title small">${esc(t.nama)}</div><div class="meta">${esc(t.bentuk)} · ${t.n} ${BENTUK[t.bentuk].unit} · ${t.komp.length} bahan · ${esc(t.dokter)}</div><div class="meta">dipakai ${t.pakai}x</div></div>
                ${btn("Muat", "purple", { size: "sm", icon: "download", attrs: `data-rk-load="${t.id}"` })}</div>`).join("")}</div>`,
          })}
          ${card({
            title: "Antrian racikan", icon: "hourglass_top", tone: "amber", flush: true,
            body: `<div class="list">${antri.map((r) => `
              <div class="list-item"><div class="avatar sm">${initials(r.pasien)}</div><div class="grow"><div class="title small">${esc(r.pasien)}</div><div class="meta">${suffix(r.no)} · ${esc(r.dokter)}</div></div>${status(r.status)}</div>`).join("")}</div>`,
          })}
        </div>
      </div>`;
    },

    mount(root) {
      const $ = (s) => root.querySelector(s);
      const tbody = $("#rk-tbl tbody");
      if (!tbody) return;

      const readF = () => ({
        nama: $("#rk-nama").value || "Racikan",
        bentuk: $("#rk-bentuk").value,
        n: Math.max(1, Math.round(+$("#rk-n").value || 1)),
        bb: +$("#rk-bb").value || 0,
        jasa: +$("#rk-jasa").value || 0,
        emb: +$("#rk-emb").value || 0,
        tuslah: +$("#rk-tuslah").value || 0,
        etiket: $("#rk-etiket-t").value,
        aturan: $("#rk-aturan").value,
        pasien: $("#rk-pasien").value,
        umur: $("#rk-umur").value,
        ref: $("#rk-ref").value,
        komp: [...tbody.querySelectorAll("tr[data-k]")].map((tr) => [tr.dataset.k, +tr.querySelector(".rk-dosis").value || 0]),
      });
      const recalc = () => {
        const f = readF();
        const c = calcRacik(f);
        const trs = tbody.querySelectorAll("tr[data-k]");
        c.rows.forEach((x, i) => {
          const tr = trs[i];
          tr.querySelector(".rk-tot").textContent = `${dec(x.total)} ${x.u}`;
          tr.querySelector(".rk-tab").innerHTML = rkTabHtml(x);
          tr.querySelector(".rk-kg").innerHTML = rkKgHtml(x);
          tr.querySelector(".rk-hrg").textContent = rp(x.harga);
        });
        $("#rk-cost").innerHTML = rkCostHtml(c, f);
        $("#rk-checks").innerHTML = rkChecksHtml(c, f);
        $("#rk-etiket").innerHTML = rkEtiketHtml(f);
        return c;
      };
      const rebuild = () => {
        const f = readF();
        tbody.innerHTML = calcRacik(f).rows.map(rkRowHtml).join("");
        recalc();
      };
      const setBentuk = (b, keepCost) => {
        const bt = BENTUK[b];
        root.querySelectorAll(".rk-unit").forEach((el) => { el.textContent = bt.unit; });
        $("#rk-unit-l").textContent = bt.unit;
        $("#rk-emb-l").textContent = bt.embLbl;
        if (!keepCost) { $("#rk-jasa").value = bt.jasa; $("#rk-emb").value = bt.emb; }
      };
      const load = (t) => {
        $("#rk-nama").value = t.nama;
        $("#rk-bentuk").value = t.bentuk;
        $("#rk-n").value = t.n;
        $("#rk-signa").value = t.signa;
        $("#rk-etiket-t").value = t.etiket;
        if (![...$("#rk-aturan").options].some((o) => o.value === t.aturan)) $("#rk-aturan").insertAdjacentHTML("beforeend", `<option>${esc(t.aturan)}</option>`);
        $("#rk-aturan").value = t.aturan;
        setBentuk(t.bentuk, false);
        tbody.innerHTML = calcRacik({ ...readF(), komp: t.komp }).rows.map(rkRowHtml).join("");
        recalc();
      };

      root.addEventListener("input", (e) => {
        if (e.target.matches("#rk-n, .rk-dosis, #rk-bb, #rk-jasa, #rk-emb, #rk-tuslah, #rk-nama, #rk-etiket-t, #rk-pasien, #rk-umur")) recalc();
      });
      root.addEventListener("change", (e) => {
        if (e.target.id === "rk-bentuk") { setBentuk(e.target.value, false); recalc(); }
        if (e.target.id === "rk-aturan" || e.target.id === "rk-ref") recalc();
      });
      root.addEventListener("click", (e) => {
        const del = e.target.closest("[data-rk-del]");
        if (del) {
          if (tbody.querySelectorAll("tr[data-k]").length <= 1) { UI.toast("Racikan minimal berisi 1 bahan", "warn"); return; }
          del.closest("tr").remove();
          rebuild();
        }
        const ld = e.target.closest("[data-rk-load]");
        if (ld) { const t = FORMULA.find((x) => x.id === ld.dataset.rkLoad); load(t); UI.toast(`Formula "${t.nama}" dimuat`, "info"); }
        if (e.target.closest("#rk-add")) {
          const k = $("#rk-add-sel").value;
          if (tbody.querySelector(`tr[data-k="${k}"]`)) { UI.toast(`${ob(k).nama} sudah ada di formula`, "warn"); return; }
          const [kek] = kekOf(k);
          tbody.insertAdjacentHTML("beforeend", rkRowHtml(calcRacik({ ...readF(), komp: [[k, kek / 4]] }).rows[0], tbody.children.length));
          rebuild();
        }
        if (e.target.closest("#rk-hitung")) { const c = recalc(); UI.toast(`Dihitung ulang · total ${rp(c.total)} (${rp(c.perUnit)}/${BENTUK[$("#rk-bentuk").value].unit})`, "info"); }
        if (e.target.closest("#rk-save")) UI.toast(`Formula "${$("#rk-nama").value}" disimpan ke template`, "success");
        if (e.target.closest("#rk-reset")) {
          UI.confirmBox({
            title: "Reset formula?", msg: "Semua perubahan komposisi & biaya akan dikembalikan ke formula resep awal.", okLabel: "Ya, reset", icon: "restart_alt",
            onOk: () => { load(FORMULA[0]); $("#rk-bb").value = 15; $("#rk-tuslah").value = TUSLAH; recalc(); UI.toast("Formula direset", "info"); },
          });
        }
      });
    },
  };

  /* ================================================================
     Riwayat transaksi (dipakai juga oleh retur)
     ================================================================ */
  const TRX = [
    ...DB.transaksi.map((t) => ({ ...t })),
    { no: "INV/PST/2609/0402", waktu: "09:25", pelanggan: "Umum", jenis: "Bebas", item: 2, total: 68000, bayar: "Tunai", kasir: "Fikri R.", status: "Lunas" },
    { no: "INV/PST/2609/0401", waktu: "09:18", pelanggan: "Dewi Lestari", jenis: "Resep", item: 4, total: 105800, bayar: "QRIS", kasir: "Nabila P.", status: "Lunas" },
    { no: "INV/PST/2609/0400", waktu: "09:06", pelanggan: "Umum", jenis: "Bebas", item: 4, total: 92500, bayar: "OVO", kasir: "Fikri R.", status: "Lunas" },
    { no: "INV/PST/2609/0399", waktu: "08:47", pelanggan: "Umum", jenis: "Bebas", item: 1, total: 395000, bayar: "Debit Mandiri", kasir: "Fikri R.", status: "Lunas" },
    { no: "INV/PST/2609/0398", waktu: "08:32", pelanggan: "Umum", jenis: "Racikan", item: 2, total: 88000, bayar: "Tunai", kasir: "Nabila P.", status: "Lunas" },
  ];
  // [kode, qty, harga satuan, unit]  — "RACIK" = racikan resep
  const TRX_ITEMS = {
    "0412": [["OB0017", 10, 940, "tab"], ["OB0019", 20, 830, "tab"], ["OB0021", 60, 610, "tab"], ["OB0020", 70, 2970, "tab"]],
    "0411": [["OB0028", 3, 8500, "pot"], ["OB0041", 4, 2000, "strip"]],
    "0410": [["OB0018", 60, 440, "tab"], ["OB0019", 30, 830, "tab"], ["RACIK", 20, 3935, "kaps"]],
    "0409": [["OB0041", 1, 2000, "strip"], ["OB0024", 1, 23000, "strip"], ["OB0034", 1, 56000, "btl"], ["OB0001", 2, 5500, "strip"], ["OB0031", 1, 35000, "box"]],
    "0408": [["OB0006", 20, 2090, "kaps"], ["OB0026", 4, 13200, "tube"]],
    "0407": [["OB0024", 30, 23000, "strip"], ["OB0026", 15, 12000, "tube"], ["OB0017", 5, 8500, "strip"], ["OB0018", 20, 4000, "strip"], ["OB0016", 20, 1500, "sach"], ["OB0013", 15, 10500, "strip"], ["OB0030", 10, 48000, "btl"], ["OB0041", 35, 2000, "strip"], ["OB0022", 25, 9500, "strip"], ["OB0040", 20, 5000, "strip"], ["OB0004", 25, 6000, "strip"], ["OB0015", 30, 6500, "strip"], ["OB0028", 10, 8500, "pot"], ["OB0008", 25, 11000, "strip"], ["OB0005", 35, 8500, "strip"], ["OB0019", 20, 7500, "strip"], ["OB0021", 30, 5500, "strip"], ["OB0032", 5, 39000, "pcs"]],
    "0406": [["OB0025", 2, 22500, "strip"]],
    "0405": [["OB0021", 30, 610, "tab"], ["OB0022", 30, 1050, "tab"], ["OB0017", 30, 940, "tab"], ["OB0019", 60, 830, "tab"], ["OB0020", 80, 2970, "tab"], ["OB0013", 20, 1160, "kaps"]],
    "0404": [["OB0002", 3, 14500, "strip"], ["OB0016", 1, 1500, "sach"], ["OB0001", 3, 5500, "strip"]],
    "0403": [["OB0017", 30, 940, "tab"], ["OB0020", 40, 2970, "tab"], ["OB0019", 30, 830, "tab"]],
    "0402": [["OB0023", 1, 45000, "tube"], ["OB0024", 1, 23000, "strip"]],
    "0401": [["OB0007", 3, 15400, "tab"], ["OB0039", 10, 330, "tab"], ["OB0013", 30, 1160, "kaps"], ["OB0040", 10, 550, "tab"]],
    "0400": [["OB0014", 2, 3500, "strip"], ["OB0015", 1, 6500, "strip"], ["OB0025", 2, 22500, "strip"], ["OB0028", 4, 8500, "pot"]],
    "0399": [["OB0033", 1, 395000, "unit"]],
    "0398": [["OB0040", 10, 550, "tab"], ["RACIK", 10, 7450, "kaps"]],
  };
  const JENIS_TONE = { Resep: "blue", Racikan: "purple", Bebas: "gray", B2B: "teal" };
  const PAY_IC = { Tunai: "payments", QRIS: "qr_code_2", "Debit BCA": "credit_card", "Debit Mandiri": "credit_card", "Kartu Kredit": "credit_card", Transfer: "account_balance", GoPay: "account_balance_wallet", OVO: "account_balance_wallet", "Tempo 30 hari": "schedule" };
  const KASIR = { "Fikri R.": "Fikri Ramadhan", "Nabila P.": "Nabila Putri", "Bayu K.": "Bayu Kurniawan" };
  const itemNama = (k) => (k === "RACIK" ? "Racikan kapsul (resep)" : ob(k).nama);

  const trxBreak = (t) => {
    const items = (TRX_ITEMS[suffix(t.no)] || []).map(([k, q, h, u]) => ({ k, nama: itemNama(k), gol: k === "RACIK" ? "keras" : ob(k).golongan, q, h, u, sub: q * h }));
    const sub = items.reduce((s, i) => s + i.sub, 0);
    const resep = t.jenis === "Resep" || t.jenis === "Racikan";
    const fee = resep ? items.length * (TUSLAH + EMBALASE) : 0;
    const disk = t.total - sub - fee;
    const bayar = t.bayar === "Tunai" ? Math.ceil(t.total / 50000) * 50000 : t.total;
    return { items, sub, fee, disk, bayar, kembali: bayar - t.total };
  };
  const receiptHtml = (t) => {
    const b = trxBreak(t);
    const p = pasienBy(t.pelanggan);
    return `<div class="receipt">
      <div class="c"><b>${esc(A.nama.toUpperCase())}</b><br>${esc(UI.cabangNama("PST"))}<br>${esc(A.alamat)}<br>NPWP ${esc(A.npwp)}</div>
      <hr>
      <div class="r"><span>${esc(t.no)}</span></div>
      <div class="r"><span>${tgl(DB.TODAY)} ${t.waktu}</span><span>Kasir: ${esc(t.kasir)}</span></div>
      <div class="r"><span>Pelanggan</span><span>${esc(t.pelanggan)}</span></div>
      ${p && p.id !== "UMUM" ? `<div class="r"><span>${esc(p.tipe)}</span><span>${esc(p.id)}</span></div>` : ""}
      <hr>
      ${b.items.map((i) => `<div>${esc(i.nama)}</div><div class="r"><span>&nbsp;${num(i.q)} ${esc(i.u)} x ${num(i.h)}</span><span>${num(i.sub)}</span></div>`).join("")}
      <hr>
      <div class="r"><span>Subtotal (${b.items.length} item)</span><span>${num(b.sub)}</span></div>
      ${b.fee ? `<div class="r"><span>Tuslah &amp; embalase</span><span>${num(b.fee)}</span></div>` : ""}
      ${b.disk ? `<div class="r"><span>${t.jenis === "B2B" ? "Diskon kontrak" : "Diskon member/pembulatan"}</span><span>${b.disk < 0 ? "-" : ""}${num(Math.abs(b.disk))}</span></div>` : ""}
      <div class="r" style="font-size:13px"><b>TOTAL</b><b>${num(t.total)}</b></div>
      <div class="r"><span>${esc(t.bayar)}</span><span>${num(b.bayar)}</span></div>
      ${t.bayar === "Tunai" ? `<div class="r"><span>Kembali</span><span>${num(b.kembali)}</span></div>` : ""}
      <hr>
      <div class="c">Harga sudah termasuk PPN 11%<br>Obat yang sudah dibeli tidak dapat<br>dikembalikan kecuali sesuai ketentuan retur.<br>Semoga lekas sembuh.</div>
      ${t.status === "Void" ? `<div class="c" style="margin-top:6px;font-size:16px;font-weight:800;letter-spacing:.2em">*** VOID ***</div>` : ""}
    </div>`;
  };

  const VOID_ALASAN = ["Salah input item/jumlah", "Pelanggan membatalkan pembelian", "Pembayaran gagal / terdebit ganda", "Salah metode pembayaran", "Transaksi uji coba"];
  const voidFlow = (t, root) => {
    let alasan = VOID_ALASAN[0], pin = "";
    UI.confirmBox({
      title: `Void ${suffix(t.no)}`, icon: "block", okLabel: "Void Transaksi", okVariant: "danger",
      msg: `Transaksi <b>${esc(t.no)}</b> senilai <b>${rp(t.total)}</b> akan dibatalkan dan stok dikembalikan. Tindakan ini tercatat di log audit.</p>
        <div class="stack" style="gap:12px;margin-top:4px">
          ${select("Alasan void", VOID_ALASAN, { id: "rw-void-alasan" })}
          ${input("PIN supervisor / apoteker", { id: "rw-void-pin", type: "password", ph: "4–6 digit", attrs: 'inputmode="numeric" maxlength="6" autocomplete="off"', hint: "Wajib diisi oleh supervisor shift atau Apoteker PJ" })}
        </div><p>`,
      onOk: () => {
        if (!/^\d{4,6}$/.test(pin)) { UI.toast("PIN supervisor tidak valid — void dibatalkan", "danger"); return; }
        t.status = "Void";
        const cell = root && root.querySelector(`[data-rw-status="${t.no}"]`);
        if (cell) cell.innerHTML = status("Void");
        const vb = root && root.querySelector(`[data-rw-void="${t.no}"]`);
        if (vb) vb.disabled = true;
        UI.toast(`${suffix(t.no)} di-void · ${alasan} · stok dikembalikan`, "success");
      },
    });
    const ov = document.getElementById("modal-overlay");
    if (!ov) return;
    ov.querySelector("#rw-void-alasan")?.addEventListener("change", (e) => { alasan = e.target.value; });
    ov.querySelector("#rw-void-pin")?.addEventListener("input", (e) => { pin = e.target.value.trim(); });
  };

  const openTrx = (t, root) => {
    const b = trxBreak(t);
    const p = pasienBy(t.pelanggan);
    const el = UI.modal.open({
      title: `Detail Transaksi ${suffix(t.no)}`, icon: "receipt_long", size: "lg",
      body: `<div class="grid g-3-2">
        <div class="stack">
          <div class="row" style="gap:8px">${status(t.status)}${badge(t.jenis, JENIS_TONE[t.jenis])}${badge(t.bayar, "cyan", { icon: PAY_IC[t.bayar] || "payments" })}</div>
          <dl class="kv">
            <dt>No. invoice</dt><dd class="mono">${esc(t.no)}</dd>
            <dt>Waktu</dt><dd>${tgl(DB.TODAY)} · ${t.waktu}</dd>
            <dt>Pelanggan</dt><dd>${esc(t.pelanggan)}${p && p.id !== "UMUM" ? ` · ${esc(p.tipe)}` : ""}</dd>
            <dt>Kasir</dt><dd>${esc(KASIR[t.kasir] || t.kasir)}</dd>
            <dt>Cabang</dt><dd>${esc(UI.cabangNama("PST"))}</dd>
          </dl>
          ${table({
            cls: "compact",
            columns: [
              { label: "Item", render: (i) => `<b>${esc(i.nama)}</b><div class="t-sub">${i.k === "RACIK" ? badge("Racikan", "purple") : golongan(i.gol)}</div>` },
              { label: "Qty", cls: "num", render: (i) => `${num(i.q)} ${esc(i.u)}` },
              { label: "Harga", cls: "num", render: (i) => rp(i.h) },
              { label: "Subtotal", cls: "num", render: (i) => `<b>${rp(i.sub)}</b>` },
            ],
            rows: b.items,
            foot: `${b.fee ? `<tr><td colspan="3">Tuslah &amp; embalase</td><td class="num">${rp(b.fee)}</td></tr>` : ""}${b.disk ? `<tr><td colspan="3">${t.jenis === "B2B" ? "Diskon kontrak B2B" : "Diskon member &amp; pembulatan"}</td><td class="num">${rp(b.disk)}</td></tr>` : ""}<tr><td colspan="3">Total</td><td class="num">${rp(t.total)}</td></tr>`,
          })}
          <div class="timeline" style="padding:0">
            <div class="tl green"><span class="d"></span><div><div class="t">Transaksi dibuat</div><div class="m">${t.waktu} · ${esc(KASIR[t.kasir] || t.kasir)}</div></div></div>
            <div class="tl ${t.status === "Piutang" ? "amber" : "green"}"><span class="d"></span><div><div class="t">${t.status === "Piutang" ? "Piutang tempo 30 hari" : `Dibayar via ${esc(t.bayar)}`}</div><div class="m">${addMin(t.waktu, 1)} · ${rp(t.total)}</div></div></div>
            ${t.status === "Void" ? `<div class="tl red"><span class="d"></span><div><div class="t">Void disetujui supervisor</div><div class="m">${addMin(t.waktu, 6)} · Pelanggan membatalkan pembelian</div></div></div>` : ""}
            ${t.status === "Retur Sebagian" ? `<div class="tl amber"><span class="d"></span><div><div class="t">Retur sebagian</div><div class="m">10:15 · RTJ/PST/2609/0013 · disetujui apt. Rina W.</div></div></div>` : ""}
          </div>
        </div>
        <div class="stack"><div class="lbl-sm center">Preview struk (thermal 58 mm)</div>${receiptHtml(t)}</div>
      </div>`,
      foot: `${btn("Tutup", "dark", { icon: "close", attrs: "data-close" })}${btn("Cetak Ulang Struk", "teal", { icon: "print", attrs: `data-toast="Struk ${suffix(t.no)} dicetak ulang (COPY)"` })}${t.status === "Lunas" ? `${btn("Retur", "warning", { icon: "assignment_return", attrs: 'data-go="retur"' })}${btn("Void", "danger", { icon: "block", attrs: 'id="rw-md-void"' })}` : ""}`,
    });
    el.querySelector("#rw-md-void")?.addEventListener("click", () => voidFlow(t, root));
  };

  window.PAGES.riwayat = {
    render() {
      const ok = TRX.filter((t) => t.status !== "Void");
      const omzet = ok.reduce((s, t) => s + t.total, 0);
      const opt = (arr) => ["Semua", ...new Set(arr)];

      return `
      ${UI.pageHeader({
        title: "Riwayat Transaksi",
        sub: "Seluruh transaksi penjualan: cetak ulang struk, lihat detail, retur, atau void dengan otorisasi supervisor.",
        crumbs: ["Transaksi", "Riwayat Transaksi"],
        actions: `${btn("Transaksi Baru", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' })}${btn("Export Excel", "glass", { icon: "table_view", attrs: 'data-toast="Riwayat transaksi diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Omzet (tanpa void)", value: short(omzet), icon: "payments", tone: "primary", delta: 5.3, foot: "vs kemarin jam yang sama", hero: true })}
        ${stat({ label: "Jumlah transaksi", value: num(TRX.length), icon: "receipt_long", tone: "success", foot: `${TRX.filter((t) => t.jenis === "Resep" || t.jenis === "Racikan").length} resep/racikan` })}
        ${stat({ label: "Rata-rata per transaksi", value: rp(omzet / ok.length), icon: "shopping_basket", tone: "info", foot: "basket size" })}
        ${stat({ label: "Void & retur", value: TRX.filter((t) => t.status === "Void" || t.status === "Retur Sebagian").length, icon: "block", tone: "danger", foot: `${badge("Perlu review", "red", { dot: true })}` })}
      </div>

      ${card({
        flush: true,
        body: `${UI.filterBar(`
            ${select("Jenis transaksi", opt(TRX.map((t) => t.jenis)), { id: "rw-jenis" })}
            ${select("Metode bayar", opt(TRX.map((t) => t.bayar)), { id: "rw-bayar" })}
            ${select("Kasir", opt(TRX.map((t) => t.kasir)), { id: "rw-kasir" })}
            ${input("Cari", { id: "rw-q", icon: "search", ph: "No. invoice / pelanggan" })}`)}
          <div id="rw-tbl">${table({
            columns: [
              { label: "No. Invoice", render: (t) => `<span class="mono strong">${esc(t.no)}</span><div class="t-sub">${tgl(DB.TODAY)} · ${t.waktu}</div>` },
              { label: "Pelanggan", render: (t) => { const p = pasienBy(t.pelanggan); return `${esc(t.pelanggan)}${p && p.id !== "UMUM" ? `<div class="t-sub">${esc(p.tipe)}</div>` : ""}`; } },
              { label: "Jenis", render: (t) => badge(t.jenis, JENIS_TONE[t.jenis]) },
              { label: "Item", cls: "num", render: (t) => t.item },
              { label: "Pembayaran", render: (t) => `<span class="row" style="gap:6px;flex-wrap:nowrap">${icon(PAY_IC[t.bayar] || "payments")}${esc(t.bayar)}</span>` },
              { label: "Kasir", key: "kasir" },
              { label: "Total", cls: "num", render: (t) => `<b>${rp(t.total)}</b>` },
              { label: "Status", render: (t) => `<span data-rw-status="${esc(t.no)}">${status(t.status)}</span>` },
              { label: "Aksi", cls: "actions", render: (t) => `<div class="btn-group">${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-rw-view="${esc(t.no)}"` })}${btn("", "teal", { icon: "print", size: "sm", title: "Cetak ulang struk", attrs: `data-toast="Struk ${suffix(t.no)} dicetak ulang (COPY)"` })}${btn("", "danger", { icon: "block", size: "sm", title: "Void", attrs: `data-rw-void="${esc(t.no)}" ${t.status === "Lunas" ? "" : "disabled"}` })}</div>` },
            ],
            rows: TRX,
            rowCls: (t) => (t.status === "Void" ? "row-danger" : ""),
            foot: `<tr><td colspan="6">Total <span id="rw-n">${TRX.length}</span> transaksi (tanpa void)</td><td class="num" id="rw-sum">${rp(omzet)}</td><td colspan="2"></td></tr>`,
          })}</div>
          ${pager(TRX.length, 25)}`,
      })}

      <div class="grid g-2">
        ${card({
          title: "Ringkasan per metode bayar", icon: "account_balance_wallet", tone: "cyan", flush: true,
          body: table({
            cls: "compact",
            columns: [
              { label: "Metode", render: (x) => `<span class="row" style="gap:6px">${icon(PAY_IC[x[0]] || "payments")}${esc(x[0])}</span>` },
              { label: "Trx", cls: "num", render: (x) => x[1] },
              { label: "Nilai", cls: "num", render: (x) => `<b>${rp(x[2])}</b>` },
              { label: "Porsi", render: (x) => `<div style="min-width:90px">${progress(x[2], omzet)}</div>` },
            ],
            rows: [...new Set(ok.map((t) => t.bayar))].map((m) => { const r = ok.filter((t) => t.bayar === m); return [m, r.length, r.reduce((s, t) => s + t.total, 0)]; }).sort((a, b) => b[2] - a[2]),
          }),
        })}
        ${card({
          title: "Kebijakan void & cetak ulang", icon: "policy", tone: "red",
          body: `<div class="stack">
            ${alert("warn", "block", "Void hanya untuk transaksi hari berjalan", "Wajib alasan dan PIN supervisor/Apoteker PJ. Transaksi yang sudah melewati tutup shift diproses melalui Retur Penjualan.")}
            ${alert("info", "print", "Cetak ulang struk", "Struk cetak ulang otomatis diberi tanda COPY dan tercatat di log audit.")}
            ${alert("danger", "shield", "Obat narkotika/psikotropika", "Void transaksi yang memuat narkotika/psikotropika memerlukan persetujuan Apoteker PJ dan penyesuaian register SIPNAP.")}
          </div>`,
        })}
      </div>`;
    },

    mount(root) {
      const rows = root.querySelectorAll("#rw-tbl tbody tr");
      const f = { jenis: root.querySelector("#rw-jenis"), bayar: root.querySelector("#rw-bayar"), kasir: root.querySelector("#rw-kasir"), q: root.querySelector("#rw-q") };
      const apply = () => {
        const q = (f.q.value || "").toLowerCase();
        let n = 0, sum = 0;
        TRX.forEach((t, i) => {
          const show = (f.jenis.value === "Semua" || t.jenis === f.jenis.value) && (f.bayar.value === "Semua" || t.bayar === f.bayar.value) && (f.kasir.value === "Semua" || t.kasir === f.kasir.value) && (!q || t.no.toLowerCase().includes(q) || t.pelanggan.toLowerCase().includes(q));
          if (rows[i]) rows[i].hidden = !show;
          if (show && t.status !== "Void") { n++; sum += t.total; }
        });
        root.querySelector("#rw-n").textContent = n;
        root.querySelector("#rw-sum").textContent = rp(sum);
      };
      [f.jenis, f.bayar, f.kasir].forEach((s) => s && s.addEventListener("change", apply));
      f.q && f.q.addEventListener("input", apply);

      root.addEventListener("click", (e) => {
        const v = e.target.closest("[data-rw-view]");
        if (v) openTrx(TRX.find((t) => t.no === v.dataset.rwView), root);
        const vd = e.target.closest("[data-rw-void]");
        if (vd && !vd.disabled) voidFlow(TRX.find((t) => t.no === vd.dataset.rwVoid), root);
      });
    },
  };

  /* ================================================================
     ROUTE: retur
     ================================================================ */
  const NON_RETUR = ["keras", "psikotropika", "narkotika", "prekursor", "oot"];
  const ALASAN_RETUR = ["Salah obat", "Rusak / kemasan cacat", "Reaksi alergi", "Kelebihan", "ED terlalu dekat"];
  const RETUR_INV = ["0409", "0410", "0402", "0400"];
  const RETUR_DEF = { "0409": { OB0034: [1, "Rusak / kemasan cacat"] } };
  const RETUR_HIST = [
    { no: "RTJ/PST/2609/0014", tgl: DB.iso(DB.TODAY), inv: "INV/PST/2609/0395", pel: "Umum", item: "Termometer Digital (1 pcs)", alasan: "Rusak / kemasan cacat", nilai: 39000, metode: "Tunai", oleh: "apt. Rina W.", status: "Selesai" },
    { no: "RTJ/PST/2609/0013", tgl: DB.iso(DB.TODAY), inv: "INV/PST/2609/0404", pel: "Umum", item: "Oralit 200 ml (1 sach)", alasan: "Kelebihan", nilai: 1500, metode: "Tunai", oleh: "apt. Rina W.", status: "Selesai" },
    { no: "RTJ/PST/2609/0012", tgl: DB.iso(DB.addDays(-1)), inv: "INV/PST/2509/0377", pel: "Siti Aminah", item: "Cendo Xitrol (1 btl)", alasan: "Salah obat", nilai: 48000, metode: "Kembali ke QRIS", oleh: "apt. Rina W.", status: "Disetujui" },
    { no: "RTJ/PST/2609/0011", tgl: DB.iso(DB.addDays(-1)), inv: "INV/PST/2509/0352", pel: "Agus Salim", item: "Asam Mefenamat 500 mg (1 strip)", alasan: "Reaksi alergi", nilai: 6000, metode: "Saldo deposit", oleh: "—", status: "Pending" },
    { no: "RTJ/PST/2609/0010", tgl: DB.iso(DB.addDays(-3)), inv: "INV/PST/2509/0288", pel: "Umum", item: "Vitamin C 1000 mg (2 tube)", alasan: "ED terlalu dekat", nilai: 90000, metode: "Tukar barang", oleh: "apt. Rina W.", status: "Selesai" },
    { no: "RTJ/PST/2609/0009", tgl: DB.iso(DB.addDays(-4)), inv: "INV/PST/2509/0251", pel: "Rudi Hartono", item: "Amoxicillin 500 mg (15 kaps)", alasan: "Kelebihan", nilai: 14100, metode: "—", oleh: "apt. Rina W.", status: "Ditolak" },
    { no: "RTJ/PST/2609/0008", tgl: DB.iso(DB.addDays(-6)), inv: "INV/PST/2509/0230", pel: "Lina Marlina", item: "Tensimeter Digital (1 unit)", alasan: "Rusak / kemasan cacat", nilai: 395000, metode: "Kembali ke Kartu Kredit", oleh: "apt. Rina W.", status: "Selesai" },
  ];

  const rtRowsHtml = (t) => {
    const b = trxBreak(t);
    const def = RETUR_DEF[suffix(t.no)] || {};
    return b.items.map((i) => {
      const locked = NON_RETUR.includes(i.gol) || i.k === "RACIK";
      const d = def[i.k];
      const bt = i.k === "RACIK" ? null : fefo(i.k);
      return `<tr data-harga="${i.h}" data-lock="${locked ? 1 : 0}" class="${locked ? "row-warn" : ""}">
        <td><input type="checkbox" class="rt-chk" aria-label="Pilih ${esc(i.nama)}" style="width:17px;height:17px;accent-color:var(--c-primary)" ${d ? "checked" : ""} ${locked ? "disabled" : ""}></td>
        <td style="min-width:180px"><b>${esc(i.nama)}</b><div class="t-sub">${i.k === "RACIK" ? badge("Racikan", "purple") : golongan(i.gol)}${bt ? ` · Batch ${esc(bt.batch)}` : ""}</div>${locked ? `<div style="margin-top:4px">${badge("Tidak dapat diretur", "red", { icon: "lock" })}</div>` : ""}</td>
        <td class="num">${num(i.q)} ${esc(i.u)}</td>
        <td class="num">${rp(i.h)}</td>
        <td><input class="input sm rt-qty" type="number" min="0" max="${i.q}" value="${d ? d[0] : 0}" aria-label="Qty retur" style="width:74px" ${locked ? "disabled" : ""}></td>
        <td><select class="select sm rt-alasan" aria-label="Alasan retur" ${locked ? "disabled" : ""}>${ALASAN_RETUR.map((a) => `<option ${d && d[1] === a ? "selected" : ""}>${a}</option>`).join("")}</select></td>
        <td class="num strong rt-sub">${rp(d ? d[0] * i.h : 0)}</td>
      </tr>`;
    }).join("");
  };
  const rtInfoHtml = (t) => {
    const b = trxBreak(t);
    const locked = b.items.filter((i) => NON_RETUR.includes(i.gol) || i.k === "RACIK").length;
    return `<dl class="kv">
        <dt>No. invoice</dt><dd class="mono">${esc(t.no)}</dd>
        <dt>Tanggal</dt><dd>${tgl(DB.TODAY)} · ${t.waktu}</dd>
        <dt>Pelanggan</dt><dd>${esc(t.pelanggan)}</dd>
        <dt>Kasir · bayar</dt><dd>${esc(t.kasir)} · ${esc(t.bayar)}</dd>
        <dt>Total invoice</dt><dd>${rp(t.total)}</dd>
        <dt>Batas retur</dt><dd>${badge("0 dari 7 hari", "green", { dot: true })}</dd>
      </dl>
      ${locked ? alert("warn", "lock", `${locked} item obat keras/racikan terkunci`, "Hanya dapat diretur bila terjadi kesalahan penyerahan oleh apotek — centang pengecualian di bawah (wajib persetujuan Apoteker PJ).") : ""}`;
  };

  window.PAGES.retur = {
    render() {
      const inv = TRX.find((t) => suffix(t.no) === "0409");
      const def = RETUR_DEF["0409"];
      const refund = trxBreak(inv).items.reduce((s, i) => s + (def[i.k] ? def[i.k][0] * i.h : 0), 0);
      const apt = DB.users.filter((u) => u.role === "Apoteker PJ");

      return `
      ${UI.pageHeader({
        title: "Retur Penjualan",
        sub: "Pengembalian barang dari pelanggan dengan struk asli, maksimal 7 hari. Barang retur masuk karantina sebelum dinilai layak jual.",
        crumbs: ["Transaksi", "Retur Penjualan"],
        actions: `${btn("Riwayat Transaksi", "white", { icon: "receipt_long", attrs: 'data-go="riwayat"' })}${btn("Export Excel", "glass", { icon: "table_view", attrs: 'data-toast="Data retur diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Retur bulan ini", value: "14", icon: "assignment_return", tone: "warning", delta: -12.5, foot: "vs bulan lalu", hero: true })}
        ${stat({ label: "Nilai retur", value: short(RETUR_HIST.filter((r) => r.status !== "Ditolak").reduce((s, r) => s + r.nilai, 0) + 648500), icon: "payments", tone: "danger", foot: "bulan berjalan" })}
        ${stat({ label: "Menunggu persetujuan", value: RETUR_HIST.filter((r) => r.status === "Pending").length, icon: "pending_actions", tone: "info", foot: "oleh Apoteker PJ" })}
        ${stat({ label: "Rasio retur", value: UI.pct(0.38, 2), icon: "percent", tone: "teal", foot: "dari total penjualan" })}
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Proses retur", desc: "Cari invoice, pilih item & qty yang dikembalikan", icon: "assignment_return", tone: "amber",
          body: `<div class="stack" style="gap:16px">
            <div class="row" style="align-items:flex-end;flex-wrap:nowrap">
              <div style="flex:1">${input("No. invoice / scan struk", { id: "rt-cari", icon: "qr_code_scanner", value: inv.no })}</div>
              ${btn("Cari", "info", { icon: "search", attrs: 'id="rt-cari-btn"' })}
            </div>
            <div class="row small" style="gap:8px"><span class="muted">Transaksi terbaru:</span><div class="chips" data-chip-group="rt-inv" style="padding:0">${RETUR_INV.map((n) => `<button type="button" class="chip ${n === "0409" ? "active" : ""}" data-rt-inv="${n}">${n} · ${esc(TRX.find((t) => suffix(t.no) === n).pelanggan)}</button>`).join("")}</div></div>
            <div id="rt-info">${rtInfoHtml(inv)}</div>
            <div class="table-wrap" style="border:1px solid var(--border);border-radius:var(--radius)"><table class="tbl compact" id="rt-tbl">
              <thead><tr><th></th><th>Obat</th><th class="num">Qty beli</th><th class="num">Harga</th><th>Qty retur</th><th>Alasan</th><th class="num">Nilai retur</th></tr></thead>
              <tbody>${rtRowsHtml(inv)}</tbody>
              <tfoot><tr><td colspan="6"><span id="rt-count">1</span> item diretur</td><td class="num" id="rt-total">${rp(refund)}</td></tr></tfoot>
            </table></div>
            <label class="check"><input type="checkbox" id="rt-override"> Pengecualian: kesalahan penyerahan oleh apotek (medication error) — buka kunci obat keras/racikan</label>
            <div class="form-grid cols-3">
              ${select("Metode pengembalian dana", ["Tunai dari laci kasir", "Kembali ke metode bayar asal", "Saldo deposit member", "Tukar barang sejenis"], { id: "rt-metode" })}
              ${select("Kondisi barang", ["Karantina — dinilai apoteker", "Layak jual, kembali ke stok", "Tidak layak — usulan pemusnahan"], { id: "rt-kondisi" })}
              ${select("Disetujui oleh", apt.map((u) => `apt. ${u.nama}`), { id: "rt-apt" })}
              ${input("PIN apoteker", { id: "rt-pin", type: "password", ph: "••••", attrs: 'inputmode="numeric" maxlength="6" autocomplete="off"' })}
              ${textarea("Catatan", { cls: "span-2", value: "Segel botol Tempra sobek saat dibuka di rumah, isi utuh. Batch dicatat untuk laporan ke PBF." })}
            </div>
          </div>`,
          foot: `${btn("Batal", "light", { icon: "close", attrs: 'data-toast="Proses retur dibatalkan" data-tone="info"' })}${btn("Ajukan Persetujuan", "primary", { icon: "send", attrs: 'id="rt-ajukan"' })}<span class="spacer"></span>${btn("Proses Retur & Cetak Nota", "success", { icon: "task_alt", attrs: 'id="rt-proses"' })}`,
        })}
        <div class="stack" style="gap:20px">
          ${card({
            title: "Ketentuan retur", icon: "gavel", tone: "red",
            body: `<div class="stack">
              ${alert("danger", "lock", "Obat keras, resep & racikan", "Obat keras, psikotropika, narkotika, prekursor, OOT, serta obat resep/racikan yang sudah diserahkan <b style='display:inline'>tidak dapat diretur</b>, kecuali kesalahan penyerahan oleh apotek (salah obat/dosis) dengan persetujuan Apoteker PJ dan dicatat sebagai insiden keselamatan pasien.")}
              ${alert("warn", "event", "Batas waktu 7 hari", "Retur hanya dilayani maksimal 7 hari sejak tanggal transaksi dengan struk asli, kemasan & segel utuh, batch/ED sesuai struk.")}
              ${alert("warn", "ac_unit", "Produk rantai dingin", "Vaksin, insulin, suppositoria & produk rantai dingin lain tidak dapat diretur setelah keluar dari apotek.")}
              ${alert("info", "vaccines", "Reaksi alergi", "Retur karena reaksi alergi wajib diikuti pelaporan MESO (e-MESO BPOM) dan pencatatan alergi pada profil pasien.")}
            </div>`,
          })}
          ${card({
            title: "Ringkasan refund", icon: "request_quote", tone: "cyan",
            body: `<div class="big-total"><div class="l">Total dikembalikan</div><div class="v" id="rt-big">${rp(refund)}</div></div>
              <div class="small muted center" style="margin-top:10px" id="rt-big-sub">Tunai dari laci kasir · mengurangi kas shift berjalan</div>`,
          })}
        </div>
      </div>

      ${card({
        title: "Riwayat retur", desc: "7 hari terakhir", icon: "history", flush: true,
        tools: `<div class="chips" data-chip-group="rt-h" style="padding:0"><button type="button" class="chip active">Semua</button><button type="button" class="chip">Pending</button><button type="button" class="chip">Selesai</button><button type="button" class="chip">Ditolak</button></div>`,
        body: table({
          columns: [
            { label: "No. Retur", render: (r) => `<span class="mono strong">${esc(r.no)}</span><div class="t-sub">${tgl(r.tgl)}</div>` },
            { label: "Invoice asal", render: (r) => `<span class="mono small">${esc(r.inv)}</span>` },
            { label: "Pelanggan", key: "pel" },
            { label: "Item", render: (r) => esc(r.item) },
            { label: "Alasan", render: (r) => badge(r.alasan, { "Salah obat": "red", "Rusak / kemasan cacat": "amber", "Reaksi alergi": "pink", Kelebihan: "gray", "ED terlalu dekat": "purple" }[r.alasan]) },
            { label: "Nilai", cls: "num", render: (r) => `<b>${rp(r.nilai)}</b>` },
            { label: "Refund", render: (r) => esc(r.metode) },
            { label: "Disetujui", render: (r) => esc(r.oleh) },
            { label: "Status", render: (r) => status(r.status) },
            { label: "Aksi", cls: "actions", render: (r) => rowActions(r.status === "Pending" ? ["view", "approve"] : ["view", "print"], r.no) },
          ],
          rows: RETUR_HIST,
        }),
      })}`;
    },

    mount(root) {
      const $ = (s) => root.querySelector(s);
      const tbody = $("#rt-tbl tbody");
      if (!tbody) return;
      let cur = TRX.find((t) => suffix(t.no) === "0409");

      const recalc = () => {
        let tot = 0, n = 0;
        tbody.querySelectorAll("tr").forEach((tr) => {
          const chk = tr.querySelector(".rt-chk");
          const q = tr.querySelector(".rt-qty");
          const max = +q.max;
          if (+q.value > max) q.value = max;
          if (chk.checked && +q.value === 0) q.value = 1;
          const v = chk.checked ? (+q.value || 0) * +tr.dataset.harga : 0;
          tr.querySelector(".rt-sub").textContent = rp(v);
          if (v) { tot += v; n++; }
        });
        $("#rt-total").textContent = rp(tot);
        $("#rt-count").textContent = n;
        $("#rt-big").textContent = rp(tot);
        const m = $("#rt-metode").value;
        $("#rt-big-sub").textContent = m.startsWith("Tunai") ? "Tunai dari laci kasir · mengurangi kas shift berjalan" : m === "Kembali ke metode bayar asal" ? `Dikembalikan ke ${cur.bayar} · 1–3 hari kerja` : m;
        return { tot, n };
      };
      const loadInv = (t) => {
        cur = t;
        $("#rt-info").innerHTML = rtInfoHtml(t);
        tbody.innerHTML = rtRowsHtml(t);
        $("#rt-cari").value = t.no;
        $("#rt-override").checked = false;
        root.querySelectorAll("[data-rt-inv]").forEach((c) => c.classList.toggle("active", c.dataset.rtInv === suffix(t.no)));
        recalc();
      };

      tbody.addEventListener("input", recalc);
      tbody.addEventListener("change", (e) => {
        if (e.target.matches(".rt-qty")) { const chk = e.target.closest("tr").querySelector(".rt-chk"); chk.checked = +e.target.value > 0; }
        recalc();
      });
      $("#rt-metode").addEventListener("change", recalc);
      $("#rt-override").addEventListener("change", (e) => {
        tbody.querySelectorAll('tr[data-lock="1"]').forEach((tr) => tr.querySelectorAll("input,select").forEach((x) => { x.disabled = !e.target.checked; }));
        if (e.target.checked) UI.toast("Kunci dibuka — wajib laporan insiden & persetujuan Apoteker PJ", "warn");
        recalc();
      });
      root.addEventListener("click", (e) => {
        const c = e.target.closest("[data-rt-inv]");
        if (c) loadInv(TRX.find((t) => suffix(t.no) === c.dataset.rtInv));
        if (e.target.closest("#rt-cari-btn")) {
          const q = $("#rt-cari").value.trim().toUpperCase();
          const t = TRX.find((x) => x.no === q || suffix(x.no) === q);
          if (!t) UI.toast("Invoice tidak ditemukan atau lewat batas 7 hari", "danger");
          else if (t.status === "Void") UI.toast("Invoice sudah di-void, tidak dapat diretur", "warn");
          else loadInv(t);
        }
        if (e.target.closest("#rt-ajukan")) {
          const r = recalc();
          if (!r.n) { UI.toast("Pilih minimal 1 item untuk diretur", "warn"); return; }
          UI.toast(`Pengajuan retur ${rp(r.tot)} dikirim ke ${$("#rt-apt").value}`, "info");
        }
        if (e.target.closest("#rt-proses")) {
          const r = recalc();
          if (!r.n) { UI.toast("Pilih minimal 1 item untuk diretur", "warn"); return; }
          if (!/^\d{4,6}$/.test($("#rt-pin").value)) { UI.toast("PIN apoteker wajib diisi (4–6 digit)", "danger"); $("#rt-pin").focus(); return; }
          UI.confirmBox({
            title: "Proses retur?", icon: "assignment_return", okLabel: "Proses Retur", okVariant: "success",
            msg: `${r.n} item dari <b>${esc(cur.no)}</b> senilai <b>${rp(r.tot)}</b> akan dikembalikan via <b>${esc($("#rt-metode").value)}</b>. Barang masuk status: ${esc($("#rt-kondisi").value)}.`,
            onOk: () => UI.toast(`Retur RTJ/PST/2609/0015 diproses · nota retur dicetak`, "success"),
          });
        }
      });
    },
  };

  /* ================================================================
     ROUTE: shift
     ================================================================ */
  const SHIFT = { kasir: "Fikri Ramadhan", shift: "Pagi", jam: "07:00–15:00", buka: "07:02", terminal: "Kasir 01", modal: 500000, tunai: 4286500, trxTunai: 58, retur: 39000, setor: 3000000 };
  const NONTUNAI = [["QRIS", 38, 2145000, "qr_code_2"], ["Debit BCA", 11, 1320500, "credit_card"], ["Debit Mandiri", 5, 486000, "credit_card"], ["Kartu Kredit", 4, 912000, "credit_card"], ["GoPay / OVO", 9, 214500, "account_balance_wallet"], ["Transfer", 1, 98500, "account_balance"]];
  const KAS_KECIL = [
    ["08:15", "Air galon 2 × Rp 21.000", "Operasional", 42000, "Fikri R.", true],
    ["09:40", "Kertas perkamen & plastik klip racikan", "Perlengkapan racik", 38000, "Nabila P.", true],
    ["11:05", "Ongkir kurir antar obat ke pasien", "Transport", 25000, "Fikri R.", true],
    ["12:30", "Konsumsi rapat singkat apoteker", "Konsumsi", 45000, "apt. Rina W.", false],
    ["13:10", "Fotokopi salinan resep & formulir MESO", "ATK", 35000, "Nabila P.", true],
  ];
  const DENOM = [[100000, 8], [50000, 7], [20000, 12], [10000, 9], [5000, 10], [2000, 12], [1000, 5]];
  const KOIN = 1500;
  const kasKecil = KAS_KECIL.reduce((s, k) => s + k[3], 0);
  const nonTunai = NONTUNAI.reduce((s, x) => s + x[2], 0);
  const expected = SHIFT.modal + SHIFT.tunai - SHIFT.retur - kasKecil - SHIFT.setor;
  const HIST = [
    { tgl: -1, shift: "Malam", jam: "23:00–07:00", kasir: "Yusuf Maulana", tunai: 1245000, non: 986500, kk: 0, setor: 0, sel: 0, st: "Disetujui" },
    { tgl: -1, shift: "Siang", jam: "15:00–23:00", kasir: "Anisa Rahma", tunai: 3912000, non: 4408500, kk: 85000, setor: 3000000, sel: -2000, st: "Disetujui" },
    { tgl: -1, shift: "Pagi", jam: "07:00–15:00", kasir: "Fikri Ramadhan", tunai: 4105500, non: 5022000, kk: 120000, setor: 3000000, sel: 500, st: "Disetujui" },
    { tgl: -2, shift: "Malam", jam: "23:00–07:00", kasir: "Yusuf Maulana", tunai: 1108000, non: 874000, kk: 0, setor: 0, sel: 0, st: "Disetujui" },
    { tgl: -2, shift: "Siang", jam: "15:00–23:00", kasir: "Anisa Rahma", tunai: 3640500, non: 4215000, kk: 64000, setor: 3000000, sel: -15000, st: "Pending" },
    { tgl: -2, shift: "Pagi", jam: "07:00–15:00", kasir: "Fikri Ramadhan", tunai: 3987000, non: 4876500, kk: 97500, setor: 3000000, sel: 0, st: "Disetujui" },
  ];
  const selisihBadge = (s) => (s === 0 ? badge("Sesuai", "green", { icon: "check_circle" }) : s > 0 ? badge(`Lebih ${rp(s)}`, "blue", { icon: "arrow_upward" }) : badge(`Kurang ${rp(-s)}`, s >= -5000 ? "amber" : "red", { icon: "arrow_downward" }));

  window.PAGES.shift = {
    render({ state }) {
      const cab = UI.cabangNama(state.cabang === "ALL" ? "PST" : state.cabang);
      const fisik = DENOM.reduce((s, [v, n]) => s + v * n, 0) + KOIN;

      return `
      ${UI.pageHeader({
        title: "Shift & Kas",
        sub: `Buka/tutup shift kasir, hitung uang fisik per pecahan, setoran brankas, dan kas kecil — <b>${esc(cab)}</b>.`,
        crumbs: ["Transaksi", "Shift & Kas"],
        actions: `${btn("Buka Shift", "success", { icon: "lock_open", attrs: 'id="sh-buka"' })}${btn("Tutup Shift", "danger", { icon: "lock", attrs: 'id="sh-tutup"' })}${btn("Setor ke Brankas", "primary", { icon: "savings", attrs: 'id="sh-setor"' })}${btn("Cetak Laporan Shift", "teal", { icon: "print", attrs: 'data-toast="Laporan shift (X-report) dicetak"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Kas seharusnya di laci", value: rp(expected), icon: "point_of_sale", tone: "primary", foot: "modal + tunai − retur − kas kecil − setoran", hero: true })}
        ${stat({ label: "Penjualan tunai", value: short(SHIFT.tunai), icon: "payments", tone: "success", foot: `${SHIFT.trxTunai} transaksi` })}
        ${stat({ label: "Non tunai", value: short(nonTunai), icon: "credit_card", tone: "info", foot: `${NONTUNAI.reduce((s, x) => s + x[1], 0)} transaksi · tidak masuk laci` })}
        ${stat({ label: "Kas kecil terpakai", value: rp(kasKecil), icon: "wallet", tone: "warning", foot: `sisa plafon ${rp(500000 - kasKecil)}` })}
      </div>

      <div class="grid g-3-2">
        <div class="stack" style="gap:20px">
          ${card({
            title: "Shift aktif", desc: `${SHIFT.shift} · ${SHIFT.jam}`, icon: "badge", tone: "green",
            tools: badge("Aktif", "green", { dot: true }),
            body: `<div class="row" style="gap:14px;margin-bottom:14px"><div class="avatar">${initials(SHIFT.kasir)}</div><div class="grow"><div class="strong">${esc(SHIFT.kasir)}</div><div class="small muted">Kasir · ${esc(SHIFT.terminal)} · ${esc(cab)}</div></div>${badge(`Dibuka ${SHIFT.buka}`, "blue", { icon: "schedule" })}</div>
              <div class="grid g-2" style="gap:24px">
                <div>
                  <div class="lbl-sm" style="margin-bottom:8px">Ringkasan kas tunai</div>
                  <dl class="kv">
                    <dt>Modal awal</dt><dd>${rp(SHIFT.modal)}</dd>
                    <dt>+ Penjualan tunai</dt><dd>${rp(SHIFT.tunai)}</dd>
                    <dt>− Retur tunai</dt><dd style="color:var(--t-red-fg)">${rp(SHIFT.retur)}</dd>
                    <dt>− Pengeluaran kas kecil</dt><dd style="color:var(--t-red-fg)">${rp(kasKecil)}</dd>
                    <dt>− Setoran ke brankas (12:05)</dt><dd style="color:var(--t-red-fg)">${rp(SHIFT.setor)}</dd>
                  </dl>
                  <div class="dashed"></div>
                  <div class="row between"><b>Kas seharusnya</b><b class="num" style="font-size:18px;color:var(--c-primary)">${rp(expected)}</b></div>
                </div>
                <div>
                  <div class="lbl-sm" style="margin-bottom:8px">Non tunai per metode</div>
                  <div class="stack" style="gap:8px">${NONTUNAI.map(([m, n, v, ic]) => `<div class="row between small" style="flex-wrap:nowrap"><span class="row" style="gap:6px;flex-wrap:nowrap">${icon(ic)}${esc(m)} <span class="muted">(${n})</span></span><b class="num">${rp(v)}</b></div>`).join("")}</div>
                  <div class="dashed"></div>
                  <div class="row between"><b>Total non tunai</b><b class="num">${rp(nonTunai)}</b></div>
                  <div class="small muted" style="margin-top:4px">Piutang B2B tempo (${rp(3450000)}) tidak dihitung di kas shift.</div>
                </div>
              </div>`,
          })}
          ${card({
            title: "Kas kecil (petty cash)", desc: `Plafon ${rp(500000)} per shift · wajib bukti`, icon: "wallet", tone: "amber", flush: true,
            tools: btn("Tambah Pengeluaran", "success", { size: "sm", icon: "add", attrs: 'id="sh-kk-add"' }),
            body: table({
              columns: [
                { label: "Jam", render: (k) => `<span class="mono">${k[0]}</span>` },
                { label: "Keterangan", render: (k) => `<b>${esc(k[1])}</b><div class="t-sub">${esc(k[2])}</div>` },
                { label: "Dicatat", render: (k) => esc(k[4]) },
                { label: "Bukti", render: (k) => (k[5] ? badge("Nota ada", "green", { icon: "receipt" }) : badge("Belum ada nota", "amber", { icon: "warning" })) },
                { label: "Nominal", cls: "num", render: (k) => `<b>${rp(k[3])}</b>` },
                { label: "Aksi", cls: "actions", render: (k) => rowActions(["view", "edit", "delete"], k[1]) },
              ],
              rows: KAS_KECIL,
              foot: `<tr><td colspan="4">Total kas kecil</td><td class="num">${rp(kasKecil)}</td><td></td></tr>`,
            }),
          })}
        </div>

        ${card({
          title: "Hitung uang fisik (tutup shift)", desc: "Isi jumlah lembar per pecahan", icon: "calculate", tone: "blue",
          body: `<div class="table-wrap"><table class="tbl compact" id="sh-den">
              <thead><tr><th>Pecahan</th><th>Lembar</th><th class="num">Subtotal</th></tr></thead>
              <tbody>${DENOM.map(([v, n]) => `<tr><td class="strong num" style="text-align:left">${rp(v)}</td><td><input class="input sm sh-lbr" type="number" min="0" value="${n}" data-v="${v}" aria-label="Jumlah lembar ${rp(v)}" style="width:86px"></td><td class="num sh-sub">${rp(v * n)}</td></tr>`).join("")}
                <tr><td class="strong">Koin (total)</td><td><input class="input sm" id="sh-koin" type="number" min="0" step="500" value="${KOIN}" aria-label="Total koin" style="width:110px"></td><td class="num" id="sh-koin-sub">${rp(KOIN)}</td></tr>
              </tbody>
            </table></div>
            <div class="stack" style="gap:8px;margin-top:14px">
              <div class="row between"><span>Total uang fisik</span><b class="num" id="sh-fisik">${rp(fisik)}</b></div>
              <div class="row between"><span>Kas seharusnya</span><b class="num">${rp(expected)}</b></div>
              <div class="dashed"></div>
              <div class="row between"><b>Selisih</b><span id="sh-sel">${selisihBadge(fisik - expected)}</span></div>
              <div id="sh-sel-alert">${fisik - expected < 0 ? alert("warn", "warning", "Uang fisik kurang", "Hitung ulang sebelum menutup shift. Selisih wajib diberi keterangan dan disetujui supervisor.") : ""}</div>
              ${textarea("Keterangan selisih", { ph: "Mis. kembalian kurang ke pelanggan INV…" })}
            </div>`,
          foot: `${btn("Hitung Ulang", "primary", { icon: "calculate", attrs: 'id="sh-hitung"' })}${btn("Tutup Shift", "danger", { icon: "lock", attrs: 'id="sh-tutup2"' })}`,
        })}
      </div>

      ${card({
        title: "Riwayat shift", desc: `${esc(cab)} · 2 hari terakhir`, icon: "history", flush: true,
        tools: btn("Export Excel", "teal", { size: "sm", icon: "table_view", attrs: 'data-toast="Riwayat shift diekspor ke Excel (.xlsx)"' }),
        body: table({
          columns: [
            { label: "Tanggal / shift", render: (h) => `<b>${tgl(DB.addDays(h.tgl))}</b><div class="t-sub">${h.shift} · ${h.jam}</div>` },
            { label: "Kasir", render: (h) => `<div class="row" style="gap:8px;flex-wrap:nowrap"><div class="avatar sm">${initials(h.kasir)}</div>${esc(h.kasir)}</div>` },
            { label: "Modal", cls: "num", render: () => rp(500000) },
            { label: "Tunai", cls: "num", render: (h) => rp(h.tunai) },
            { label: "Non tunai", cls: "num", render: (h) => rp(h.non) },
            { label: "Setoran", cls: "num", render: (h) => rp(h.setor) },
            { label: "Seharusnya", cls: "num", render: (h) => rp(500000 + h.tunai - h.kk - h.setor) },
            { label: "Fisik", cls: "num", render: (h) => `<b>${rp(500000 + h.tunai - h.kk - h.setor + h.sel)}</b>` },
            { label: "Selisih", render: (h) => selisihBadge(h.sel) },
            { label: "Status", render: (h) => status(h.st) },
            { label: "Aksi", cls: "actions", render: (h) => rowActions(h.st === "Pending" ? ["view", "approve"] : ["view", "print"], `Shift ${h.shift} ${h.kasir}`) },
          ],
          rows: HIST,
          rowCls: (h) => (h.sel < -5000 ? "row-danger" : ""),
        }),
      })}`;
    },

    mount(root) {
      const $ = (s) => root.querySelector(s);
      const den = $("#sh-den");
      if (!den) return;
      const calc = () => {
        let tot = 0;
        den.querySelectorAll(".sh-lbr").forEach((i) => {
          const v = (+i.dataset.v) * Math.max(0, Math.round(+i.value || 0));
          tot += v;
          i.closest("tr").querySelector(".sh-sub").textContent = rp(v);
        });
        const koin = Math.max(0, +$("#sh-koin").value || 0);
        $("#sh-koin-sub").textContent = rp(koin);
        tot += koin;
        const sel = tot - expected;
        $("#sh-fisik").textContent = rp(tot);
        $("#sh-sel").innerHTML = selisihBadge(sel);
        $("#sh-sel-alert").innerHTML = sel < 0 ? alert(sel < -5000 ? "danger" : "warn", "warning", "Uang fisik kurang", "Hitung ulang sebelum menutup shift. Selisih wajib diberi keterangan dan disetujui supervisor.") : sel > 0 ? alert("info", "info", "Uang fisik lebih", "Kelebihan dicatat sebagai pendapatan lain-lain setelah diverifikasi.") : alert("success", "task_alt", "Kas sesuai", "Uang fisik sama dengan kas seharusnya. Shift siap ditutup.");
        return { tot, sel };
      };
      den.addEventListener("input", calc);

      const tutup = () => {
        const r = calc();
        UI.confirmBox({
          title: "Tutup shift Pagi?", icon: "lock", okLabel: "Tutup Shift", okVariant: "danger",
          msg: `Kasir <b>${esc(SHIFT.kasir)}</b> · uang fisik <b>${rp(r.tot)}</b> vs seharusnya <b>${rp(expected)}</b> — selisih <b>${r.sel === 0 ? "Rp 0 (sesuai)" : (r.sel > 0 ? "+" : "−") + rp(Math.abs(r.sel))}</b>. Setelah ditutup, transaksi tidak dapat di-void dan laporan Z dicetak.`,
          onOk: () => UI.toast(`Shift ditutup · laporan Z dicetak${r.sel ? " · selisih menunggu persetujuan supervisor" : ""}`, r.sel < 0 ? "warn" : "success"),
        });
      };
      root.addEventListener("click", (e) => {
        if (e.target.closest("#sh-hitung")) { const r = calc(); UI.toast(`Total fisik ${rp(r.tot)} · selisih ${rp(r.sel)}`, r.sel === 0 ? "success" : "warn"); }
        if (e.target.closest("#sh-tutup, #sh-tutup2")) tutup();
        if (e.target.closest("#sh-buka")) {
          UI.modal.open({
            title: "Buka Shift", icon: "lock_open", size: "sm",
            body: `${alert("warn", "info", "Shift Pagi masih aktif", "Tutup shift berjalan terlebih dahulu sebelum membuka shift baru di terminal ini.")}
              <div class="form-grid">
                ${select("Kasir", DB.users.filter((u) => u.role === "Kasir" || u.role.startsWith("TTK")).map((u) => u.nama), { cls: "full" })}
                ${select("Shift", ["Pagi 07:00–15:00", "Siang 15:00–23:00", "Malam 23:00–07:00"], { value: "Siang 15:00–23:00" })}
                ${select("Terminal", ["Kasir 01", "Kasir 02", "Kasir Resep"])}
                ${input("Modal awal (Rp)", { type: "number", value: 500000, cls: "full", hint: "Diterima dari brankas, dihitung bersama supervisor" })}
              </div>`,
            foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Buka Shift", "success", { icon: "lock_open", attrs: 'data-close data-toast="Shift Siang dibuka · modal awal Rp 500.000"' })}`,
          });
        }
        if (e.target.closest("#sh-setor")) {
          UI.modal.open({
            title: "Setor ke Brankas", icon: "savings", size: "sm",
            body: `<dl class="kv"><dt>Kas saat ini di laci</dt><dd>${rp(expected)}</dd><dt>Setoran sebelumnya</dt><dd>${rp(SHIFT.setor)} (12:05)</dd></dl>
              <div class="form-grid">
                ${input("Nominal setoran (Rp)", { type: "number", value: 1000000, cls: "full" })}
                ${select("Saksi / penerima", ["apt. Rina Wulandari", "Teguh Santoso (Keuangan)"], { cls: "full" })}
                ${input("No. kantong / segel", { value: "BRK-PST-2609-07", cls: "full" })}
              </div>
              ${alert("info", "info", "Batas uang di laci", `Setor bila kas tunai di laci melebihi ${rp(2000000)} untuk keamanan.`)}`,
            foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Setor", "primary", { icon: "savings", attrs: 'data-close data-toast="Setoran Rp 1.000.000 ke brankas tercatat"' })}`,
          });
        }
        if (e.target.closest("#sh-kk-add")) {
          UI.modal.open({
            title: "Tambah Pengeluaran Kas Kecil", icon: "wallet", size: "sm",
            body: `<div class="form-grid">
                ${input("Keterangan", { cls: "full", ph: "Mis. beli tisu & sabun cuci tangan" })}
                ${select("Kategori", ["Operasional", "Perlengkapan racik", "Transport", "Konsumsi", "ATK", "Kebersihan"])}
                ${input("Nominal (Rp)", { type: "number", ph: "0" })}
                ${input("Foto nota / bukti", { type: "file", cls: "full" })}
              </div>
              ${alert("warn", "warning", `Sisa plafon ${rp(500000 - kasKecil)}`, "Pengeluaran di atas plafon memerlukan persetujuan Apoteker PJ.")}`,
            foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan", "success", { icon: "save", attrs: 'data-close data-toast="Pengeluaran kas kecil dicatat"' })}`,
          });
        }
      });
    },
  };
})();
