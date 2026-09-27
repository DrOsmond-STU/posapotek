/* Relasi: Pasien & Member, Dokter */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, short, table, badge, chart, esc, progress, tgl, input, select, textarea, modal, alert, tabs, golongan, pager } = UI;

  /* ---------- Helper umum ---------- */
  const inisial = (n) => n.replace(/^(dr|drg|apt)\.\s*/i, "").split(/[\s,]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  const TONES = ["primary", "purple", "teal", "pink", "info", "warning", "success"];
  const avatar = (nama, i = 0, size = "") => {
    const t = TONES[i % TONES.length];
    const dim = size === "lg" ? "width:56px;height:56px;font-size:18px;" : "";
    return `<div class="avatar ${size === "sm" ? "sm" : ""}" style="${dim}background:linear-gradient(135deg,var(--c-${t}),var(--c-${t}-2))">${esc(inisial(nama))}</div>`;
  };
  const umur = (lahir) => (lahir && lahir !== "-" ? DB.TODAY.getFullYear() - Number(lahir.slice(0, 4)) : 0);
  const obatBy = (nama) => DB.obat.find((o) => o.nama === nama) || { golongan: "bebas", satuan: "Strip" };
  const dokterBy = (id) => DB.dokter.find((d) => d.id === id) || { nama: "-", faskes: "-" };
  const hari = (n) => DB.iso(DB.addDays(n));

  /* =====================================================================
     PASIEN & MEMBER
     ===================================================================== */
  const TIPE = {
    "Member Gold": { short: "Gold", tone: "amber", f: "gold" },
    "Member Silver": { short: "Silver", tone: "gray", f: "silver" },
    "Member Reguler": { short: "Reguler", tone: "blue", f: "reguler" },
  };
  const TIER = [
    { nama: "Reguler", min: 0, mult: "1x poin", benefit: "Poin 1 per Rp 10.000, riwayat obat tersimpan" },
    { nama: "Silver", min: 2000000, mult: "1,25x poin", benefit: "Diskon 3% obat bebas, pengingat refill otomatis" },
    { nama: "Gold", min: 7500000, mult: "1,5x poin", benefit: "Diskon 5%, antar obat gratis, konsultasi apoteker prioritas" },
    { nama: "Platinum", min: 15000000, mult: "2x poin", benefit: "Diskon 7%, cek gula darah & tensi gratis tiap bulan" },
  ];

  const EXTRA = [
    { id: "MB-00302", nama: "Yohanes Kristanto", hp: "0813-8890-1122", tipe: "Member Silver", poin: 1120, total: 3980000, kunjungan: 21, alergi: "-", lahir: "1968-03-09", bpjs: "0005566778899" },
    { id: "MB-00315", nama: "Nur Aisyah", hp: "0812-7765-4432", tipe: "Member Reguler", poin: 340, total: 1250000, kunjungan: 9, alergi: "Ibuprofen", lahir: "1995-08-25", bpjs: "-" },
    { id: "MB-00321", nama: "Wahyu Hidayat", hp: "0856-2233-9811", tipe: "Member Gold", poin: 2980, total: 10150000, kunjungan: 51, alergi: "-", lahir: "1959-01-17", bpjs: "0006677889900" },
  ];
  const PASIEN = [...DB.pelanggan.filter((p) => p.id !== "UMUM"), ...EXTRA];

  /* Profil klinis (PMR). riwayat: [hariLalu, obat, qty, signa, idDokter]; rutin: [obat, dosis, sisaHari] */
  const PROFIL = {
    "MB-00121": { nik: "3174051204780003", jk: "Laki-laki", bb: 78, tb: 170, alamat: "Jl. Cilandak KKO No. 12, Jakarta Selatan", kronis: ["Diabetes Melitus tipe 2", "Dislipidemia"],
      rutin: [["Metformin 500 mg", "2 x 1 tablet sesudah makan", 5], ["Simvastatin 20 mg", "1 x 1 tablet malam", 12]],
      riwayat: [[2, "Metformin 500 mg", 60, "2 dd 1 pc", "DR-001"], [2, "Simvastatin 20 mg", 30, "1 dd 1 vesp", "DR-001"], [31, "Metformin 500 mg", 60, "2 dd 1 pc", "DR-001"], [31, "Glimepiride 2 mg", 30, "1 dd 1 ac", "DR-001"], [58, "Omeprazole 20 mg", 14, "1 dd 1 ac", "DR-003"]],
      pmr: "Alergi penisilin (ruam kulit menyeluruh, 2019) — hindari amoksisilin/ampisilin, alternatif golongan makrolida. GDP terakhir 142 mg/dL (cek mandiri). Edukasi: Metformin diminum sesudah makan untuk mengurangi keluhan lambung; Glimepiride dihentikan dokter bulan lalu karena episode hipoglikemia ringan." },
    "MB-00188": { nik: "3174064211850002", jk: "Perempuan", bb: 58, tb: 158, alamat: "Jl. Pangeran Antasari No. 45, Jakarta Selatan", kronis: ["Dermatitis atopik"],
      rutin: [["Cetirizine 10 mg", "1 x 1 tablet malam", 6]],
      riwayat: [[0, "Hydrocortisone Krim 2,5%", 1, "u.e. 2 dd applic", "DR-005"], [0, "Cetirizine 10 mg", 10, "1 dd 1 vesp", "DR-005"], [45, "Hydrocortisone Krim 2,5%", 1, "u.e. 2 dd applic", "DR-005"], [70, "Paracetamol 500 mg", 10, "3 dd 1 prn", "DR-003"]],
      pmr: "Kortikosteroid topikal: edukasi pemakaian tipis maksimal 2 minggu, tidak untuk area wajah. Pasien mengeluhkan kantuk dengan CTM, sudah dialihkan ke Cetirizine." },
    "MB-00203": { nik: "3174012107620001", jk: "Laki-laki", bb: 82, tb: 168, alamat: "Jl. Haji Nawi Raya No. 7, Jakarta Selatan", kronis: ["Hipertensi", "Penyakit Jantung Koroner", "Dislipidemia"],
      rutin: [["Amlodipine 10 mg", "1 x 1 tablet pagi", 3], ["Clopidogrel 75 mg", "1 x 1 tablet pagi", 9], ["Simvastatin 20 mg", "1 x 1 tablet malam", 9]],
      riwayat: [[0, "Amlodipine 10 mg", 30, "1 dd 1 mane", "DR-006"], [0, "Clopidogrel 75 mg", 30, "1 dd 1 mane", "DR-006"], [0, "Simvastatin 20 mg", 30, "1 dd 1 vesp", "DR-006"], [27, "Amlodipine 10 mg", 30, "1 dd 1 mane", "DR-006"], [27, "Clopidogrel 75 mg", 30, "1 dd 1 mane", "DR-006"], [56, "Captopril 25 mg", 60, "2 dd 1 ac", "DR-001"]],
      pmr: "Pasien PRB BPJS (resep iter 2x). Alergi sulfa. Tekanan darah saat kunjungan 146/88 mmHg. Clopidogrel: edukasi tanda perdarahan (gusi, BAB hitam) dan jangan dihentikan tanpa konsultasi dokter jantung. Captopril diganti Amlodipine karena batuk kering." },
    "MB-00245": { nik: "3276015402920004", jk: "Perempuan", bb: 52, tb: 160, alamat: "Jl. Margonda Raya No. 210, Depok", kronis: [],
      rutin: [],
      riwayat: [[12, "Sangobion", 10, "1 dd 1 pc", "DR-003"], [12, "Vitamin C 1000 mg", 1, "1 dd 1", "DR-003"], [40, "Paracetamol 500 mg", 10, "3 dd 1 prn", "DR-003"]],
      pmr: "Anemia defisiensi besi ringan (Hb 10,8 g/dL). Edukasi: Sangobion diminum dengan air putih/jus jeruk, hindari teh dan kopi 2 jam sesudahnya. Tinja dapat berwarna gelap." },
    "MB-00261": { nik: "3175073009700005", jk: "Laki-laki", bb: 74, tb: 165, alamat: "Jl. Kalibata Timur No. 19, Jakarta Selatan", kronis: ["Hipertensi"],
      rutin: [["Captopril 25 mg", "2 x 1 tablet sebelum makan", 4], ["Simvastatin 20 mg", "1 x 1 tablet malam", 16]],
      riwayat: [[1, "Captopril 25 mg", 60, "2 dd 1 ac", "DR-001"], [1, "Simvastatin 20 mg", 30, "1 dd 1 vesp", "DR-001"], [30, "Captopril 25 mg", 60, "2 dd 1 ac", "DR-001"]],
      pmr: "Alergi aspirin (bronkospasme) — hindari NSAID golongan salisilat, perhatian pada Ibuprofen. Captopril diminum 1 jam sebelum makan." },
    "MB-00277": { nik: "3174020112990006", jk: "Laki-laki", bb: 68, tb: 174, alamat: "Jl. Ampera Raya No. 3, Jakarta Selatan", kronis: [],
      rutin: [],
      riwayat: [[0, "Amoxicillin 500 mg", 15, "3 dd 1 pc (habiskan)", "DR-003"], [0, "Ambroxol 30 mg", 10, "3 dd 1 pc", "DR-003"], [0, "Paracetamol 500 mg", 10, "3 dd 1 prn", "DR-003"]],
      pmr: "ISPA. Antibiotik wajib dihabiskan 5 hari meski gejala membaik. Tidak ada riwayat alergi obat." },
    "MB-00290": { nik: "3174055806810007", jk: "Perempuan", bb: 64, tb: 156, alamat: "Jl. Fatmawati Raya No. 101, Jakarta Selatan", kronis: ["Hipertensi", "GERD"],
      rutin: [["Omeprazole 20 mg", "1 x 1 kapsul sebelum sarapan", 7], ["Amlodipine 10 mg", "1 x 1 tablet pagi", 14]],
      riwayat: [[1, "Omeprazole 20 mg", 30, "1 dd 1 ac", "DR-001"], [1, "Amlodipine 10 mg", 30, "1 dd 1 mane", "DR-001"], [1, "Antasida Doen", 20, "3 dd 1 prn", "DR-001"], [32, "Omeprazole 20 mg", 30, "1 dd 1 ac", "DR-001"]],
      pmr: "Pasien PRB BPJS. Omeprazole diminum 30 menit sebelum sarapan; Antasida diberi jarak 2 jam dari obat lain." },
    "MB-00302": { nik: "3171030903680008", jk: "Laki-laki", bb: 86, tb: 172, alamat: "Jl. Summarecon Bekasi Blok C No. 8, Bekasi", kronis: ["Diabetes Melitus tipe 2"],
      rutin: [["Metformin 500 mg", "3 x 1 tablet sesudah makan", 2], ["Glimepiride 2 mg", "1 x 1 tablet sebelum sarapan", 8]],
      riwayat: [[8, "Metformin 500 mg", 90, "3 dd 1 pc", "DR-001"], [8, "Glimepiride 2 mg", 30, "1 dd 1 ac", "DR-001"]],
      pmr: "Pasien PRB BPJS. HbA1c 7,4%. Edukasi tanda hipoglikemia (gemetar, keringat dingin) dan selalu membawa permen." },
    "MB-00315": { nik: "3674016508950009", jk: "Perempuan", bb: 49, tb: 155, alamat: "Jl. Pahlawan Seribu, BSD, Tangerang Selatan", kronis: [],
      rutin: [],
      riwayat: [[5, "Omeprazole 20 mg", 14, "1 dd 1 ac", "DR-003"], [5, "Antasida Doen", 10, "3 dd 1 prn", "DR-003"]],
      pmr: "Alergi Ibuprofen (angioedema ringan). Untuk nyeri disarankan Paracetamol." },
    "MB-00321": { nik: "3271011701590010", jk: "Laki-laki", bb: 70, tb: 166, alamat: "Jl. Pajajaran No. 55, Bogor", kronis: ["Pasca stroke iskemik", "Hipertensi"],
      rutin: [["Clopidogrel 75 mg", "1 x 1 tablet pagi", 3], ["Amlodipine 10 mg", "1 x 1 tablet pagi", 3], ["Simvastatin 20 mg", "1 x 1 tablet malam", 20]],
      riwayat: [[27, "Clopidogrel 75 mg", 30, "1 dd 1 mane", "DR-006"], [27, "Amlodipine 10 mg", 30, "1 dd 1 mane", "DR-006"], [27, "Simvastatin 20 mg", 30, "1 dd 1 vesp", "DR-006"]],
      pmr: "Pasien PRB BPJS. Obat diambil oleh anak (Ibu Ratih, 0812-3344-5566). Pantau kepatuhan; pasien sering lupa dosis pagi." },
  };
  const profil = (id) => PROFIL[id] || { nik: "-", jk: "-", bb: 0, tb: 0, alamat: "-", kronis: [], rutin: [], riwayat: [], pmr: "Belum ada catatan." };
  const tierOf = (total) => { let i = 0; TIER.forEach((t, k) => { if (total >= t.min) i = k; }); return i; };

  const refillAll = () => PASIEN.flatMap((p) => profil(p.id).rutin.map(([obat, dosis, sisa]) => ({ p, obat, dosis, sisa })))
    .filter((r) => r.sisa <= 7).sort((a, b) => a.sisa - b.sisa);

  const refillItem = (p, obat, dosis, sisa, compact) => `
    <div class="list-item">
      <div class="sq-ico ${sisa <= 3 ? "red" : sisa <= 7 ? "amber" : "green"}">${icon("medication")}</div>
      <div class="grow">
        <div class="title small">${esc(obat)} ${compact ? `<span class="muted">· ${esc(p.nama)}</span>` : ""}</div>
        <div class="meta">${esc(dosis)} · habis ${sisa === 0 ? "hari ini" : `${sisa} hari lagi`} (${tgl(DB.addDays(sisa))})</div>
        <div style="margin-top:6px;max-width:260px">${progress(Math.max(1, sisa), 30, sisa <= 3 ? "red" : sisa <= 7 ? "amber" : "green")}</div>
      </div>
      ${btn(compact ? "" : "Kirim pengingat WhatsApp", "primary", { icon: "send", size: "sm", title: "Kirim pengingat WhatsApp", attrs: `data-toast="Pengingat refill ${esc(obat)} terkirim via WhatsApp ke ${esc(p.hp)}" data-tone="success"` })}
    </div>`;

  function formPasien() {
    return `
      ${alert("info", "info", "Data pasien dilindungi", "Data identitas & riwayat pengobatan disimpan terenkripsi dan hanya dapat dilihat Apoteker/TTK sesuai hak akses.")}
      <div class="form-grid cols-3">
        ${input("Nama lengkap *", { ph: "Sesuai KTP", cls: "full" })}
        ${input("NIK", { ph: "16 digit", attrs: 'inputmode="numeric" maxlength="16"' })}
        ${input("Tanggal lahir *", { type: "date" })}
        ${select("Jenis kelamin *", ["Laki-laki", "Perempuan"])}
        ${input("Berat badan (kg)", { type: "number", ph: "0" })}
        ${input("Tinggi badan (cm)", { type: "number", ph: "0" })}
        ${input("No. HP / WhatsApp *", { ph: "08xx-xxxx-xxxx", icon: "call" })}
        ${textarea("Alamat", { ph: "Jalan, RT/RW, kelurahan, kecamatan, kota", cls: "full" })}
        ${input("Alergi obat", { ph: "mis. Penisilin, Sulfa, Aspirin", icon: "warning", hint: "Pisahkan dengan koma. Akan muncul sebagai peringatan di kasir & resep.", cls: "full" })}
        ${input("Riwayat penyakit kronis", { ph: "mis. Hipertensi, Diabetes Melitus tipe 2", cls: "full" })}
        ${input("No. kartu BPJS", { ph: "13 digit", attrs: 'inputmode="numeric" maxlength="13"', hint: "Isi bila pasien program PRB" })}
        ${select("Jenis member", ["Member Reguler", "Member Silver", "Member Gold"])}
        ${select("Cabang terdaftar", UI.cabangOptions(false), { value: "PST" })}
      </div>
      <label class="check"><input type="checkbox" checked>Pasien menyetujui pengingat refill & promo via WhatsApp</label>`;
  }

  function detailPasien(id) {
    const p = PASIEN.find((x) => x.id === id);
    if (!p) return;
    const f = profil(id);
    const ti = tierOf(p.total);
    const next = TIER[ti + 1];
    const imt = f.bb && f.tb ? f.bb / Math.pow(f.tb / 100, 2) : 0;
    const t = TIPE[p.tipe] || { short: p.tipe, tone: "gray" };
    const riwayatRows = f.riwayat.map(([d, obat, qty, signa, dr], i) => ({ d, obat, qty, signa, dr, no: `RSP/PST/${hari(-d).slice(2, 7).replace("-", "")}/${String(88 - i * 7 - d).padStart(4, "0")}` }));

    modal.open({
      title: "Profil Pasien", icon: "person", size: "xl",
      body: `
        <div class="row" style="gap:14px">
          ${avatar(p.nama, PASIEN.indexOf(p), "lg")}
          <div style="flex:1;min-width:200px">
            <h3 style="font-size:19px">${esc(p.nama)}</h3>
            <div class="row small muted" style="gap:8px;margin-top:4px"><span class="mono">${esc(p.id)}</span>· ${esc(f.jk)}, ${umur(p.lahir)} th · ${esc(p.hp)}</div>
            <div class="row" style="gap:6px;margin-top:8px">${badge("Member " + t.short, t.tone, { icon: "workspace_premium" })}${p.bpjs !== "-" ? badge("BPJS PRB", "green", { icon: "verified" }) : ""}${f.kronis.length ? badge(`${f.kronis.length} penyakit kronis`, "purple") : ""}</div>
          </div>
          <div class="btn-group" style="flex-wrap:nowrap">${btn("Kirim WA", "primary", { icon: "send", size: "sm", attrs: `data-toast="Membuka percakapan WhatsApp ${esc(p.hp)}" data-tone="info"` })}${btn("Cetak Kartu", "teal", { icon: "badge", size: "sm", attrs: 'data-toast="Kartu member dikirim ke printer"' })}</div>
        </div>
        ${p.alergi !== "-" ? alert("danger", "warning", `Alergi obat: ${esc(p.alergi)}`, "Sistem akan memblokir item yang mengandung zat ini di kasir dan resep, kecuali dengan otorisasi apoteker.") : ""}
        <div class="grid g-3" style="gap:14px">
          ${card({ title: "Identitas", icon: "badge", body: `<dl class="kv">
            <dt>NIK</dt><dd class="mono">${esc(f.nik)}</dd>
            <dt>Tanggal lahir</dt><dd>${p.lahir !== "-" ? tgl(p.lahir) : "-"}</dd>
            <dt>No. BPJS</dt><dd class="mono">${esc(p.bpjs)}</dd>
            <dt>Terdaftar</dt><dd>Cabang Pusat</dd>
            <dt>Alamat</dt><dd style="font-weight:500">${esc(f.alamat)}</dd></dl>` })}
          ${card({ title: "Data klinis", icon: "monitor_heart", tone: "red", body: `<dl class="kv">
            <dt>Berat / tinggi</dt><dd>${f.bb} kg / ${f.tb} cm</dd>
            <dt>IMT</dt><dd>${imt ? imt.toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "-"} ${imt >= 25 ? badge("Obesitas I", "amber") : imt >= 23 ? badge("Berat berlebih", "amber") : badge("Normal", "green")}</dd>
            <dt>Alergi</dt><dd>${p.alergi !== "-" ? badge(esc(p.alergi), "red", { icon: "warning" }) : "Tidak ada"}</dd></dl>
            <div class="lbl-sm" style="margin-top:12px">Penyakit kronis</div>
            <div class="row" style="gap:6px;margin-top:6px">${f.kronis.length ? f.kronis.map((k) => badge(esc(k), "purple")).join("") : '<span class="small muted">Tidak ada</span>'}</div>` })}
          ${card({ title: "Poin & tier", icon: "loyalty", tone: "pink", body: `
            <div class="row between"><div><div class="small muted">Saldo poin</div><div style="font-size:24px;font-weight:800" class="num">${num(p.poin)}</div></div>${badge(TIER[ti].nama, t.tone, { icon: "workspace_premium" })}</div>
            <div class="small muted" style="margin:10px 0 6px">${next ? `Belanja ${short(next.min - p.total)} lagi untuk naik ke <b>${next.nama}</b>` : "Tier tertinggi tercapai"}</div>
            ${progress(p.total, next ? next.min : p.total, "green")}
            <div class="row between small" style="margin-top:6px"><span class="muted">${short(p.total)}</span><span class="muted">${next ? short(next.min) : ""}</span></div>
            <div class="small" style="margin-top:10px">${icon("redeem")} ${esc(TIER[ti].benefit)}</div>` })}
        </div>
        ${tabs("pl-detail", [
          { id: "riwayat", label: "Riwayat pengobatan", icon: "history", n: f.riwayat.length },
          { id: "pmr", label: "PMR", icon: "clinical_notes" },
          { id: "refill", label: "Pengingat refill", icon: "notifications_active", n: f.rutin.length },
        ], "riwayat")}
        <div data-panel-group="pl-detail" data-panel="riwayat">${table({
          cls: "compact",
          columns: [
            { label: "Tanggal", render: (r) => `<span class="nowrap">${tgl(hari(-r.d))}</span><div class="t-sub mono">${r.no}</div>` },
            { label: "Obat", render: (r) => `<div class="t-main">${esc(r.obat)}</div>${golongan(obatBy(r.obat).golongan)}` },
            { label: "Signa", render: (r) => `<span class="mono">${esc(r.signa)}</span>` },
            { label: "Qty", cls: "num", render: (r) => num(r.qty) },
            { label: "Dokter", render: (r) => `${esc(dokterBy(r.dr).nama)}<div class="t-sub">${esc(dokterBy(r.dr).faskes)}</div>` },
          ],
          rows: riwayatRows, empty: "Belum ada riwayat pengobatan",
        })}</div>
        <div data-panel-group="pl-detail" data-panel="pmr" hidden>
          <div class="stack">
            ${UI.field("Catatan Patient Medication Record (PMR)", `<textarea class="textarea" style="min-height:110px">${esc(f.pmr)}</textarea>`, "Diisi apoteker. Terlihat di layar resep & kasir saat pasien dipilih.")}
            <div class="timeline" style="padding:0">
              <div class="tl green"><span class="d"></span><div><div class="t">Konseling obat — apt. Rina Wulandari</div><div class="m">${tgl(hari(-2))} · Cara pakai, efek samping, interaksi dijelaskan. Pasien memahami.</div></div></div>
              <div class="tl"><span class="d"></span><div><div class="t">Monitoring kepatuhan (MMAS-8): skor 7</div><div class="m">${tgl(hari(-31))} · Kepatuhan sedang, disarankan alarm minum obat.</div></div></div>
              <div class="tl amber"><span class="d"></span><div><div class="t">Skrining interaksi obat</div><div class="m">${tgl(hari(-58))} · Tidak ditemukan interaksi mayor pada regimen aktif.</div></div></div>
            </div>
          </div>
        </div>
        <div data-panel-group="pl-detail" data-panel="refill" hidden>
          ${f.rutin.length ? `<div class="list" style="border:1px solid var(--border);border-radius:var(--radius)">${f.rutin.map(([obat, dosis, sisa]) => refillItem(p, obat, dosis, sisa, false)).join("")}</div>`
            : `<div class="empty">${icon("event_available")}Pasien tidak memiliki obat rutin/kronis.</div>`}
        </div>`,
      foot: `${btn("Tutup", "dark", { icon: "close", attrs: "data-close" })}${btn("Ubah Data", "warning", { icon: "edit", attrs: 'data-toast="Mode ubah data pasien dibuka" data-tone="info"' })}${btn("Buat Transaksi", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' })}`,
    });
  }

  window.PAGES.pelanggan = {
    render() {
      const refill = refillAll();
      const cnt = (f) => PASIEN.filter((p) => (TIPE[p.tipe] || {}).f === f).length;
      const perTier = [["Gold", 214, "amber"], ["Silver", 402, ""], ["Reguler", 668, "green"]];

      return `
      ${UI.pageHeader({
        title: "Pasien & Member",
        sub: "Data pasien, program member & poin, riwayat pengobatan (PMR), alergi obat, serta pengingat refill obat kronis.",
        crumbs: ["Relasi", "Pasien & Member"],
        actions: `${btn("Tambah Pasien", "success", { icon: "person_add", attrs: 'id="pl-add"' })}${btn("Program Poin", "pink", { icon: "loyalty", attrs: 'data-toast="Pengaturan program poin & tier member dibuka" data-tone="info"' })}${btn("Export Excel", "glass", { icon: "table_view", attrs: 'data-toast="Data pasien diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Total member", value: num(1284), icon: "groups", tone: "primary", hero: true, delta: 3.7, foot: "vs bulan lalu" })}
        ${stat({ label: "Member baru bulan ini", value: "46", icon: "person_add", tone: "success", delta: 12.2, foot: "18 dari rujukan resep" })}
        ${stat({ label: "Poin beredar", value: num(412560), icon: "loyalty", tone: "pink", foot: `setara ${short(412560 * 100)} potongan` })}
        ${stat({ label: "Pasien BPJS PRB", value: "138", icon: "verified", tone: "teal", foot: `${refill.length} perlu refill ≤ 7 hari` })}
      </div>

      ${card({
          title: "Daftar pasien", desc: "Klik ikon mata untuk membuka profil pasien", icon: "groups", flush: true,
          tools: `<div class="input-icon" style="min-width:220px">${icon("search")}<input class="input sm" id="pl-search" type="search" placeholder="Cari nama, ID, atau HP" aria-label="Cari pasien"></div>`,
          body: `
            <div style="padding:12px 16px 0"><div class="chips" data-chip-group="pl-tipe" id="pl-chips">
              <button type="button" class="chip active" data-f="all">Semua <b>${PASIEN.length}</b></button>
              <button type="button" class="chip" data-f="gold">${icon("workspace_premium")}Gold <b>${cnt("gold")}</b></button>
              <button type="button" class="chip" data-f="silver">Silver <b>${cnt("silver")}</b></button>
              <button type="button" class="chip" data-f="reguler">Reguler <b>${cnt("reguler")}</b></button>
              <button type="button" class="chip" data-f="bpjs">${icon("verified")}BPJS PRB <b>${PASIEN.filter((p) => p.bpjs !== "-").length}</b></button>
              <button type="button" class="chip" data-f="alergi">${icon("warning")}Ada alergi <b>${PASIEN.filter((p) => p.alergi !== "-").length}</b></button>
            </div></div>
            ${table({
              rowCls: (p) => `pl-row f-${(TIPE[p.tipe] || {}).f} ${p.bpjs !== "-" ? "f-bpjs" : ""} ${p.alergi !== "-" ? "f-alergi" : ""}`,
              columns: [
                { label: "Pasien", render: (p, i) => `<div class="row nowrap" style="gap:10px;flex-wrap:nowrap">${avatar(p.nama, i, "sm")}<div><div class="t-main pl-nama">${esc(p.nama)}</div><div class="t-sub mono">${esc(p.id)}</div></div></div>` },
                { label: "No. HP", render: (p) => `<span class="nowrap pl-hp">${esc(p.hp)}</span>` },
                { label: "Tipe", render: (p) => { const t = TIPE[p.tipe]; return badge(t.short, t.tone, { icon: t.f === "reguler" ? "" : "workspace_premium" }); } },
                { label: "Poin", cls: "num", render: (p) => num(p.poin) },
                { label: "Total belanja", cls: "num", render: (p) => `<b>${rp(p.total)}</b>` },
                { label: "Kunjungan", cls: "num", render: (p) => `${p.kunjungan}x` },
                { label: "Alergi", render: (p) => (p.alergi !== "-" ? badge(esc(p.alergi), "red", { icon: "warning" }) : '<span class="muted">—</span>') },
                { label: "", cls: "actions", render: (p) => `<div class="btn-group" style="flex-wrap:nowrap">
                  ${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat profil", attrs: `data-pasien="${esc(p.id)}"` })}
                  ${btn("", "warning", { icon: "edit", size: "sm", title: "Ubah", attrs: `data-toast="Ubah data · ${esc(p.nama)}" data-tone="info"` })}
                  ${btn("", "primary", { icon: "send", size: "sm", title: "Kirim WhatsApp", attrs: `data-toast="Membuka WhatsApp ${esc(p.hp)}" data-tone="info"` })}
                </div>` },
              ],
              rows: PASIEN,
            })}
            ${pager(1284, 10)}`,
        })}

      <div class="grid g-2">
          ${card({
            title: "Pengingat refill obat kronis", desc: "Obat rutin yang habis ≤ 7 hari", icon: "notifications_active", tone: "red", flush: true,
            tools: btn("Kirim semua", "primary", { size: "sm", icon: "send", attrs: `data-toast="${refill.length} pengingat refill terkirim via WhatsApp"` }),
            body: `<div class="list">${refill.slice(0, 6).map((r) => refillItem(r.p, r.obat, r.dosis, r.sisa, true)).join("")}</div>`,
          })}
          ${card({
            title: "Program member", desc: "Tier berdasarkan total belanja 12 bulan", icon: "loyalty", tone: "purple",
            body: `<div class="stack">${perTier.map(([n, v, tone]) => `
              <div class="stack" style="gap:6px"><div class="row between small"><span class="strong">${n}</span><span class="muted num">${num(v)} member</span></div>${progress(v, 1284, tone)}</div>`).join("")}
              <div class="divider"></div>
              ${TIER.map((t) => `<div class="row between small"><span><b>${t.nama}</b> <span class="muted">≥ ${short(t.min)}</span></span>${badge(t.mult, "pink")}</div>`).join("")}
            </div>`,
          })}
      </div>`;
    },

    mount(root) {
      const rows = [...root.querySelectorAll("tr.pl-row")];
      let filter = "all";
      const apply = () => {
        const q = (root.querySelector("#pl-search")?.value || "").toLowerCase();
        rows.forEach((r) => {
          const okF = filter === "all" || r.classList.contains("f-" + filter);
          const okQ = !q || r.textContent.toLowerCase().includes(q);
          r.hidden = !(okF && okQ);
        });
      };
      root.querySelector("#pl-chips")?.addEventListener("click", (e) => {
        const c = e.target.closest(".chip");
        if (c) { filter = c.dataset.f; apply(); }
      });
      root.querySelector("#pl-search")?.addEventListener("input", apply);
      root.addEventListener("click", (e) => {
        const v = e.target.closest("[data-pasien]");
        if (v) detailPasien(v.dataset.pasien);
      });
      root.querySelector("#pl-add")?.addEventListener("click", () => modal.open({
        title: "Tambah Pasien Baru", icon: "person_add", size: "lg", body: formPasien(),
        foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Pasien", "success", { icon: "save", attrs: 'data-close data-toast="Pasien baru berhasil disimpan · ID MB-00322"' })}`,
      }));
    },
  };

  /* =====================================================================
     DOKTER
     ===================================================================== */
  const DR_EXT = {
    "DR-001": { sipExp: 410, email: "andi.pratama@rsf.id", jadwal: "Sen–Jum 08.00–14.00", top: [["Amlodipine 10 mg", 186], ["Metformin 500 mg", 164], ["Omeprazole 20 mg", 121], ["Simvastatin 20 mg", 98], ["Captopril 25 mg", 72]] },
    "DR-002": { sipExp: 38, email: "maria.ulfa@tumbuhkembang.id", jadwal: "Sen–Sab 16.00–20.00", top: [["Tempra Sirup 60 ml", 132], ["Zinc Sirup 20 mg/5 ml", 118], ["Oralit 200 ml", 96], ["Cetirizine 10 mg", 44], ["Amoxicillin 500 mg", 40]] },
    "DR-003": { sipExp: 522, email: "bambang.s@pratamasehat.id", jadwal: "Setiap hari 07.00–21.00", top: [["Paracetamol 500 mg", 244], ["Amoxicillin 500 mg", 180], ["Ambroxol 30 mg", 152], ["Antasida Doen", 88], ["CTM 4 mg", 61]] },
    "DR-004": { sipExp: -6, email: "nia.drg@gmail.com", jadwal: "Sel, Kam, Sab 17.00–21.00", top: [["Asam Mefenamat 500 mg", 64], ["Amoxicillin 500 mg", 51], ["Ibuprofen 400 mg", 33], ["Dexamethasone 0,5 mg", 12]] },
    "DR-005": { sipExp: 890, email: "fajar.skin@rspi.id", jadwal: "Rab & Jum 13.00–17.00", top: [["Hydrocortisone Krim 2,5%", 72], ["Cetirizine 10 mg", 66], ["Salep 2-4", 41], ["Cefadroxil 500 mg", 22]] },
    "DR-006": { sipExp: 302, email: "ratna.sjp@harapankita.id", jadwal: "Sen, Rab, Jum 09.00–13.00", top: [["Clopidogrel 75 mg", 112], ["Amlodipine 10 mg", 104], ["Simvastatin 20 mg", 96], ["Captopril 25 mg", 38]] },
  };
  const SP_TONE = { "Penyakit Dalam": "blue", Anak: "pink", Umum: "gray", Gigi: "cyan", "Kulit & Kelamin": "amber", Jantung: "red" };
  const sipBadge = (d) => (d < 0 ? badge("SIP kedaluwarsa", "red", { dot: true }) : d <= 60 ? badge(`Habis ${d} hari lagi`, "amber", { dot: true }) : badge("Berlaku", "green", { dot: true }));
  const namaPendek = (n) => n.split(",")[0].split(" ").slice(0, 2).join(" ");

  function resepDokter(d) {
    const nyata = DB.resep.filter((r) => r.dokter === d.nama);
    const pasien = ["Wahyu Hidayat", "Yohanes Kristanto", "Nur Aisyah", "Agus Salim", "Dewi Lestari"];
    const ext = DR_EXT[d.id];
    const tambahan = pasien.slice(0, 5 - Math.min(nyata.length, 3)).map((ps, i) => ({
      no: `RSP/${["PST", "BKS", "TGR", "DPK", "BGR"][i]}/2609/00${40 + i * 6}`, tgl: hari(-(i + 1) * 3), jam: `${9 + i}:${i % 2 ? "15" : "40"}`, pasien: ps,
      item: 2 + (i % 3), racikan: d.spesialis === "Anak" && i % 2 === 0 ? 1 : 0, status: "Diserahkan", total: 85000 + i * 43500 + ext.top.length * 1000,
    }));
    return [...nyata, ...tambahan];
  }

  function detailDokter(id) {
    const d = DB.dokter.find((x) => x.id === id);
    if (!d) return;
    const ext = DR_EXT[id];
    const maxTop = Math.max(...ext.top.map((t) => t[1]));
    modal.open({
      title: "Detail Dokter", icon: "stethoscope", size: "lg",
      body: `
        <div class="row" style="gap:14px">
          ${avatar(d.nama, DB.dokter.indexOf(d), "lg")}
          <div style="flex:1;min-width:200px"><h3 style="font-size:19px">${esc(d.nama)}</h3>
            <div class="row" style="gap:6px;margin-top:6px">${badge(esc(d.spesialis), SP_TONE[d.spesialis] || "gray")}${sipBadge(ext.sipExp)}</div></div>
        </div>
        ${ext.sipExp <= 60 ? alert(ext.sipExp < 0 ? "danger" : "warn", "gpp_maybe", ext.sipExp < 0 ? "SIP sudah kedaluwarsa" : "SIP segera habis masa berlaku", "Resep dari dokter ini akan ditandai untuk verifikasi apoteker sampai SIP baru diunggah.") : ""}
        <div class="grid g-2" style="gap:14px">
          ${card({ title: "Identitas & praktik", icon: "badge", body: `<dl class="kv">
            <dt>ID</dt><dd class="mono">${esc(d.id)}</dd>
            <dt>No. SIP</dt><dd class="mono">${esc(d.sip)}</dd>
            <dt>Berlaku s.d.</dt><dd>${tgl(DB.addDays(ext.sipExp))}</dd>
            <dt>Faskes</dt><dd>${esc(d.faskes)}</dd>
            <dt>Jadwal praktik</dt><dd>${esc(ext.jadwal)}</dd>
            <dt>HP</dt><dd>${esc(d.hp)}</dd>
            <dt>Email</dt><dd>${esc(ext.email)}</dd></dl>` })}
          ${card({ title: "Obat paling sering diresepkan", desc: "90 hari terakhir", icon: "medication", tone: "purple", body: `<div class="stack">${ext.top.map(([n, q], i) => `
            <div class="stack" style="gap:6px"><div class="row between small"><span><b>${i + 1}. ${esc(n)}</b> ${golongan(obatBy(n).golongan)}</span><span class="muted num">${num(q)} ${esc(obatBy(n).satuan).toLowerCase()}</span></div>${progress(q, maxTop, i === 0 ? "" : "green")}</div>`).join("")}</div>` })}
        </div>
        ${card({ title: "Riwayat resep", desc: "Resep terbaru dari dokter ini di semua cabang", icon: "receipt_long", flush: true, body: table({
          cls: "compact",
          columns: [
            { label: "No. Resep", render: (r) => `<span class="mono strong">${esc(r.no)}</span><div class="t-sub">${tgl(r.tgl)} · ${esc(r.jam)}</div>` },
            { label: "Pasien", render: (r) => `${esc(r.pasien)} ${r.racikan ? badge("Racikan", "purple") : ""}` },
            { label: "Item", cls: "num", render: (r) => r.item },
            { label: "Total", cls: "num", render: (r) => (r.total ? `<b>${rp(r.total)}</b>` : '<span class="muted">—</span>') },
            { label: "Status", render: (r) => UI.status(r.status) },
          ],
          rows: resepDokter(d),
        }) })}`,
      foot: `${btn("Tutup", "dark", { icon: "close", attrs: "data-close" })}${btn("Ubah", "warning", { icon: "edit", attrs: 'data-toast="Mode ubah data dokter dibuka" data-tone="info"' })}${btn("Lihat Semua Resep", "purple", { icon: "prescriptions", attrs: 'data-go="resep"' })}`,
    });
  }

  function formDokter() {
    return `<div class="form-grid">
      ${input("Nama lengkap & gelar *", { ph: "mis. dr. Andi Pratama, Sp.PD", cls: "full" })}
      ${select("Spesialisasi *", ["Umum", "Penyakit Dalam", "Anak", "Jantung", "Kulit & Kelamin", "Gigi", "Saraf", "Obstetri & Ginekologi", "THT", "Mata"])}
      ${input("No. STR", { ph: "16 digit" })}
      ${input("No. SIP *", { ph: "SIP 503/xxxx/DINKES/2026", hint: "Wajib untuk validasi resep" })}
      ${input("SIP berlaku s.d. *", { type: "date" })}
      ${input("Fasilitas kesehatan", { ph: "RS / klinik / praktik mandiri", icon: "local_hospital" })}
      ${input("Jadwal praktik", { ph: "mis. Sen–Jum 08.00–14.00" })}
      ${input("No. HP", { ph: "08xx-xxxx-xxxx", icon: "call" })}
      ${input("Email", { type: "email", ph: "nama@domain.id", icon: "mail" })}
      ${textarea("Alamat praktik", { cls: "full" })}
      <div class="field full"><label>Unggah scan SIP</label><button type="button" class="btn light block" data-toast="Dialog unggah berkas dibuka" data-tone="info">${icon("upload_file")}<span>Pilih berkas PDF/JPG (maks. 2 MB)</span></button></div>
    </div>`;
  }

  window.PAGES.dokter = {
    render() {
      const total = DB.dokter.reduce((s, d) => s + d.resep, 0);
      const topDr = [...DB.dokter].sort((a, b) => b.resep - a.resep)[0];
      const maxR = Math.max(...DB.dokter.map((d) => d.resep));
      const perlu = DB.dokter.filter((d) => DR_EXT[d.id].sipExp <= 60);

      return `
      ${UI.pageHeader({
        title: "Dokter",
        sub: "Data dokter penulis resep, validitas SIP, dan statistik resep yang dilayani apotek.",
        crumbs: ["Relasi", "Dokter"],
        actions: `${btn("Tambah Dokter", "success", { icon: "person_add", attrs: 'id="dr-add"' })}${btn("Export Excel", "glass", { icon: "table_view", attrs: 'data-toast="Data dokter diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Dokter terdaftar", value: DB.dokter.length, icon: "stethoscope", tone: "primary", hero: true, foot: `${new Set(DB.dokter.map((d) => d.faskes)).size} fasilitas kesehatan` })}
        ${stat({ label: "Resep bulan ini", value: num(total), icon: "prescriptions", tone: "purple", delta: 6.4, foot: "vs bulan lalu" })}
        ${stat({ label: "Penulis resep terbanyak", value: esc(namaPendek(topDr.nama)), icon: "military_tech", tone: "warning", foot: `${topDr.resep} resep · ${esc(topDr.spesialis)}` })}
        ${stat({ label: "SIP perlu diperbarui", value: perlu.length, icon: "gpp_maybe", tone: "danger", foot: "habis ≤ 60 hari / kedaluwarsa" })}
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Daftar dokter", desc: "Dokter yang resepnya pernah dilayani", icon: "stethoscope", flush: true,
          tools: `<div class="input-icon" style="min-width:200px">${icon("search")}<input class="input sm" id="dr-search" type="search" placeholder="Cari dokter / faskes" aria-label="Cari dokter"></div>`,
          body: table({
            rowCls: (d) => `dr-row ${DR_EXT[d.id].sipExp < 0 ? "row-danger" : ""}`,
            columns: [
              { label: "Dokter", render: (d, i) => `<div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(d.nama, i, "sm")}<div><div class="t-main nowrap">${esc(d.nama)}</div><div class="t-sub mono">${esc(d.id)}</div></div></div>` },
              { label: "Spesialis", render: (d) => badge(esc(d.spesialis), SP_TONE[d.spesialis] || "gray") },
              { label: "SIP", render: (d) => `<span class="mono small nowrap">${esc(d.sip)}</span><div class="t-sub">${sipBadge(DR_EXT[d.id].sipExp)}</div>` },
              { label: "Faskes", render: (d) => `<span class="nowrap">${esc(d.faskes)}</span><div class="t-sub">${esc(d.hp)}</div>` },
              { label: "Resep", cls: "num", render: (d) => `<b>${d.resep}</b><div style="width:80px;margin-top:6px;margin-left:auto">${progress(d.resep, maxR)}</div>` },
              { label: "", cls: "actions", render: (d) => `<div class="btn-group" style="flex-wrap:nowrap">
                ${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-dokter="${d.id}"` })}
                ${btn("", "warning", { icon: "edit", size: "sm", title: "Ubah", attrs: `data-toast="Ubah data · ${esc(d.nama)}" data-tone="info"` })}
                ${btn("", "dark", { icon: "history", size: "sm", title: "Riwayat resep", attrs: `data-dokter="${d.id}"` })}
              </div>` },
            ],
            rows: DB.dokter,
          }),
        })}
        ${card({
          title: "Resep per dokter", desc: "Jumlah resep dilayani bulan ini", icon: "bar_chart", tone: "purple",
          body: chart("dokter-resep", (k) => ({
            type: "bar",
            data: { labels: DB.dokter.map((d) => namaPendek(d.nama)), datasets: [{ label: "Resep", data: DB.dokter.map((d) => d.resep), backgroundColor: k.c1, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 34 }] },
            options: { scales: { y: { beginAtZero: true, grid: { color: k.grid } }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40 } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${num(c.raw)} resep` } } } },
          }), "sm") + `<div class="divider" style="margin:14px 0"></div>
            <div class="stack">${[["Penyakit Dalam & Jantung", 230, ""], ["Umum", 206, "green"], ["Anak", 118, "amber"], ["Lainnya", 101, "amber"]].map(([n, v, t]) => `
              <div class="stack" style="gap:6px"><div class="row between small"><span class="strong">${n}</span><span class="muted num">${UI.pct((v / total) * 100)}</span></div>${progress(v, total, t)}</div>`).join("")}</div>`,
        })}
      </div>

      <div class="grid g-2">
        ${card({
          title: "Validitas SIP", desc: "Resep dari dokter dengan SIP tidak berlaku ditahan untuk verifikasi", icon: "gpp_maybe", tone: "red", flush: true,
          body: `<div class="list">${perlu.map((d) => `
            <div class="list-item"><div class="sq-ico ${DR_EXT[d.id].sipExp < 0 ? "red" : "amber"}">${icon("badge")}</div>
              <div class="grow"><div class="title">${esc(d.nama)}</div><div class="meta">${esc(d.sip)} · ${DR_EXT[d.id].sipExp < 0 ? "berakhir" : "berlaku s.d."} ${tgl(DB.addDays(DR_EXT[d.id].sipExp))}</div></div>
              ${btn("Minta SIP baru", "primary", { size: "sm", icon: "send", attrs: `data-toast="Permintaan pembaruan SIP dikirim ke ${esc(d.hp)}"` })}</div>`).join("")}</div>`,
        })}
        ${card({
          title: "Faskes perujuk", desc: "Asal resep berdasarkan fasilitas kesehatan", icon: "local_hospital", tone: "cyan", flush: true,
          body: `<div class="list">${DB.dokter.map((d) => `
            <div class="list-item"><div class="sq-ico cyan">${icon("local_hospital")}</div>
              <div class="grow"><div class="title small">${esc(d.faskes)}</div><div class="meta">${esc(d.nama)}</div></div>
              <b class="num small">${d.resep} resep</b></div>`).join("")}</div>`,
        })}
      </div>`;
    },

    mount(root) {
      const rows = [...root.querySelectorAll("tr.dr-row")];
      root.querySelector("#dr-search")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        rows.forEach((r) => { r.hidden = q && !r.textContent.toLowerCase().includes(q); });
      });
      root.addEventListener("click", (e) => {
        const v = e.target.closest("[data-dokter]");
        if (v) detailDokter(v.dataset.dokter);
      });
      root.querySelector("#dr-add")?.addEventListener("click", () => modal.open({
        title: "Tambah Dokter", icon: "person_add", size: "lg", body: formDokter(),
        foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Dokter", "success", { icon: "save", attrs: 'data-close data-toast="Data dokter berhasil disimpan"' })}`,
      }));
    },
  };
})();
