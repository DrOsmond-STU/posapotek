/* =====================================================================
   Pembelian: Surat Pesanan, Penerimaan Barang, Retur Pembelian,
   Hutang Supplier, Supplier / PBF
   ===================================================================== */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, pct, short, table, status, badge, golongan, chart, rpTick, esc, legend, progress, tgl, tabs, input, select, textarea, alert, modal, confirmBox, toast, cabangNama } = UI;

  /* ---------- Helper bersama ---------- */
  const YM = "2609";
  const dIso = (n) => DB.iso(DB.addDays(n));
  const on = (scope, sel, ev, fn) => scope.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
  const byKode = (k) => DB.obat.find((o) => o.kode === k);
  const supShort = (s) => s.replace(/^PT /, "").replace(" Trading & Distribution", "");
  const supBy = (nama) => DB.supplier.find((s) => s.nama === nama) || DB.supplier[0];
  const cabOptions = () => DB.cabang.map((c) => ({ v: c.id, l: c.nama }));
  const daysTo = (isoStr) => Math.round((new Date(isoStr) - DB.TODAY) / 864e5);
  const terbilang = (n) => {
    const s = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    if (n < 12) return s[n];
    if (n < 20) return `${terbilang(n - 10)} belas`;
    if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? " " + terbilang(n % 10) : ""}`;
    if (n < 200) return `seratus${n - 100 ? " " + terbilang(n - 100) : ""}`;
    if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus${n % 100 ? " " + terbilang(n % 100) : ""}`;
    if (n < 2000) return `seribu${n - 1000 ? " " + terbilang(n - 1000) : ""}`;
    return `${terbilang(Math.floor(n / 1000))} ribu${n % 1000 ? " " + terbilang(n % 1000) : ""}`;
  };
  const apjShort = DB.apotek.apotekerPJ.replace(", S.Farm.", "");

  /* Satuan pembelian (satuan besar) & harga netto apotek per satuan beli */
  const satBeli = (o) => (o.satuan === "Strip" ? ["Box", 10] : o.satuan === "Botol" ? ["Dus", 12] : o.satuan === "Tube" ? ["Box", 6] : o.satuan === "Sachet" ? ["Box", 30] : [o.satuan, 1]);
  const hnaBeli = (o) => Math.round((o.hargaBeli * satBeli(o)[1]) / (1.11 * 0.95) / 100) * 100;

  /* Produk khusus tambahan (tidak ada di master contoh) */
  const mk = (kode, nama, generik, golongan, bentuk, hargaBeli) => ({ kode, nama, generik, golongan, bentuk, satuan: "Strip", isi: 10, hargaBeli, stok: {}, min: 20 });
  const EXTRA = {
    clobazam: mk("OB0101", "Clobazam 10 mg", "Clobazam", "psikotropika", "Tablet", 21500),
    rhinos: mk("OB0102", "Rhinos SR", "Pseudoephedrine HCl 120 mg + Loratadine 5 mg", "prekursor", "Kapsul", 38500),
    tremenza: mk("OB0103", "Tremenza", "Pseudoephedrine 60 mg + Triprolidine 2,5 mg", "prekursor", "Tablet", 7400),
    tramadol: mk("OB0104", "Tramadol HCl 50 mg", "Tramadol HCl", "oot", "Kapsul", 9500),
    thp: mk("OB0105", "Trihexyphenidyl 2 mg", "Trihexyphenidyl HCl", "oot", "Tablet", 2100),
  };
  const JENIS = [
    { id: "Reguler", tone: "blue", ic: "shopping_cart", judul: "SURAT PESANAN", obj: "obat", pool: DB.obat.filter((o) => ["bebas", "terbatas", "keras"].includes(o.golongan)),
      rule: "SP reguler dapat memuat banyak item obat bebas, bebas terbatas, dan obat keras. Ditandatangani Apoteker PJ." },
    { id: "Narkotika", tone: "red", ic: "shield", judul: "SURAT PESANAN NARKOTIKA", obj: "Narkotika", pool: [byKode("OB0038")],
      rule: "Satu SP hanya untuk <b style=\"display:inline\">satu jenis narkotika</b>, ditandatangani basah/elektronik oleh Apoteker PJ dengan mencantumkan No. SIPA & stempel, dibuat rangkap 4 dan diarsipkan minimal 5 tahun (Permenkes No. 3/2015)." },
    { id: "Psikotropika", tone: "purple", ic: "psychology", judul: "SURAT PESANAN PSIKOTROPIKA", obj: "Psikotropika", pool: [byKode("OB0036"), byKode("OB0037"), EXTRA.clobazam],
      rule: "Formulir SP psikotropika terpisah dari SP reguler; dapat memuat satu atau beberapa jenis psikotropika, ditandatangani Apoteker PJ lengkap dengan No. SIPA & stempel apotek." },
    { id: "Prekursor", tone: "amber", ic: "science", judul: "SURAT PESANAN OBAT MENGANDUNG PREKURSOR FARMASI", obj: "Obat Mengandung Prekursor Farmasi", pool: [byKode("OB0011"), EXTRA.rhinos, EXTRA.tremenza],
      rule: "Formulir khusus obat mengandung prekursor farmasi (pseudoefedrin, efedrin, dll.) sesuai Peraturan BPOM No. 4/2018, terpisah dari pesanan lain." },
    { id: "OOT", tone: "teal", ic: "gpp_maybe", judul: "SURAT PESANAN OBAT-OBAT TERTENTU", obj: "Obat-Obat Tertentu", pool: [byKode("OB0010"), EXTRA.tramadol, EXTRA.thp],
      rule: "Obat-obat tertentu yang sering disalahgunakan (tramadol, triheksifenidil, dekstrometorfan, dll.) dipesan dengan SP khusus sesuai Peraturan BPOM No. 10/2019." },
  ];
  const jenisOf = (id) => JENIS.find((j) => j.id === id) || JENIS[0];
  const jenisBadge = (id) => badge(id, jenisOf(id).tone, { icon: jenisOf(id).ic });

  /* Surat Pesanan: data DB.po + tambahan lokal */
  const SP = [
    ...DB.po,
    { no: "SP/PST/2609/036", tgl: dIso(0), supplier: "PT Parit Padang Global", jenis: "Prekursor", item: 2, total: 2280000, status: "Menunggu TTD Apoteker" },
    { no: "SP/PST/2609/035", tgl: dIso(0), supplier: "PT Anugerah Pharmindo Lestari", jenis: "OOT", item: 1, total: 960000, status: "Dikirim" },
    { no: "SP/PST/2609/034", tgl: dIso(0), supplier: "PT Bina San Prima", jenis: "Reguler", item: 12, total: 14980000, status: "Draft" },
    { no: "SP/PST/2609/027", tgl: dIso(-7), supplier: "PT Enseval Putera Megatrading", jenis: "Reguler", item: 31, total: 46250000, status: "Selesai" },
    { no: "SP/PST/2609/026", tgl: dIso(-9), supplier: "PT Kimia Farma Trading & Distribution", jenis: "Narkotika", item: 1, total: 1160000, status: "Selesai" },
    { no: "SP/PST/2609/025", tgl: dIso(-10), supplier: "PT Enseval Putera Megatrading", jenis: "Psikotropika", item: 3, total: 2240000, status: "Selesai" },
    { no: "SP/PST/2609/024", tgl: dIso(-12), supplier: "PT Anugerah Pharmindo Lestari", jenis: "Reguler", item: 19, total: 28400000, status: "Selesai" },
    { no: "SP/PST/2609/023", tgl: dIso(-14), supplier: "PT Kimia Farma Trading & Distribution", jenis: "Reguler", item: 22, total: 33150000, status: "Ditolak" },
  ].sort((a, b) => b.no.localeCompare(a.no));
  const spTtd = (sp) => !["Draft", "Menunggu TTD Apoteker"].includes(sp.status);

  function spItems(sp) {
    const j = jenisOf(sp.jenis);
    const n = parseInt(sp.no.slice(-3), 10);
    const cnt = Math.min(sp.item, j.pool.length);
    const per = sp.total / 1.11 / cnt;
    return Array.from({ length: cnt }, (_, k) => {
      const o = j.pool[(n * 7 + k) % j.pool.length];
      const [sat] = satBeli(o);
      const h = hnaBeli(o);
      return { o, sat, qty: Math.min(sp.jenis === "Reguler" ? 60 : 20, Math.max(2, Math.round(per / (h * 0.95)))), harga: h, disc: 5 };
    });
  }

  const PBF_META = {
    "PBF-01": { alamat: "Jl. Budi Utomo No. 1, Sawah Besar, Jakarta Pusat", npwp: "01.001.629.5-051.000", apj: "apt. Hendra Kusuma, S.Farm.", sipa: "SIPA 503/0112/PBF/2021", limit: 350000000, khusus: ["Narkotika", "Psikotropika", "Prekursor", "OOT"], ontime: 97.8, fill: 95.2, lead: 1.8, retur: 0.6, bank: "Mandiri 070-00-1234567-8", berlaku: dIso(820) },
    "PBF-02": { alamat: "Jl. Gunung Sahari Raya No. 60, Jakarta Utara", npwp: "01.302.118.4-046.000", apj: "apt. Lestari Ningsih, S.Farm.", sipa: "SIPA 503/0231/PBF/2020", limit: 400000000, khusus: ["Psikotropika", "Prekursor", "OOT"], ontime: 95.1, fill: 97.4, lead: 2.1, retur: 0.9, bank: "BCA 501-088-7766", berlaku: dIso(410) },
    "PBF-03": { alamat: "Jl. Pulo Lentut No. 10, Kawasan Industri Pulogadung, Jakarta Timur", npwp: "01.070.452.7-092.000", apj: "apt. Robert Tanujaya, S.Farm.", sipa: "SIPA 503/0877/PBF/2022", limit: 250000000, khusus: ["Psikotropika", "Prekursor"], ontime: 98.4, fill: 96.1, lead: 1.6, retur: 0.4, bank: "BCA 522-301-4455", berlaku: dIso(1020) },
    "PBF-04": { alamat: "Jl. Industri Raya Blok B3 No. 8, Jatiuwung, Tangerang", npwp: "01.555.210.9-402.000", apj: "apt. Yohanes Wibowo, S.Farm.", sipa: "SIPA 503/0419/PBF/2021", limit: 200000000, khusus: ["Prekursor", "OOT"], ontime: 91.6, fill: 92.8, lead: 3.4, retur: 1.7, bank: "BNI 019-8877-665", berlaku: dIso(64) },
    "PBF-05": { alamat: "Jl. Soekarno-Hatta No. 211, Bandung", npwp: "01.119.874.2-424.000", apj: "apt. Diana Puspita, S.Farm.", sipa: "SIPA 503/0098/PBF/2019", limit: 150000000, khusus: ["OOT"], ontime: 93.2, fill: 94.5, lead: 2.8, retur: 1.2, bank: "BRI 0331-01-000456-30-2", berlaku: dIso(215) },
  };

  /* Faktur hutang: nilai per PBF dipecah ke beberapa faktur, total = DB.supplier.hutang */
  const FRACS = [0.36, 0.27, 0.22, 0.15];
  const AGE = [[6, 16], [22, 38], [41, 58], [63, 104]];
  const FAKTUR = DB.supplier.flatMap((s, si) => {
    let used = 0;
    return FRACS.map((f, k) => {
      const sisa = k === FRACS.length - 1 ? s.hutang - used : Math.round((s.hutang * f) / 1000) * 1000;
      used += sisa;
      const umur = AGE[k][0] + ((si * 7 + k * 5) % (AGE[k][1] - AGE[k][0]));
      const dibayar = (si + k) % 3 === 1 ? Math.round((sisa * 0.4) / 1000) * 1000 : 0;
      const code = ["KFTD", "APL", "EPM", "PPG", "BSP"][si];
      return { no: `${code}/INV/${YM}/${String(4120 + si * 173 + k * 29).padStart(5, "0")}`, sup: s, tgl: -umur, jt: s.top - umur, umur, nilai: sisa + dibayar, dibayar, sisa, sp: `SP/PST/${YM}/0${String(10 + si * 3 + k).padStart(2, "0")}` };
    });
  });
  const agingOf = (u) => (u <= 30 ? 0 : u <= 60 ? 1 : u <= 90 ? 2 : 3);
  const AGING = ["0–30 hari", "31–60 hari", "61–90 hari", "> 90 hari"];
  const jtBadge = (d) => (d < 0 ? badge(`Lewat ${-d} hari`, "red", { icon: "error" }) : d === 0 ? badge("Hari ini", "red", { icon: "alarm" }) : d <= 7 ? badge(`${d} hari lagi`, "amber", { icon: "schedule" }) : badge(`${d} hari lagi`, "gray"));

  /* =====================================================================
     1. SURAT PESANAN
     ===================================================================== */
  const spLetter = (sp, items, signed) => {
    const j = jenisOf(sp.jenis);
    const s = supBy(sp.supplier);
    const m = PBF_META[s.id];
    const khusus = sp.jenis !== "Reguler";
    return `
    <div style="background:var(--surface);border:1px solid var(--border-strong);border-radius:6px;padding:28px 32px;box-shadow:var(--shadow-md);font-size:13px;line-height:1.55" class="stack">
      <div class="row" style="gap:14px;flex-wrap:nowrap;border-bottom:3px double var(--border-strong);padding-bottom:12px">
        <div class="sq-ico blue" style="width:54px;height:54px">${icon("local_pharmacy")}</div>
        <div style="flex:1">
          <div style="font-size:18px;font-weight:800;letter-spacing:.02em">${esc(DB.apotek.nama.toUpperCase())}</div>
          <div class="small">${esc(DB.apotek.badanUsaha)} · ${esc(DB.apotek.alamat)} · Telp. ${esc(DB.apotek.telp)}</div>
          <div class="small muted">${esc(DB.apotek.sia)} · NPWP ${esc(DB.apotek.npwp)}</div>
        </div>
      </div>
      <div class="center"><div style="font-weight:800;font-size:15px;text-decoration:underline">${j.judul}</div><div class="small">Nomor: <b class="mono">${sp.no}</b></div></div>
      <div>Yang bertanda tangan di bawah ini:</div>
      <dl class="kv" style="margin:0;grid-template-columns:150px 1fr;max-width:560px"><dt>Nama</dt><dd style="text-align:left">${esc(DB.apotek.apotekerPJ)}</dd><dt>Jabatan</dt><dd style="text-align:left">Apoteker Penanggung Jawab</dd><dt>Nomor SIPA</dt><dd style="text-align:left">${esc(DB.apotek.sipa.replace("SIPA ", ""))}</dd></dl>
      <div>Mengajukan pesanan ${esc(j.obj)} kepada:</div>
      <dl class="kv" style="margin:0;grid-template-columns:150px 1fr;max-width:560px"><dt>Nama PBF</dt><dd style="text-align:left">${esc(s.nama)}</dd><dt>Alamat</dt><dd style="text-align:left">${esc(m.alamat)}</dd><dt>Telp.</dt><dd style="text-align:left">${esc(s.hp)}</dd><dt>Izin PBF</dt><dd style="text-align:left">${esc(s.izin)}</dd></dl>
      <div>Dengan ${esc(j.obj)} yang dipesan adalah:</div>
      <div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>No</th><th>Nama ${khusus ? esc(j.obj) : "obat"}</th><th>Zat aktif</th><th>Bentuk & kekuatan</th><th>Satuan</th><th class="num">Jumlah</th><th>Terbilang</th></tr></thead>
        <tbody>${items.map((r, k) => `<tr><td>${k + 1}</td><td class="strong">${esc(r.o.nama)}</td><td>${esc(r.o.generik)}</td><td>${esc(r.o.bentuk)}</td><td>${esc(r.sat)}${r.sat !== r.o.satuan ? ` @${satBeli(r.o)[1]} ${esc(r.o.satuan)}` : ""}</td><td class="num nowrap strong">${num(r.qty)}</td><td class="small">${terbilang(r.qty)}</td></tr>`).join("")}</tbody>
      </table></div>
      <div>${esc(j.obj.charAt(0).toUpperCase() + j.obj.slice(1))} tersebut akan dipergunakan untuk memenuhi kebutuhan:</div>
      <dl class="kv" style="margin:0;grid-template-columns:150px 1fr;max-width:560px"><dt>Nama apotek</dt><dd style="text-align:left">${esc(DB.apotek.nama)} — ${esc(cabangNama("PST"))}</dd><dt>Alamat</dt><dd style="text-align:left">${esc(DB.apotek.alamat)}</dd><dt>Surat Izin Apotek</dt><dd style="text-align:left">${esc(DB.apotek.sia.replace("SIA ", ""))}</dd></dl>
      <div class="row between" style="align-items:flex-end;margin-top:8px">
        <div class="small muted" style="max-width:320px">${khusus ? `Rangkap: 1) PBF 2) Arsip apotek 3) Dinkes 4) Balai POM. Disimpan minimal 5 tahun.` : "Harga & diskon mengikuti kesepakatan kontrak tahunan dengan PBF."}</div>
        <div class="center" style="min-width:240px">
          <div>Jakarta, ${tgl(sp.tgl)}</div><div>Pemesan,</div>
          <div id="sp-sign" style="height:86px;display:grid;place-items:center">${signed ? signedHtml() : '<span class="small muted">( tanda tangan & stempel )</span>'}</div>
          <div style="font-weight:800;text-decoration:underline">${esc(DB.apotek.apotekerPJ)}</div>
          <div class="small">${esc(DB.apotek.sipa)}</div>
        </div>
      </div>
    </div>`;
  };
  function signedHtml() { return `<div class="row" style="gap:8px;flex-wrap:nowrap;color:var(--t-purple-fg)"><span class="ms" style="font-size:56px" aria-hidden="true">qr_code_2</span><span class="small" style="text-align:left">Ditandatangani secara elektronik<br><b>${esc(apjShort)}</b><br>${tgl(DB.TODAY)} · TTE tersertifikasi</span></div>`; }

  function openSpPreview(sp, items) {
    const signed = spTtd(sp);
    const el = modal.open({
      title: `Pratinjau ${sp.no}`, icon: "description", size: "lg",
      body: `
        <div class="row between"><div class="row">${jenisBadge(sp.jenis)}${status(sp.status)}</div><span class="small muted">${esc(supShort(sp.supplier))} · ${items.length} item</span></div>
        ${sp.jenis !== "Reguler" ? alert("info", "policy", `Ketentuan SP ${sp.jenis}`, jenisOf(sp.jenis).rule) : ""}
        ${spLetter(sp, items, signed)}`,
      foot: `${btn("Tutup", "dark", { attrs: "data-close" })}
        ${btn("Cetak", "teal", { icon: "print", attrs: `data-toast="${sp.no} dikirim ke printer (rangkap ${sp.jenis === "Reguler" ? 2 : 4})"` })}
        ${signed ? "" : btn("TTD Digital Apoteker", "purple", { icon: "draw", attrs: "data-ttd" })}
        ${btn("Kirim ke PBF", "primary", { icon: "send", attrs: "data-sp-send" })}`,
    });
    let ok = signed;
    on(el, "[data-ttd]", "click", (b) => { ok = true; el.querySelector("#sp-sign").innerHTML = signedHtml(); b.remove(); toast(`${sp.no} ditandatangani elektronik oleh ${apjShort}`); });
    on(el, "[data-sp-send]", "click", () => {
      if (!ok) { toast("SP belum ditandatangani Apoteker PJ", "warn"); return; }
      modal.close();
      toast(`${sp.no} dikirim ke ${supShort(sp.supplier)} via e-mail & portal PBF`);
    });
  }

  function openSpForm() {
    const rowHtml = (o, qty) => {
      const [sat] = satBeli(o);
      const all = [...DB.obat, ...Object.values(EXTRA)];
      return `<tr>
        <td><select class="select sm sp-obat" aria-label="Obat" style="min-width:210px">${all.map((x) => `<option value="${x.kode}" ${x === o ? "selected" : ""}>${esc(x.nama)}</option>`).join("")}</select><div class="t-sub">${golongan(o.golongan)}</div></td>
        <td>${esc(sat)}</td>
        <td class="num nowrap"><input class="input sm sp-q" type="number" min="1" value="${qty}" style="width:76px;text-align:right" aria-label="Qty"></td>
        <td class="num nowrap"><input class="input sm sp-h" type="number" min="0" value="${hnaBeli(o)}" style="width:120px;text-align:right" aria-label="Harga"></td>
        <td class="num nowrap"><input class="input sm sp-d" type="number" min="0" max="100" step="0.5" value="5" style="width:70px;text-align:right" aria-label="Diskon"></td>
        <td class="num nowrap strong sp-sub"></td>
        <td class="actions">${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus baris", attrs: "data-sprow-del" })}</td></tr>`;
    };
    const DEF = { Reguler: [["OB0017", 10], ["OB0023", 6], ["OB0001", 20], ["OB0013", 8]], Narkotika: [["OB0038", 5]], Psikotropika: [["OB0036", 3], ["OB0037", 5]], Prekursor: [["OB0011", 5]], OOT: [["OB0010", 5]] };
    const find = (k) => byKode(k) || Object.values(EXTRA).find((x) => x.kode === k);
    const rowsFor = (j) => DEF[j].map(([k, q]) => rowHtml(find(k), q)).join("");
    const el = modal.open({
      title: "Buat Surat Pesanan", icon: "shopping_cart_checkout", size: "xl",
      body: `
        <div class="form-grid cols-4">
          ${input("No. SP", { value: `SP/PST/${YM}/037`, attrs: "readonly", hint: "Penomoran terpisah per jenis SP" })}
          ${input("Tanggal SP", { type: "date", value: dIso(0) })}
          ${select("Cabang pemesan", cabOptions(), { value: "PST" })}
          ${select("Jenis SP", JENIS.map((j) => j.id), { id: "sp-jenis" })}
          ${select("Supplier / PBF", DB.supplier.map((s) => ({ v: s.id, l: s.nama })), { id: "sp-sup", value: "PBF-02" })}
          ${input("Termin pembayaran (TOP)", { id: "sp-top", attrs: "readonly" })}
          ${input("Tanggal kirim diharapkan", { type: "date", value: dIso(2) })}
          ${select("Cara bayar", ["Tempo (kredit)", "COD / tunai", "Transfer di muka"])}
        </div>
        <div id="sp-rule">${alert("info", "policy", "Ketentuan SP Reguler", JENIS[0].rule)}</div>
        <div class="table-wrap"><table class="tbl compact">
          <thead><tr><th>Obat</th><th>Satuan beli</th><th class="num">Qty</th><th class="num">Harga (HNA)</th><th class="num">Diskon %</th><th class="num">Subtotal</th><th></th></tr></thead>
          <tbody id="sp-rows">${rowsFor("Reguler")}</tbody>
        </table></div>
        <div class="row">${btn("Tambah Item", "success", { icon: "add", size: "sm", attrs: 'id="sp-add"' })}${btn("Ambil dari Saran Pemesanan", "info", { icon: "auto_awesome", size: "sm", attrs: 'data-toast="4 item dari saran pemesanan ditambahkan" data-tone="info"' })}<span class="small muted" id="sp-add-note"></span></div>
        <div class="grid g-3-2">
          <div class="form-grid">
            ${select("Apoteker penanggung jawab", DB.cabang.map((c) => `${c.apoteker}, S.Farm.`), { value: DB.apotek.apotekerPJ, id: "sp-apj" })}
            ${input("No. SIPA", { value: DB.apotek.sipa, id: "sp-sipa", attrs: "readonly" })}
            ${textarea("Catatan untuk PBF", { cls: "full", value: "Mohon kirim ED minimal 2 tahun. Faktur & e-Faktur pajak dilampirkan bersama barang." })}
          </div>
          <div class="card" style="box-shadow:none"><div class="card-body"><dl class="kv" style="margin:0">
            <dt>Subtotal (HNA)</dt><dd id="sp-t-sub"></dd>
            <dt>Diskon PBF</dt><dd id="sp-t-disc"></dd>
            <dt>DPP</dt><dd id="sp-t-dpp"></dd>
            <dt>PPN 11%</dt><dd id="sp-t-ppn"></dd>
            <dt style="font-weight:800;color:var(--text)">Total estimasi</dt><dd id="sp-t-total" style="font-size:18px;font-weight:800;color:var(--c-primary)"></dd>
          </dl></div></div>
        </div>`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}
        ${btn("Simpan Draft", "light", { icon: "draft", attrs: 'data-close data-toast="Draft SP/PST/2609/037 disimpan"' })}
        ${btn("Preview SP", "info", { icon: "description", attrs: 'id="sp-prev"' })}
        ${btn("Kirim ke PBF", "primary", { icon: "send", attrs: 'id="sp-send"' })}`,
    });
    const $ = (id) => el.querySelector("#" + id);
    const tb = $("sp-rows");
    const calc = () => {
      let sub = 0, disc = 0;
      tb.querySelectorAll("tr").forEach((tr) => {
        const q = +tr.querySelector(".sp-q").value || 0, h = +tr.querySelector(".sp-h").value || 0, d = +tr.querySelector(".sp-d").value || 0;
        sub += q * h; disc += (q * h * d) / 100;
        tr.querySelector(".sp-sub").textContent = rp(q * h * (1 - d / 100));
      });
      const dpp = sub - disc;
      $("sp-t-sub").textContent = rp(sub); $("sp-t-disc").textContent = "−" + rp(disc); $("sp-t-dpp").textContent = rp(dpp);
      $("sp-t-ppn").textContent = rp(dpp * 0.11); $("sp-t-total").textContent = rp(dpp * 1.11);
    };
    const setJenis = () => {
      const j = jenisOf($("sp-jenis").value);
      tb.innerHTML = rowsFor(j.id);
      $("sp-rule").innerHTML = alert(j.id === "Reguler" ? "info" : "warn", "policy", `Ketentuan SP ${j.id}`, j.rule);
      $("sp-add").disabled = j.id === "Narkotika";
      $("sp-add-note").textContent = j.id === "Narkotika" ? "SP narkotika dibatasi 1 item per SP." : "";
      if (j.id === "Narkotika") $("sp-sup").value = "PBF-01";
      setTop(); calc();
    };
    const setTop = () => { const s = DB.supplier.find((x) => x.id === $("sp-sup").value); $("sp-top").value = `${s.top} hari · ${s.izin}`; };
    $("sp-jenis").addEventListener("change", setJenis);
    $("sp-sup").addEventListener("change", setTop);
    $("sp-apj").addEventListener("change", () => { const i = $("sp-apj").selectedIndex; $("sp-sipa").value = i === 0 ? DB.apotek.sipa : `SIPA 449.1/0${312 + i * 47}/DPMPTSP/202${3 + (i % 2)}`; });
    tb.addEventListener("input", calc);
    tb.addEventListener("change", (e) => {
      if (!e.target.classList.contains("sp-obat")) return;
      const tr = e.target.closest("tr");
      tr.outerHTML = rowHtml(find(e.target.value), tr.querySelector(".sp-q").value);
      calc();
    });
    tb.addEventListener("click", (e) => { const d = e.target.closest("[data-sprow-del]"); if (d && tb.children.length > 1) { d.closest("tr").remove(); calc(); } });
    $("sp-add").addEventListener("click", () => { const pool = jenisOf($("sp-jenis").value).pool; tb.insertAdjacentHTML("beforeend", rowHtml(pool[(tb.children.length * 5) % pool.length], 1)); calc(); });
    const draft = () => {
      const s = DB.supplier.find((x) => x.id === $("sp-sup").value);
      const items = [...tb.querySelectorAll("tr")].map((tr) => { const o = find(tr.querySelector(".sp-obat").value); return { o, sat: satBeli(o)[0], qty: +tr.querySelector(".sp-q").value || 1 }; });
      return [{ no: `SP/PST/${YM}/037`, tgl: dIso(0), supplier: s.nama, jenis: $("sp-jenis").value, item: items.length, total: 0, status: "Draft" }, items];
    };
    $("sp-prev").addEventListener("click", () => openSpPreview(...draft()));
    $("sp-send").addEventListener("click", () => {
      const [sp] = draft();
      if (sp.jenis !== "Reguler") { openSpPreview(...draft()); toast(`SP ${sp.jenis} wajib ditandatangani Apoteker PJ sebelum dikirim`, "warn"); return; }
      modal.close(); toast(`${sp.no} dikirim ke ${supShort(sp.supplier)}`);
    });
    setTop(); calc();
  }

  window.PAGES.pesanan = {
    render() {
      const bulan = SP.filter((s) => s.status !== "Ditolak");
      const ttd = SP.filter((s) => s.status === "Menunggu TTD Apoteker");
      const open = SP.filter((s) => ["Dikirim", "Diterima Sebagian"].includes(s.status));
      const kh = SP.filter((s) => s.jenis !== "Reguler");
      const cols = [
        { label: "No. SP", render: (s) => `<span class="mono strong">${s.no}</span><div class="t-sub">${tgl(s.tgl)}</div>` },
        { label: "Supplier / PBF", render: (s) => `<div class="t-main">${esc(supShort(s.supplier))}</div><div class="t-sub">${esc(supBy(s.supplier).izin)} · TOP ${supBy(s.supplier).top} hari</div>` },
        { label: "Jenis", render: (s) => jenisBadge(s.jenis) },
        { label: "Item", cls: "num nowrap", render: (s) => num(s.item) },
        { label: "Total", cls: "num nowrap", render: (s) => `<b>${rp(s.total)}</b>` },
        { label: "Apoteker PJ", render: (s) => `<span class="small">${esc(apjShort)}</span><div class="t-sub">${spTtd(s) ? badge("Sudah TTD", "green", { icon: "draw" }) : badge("Belum TTD", "amber", { icon: "draw" })}</div>` },
        { label: "Status", render: (s) => status(s.status) },
        { label: "", cls: "actions", render: (s) => `<div class="btn-group" style="flex-wrap:nowrap">
          ${btn("", "info", { icon: "visibility", size: "sm", title: "Pratinjau SP", attrs: `data-sp="${s.no}"` })}
          ${spTtd(s) ? "" : btn("", "purple", { icon: "draw", size: "sm", title: "TTD Digital Apoteker", attrs: `data-sp="${s.no}"` })}
          ${s.status === "Draft" && s.jenis === "Reguler" ? btn("", "primary", { icon: "send", size: "sm", title: "Kirim ke PBF", attrs: `data-toast="${s.no} dikirim ke ${esc(supShort(s.supplier))}"` }) : ""}
          ${["Dikirim", "Diterima Sebagian"].includes(s.status) ? btn("", "success", { icon: "inventory", size: "sm", title: "Terima barang", attrs: `data-go="penerimaan" data-pn="${s.no}"` }) : ""}
          ${btn("", "teal", { icon: "print", size: "sm", title: "Cetak", attrs: `data-toast="${s.no} dikirim ke printer"` })}</div>` },
      ];
      const panel = (id, rows) => `<div data-panel-group="sp-tab" data-panel="${id}" style="margin-top:12px" ${id === "semua" ? "" : "hidden"}>
        ${id !== "semua" && id !== "Reguler" ? `<div style="padding:0 20px 12px">${alert("warn", jenisOf(id).ic, `Ketentuan SP ${id}`, jenisOf(id).rule)}</div>` : ""}
        ${table({ columns: cols, rows, empty: "Belum ada SP untuk jenis ini" })}</div>`;
      return `
      ${UI.pageHeader({
        title: "Surat Pesanan (SP)",
        sub: "Pemesanan ke PBF dengan formulir terpisah untuk reguler, narkotika, psikotropika, prekursor, dan OOT — lengkap dengan tanda tangan digital Apoteker PJ.",
        crumbs: ["Pembelian", "Surat Pesanan"],
        actions: `${btn("Buat SP", "success", { icon: "add", attrs: "data-sp-new" })}${btn("Saran Pemesanan", "white", { icon: "auto_awesome", attrs: 'data-go="stok"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Daftar SP diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "SP bulan ini", value: num(bulan.length), icon: "shopping_cart_checkout", tone: "primary", hero: true, foot: `nilai ${short(bulan.reduce((s, x) => s + x.total, 0))}` })}
        ${stat({ label: "Menunggu TTD Apoteker", value: num(ttd.length), icon: "draw", tone: "purple", foot: `${SP.filter((s) => s.status === "Draft").length} draft belum dikirim` })}
        ${stat({ label: "Belum diterima", value: short(open.reduce((s, x) => s + x.total, 0)), icon: "local_shipping", tone: "info", foot: `${open.length} SP dalam pengiriman` })}
        ${stat({ label: "SP khusus", value: num(kh.length), icon: "shield", tone: "danger", foot: "narkotika · psikotropika · prekursor · OOT" })}
      </div>

      ${card({
        title: "Daftar Surat Pesanan", desc: "Cabang Pusat Fatmawati · SP khusus diarsipkan minimal 5 tahun", icon: "receipt_long", flush: true,
        tools: `<div class="input-icon" style="width:240px">${icon("search")}<input class="input sm" type="search" placeholder="Cari no. SP / PBF" aria-label="Cari SP"></div>`,
        body: `<div style="padding:14px 20px 0">${tabs("sp-tab", [{ id: "semua", label: "Semua", n: SP.length }, ...JENIS.map((j) => ({ id: j.id, label: j.id, icon: j.ic, n: SP.filter((s) => s.jenis === j.id).length }))], "semua")}</div>
          ${panel("semua", SP)}${JENIS.map((j) => panel(j.id, SP.filter((s) => s.jenis === j.id))).join("")}`,
      })}

      <div class="grid g-3">
        ${JENIS.slice(1, 4).map((j) => card({ title: `SP ${j.id}`, icon: j.ic, tone: j.tone, body: `<p class="small">${j.rule}</p>` })).join("")}
      </div>`;
    },
    mount(root) {
      on(root, "[data-sp-new]", "click", () => openSpForm());
      on(root, "[data-sp]", "click", (el) => { const sp = SP.find((s) => s.no === el.dataset.sp); openSpPreview(sp, spItems(sp)); });
      on(root, "[data-pn]", "click", (el) => { PN.no = el.dataset.pn; });
    },
  };

  /* =====================================================================
     2. PENERIMAAN BARANG
     ===================================================================== */
  const PN = { no: "SP/PST/2609/031" };
  const pnPending = () => SP.filter((s) => ["Dikirim", "Diterima Sebagian"].includes(s.status));
  const pnRows = (sp) => {
    const n = parseInt(sp.no.slice(-3), 10);
    const sup = supBy(sp.supplier);
    const code = sup.nama.split(" ")[1].slice(0, 2).toUpperCase();
    return spItems(sp).map((r, k) => ({
      ...r,
      terima: k % 7 === 3 ? Math.max(0, r.qty - 2) : r.qty,
      batch: `${code}${2600 + n * 3 + k}${String.fromCharCode(65 + (k % 4))}`,
      ed: dIso(k % 6 === 4 ? 240 + k * 3 : k === 2 ? 150 : 540 + ((n + k * 37) % 360)),
    }));
  };
  const edInfo = (edIso) => {
    const bln = daysTo(edIso) / 30.4;
    return bln < 6 ? ["row-danger", badge(`ED ${Math.max(0, Math.floor(bln))} bln · tolak`, "red", { icon: "error" })] : bln < 12 ? ["row-warn", badge(`ED ${Math.floor(bln)} bln`, "amber", { icon: "warning" })] : ["", badge("ED aman", "green", { icon: "check" })];
  };
  const qtyInfo = (q, t) => (t === q ? badge("Sesuai", "green", { icon: "check" }) : t < q ? badge(`Kurang ${q - t}`, "amber") : badge(`Lebih ${t - q}`, "purple"));

  window.PAGES.penerimaan = {
    render() {
      const pend = pnPending();
      const sp = pend.find((s) => s.no === PN.no) || pend[0];
      const sup = supBy(sp.supplier);
      const rows = pnRows(sp);
      const warnED = rows.filter((r) => daysTo(r.ed) / 30.4 < 12).length;
      const hist = [
        ["BPB/PST/2609/044", -1, "SP/PST/2609/029", "PT Bina San Prima", "BSP/INV/2609/04512", 16, 21600000, 29, "Nabila P.", "Diterima"],
        ["BPB/PST/2609/043", -2, "SP/PST/2609/030", "PT Parit Padang Global", "PPG/INV/2609/04691", 2, 2750000, 58, "apt. Rina W.", "Diterima Sebagian"],
        ["BPB/PST/2609/042", -4, "SP/PST/2609/028", "PT Anugerah Pharmindo Lestari", "APL/INV/2609/04388", 2, 1860000, 41, "apt. Rina W.", "Diterima"],
        ["BPB/PST/2609/041", -6, "SP/PST/2609/027", "PT Enseval Putera Megatrading", "EPM/INV/2609/04466", 31, 46250000, 24, "Yulia A.", "Diterima"],
        ["BPB/PST/2609/040", -8, "SP/PST/2609/026", "PT Kimia Farma Trading & Distribution", "KFTD/INV/2609/04150", 1, 1160000, 22, "apt. Rina W.", "Diterima"],
        ["BPB/PST/2609/039", -9, "SP/PST/2609/025", "PT Enseval Putera Megatrading", "EPM/INV/2609/04421", 3, 2240000, 21, "apt. Rina W.", "Ditolak"],
      ];
      const nilaiBln = hist.filter((h) => h[9] !== "Ditolak").reduce((s, h) => s + h[6], 0);
      return `
      ${UI.pageHeader({
        title: "Penerimaan Barang",
        sub: "Terima barang dari PBF berdasarkan SP & faktur — cek kesesuaian jumlah, batch, dan tanggal kedaluwarsa sebelum masuk stok.",
        crumbs: ["Pembelian", "Penerimaan Barang"],
        actions: `${btn("Scan Faktur", "white", { icon: "document_scanner", attrs: 'data-toast="Pemindai faktur siap — arahkan kamera ke QR e-Faktur" data-tone="info"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Riwayat penerimaan diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "SP menunggu penerimaan", value: num(pend.length), icon: "pending_actions", tone: "primary", foot: short(pend.reduce((s, x) => s + x.total, 0)) })}
        ${stat({ label: "Diterima 7 hari terakhir", value: num(hist.filter((h) => h[1] >= -7 && h[9] !== "Ditolak").length), icon: "inventory", tone: "success", foot: "dokumen BPB" })}
        ${stat({ label: "Item ED < 12 bulan", value: num(warnED), icon: "event_busy", tone: "warning", foot: `pada ${sp.no}` })}
        ${stat({ label: "Nilai penerimaan bulan ini", value: short(nilaiBln), icon: "payments", tone: "teal", foot: "termasuk PPN" })}
      </div>

      ${card({
        title: "Form penerimaan", desc: "Pilih SP lalu cocokkan dengan faktur & fisik barang", icon: "local_shipping", flush: true,
        tools: `${jenisBadge(sp.jenis)}${status(sp.status)}`,
        body: `
          <div class="filterbar" style="border-radius:0">
            ${select("Surat Pesanan", pend.map((s) => ({ v: s.no, l: `${s.no} · ${supShort(s.supplier)}` })), { value: sp.no, id: "pn-sp" })}
            ${input("Supplier", { value: supShort(sup.nama), attrs: "readonly" })}
            ${input("No. faktur", { value: `${sup.nama.split(" ")[1].slice(0, 3).toUpperCase()}/INV/${YM}/0${4700 + parseInt(sp.no.slice(-3), 10)}` })}
            ${input("Tgl faktur", { type: "date", value: dIso(0), id: "pn-tgl" })}
            ${input("Jatuh tempo", { type: "date", value: dIso(sup.top), id: "pn-jt", hint: `TOP ${sup.top} hari` })}
          </div>
          <div class="filterbar" style="border-radius:0">
            ${input("No. surat jalan / DO", { value: `DO-${YM}-${1180 + parseInt(sp.no.slice(-3), 10)}` })}
            ${input("No. seri e-Faktur", { value: `010.002-26.${String(81234567 + parseInt(sp.no.slice(-3), 10)).padStart(8, "0")}` })}
            ${select("Diterima oleh", ["apt. Rina Wulandari (Apoteker PJ)", "Nabila Putri (TTK)", "Yulia Anggraini (Admin Gudang)"], { value: sp.jenis === "Reguler" ? "Nabila Putri (TTK)" : "apt. Rina Wulandari (Apoteker PJ)" })}
            ${input("Suhu saat terima", { value: "24°C", hint: "Wajib untuk produk rantai dingin" })}
          </div>
          <div style="padding:14px 20px 0">${sp.jenis === "Reguler" ? alert("info", "fact_check", "Cek kesesuaian", "Cocokkan nama obat, kekuatan, bentuk sediaan, jumlah, nomor batch, dan ED antara SP, faktur, dan fisik barang. ED minimal 12 bulan; ED &lt; 6 bulan ditolak kecuali disetujui Apoteker PJ.") : alert("warn", "shield", `Penerimaan ${sp.jenis}`, "Wajib diterima & diperiksa langsung oleh Apoteker PJ, faktur ditandatangani dengan mencantumkan nama, No. SIPA, dan stempel apotek.")}</div>
          <div style="margin-top:12px" id="pn-tbl">${table({
            columns: [
              { label: "", render: (r, k) => `<input type="checkbox" class="pn-ok" data-k="${k}" ${r.terima === r.qty && daysTo(r.ed) / 30.4 >= 12 ? "checked" : ""} aria-label="Sesuai">` },
              { label: "Obat", render: (r) => `<div class="t-main">${esc(r.o.nama)}</div><div class="t-sub">${golongan(r.o.golongan)} · ${esc(r.sat)}</div>` },
              { label: "Qty SP", cls: "num nowrap", render: (r) => num(r.qty) },
              { label: "Qty diterima", cls: "num nowrap", render: (r, k) => `<input class="input sm pn-q" type="number" min="0" data-k="${k}" value="${r.terima}" style="width:76px;text-align:right" aria-label="Qty diterima">` },
              { label: "Batch", render: (r) => `<input class="input sm mono" value="${r.batch}" style="width:110px" aria-label="Batch">` },
              { label: "ED", render: (r, k) => `<input class="input sm pn-ed" type="date" data-k="${k}" value="${r.ed}" aria-label="Tanggal kedaluwarsa">` },
              { label: "Harga", cls: "num nowrap", render: (r) => `${rp(r.harga)}<div class="t-sub">disc ${r.disc}%</div>` },
              { label: "Subtotal", cls: "num nowrap", render: (r) => `<b class="pn-sub">${rp(r.terima * r.harga * (1 - r.disc / 100))}</b>` },
              { label: "Kesesuaian", render: (r) => `<div class="stack" style="gap:4px"><span class="pn-qi">${qtyInfo(r.qty, r.terima)}</span><span class="pn-ei">${edInfo(r.ed)[1]}</span></div>` },
            ],
            rows, rowCls: (r) => edInfo(r.ed)[0],
          })}</div>
          <div class="grid g-3-2" style="padding:16px 20px">
            <div class="stack">
              ${textarea("Catatan penerimaan", { value: rows.some((r) => r.terima < r.qty) ? "Sebagian item kurang kirim — PBF menjanjikan susulan dalam 3 hari kerja." : "" })}
              ${input("Lampiran faktur (foto / PDF)", { type: "file" })}
            </div>
            <div class="card" style="box-shadow:none"><div class="card-body"><dl class="kv" style="margin:0">
              <dt>Subtotal</dt><dd id="pn-t-sub"></dd><dt>Diskon PBF</dt><dd id="pn-t-disc"></dd><dt>DPP</dt><dd id="pn-t-dpp"></dd><dt>PPN 11%</dt><dd id="pn-t-ppn"></dd>
              <dt style="font-weight:800;color:var(--text)">Total faktur</dt><dd id="pn-t-total" style="font-size:18px;font-weight:800;color:var(--c-primary)"></dd>
            </dl></div></div>
          </div>`,
        foot: `<span class="small muted" id="pn-note"></span><span style="flex:1"></span>
          ${btn("Tolak Item", "danger", { icon: "block", attrs: "data-pn-tolak" })}
          ${btn("Cetak Bukti Terima", "teal", { icon: "print", attrs: 'data-toast="Bukti penerimaan barang dikirim ke printer"' })}
          ${btn("Simpan Penerimaan", "success", { icon: "inventory", attrs: "data-pn-save" })}`,
      })}

      ${card({
        title: "Riwayat penerimaan", desc: "Bukti Penerimaan Barang (BPB) 10 hari terakhir", icon: "history", flush: true,
        body: table({
          columns: [
            { label: "No. BPB", render: (h) => `<span class="mono strong">${h[0]}</span><div class="t-sub">${tgl(dIso(h[1]))} · ${esc(h[8])}</div>` },
            { label: "No. SP", render: (h) => `<span class="mono small">${h[2]}</span>` },
            { label: "Supplier", render: (h) => esc(supShort(h[3])) },
            { label: "No. faktur", render: (h) => `<span class="mono small">${h[4]}</span>` },
            { label: "Item", cls: "num nowrap", render: (h) => h[5] },
            { label: "Total", cls: "num nowrap", render: (h) => `<b>${rp(h[6])}</b>` },
            { label: "Jatuh tempo", render: (h) => `${tgl(dIso(h[7] + h[1]))}<div class="t-sub">${jtBadge(h[7] + h[1])}</div>` },
            { label: "Status", render: (h) => status(h[9]) },
            { label: "", cls: "actions", render: (h) => UI.rowActions(["view", "print"], h[0]) },
          ],
          rows: hist,
        }),
      })}`;
    },
    mount(root) {
      const pend = pnPending();
      const sp = pend.find((s) => s.no === PN.no) || pend[0];
      const rows = pnRows(sp);
      const $ = (id) => root.querySelector("#" + id);
      const calc = () => {
        let sub = 0, disc = 0, warn = 0, kurang = 0;
        root.querySelectorAll("#pn-tbl tbody tr").forEach((tr, k) => {
          const r = rows[k];
          const t = Math.max(0, +tr.querySelector(".pn-q").value || 0);
          const ed = tr.querySelector(".pn-ed").value;
          const [cls, eb] = edInfo(ed || dIso(0));
          tr.className = cls;
          tr.querySelector(".pn-ei").innerHTML = eb;
          tr.querySelector(".pn-qi").innerHTML = qtyInfo(r.qty, t);
          tr.querySelector(".pn-sub").textContent = rp(t * r.harga * (1 - r.disc / 100));
          sub += t * r.harga; disc += (t * r.harga * r.disc) / 100;
          if (cls) warn++;
          if (t < r.qty) kurang++;
        });
        const dpp = sub - disc;
        $("pn-t-sub").textContent = rp(sub); $("pn-t-disc").textContent = "−" + rp(disc); $("pn-t-dpp").textContent = rp(dpp);
        $("pn-t-ppn").textContent = rp(dpp * 0.11); $("pn-t-total").textContent = rp(dpp * 1.11);
        $("pn-note").innerHTML = `${icon("info")} ${rows.length} item · ${kurang} kurang kirim · ${warn} ED &lt; 12 bulan`;
      };
      on(root, ".pn-q, .pn-ed", "input", calc);
      on(root, ".pn-ed", "change", calc);
      on(root, "#pn-sp", "change", (el) => { PN.no = el.value; window.APP.render(); });
      on(root, "#pn-tgl", "change", (el) => { const d = new Date(el.value); d.setDate(d.getDate() + supBy(sp.supplier).top); $("pn-jt").value = DB.iso(d); });
      on(root, "[data-pn-save]", "click", () => {
        const warn = root.querySelectorAll("#pn-tbl tr.row-danger").length;
        if (warn) { toast(`${warn} item ED < 6 bulan — tolak item atau minta persetujuan Apoteker PJ`, "warn"); return; }
        confirmBox({ title: "Simpan penerimaan?", icon: "inventory", okLabel: "Simpan & Tambah Stok", okVariant: "success", msg: `Stok bertambah sesuai qty diterima per batch, faktur tercatat sebagai hutang ke <b>${esc(sp.supplier)}</b> dan status SP diperbarui.`, onOk: () => toast(`Penerimaan ${sp.no} disimpan · BPB/PST/${YM}/045`) });
      });
      on(root, "[data-pn-tolak]", "click", () => modal.open({
        title: "Tolak Item Penerimaan", icon: "block", size: "sm",
        body: `${select("Item", rows.map((r) => `${r.o.nama} · ${r.batch}`), { value: `${rows[Math.min(2, rows.length - 1)].o.nama} · ${rows[Math.min(2, rows.length - 1)].batch}` })}
          ${select("Alasan penolakan", ["ED kurang dari 6 bulan", "Kemasan rusak / segel terbuka", "Tidak sesuai SP (salah item / kekuatan)", "Suhu rantai dingin tidak terjaga", "Nomor batch berbeda dengan faktur"])}
          ${input("Qty ditolak", { type: "number", value: 2 })}
          ${textarea("Keterangan", { value: "Dikembalikan bersama kurir, PBF diminta menerbitkan nota kredit." })}`,
        foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Tolak Item", "danger", { icon: "block", attrs: 'data-close data-toast="Item ditolak & nota retur dibuat" data-tone="danger"' })}`,
      }));
      calc();
    },
  };

  /* =====================================================================
     3. RETUR PEMBELIAN
     ===================================================================== */
  const RB_STATUS = { Diajukan: "blue", "Disetujui PBF": "green", "Dipotong di faktur": "teal", Ditolak: "red" };
  const rbBadge = (s) => badge(s, RB_STATUS[s] || "gray", { dot: true });
  const RB_STEPS = [["Diajukan", "send"], ["Disetujui PBF", "verified"], ["Barang diambil", "local_shipping"], ["Dipotong di faktur", "receipt_long"]];
  const RETUR = [
    { no: "RB/PST/2609/008", tgl: -1, sup: DB.supplier[1], faktur: "APL/INV/2608/03877", alasan: "ED dekat", item: 3, nilai: 1845000, solusi: "Potong faktur", status: "Diajukan" },
    { no: "RB/PST/2609/007", tgl: -3, sup: DB.supplier[0], faktur: "KFTD/INV/2608/03512", alasan: "Rusak", item: 1, nilai: 285000, solusi: "Ganti barang", status: "Disetujui PBF" },
    { no: "RB/BKS/2609/004", tgl: -4, sup: DB.supplier[2], faktur: "EPM/INV/2609/04102", alasan: "Salah kirim", item: 2, nilai: 1320000, solusi: "Potong faktur", status: "Dipotong di faktur" },
    { no: "RB/PST/2609/006", tgl: -6, sup: DB.supplier[3], faktur: "PPG/INV/2607/02998", alasan: "ED dekat", item: 5, nilai: 2760000, solusi: "Potong faktur", status: "Dipotong di faktur" },
    { no: "RB/DPK/2609/003", tgl: -8, sup: DB.supplier[4], faktur: "BSP/INV/2608/03120", alasan: "Recall BPOM", item: 1, nilai: 912000, solusi: "Refund", status: "Disetujui PBF" },
    { no: "RB/TGR/2609/002", tgl: -11, sup: DB.supplier[1], faktur: "APL/INV/2606/02210", alasan: "ED dekat", item: 2, nilai: 640000, solusi: "Potong faktur", status: "Ditolak" },
    { no: "RB/PST/2609/005", tgl: -13, sup: DB.supplier[0], faktur: "KFTD/INV/2608/03390", alasan: "Rusak", item: 2, nilai: 438000, solusi: "Potong faktur", status: "Dipotong di faktur" },
  ];
  const alasanBadge = (a) => badge(a, { "ED dekat": "amber", Rusak: "red", "Salah kirim": "purple", "Recall BPOM": "red" }[a] || "gray");
  const rbItems = (r) => {
    const near = DB.batches.filter((b) => b.sisaHari >= 0 && b.sisaHari <= 120 && !["narkotika", "psikotropika"].includes(b.golongan));
    const n = parseInt(r.no.slice(-3), 10);
    return Array.from({ length: r.item }, (_, k) => near[(n * 5 + k * 3) % near.length]);
  };

  function openRetur(r) {
    const items = rbItems(r);
    const i = RB_STEPS.findIndex(([l]) => l === r.status);
    const idx = r.status === "Dipotong di faktur" ? 4 : i;
    modal.open({
      title: `Nota Retur ${r.no}`, icon: "undo", size: "lg",
      body: `
        ${r.status === "Ditolak" ? alert("danger", "block", "Retur ditolak PBF", "Batch sudah melewati batas waktu retur (maks. H-90 sebelum ED sesuai kontrak). Pertimbangkan diskon cepat atau pemusnahan.") : `<div class="steps">${RB_STEPS.map(([l, ic], k) => `<div class="step ${k < idx ? "done" : k === idx ? "now" : ""}"><div class="b">${icon(k < idx ? "check" : ic)}</div>${l}</div>`).join("")}</div>`}
        <div class="grid g-2">
          <dl class="kv" style="margin:0"><dt>Supplier</dt><dd>${esc(r.sup.nama)}</dd><dt>Faktur asal</dt><dd class="mono">${r.faktur}</dd><dt>Tanggal</dt><dd>${tgl(dIso(r.tgl))}</dd></dl>
          <dl class="kv" style="margin:0"><dt>Alasan</dt><dd>${alasanBadge(r.alasan)}</dd><dt>Penyelesaian</dt><dd>${esc(r.solusi)}</dd><dt>Status</dt><dd>${rbBadge(r.status)}</dd></dl>
        </div>
        ${table({
          cls: "compact",
          columns: [
            { label: "No", render: (b, k) => k + 1 },
            { label: "Obat", render: (b) => `<div class="t-main">${esc(b.nama)}</div><div class="t-sub">${golongan(b.golongan)}</div>` },
            { label: "Batch", render: (b) => `<span class="mono">${b.batch}</span>` },
            { label: "ED", render: (b) => tgl(b.ed) },
            { label: "Qty", cls: "num nowrap", render: (b) => `${num(Math.min(b.qty, 12))} ${esc(b.satuan)}` },
          ],
          rows: items,
          foot: `<tr><td colspan="4">Nilai retur (HNA + PPN)</td><td class="num nowrap">${rp(r.nilai)}</td></tr>`,
        })}
        <div class="grid g-3 center small" style="gap:8px;margin-top:6px"><div>Dibuat oleh<br><br><br><b>Yulia Anggraini</b><div class="muted">Admin Gudang</div></div><div>Disetujui<br><br><br><b>${esc(apjShort)}</b><div class="muted">Apoteker PJ</div></div><div>Diterima PBF<br><br><br><b>${esc(r.sup.cp)}</b><div class="muted">${esc(supShort(r.sup.nama))}</div></div></div>`,
      foot: `${btn("Tutup", "dark", { attrs: "data-close" })}${btn("Cetak Nota Retur", "teal", { icon: "print", attrs: `data-toast="Nota retur ${r.no} dikirim ke printer"` })}${r.status === "Diajukan" ? btn("Ubah", "warning", { icon: "edit", attrs: 'data-close data-toast="Nota retur dibuka untuk diubah" data-tone="info"' }) : ""}`,
    });
  }

  window.PAGES.returbeli = {
    render() {
      const n = (s) => RETUR.filter((r) => r.status === s);
      const nearBatches = DB.batches.filter((b) => b.sisaHari >= 0 && b.sisaHari <= 120 && !["narkotika", "psikotropika"].includes(b.golongan)).sort((a, b) => a.sisaHari - b.sisaHari);
      return `
      ${UI.pageHeader({
        title: "Retur Pembelian",
        sub: "Pengembalian barang ke PBF karena ED dekat, rusak, salah kirim, atau recall — dengan nota retur dan pemotongan faktur.",
        crumbs: ["Pembelian", "Retur Pembelian"],
        actions: `${btn("Batch ED Dekat", "white", { icon: "event_busy", attrs: 'data-go="kadaluarsa"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Daftar retur pembelian diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Retur bulan ini", value: num(RETUR.length), icon: "undo", tone: "primary", hero: true, foot: `nilai ${short(RETUR.reduce((s, r) => s + r.nilai, 0))}` })}
        ${stat({ label: "Menunggu persetujuan PBF", value: num(n("Diajukan").length), icon: "hourglass_top", tone: "info", foot: short(n("Diajukan").reduce((s, r) => s + r.nilai, 0)) })}
        ${stat({ label: "Disetujui PBF", value: num(n("Disetujui PBF").length), icon: "verified", tone: "success", foot: "menunggu pengambilan barang" })}
        ${stat({ label: "Dipotong di faktur", value: short(n("Dipotong di faktur").reduce((s, r) => s + r.nilai, 0)), icon: "receipt_long", tone: "teal", foot: `${n("Dipotong di faktur").length} nota kredit` })}
      </div>

      <div class="grid g-1-2">
        ${card({
          title: "Ajukan retur", desc: "Nota retur dibuat otomatis", icon: "add_circle", tone: "amber",
          body: `<div class="form-grid">
            ${input("No. nota retur", { value: `RB/PST/${YM}/009`, attrs: "readonly" })}
            ${input("Tanggal", { type: "date", value: dIso(0) })}
            ${select("Supplier / PBF", DB.supplier.map((s) => s.nama), { cls: "full", value: DB.supplier[1].nama })}
            ${select("No. faktur asal", FAKTUR.filter((f) => f.sup === DB.supplier[1]).map((f) => `${f.no} · ${tgl(dIso(f.tgl))}`), { cls: "full" })}
            ${select("Obat / batch", nearBatches.map((b) => `${b.nama} · ${b.batch} · ED ${tgl(b.ed)}`), { cls: "full" })}
            ${input("Qty retur", { type: "number", value: 10 })}
            ${select("Cabang", cabOptions(), { value: "PST" })}
            ${select("Alasan", ["ED dekat (≤ 3 bulan)", "Rusak / kemasan cacat", "Salah kirim", "Tidak sesuai SP", "Recall BPOM"])}
            ${select("Penyelesaian", ["Potong faktur (nota kredit)", "Ganti barang", "Refund / transfer"])}
            ${textarea("Keterangan", { cls: "full", value: "ED Jan 2027, sesuai kontrak dapat diretur maksimal H-90." })}
            ${input("Foto bukti", { type: "file", cls: "full" })}
          </div>`,
          foot: `${btn("Cetak Nota", "teal", { icon: "print", attrs: 'data-toast="Draft nota retur dikirim ke printer"' })}<span style="flex:1"></span>${btn("Ajukan Retur", "primary", { icon: "send", attrs: `data-toast="Retur RB/PST/${YM}/009 diajukan ke PBF"` })}`,
        })}
        ${card({
          title: "Daftar retur pembelian", desc: "Status: Diajukan → Disetujui PBF → Dipotong di faktur", icon: "list_alt", flush: true,
          tools: `<div class="chips" data-chip-group="rb-f" style="padding:0">${["Semua", "Diajukan", "Disetujui PBF", "Dipotong di faktur", "Ditolak"].map((s, i) => `<button type="button" class="chip ${i === 0 ? "active" : ""}" data-rb-f="${i ? s : ""}">${s}</button>`).join("")}</div>`,
          body: table({
            columns: [
              { label: "No. nota", render: (r) => `<span class="mono strong">${r.no}</span><div class="t-sub">${tgl(dIso(r.tgl))}</div>` },
              { label: "Supplier", render: (r) => `${esc(supShort(r.sup.nama))}<div class="t-sub mono">${r.faktur}</div>` },
              { label: "Alasan", render: (r) => alasanBadge(r.alasan) },
              { label: "Item", cls: "num nowrap", render: (r) => r.item },
              { label: "Nilai", cls: "num nowrap", render: (r) => `<b>${rp(r.nilai)}</b>` },
              { label: "Penyelesaian", render: (r) => `<span class="small">${esc(r.solusi)}</span>` },
              { label: "Status", render: (r) => rbBadge(r.status) },
              { label: "", cls: "actions", render: (r) => `<div class="btn-group" style="flex-wrap:nowrap">${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat nota retur", attrs: `data-rb="${r.no}"` })}${btn("", "teal", { icon: "print", size: "sm", title: "Cetak", attrs: `data-toast="Nota retur ${r.no} dikirim ke printer"` })}</div>` },
            ],
            rows: RETUR,
          }),
        })}
      </div>

      ${card({
        title: "Ketentuan retur ke PBF", icon: "rule", tone: "cyan",
        body: `<div class="grid g-4" style="gap:16px">
          ${[["event_busy", "ED dekat", "Diterima PBF hingga H-90 sebelum ED (KFTD, APL) atau H-60 (PBF lain) sesuai kontrak."], ["broken_image", "Rusak", "Wajib foto kemasan & dilaporkan maksimal 3 hari setelah barang diterima."], ["swap_horiz", "Salah kirim", "Barang dikembalikan utuh bersegel, PBF menanggung ongkos kirim balik."], ["campaign", "Recall BPOM", "Tarik seluruh batch dari semua cabang, karantina, lalu serahkan ke PBF dengan berita acara."]].map(([ic, t, d]) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div class="sq-ico cyan">${icon(ic)}</div><div><b class="small">${t}</b><div class="small muted">${d}</div></div></div>`).join("")}
        </div>`,
      })}`;
    },
    mount(root) {
      on(root, "[data-rb]", "click", (el) => openRetur(RETUR.find((r) => r.no === el.dataset.rb)));
      on(root, "[data-rb-f]", "click", (el) => {
        const f = el.dataset.rbF;
        el.closest(".card").querySelectorAll("tbody tr").forEach((tr, i) => { tr.hidden = !!f && RETUR[i].status !== f; });
      });
    },
  };

  /* =====================================================================
     4. HUTANG SUPPLIER
     ===================================================================== */
  const BAYAR = [
    ["PAY/2609/018", -2, DB.supplier[0], "KFTD/INV/2608/03390", "Transfer BCA", 48250000],
    ["PAY/2609/017", -5, DB.supplier[1], "APL/INV/2608/03812", "Transfer Mandiri", 62400000],
    ["PAY/2609/016", -9, DB.supplier[2], "EPM/INV/2608/03655", "Giro BCA 0284551", 37800000],
    ["PAY/2609/015", -13, DB.supplier[3], "PPG/INV/2607/02998", "Transfer BCA", 21960000],
    ["PAY/2609/014", -18, DB.supplier[4], "BSP/INV/2608/03120", "Virtual Account", 18450000],
  ];

  function openBayar(f) {
    const el = modal.open({
      title: `Bayar Faktur ${f.no}`, icon: "payments", size: "lg",
      body: `
        <div class="grid g-2">
          <dl class="kv" style="margin:0"><dt>Supplier</dt><dd>${esc(f.sup.nama)}</dd><dt>No. faktur</dt><dd class="mono">${f.no}</dd><dt>Tgl faktur</dt><dd>${tgl(dIso(f.tgl))}</dd><dt>Jatuh tempo</dt><dd>${tgl(dIso(f.jt))} ${jtBadge(f.jt)}</dd></dl>
          <dl class="kv" style="margin:0"><dt>Nilai faktur</dt><dd>${rp(f.nilai)}</dd><dt>Sudah dibayar</dt><dd>${rp(f.dibayar)}</dd><dt>Sisa hutang</dt><dd style="color:var(--t-red-fg)">${rp(f.sisa)}</dd><dt>Rekening PBF</dt><dd>${esc(PBF_META[f.sup.id].bank)}</dd></dl>
        </div>
        <div class="form-grid cols-3">
          ${input("Tanggal bayar", { type: "date", value: dIso(0) })}
          ${select("Metode pembayaran", ["Transfer bank", "Giro / cek", "Virtual Account PBF", "Tunai"])}
          ${select("Rekening sumber", ["BCA 527-0881-234 (Operasional)", "Mandiri 124-00-0987654-3", "Kas Besar Pusat"])}
          <div class="field"><label for="by-nom">Nominal bayar</label><input id="by-nom" class="input" type="number" min="0" value="${f.sisa}" style="text-align:right"></div>
          <div class="field"><label for="by-pot">Potongan nota retur</label><input id="by-pot" class="input" type="number" min="0" value="0" style="text-align:right"><span class="hint">Dari retur berstatus disetujui</span></div>
          ${input("Sisa setelah bayar", { id: "by-sisa", attrs: "readonly" })}
          ${input("No. referensi / giro", { ph: "mis. TRX 2609 8812 0045" })}
          ${input("Bukti transfer", { type: "file", attrs: 'accept="image/*,application/pdf"', hint: "JPG, PNG, atau PDF maks. 5 MB" })}
          ${input("Biaya transfer", { type: "number", value: 6500 })}
          ${textarea("Catatan", { cls: "full", value: `Pelunasan ${f.no} · ${f.sp}` })}
        </div>`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Bayar", "success", { icon: "payments", attrs: 'id="by-ok"' })}`,
    });
    const $ = (id) => el.querySelector("#" + id);
    const upd = () => { const s = Math.max(0, f.sisa - (+$("by-nom").value || 0) - (+$("by-pot").value || 0)); $("by-sisa").value = s ? rp(s) : "Lunas"; };
    ["by-nom", "by-pot"].forEach((id) => $(id).addEventListener("input", upd));
    $("by-ok").addEventListener("click", () => { const v = +$("by-nom").value || 0; if (!v) { toast("Nominal pembayaran belum diisi", "warn"); return; } modal.close(); toast(`Pembayaran ${rp(v)} untuk ${f.no} dicatat`); });
    upd();
  }

  window.PAGES.hutang = {
    render() {
      const total = FAKTUR.reduce((s, f) => s + f.sisa, 0);
      const minggu = FAKTUR.filter((f) => f.jt >= 0 && f.jt <= 7);
      const lewat = FAKTUR.filter((f) => f.jt < 0);
      const dibayar = BAYAR.reduce((s, b) => s + b[5], 0);
      const aging = DB.supplier.map((s) => { const a = [0, 0, 0, 0]; FAKTUR.filter((f) => f.sup === s).forEach((f) => { a[agingOf(f.umur)] += f.sisa; }); return { s, a, t: a.reduce((x, y) => x + y, 0) }; });
      const tot = [0, 1, 2, 3].map((k) => aging.reduce((s, r) => s + r.a[k], 0));
      const byJt = FAKTUR.slice().sort((a, b) => a.jt - b.jt);
      const fcols = [
        { label: "No. faktur", render: (f) => `<span class="mono strong">${f.no}</span><div class="t-sub mono">${f.sp}</div>` },
        { label: "Supplier", render: (f) => esc(supShort(f.sup.nama)) },
        { label: "Tgl faktur", render: (f) => `<span class="nowrap">${tgl(dIso(f.tgl))}</span><div class="t-sub">umur ${f.umur} hari</div>` },
        { label: "Jatuh tempo", render: (f) => `<span class="nowrap">${tgl(dIso(f.jt))}</span><div class="t-sub">${jtBadge(f.jt)}</div>` },
        { label: "Nilai faktur", cls: "num nowrap", render: (f) => `${rp(f.nilai)}${f.dibayar ? `<div class="t-sub">dibayar ${rp(f.dibayar)}</div>` : ""}` },
        { label: "Sisa", cls: "num nowrap", render: (f) => `<b>${rp(f.sisa)}</b>` },
        { label: "Status", render: (f) => (f.jt < 0 ? status("Terlambat") : f.dibayar ? badge("Dibayar sebagian", "cyan", { dot: true }) : f.jt <= 7 ? status("Jatuh Tempo") : badge("Belum jatuh tempo", "gray", { dot: true })) },
        { label: "", cls: "actions", render: (f) => `<div class="btn-group" style="flex-wrap:nowrap">${btn("Bayar", "success", { icon: "payments", size: "sm", attrs: `data-bayar="${f.no}"` })}${btn("", "dark", { icon: "history", size: "sm", title: "Riwayat", attrs: `data-toast="Riwayat pembayaran ${f.no}" data-tone="info"` })}</div>` },
      ];
      return `
      ${UI.pageHeader({
        title: "Hutang Supplier",
        sub: "Pemantauan hutang dagang ke PBF: umur hutang, jatuh tempo, pembayaran, dan potongan nota retur.",
        crumbs: ["Pembelian", "Hutang Supplier"],
        actions: `${btn("Jadwal Pembayaran", "white", { icon: "event", attrs: 'data-toast="Jadwal pembayaran minggu ini dikirim ke Keuangan" data-tone="info"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Kartu hutang diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Total hutang", value: short(total), icon: "account_balance", tone: "primary", hero: true, foot: `${FAKTUR.length} faktur · ${DB.supplier.length} PBF` })}
        ${stat({ label: "Jatuh tempo ≤ 7 hari", value: short(minggu.reduce((s, f) => s + f.sisa, 0)), icon: "alarm", tone: "warning", foot: `${minggu.length} faktur perlu dijadwalkan` })}
        ${stat({ label: "Lewat jatuh tempo", value: short(lewat.reduce((s, f) => s + f.sisa, 0)), icon: "error", tone: "danger", foot: `${lewat.length} faktur · risiko stop suplai` })}
        ${stat({ label: "Dibayar bulan ini", value: short(dibayar), icon: "task_alt", tone: "success", foot: `${BAYAR.length} pembayaran` })}
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Umur hutang per PBF", desc: "Dihitung dari tanggal faktur", icon: "hourglass_bottom", flush: true,
          body: table({
            columns: [
              { label: "PBF", render: (r) => `<div class="t-main">${esc(supShort(r.s.nama))}</div><div class="t-sub">TOP ${r.s.top} hari</div>` },
              ...AGING.map((l, k) => ({ label: l, cls: "num nowrap", render: (r) => (r.a[k] ? `<span ${k >= 2 ? 'style="color:var(--t-red-fg);font-weight:700"' : ""}>${rp(r.a[k])}</span>` : '<span class="muted">—</span>') })),
              { label: "Total", cls: "num nowrap", render: (r) => `<b>${rp(r.t)}</b>` },
            ],
            rows: aging,
            foot: `<tr><td>Total</td>${tot.map((v) => `<td class="num nowrap">${rp(v)}</td>`).join("")}<td class="num nowrap">${rp(total)}</td></tr>`,
          }),
        })}
        ${card({
          title: "Hutang per PBF", desc: "Sisa hutang (Rp) berdasarkan umur", icon: "bar_chart",
          body: `${legend(AGING.map((l, k) => [l, `var(--chart-${[3, 1, 4, 2][k]})`]))}
          ${chart("hutang-ch-pbf", (k) => ({
            type: "bar",
            data: { labels: aging.map((r) => supShort(r.s.nama).split(" ").slice(0, 2).join(" ")), datasets: AGING.map((l, j) => ({ label: l, data: aging.map((r) => r.a[j]), backgroundColor: [k.c3, k.c1, k.c4, k.c2][j], borderRadius: 4, borderSkipped: "bottom", stack: "s" })) },
            options: { interaction: { mode: "index", intersect: false }, scales: { y: { stacked: true, ticks: { callback: rpTick }, grid: { color: k.grid } }, x: { stacked: true, grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${rp(c.raw)}` } } } },
          }))}`,
        })}
      </div>

      ${card({
        title: "Faktur belum lunas", desc: "Urut jatuh tempo terdekat", icon: "receipt_long", flush: true,
        body: `<div style="padding:14px 20px 0">${tabs("hut-tab", [{ id: "semua", label: "Semua", n: FAKTUR.length }, { id: "lewat", label: "Lewat jatuh tempo", icon: "error", n: lewat.length }, { id: "minggu", label: "≤ 7 hari", icon: "alarm", n: minggu.length }], "semua")}</div>
          ${[["semua", byJt], ["lewat", byJt.filter((f) => f.jt < 0)], ["minggu", byJt.filter((f) => f.jt >= 0 && f.jt <= 7)]].map(([id, rows]) => `<div data-panel-group="hut-tab" data-panel="${id}" style="margin-top:12px" ${id === "semua" ? "" : "hidden"}>${table({ columns: fcols, rows, rowCls: (f) => (f.jt < 0 ? "row-danger" : f.jt <= 7 ? "row-warn" : ""), empty: "Tidak ada faktur" })}</div>`).join("")}`,
      })}

      ${card({
        title: "Riwayat pembayaran", desc: "Bulan berjalan", icon: "history", flush: true,
        body: table({
          columns: [
            { label: "No. bayar", render: (b) => `<span class="mono strong">${b[0]}</span>` },
            { label: "Tanggal", render: (b) => tgl(dIso(b[1])) },
            { label: "Supplier", render: (b) => esc(supShort(b[2].nama)) },
            { label: "Faktur", render: (b) => `<span class="mono small">${b[3]}</span>` },
            { label: "Metode", render: (b) => esc(b[4]) },
            { label: "Nominal", cls: "num nowrap", render: (b) => `<b>${rp(b[5])}</b>` },
            { label: "Bukti", render: () => badge("Terlampir", "green", { icon: "attach_file" }) },
            { label: "", cls: "actions", render: (b) => UI.rowActions(["view", "print"], b[0]) },
          ],
          rows: BAYAR,
          foot: `<tr><td colspan="5">Total dibayar</td><td class="num nowrap">${rp(dibayar)}</td><td colspan="2"></td></tr>`,
        }),
      })}`;
    },
    mount(root) {
      on(root, "[data-bayar]", "click", (el) => openBayar(FAKTUR.find((f) => f.no === el.dataset.bayar)));
    },
  };

  /* =====================================================================
     5. SUPPLIER / PBF
     ===================================================================== */
  function openSupplierForm(s) {
    const m = s ? PBF_META[s.id] : { alamat: "", npwp: "", apj: "", sipa: "", limit: 100000000, khusus: [], bank: "", berlaku: dIso(730) };
    modal.open({
      title: s ? `Ubah Supplier · ${esc(supShort(s.nama))}` : "Tambah Supplier / PBF", icon: s ? "edit" : "add_business", size: "lg",
      body: `
        <div class="form-grid cols-3">
          ${input("Kode", { value: s ? s.id : "PBF-06", attrs: "readonly" })}
          ${input("Nama PBF", { value: s ? s.nama : "", ph: "PT ...", cls: "" })}
          ${input("NPWP", { value: m.npwp, ph: "00.000.000.0-000.000" })}
          ${input("No. izin PBF", { value: s ? s.izin : "", ph: "PBF xx.xx/PBF/20xx" })}
          ${input("Izin berlaku s.d.", { type: "date", value: m.berlaku })}
          ${select("Status", ["Aktif", "Nonaktif", "Diblokir"])}
          ${input("Apoteker PJ PBF", { value: m.apj })}
          ${input("No. SIPA APJ PBF", { value: m.sipa })}
          ${input("Kota", { value: s ? s.kota : "" })}
          ${input("Alamat", { value: m.alamat, cls: "full" })}
          ${input("Kontak person", { value: s ? s.cp : "" })}
          ${input("Telepon", { value: s ? s.hp : "", icon: "call" })}
          ${input("E-mail pemesanan", { ph: "order@namapbf.co.id", icon: "mail" })}
          ${input("TOP (hari)", { type: "number", value: s ? s.top : 30 })}
          ${input("Limit kredit (Rp)", { type: "number", value: m.limit })}
          ${input("Rekening bank", { value: m.bank })}
          <div class="field full"><label>Produk khusus yang dapat dipesan</label><div class="row" style="gap:18px">${["Narkotika", "Psikotropika", "Prekursor", "OOT", "Rantai dingin (CCP)"].map((k) => `<label class="check"><input type="checkbox" ${m.khusus.includes(k) ? "checked" : ""}>${k}</label>`).join("")}</div></div>
        </div>
        ${alert("info", "verified_user", "Verifikasi legalitas", "Pastikan izin PBF & sertifikat CDOB masih berlaku. Sistem mengingatkan 60 hari sebelum izin habis.")}`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn(s ? "Simpan Perubahan" : "Simpan Supplier", "primary", { icon: "save", attrs: `data-close data-toast="${s ? "Data supplier diperbarui" : "Supplier baru ditambahkan"}"` })}`,
    });
  }

  function openSupplierDetail(s) {
    const m = PBF_META[s.id];
    const sps = SP.filter((x) => x.supplier === s.nama);
    const fk = FAKTUR.filter((f) => f.sup === s);
    const el = modal.open({
      title: s.nama, icon: "factory", size: "lg",
      body: `
        <div class="row">${badge(s.izin, "blue", { icon: "verified" })}${daysTo(m.berlaku) < 90 ? badge(`Izin habis ${daysTo(m.berlaku)} hari lagi`, "amber", { icon: "warning" }) : badge("Izin berlaku", "green", { icon: "check" })}${m.khusus.map((k) => badge(k, k === "Narkotika" ? "red" : k === "Psikotropika" ? "purple" : "gray")).join("")}</div>
        <div class="grid g-2">
          ${card({ title: "Legalitas & kontak", icon: "badge", body: `<dl class="kv" style="margin:0"><dt>NPWP</dt><dd class="mono">${m.npwp}</dd><dt>Apoteker PJ</dt><dd>${esc(m.apj)}</dd><dt>SIPA APJ</dt><dd>${esc(m.sipa)}</dd><dt>Alamat</dt><dd>${esc(m.alamat)}</dd><dt>Kontak</dt><dd>${esc(s.cp)} · ${esc(s.hp)}</dd></dl>` })}
          ${card({ title: "Keuangan & kinerja", icon: "insights", tone: "green", body: `<dl class="kv" style="margin:0"><dt>TOP</dt><dd>${s.top} hari</dd><dt>Limit kredit</dt><dd>${rp(m.limit)}</dd><dt>Hutang berjalan</dt><dd>${rp(s.hutang)}</dd><dt>Ketepatan kirim</dt><dd>${pct(m.ontime)}</dd><dt>Fill rate</dt><dd>${pct(m.fill)}</dd><dt>Lead time rata-rata</dt><dd>${m.lead.toLocaleString("id-ID")} hari</dd></dl>
            <div class="stack" style="gap:6px;margin-top:12px"><div class="row between small"><span>Pemakaian limit</span><b>${pct((s.hutang / m.limit) * 100)}</b></div>${progress(s.hutang, m.limit, s.hutang / m.limit > 0.8 ? "red" : s.hutang / m.limit > 0.6 ? "amber" : "green")}</div>` })}
        </div>
        ${card({ title: "Riwayat pembelian", desc: `${sps.length} SP terakhir`, icon: "history", flush: true, body: table({
          cls: "compact",
          columns: [
            { label: "No. SP", render: (x) => `<span class="mono strong">${x.no}</span>` },
            { label: "Tanggal", render: (x) => tgl(x.tgl) },
            { label: "Jenis", render: (x) => jenisBadge(x.jenis) },
            { label: "Item", cls: "num nowrap", render: (x) => x.item },
            { label: "Total", cls: "num nowrap", render: (x) => rp(x.total) },
            { label: "Status", render: (x) => status(x.status) },
          ],
          rows: sps, empty: "Belum ada SP bulan ini",
        }) })}
        ${card({ title: "Faktur belum lunas", icon: "receipt_long", tone: "amber", flush: true, body: table({
          cls: "compact",
          columns: [
            { label: "No. faktur", render: (f) => `<span class="mono">${f.no}</span>` },
            { label: "Jatuh tempo", render: (f) => `${tgl(dIso(f.jt))} ${jtBadge(f.jt)}` },
            { label: "Sisa", cls: "num nowrap", render: (f) => `<b>${rp(f.sisa)}</b>` },
          ],
          rows: fk,
        }) })}`,
      foot: `${btn("Tutup", "dark", { attrs: "data-close" })}${btn("Hutang", "info", { icon: "request_quote", attrs: 'data-go="hutang"' })}${btn("Ubah", "warning", { icon: "edit", attrs: 'id="sd-edit"' })}${btn("Buat SP", "primary", { icon: "shopping_cart_checkout", attrs: 'data-go="pesanan"' })}`,
    });
    el.querySelector("#sd-edit").addEventListener("click", () => openSupplierForm(s));
  }

  window.PAGES.supplier = {
    render() {
      const total = DB.supplier.reduce((s, x) => s + x.hutang, 0);
      const avgTop = DB.supplier.reduce((s, x) => s + x.top, 0) / DB.supplier.length;
      const beli = SP.filter((s) => s.status !== "Ditolak").reduce((s, x) => s + x.total, 0);
      const warnIzin = DB.supplier.filter((s) => daysTo(PBF_META[s.id].berlaku) < 90);
      return `
      ${UI.pageHeader({
        title: "Supplier / PBF",
        sub: "Data Pedagang Besar Farmasi mitra: legalitas izin PBF, termin pembayaran, kontak, hutang berjalan, dan kinerja pengiriman.",
        crumbs: ["Pembelian", "Supplier / PBF"],
        actions: `${btn("Tambah Supplier", "success", { icon: "add", attrs: "data-sup-new" })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Data supplier diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "PBF aktif", value: num(DB.supplier.length), icon: "factory", tone: "primary", hero: true, foot: `${warnIzin.length} izin perlu diperpanjang` })}
        ${stat({ label: "Total hutang", value: short(total), icon: "request_quote", tone: "danger", foot: "ke seluruh PBF" })}
        ${stat({ label: "Rata-rata TOP", value: `${num(avgTop)} hari`, icon: "event", tone: "info", foot: "termin pembayaran" })}
        ${stat({ label: "Pembelian bulan ini", value: short(beli), icon: "shopping_bag", tone: "success", foot: `${SP.length} surat pesanan` })}
      </div>

      ${warnIzin.length ? alert("warn", "warning", "Izin PBF segera berakhir", warnIzin.map((s) => `${esc(s.nama)} — berlaku s.d. ${tgl(PBF_META[s.id].berlaku)}`).join("<br>")) : ""}

      <div class="grid g-3">
        ${DB.supplier.map((s) => {
          const m = PBF_META[s.id];
          const use = s.hutang / m.limit;
          return card({
            title: esc(supShort(s.nama)), desc: `${esc(s.kota)} · ${s.id}`, icon: "factory", tone: "blue",
            tools: daysTo(m.berlaku) < 90 ? badge("Izin segera habis", "amber", { dot: true }) : status("Aktif"),
            body: `<div class="stack">
              <dl class="kv" style="margin:0"><dt>Izin PBF</dt><dd>${esc(s.izin)}</dd><dt>TOP</dt><dd>${s.top} hari</dd><dt>Kontak</dt><dd>${esc(s.cp)}</dd><dt>Telepon</dt><dd class="mono">${esc(s.hp)}</dd><dt>Hutang</dt><dd style="color:var(--t-red-fg)">${rp(s.hutang)}</dd></dl>
              <div class="stack" style="gap:6px"><div class="row between small"><span class="muted">Limit kredit ${short(m.limit)}</span><b>${pct(use * 100, 0)}</b></div>${progress(s.hutang, m.limit, use > 0.8 ? "red" : use > 0.6 ? "amber" : "green")}</div>
              <div class="row" style="gap:6px">${m.khusus.map((k) => badge(k, k === "Narkotika" ? "red" : k === "Psikotropika" ? "purple" : "gray")).join("")}</div>
            </div>`,
            foot: `${btn("Detail", "info", { icon: "visibility", size: "sm", attrs: `data-sup="${s.id}"` })}${btn("Ubah", "warning", { icon: "edit", size: "sm", attrs: `data-sup-edit="${s.id}"` })}<span style="flex:1"></span>${btn("Buat SP", "primary", { icon: "shopping_cart_checkout", size: "sm", attrs: 'data-go="pesanan"' })}`,
          });
        }).join("")}
        <button type="button" class="card" data-sup-new style="border:2px dashed var(--border-strong);background:var(--surface-2);box-shadow:none;cursor:pointer;display:grid;place-items:center;min-height:220px;color:var(--text-3)">
          <span class="stack" style="align-items:center;gap:6px">${icon("add_business")}<b>Tambah PBF baru</b><span class="small">Lengkapi izin PBF & CDOB</span></span>
        </button>
      </div>

      ${card({
        title: "Kinerja PBF", desc: "90 hari terakhir", icon: "insights", tone: "green", flush: true,
        body: table({
          columns: [
            { label: "PBF", render: (s) => `<div class="t-main">${esc(supShort(s.nama))}</div><div class="t-sub">${esc(s.izin)}</div>` },
            { label: "Ketepatan kirim", render: (s) => `<div class="stack" style="gap:4px;min-width:130px"><span class="small num">${pct(PBF_META[s.id].ontime)}</span>${progress(PBF_META[s.id].ontime, 100, PBF_META[s.id].ontime >= 95 ? "green" : "amber")}</div>` },
            { label: "Fill rate", render: (s) => `<div class="stack" style="gap:4px;min-width:130px"><span class="small num">${pct(PBF_META[s.id].fill)}</span>${progress(PBF_META[s.id].fill, 100, PBF_META[s.id].fill >= 95 ? "green" : "amber")}</div>` },
            { label: "Lead time", cls: "num nowrap", render: (s) => `${PBF_META[s.id].lead.toLocaleString("id-ID")} hari` },
            { label: "Retur", cls: "num nowrap", render: (s) => pct(PBF_META[s.id].retur) },
            { label: "TOP", cls: "num nowrap", render: (s) => `${s.top} hari` },
            { label: "Hutang", cls: "num nowrap", render: (s) => `<b>${rp(s.hutang)}</b>` },
            { label: "Nilai", render: (s) => { const sc = PBF_META[s.id].ontime * 0.5 + PBF_META[s.id].fill * 0.5 - PBF_META[s.id].retur * 2; return sc >= 94 ? badge("A · Sangat baik", "green") : sc >= 90 ? badge("B · Baik", "blue") : badge("C · Perlu evaluasi", "amber"); } },
          ],
          rows: DB.supplier,
        }),
      })}`;
    },
    mount(root) {
      const find = (id) => DB.supplier.find((s) => s.id === id);
      on(root, "[data-sup-new]", "click", () => openSupplierForm());
      on(root, "[data-sup]", "click", (el) => openSupplierDetail(find(el.dataset.sup)));
      on(root, "[data-sup-edit]", "click", (el) => openSupplierForm(find(el.dataset.supEdit)));
    },
  };
})();
