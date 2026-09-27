/* =====================================================================
   Persediaan: Master Obat, Stok Obat, Stok Kedaluwarsa, Stok Opname,
   Mutasi Antar Cabang, Kartu Stok
   ===================================================================== */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, pct, short, table, status, badge, golongan, chart, areaFill, rpTick, esc, legend, progress, tgl, tabs, input, select, textarea, alert, modal, confirmBox, toast, pager, cabangNama } = UI;

  /* ---------- Helper bersama ---------- */
  const CAB = DB.cabang.map((c) => c.id);
  const YM = "2609";
  const cabShort = (id) => cabangNama(id).replace("Cabang ", "");
  const cabLabel = (cab) => (cab === "ALL" ? "Semua Cabang" : cabangNama(cab));
  const dIso = (n) => DB.iso(DB.addDays(n));
  const byKode = (k) => DB.obat.find((o) => o.kode === k);
  const on = (scope, sel, ev, fn) => scope.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
  const sgn = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + num(Math.abs(n));
  const sgnRp = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + rp(Math.abs(n));
  const supShort = (s) => s.replace(/^PT /, "").replace(" Trading & Distribution", "");
  const khusus = (g) => ["narkotika", "psikotropika"].includes(g);

  const totalStok = (o) => CAB.reduce((s, c) => s + (o.stok[c] || 0), 0);
  const stokOf = (o, cab) => (cab === "ALL" ? totalStok(o) : o.stok[cab] || 0);
  const minOf = (o, cab) => (cab === "ALL" ? o.min * CAB.length : o.min);
  const maxOf = (o, cab) => minOf(o, cab) * 9;
  const stokStatus = (q, o, cab) => (q <= 0 ? "Habis" : q < minOf(o, cab) ? "Menipis" : q > maxOf(o, cab) ? "Overstock" : "Aman");
  const stokBadge = (s) => (s === "Overstock" ? badge("Overstock", "purple", { dot: true }) : status(s));
  const satuanIsi = (o) => (o.isi > 1 ? `${o.satuan} @${o.isi} ${o.bentuk}` : o.satuan === o.bentuk ? o.satuan : `${o.satuan} · ${o.bentuk}`);
  const margin = (beli, jual) => (jual ? ((jual - beli) / jual) * 100 : 0);
  const marginBadge = (m) => badge(pct(m), m < 10 ? "red" : m < 20 ? "amber" : "green");
  const NONAKTIF = new Set(["OB0018", "OB0028"]);
  const isAktif = (o) => o.aktif && !NONAKTIF.has(o.kode);
  const kekuatan = (o) => (o.nama.match(/\d+(?:,\d+)?\s?(?:mg|ml|%)(?:\/\d+\s?ml)?/i) || ["-"])[0];
  const nie = (o) => {
    const i = DB.obat.indexOf(o) + 1;
    if (o.kategori === "Alat Kesehatan") return `AKL ${20901800000 + i * 3571}`;
    return `${{ bebas: "DBL", terbatas: "DTL" }[o.golongan] || "DKL"}${1800000000 + ((i * 7654321) % 199999999)}A1`;
  };
  const suhu = (o) => (khusus(o.golongan) ? "Lemari khusus terkunci, 15–25°C" : /Sirup|Tetes|Krim|Salep|Cairan/.test(o.bentuk) ? "Sejuk 8–25°C, terlindung cahaya" : "Suhu ruang 15–30°C, kering");
  const harga = (o) => {
    const hna = Math.round(o.hargaBeli / (1.11 * 0.95));
    return { hna, disc: 5, ppn: Math.round(hna * 0.95 * 0.11), hpp: o.hargaBeli, jual: o.hargaJual, resep: o.hargaResep, member: o.hargaMember, grosir: Math.round((o.hargaJual * 0.92) / 100) * 100 };
  };
  const satBesar = (o) => (o.satuan === "Strip" ? ["Box", 10] : o.satuan === "Botol" ? ["Dus", 12] : o.satuan === "Tube" ? ["Box", 6] : o.satuan === "Sachet" ? ["Box", 30] : ["Karton", 10]);

  /* Batch & kedaluwarsa */
  const bucketOf = (h) => (h < 0 ? "ed" : h <= 30 ? "b30" : h <= 90 ? "b90" : h <= 180 ? "b180" : "aman");
  const BUCKETS = [
    { id: "ed", label: "Sudah ED", tone: "danger", c: "c2", ic: "event_busy" },
    { id: "b30", label: "≤ 30 hari", tone: "warning", c: "c4", ic: "hourglass_bottom" },
    { id: "b90", label: "31–90 hari", tone: "pink", c: "c5", ic: "hourglass_top" },
    { id: "b180", label: "91–180 hari", tone: "info", c: "c1", ic: "schedule" },
  ];
  const sisaBadge = (h) => (h < 0 ? badge(`Lewat ${-h} hari`, "red", { icon: "error" }) : badge(`${h} hari`, { b30: "amber", b90: "pink", b180: "blue", aman: "green" }[bucketOf(h)], { icon: "schedule" }));
  const nilaiBatch = (b) => b.qty * b.hargaBeli;
  const sumNilai = (arr) => arr.reduce((s, b) => s + nilaiBatch(b), 0);
  const batchesOf = (cab) => DB.batches.filter((b) => cab === "ALL" || b.cabang === cab);
  const cabOptions = (withAll) => [...(withAll ? [{ v: "ALL", l: "Semua Cabang" }] : []), ...DB.cabang.map((c) => ({ v: c.id, l: c.nama }))];
  const obatOptions = () => DB.obat.map((o) => ({ v: o.kode, l: `${o.kode} — ${o.nama}` }));

  /* Kartu stok: obat terpilih dibagikan antar halaman */
  const KS = { kode: "OB0005", cab: null, base: null };
  const bindKartu = (scope) => on(scope, "[data-ks]", "click", (el) => { KS.kode = el.dataset.ks; if (el.dataset.ksCab) KS.cab = el.dataset.ksCab; });

  /* =====================================================================
     1. MASTER OBAT
     ===================================================================== */
  const GOL = ["bebas", "terbatas", "keras", "psikotropika", "narkotika", "oot", "prekursor"];
  const BENTUK = ["Tablet", "Kaplet", "Kapsul", "Tablet Kunyah", "Tablet Effervescent", "Sirup", "Suspensi", "Tetes Mata", "Krim", "Salep", "Cairan", "Serbuk", "Injeksi", "Pcs"];
  const SIMPAN = ["Suhu ruang 15–30°C, kering", "Sejuk 8–25°C, terlindung cahaya", "Lemari pendingin 2–8°C", "Lemari khusus terkunci, 15–25°C"];

  function obatForm(o) {
    const v = o || { kode: "OB0043", barcode: "", nama: "", generik: "", kategori: DB.kategori[0], golongan: "keras", bentuk: "Tablet", satuan: "Strip", isi: 10, hargaBeli: 0, hargaJual: 0, hargaResep: 0, hargaMember: 0, pabrik: "", rak: "", min: 20, stok: {} };
    const h = o ? harga(o) : { hna: 0, disc: 5, ppn: 0, hpp: 0, jual: 0, resep: 0, member: 0, grosir: 0 };
    const [besar, isiBesar] = satBesar(v);
    const numIn = (id, val, extra = "") => `<input id="${id}" class="input sm" type="number" min="0" value="${val || ""}" style="text-align:right" ${extra}>`;
    const lvl = [["of-jual", "Harga jual umum", h.jual, "Pelanggan umum / swalayan"], ["of-resep", "Harga resep", h.resep, "Termasuk tuslah & embalase"], ["of-member", "Harga member", h.member, "Member Silver & Gold"], ["of-grosir", "Harga grosir / klinik", h.grosir, "B2B, min. 5 box"]];

    const umum = `
      <div class="form-grid cols-3">
        ${input("Kode obat", { value: v.kode, hint: "Dibuat otomatis, dapat diubah" })}
        ${input("Barcode / GTIN", { value: v.barcode, icon: "barcode_scanner", ph: "Pindai barcode kemasan" })}
        ${input("Nama dagang", { value: v.nama, ph: "mis. Amoxicillin 500 mg" })}
        ${input("Nama generik / zat aktif", { value: v.generik, ph: "mis. Amoxicillin trihidrat" })}
        ${input("Kekuatan", { value: o ? kekuatan(o) : "", ph: "mis. 500 mg" })}
        ${select("Bentuk sediaan", BENTUK, { value: v.bentuk })}
        ${select("Golongan obat", GOL.map((g) => ({ v: g, l: DB.golonganLabel[g] })), { value: v.golongan, hint: "Menentukan penandaan & aturan penjualan" })}
        ${select("Kategori", DB.kategori, { value: v.kategori })}
        ${input("Pabrik / produsen", { value: v.pabrik, ph: "mis. Kimia Farma" })}
        ${input("NIE / No. registrasi BPOM", { value: o ? nie(o) : "", ph: "mis. DKL1822206710A1", hint: "Nomor izin edar sesuai kemasan" })}
        ${select("Kondisi penyimpanan", SIMPAN, { value: o ? suhu(o) : SIMPAN[0] })}
        ${select("Status", ["Aktif", "Nonaktif"], { value: o && !isAktif(o) ? "Nonaktif" : "Aktif" })}
        <div class="field full"><label>Atribut</label><div class="row" style="gap:18px">
          <label class="check"><input type="checkbox" ${["keras", "psikotropika", "narkotika"].includes(v.golongan) ? "checked" : ""}>Wajib resep dokter</label>
          <label class="check"><input type="checkbox" ${v.generik && v.nama.startsWith(v.generik.split(" ")[0]) ? "checked" : ""}>Obat generik (OGB)</label>
          <label class="check"><input type="checkbox" checked>Masuk Formularium Nasional</label>
          <label class="check"><input type="checkbox" ${/Tablet|Kaplet|Kapsul/.test(v.bentuk) ? "checked" : ""}>Dapat diracik</label>
        </div></div>
        ${textarea("Indikasi / catatan untuk kasir", { cls: "full", ph: "mis. Antibiotik — habiskan sesuai anjuran dokter", value: o ? "" : "" })}
      </div>
      ${alert("info", "policy", "Golongan khusus", "Narkotika, psikotropika, prekursor & OOT otomatis mengaktifkan pembatasan qty per transaksi, wajib SP khusus, dan pencatatan untuk pelaporan SIPNAP.")}`;

    const satuan = `
      <div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>Level</th><th>Satuan</th><th class="num">Isi</th><th>Berisi</th><th>Barcode satuan</th><th>Dapat dijual</th></tr></thead>
        <tbody>
          <tr><td class="strong">Besar (pembelian)</td><td><select class="select sm" aria-label="Satuan besar">${["Box", "Dus", "Karton"].map((s) => `<option ${s === besar ? "selected" : ""}>${s}</option>`).join("")}</select></td><td class="num nowrap">${numIn("of-isi-besar", isiBesar, 'style="width:80px;text-align:right" aria-label="Isi satuan besar"')}</td><td>${esc(v.satuan)}</td><td><input class="input sm" placeholder="Opsional" aria-label="Barcode satuan besar"></td><td><label class="check"><input type="checkbox">Grosir</label></td></tr>
          <tr><td class="strong">Sedang (stok)</td><td><select class="select sm" aria-label="Satuan sedang">${["Strip", "Botol", "Tube", "Sachet", "Pot", "Box", "Pcs", "Unit"].map((s) => `<option ${s === v.satuan ? "selected" : ""}>${s}</option>`).join("")}</select></td><td class="num nowrap">${numIn("of-isi-sedang", v.isi, 'style="width:80px;text-align:right" aria-label="Isi satuan sedang"')}</td><td>${esc(v.isi > 1 ? v.bentuk : v.satuan)}</td><td><input class="input sm" value="${esc(v.barcode)}" aria-label="Barcode satuan sedang"></td><td><label class="check"><input type="checkbox" checked>Ya</label></td></tr>
          <tr><td class="strong">Kecil (eceran)</td><td><input class="input sm" value="${esc(v.isi > 1 ? v.bentuk : v.satuan)}" aria-label="Satuan kecil"></td><td class="num nowrap">1</td><td>—</td><td><input class="input sm" placeholder="Opsional" aria-label="Barcode satuan kecil"></td><td><label class="check"><input type="checkbox" ${v.isi > 1 ? "checked" : ""}>Ya</label></td></tr>
        </tbody>
      </table></div>
      ${alert("success", "sync_alt", "Konversi satuan", `<span id="of-konv"></span>`)}
      <div class="form-grid cols-3">
        ${select("Satuan beli (SP)", [besar, v.satuan], { value: besar })}
        ${select("Satuan jual default", [v.satuan, v.isi > 1 ? v.bentuk : v.satuan, besar], { value: v.satuan })}
        ${select("Satuan stok & kartu stok", [v.satuan, v.isi > 1 ? v.bentuk : v.satuan], { value: v.satuan, hint: "Semua mutasi dicatat dalam satuan ini" })}
      </div>`;

    const hargaTab = `
      <div class="form-grid cols-4">
        <div class="field"><label for="of-hna">HNA per ${esc(v.satuan)}</label>${numIn("of-hna", h.hna)}<span class="hint">Harga Netto Apotek dari PBF</span></div>
        <div class="field"><label for="of-disc">Diskon PBF (%)</label>${numIn("of-disc", h.disc, 'step="0.5"')}</div>
        ${input("PPN masukan 11%", { id: "of-ppn", attrs: "readonly" })}
        ${input("HPP per " + esc(v.satuan), { id: "of-hpp", attrs: "readonly", hint: "(HNA − diskon) + PPN" })}
      </div>
      <div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>Level harga</th><th class="num">Harga jual (Rp)</th><th class="num">Margin</th><th>Keterangan</th></tr></thead>
        <tbody>${lvl.map(([id, l, val, k]) => `<tr><td class="strong">${l}</td><td class="num nowrap">${numIn(id, val, `style="width:140px;text-align:right" aria-label="${l}"`)}</td><td class="num nowrap" data-m="${id}">${val && h.hpp ? marginBadge(margin(h.hpp, val)) : "—"}</td><td class="muted small">${k}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="form-grid cols-3">
        ${select("Metode penetapan harga", ["Markup dari HPP", "Margin target", "Manual / mengikuti HET"], { value: "Markup dari HPP" })}
        ${input("Markup target (%)", { type: "number", value: 30 })}
        ${select("Pembulatan harga", ["Rp 100", "Rp 500", "Rp 1.000"], { value: "Rp 100" })}
      </div>`;

    const stokTab = `
      <div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>Cabang</th><th class="num">Stok saat ini</th><th class="num">Stok minimum</th><th class="num">Stok maksimum</th><th>Lokasi rak</th><th>Dijual di cabang</th></tr></thead>
        <tbody>${DB.cabang.map((c) => `<tr><td class="strong">${esc(c.nama)}</td><td class="num nowrap">${num(v.stok[c.id] || 0)} ${esc(v.satuan)}</td>
          <td class="num nowrap"><input class="input sm" type="number" value="${v.min}" style="width:90px;text-align:right" aria-label="Stok minimum ${esc(c.nama)}"></td>
          <td class="num nowrap"><input class="input sm" type="number" value="${v.min * 9}" style="width:90px;text-align:right" aria-label="Stok maksimum ${esc(c.nama)}"></td>
          <td><input class="input sm" value="${esc(v.rak)}" style="width:100px" aria-label="Lokasi rak ${esc(c.nama)}"></td>
          <td><label class="switch"><input type="checkbox" checked aria-label="Dijual di ${esc(c.nama)}"><span></span></label></td></tr>`).join("")}</tbody>
      </table></div>
      <div class="form-grid cols-3">
        ${select("Metode pengeluaran stok", ["FEFO — First Expired First Out", "FIFO — First In First Out"], { value: "FEFO — First Expired First Out" })}
        ${input("Peringatan ED (hari sebelum)", { type: "number", value: 90 })}
        ${select("PBF utama", DB.supplier.map((s) => s.nama))}
      </div>`;

    return `
      ${tabs("obat-form", [{ id: "umum", label: "Informasi Umum", icon: "info" }, { id: "satuan", label: "Satuan & Konversi", icon: "sync_alt" }, { id: "harga", label: "Harga", icon: "sell" }, { id: "stok", label: "Stok", icon: "inventory_2" }], "umum")}
      <div data-panel-group="obat-form" data-panel="umum" class="stack">${umum}</div>
      <div data-panel-group="obat-form" data-panel="satuan" class="stack" hidden>${satuan}</div>
      <div data-panel-group="obat-form" data-panel="harga" class="stack" hidden>${hargaTab}</div>
      <div data-panel-group="obat-form" data-panel="stok" class="stack" hidden>${stokTab}</div>`;
  }

  function openObatForm(o) {
    const el = modal.open({
      title: o ? `Ubah Obat · ${esc(o.nama)}` : "Tambah Obat Baru", icon: o ? "edit" : "add_circle", size: "xl",
      body: obatForm(o),
      foot: `${btn("Batal", "light", { attrs: "data-close" })}
        ${o ? "" : btn("Simpan & Tambah Lagi", "success", { icon: "add", attrs: 'data-toast="Obat disimpan. Formulir siap untuk obat berikutnya"' })}
        ${btn(o ? "Simpan Perubahan" : "Simpan Obat", "primary", { icon: "save", attrs: `data-close data-toast="${o ? "Perubahan data obat disimpan" : "Obat baru ditambahkan ke master"}"` })}`,
    });
    const $ = (id) => el.querySelector("#" + id);
    const val = (id) => parseFloat($(id)?.value) || 0;
    const upd = () => {
      const net = val("of-hna") * (1 - val("of-disc") / 100);
      const hpp = net * 1.11;
      $("of-ppn").value = rp(net * 0.11);
      $("of-hpp").value = rp(hpp);
      ["of-jual", "of-resep", "of-member", "of-grosir"].forEach((id) => { const m = el.querySelector(`[data-m="${id}"]`); if (m) m.innerHTML = val(id) && hpp ? marginBadge(margin(hpp, val(id))) : "—"; });
      const v = o || { satuan: "Strip", bentuk: "Tablet", isi: 10 };
      const kecil = v.isi > 1 ? v.bentuk : v.satuan;
      const ib = val("of-isi-besar"), is = val("of-isi-sedang") || 1;
      $("of-konv").innerHTML = `1 ${satBesar(v)[0]} = ${num(ib)} ${esc(v.satuan)}${is > 1 ? ` = ${num(ib * is)} ${esc(kecil)}` : ""} · harga eceran per ${esc(kecil)} ${rp(val("of-jual") / is)}`;
    };
    on(el, "input[type=number]", "input", upd);
    upd();
  }

  function openObatDetail(o) {
    const h = harga(o);
    const bs = DB.batches.filter((b) => b.kode === o.kode).sort((a, b) => a.sisaHari - b.sisaHari);
    const el = modal.open({
      title: "Detail Obat", icon: "medication", size: "lg",
      body: `
        <div class="row between">
          <div class="stack" style="gap:4px">
            <div class="row" style="gap:8px"><h3 style="font-size:19px">${esc(o.nama)}</h3>${golongan(o.golongan)}${status(isAktif(o) ? "Aktif" : "Nonaktif")}</div>
            <div class="small muted">${esc(o.generik)} · ${esc(o.pabrik)} · <span class="mono">${o.kode}</span> · <span class="mono">${o.barcode}</span></div>
          </div>
          <div class="row">${badge(`Stok total ${num(totalStok(o))} ${esc(o.satuan)}`, "blue", { icon: "inventory_2" })}${badge(`Rak ${esc(o.rak)}`, "gray", { icon: "shelves" })}</div>
        </div>
        <div class="grid g-2">
          ${card({ title: "Informasi umum", icon: "info", body: `<dl class="kv" style="margin:0">
            <dt>Kekuatan</dt><dd>${esc(kekuatan(o))}</dd><dt>Bentuk sediaan</dt><dd>${esc(o.bentuk)}</dd>
            <dt>Satuan & isi</dt><dd>${esc(satuanIsi(o))}</dd><dt>Satuan besar</dt><dd>${satBesar(o)[0]} @${satBesar(o)[1]} ${esc(o.satuan)}</dd>
            <dt>Kategori</dt><dd>${esc(o.kategori)}</dd><dt>NIE / BPOM</dt><dd class="mono">${nie(o)}</dd>
            <dt>Penyimpanan</dt><dd>${esc(suhu(o))}</dd><dt>Metode keluar</dt><dd>FEFO</dd></dl>` })}
          ${card({ title: "Harga & margin", icon: "sell", tone: "green", body: `<dl class="kv" style="margin:0">
            <dt>HNA</dt><dd>${rp(h.hna)}</dd><dt>Diskon PBF</dt><dd>${h.disc}%</dd><dt>PPN masukan 11%</dt><dd>${rp(h.ppn)}</dd>
            <dt>HPP / ${esc(o.satuan)}</dt><dd>${rp(h.hpp)}</dd>
            <dt>Harga jual umum</dt><dd>${rp(h.jual)} ${marginBadge(margin(h.hpp, h.jual))}</dd>
            <dt>Harga resep</dt><dd>${rp(h.resep)}</dd><dt>Harga member</dt><dd>${rp(h.member)}</dd><dt>Harga grosir / klinik</dt><dd>${rp(h.grosir)}</dd></dl>` })}
        </div>
        ${card({ title: "Stok per cabang", icon: "store", flush: true, body: table({
          cls: "compact",
          columns: [
            { label: "Cabang", render: (c) => `<b>${esc(c.nama)}</b>` },
            { label: "Stok", cls: "num nowrap", render: (c) => `${num(o.stok[c.id])} ${esc(o.satuan)}` },
            { label: "Min", cls: "num nowrap", render: () => num(o.min) },
            { label: "Maks", cls: "num nowrap", render: () => num(o.min * 9) },
            { label: "Nilai HPP", cls: "num nowrap", render: (c) => rp(o.stok[c.id] * o.hargaBeli) },
            { label: "Status", render: (c) => stokBadge(stokStatus(o.stok[c.id], o, c.id)) },
          ],
          rows: DB.cabang,
        }) })}
        ${card({ title: "Batch & tanggal kedaluwarsa", desc: "Urut FEFO — batch paling awal ED keluar lebih dulu", icon: "event", tone: "amber", flush: true, body: table({
          cls: "compact",
          columns: [
            { label: "Batch", render: (b) => `<span class="mono strong">${b.batch}</span>` },
            { label: "Cabang", render: (b) => esc(cabShort(b.cabang)) },
            { label: "ED", render: (b) => tgl(b.ed) },
            { label: "Sisa", render: (b) => sisaBadge(b.sisaHari) },
            { label: "Qty", cls: "num nowrap", render: (b) => `${num(b.qty)} ${esc(b.satuan)}` },
            { label: "Supplier", render: (b) => `<span class="small">${esc(supShort(b.supplier))}</span>` },
          ],
          rows: bs, rowCls: (b) => (b.sisaHari < 0 ? "row-danger" : b.sisaHari <= 30 ? "row-warn" : ""),
          empty: "Belum ada batch tercatat",
        }) })}`,
      foot: `${btn("Kartu Stok", "dark", { icon: "history_edu", attrs: `data-go="kartustok" data-ks="${o.kode}"` })}
        ${btn("Cetak Label Harga", "teal", { icon: "print", attrs: `data-toast="Label harga ${esc(o.nama)} dikirim ke printer"` })}
        ${btn("Ubah", "warning", { icon: "edit", attrs: 'id="od-edit"' })}
        ${btn("Tutup", "light", { attrs: "data-close" })}`,
    });
    bindKartu(el);
    el.querySelector("#od-edit").addEventListener("click", () => openObatForm(o));
  }

  window.PAGES.obat = {
    render() {
      const all = DB.obat;
      const cnt = (gs) => all.filter((o) => gs.includes(o.golongan)).length;
      const aktif = all.filter(isAktif).length;
      return `
      ${UI.pageHeader({
        title: "Master Obat",
        sub: `Katalog terpusat <b>${all.length} SKU</b> obat & alat kesehatan untuk seluruh cabang: golongan, satuan konversi, harga bertingkat, dan lokasi rak.`,
        crumbs: ["Persediaan", "Master Obat"],
        actions: `${btn("Tambah Obat", "success", { icon: "add", attrs: "data-obat-add" })}${btn("Import Excel", "white", { icon: "upload_file", attrs: 'data-toast="Template impor master obat (.xlsx) diunduh" data-tone="info"' })}${btn("Export", "teal", { icon: "table_view", attrs: 'data-toast="Master obat diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-5">
        ${stat({ label: "Total SKU", value: num(all.length), icon: "medication", tone: "primary", foot: `${DB.kategori.length} kategori · ${new Set(all.map((o) => o.pabrik)).size} pabrik`, hero: true })}
        ${stat({ label: "SKU aktif", value: num(aktif), icon: "check_circle", tone: "success", foot: `${all.length - aktif} nonaktif / discontinue` })}
        ${stat({ label: "Obat keras", value: num(cnt(["keras"])), icon: "medication_liquid", tone: "danger", foot: "wajib resep dokter" })}
        ${stat({ label: "Narkotika & psikotropika", value: num(cnt(["narkotika", "psikotropika"])), icon: "shield", tone: "purple", foot: "lemari khusus · lapor SIPNAP" })}
        ${stat({ label: "OOT & prekursor", value: num(cnt(["oot", "prekursor"])), icon: "gpp_maybe", tone: "warning", foot: "pembatasan qty penjualan" })}
      </div>

      ${card({
        title: "Daftar obat", desc: `<span id="obat-count">${all.length}</span> obat ditampilkan · stok = total seluruh cabang`, icon: "list_alt", flush: true, id: "obat-card",
        tools: `<div class="input-icon" style="width:260px">${icon("search")}<input id="obat-q" class="input sm" type="search" placeholder="Cari nama, generik, kode, barcode" aria-label="Cari obat"></div>`,
        body: `
          <div class="stack" style="padding:14px 20px 4px;gap:4px">
            <div class="chips" data-chip-group="obat-kat"><button type="button" class="chip active" data-kat="">${icon("apps")}Semua kategori</button>${DB.kategori.map((k) => `<button type="button" class="chip" data-kat="${esc(k)}">${esc(k)} <span style="opacity:.7">${all.filter((o) => o.kategori === k).length}</span></button>`).join("")}</div>
            <div class="chips" data-chip-group="obat-gol"><button type="button" class="chip active" data-gol="">Semua golongan</button>${GOL.map((g) => `<button type="button" class="chip" data-gol="${g}">${golongan(g)} <span style="opacity:.7">${cnt([g])}</span></button>`).join("")}</div>
          </div>
          ${table({
            columns: [
              { label: "Kode", render: (o) => `<span class="mono strong">${o.kode}</span><div class="t-sub mono">${o.barcode}</div>` },
              { label: "Nama obat", render: (o) => `<div class="t-main" style="min-width:190px">${esc(o.nama)}</div><div class="t-sub">${esc(o.generik)} · ${esc(o.pabrik)}</div>` },
              { label: "Golongan", render: (o) => golongan(o.golongan) },
              { label: "Kategori", render: (o) => `<span class="small">${esc(o.kategori)}</span>` },
              { label: "Satuan / isi", render: (o) => `<span class="nowrap">${esc(satuanIsi(o))}</span>` },
              { label: "Harga beli", cls: "num nowrap", render: (o) => rp(o.hargaBeli) },
              { label: "Harga jual", cls: "num nowrap", render: (o) => `<b>${rp(o.hargaJual)}</b><div class="t-sub">resep ${rp(o.hargaResep)}</div>` },
              { label: "Margin", cls: "num nowrap", render: (o) => marginBadge(margin(o.hargaBeli, o.hargaJual)) },
              { label: "Rak", render: (o) => `<span class="mono">${o.rak}</span>` },
              { label: "Stok total", cls: "num nowrap", render: (o) => { const t = totalStok(o); return `<b ${t < o.min * CAB.length ? 'style="color:var(--t-red-fg)"' : ""}>${num(t)}</b><div class="t-sub">${esc(o.satuan)}</div>`; } },
              { label: "Status", render: (o) => status(isAktif(o) ? "Aktif" : "Nonaktif") },
              { label: "", cls: "actions", render: (o) => `<div class="btn-group" style="flex-wrap:nowrap">
                ${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-obat-view="${o.kode}"` })}
                ${btn("", "warning", { icon: "edit", size: "sm", title: "Ubah", attrs: `data-obat-edit="${o.kode}"` })}
                ${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus", attrs: `data-obat-del="${o.kode}"` })}</div>` },
            ],
            rows: all,
          })}
          ${pager(all.length, 50)}`,
      })}`;
    },
    mount(root) {
      const f = { kat: "", gol: "", q: "" };
      const apply = () => {
        let shown = 0;
        root.querySelectorAll("#obat-card tbody tr").forEach((tr, i) => {
          const o = DB.obat[i];
          if (!o) return;
          const ok = (!f.kat || o.kategori === f.kat) && (!f.gol || o.golongan === f.gol) && (!f.q || `${o.nama} ${o.generik} ${o.kode} ${o.barcode}`.toLowerCase().includes(f.q));
          tr.hidden = !ok;
          if (ok) shown++;
        });
        const c = root.querySelector("#obat-count");
        if (c) c.textContent = shown;
      };
      on(root, "[data-kat]", "click", (el) => { f.kat = el.dataset.kat; apply(); });
      on(root, "[data-gol]", "click", (el) => { f.gol = el.dataset.gol; apply(); });
      on(root, "#obat-q", "input", (el) => { f.q = el.value.trim().toLowerCase(); apply(); });
      on(root, "[data-obat-add]", "click", () => openObatForm());
      on(root, "[data-obat-view]", "click", (el) => openObatDetail(byKode(el.dataset.obatView)));
      on(root, "[data-obat-edit]", "click", (el) => openObatForm(byKode(el.dataset.obatEdit)));
      on(root, "[data-obat-del]", "click", (el) => {
        const o = byKode(el.dataset.obatDel);
        confirmBox({
          title: "Hapus obat dari master?", icon: "delete", okLabel: "Ya, nonaktifkan",
          msg: `<b>${esc(o.nama)}</b> memiliki riwayat transaksi & kartu stok, sehingga tidak dihapus permanen melainkan <b>dinonaktifkan</b> dan tidak muncul lagi di kasir.`,
          onOk: () => toast(`${o.nama} dinonaktifkan dari master obat`, "danger"),
        });
      });
    },
  };

  /* =====================================================================
     2. STOK OBAT
     ===================================================================== */
  const LEAD = [2, 3, 2, 4, 3];
  const kelipatan = (o) => (o.satuan === "Strip" ? 10 : o.satuan === "Botol" ? 12 : 5);
  function saranPesan(cab) {
    const mult = cab === "ALL" ? CAB.length : 1;
    return DB.obat.map((o, i) => ({ o, i, q: stokOf(o, cab) }))
      .filter((r) => isAktif(r.o) && r.q < minOf(r.o, cab) * 2)
      .map(({ o, i, q }) => {
        const avg = Math.max(1, Math.round(o.min / 5 + ((i * 7) % 6))) * mult;
        const s = i % DB.supplier.length;
        const lead = LEAD[s];
        const safety = Math.ceil(avg * 2);
        const rop = avg * lead + safety;
        const kel = kelipatan(o);
        const qty = Math.max(kel, Math.ceil((rop + avg * 14 - q) / kel) * kel);
        return { o, q, avg, lead, safety, rop, qty, kel, sup: DB.supplier[s], nilai: qty * o.hargaBeli };
      })
      .sort((a, b) => a.q / minOf(a.o, cab) - b.q / minOf(b.o, cab));
  }

  function openAdjust(kode, cab) {
    const o = byKode(kode || "OB0005");
    const c = cab && cab !== "ALL" ? cab : "PST";
    const bOpts = (ob) => { const bs = DB.batches.filter((b) => b.kode === ob.kode); return bs.length ? bs.map((b) => ({ v: b.batch, l: `${b.batch} · ED ${tgl(b.ed)}` })) : [{ v: "-", l: "Tanpa batch" }]; };
    const el = modal.open({
      title: "Penyesuaian Stok", icon: "tune", size: "lg",
      body: `
        ${alert("warn", "gpp_maybe", "Butuh persetujuan Apoteker PJ", "Penyesuaian stok mengubah kartu stok & nilai persediaan. Untuk narkotika/psikotropika, penyesuaian wajib disertai berita acara dan dilaporkan pada SIPNAP periode berjalan.")}
        <div class="form-grid cols-3">
          ${input("No. dokumen", { value: `ADJ/${c}/${YM}/0${17 + CAB.indexOf(c)}`, attrs: "readonly" })}
          ${input("Tanggal", { type: "date", value: dIso(0) })}
          ${select("Cabang", cabOptions(false), { value: c, id: "adj-cab" })}
          ${select("Obat", obatOptions(), { value: o.kode, id: "adj-obat", cls: "full" })}
          ${select("Batch", bOpts(o), { id: "adj-batch" })}
          ${input("Stok sistem", { id: "adj-sys", value: `${num(o.stok[c])} ${o.satuan}`, attrs: "readonly" })}
          ${select("Jenis penyesuaian", ["Pengurangan (−)", "Penambahan (+)"], { id: "adj-jenis" })}
          ${input("Qty penyesuaian", { type: "number", value: 2, id: "adj-qty", attrs: 'min="1"' })}
          ${input("Stok setelah penyesuaian", { id: "adj-after", attrs: "readonly" })}
          ${select("Alasan", ["Kemasan rusak / pecah", "Hilang", "Selisih hasil stok opname", "Kedaluwarsa", "Sampel / uji mutu", "Koreksi salah input"], { cls: "full" })}
          ${textarea("Keterangan", { cls: "full", ph: "Uraikan kronologi & tindak lanjut", value: "Ditemukan 2 strip rusak (blister sobek) saat penataan rak." })}
          ${select("Disetujui oleh", DB.cabang.map((x) => x.apoteker), { value: DB.cabang.find((x) => x.id === c).apoteker })}
          ${input("Lampiran foto / BA", { type: "file" })}
        </div>`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Ajukan Penyesuaian", "warning", { icon: "send", attrs: 'data-close data-toast="Penyesuaian stok diajukan, menunggu persetujuan Apoteker PJ"' })}`,
    });
    const $ = (id) => el.querySelector("#" + id);
    const upd = () => {
      const ob = byKode($("adj-obat").value);
      const sys = ob.stok[$("adj-cab").value] || 0;
      const q = parseInt($("adj-qty").value, 10) || 0;
      $("adj-sys").value = `${num(sys)} ${ob.satuan}`;
      $("adj-after").value = `${num(Math.max(0, $("adj-jenis").selectedIndex === 0 ? sys - q : sys + q))} ${ob.satuan}`;
    };
    $("adj-obat").addEventListener("change", () => { $("adj-batch").innerHTML = bOpts(byKode($("adj-obat").value)).map((x) => `<option value="${esc(x.v)}">${esc(x.l)}</option>`).join(""); upd(); });
    ["adj-cab", "adj-jenis"].forEach((id) => $(id).addEventListener("change", upd));
    $("adj-qty").addEventListener("input", upd);
    upd();
  }

  let STOK_ROWS = [];
  window.PAGES.stok = {
    render({ state }) {
      const cab = state.cabang;
      const order = { Habis: 0, Menipis: 1, Overstock: 2, Aman: 3 };
      const rows = DB.obat.map((o) => { const q = stokOf(o, cab); return { o, q, st: stokStatus(q, o, cab) }; }).sort((a, b) => order[a.st] - order[b.st] || a.q - b.q);
      STOK_ROWS = rows;
      const n = (s) => rows.filter((r) => r.st === s).length;
      const nilai = rows.reduce((s, r) => s + r.q * r.o.hargaBeli, 0);
      const units = rows.reduce((s, r) => s + r.q, 0);
      const bs = batchesOf(cab).slice().sort((a, b) => a.nama.localeCompare(b.nama) || a.sisaHari - b.sisaHari);
      const rank = {};
      bs.forEach((b) => { if (b.sisaHari < 0) return; const k = b.kode + b.cabang; rank[k] = (rank[k] || 0) + 1; b._fefo = rank[k]; });
      const sar = saranPesan(cab);
      const cell = (o, c) => { const q = o.stok[c]; const txt = q === 0 ? badge("0", "red") : q < o.min ? `<b style="color:var(--t-amber-fg)">${num(q)}</b>` : num(q); return c === cab ? `<b>${txt}</b>` : txt; };

      return `
      ${UI.pageHeader({
        title: "Stok Obat",
        sub: `Posisi stok real-time <b>${esc(cabLabel(cab))}</b> per obat, per batch (FEFO), dan saran pemesanan otomatis berdasarkan rata-rata penjualan.`,
        crumbs: ["Persediaan", "Stok Obat"],
        actions: `${btn("Penyesuaian Stok", "warning", { icon: "tune", attrs: "data-adj" })}${btn("Mutasi Cabang", "white", { icon: "swap_horiz", attrs: 'data-go="mutasi"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Posisi stok diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-5">
        ${stat({ label: "Nilai persediaan (HPP)", value: short(nilai), icon: "account_balance", tone: "primary", hero: true, foot: `${num(units)} unit · ${esc(cabLabel(cab))}` })}
        ${stat({ label: "Item aman", value: num(n("Aman")), icon: "verified", tone: "success", foot: `${pct((n("Aman") / rows.length) * 100)} dari SKU` })}
        ${stat({ label: "Stok menipis", value: num(n("Menipis")), icon: "trending_down", tone: "warning", foot: "di bawah stok minimum" })}
        ${stat({ label: "Stok habis", value: num(n("Habis")), icon: "remove_shopping_cart", tone: "danger", foot: "potensi kehilangan penjualan" })}
        ${stat({ label: "Overstock", value: num(n("Overstock")), icon: "stacked_bar_chart", tone: "purple", foot: "melebihi stok maksimum" })}
      </div>

      <section class="card">
        <div class="filterbar">
          ${input("Cari obat", { id: "stok-q", icon: "search", ph: "Nama / kode / barcode" })}
          ${select("Kategori", ["Semua kategori", ...DB.kategori], { id: "stok-kat" })}
          ${select("Golongan", [{ v: "", l: "Semua golongan" }, ...GOL.map((g) => ({ v: g, l: DB.golonganLabel[g] }))], { id: "stok-gol" })}
          ${select("Status stok", ["Semua status", "Aman", "Menipis", "Habis", "Overstock"], { id: "stok-st" })}
          <div class="actions">${btn("Tampilkan", "primary", { icon: "filter_alt", attrs: 'data-toast="Filter diterapkan"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Daftar stok diekspor ke Excel (.xlsx)"' })}</div>
        </div>
        <div style="padding:14px 20px 0">${tabs("stok-tab", [
          { id: "obat", label: "Per Obat", icon: "medication", n: rows.length },
          { id: "batch", label: "Per Batch (FEFO)", icon: "view_list", n: bs.length },
          { id: "saran", label: "Saran Pemesanan", icon: "auto_awesome", n: sar.length },
        ], "obat")}</div>

        <div data-panel-group="stok-tab" data-panel="obat" id="stok-obat" style="margin-top:12px">
          ${table({
            columns: [
              { label: "Obat", render: (r) => `<div class="t-main">${esc(r.o.nama)}</div><div class="t-sub"><span class="mono">${r.o.kode}</span> · ${golongan(r.o.golongan)}</div>` },
              { label: "Satuan", render: (r) => `<span class="nowrap small">${esc(satuanIsi(r.o))}</span>` },
              ...CAB.map((c) => ({ label: c === cab ? `${c} ●` : c, cls: "num nowrap", render: (r) => cell(r.o, c) })),
              { label: "Total", cls: "num nowrap", render: (r) => `<b>${num(totalStok(r.o))}</b>` },
              { label: `Min (${cab === "ALL" ? "total" : cab})`, cls: "num nowrap", render: (r) => num(minOf(r.o, cab)) },
              { label: "Nilai HPP", cls: "num nowrap", render: (r) => rp(r.q * r.o.hargaBeli) },
              { label: "Status", render: (r) => stokBadge(r.st) },
              { label: "", cls: "actions", render: (r) => `<div class="btn-group" style="flex-wrap:nowrap">
                ${btn("", "warning", { icon: "tune", size: "sm", title: "Penyesuaian stok", attrs: `data-adj="${r.o.kode}"` })}
                ${btn("", "dark", { icon: "history_edu", size: "sm", title: "Kartu stok", attrs: `data-go="kartustok" data-ks="${r.o.kode}"` })}</div>` },
            ],
            rows, rowCls: (r) => (r.st === "Habis" ? "row-danger" : r.st === "Menipis" ? "row-warn" : ""),
          })}
          ${pager(rows.length, 50)}
        </div>

        <div data-panel-group="stok-tab" data-panel="batch" hidden style="margin-top:12px">
          ${table({
            columns: [
              { label: "Urutan FEFO", render: (b) => (b.sisaHari < 0 ? badge("Karantina", "red", { icon: "block" }) : b._fefo === 1 ? badge("Keluarkan pertama", "green", { icon: "arrow_upward" }) : badge(`Antrian ke-${b._fefo}`, "gray")) },
              { label: "Obat", render: (b) => `<div class="t-main">${esc(b.nama)}</div><div class="t-sub">${golongan(b.golongan)}</div>` },
              { label: "Batch", render: (b) => `<span class="mono strong">${b.batch}</span>` },
              { label: "ED", render: (b) => `<span class="nowrap">${tgl(b.ed)}</span>` },
              { label: "Sisa", render: (b) => sisaBadge(b.sisaHari) },
              { label: "Cabang", render: (b) => esc(cabShort(b.cabang)) },
              { label: "Qty", cls: "num nowrap", render: (b) => `${num(b.qty)} <span class="muted small">${esc(b.satuan)}</span>` },
              { label: "Supplier", render: (b) => `<span class="small">${esc(supShort(b.supplier))}</span>` },
              { label: "Nilai HPP", cls: "num nowrap", render: (b) => rp(nilaiBatch(b)) },
            ],
            rows: bs, rowCls: (b) => (b.sisaHari < 0 ? "row-danger" : b.sisaHari <= 30 ? "row-warn" : ""),
          })}
        </div>

        <div data-panel-group="stok-tab" data-panel="saran" hidden class="stack" style="margin-top:12px;gap:0">
          <div style="padding:0 20px 12px">${alert("info", "auto_awesome", "Cara perhitungan", "Rata-rata penjualan 30 hari × lead time PBF + safety stock (2 hari) = titik pesan ulang (ROP). Qty saran menutup kebutuhan 14 hari ke depan dan dibulatkan ke kelipatan satuan besar.")}</div>
          ${table({
            columns: [
              { label: `<input type="checkbox" checked aria-label="Pilih semua">`, render: () => `<input type="checkbox" checked aria-label="Pilih item">` },
              { label: "Obat", render: (r) => `<div class="t-main">${esc(r.o.nama)}</div><div class="t-sub">${golongan(r.o.golongan)}</div>` },
              { label: "Stok", cls: "num nowrap", render: (r) => `<b style="color:var(--t-${r.q < minOf(r.o, cab) ? "red" : "amber"}-fg)">${num(r.q)}</b>` },
              { label: "Avg jual/hari", cls: "num nowrap", render: (r) => num(r.avg) },
              { label: "Lead time", cls: "num nowrap", render: (r) => `${r.lead} hari` },
              { label: "Safety stock", cls: "num nowrap", render: (r) => num(r.safety) },
              { label: "ROP", cls: "num nowrap", render: (r) => num(r.rop) },
              { label: "Qty saran", cls: "num nowrap", render: (r) => `<input class="input sm" type="number" value="${r.qty}" step="${r.kel}" style="width:90px;text-align:right" aria-label="Qty saran ${esc(r.o.nama)}"><div class="t-sub">${esc(r.o.satuan)} · kelipatan ${r.kel}</div>` },
              { label: "Supplier", render: (r) => `<span class="small">${esc(supShort(r.sup.nama))}</span><div class="t-sub">TOP ${r.sup.top} hari</div>` },
              { label: "Estimasi nilai", cls: "num nowrap", render: (r) => rp(r.nilai) },
            ],
            rows: sar, empty: "Semua stok di atas titik pesan ulang",
            foot: `<tr><td colspan="9">Total estimasi ${sar.length} item</td><td class="num nowrap">${rp(sar.reduce((s, r) => s + r.nilai, 0))}</td></tr>`,
          })}
          <div class="card-foot">
            <span class="small muted">${icon("info")} SP akan dipisah otomatis per PBF dan per jenis (reguler / OOT / prekursor / psikotropika / narkotika).</span>
            <span class="spacer" style="flex:1"></span>
            ${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Saran pemesanan diekspor ke Excel"' })}
            ${btn("Buat SP dari saran", "success", { icon: "shopping_cart_checkout", attrs: 'data-go="pesanan" data-toast="Draft SP dibuat dari saran pemesanan"' })}
          </div>
        </div>
      </section>`;
    },
    mount(root, { state }) {
      on(root, "[data-adj]", "click", (el) => openAdjust(el.dataset.adj, state.cabang));
      bindKartu(root);
      const $ = (id) => root.querySelector("#" + id);
      const apply = () => {
        const q = ($("stok-q")?.value || "").trim().toLowerCase();
        const kat = $("stok-kat").selectedIndex ? $("stok-kat").value : "";
        const gol = $("stok-gol").value;
        const st = $("stok-st").selectedIndex ? $("stok-st").value : "";
        root.querySelectorAll("#stok-obat tbody tr").forEach((tr, i) => {
          const r = STOK_ROWS[i];
          if (!r) return;
          tr.hidden = !((!q || `${r.o.nama} ${r.o.kode} ${r.o.barcode} ${r.o.generik}`.toLowerCase().includes(q)) && (!kat || r.o.kategori === kat) && (!gol || r.o.golongan === gol) && (!st || r.st === st));
        });
      };
      on(root, "#stok-q", "input", apply);
      on(root, "#stok-kat, #stok-gol, #stok-st", "change", apply);
    },
  };

  /* =====================================================================
     3. STOK KEDALUWARSA
     ===================================================================== */
  const REKOM = {
    ed: "Karantina, retur bila PBF menerima, atau musnahkan",
    b30: "Retur ke PBF segera / tarik dari rak",
    b90: "Diskon cepat atau mutasi ke cabang lebih laku",
    b180: "Prioritaskan FEFO, pantau penjualan",
  };
  const KAD_ACT = {
    retur: { t: "Ajukan retur ke PBF?", v: "warning", ic: "assignment_return", ok: "Ajukan Retur", msg: (b) => `Batch <b>${b.batch}</b> ${esc(b.nama)} (${num(b.qty)} ${esc(b.satuan)}) akan diajukan retur ke <b>${esc(b.supplier)}</b>. Nota retur dibuat otomatis dan menunggu persetujuan PBF.`, done: (b) => `Pengajuan retur ${b.batch} dikirim ke ${supShort(b.supplier)}` },
    diskon: { t: "Buat diskon cepat?", v: "pink", ic: "sell", ok: "Aktifkan Diskon", msg: (b) => `Harga jual batch <b>${b.batch}</b> ${esc(b.nama)} akan didiskon <b>20%</b> di kasir cabang ${esc(cabShort(b.cabang))} hingga 14 hari sebelum ED. Kasir wajib menginformasikan tanggal ED kepada pembeli.`, done: (b) => `Diskon cepat 20% aktif untuk batch ${b.batch}` },
    karantina: { t: "Karantina batch?", v: "dark", ic: "lock", ok: "Karantina", msg: (b) => `Batch <b>${b.batch}</b> ${esc(b.nama)} akan dikunci dari penjualan & dipindahkan ke area karantina (rak merah) cabang ${esc(cabShort(b.cabang))}.`, done: (b) => `Batch ${b.batch} dikarantina & diblokir dari kasir` },
    musnah: { t: "Masukkan ke daftar pemusnahan?", v: "danger", ic: "delete_forever", ok: "Ya, masukkan", msg: (b) => `Batch <b>${b.batch}</b> ${esc(b.nama)} (${num(b.qty)} ${esc(b.satuan)}, ${rp(nilaiBatch(b))}) akan dimasukkan ke draft <b>Berita Acara Pemusnahan</b>.${khusus(b.golongan) ? " Item ini termasuk " + DB.golonganLabel[b.golongan] + " — wajib disaksikan petugas Dinas Kesehatan / Balai POM." : ""}`, done: (b) => `${b.batch} ditambahkan ke Berita Acara Pemusnahan` },
  };

  window.PAGES.kadaluarsa = {
    render({ state }) {
      const cab = state.cabang;
      const bs = batchesOf(cab);
      const grp = {};
      BUCKETS.forEach((k) => { grp[k.id] = bs.filter((b) => bucketOf(b.sisaHari) === k.id).sort((a, b) => a.sisaHari - b.sisaHari); });
      const potensi = sumNilai(grp.ed) + sumNilai(grp.b30);
      const destroy = grp.ed;
      const nark = destroy.filter((b) => khusus(b.golongan));
      const idx = (b) => DB.batches.indexOf(b);
      const act = (b, k) => { const a = KAD_ACT[k]; return btn("", a.v, { icon: a.ic, size: "sm", title: { retur: "Retur ke PBF", diskon: "Diskon cepat", karantina: "Karantina", musnah: "Musnahkan" }[k], attrs: `data-kad="${k}" data-b="${idx(b)}"` }); };
      const cols = (bid) => [
        { label: `<input type="checkbox" aria-label="Pilih semua" data-kad-all="${bid}">`, render: () => `<input type="checkbox" aria-label="Pilih batch" class="kad-cb-${bid}">` },
        { label: "Obat", render: (b) => `<div class="t-main">${esc(b.nama)}</div><div class="t-sub">${golongan(b.golongan)}</div>` },
        { label: "Batch", render: (b) => `<span class="mono strong">${b.batch}</span>` },
        { label: "Cabang", render: (b) => `<span class="small">${esc(cabShort(b.cabang))}</span>` },
        { label: "ED", render: (b) => `<span class="nowrap">${tgl(b.ed)}</span>` },
        { label: "Sisa hari", render: (b) => sisaBadge(b.sisaHari) },
        { label: "Qty", cls: "num nowrap", render: (b) => `${num(b.qty)} <span class="muted small">${esc(b.satuan)}</span>` },
        { label: "Nilai HPP", cls: "num nowrap", render: (b) => `<b>${rp(nilaiBatch(b))}</b>` },
        { label: "Supplier", render: (b) => `<span class="small">${esc(supShort(b.supplier))}</span>` },
        { label: "Aksi", cls: "actions", render: (b) => `<div class="btn-group" style="flex-wrap:nowrap">${act(b, "retur")}${bid === "ed" ? "" : act(b, "diskon")}${act(b, "karantina")}${act(b, "musnah")}</div>` },
      ];

      return `
      ${UI.pageHeader({
        title: "Stok Kedaluwarsa",
        sub: `Pemantauan tanggal kedaluwarsa (ED) per batch <b>${esc(cabLabel(cab))}</b> — karantina, retur ke PBF, diskon cepat, dan pemusnahan dengan berita acara.`,
        crumbs: ["Persediaan", "Stok Kedaluwarsa"],
        actions: `${btn("Karantina Semua ED", "danger", { icon: "lock", attrs: `data-toast="${grp.ed.length} batch ED dikarantina & diblokir dari kasir" data-tone="danger"` })}${btn("Laporan ED", "white", { icon: "summarize", attrs: 'data-go="lap-kadaluarsa"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Daftar batch ED diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-5">
        ${BUCKETS.map((k) => stat({ label: k.label, value: `${grp[k.id].length} batch`, icon: k.ic, tone: k.tone, foot: `nilai ${short(sumNilai(grp[k.id]))}` })).join("")}
        ${stat({ label: "Nilai kerugian potensial", value: short(potensi), icon: "money_off", tone: "danger", hero: true, foot: "sudah ED + ED ≤ 30 hari" })}
      </div>

      ${alert("warn", "policy", "Kebijakan FEFO & kedaluwarsa", `Pengeluaran stok wajib <b style="display:inline">FEFO</b> (First Expired First Out). Obat dengan ED ≤ 90 hari diberi label kuning & tidak dijual untuk terapi jangka panjang; ED ≤ 30 hari ditarik dari rak penjualan. Obat kedaluwarsa wajib dikarantina, dicatat, lalu diretur atau dimusnahkan dengan berita acara (Permenkes No. 73/2016). Pemusnahan narkotika & psikotropika disaksikan petugas Dinas Kesehatan / Balai POM dan dilaporkan ke Kemenkes.`)}

      <div class="grid g-2-1">
        ${card({
          title: "Nilai stok berisiko per cabang", desc: "Nilai HPP (Rp) per kelompok sisa umur, seluruh cabang", icon: "bar_chart", tone: "red",
          body: `${legend(BUCKETS.map((k) => [k.label, `var(--chart-${k.c.slice(1)})`]))}
          ${chart("kad-ch-cabang", (k) => ({
            type: "bar",
            data: { labels: CAB.map(cabShort), datasets: BUCKETS.map((bk) => ({ label: bk.label, data: CAB.map((c) => sumNilai(DB.batches.filter((b) => b.cabang === c && bucketOf(b.sisaHari) === bk.id))), backgroundColor: k[bk.c], borderRadius: 4, borderSkipped: "bottom", stack: "s" })) },
            options: { interaction: { mode: "index", intersect: false }, scales: { y: { stacked: true, ticks: { callback: rpTick }, grid: { color: k.grid } }, x: { stacked: true, grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${rp(c.raw)}` } } } },
          }))}`,
        })}
        ${card({
          title: "Tindakan disarankan", desc: "Berdasarkan umur batch & golongan", icon: "task_alt", tone: "amber", flush: true,
          body: `<div class="list">
            <div class="list-item"><div class="sq-ico red">${icon("lock")}</div><div class="grow"><div class="title small">Karantina batch ED</div><div class="meta">${grp.ed.length} batch · ${short(sumNilai(grp.ed))}</div></div>${badge("Segera", "red")}</div>
            <div class="list-item"><div class="sq-ico amber">${icon("assignment_return")}</div><div class="grow"><div class="title small">Retur ke PBF (ED ≤ 30 hari)</div><div class="meta">${grp.b30.length} batch · syarat retur maks. H-30 s.d. H-90</div></div>${btn("", "warning", { icon: "arrow_forward", size: "sm", title: "Retur pembelian", attrs: 'data-go="returbeli"' })}</div>
            <div class="list-item"><div class="sq-ico purple">${icon("sell")}</div><div class="grow"><div class="title small">Diskon cepat 31–90 hari</div><div class="meta">${grp.b90.filter((b) => !khusus(b.golongan)).length} batch dapat dipromosikan</div></div>${btn("", "pink", { icon: "sell", size: "sm", title: "Atur diskon", attrs: 'data-toast="Draft promo diskon cepat dibuat untuk batch 31–90 hari"' })}</div>
            <div class="list-item"><div class="sq-ico blue">${icon("swap_horiz")}</div><div class="grow"><div class="title small">Mutasi ke cabang lebih laku</div><div class="meta">${grp.b180.length} batch 91–180 hari</div></div>${btn("", "primary", { icon: "arrow_forward", size: "sm", title: "Mutasi", attrs: 'data-go="mutasi"' })}</div>
            <div class="list-item"><div class="sq-ico red">${icon("delete_forever")}</div><div class="grow"><div class="title small">Pemusnahan</div><div class="meta">${destroy.length} batch · ${nark.length} narkotika/psikotropika</div></div>${btn("", "danger", { icon: "arrow_downward", size: "sm", title: "Ke berita acara", attrs: 'data-kad-scroll' })}</div>
          </div>`,
        })}
      </div>

      ${card({
        title: "Daftar batch berdasarkan sisa umur", desc: `${esc(cabLabel(cab))} · urut ED terdekat`, icon: "event_busy", tone: "red", flush: true,
        tools: `${btn("Retur terpilih", "warning", { icon: "assignment_return", size: "sm", attrs: 'data-toast="Batch terpilih diajukan retur ke PBF"' })}${btn("Karantina terpilih", "dark", { icon: "lock", size: "sm", attrs: 'data-toast="Batch terpilih dikarantina"' })}`,
        body: `<div style="padding:14px 20px 0">${tabs("kad-tab", BUCKETS.map((k) => ({ id: k.id, label: k.label, icon: k.ic, n: grp[k.id].length })), "ed")}</div>
          ${BUCKETS.map((k) => `<div data-panel-group="kad-tab" data-panel="${k.id}" style="margin-top:12px" ${k.id === "ed" ? "" : "hidden"}>
            <div class="row small muted" style="padding:0 20px 10px">${icon("tips_and_updates")}<span>Rekomendasi: <b style="color:var(--text-2)">${REKOM[k.id]}</b></span></div>
            ${table({ columns: cols(k.id), rows: grp[k.id], rowCls: (b) => (b.sisaHari < 0 ? "row-danger" : b.sisaHari <= 30 ? "row-warn" : ""), empty: "Tidak ada batch pada kelompok ini", foot: grp[k.id].length ? `<tr><td colspan="6">Total ${grp[k.id].length} batch</td><td class="num nowrap">${num(grp[k.id].reduce((s, b) => s + b.qty, 0))}</td><td class="num nowrap">${rp(sumNilai(grp[k.id]))}</td><td colspan="2"></td></tr>` : "" })}
          </div>`).join("")}`,
      })}

      ${card({
        title: "Berita Acara Pemusnahan Obat", desc: "Draft BA untuk batch kedaluwarsa · format sesuai Permenkes No. 73/2016 & Peraturan BPOM No. 4/2018", icon: "gavel", tone: "red", id: "kad-ba",
        body: `<div class="grid g-1-2">
          <div class="stack">
            <div class="form-grid">
              ${input("No. berita acara", { value: `BAP/${cab === "ALL" ? "PST" : cab}/${YM}/004`, attrs: "readonly" })}
              ${input("Tanggal pemusnahan", { type: "date", value: dIso(3) })}
              ${input("Tempat", { value: cab === "ALL" ? DB.apotek.alamat : cabangNama(cab), cls: "full" })}
              ${select("Saksi Apoteker PJ", DB.cabang.map((c) => `${c.apoteker}, S.Farm.`), { value: `${(DB.cabang.find((c) => c.id === cab) || DB.cabang[0]).apoteker}, S.Farm.`, cls: "full" })}
              ${input("Saksi TTK / petugas", { value: "Nabila Putri, A.Md.Farm." })}
              ${input("NIP / No. STRTTK", { value: "STRTTK 19.2.0213.4401" })}
              ${input("Saksi Dinas Kesehatan / Balai POM", { value: nark.length ? "Drs. Hadi Susanto, Apt. (Sudinkes Jaksel)" : "", ph: "Wajib untuk narkotika & psikotropika", cls: "full", hint: nark.length ? `${nark.length} item narkotika/psikotropika — kehadiran saksi wajib` : "Opsional untuk obat non-narkotika/psikotropika" })}
              ${select("Metode pemusnahan", ["Insinerasi oleh pengolah limbah B3 berizin", "Dihancurkan & dilarutkan (padat / cair)", "Dikembalikan ke PBF / industri untuk dimusnahkan", "Ditimbun sesuai ketentuan limbah B3"], { cls: "full" })}
              ${input("Pihak ketiga pengolah limbah B3", { value: "PT Wastec International (izin KLHK)", cls: "full" })}
            </div>
          </div>
          <div class="stack">
            ${nark.length ? alert("danger", "shield", `${nark.length} item narkotika/psikotropika`, "Pemusnahan wajib disaksikan petugas Dinas Kesehatan Kab/Kota atau Balai POM, dan BA dikirim ke Kemenkes, Dinkes Provinsi & Balai POM setempat.") : ""}
            ${table({
              cls: "compact",
              columns: [
                { label: "No", render: (b, i) => i + 1 },
                { label: "Nama obat", render: (b) => `<div class="t-main">${esc(b.nama)}</div><div class="t-sub">${golongan(b.golongan)}</div>` },
                { label: "Batch / ED", render: (b) => `<span class="mono">${b.batch}</span><div class="t-sub">${tgl(b.ed)}</div>` },
                { label: "Cabang", render: (b) => `<span class="small">${esc(cabShort(b.cabang))}</span>` },
                { label: "Qty", cls: "num nowrap", render: (b) => `${num(b.qty)} ${esc(b.satuan)}` },
                { label: "Nilai HPP", cls: "num nowrap", render: (b) => rp(nilaiBatch(b)) },
              ],
              rows: destroy, empty: "Tidak ada obat kedaluwarsa untuk dimusnahkan",
              foot: `<tr><td colspan="4">Total ${destroy.length} batch</td><td class="num nowrap">${num(destroy.reduce((s, b) => s + b.qty, 0))}</td><td class="num nowrap">${rp(sumNilai(destroy))}</td></tr>`,
            })}
          </div>
        </div>`,
        foot: `<span class="small muted">${icon("info")} BA ditandatangani Apoteker PJ & para saksi, arsip disimpan minimal 5 tahun.</span><span style="flex:1"></span>
          ${btn("Riwayat BA", "dark", { icon: "history", attrs: "data-ba-hist" })}
          ${btn("Cetak", "teal", { icon: "print", attrs: 'data-toast="Berita acara pemusnahan dikirim ke printer"' })}
          ${btn("Buat Berita Acara", "danger", { icon: "gavel", attrs: "data-ba-make" })}`,
      })}`;
    },
    mount(root) {
      on(root, "[data-kad]", "click", (el) => {
        const b = DB.batches[+el.dataset.b];
        const a = KAD_ACT[el.dataset.kad];
        confirmBox({ title: a.t, icon: a.ic, msg: a.msg(b), okLabel: a.ok, okVariant: a.v, onOk: () => toast(a.done(b), el.dataset.kad === "musnah" ? "danger" : "success") });
      });
      on(root, "[data-kad-all]", "change", (el) => root.querySelectorAll(`.kad-cb-${el.dataset.kadAll}`).forEach((c) => { c.checked = el.checked; }));
      on(root, "[data-kad-scroll]", "click", () => root.querySelector("#kad-ba")?.scrollIntoView({ behavior: "smooth" }));
      on(root, "[data-ba-make]", "click", () => confirmBox({
        title: "Buat Berita Acara Pemusnahan?", icon: "gavel", okLabel: "Buat & Kunci BA", okVariant: "danger",
        msg: "Semua batch pada daftar akan dikurangi dari stok (keluar: pemusnahan) dan BA dikunci untuk ditandatangani. Tindakan ini tidak dapat dibatalkan.",
        onOk: () => toast("Berita Acara Pemusnahan dibuat & menunggu tanda tangan saksi", "danger"),
      }));
      on(root, "[data-ba-hist]", "click", () => modal.open({
        title: "Riwayat Berita Acara Pemusnahan", icon: "history", size: "lg",
        body: table({
          columns: [
            { label: "No. BA", render: (r) => `<span class="mono strong">${r[0]}</span>` },
            { label: "Tanggal", render: (r) => tgl(dIso(r[1])) },
            { label: "Item", cls: "num nowrap", render: (r) => r[2] },
            { label: "Nilai", cls: "num nowrap", render: (r) => rp(r[3]) },
            { label: "Metode", render: (r) => `<span class="small">${r[4]}</span>` },
            { label: "Saksi eksternal", render: (r) => `<span class="small">${r[5]}</span>` },
            { label: "Status", render: () => status("Selesai") },
          ],
          rows: [
            ["BAP/PST/2608/003", -34, 14, 3240000, "Insinerasi (limbah B3)", "Sudinkes Jaksel"],
            ["BAP/BKS/2607/002", -71, 9, 1875000, "Insinerasi (limbah B3)", "—"],
            ["BAP/PST/2606/002", -98, 21, 5610000, "Dikembalikan ke industri", "Balai POM Jakarta"],
            ["BAP/DPK/2605/001", -128, 6, 940000, "Dihancurkan & dilarutkan", "—"],
          ],
        }),
        foot: btn("Tutup", "dark", { attrs: "data-close" }),
      }));
    },
  };

  /* =====================================================================
     4. STOK OPNAME
     ===================================================================== */
  const OPN_KAT = ["Antibiotik", "Batuk & Flu", "Psikotropika & Narkotika"];
  const OPN = DB.batches
    .filter((b) => b.sisaHari >= 0 && OPN_KAT.includes(byKode(b.kode).kategori))
    .map((b) => ({ b, o: byKode(b.kode) }))
    .sort((a, b) => a.o.rak.localeCompare(b.o.rak))
    .slice(0, 16)
    .map((r, i) => {
      const d = i % 5 === 2 ? -2 : i % 7 === 3 ? -1 : i % 9 === 4 ? 1 : 0;
      return { ...r, sys: r.b.qty, fisik: i >= 12 ? null : r.b.qty + d, ket: d < 0 ? (khusus(r.o.golongan) ? "Telusuri resep & register" : "Kemasan rusak / hilang") : d > 0 ? "Retur pelanggan belum diinput" : "" };
    });
  const opnCalc = () => {
    const c = OPN.filter((r) => r.fisik !== null);
    const sel = c.filter((r) => r.fisik !== r.sys);
    return { n: OPN.length, counted: c.length, sel: sel.length, qty: c.reduce((s, r) => s + r.fisik - r.sys, 0), net: c.reduce((s, r) => s + (r.fisik - r.sys) * r.b.hargaBeli, 0), akurasi: c.length ? ((c.length - sel.length) / c.length) * 100 : 100 };
  };
  const opnTiles = (k) => `
    ${stat({ label: "Item dihitung", value: `${k.counted} / ${k.n}`, icon: "fact_check", tone: "primary", foot: `${pct((k.counted / k.n) * 100)} selesai` })}
    ${stat({ label: "Item selisih", value: num(k.sel), icon: "difference", tone: "warning", foot: `net ${sgn(k.qty)} unit` })}
    ${stat({ label: "Nilai selisih", value: sgnRp(k.net), icon: "account_balance_wallet", tone: k.net < 0 ? "danger" : "success", foot: "berdasarkan HPP" })}
    ${stat({ label: "Akurasi stok", value: pct(k.akurasi), icon: "verified", tone: "teal", foot: "target ≥ 98%" })}`;

  function openOpnameBaru(state) {
    modal.open({
      title: "Mulai Stok Opname Baru", icon: "fact_check", size: "lg",
      body: `
        <div class="form-grid cols-3">
          ${input("No. sesi", { value: `OPN/${state.cabang === "ALL" ? "PST" : state.cabang}/${YM}/004`, attrs: "readonly" })}
          ${select("Cabang", cabOptions(false), { value: state.cabang === "ALL" ? "PST" : state.cabang })}
          ${select("Jenis opname", ["Parsial per rak (cycle count)", "Total (seluruh gudang & rak)", "Per golongan (narkotika & psikotropika)", "Obat fast moving (kelas A)"])}
          ${input("Tanggal mulai", { type: "datetime-local", value: `${dIso(0)}T21:00` })}
          ${select("Petugas hitung", DB.users.filter((u) => u.status === "Aktif" && u.role !== "Owner").map((u) => `${u.nama} (${u.role})`))}
          ${select("Pengawas (Apoteker)", DB.cabang.map((c) => c.apoteker))}
          <div class="field full"><label>Rak / lokasi dihitung</label><div class="row">${["A1 Analgesik", "B2 Antibiotik", "C1 Batuk & Flu", "D1 Saluran Cerna", "E1 Kardio", "E2 Diabetes", "F1 Vitamin", "K1 Lemari Narkotika-Psikotropika", "Gudang"].map((r, i) => `<label class="check" style="margin-right:12px"><input type="checkbox" ${[1, 2, 7].includes(i) ? "checked" : ""}>${r}</label>`).join("")}</div></div>
        </div>
        <div class="row between"><div><b class="small">Bekukan transaksi rak terpilih</b><div class="small muted">Penjualan item pada rak yang sedang dihitung ditahan sampai hitungan disimpan</div></div><label class="switch"><input type="checkbox" checked aria-label="Bekukan transaksi"><span></span></label></div>
        <div class="row between"><div><b class="small">Hitung buta (blind count)</b><div class="small muted">Stok sistem disembunyikan dari petugas hitung</div></div><label class="switch"><input type="checkbox" checked aria-label="Hitung buta"><span></span></label></div>`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Cetak Lembar Hitung", "teal", { icon: "print", attrs: 'data-toast="Lembar hitung opname dikirim ke printer"' })}${btn("Mulai Opname", "success", { icon: "play_arrow", attrs: 'data-close data-toast="Sesi opname baru dimulai"' })}`,
    });
  }

  window.PAGES.opname = {
    render({ state }) {
      const cab = state.cabang === "ALL" ? "PST" : state.cabang;
      const k = opnCalc();
      const raks = [["B2", "Antibiotik", "done"], ["C1", "Batuk & Flu", "now"], ["K1", "Narkotika & Psikotropika", "wait"]];
      const hist = [
        [`OPN/${cab}/${YM}/003`, -5, "Parsial · Rak A1, D1", 58, 3, -186500, 94.8, "Nabila P.", "Selesai"],
        [`OPN/${cab}/${YM}/002`, -12, "Per golongan · Narkotika & psikotropika", 12, 0, 0, 100, "apt. Rina W.", "Selesai"],
        [`OPN/${cab}/${YM}/001`, -19, "Parsial · Rak E1, E2", 44, 2, -94000, 95.5, "Nabila P.", "Selesai"],
        [`OPN/${cab}/2608/004`, -33, "Total · seluruh gudang & rak", 412, 17, -1284500, 95.9, "Tim gudang", "Disetujui"],
        [`OPN/${cab}/2607/003`, -64, "Parsial · Rak F1, G1", 51, 4, 38500, 92.2, "Yulia A.", "Disetujui"],
      ];
      return `
      ${UI.pageHeader({
        title: "Stok Opname",
        sub: `Penghitungan fisik stok <b>${esc(cabangNama(cab))}</b> — selisih dihitung otomatis terhadap stok sistem, penyesuaian diajukan ke Apoteker PJ sebelum finalisasi.`,
        crumbs: ["Persediaan", "Stok Opname"],
        actions: `${btn("Mulai Opname Baru", "success", { icon: "add", attrs: "data-opn-new" })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Hasil opname diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4" id="opn-tiles">${opnTiles(k)}</div>

      <div class="grid g-2-1">
        ${card({
          title: `Sesi aktif · OPN/${cab}/${YM}/004`, desc: "Parsial per rak (cycle count) · hitung buta aktif", icon: "pending_actions", tone: "cyan",
          tools: badge("Berlangsung", "cyan", { dot: true }),
          body: `<div class="stack">
            <div class="row between small"><span>Progres penghitungan</span><b class="num" id="opn-prog-t">${k.counted} dari ${k.n} batch · ${pct((k.counted / k.n) * 100, 0)}</b></div>
            <div id="opn-prog">${progress(k.counted, k.n, k.counted === k.n ? "green" : "")}</div>
            <div class="grid g-3" style="gap:12px">${raks.map(([r, n, s]) => `<div class="row" style="gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;flex-wrap:nowrap">
              <div class="sq-ico ${s === "done" ? "green" : s === "now" ? "blue" : "amber"}">${icon(s === "done" ? "check" : s === "now" ? "timelapse" : "lock")}</div>
              <div><div class="strong small">Rak ${r}</div><div class="small muted">${n}</div><div style="margin-top:4px">${s === "done" ? badge("Selesai", "green") : s === "now" ? badge("Sedang dihitung", "blue") : badge("Menunggu", "gray")}</div></div></div>`).join("")}</div>
            <dl class="kv" style="margin:0"><dt>Mulai</dt><dd>${tgl(DB.TODAY)} · 20.30 WIB</dd><dt>Petugas hitung</dt><dd>Nabila Putri, Yulia Anggraini</dd><dt>Pengawas</dt><dd>${esc(DB.cabang.find((c) => c.id === cab).apoteker)}</dd><dt>Transaksi rak</dt><dd>${badge("Dibekukan", "amber", { icon: "ac_unit" })}</dd></dl>
          </div>`,
        })}
        ${card({
          title: "Aturan opname", icon: "rule", tone: "purple",
          body: `<div class="stack small">
            ${alert("info", "info", "Hitung buta", "Petugas mencatat qty fisik tanpa melihat stok sistem; selisih hanya tampil untuk pengawas.")}
            ${alert("warn", "shield", "Narkotika & psikotropika", "Dihitung oleh Apoteker PJ bersama TTK. Selisih wajib ditelusuri ke resep & register sebelum penyesuaian dan dilaporkan pada SIPNAP.")}
            <div class="muted">Selisih &gt; Rp 500.000 atau &gt; 2% nilai rak memerlukan persetujuan Owner sebelum finalisasi.</div>
          </div>`,
        })}
      </div>

      ${card({
        title: "Lembar hitung", desc: "Rak B2, C1, K1 · isi kolom stok fisik, selisih dihitung otomatis", icon: "edit_note", flush: true,
        tools: `<div class="input-icon" style="width:220px">${icon("barcode_scanner")}<input class="input sm" placeholder="Pindai barcode / batch" aria-label="Pindai barcode"></div>${btn("", "info", { icon: "visibility_off", size: "sm", title: "Tampilkan stok sistem", attrs: 'data-toast="Mode hitung buta dimatikan untuk pengawas" data-tone="info"' })}`,
        body: table({
          columns: [
            { label: "#", render: (r, i) => i + 1 },
            { label: "Obat", render: (r) => `<div class="t-main">${esc(r.o.nama)}</div><div class="t-sub">${golongan(r.o.golongan)} · rak <span class="mono">${r.o.rak}</span></div>` },
            { label: "Batch / ED", render: (r) => `<span class="mono">${r.b.batch}</span><div class="t-sub">ED ${tgl(r.b.ed)}</div>` },
            { label: "Stok sistem", cls: "num nowrap", render: (r) => `${num(r.sys)} <span class="muted small">${esc(r.o.satuan)}</span>` },
            { label: "Stok fisik", cls: "num nowrap", render: (r, i) => `<input type="number" min="0" class="input sm opn-fisik" data-i="${i}" value="${r.fisik ?? ""}" placeholder="Hitung…" style="width:96px;text-align:right" aria-label="Stok fisik ${esc(r.o.nama)}">` },
            { label: "Selisih", cls: "num nowrap", render: (r) => `<span class="opn-sel">${r.fisik === null ? '<span class="muted">—</span>' : selHtml(r.fisik - r.sys)}</span>` },
            { label: "Nilai selisih", cls: "num nowrap", render: (r) => `<span class="opn-nil">${r.fisik === null ? '<span class="muted">—</span>' : sgnRp((r.fisik - r.sys) * r.b.hargaBeli)}</span>` },
            { label: "Keterangan", render: (r, i) => `<input class="input sm opn-ket" data-i="${i}" value="${esc(r.ket)}" placeholder="Catatan selisih" style="min-width:190px" aria-label="Keterangan">` },
          ],
          rows: OPN, rowCls: (r) => opnCls(r),
          foot: `<tr><td colspan="3">Total</td><td class="num nowrap">${num(OPN.reduce((s, r) => s + r.sys, 0))}</td><td class="num nowrap" id="opn-f-fis"></td><td class="num nowrap" id="opn-f-sel"></td><td class="num nowrap" id="opn-f-nil"></td><td></td></tr>`,
        }),
        foot: `<span class="small muted" id="opn-foot-note">${icon("info")} Hitungan tersimpan otomatis sebagai draft setiap 30 detik.</span><span style="flex:1"></span>
          ${btn("Simpan Hitungan", "primary", { icon: "save", attrs: 'data-toast="Hitungan opname disimpan (draft)"' })}
          ${btn("Ajukan Penyesuaian", "warning", { icon: "tune", attrs: "data-opn-adj" })}
          ${btn("Finalisasi", "purple", { icon: "task_alt", attrs: "data-opn-final" })}
          ${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Lembar hitung diekspor ke Excel (.xlsx)"' })}`,
      })}

      ${card({
        title: "Riwayat stok opname", desc: esc(cabangNama(cab)), icon: "history", flush: true,
        body: table({
          columns: [
            { label: "No. sesi", render: (r) => `<span class="mono strong">${r[0]}</span>` },
            { label: "Tanggal", render: (r) => tgl(dIso(r[1])) },
            { label: "Jenis / lingkup", render: (r) => `<span class="small">${r[2]}</span>` },
            { label: "Item", cls: "num nowrap", render: (r) => num(r[3]) },
            { label: "Item selisih", cls: "num nowrap", render: (r) => num(r[4]) },
            { label: "Nilai selisih", cls: "num nowrap", render: (r) => `<b style="color:var(--t-${r[5] < 0 ? "red" : "green"}-fg)">${sgnRp(r[5])}</b>` },
            { label: "Akurasi", render: (r) => `<div style="min-width:110px" class="stack"><span class="small num">${pct(r[6])}</span>${progress(r[6], 100, r[6] >= 98 ? "green" : r[6] >= 94 ? "" : "amber")}</div>` },
            { label: "PIC", render: (r) => esc(r[7]) },
            { label: "Status", render: (r) => status(r[8]) },
            { label: "", cls: "actions", render: (r) => UI.rowActions(["view", "print"], r[0]) },
          ],
          rows: hist,
        }),
      })}`;
    },
    mount(root, { state }) {
      const $ = (id) => root.querySelector("#" + id);
      const totals = () => {
        const k = opnCalc();
        $("opn-tiles").innerHTML = opnTiles(k);
        $("opn-f-fis").textContent = num(OPN.reduce((s, r) => s + (r.fisik ?? 0), 0));
        $("opn-f-sel").innerHTML = selHtml(k.qty);
        $("opn-f-nil").textContent = sgnRp(k.net);
        $("opn-prog").innerHTML = progress(k.counted, k.n, k.counted === k.n ? "green" : "");
        $("opn-prog-t").textContent = `${k.counted} dari ${k.n} batch · ${pct((k.counted / k.n) * 100, 0)}`;
      };
      on(root, ".opn-fisik", "input", (el) => {
        const r = OPN[+el.dataset.i];
        r.fisik = el.value === "" ? null : Math.max(0, parseInt(el.value, 10) || 0);
        const tr = el.closest("tr");
        tr.className = opnCls(r);
        tr.querySelector(".opn-sel").innerHTML = r.fisik === null ? '<span class="muted">—</span>' : selHtml(r.fisik - r.sys);
        tr.querySelector(".opn-nil").innerHTML = r.fisik === null ? '<span class="muted">—</span>' : sgnRp((r.fisik - r.sys) * r.b.hargaBeli);
        totals();
      });
      on(root, ".opn-ket", "input", (el) => { OPN[+el.dataset.i].ket = el.value; });
      on(root, "[data-opn-new]", "click", () => openOpnameBaru(state));
      on(root, "[data-opn-adj]", "click", () => {
        const k = opnCalc();
        confirmBox({ title: "Ajukan penyesuaian stok?", icon: "tune", okLabel: "Ajukan", okVariant: "warning", msg: `${k.sel} item selisih (net ${sgn(k.qty)} unit, ${sgnRp(k.net)}) akan diajukan sebagai penyesuaian ke Apoteker PJ.`, onOk: () => toast("Penyesuaian hasil opname diajukan ke Apoteker PJ") });
      });
      on(root, "[data-opn-final]", "click", () => {
        const k = opnCalc();
        if (k.counted < k.n) { toast(`Masih ${k.n - k.counted} batch belum dihitung`, "warn"); return; }
        confirmBox({ title: "Finalisasi stok opname?", icon: "task_alt", okLabel: "Finalisasi", okVariant: "purple", msg: "Stok sistem akan disesuaikan dengan hasil hitung fisik, kartu stok dicatat sebagai <b>Penyesuaian opname</b>, dan sesi dikunci.", onOk: () => toast("Stok opname difinalisasi & kartu stok diperbarui") });
      });
      totals();
    },
  };
  function selHtml(d) { return d === 0 ? badge("Sesuai", "green", { icon: "check" }) : `<b style="color:var(--t-${d < 0 ? "red" : "amber"}-fg)">${sgn(d)}</b>`; }
  function opnCls(r) { return r.fisik === null ? "" : r.fisik < r.sys ? "row-danger" : r.fisik > r.sys ? "row-warn" : ""; }

  /* =====================================================================
     5. MUTASI ANTAR CABANG
     ===================================================================== */
  const MUT_STEPS = [["Permintaan", "request_page"], ["Disetujui", "verified"], ["Dikirim", "inventory"], ["Dalam Perjalanan", "local_shipping"], ["Diterima", "where_to_vote"]];
  const MUT = [
    ...DB.mutasi,
    { no: "MUT/2609/011", tgl: dIso(-3), dari: "DPK", ke: "BKS", item: 4, nilai: 2150000, status: "Disetujui", pengirim: "Rizky F." },
    { no: "MUT/2609/010", tgl: dIso(-4), dari: "PST", ke: "DPK", item: 6, nilai: 4760000, status: "Dikirim", pengirim: "Yulia A." },
    { no: "MUT/2609/009", tgl: dIso(-6), dari: "BGR", ke: "PST", item: 2, nilai: 880000, status: "Ditolak", pengirim: "Wulan S." },
    { no: "MUT/2609/008", tgl: dIso(-8), dari: "PST", ke: "BKS", item: 10, nilai: 7340000, status: "Diterima", pengirim: "Yulia A." },
    { no: "MUT/2609/007", tgl: dIso(-11), dari: "TGR", ke: "BGR", item: 5, nilai: 2615000, status: "Diterima", pengirim: "Intan P." },
  ].sort((a, b) => b.no.localeCompare(a.no));
  const stepIdx = (s) => MUT_STEPS.findIndex(([l]) => l === s);
  const MUT_POOL = DB.obat.filter((o) => !khusus(o.golongan));
  const mutItems = (m) => {
    const n = parseInt(m.no.slice(-3), 10);
    return Array.from({ length: m.item }, (_, j) => {
      const o = MUT_POOL[(n * 3 + j * 5) % MUT_POOL.length];
      const b = DB.batches.find((x) => x.kode === o.kode && x.sisaHari > 90);
      return { o, batch: b ? b.batch : `${o.pabrik.slice(0, 2).toUpperCase()}${2600 + n + j}B`, ed: b ? b.ed : dIso(300 + j * 45), qty: 5 + ((n + j * 3) % 6) * 5 };
    });
  };
  const stepsHtml = (s) => {
    const i = stepIdx(s);
    const fin = s === "Diterima";
    return `<div class="steps">${MUT_STEPS.map(([l, ic], k) => `<div class="step ${fin || k < i ? "done" : k === i ? "now" : ""}"><div class="b">${icon(fin || k < i ? "check" : ic)}</div>${l}</div>`).join("")}</div>`;
  };

  function openMutasiForm(state) {
    const dari = state.cabang === "ALL" ? "PST" : state.cabang;
    const ke = dari === "BGR" ? "PST" : "BGR";
    const items = [byKode("OB0005"), byKode("OB0017"), byKode("OB0023")];
    const row = (o) => { const b = DB.batches.find((x) => x.kode === o.kode && x.sisaHari > 90) || { batch: "—", ed: dIso(365) }; return `<tr>
      <td><select class="select sm" aria-label="Obat">${MUT_POOL.map((x) => `<option ${x === o ? "selected" : ""}>${esc(x.nama)}</option>`).join("")}</select></td>
      <td><input class="input sm mono" value="${b.batch}" style="width:120px" aria-label="Batch"></td>
      <td><input class="input sm" type="date" value="${b.ed}" aria-label="ED"></td>
      <td class="num nowrap">${num(o.stok[dari])} ${esc(o.satuan)}</td>
      <td class="num nowrap"><input class="input sm" type="number" value="20" min="1" style="width:80px;text-align:right" aria-label="Qty"></td>
      <td>${esc(o.satuan)}</td>
      <td class="actions">${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus baris", attrs: "data-mrow-del" })}</td></tr>`; };
    const el = modal.open({
      title: "Buat Mutasi Antar Cabang", icon: "swap_horiz", size: "xl",
      body: `
        <div class="form-grid cols-4">
          ${input("No. mutasi", { value: `MUT/${YM}/016`, attrs: "readonly" })}
          ${input("Tanggal", { type: "date", value: dIso(0) })}
          ${select("Dari cabang", cabOptions(false), { value: dari })}
          ${select("Ke cabang", cabOptions(false), { value: ke })}
          ${select("Jenis", ["Pengiriman stok (push)", "Permintaan stok (pull)", "Pengembalian ke pusat"])}
          ${select("Prioritas", ["Normal (1–2 hari)", "Mendesak (hari ini)", "Terjadwal"])}
          ${select("Kurir / armada", ["Kurir internal · B 9123 KXT", "Kurir internal · B 9456 PQR", "GoSend Instant", "Diambil cabang"])}
          ${select("Disetujui oleh", DB.cabang.map((c) => c.apoteker), { value: DB.cabang.find((c) => c.id === dari).apoteker })}
        </div>
        <div class="table-wrap"><table class="tbl compact">
          <thead><tr><th>Obat</th><th>Batch</th><th>ED</th><th class="num">Stok asal</th><th class="num">Qty kirim</th><th>Satuan</th><th></th></tr></thead>
          <tbody id="mut-rows">${items.map(row).join("")}</tbody>
        </table></div>
        <div class="row">${btn("Tambah Item", "success", { icon: "add", size: "sm", attrs: "data-mrow-add" })}<span class="small muted">Batch dipilih otomatis berdasarkan FEFO; ED minimal 3 bulan untuk dikirim.</span></div>
        ${textarea("Catatan", { value: "Stok Amlodipine & Vitamin C cabang tujuan di bawah minimum, kebutuhan program prolanis minggu ini." })}
        ${alert("warn", "shield", "Narkotika & psikotropika", "Mutasi narkotika/psikotropika antar cabang tidak melalui form ini — gunakan SP khusus yang ditandatangani Apoteker PJ kedua cabang.")}`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Draft", "light", { icon: "draft", attrs: 'data-close data-toast="Draft mutasi disimpan"' })}${btn("Ajukan Mutasi", "primary", { icon: "send", attrs: 'data-close data-toast="Mutasi MUT/2609/016 diajukan, menunggu persetujuan"' })}`,
    });
    const tb = el.querySelector("#mut-rows");
    tb.addEventListener("click", (e) => { const d = e.target.closest("[data-mrow-del]"); if (d && tb.children.length > 1) d.closest("tr").remove(); });
    el.querySelector("[data-mrow-add]").addEventListener("click", () => tb.insertAdjacentHTML("beforeend", row(MUT_POOL[(tb.children.length * 7) % MUT_POOL.length])));
  }

  function openMutasiDetail(m) {
    const items = mutItems(m);
    const i = stepIdx(m.status);
    const log = [
      ["Permintaan dibuat", `${m.pengirim} · ${cabShort(m.ke)}`, 0],
      ["Disetujui Apoteker PJ", DB.cabang.find((c) => c.id === m.dari).apoteker, 1],
      ["Barang disiapkan & dikirim", `Surat jalan SJ-${m.no.slice(4)} · ${m.pengirim}`, 2],
      ["Dalam perjalanan", "Kurir internal · B 9123 KXT", 3],
      ["Diterima & dicek", `${DB.cabang.find((c) => c.id === m.ke).apoteker} · sesuai`, 4],
    ].filter((x) => m.status === "Diterima" || x[2] <= i);
    const el = modal.open({
      title: `Mutasi ${m.no}`, icon: "swap_horiz", size: "lg",
      body: `
        ${m.status === "Ditolak" ? alert("danger", "block", "Mutasi ditolak", "Stok cabang asal tidak mencukupi setelah penjualan hari berjalan. Silakan ajukan ulang atau buat SP ke PBF.") : stepsHtml(m.status)}
        <div class="grid g-2">
          <dl class="kv" style="margin:0"><dt>Dari</dt><dd>${esc(cabangNama(m.dari))}</dd><dt>Ke</dt><dd>${esc(cabangNama(m.ke))}</dd><dt>Tanggal</dt><dd>${tgl(m.tgl)}</dd><dt>Pengirim</dt><dd>${esc(m.pengirim)}</dd></dl>
          <dl class="kv" style="margin:0"><dt>Jumlah item</dt><dd>${m.item} item</dd><dt>Nilai (HPP)</dt><dd>${rp(m.nilai)}</dd><dt>Status</dt><dd>${status(m.status)}</dd><dt>Surat jalan</dt><dd class="mono">SJ-${m.no.slice(4)}</dd></dl>
        </div>
        ${table({
          cls: "compact",
          columns: [
            { label: "No", render: (r, k) => k + 1 },
            { label: "Obat", render: (r) => `<div class="t-main">${esc(r.o.nama)}</div><div class="t-sub">${golongan(r.o.golongan)}</div>` },
            { label: "Batch", render: (r) => `<span class="mono">${r.batch}</span>` },
            { label: "ED", render: (r) => tgl(r.ed) },
            { label: "Qty", cls: "num nowrap", render: (r) => `${num(r.qty)} ${esc(r.o.satuan)}` },
            { label: "Cek terima", render: () => (m.status === "Diterima" ? badge("Sesuai", "green", { icon: "check" }) : badge("Belum", "gray")) },
          ],
          rows: items,
        })}
        <div class="grid g-2">
          <div style="border:1px dashed var(--border-strong);border-radius:12px;padding:16px 18px;background:var(--surface-2)" class="stack small">
            <div class="row between"><div><b>${esc(DB.apotek.nama)}</b><div class="muted">${esc(cabangNama(m.dari))}</div></div><b class="mono">SURAT JALAN</b></div>
            <div class="dashed"></div>
            <div class="row between"><span>No. SJ-${m.no.slice(4)}</span><span>${tgl(m.tgl)}</span></div>
            <div>Kepada: <b>${esc(cabangNama(m.ke))}</b></div>
            ${items.slice(0, 4).map((r) => `<div class="row between"><span>${esc(r.o.nama)} · ${r.batch}</span><span class="num">${num(r.qty)} ${esc(r.o.satuan)}</span></div>`).join("")}
            ${items.length > 4 ? `<div class="muted">+ ${items.length - 4} item lainnya</div>` : ""}
            <div class="dashed"></div>
            <div class="grid g-3 center" style="gap:8px"><div>Pengirim<br><br><b>${esc(m.pengirim)}</b></div><div>Kurir<br><br><b>Andri S.</b></div><div>Penerima<br><br><b>( ............ )</b></div></div>
          </div>
          <div class="timeline" style="padding:0">${log.map(([t, d, k]) => `<div class="tl ${k === 4 ? "green" : ""}"><span class="d"></span><div><div class="t">${t}</div><div class="m">${esc(d)} · ${tgl(DB.addDays(-Math.max(0, 3 - k)))}</div></div></div>`).join("")}</div>
        </div>`,
      foot: `${btn("Tutup", "dark", { attrs: "data-close" })}
        ${btn("Cetak Surat Jalan", "teal", { icon: "print", attrs: `data-toast="Surat jalan SJ-${m.no.slice(4)} dikirim ke printer"` })}
        ${m.status === "Permintaan" ? btn("Tolak", "danger", { icon: "block", attrs: 'data-close data-toast="Permintaan mutasi ditolak" data-tone="danger"' }) + btn("Setujui", "success", { icon: "check", attrs: `data-close data-toast="Mutasi ${m.no} disetujui"` }) : ""}
        ${m.status === "Disetujui" ? btn("Kirim Barang", "primary", { icon: "local_shipping", attrs: `data-close data-toast="Mutasi ${m.no} dikirim, stok asal dikurangi"` }) : ""}
        ${["Dikirim", "Dalam Perjalanan"].includes(m.status) ? btn("Terima Barang", "success", { icon: "where_to_vote", attrs: `data-close data-toast="Mutasi ${m.no} diterima, stok tujuan bertambah"` }) : ""}`,
    });
    return el;
  }

  window.PAGES.mutasi = {
    render({ state }) {
      const cab = state.cabang;
      const rows = MUT.filter((m) => cab === "ALL" || m.dari === cab || m.ke === cab);
      const grp = {
        semua: rows,
        setuju: rows.filter((m) => m.status === "Permintaan"),
        proses: rows.filter((m) => ["Disetujui", "Dikirim", "Dalam Perjalanan"].includes(m.status)),
        selesai: rows.filter((m) => ["Diterima", "Ditolak"].includes(m.status)),
      };
      const cols = [
        { label: "No. mutasi", render: (m) => `<span class="mono strong">${m.no}</span><div class="t-sub">${tgl(m.tgl)}</div>` },
        { label: "Rute", render: (m) => `<span class="nowrap"><b>${m.dari}</b> ${icon("arrow_forward", "muted")} <b>${m.ke}</b></span><div class="t-sub">${esc(cabShort(m.dari))} → ${esc(cabShort(m.ke))}</div>` },
        ...(cab === "ALL" ? [] : [{ label: "Arah", render: (m) => (m.dari === cab ? badge("Keluar", "amber", { icon: "north_east" }) : badge("Masuk", "green", { icon: "south_west" })) }]),
        { label: "Item", cls: "num nowrap", render: (m) => num(m.item) },
        { label: "Nilai HPP", cls: "num nowrap", render: (m) => rp(m.nilai) },
        { label: "Pengirim", render: (m) => esc(m.pengirim) },
        { label: "Progres", render: (m) => { const i = m.status === "Ditolak" ? 0 : stepIdx(m.status) + 1; return `<div class="stack" style="gap:4px;min-width:120px"><span class="small muted">${m.status === "Ditolak" ? "Dihentikan" : `Tahap ${i}/5`}</span>${progress(i, 5, m.status === "Ditolak" ? "red" : i === 5 ? "green" : "")}</div>`; } },
        { label: "Status", render: (m) => status(m.status) },
        { label: "", cls: "actions", render: (m) => `<div class="btn-group" style="flex-wrap:nowrap">
          ${btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-mut="${m.no}"` })}
          ${m.status === "Permintaan" ? btn("", "success", { icon: "check", size: "sm", title: "Setujui", attrs: `data-mut-ok="${m.no}"` }) : ""}
          ${["Dikirim", "Dalam Perjalanan"].includes(m.status) ? btn("", "success", { icon: "where_to_vote", size: "sm", title: "Terima barang", attrs: `data-mut-terima="${m.no}"` }) : ""}
          ${btn("", "teal", { icon: "print", size: "sm", title: "Cetak surat jalan", attrs: `data-toast="Surat jalan ${m.no} dikirim ke printer"` })}</div>` },
      ];
      const nilaiBulan = rows.filter((m) => m.status !== "Ditolak").reduce((s, m) => s + m.nilai, 0);
      return `
      ${UI.pageHeader({
        title: "Mutasi Antar Cabang",
        sub: `Transfer stok antar cabang <b>${esc(cabLabel(cab))}</b> dengan alur persetujuan, surat jalan, dan konfirmasi penerimaan per batch.`,
        crumbs: ["Persediaan", "Mutasi Antar Cabang"],
        actions: `${btn("Buat Mutasi", "success", { icon: "add", attrs: "data-mut-new" })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Daftar mutasi diekspor ke Excel (.xlsx)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Menunggu persetujuan", value: num(grp.setuju.length), icon: "pending_actions", tone: "primary", foot: "permintaan dari cabang" })}
        ${stat({ label: "Dalam proses kirim", value: num(grp.proses.length), icon: "local_shipping", tone: "info", foot: `${rows.filter((m) => m.status === "Dalam Perjalanan").length} sedang di jalan` })}
        ${stat({ label: "Diterima bulan ini", value: num(rows.filter((m) => m.status === "Diterima").length), icon: "where_to_vote", tone: "success", foot: "rata-rata 1,4 hari" })}
        ${stat({ label: "Nilai mutasi bulan ini", value: short(nilaiBulan), icon: "payments", tone: "teal", foot: `${rows.length} dokumen` })}
      </div>

      ${card({
        title: "Dokumen mutasi", desc: "Alur: Permintaan → Disetujui → Dikirim → Dalam Perjalanan → Diterima", icon: "swap_horiz", flush: true,
        body: `<div style="padding:14px 20px 0">${tabs("mut-tab", [
          { id: "semua", label: "Semua", n: grp.semua.length }, { id: "setuju", label: "Perlu persetujuan", icon: "pending_actions", n: grp.setuju.length },
          { id: "proses", label: "Dalam pengiriman", icon: "local_shipping", n: grp.proses.length }, { id: "selesai", label: "Selesai", icon: "task_alt", n: grp.selesai.length },
        ], "semua")}</div>
        ${Object.keys(grp).map((g) => `<div data-panel-group="mut-tab" data-panel="${g}" style="margin-top:12px" ${g === "semua" ? "" : "hidden"}>${table({ columns: cols, rows: grp[g], empty: "Tidak ada dokumen mutasi" })}</div>`).join("")}`,
      })}

      <div class="grid g-2">
        ${card({
          title: "Rekomendasi mutasi", desc: "Stok berlebih di satu cabang & kurang di cabang lain", icon: "auto_awesome", tone: "purple", flush: true,
          body: `<div class="list">${DB.obat.map((o) => { const lo = CAB.find((c) => o.stok[c] < o.min); const hi = CAB.slice().sort((a, b) => o.stok[b] - o.stok[a])[0]; return lo && o.stok[hi] > o.min * 6 && !khusus(o.golongan) ? { o, lo, hi } : null; }).filter(Boolean).slice(0, 5).map((r) => `
            <div class="list-item"><div class="sq-ico purple">${icon("swap_horiz")}</div><div class="grow"><div class="title small">${esc(r.o.nama)}</div><div class="meta">${r.hi} (${num(r.o.stok[r.hi])}) → ${r.lo} (${num(r.o.stok[r.lo])}) · saran ${num(r.o.min * 2)} ${esc(r.o.satuan)}</div></div>${btn("", "success", { icon: "add", size: "sm", title: "Buat mutasi", attrs: "data-mut-new" })}</div>`).join("")}</div>`,
        })}
        ${card({
          title: "Ketentuan mutasi", icon: "rule", tone: "cyan",
          body: `<div class="stack small">
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${icon("check_circle", "muted")}<span>Batch dikirim mengikuti FEFO dengan ED minimal 3 bulan.</span></div>
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${icon("check_circle", "muted")}<span>Stok asal berkurang saat status <b>Dikirim</b>; stok tujuan bertambah saat <b>Diterima</b>.</span></div>
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${icon("check_circle", "muted")}<span>Selisih terima dicatat sebagai berita acara dan dikembalikan ke cabang asal.</span></div>
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${icon("check_circle", "muted")}<span>Obat rantai dingin dikirim dengan cool box & data logger suhu.</span></div>
          </div>`,
        })}
      </div>`;
    },
    mount(root, { state }) {
      const find = (no) => MUT.find((m) => m.no === no);
      on(root, "[data-mut-new]", "click", () => openMutasiForm(state));
      on(root, "[data-mut]", "click", (el) => openMutasiDetail(find(el.dataset.mut)));
      on(root, "[data-mut-ok]", "click", (el) => confirmBox({ title: "Setujui mutasi?", icon: "check", okLabel: "Setujui", okVariant: "success", msg: `Mutasi <b>${el.dataset.mutOk}</b> akan disetujui dan diteruskan ke gudang cabang asal untuk disiapkan.`, onOk: () => toast(`Mutasi ${el.dataset.mutOk} disetujui`) }));
      on(root, "[data-mut-terima]", "click", (el) => openMutasiDetail(find(el.dataset.mutTerima)));
    },
  };

  /* =====================================================================
     6. KARTU STOK
     ===================================================================== */
  function ledger(o, cab) {
    let s = parseInt(o.kode.slice(2), 10) * 7919 + CAB.indexOf(cab) * 131 + 17;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const ri = (a, b) => Math.floor(a + r() * (b - a + 1));
    const mult = o.min >= 20 ? 1 : 0.25;
    const q = (a, b) => Math.max(1, Math.round(ri(a, b) * mult));
    const good = DB.batches.filter((b) => b.kode === o.kode && b.sisaHari > 30).sort((a, b) => a.sisaHari - b.sisaHari);
    const edB = DB.batches.find((b) => b.kode === o.kode && b.sisaHari < 0);
    const bl = good.length ? good : [{ batch: `${o.pabrik.slice(0, 2).toUpperCase()}${2500 + parseInt(o.kode.slice(2), 10)}A`, ed: dIso(420) }];
    const bNew = { batch: `${o.pabrik.slice(0, 2).toUpperCase()}${2700 + parseInt(o.kode.slice(2), 10)}C`, ed: dIso(640) };
    const other = CAB.filter((c) => c !== cab);
    const sup = DB.supplier[parseInt(o.kode.slice(2), 10) % DB.supplier.length];
    const ev = [];
    let inv = 118;
    const add = (d, ref, ket, b, masuk, keluar, jenis) => ev.push({ d, ref, ket, batch: b.batch, ed: b.ed, masuk, keluar, jenis });
    for (let d = -29; d <= 0; d++) {
      const b = d < -9 ? bl[0] : bNew;
      if (d === -27) add(d, `BPB/${cab}/${YM}/0${31 + d + 60}`, `Penerimaan SP/${cab}/${YM}/0${12} · ${supShort(sup.nama)}`, bl[0], q(60, 120), 0, "in");
      if (d === -9) add(d, `BPB/${cab}/${YM}/0${80}`, `Penerimaan SP/${cab}/${YM}/0${26} · ${supShort(sup.nama)}`, bNew, q(80, 140), 0, "in");
      if (d === -21) add(d, `MUT/${YM}/00${4}`, `Mutasi keluar ke ${cabangNama(other[0])}`, b, 0, q(10, 24), "mut");
      if (d === -12) add(d, `MUT/${YM}/00${6}`, `Mutasi masuk dari ${cabangNama(other[2])}`, b, q(6, 14), 0, "mut");
      if (d === -14) add(d, `RJ/${cab}/${YM}/0007`, `Retur penjualan INV/${cab}/${YM}/0${inv - 30} (salah beli)`, b, q(1, 2), 0, "ret");
      if (d === -6) add(d, `OPN/${cab}/${YM}/003`, "Penyesuaian opname (selisih −1, kemasan rusak)", b, 0, 1, "adj");
      if (d === -4) {
        if (edB) add(d, `BAP/${cab}/${YM}/003`, "Pemusnahan obat kedaluwarsa (berita acara)", edB, 0, q(2, 6), "dst");
        else add(d, `RB/${cab}/${YM}/004`, `Retur ke PBF · ED dekat · ${supShort(sup.nama)}`, bl[0], 0, q(2, 5), "ret");
      }
      if (d % 3 === 0) add(d, `RSP/${cab}/${YM}/00${60 + d + 29}`, `Resep ${DB.dokter[(d + 30) % DB.dokter.length].nama}`, b, 0, q(1, 5), "rsp");
      inv += ri(9, 16);
      add(d, `INV/${cab}/${YM}/0${inv}`, `Penjualan kasir (${ri(3, 11)} transaksi)`, b, 0, q(2, 9), "jual");
    }
    let saldo = o.stok[cab] || 0;
    for (let j = ev.length - 1; j >= 0; j--) {
      const e = ev[j];
      e.masuk = Math.min(e.masuk, saldo);
      e.saldo = saldo;
      saldo = saldo - e.masuk + e.keluar;
    }
    const rows = ev.filter((e) => e.masuk || e.keluar);
    return [{ d: -30, ref: "—", ket: "Saldo awal periode", batch: "", ed: "", masuk: 0, keluar: 0, saldo, jenis: "awal" }, ...rows];
  }
  const JENIS = { awal: ["Saldo", "gray"], in: ["Penerimaan", "green"], jual: ["Penjualan", "blue"], rsp: ["Resep", "purple"], ret: ["Retur", "amber"], mut: ["Mutasi", "cyan"], adj: ["Penyesuaian", "amber"], dst: ["Pemusnahan", "red"] };

  window.PAGES.kartustok = {
    render({ state }) {
      if (KS.base !== state.cabang) { KS.base = state.cabang; KS.cab = null; }
      const cab = KS.cab || (state.cabang === "ALL" ? "PST" : state.cabang);
      const o = byKode(KS.kode) || DB.obat[4];
      const L = ledger(o, cab);
      const awal = L[0].saldo;
      const masuk = L.reduce((s, e) => s + e.masuk, 0);
      const keluar = L.reduce((s, e) => s + e.keluar, 0);
      const akhir = L[L.length - 1].saldo;
      const lbl = (e) => { const d = DB.addDays(e.d); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; };
      return `
      ${UI.pageHeader({
        title: "Kartu Stok",
        sub: "Riwayat keluar-masuk per obat per cabang lengkap dengan batch & ED — dasar audit persediaan dan pelaporan SIPNAP.",
        crumbs: ["Persediaan", "Kartu Stok"],
        actions: `${btn("Cetak", "teal", { icon: "print", attrs: 'data-toast="Kartu stok dikirim ke printer"' })}${btn("Master Obat", "white", { icon: "medication", attrs: 'data-go="obat"' })}`,
      })}

      <section class="card">
        <div class="filterbar" style="border-radius:var(--radius-lg)">
          ${select("Obat", obatOptions(), { value: o.kode, id: "ks-obat" })}
          ${select("Cabang", cabOptions(false), { value: cab, id: "ks-cab" })}
          ${input("Dari tanggal", { type: "date", value: dIso(-30) })}
          ${input("Sampai tanggal", { type: "date", value: dIso(0) })}
          <div class="actions">${btn("Tampilkan", "primary", { icon: "filter_alt", attrs: 'data-toast="Kartu stok ditampilkan"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Kartu stok diekspor ke Excel (.xlsx)"' })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: 'data-toast="Kartu stok diekspor ke PDF"' })}</div>
        </div>
      </section>

      <div class="grid g-2-1">
        ${card({
          title: esc(o.nama), desc: `${esc(o.generik)} · ${esc(o.pabrik)}`, icon: "medication", tone: "blue",
          tools: `${golongan(o.golongan)}${status(isAktif(o) ? "Aktif" : "Nonaktif")}`,
          body: `<div class="grid g-2" style="gap:12px 28px">
            <dl class="kv" style="margin:0"><dt>Kode / barcode</dt><dd class="mono">${o.kode} · ${o.barcode}</dd><dt>Satuan</dt><dd>${esc(satuanIsi(o))}</dd><dt>Kategori</dt><dd>${esc(o.kategori)}</dd><dt>NIE</dt><dd class="mono">${nie(o)}</dd></dl>
            <dl class="kv" style="margin:0"><dt>Cabang</dt><dd>${esc(cabangNama(cab))}</dd><dt>Lokasi rak</dt><dd class="mono">${o.rak}</dd><dt>Stok min / maks</dt><dd>${num(o.min)} / ${num(o.min * 9)}</dd><dt>HPP / ${esc(o.satuan)}</dt><dd>${rp(o.hargaBeli)}</dd></dl>
          </div>`,
        })}
        <div class="grid g-2" style="gap:14px">
          ${stat({ label: "Saldo awal", value: num(awal), icon: "start", tone: "dark", foot: tgl(DB.addDays(-30)) })}
          ${stat({ label: "Total masuk", value: num(masuk), icon: "south_west", tone: "success", foot: "penerimaan, retur, mutasi" })}
          ${stat({ label: "Total keluar", value: num(keluar), icon: "north_east", tone: "danger", foot: "penjualan, resep, dll." })}
          ${stat({ label: "Saldo akhir", value: num(akhir), icon: "inventory_2", tone: "primary", foot: `nilai ${short(akhir * o.hargaBeli)}` })}
        </div>
      </div>

      ${card({
        title: "Pergerakan saldo", desc: `${esc(o.satuan)} · 30 hari terakhir`, icon: "show_chart",
        body: chart("ks-ch-saldo", (k, el) => ({
          type: "line",
          data: { labels: L.map(lbl), datasets: [{ label: "Saldo", data: L.map((e) => e.saldo), borderColor: k.c1, backgroundColor: areaFill(el, k.c1), fill: true, stepped: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 }] },
          options: { interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true, grid: { color: k.grid } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } }, plugins: { tooltip: { callbacks: { label: (c) => ` Saldo: ${num(c.raw)} ${o.satuan}` } } } },
        }), "sm"),
      })}

      ${card({
        title: "Mutasi stok", desc: `${L.length - 1} transaksi · ${esc(cabangNama(cab))}`, icon: "history_edu", flush: true,
        body: table({
          columns: [
            { label: "Tanggal", render: (e) => `<span class="nowrap">${tgl(DB.addDays(e.d))}</span>` },
            { label: "No. referensi", render: (e) => `<span class="mono small">${e.ref}</span>` },
            { label: "Keterangan", render: (e) => `${badge(JENIS[e.jenis][0], JENIS[e.jenis][1])} <span class="small">${esc(e.ket)}</span>` },
            { label: "Batch", render: (e) => (e.batch ? `<span class="mono">${e.batch}</span>` : "") },
            { label: "ED", render: (e) => (e.ed ? `<span class="nowrap small">${tgl(e.ed)}</span>` : "") },
            { label: "Masuk", cls: "num nowrap", render: (e) => (e.masuk ? `<b style="color:var(--t-green-fg)">${num(e.masuk)}</b>` : '<span class="muted">—</span>') },
            { label: "Keluar", cls: "num nowrap", render: (e) => (e.keluar ? `<b style="color:var(--t-red-fg)">${num(e.keluar)}</b>` : '<span class="muted">—</span>') },
            { label: "Saldo", cls: "num nowrap", render: (e) => `<b>${num(e.saldo)}</b>` },
          ],
          rows: L, rowCls: (e) => (e.jenis === "awal" ? "group" : e.jenis === "dst" ? "row-danger" : e.jenis === "adj" ? "row-warn" : ""),
          foot: `<tr><td colspan="5">Jumlah periode ini</td><td class="num nowrap">${num(masuk)}</td><td class="num nowrap">${num(keluar)}</td><td class="num nowrap">${num(akhir)}</td></tr>`,
        }),
      })}`;
    },
    mount(root) {
      on(root, "#ks-obat", "change", (el) => { KS.kode = el.value; window.APP.render(); });
      on(root, "#ks-cab", "change", (el) => { KS.cab = el.value; window.APP.render(); });
    },
  };
})();
