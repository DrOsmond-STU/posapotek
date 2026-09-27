/* Pengaturan: Cabang, Pengguna & Hak Akses, Pengaturan Sistem, Log Aktivitas, Panduan UI */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, short, table, badge, status, chart, esc, progress, tgl, input, select, textarea, modal, alert, tabs, golongan, legend, pct, confirmBox, toast } = UI;

  /* ---------- Helper ---------- */
  const sw = (checked, label, attrs = "") => `<label class="switch"><input type="checkbox" aria-label="${esc(label)}" ${checked ? "checked" : ""} ${attrs}><span></span></label>`;
  const swRow = (title, desc, checked, attrs = "") => `
    <div class="row between" style="padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:nowrap;gap:16px">
      <div style="min-width:0"><div class="strong small">${title}</div>${desc ? `<div class="small muted">${desc}</div>` : ""}</div>
      ${sw(checked, title, attrs)}
    </div>`;
  const inisial = (n) => n.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  const dropZone = (ic, title, sub, attrs = "") => `
    <label class="stack" style="align-items:center;text-align:center;gap:6px;padding:24px 16px;border:2px dashed var(--border-strong);border-radius:var(--radius);background:var(--surface-2);cursor:pointer" ${attrs}>
      <span class="sq-ico blue">${icon(ic)}</span><b class="small">${title}</b><span class="small muted">${sub}</span>
    </label>`;
  const codeBlock = (s) => `<pre class="mono" style="margin:0;padding:12px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);overflow-x:auto;font-size:12px;line-height:1.6">${esc(s)}</pre>`;

  /* =====================================================================
     MANAJEMEN CABANG
     ===================================================================== */
  const CAB_EXT = {
    PST: { alamat: "Jl. RS Fatmawati No. 88, Cilandak", telp: "(021) 750 1234", sia: "SIA 503/0087/DPMPTSP/2023", sipa: "SIPA 449.1/0231/DPMPTSP/2024", gudang: "Gudang induk", online: true, sync: "1 mnt lalu", antrian: 0, harga: "pusat", tpl: "Template Pusat", grad: "--grad-hero" },
    BKS: { alamat: "Ruko Summarecon Blok B-12, Bekasi Utara", telp: "(021) 8899 1200", sia: "SIA 503/0142/DPMPTSP-BKS/2023", sipa: "SIPA 449.1/0512/DPMPTSP-BKS/2023", gudang: "Gudang sendiri", online: true, sync: "2 mnt lalu", antrian: 0, harga: "lokal", tpl: "Apotek 24 Jam", grad: "--grad-primary" },
    DPK: { alamat: "Jl. Margonda Raya No. 330, Beji", telp: "(021) 7720 3311", sia: "SIA 503/0099/DPMPTSP-DPK/2024", sipa: "SIPA 449.1/0377/DPMPTSP-DPK/2024", gudang: "Ikut Gudang Pusat", online: true, sync: "1 mnt lalu", antrian: 0, harga: "pusat", tpl: "Template Pusat", grad: "--grad-sidebar" },
    TGR: { alamat: "Jl. Pahlawan Seribu, Ruko Golden Boulevard C-5, BSD", telp: "(021) 5316 8800", sia: "SIA 503/0211/DPMPTSP-TGS/2023", sipa: "SIPA 449.1/0610/DPMPTSP-TGS/2023", gudang: "Gudang sendiri", online: true, sync: "3 mnt lalu", antrian: 2, harga: "pusat", tpl: "Template Pusat", grad: "--grad-primary" },
    BGR: { alamat: "Jl. Pajajaran No. 57, Bogor Tengah", telp: "(0251) 832 4455", sia: "SIA 503/0064/DPMPTSP-BGR/2024", sipa: "SIPA 449.1/0288/DPMPTSP-BGR/2024", gudang: "Ikut Gudang Pusat", online: false, sync: "14 mnt lalu", antrian: 23, harga: "lokal", tpl: "Apotek Kecil", grad: "--grad-hero" },
  };

  function cabangCard(c) {
    const x = CAB_EXT[c.id];
    const p = (c.omzet / c.target) * 100;
    return `
    <section class="card" style="overflow:hidden;display:flex;flex-direction:column">
      <div style="background:var(${x.grad});color:var(--on-grad);padding:18px 20px">
        <div class="row between" style="align-items:flex-start;flex-wrap:nowrap">
          <div style="min-width:0">
            <span class="mono small" style="padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.2)">${c.id}</span>
            <h3 style="font-size:17px;font-weight:800;margin-top:8px">${esc(c.nama)}</h3>
            <div class="small" style="opacity:.85;margin-top:2px">${icon("location_on", "")} ${esc(x.alamat)}, ${esc(c.kota)}</div>
          </div>
          ${x.online ? badge("Online", "green", { dot: true }) : badge("Sinkron tertunda", "amber", { dot: true })}
        </div>
      </div>
      <div class="card-body stack" style="flex:1">
        <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="avatar sm">${inisial(c.apoteker.replace("apt. ", ""))}</div>
          <div style="min-width:0"><div class="strong small">${esc(c.apoteker)}</div><div class="small muted mono">${esc(x.sipa)}</div></div></div>
        <dl class="kv">
          <dt>Jam operasional</dt><dd>${esc(c.jam)}</dd>
          <dt>Karyawan</dt><dd>${c.karyawan} orang</dd>
          <dt>Transaksi bulan ini</dt><dd>${num(c.trx)}</dd>
          <dt>Mode harga</dt><dd>${x.harga === "pusat" ? badge("Ikut pusat", "blue") : badge("Harga lokal", "purple")}</dd>
        </dl>
        <div class="stack" style="gap:6px">
          <div class="row between small"><span class="muted">Omzet vs target</span><b class="num">${short(c.omzet)} · ${pct(p)}</b></div>
          ${progress(c.omzet, c.target, p >= 100 ? "green" : p >= 90 ? "" : "amber")}
        </div>
        <div class="small muted row" style="gap:6px">${icon(x.online ? "cloud_done" : "cloud_sync")}Sinkron terakhir ${esc(x.sync)}${x.antrian ? ` · ${x.antrian} data antre` : ""}</div>
      </div>
      <div class="card-foot">
        ${btn("Pengaturan", "warning", { icon: "tune", size: "sm", attrs: `data-cab-set="${c.id}"` })}
        ${btn("Laporan", "info", { icon: "monitoring", size: "sm", attrs: 'data-go="lap-cabang"' })}
        ${btn("", "teal", { icon: "sync", size: "sm", title: "Sinkron sekarang", attrs: `data-toast="Sinkronisasi ${esc(c.nama)} dimulai"` })}
      </div>
    </section>`;
  }

  function cabangSettings(id) {
    const c = DB.cabang.find((x) => x.id === id);
    const x = CAB_EXT[id];
    const el = modal.open({
      title: `Pengaturan · ${esc(c.nama)}`, icon: "tune", size: "lg",
      body: `
        <div class="grid g-2" style="gap:14px">
          ${card({ title: "Harga jual", icon: "sell", tone: "pink", body: `
            ${swRow("Harga ikut pusat", "Harga jual, harga resep & harga member mengikuti master pusat", x.harga === "pusat", 'id="cs-pusat"')}
            <div id="cs-lokal" class="stack" style="padding-top:12px" ${x.harga === "pusat" ? "hidden" : ""}>
              ${alert("info", "info", "Harga lokal aktif", "Perubahan harga di cabang ini tidak ditimpa sinkronisasi pusat.")}
              <div class="form-grid">
                ${input("Markup lokal (%)", { type: "number", value: 5, hint: "Ditambahkan di atas harga pusat" })}
                ${select("Pembulatan", ["Rp 100", "Rp 500", "Rp 1.000"], { value: "Rp 500" })}
              </div>
            </div>` })}
          ${card({ title: "Stok minimum", icon: "inventory", tone: "amber", body: `<div class="stack">
            ${select("Template stok minimum", ["Template Pusat", "Apotek Kecil", "Apotek 24 Jam", "Apotek Rujukan BPJS PRB"], { value: x.tpl, hint: "Menentukan stok minimum & maksimum per item" })}
            ${input("Cakupan stok (hari)", { type: "number", value: 14 })}
            ${swRow("Draft SP otomatis", "Buat draft Surat Pesanan saat stok di bawah minimum", true)}
          </div>` })}
        </div>
        ${card({ title: "Operasional", icon: "schedule", body: `
          <div class="form-grid cols-3">
            ${input("Jam buka", { type: "time", value: "07:00" })}
            ${input("Jam tutup", { type: "time", value: "23:00" })}
            ${select("Gudang", ["Gudang induk", "Gudang sendiri", "Ikut Gudang Pusat"], { value: x.gudang })}
          </div>
          ${swRow("Buka 24 jam", "Shift malam aktif, laporan tutup kas pukul 07.00", c.jam === "24 jam")}
          ${swRow("Mutasi keluar tanpa persetujuan pusat", "Maksimal nilai Rp 5.000.000 per mutasi", false)}
          ${swRow("Terima pesanan resep online", "Dari WhatsApp & marketplace", true)}` })}`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Pengaturan", "primary", { icon: "save", attrs: `data-close data-toast="Pengaturan ${esc(c.nama)} disimpan"` })}`,
    });
    el.querySelector("#cs-pusat")?.addEventListener("change", (e) => { el.querySelector("#cs-lokal").hidden = e.target.checked; });
  }

  function formCabang() {
    return `<div class="form-grid cols-3">
      ${input("Nama cabang *", { ph: "mis. Cabang Cibubur Transyogi", cls: "full" })}
      ${input("Kode cabang *", { ph: "3 huruf, mis. CBB", attrs: 'maxlength="3" style="text-transform:uppercase"', hint: "Dipakai di nomor invoice & SP" })}
      ${input("Kota / kabupaten *", { ph: "mis. Kota Bekasi" })}
      ${input("No. telepon", { ph: "(021) ...", icon: "call" })}
      ${textarea("Alamat lengkap *", { cls: "full", ph: "Jalan, nomor, kelurahan, kecamatan" })}
      ${input("No. SIA *", { ph: "SIA 503/xxxx/DPMPTSP/2026", hint: "Surat Izin Apotek" })}
      ${input("Apoteker PJ *", { ph: "apt. Nama, S.Farm." })}
      ${input("No. SIPA *", { ph: "SIPA 449.1/xxxx/DPMPTSP/2026" })}
      ${input("Jam buka", { type: "time", value: "07:00" })}
      ${input("Jam tutup", { type: "time", value: "22:00" })}
      ${select("Gudang", ["Ikut Gudang Pusat", "Gudang sendiri"])}
      ${input("Target omzet bulanan", { type: "number", ph: "0", hint: "Dalam rupiah" })}
      ${select("Template stok minimum", ["Template Pusat", "Apotek Kecil", "Apotek 24 Jam", "Apotek Rujukan BPJS PRB"])}
      ${select("Mode harga", ["Ikut pusat", "Harga lokal"])}
    </div>
    <label class="check"><input type="checkbox" checked>Salin master obat, supplier & dokter dari Cabang Pusat</label>`;
  }

  window.PAGES.cabang = {
    render() {
      const tot = (k) => DB.cabang.reduce((s, c) => s + c[k], 0);
      const online = DB.cabang.filter((c) => CAB_EXT[c.id].online).length;
      return `
      ${UI.pageHeader({
        title: "Manajemen Cabang",
        sub: "Kelola cabang apotek, izin (SIA/SIPA), apoteker penanggung jawab, jam operasional, dan sinkronisasi data ke pusat.",
        crumbs: ["Pengaturan", "Manajemen Cabang"],
        actions: `${btn("Tambah Cabang", "success", { icon: "add_business", attrs: 'data-cab-add' })}${btn("Sinkron Semua", "teal", { icon: "sync", attrs: 'data-toast="Sinkronisasi 5 cabang dimulai"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Cabang aktif", value: DB.cabang.length, icon: "storefront", tone: "primary", hero: true, foot: "1 pusat · 4 cabang" })}
        ${stat({ label: "Total karyawan", value: tot("karyawan"), icon: "badge", tone: "purple", foot: `${DB.cabang.length} apoteker PJ` })}
        ${stat({ label: "Omzet bulan berjalan", value: short(tot("omzet")), icon: "payments", tone: "success", delta: 5.3, foot: `target ${short(tot("target"))}` })}
        ${stat({ label: "Status sinkron", value: `${online}/${DB.cabang.length} online`, icon: "cloud_sync", tone: online === DB.cabang.length ? "teal" : "warning", foot: "25 data menunggu unggah" })}
      </div>

      <div class="grid g-3">
        ${DB.cabang.map(cabangCard).join("")}
        <button type="button" class="card" data-cab-add style="border:2px dashed var(--border-strong);box-shadow:none;background:var(--surface-2);cursor:pointer;min-height:260px;display:grid;place-items:center;color:var(--text-2)">
          <span class="stack" style="align-items:center;gap:8px"><span class="sq-ico green" style="width:52px;height:52px;border-radius:16px">${icon("add_business")}</span><b>Tambah cabang baru</b><span class="small muted">Izin SIA & SIPA wajib dilengkapi</span></span>
        </button>
      </div>

      ${card({
        title: "Sinkronisasi & kebijakan cabang", desc: "Ringkasan mode harga, template stok, dan antrian data per cabang", icon: "hub", flush: true,
        tools: btn("Export Excel", "teal", { size: "sm", icon: "table_view", attrs: 'data-toast="Ringkasan cabang diekspor ke Excel (.xlsx)"' }),
        body: table({
          columns: [
            { label: "Cabang", render: (c) => `<div class="t-main">${esc(c.nama)}</div><div class="t-sub mono">${esc(CAB_EXT[c.id].sia)}</div>` },
            { label: "Apoteker PJ", render: (c) => esc(c.apoteker) },
            { label: "Mode harga", render: (c) => (CAB_EXT[c.id].harga === "pusat" ? badge("Ikut pusat", "blue") : badge("Harga lokal", "purple")) },
            { label: "Template stok", render: (c) => esc(CAB_EXT[c.id].tpl) },
            { label: "Gudang", render: (c) => esc(CAB_EXT[c.id].gudang) },
            { label: "Sinkron terakhir", render: (c) => `${esc(CAB_EXT[c.id].sync)}${CAB_EXT[c.id].antrian ? `<div class="t-sub">${CAB_EXT[c.id].antrian} data antre</div>` : ""}` },
            { label: "Status", render: (c) => (CAB_EXT[c.id].online ? badge("Online", "green", { dot: true }) : badge("Tertunda", "amber", { dot: true })) },
            { label: "", cls: "actions", render: (c) => `<div class="btn-group" style="flex-wrap:nowrap">${btn("", "warning", { icon: "tune", size: "sm", title: "Pengaturan", attrs: `data-cab-set="${c.id}"` })}${btn("", "teal", { icon: "sync", size: "sm", title: "Sinkron", attrs: `data-toast="Sinkronisasi ${esc(c.nama)} dimulai"` })}</div>` },
          ],
          rows: DB.cabang,
        }),
      })}`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        const s = e.target.closest("[data-cab-set]");
        if (s) return cabangSettings(s.dataset.cabSet);
        if (e.target.closest("[data-cab-add]")) {
          modal.open({
            title: "Tambah Cabang", icon: "add_business", size: "lg", body: formCabang(),
            foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Cabang", "success", { icon: "save", attrs: 'data-close data-toast="Cabang baru disimpan. Menunggu verifikasi dokumen SIA."' })}`,
          });
        }
      });
    },
  };

  /* =====================================================================
     PENGGUNA & HAK AKSES
     ===================================================================== */
  const ROLES = ["Owner", "Apoteker PJ", "TTK", "Kasir", "Admin Gudang", "Keuangan"];
  const ROLE_INFO = {
    Owner: ["workspace_premium", "amber", "Akses penuh seluruh cabang, laporan konsolidasi & persetujuan akhir"],
    "Apoteker PJ": ["medication", "blue", "Penanggung jawab farmasi: resep, obat keras, narkotika/psikotropika, SP khusus"],
    TTK: ["science", "purple", "Tenaga Teknis Kefarmasian: menyiapkan resep & racikan, pelayanan obat"],
    Kasir: ["point_of_sale", "green", "Transaksi penjualan, pembayaran, dan tutup shift kas"],
    "Admin Gudang": ["warehouse", "cyan", "Penerimaan barang, mutasi, opname & pengelolaan ED"],
    Keuangan: ["account_balance", "teal", "Hutang supplier, piutang, rekonsiliasi kas & laporan keuangan"],
  };
  const PERMS = [["L", "Lihat", "cyan"], ["T", "Tambah", "green"], ["U", "Ubah", "amber"], ["H", "Hapus", "red"], ["S", "Setujui", "blue"]];
  const MATRIX = [
    ["Kasir", "LS", "LTUHS", "LTU", "LT", "", "L"],
    ["Resep", "L", "LTUHS", "LTU", "L", "", ""],
    ["Racikan", "L", "LTUHS", "LTU", "", "", ""],
    ["Master Obat", "LTUHS", "LTUH", "L", "L", "LTU", "L"],
    ["Stok", "L", "LTUS", "LU", "L", "LTU", "L"],
    ["Kedaluwarsa", "LS", "LTUHS", "LT", "", "LTU", "L"],
    ["Opname", "LS", "LTUS", "LTU", "", "LTU", "L"],
    ["Mutasi", "LS", "LTUS", "LT", "", "LTU", ""],
    ["Pembelian/SP", "LS", "LTUHS", "LT", "", "LTU", "L"],
    ["Hutang", "LS", "L", "", "", "", "LTUHS"],
    ["Laporan Penjualan", "L", "L", "", "", "", "L"],
    ["Laporan Konsolidasi", "L", "", "", "", "", "L"],
    ["Pengaturan", "LTUHS", "LU", "", "", "", ""],
  ];
  const USER_EXT = { U01: "2FA", U04: "2FA", U06: "2FA", U07: "2FA" };
  const roleKey = (r) => (r.startsWith("TTK") ? "TTK" : r);

  const permCell = (s) => (s ? `<div class="row" style="gap:3px;flex-wrap:nowrap;justify-content:center">${PERMS.filter(([k]) => s.includes(k)).map(([k, l, t]) => `<span class="badge ${t}" title="${l}" style="padding:2px 7px">${k}</span>`).join("")}</div>` : '<div class="center muted">—</div>');

  const editorRows = (ri) => MATRIX.map((m) => `<tr><td class="t-main">${m[0]}</td>${PERMS.map(([k, l]) => `<td class="center"><label class="check" style="justify-content:center"><input type="checkbox" aria-label="${l} ${m[0]}" ${m[ri + 1].includes(k) ? "checked" : ""}></label></td>`).join("")}</tr>`).join("");

  function formUser() {
    return `<div class="form-grid">
      ${input("Nama lengkap *", { ph: "Sesuai KTP" })}
      ${input("Username *", { ph: "mis. fikri.r", icon: "alternate_email" })}
      ${input("Email *", { type: "email", ph: "nama@sehatbersama.id", icon: "mail" })}
      ${input("No. HP", { ph: "08xx-xxxx-xxxx", icon: "call" })}
      ${select("Peran *", ROLES, { value: "Kasir" })}
      ${select("Cabang *", [{ v: "ALL", l: "Semua cabang" }, ...DB.cabang.map((c) => ({ v: c.id, l: c.nama }))], { value: "PST" })}
      ${input("Kata sandi *", { type: "password", ph: "Minimal 8 karakter", icon: "lock" })}
      ${input("Konfirmasi kata sandi *", { type: "password", ph: "Ulangi kata sandi", icon: "lock" })}
      ${input("PIN supervisor", { type: "password", ph: "6 digit", icon: "pin", attrs: 'inputmode="numeric" maxlength="6"', hint: "Untuk otorisasi void, retur, diskon di atas batas, dan buka laci kas", cls: "full" })}
      ${input("No. STR / SIPA (khusus Apoteker/TTK)", { ph: "Opsional", cls: "full" })}
    </div>
    ${swRow("Wajib ganti kata sandi saat login pertama", "", true)}
    ${swRow("Aktifkan verifikasi 2 langkah (OTP WhatsApp)", "Disarankan untuk Owner, Apoteker PJ, dan Keuangan", false)}`;
  }

  window.PAGES.pengguna = {
    render() {
      const aktif = DB.users.filter((u) => u.status === "Aktif").length;
      return `
      ${UI.pageHeader({
        title: "Pengguna & Hak Akses",
        sub: "Kelola akun karyawan, peran, dan matriks hak akses per modul. Aksi sensitif memerlukan PIN supervisor.",
        crumbs: ["Pengaturan", "Pengguna & Hak Akses"],
        actions: `${btn("Tambah Pengguna", "success", { icon: "person_add", attrs: 'id="us-add"' })}${btn("Riwayat Akses", "glass", { icon: "history", attrs: 'data-go="audit"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Pengguna aktif", value: aktif, icon: "group", tone: "primary", hero: true, foot: `dari ${DB.users.length} akun terdaftar` })}
        ${stat({ label: "Peran", value: ROLES.length, icon: "admin_panel_settings", tone: "purple", foot: `${MATRIX.length} modul diatur` })}
        ${stat({ label: "Login hari ini", value: DB.users.filter((u) => u.login.startsWith("Hari ini")).length, icon: "login", tone: "success", foot: "terakhir 09.12" })}
        ${stat({ label: "Verifikasi 2 langkah", value: `${Object.keys(USER_EXT).length} akun`, icon: "verified_user", tone: "teal", foot: `${pct((Object.keys(USER_EXT).length / DB.users.length) * 100, 0)} pengguna` })}
      </div>

      ${tabs("us-tab", [{ id: "user", label: "Pengguna", icon: "group", n: DB.users.length }, { id: "role", label: "Peran & Hak Akses", icon: "admin_panel_settings", n: ROLES.length }], "user")}

      <div data-panel-group="us-tab" data-panel="user">
        <div class="grid g-2-1">
          ${card({
            title: "Daftar pengguna", desc: "Akun karyawan seluruh cabang", icon: "group", flush: true,
            tools: `<div class="input-icon" style="min-width:200px">${icon("search")}<input class="input sm" id="us-search" type="search" placeholder="Cari nama / email" aria-label="Cari pengguna"></div>`,
            body: table({
              rowCls: () => "us-row",
              columns: [
                { label: "Pengguna", render: (u) => `<div class="row" style="gap:10px;flex-wrap:nowrap"><div class="avatar sm">${inisial(u.nama)}</div><div><div class="t-main nowrap">${esc(u.nama)}</div><div class="t-sub">${esc(u.email)}</div></div></div>` },
                { label: "Peran", render: (u) => { const r = ROLE_INFO[roleKey(u.role)]; return badge(esc(u.role), r ? r[1] : "gray", { icon: r ? r[0] : "" }); } },
                { label: "Cabang", render: (u) => `<span class="nowrap">${u.cabang === "Semua" ? "Semua cabang" : esc(UI.cabangNama(u.cabang).replace("Cabang ", ""))}</span>` },
                { label: "Keamanan", render: (u) => (USER_EXT[u.id] ? badge("2FA", "teal", { icon: "verified_user" }) : badge("Sandi saja", "gray")) },
                { label: "Login terakhir", render: (u) => `<span class="nowrap">${esc(u.login)}</span>` },
                { label: "Status", render: (u) => status(u.status) },
                { label: "", cls: "actions", render: (u) => `<div class="btn-group" style="flex-wrap:nowrap">
                  ${btn("", "warning", { icon: "edit", size: "sm", title: "Ubah", attrs: `data-toast="Ubah akun · ${esc(u.nama)}" data-tone="info"` })}
                  ${btn("", "primary", { icon: "lock_reset", size: "sm", title: "Reset kata sandi", attrs: `data-u-reset="${esc(u.nama)}|${esc(u.email)}"` })}
                  ${u.status === "Aktif"
                    ? btn("", "danger", { icon: "block", size: "sm", title: "Nonaktifkan", attrs: `data-u-off="${esc(u.nama)}"` })
                    : btn("", "success", { icon: "check_circle", size: "sm", title: "Aktifkan", attrs: `data-toast="Akun ${esc(u.nama)} diaktifkan kembali"` })}
                </div>` },
              ],
              rows: DB.users,
            }),
          })}
          ${card({
            title: "Kebijakan keamanan", desc: "Berlaku untuk semua pengguna", icon: "shield_lock", tone: "red",
            body: `
              ${swRow("Kata sandi minimal 8 karakter", "Kombinasi huruf & angka", true)}
              ${swRow("Kedaluwarsa kata sandi 90 hari", "Pengguna diminta mengganti berkala", true)}
              ${swRow("Kunci layar otomatis", "Setelah 15 menit tidak aktif", true)}
              ${swRow("PIN supervisor untuk void & retur", "Wajib Apoteker PJ / Owner", true)}
              ${swRow("PIN untuk diskon di atas batas kasir", "Batas diatur di Pengaturan Sistem", true)}
              ${swRow("Batasi login per perangkat terdaftar", "Hanya PC kasir & tablet yang disetujui", false)}`,
            foot: btn("Simpan Kebijakan", "primary", { icon: "save", size: "sm", attrs: 'data-toast="Kebijakan keamanan disimpan"' }),
          })}
        </div>
      </div>

      <div data-panel-group="us-tab" data-panel="role" hidden>
        <div class="stack" style="gap:20px">
          <div class="grid g-3">
            ${ROLES.map((r) => { const [ic, t, d] = ROLE_INFO[r]; const n = DB.users.filter((u) => roleKey(u.role) === r).length; return `
              <div class="card"><div class="card-body row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">
                <div class="sq-ico ${t === "gray" ? "blue" : t}">${icon(ic)}</div>
                <div style="min-width:0;flex:1"><div class="row between"><b>${r}</b>${badge(`${n} pengguna`, "gray")}</div><div class="small muted" style="margin-top:4px">${d}</div></div>
              </div></div>`; }).join("")}
          </div>
          ${card({
            title: "Matriks hak akses", desc: "Baris = modul, kolom = peran", icon: "grid_on", flush: true,
            tools: legend(PERMS.map(([k, l, t]) => [`${k} = ${l}`, `var(--t-${t}-fg)`])),
            body: table({
              cls: "compact",
              columns: [{ label: "Modul", render: (m) => `<span class="t-main nowrap">${m[0]}</span>` }, ...ROLES.map((r, i) => ({ label: r, cls: "center", render: (m) => permCell(m[i + 1]) }))],
              rows: MATRIX,
            }),
          })}
          ${card({
            title: "Ubah hak akses peran", desc: "Centang izin per modul untuk peran terpilih", icon: "edit_note", tone: "amber", flush: true,
            tools: `<select class="select sm" id="role-edit" aria-label="Pilih peran" style="width:auto">${ROLES.map((r, i) => `<option value="${i}" ${i === 3 ? "selected" : ""}>${r}</option>`).join("")}</select>`,
            body: `<div class="table-wrap"><table class="tbl compact"><thead><tr><th>Modul</th>${PERMS.map(([, l]) => `<th class="center">${l}</th>`).join("")}</tr></thead><tbody id="role-edit-body">${editorRows(3)}</tbody></table></div>`,
            foot: `${btn("Kembalikan Default", "dark", { icon: "restart_alt", size: "sm", attrs: 'data-toast="Hak akses dikembalikan ke default" data-tone="info"' })}<span class="spacer"></span>${btn("Simpan Hak Akses", "primary", { icon: "save", size: "sm", attrs: 'id="role-save"' })}`,
          })}
        </div>
      </div>`;
    },
    mount(root) {
      const sel = root.querySelector("#role-edit");
      sel?.addEventListener("change", () => { root.querySelector("#role-edit-body").innerHTML = editorRows(Number(sel.value)); });
      root.querySelector("#role-save")?.addEventListener("click", () => toast(`Hak akses peran ${ROLES[Number(sel.value)]} disimpan`));
      const rows = [...root.querySelectorAll("tr.us-row")];
      root.querySelector("#us-search")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        rows.forEach((r) => { r.hidden = q && !r.textContent.toLowerCase().includes(q); });
      });
      root.querySelector("#us-add")?.addEventListener("click", () => modal.open({
        title: "Tambah Pengguna", icon: "person_add", size: "lg", body: formUser(),
        foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Pengguna", "success", { icon: "save", attrs: 'data-close data-toast="Pengguna baru dibuat. Undangan dikirim ke email."' })}`,
      }));
      root.addEventListener("click", (e) => {
        const rs = e.target.closest("[data-u-reset]");
        if (rs) {
          const [nama, email] = rs.dataset.uReset.split("|");
          confirmBox({ title: "Reset kata sandi", icon: "lock_reset", okLabel: "Kirim tautan reset", okVariant: "primary", msg: `Tautan reset kata sandi akan dikirim ke <b>${esc(email)}</b>. Sesi aktif <b>${esc(nama)}</b> akan diakhiri.`, onOk: () => toast(`Tautan reset dikirim ke ${email}`) });
        }
        const off = e.target.closest("[data-u-off]");
        if (off) confirmBox({ title: "Nonaktifkan pengguna", icon: "block", okLabel: "Nonaktifkan", msg: `Akun <b>${esc(off.dataset.uOff)}</b> tidak dapat login sampai diaktifkan kembali. Riwayat transaksi tetap tersimpan.`, onOk: () => toast(`Akun ${off.dataset.uOff} dinonaktifkan`, "warn") });
      });
    },
  };

  /* =====================================================================
     PENGATURAN SISTEM
     ===================================================================== */
  const PAY = [
    ["Tunai", "payments", "green", true, "Akun kas: Kas Kasir per shift"],
    ["QRIS", "qr_code_2", "blue", true, "MDR 0,3% · NMID ID1024xxxxxx"],
    ["Kartu Debit", "credit_card", "cyan", true, "EDC BCA & Mandiri · MDR 0,15%"],
    ["Kartu Kredit", "credit_score", "purple", true, "EDC BCA · MDR 1,8%"],
    ["Transfer Bank", "account_balance", "teal", true, "BCA 5270 xxxx, Mandiri 1270 xxxx"],
    ["Tempo / Piutang", "schedule", "amber", true, "Khusus pelanggan B2B (klinik), maks. 30 hari"],
    ["BPJS Kesehatan (PRB)", "verified", "green", true, "Klaim ke BPJS via aplikasi Apotek PRB"],
    ["E-wallet (GoPay, OVO, DANA)", "account_balance_wallet", "blue", false, "Melalui QRIS dinamis"],
  ];
  const INTEG = [
    ["SATUSEHAT Kemenkes", "health_and_safety", "Kirim data dispensing & resep ke platform SATUSEHAT", "Terhubung", "5 mnt lalu"],
    ["BPJS Kesehatan PRB", "verified", "Verifikasi SEP & klaim obat Program Rujuk Balik", "Terhubung", "12 mnt lalu"],
    ["SIPNAP", "shield", "Pelaporan narkotika & psikotropika bulanan", "Perlu tindakan", "Laporan Agu belum dikirim"],
    ["e-Faktur / Coretax DJP", "receipt", "Faktur pajak keluaran & PPN 11%", "Terhubung", "Kemarin 23.00"],
    ["WhatsApp Gateway", "chat", "Struk digital, pengingat refill & notifikasi", "Terhubung", "Real-time"],
    ["Marketplace", "storefront", "Sinkron stok & pesanan Tokopedia, Shopee, GrabMart", "Belum terhubung", "-"],
  ];
  const INTEG_TONE = { Terhubung: "green", "Perlu tindakan": "amber", "Belum terhubung": "gray" };

  function receiptPreview() {
    const a = DB.apotek;
    return `<div class="receipt" id="rcp-prev" style="max-width:300px;transition:max-width .2s">
      <div class="c" data-rcp="logo"><b style="font-size:13px">${esc(a.nama.toUpperCase())}</b></div>
      <div class="c" id="rcp-head-out">Cabang Pusat Fatmawati<br>${esc(a.alamat)}<br>Telp ${esc(a.telp)}</div>
      <div class="c" data-rcp="npwp">NPWP ${esc(a.npwp)}</div><hr>
      <div class="r"><span>INV/PST/2609/0412</span></div>
      <div class="r"><span>${tgl(DB.TODAY)} 10:42</span><span>Kasir: Fikri</span></div><hr>
      <div>Amlodipine 10 mg</div><div class="r"><span>3 Strip x 8.500</span><span>25.500</span></div>
      <div>Paracetamol 500 mg</div><div class="r"><span>2 Strip x 5.500</span><span>11.000</span></div>
      <div>Vitamin C 1000 mg</div><div class="r"><span>1 Tube x 45.000</span><span>45.000</span></div><hr>
      <div class="r"><span>Subtotal</span><span>81.500</span></div>
      <div class="r"><span>Pembulatan</span><span>0</span></div>
      <div class="r"><b>TOTAL</b><b>81.500</b></div>
      <div class="r"><span>QRIS</span><span>81.500</span></div>
      <div class="r" data-rcp="ppn"><span>DPP / PPN 11%</span><span>73.423 / 8.077</span></div><hr>
      <div class="c" data-rcp="apt">Apoteker: ${esc(a.apotekerPJ)}<br>${esc(a.sipa)}</div>
      <div class="c" id="rcp-foot-out">Terima kasih. Semoga lekas sembuh.<br>Obat yang sudah dibeli tidak dapat dikembalikan.</div>
    </div>`;
  }

  window.PAGES.pengaturan = {
    render() {
      const a = DB.apotek;
      return `
      ${UI.pageHeader({
        title: "Pengaturan Sistem",
        sub: "Profil apotek, kebijakan harga & transaksi, struk, metode pembayaran, integrasi pemerintah, notifikasi, dan backup data.",
        crumbs: ["Pengaturan", "Pengaturan Sistem"],
        actions: `${btn("Simpan Perubahan", "white", { icon: "save", attrs: 'data-toast="Pengaturan sistem disimpan"' })}${btn("Kembalikan Default", "glass", { icon: "restart_alt", attrs: 'id="set-reset"' })}`,
      })}

      ${tabs("set-tab", [
        { id: "profil", label: "Profil Apotek", icon: "local_pharmacy" },
        { id: "harga", label: "Transaksi & Harga", icon: "sell" },
        { id: "struk", label: "Struk & Printer", icon: "print" },
        { id: "bayar", label: "Pembayaran", icon: "payments" },
        { id: "integrasi", label: "Integrasi", icon: "hub", n: INTEG.length },
        { id: "notif", label: "Notifikasi", icon: "notifications" },
        { id: "backup", label: "Backup & Data", icon: "backup" },
      ], "profil")}

      <!-- Profil -->
      <div data-panel-group="set-tab" data-panel="profil">
        <div class="grid g-1-2">
          ${card({ title: "Logo apotek", desc: "Tampil di struk, etiket & laporan", icon: "image", body: `
            <div class="stack" style="align-items:center">
              <div id="logo-prev" class="brand-logo" style="width:96px;height:96px;border-radius:24px;overflow:hidden">${icon("local_pharmacy", "fill")}</div>
              ${dropZone("upload", "Unggah logo", "PNG/SVG, persegi, maks. 1 MB", 'for="logo-file"')}
              <input type="file" id="logo-file" accept="image/*" hidden>
            </div>` })}
          ${card({ title: "Identitas apotek", desc: "Sesuai dokumen perizinan", icon: "local_pharmacy", body: `
            <div class="form-grid">
              ${input("Nama apotek *", { value: a.nama })}
              ${input("Badan usaha", { value: a.badanUsaha })}
              ${input("NPWP", { value: a.npwp, hint: "Dipakai untuk e-Faktur" })}
              ${input("No. SIA", { value: a.sia })}
              ${input("Apoteker penanggung jawab", { value: a.apotekerPJ })}
              ${input("No. SIPA", { value: a.sipa })}
              ${input("Telepon", { value: a.telp, icon: "call" })}
              ${input("Email", { value: "admin@sehatbersama.id", icon: "mail" })}
              ${textarea("Alamat", { value: a.alamat, cls: "full" })}
            </div>` })}
        </div>
      </div>

      <!-- Transaksi & Harga -->
      <div data-panel-group="set-tab" data-panel="harga" hidden>
        <div class="grid g-2">
          ${card({ title: "Harga & pajak", icon: "sell", tone: "pink", body: `
            <div class="form-grid">
              ${select("Pembulatan harga", ["Tidak dibulatkan", "Ke atas Rp 100", "Ke atas Rp 500", "Ke atas Rp 1.000", "Terdekat Rp 100"], { value: "Ke atas Rp 100" })}
              ${select("PPN 11%", ["Termasuk dalam harga jual", "Ditambahkan saat transaksi", "Tidak dikenakan (non-PKP)"])}
              ${input("Margin default obat bebas (%)", { type: "number", value: 25 })}
              ${input("Margin default obat resep (%)", { type: "number", value: 30 })}
              ${input("Tuslah default (Rp)", { type: "number", value: 3000, hint: "Per lembar resep" })}
              ${input("Embalase default (Rp)", { type: "number", value: 1500, hint: "Per item wadah/kemasan" })}
              ${input("Jasa racik per bungkus (Rp)", { type: "number", value: 1000, hint: "Puyer / kapsul racikan" })}
              ${input("Diskon maksimum kasir (%)", { type: "number", value: 10, hint: "Di atas batas ini butuh PIN supervisor" })}
            </div>
            <div class="divider" style="margin:16px 0"></div>
            <div class="lbl-sm" style="margin-bottom:8px">Simulasi harga resep</div>
            <dl class="kv">
              <dt>HNA</dt><dd>${rp(10000)}</dd><dt>HNA + PPN 11%</dt><dd>${rp(11100)}</dd>
              <dt>Margin resep 30%</dt><dd>${rp(14430)}</dd><dt>Setelah pembulatan</dt><dd class="strong">${rp(14500)}</dd>
            </dl>` })}
          ${card({ title: "Kebijakan transaksi & stok", icon: "rule", tone: "amber", body: `
            ${swRow("Metode FEFO (First Expired First Out)", "Batch dengan ED terdekat otomatis dikeluarkan lebih dulu", true)}
            ${swRow("Izinkan stok minus", "Transaksi tetap bisa diproses meski stok sistem 0 (tidak disarankan)", false)}
            ${swRow("Wajib pilih dokter untuk obat keras", "Obat keras tanpa resep hanya untuk daftar OWA", true)}
            ${swRow("Blokir obat yang sudah kedaluwarsa", "Batch ED lewat tidak bisa dijual", true)}
            ${swRow("Peringatan alergi pasien di kasir", "Mencocokkan zat aktif dengan data alergi pasien", true)}
            ${swRow("Batasi pembelian OOT & prekursor", "Maks. 1 strip per transaksi tanpa resep", true)}
            ${swRow("Tampilkan HPP di layar kasir", "Hanya untuk peran Owner & Apoteker PJ", false)}` })}
        </div>
      </div>

      <!-- Struk & Printer -->
      <div data-panel-group="set-tab" data-panel="struk" hidden>
        <div class="grid g-3-2">
          ${card({ title: "Pengaturan struk", icon: "receipt_long", tone: "teal", body: `
            <div class="form-grid">
              ${select("Printer struk", ["EPSON TM-T82X (USB)", "Xprinter XP-58IIH (Bluetooth)", "Printer jaringan 192.168.10.50"])}
              ${select("Lebar kertas thermal", [{ v: "80", l: "80 mm (48 karakter)" }, { v: "58", l: "58 mm (32 karakter)" }], { id: "rcp-width", value: "80" })}
              ${select("Printer etiket", ["Zebra ZD220 (label 50 x 30 mm)", "Printer struk yang sama"])}
              ${input("Jumlah salinan", { type: "number", value: 1 })}
              <div class="field full"><label for="rcp-head">Teks header</label><textarea id="rcp-head" class="textarea">Cabang Pusat Fatmawati\n${esc(a.alamat)}\nTelp ${esc(a.telp)}</textarea></div>
              <div class="field full"><label for="rcp-foot">Teks footer</label><textarea id="rcp-foot" class="textarea">Terima kasih. Semoga lekas sembuh.\nObat yang sudah dibeli tidak dapat dikembalikan.</textarea></div>
            </div>
            <div style="margin-top:8px">
              ${swRow("Tampilkan nama apotek (logo teks)", "", true, 'data-rcp-toggle="logo"')}
              ${swRow("Tampilkan NPWP", "", true, 'data-rcp-toggle="npwp"')}
              ${swRow("Tampilkan rincian DPP / PPN", "", true, 'data-rcp-toggle="ppn"')}
              ${swRow("Tampilkan nama apoteker & SIPA", "", true, 'data-rcp-toggle="apt"')}
              ${swRow("Cetak otomatis setelah pembayaran", "", true)}
            </div>`,
            foot: `${btn("Tes Cetak", "teal", { icon: "print", size: "sm", attrs: 'data-toast="Halaman uji dikirim ke printer"' })}${btn("Simpan", "primary", { icon: "save", size: "sm", attrs: 'data-toast="Pengaturan struk disimpan"' })}` })}
          ${card({ title: "Pratinjau struk", desc: "Berubah langsung sesuai pengaturan", icon: "visibility", tone: "cyan", body: `<div style="padding:8px 0">${receiptPreview()}</div>` })}
        </div>
      </div>

      <!-- Pembayaran -->
      <div data-panel-group="set-tab" data-panel="bayar" hidden>
        <div class="grid g-4">
          ${PAY.map(([n, ic, t, on, d]) => `
            <div class="card"><div class="card-body stack">
              <div class="row between" style="flex-wrap:nowrap"><div class="sq-ico ${t}">${icon(ic)}</div>${sw(on, n)}</div>
              <div><b>${n}</b><div class="small muted" style="margin-top:2px">${d}</div></div>
              <div class="row between small"><span class="muted">Status</span>${on ? badge("Aktif", "green", { dot: true }) : badge("Nonaktif", "gray", { dot: true })}</div>
              ${btn("Atur", "warning", { icon: "tune", size: "sm", outline: true, attrs: `data-toast="Pengaturan ${esc(n)} dibuka" data-tone="info"` })}
            </div></div>`).join("")}
        </div>
      </div>

      <!-- Integrasi -->
      <div data-panel-group="set-tab" data-panel="integrasi" hidden>
        <div class="grid g-3">
          ${INTEG.map(([n, ic, d, st, last]) => `
            <div class="card"><div class="card-body stack">
              <div class="row" style="gap:12px;flex-wrap:nowrap"><div class="sq-ico ${st === "Terhubung" ? "blue" : st === "Perlu tindakan" ? "amber" : "purple"}">${icon(ic)}</div>
                <div style="min-width:0;flex:1"><b>${n}</b><div class="small muted">${d}</div></div></div>
              <div class="row between small"><span class="muted">Sinkron terakhir: ${esc(last)}</span>${badge(st, INTEG_TONE[st], { dot: true })}</div>
              <div class="btn-group" style="flex-wrap:nowrap">
                ${st === "Belum terhubung"
                  ? btn("Hubungkan", "success", { icon: "link", size: "sm", attrs: `data-toast="Membuka otorisasi ${esc(n)}" data-tone="info"` })
                  : `${btn(st === "Perlu tindakan" ? "Kirim Laporan" : "Sinkron", "teal", { icon: "sync", size: "sm", attrs: `data-toast="Sinkronisasi ${esc(n)} dimulai"` })}${btn("Atur", "warning", { icon: "tune", size: "sm", attrs: `data-toast="Kredensial ${esc(n)} dibuka" data-tone="info"` })}`}
              </div>
            </div></div>`).join("")}
        </div>
      </div>

      <!-- Notifikasi -->
      <div data-panel-group="set-tab" data-panel="notif" hidden>
        <div class="grid g-2">
          ${card({ title: "Ambang peringatan", icon: "tune", tone: "amber", body: `
            <div class="form-grid">
              ${input("Peringatan dini ED (hari)", { type: "number", value: 180, hint: "Badge kuning di stok & kasir" })}
              ${input("Peringatan kritis ED (hari)", { type: "number", value: 90, hint: "Badge merah, sarankan retur ke PBF" })}
              ${select("Peringatan stok", ["Saat stok ≤ stok minimum", "Saat stok ≤ 1,5x stok minimum", "Saat stok ≤ 2x stok minimum"])}
              ${input("Pengingat hutang (hari sebelum jatuh tempo)", { type: "number", value: 7 })}
              ${input("Pengingat SIP dokter (hari)", { type: "number", value: 60 })}
              ${input("Selisih kas tutup shift (Rp)", { type: "number", value: 50000, hint: "Kirim notifikasi ke supervisor" })}
            </div>` })}
          ${card({ title: "Saluran notifikasi", icon: "campaign", flush: true, body: table({
            cls: "compact",
            columns: [
              { label: "Kejadian", render: (r) => `<span class="t-main">${r[0]}</span>` },
              ...["Aplikasi", "WhatsApp", "Email"].map((ch, i) => ({ label: ch, cls: "center", render: (r) => `<label class="check" style="justify-content:center"><input type="checkbox" aria-label="${ch} ${r[0]}" ${r[1][i] ? "checked" : ""}></label>` })),
            ],
            rows: [
              ["Obat mendekati / lewat ED", [1, 1, 1]], ["Stok di bawah minimum", [1, 0, 1]], ["Hutang PBF jatuh tempo", [1, 1, 1]],
              ["Resep masuk (online)", [1, 1, 0]], ["Void / retur transaksi", [1, 1, 0]], ["Selisih kas tutup shift", [1, 1, 1]],
              ["Mutasi antar cabang", [1, 0, 0]], ["Laporan SIPNAP belum dikirim", [1, 1, 1]],
            ],
          }) })}
        </div>
      </div>

      <!-- Backup -->
      <div data-panel-group="set-tab" data-panel="backup" hidden>
        <div class="grid g-3">
          ${card({ title: "Backup otomatis", icon: "backup", tone: "teal", body: `
            ${swRow("Backup otomatis harian", "Data terenkripsi AES-256 di cloud", true)}
            <div class="form-grid" style="margin-top:12px">
              ${input("Jam backup", { type: "time", value: "23:30" })}
              ${select("Simpan selama", ["7 hari", "30 hari", "90 hari", "1 tahun"], { value: "30 hari" })}
            </div>
            <div class="stack" style="gap:6px;margin-top:14px"><div class="row between small"><span class="muted">Penyimpanan terpakai</span><b>6,4 GB / 20 GB</b></div>${progress(6.4, 20)}</div>`,
            foot: btn("Backup Sekarang", "primary", { icon: "cloud_upload", size: "sm", attrs: 'data-toast="Backup manual dimulai. Estimasi 3 menit."' }) })}
          ${card({ title: "Riwayat & pemulihan", icon: "history", flush: true, body: table({
            cls: "compact",
            columns: [
              { label: "Waktu", render: (r) => `<span class="nowrap">${tgl(DB.addDays(-r[0]))}</span><div class="t-sub">${r[1]}</div>` },
              { label: "Ukuran", cls: "num", render: (r) => r[2] },
              { label: "Status", render: (r) => status(r[3]) },
            ],
            rows: [[0, "23.30 · otomatis", "412 MB", "Selesai"], [1, "23.30 · otomatis", "409 MB", "Selesai"], [2, "14.05 · manual", "408 MB", "Selesai"], [3, "23.30 · otomatis", "405 MB", "Selesai"]],
          }), foot: `${btn("Pulihkan Data", "warning", { icon: "settings_backup_restore", size: "sm", attrs: 'id="set-restore"' })}${btn("Unduh", "teal", { icon: "download", size: "sm", attrs: 'data-toast="File backup terbaru diunduh (.zip)"' })}` })}
          ${card({ title: "Impor master obat", desc: "Dari file Excel (.xlsx)", icon: "upload_file", tone: "green", body: `
            <div class="stack">
              ${dropZone("table_view", "Tarik & lepas file Excel", "atau klik untuk memilih · maks. 5.000 baris", 'data-toast="Dialog pilih file dibuka" data-tone="info"')}
              <div class="steps">
                <div class="step done"><span class="b">${icon("download")}</span>Unduh template</div>
                <div class="step now"><span class="b">2</span>Unggah</div>
                <div class="step"><span class="b">3</span>Validasi</div>
                <div class="step"><span class="b">4</span>Impor</div>
              </div>
            </div>`,
            foot: `${btn("Template", "teal", { icon: "download", size: "sm", attrs: 'data-toast="Template master obat diunduh (.xlsx)"' })}${btn("Impor", "success", { icon: "upload", size: "sm", attrs: 'data-toast="128 item obat divalidasi & siap diimpor"' })}` })}
        </div>
      </div>`;
    },
    mount(root) {
      const prev = root.querySelector("#rcp-prev");
      const nl = (s) => esc(s).replace(/\n/g, "<br>");
      root.querySelector("#rcp-head")?.addEventListener("input", (e) => { root.querySelector("#rcp-head-out").innerHTML = nl(e.target.value); });
      root.querySelector("#rcp-foot")?.addEventListener("input", (e) => { root.querySelector("#rcp-foot-out").innerHTML = nl(e.target.value); });
      root.querySelector("#rcp-width")?.addEventListener("change", (e) => {
        prev.style.maxWidth = e.target.value === "58" ? "220px" : "300px";
        prev.style.fontSize = e.target.value === "58" ? "10.5px" : "";
      });
      root.querySelectorAll("[data-rcp-toggle]").forEach((cb) => cb.addEventListener("change", () => {
        const part = prev.querySelector(`[data-rcp="${cb.dataset.rcpToggle}"]`);
        if (part) part.hidden = !cb.checked;
      }));
      root.querySelector("#logo-file")?.addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        root.querySelector("#logo-prev").innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Logo apotek" style="width:100%;height:100%;object-fit:cover">`;
        toast(`Logo diunggah: ${f.name}`);
      });
      root.querySelector("#set-restore")?.addEventListener("click", () => confirmBox({
        title: "Pulihkan data dari backup", icon: "settings_backup_restore", okLabel: "Pulihkan", okVariant: "danger",
        msg: `Data semua cabang akan dikembalikan ke kondisi <b>${tgl(DB.TODAY)} 23.30</b>. Transaksi setelah waktu tersebut akan hilang. Pastikan semua kasir sudah tutup shift.`,
        onOk: () => toast("Pemulihan dijadwalkan. Sistem akan offline ±5 menit.", "warn"),
      }));
      root.querySelector("#set-reset")?.addEventListener("click", () => confirmBox({
        title: "Kembalikan pengaturan default", icon: "restart_alt", okLabel: "Kembalikan", okVariant: "warning",
        msg: "Semua pengaturan transaksi, struk, dan notifikasi dikembalikan ke nilai awal. Profil apotek & integrasi tidak berubah.",
        onOk: () => toast("Pengaturan dikembalikan ke default", "info"),
      }));
    },
  };

  /* =====================================================================
     LOG AKTIVITAS
     ===================================================================== */
  const AKSI = {
    login: ["login", "Login", "blue"], logout: ["logout", "Logout", "blue"], gagal: ["lock", "Login gagal", "red"],
    void: ["block", "Void transaksi", "red"], harga: ["sell", "Ubah harga", "amber"], hapus: ["delete", "Hapus item", "red"],
    mutasi: ["swap_horiz", "Setujui mutasi", "green"], laporan: ["monitoring", "Akses laporan", "cyan"], akses: ["admin_panel_settings", "Ubah hak akses", "purple"],
    opname: ["fact_check", "Penyesuaian stok", "amber"], diskon: ["percent", "Diskon di atas batas", "amber"], ekspor: ["download", "Ekspor data", "cyan"],
  };
  const SEV = { Tinggi: "red", Sedang: "amber", Rendah: "green", Info: "blue" };
  const LOG = [
    ["10:52:07", "Fikri Ramadhan", "void", "Kasir", "Void INV/PST/2609/0406 (Rp 45.000) — alasan: salah scan item. Disetujui PIN apt. Rina W.", "PST", "192.168.10.21", "POS-01 · Windows 11 · Chrome 128", "Tinggi", "Status: Lunas", "Status: Void"],
    ["10:40:33", "Rina Wulandari", "harga", "Master Obat", "Ubah harga jual Amlodipine 10 mg", "PST", "192.168.10.12", "PC-APT · Windows 11 · Edge 128", "Sedang", "Harga jual: Rp 8.000", "Harga jual: Rp 8.500"],
    ["10:31:10", "Nabila Putri", "diskon", "Kasir", "Diskon 15% pada INV/PST/2609/0410 (batas kasir 10%)", "PST", "192.168.10.22", "POS-02 · Windows 11 · Chrome 128", "Sedang", "Diskon: 0%", "Diskon: 15%"],
    ["10:12:45", "Yulia Anggraini", "mutasi", "Mutasi", "Setujui kirim MUT/2609/014 ke Cabang Bogor (8 item)", "PST", "192.168.10.30", "PC-GDG · Windows 10 · Chrome 127", "Rendah", "Status: Permintaan", "Status: Dalam Perjalanan"],
    ["09:58:02", "Fikri Ramadhan", "hapus", "Kasir", "Hapus item Codeine 10 mg dari keranjang (tanpa resep)", "PST", "192.168.10.21", "POS-01 · Windows 11 · Chrome 128", "Tinggi", "Qty: 1 Strip", "Qty: 0"],
    ["09:30:18", "Teguh Santoso", "laporan", "Laporan", "Buka Laporan Laba Rugi · September 2026", "PST", "10.8.0.14", "Laptop · macOS 14 · Safari 17", "Info", "-", "-"],
    ["09:12:44", "Teguh Santoso", "login", "Autentikasi", "Login berhasil (2FA OTP WhatsApp)", "PST", "10.8.0.14", "Laptop · macOS 14 · Safari 17", "Info", "-", "-"],
    ["08:47:51", "Anton Wibisono", "ekspor", "Laporan", "Ekspor Laporan Konsolidasi ke Excel", "Semua", "36.84.12.201", "iPhone 15 · iOS 18 · Safari", "Rendah", "-", "-"],
    ["08:21:09", "Reza Mahendra", "gagal", "Autentikasi", "3x kata sandi salah — akun nonaktif", "DPK", "192.168.30.19", "POS-01 · Windows 10 · Chrome 126", "Tinggi", "-", "-"],
    ["08:05:37", "Dimas Pratama", "login", "Autentikasi", "Login berhasil", "BKS", "192.168.20.11", "PC-APT · Windows 11 · Chrome 128", "Info", "-", "-"],
    ["07:58:12", "Rina Wulandari", "login", "Autentikasi", "Login berhasil (2FA OTP WhatsApp)", "PST", "192.168.10.12", "PC-APT · Windows 11 · Edge 128", "Info", "-", "-"],
    ["07:40:26", "Anton Wibisono", "akses", "Pengaturan", "Tambah izin 'Setujui' modul Opname untuk peran Admin Gudang", "Semua", "36.84.12.201", "iPhone 15 · iOS 18 · Safari", "Tinggi", "Admin Gudang · Opname: L T U", "Admin Gudang · Opname: L T U S"],
    ["07:10:03", "Nabila Putri", "login", "Autentikasi", "Login berhasil", "PST", "192.168.10.22", "POS-02 · Windows 11 · Chrome 128", "Info", "-", "-"],
    ["06:55:40", "Intan Permata", "opname", "Opname", "Penyesuaian stok Paracetamol 500 mg (selisih -4 strip)", "TGR", "192.168.40.15", "Tablet · Android 14 · Chrome", "Sedang", "Stok sistem: 128", "Stok fisik: 124"],
    ["06:45:22", "Anton Wibisono", "login", "Autentikasi", "Login berhasil dari perangkat baru", "Semua", "36.84.12.201", "iPhone 15 · iOS 18 · Safari", "Sedang", "-", "-"],
    ["00:04:10", "Sistem", "logout", "Autentikasi", "Sesi 3 pengguna diakhiri otomatis (tutup hari)", "Semua", "server", "Cron job", "Info", "-", "-"],
  ].map(([w, user, aksi, modul, det, cab, ip, dev, sev, before, after]) => ({ w, user, aksi, modul, det, cab, ip, dev, sev, before, after }));

  function auditDetail(i) {
    const l = LOG[i];
    const [ic, lbl, t] = AKSI[l.aksi];
    modal.open({
      title: "Detail aktivitas", icon: "policy", size: "sm",
      body: `
        <div class="row" style="gap:12px;flex-wrap:nowrap"><div class="sq-ico ${t}">${icon(ic)}</div><div><b>${lbl}</b><div class="small muted">${tgl(DB.TODAY)} · ${l.w} WIB</div></div><span class="spacer"></span>${badge(l.sev, SEV[l.sev], { dot: true })}</div>
        <p class="small">${esc(l.det)}</p>
        <dl class="kv">
          <dt>Pengguna</dt><dd>${esc(l.user)}</dd><dt>Modul</dt><dd>${esc(l.modul)}</dd>
          <dt>Cabang</dt><dd>${l.cab === "Semua" ? "Semua cabang" : esc(UI.cabangNama(l.cab))}</dd>
          <dt>Alamat IP</dt><dd class="mono">${esc(l.ip)}</dd><dt>Perangkat</dt><dd>${esc(l.dev)}</dd>
        </dl>
        ${l.before !== "-" ? `<div class="grid g-2" style="gap:10px">
          <div class="alert danger">${icon("remove")}<div><b>Sebelum</b>${esc(l.before)}</div></div>
          <div class="alert success">${icon("add")}<div><b>Sesudah</b>${esc(l.after)}</div></div></div>` : ""}`,
      foot: `${btn("Tutup", "dark", { attrs: "data-close" })}${btn("Cetak", "teal", { icon: "print", attrs: 'data-toast="Detail log dikirim ke printer"' })}`,
    });
  }

  window.PAGES.audit = {
    render() {
      const cnt = (s) => LOG.filter((l) => l.sev === s).length;
      const kritis = LOG.filter((l) => l.sev === "Tinggi");
      const jam = [["00", 3], ["06", 42], ["07", 118], ["08", 164], ["09", 212], ["10", 236], ["11", 198], ["12", 141], ["13", 126], ["14", 152], ["15", 170], ["16", 188]];
      return `
      ${UI.pageHeader({
        title: "Log Aktivitas",
        sub: "Jejak audit seluruh aksi pengguna: login, void, perubahan harga, penghapusan item, persetujuan, dan akses laporan.",
        crumbs: ["Pengaturan", "Log Aktivitas"],
        actions: `${btn("Export Excel", "teal", { icon: "table_view", attrs: 'data-toast="Log aktivitas diekspor ke Excel (.xlsx)"' })}${btn("Kebijakan Retensi", "glass", { icon: "policy", attrs: 'data-toast="Log disimpan 5 tahun sesuai kebijakan audit" data-tone="info"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Aktivitas hari ini", value: num(1248), icon: "policy", tone: "primary", hero: true, delta: 3.1, foot: "vs kemarin" })}
        ${stat({ label: "Aksi berisiko tinggi", value: cnt("Tinggi"), icon: "gpp_bad", tone: "danger", foot: "void, hapus item, ubah akses" })}
        ${stat({ label: "Login gagal", value: LOG.filter((l) => l.aksi === "gagal").length, icon: "lock", tone: "warning", foot: "1 akun terkunci" })}
        ${stat({ label: "Pengguna aktif", value: new Set(LOG.map((l) => l.user)).size - 1, icon: "group", tone: "teal", foot: "dari 5 cabang" })}
      </div>

      <section class="card">
        ${UI.filterBar(`
          ${select("Pengguna", ["Semua pengguna", ...DB.users.map((u) => u.nama)])}
          ${select("Jenis aksi", ["Semua aksi", ...Object.values(AKSI).map((a) => a[1])])}`,
          `${btn("Tampilkan", "primary", { icon: "filter_alt", attrs: 'data-toast="Filter diterapkan"' })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: 'data-toast="Log aktivitas diekspor ke PDF"' })}`)}
        <div class="row between" style="padding:12px 16px 0">
          <div class="chips" data-chip-group="au-sev" id="au-chips">
            <button type="button" class="chip active" data-f="all">Semua <b>${LOG.length}</b></button>
            ${Object.keys(SEV).map((s) => `<button type="button" class="chip" data-f="${s}">${s} <b>${cnt(s)}</b></button>`).join("")}
          </div>
          <div class="input-icon" style="min-width:220px">${icon("search")}<input class="input sm" id="au-search" type="search" placeholder="Cari detail, IP, perangkat" aria-label="Cari log"></div>
        </div>
        ${table({
          rowCls: (l) => `au-row ${l.sev === "Tinggi" ? "row-danger" : ""}`,
          columns: [
            { label: "Waktu", render: (l) => `<span class="mono strong">${l.w}</span><div class="t-sub">${tgl(DB.TODAY)}</div>` },
            { label: "Pengguna", render: (l) => `<div class="row" style="gap:8px;flex-wrap:nowrap"><div class="avatar sm">${l.user === "Sistem" ? icon("dns") : inisial(l.user)}</div><span class="nowrap">${esc(l.user)}</span></div>` },
            { label: "Aksi", render: (l) => { const [ic, lbl, t] = AKSI[l.aksi]; return badge(lbl, t, { icon: ic }); } },
            { label: "Detail", render: (l) => `<div style="min-width:240px;max-width:380px">${esc(l.det)}</div><div class="t-sub">${esc(l.modul)} · ${l.cab === "Semua" ? "Semua cabang" : esc(l.cab)}</div>` },
            { label: "IP / Perangkat", render: (l) => `<span class="mono small">${esc(l.ip)}</span><div class="t-sub nowrap">${esc(l.dev)}</div>` },
            { label: "Tingkat", render: (l) => `<span data-sev="${l.sev}">${badge(l.sev, SEV[l.sev], { dot: true })}</span>` },
            { label: "", cls: "actions", render: (l, i) => btn("", "info", { icon: "visibility", size: "sm", title: "Lihat detail", attrs: `data-au="${i}"` }) },
          ],
          rows: LOG,
        })}
        ${UI.pager(1248, 20)}
      </section>

      <div class="grid g-2">
        ${card({
          title: "Aksi berisiko tinggi", desc: "24 jam terakhir · perlu ditinjau apoteker PJ / owner", icon: "gpp_bad", tone: "red",
          tools: btn("Tandai ditinjau", "success", { size: "sm", icon: "done_all", attrs: 'data-toast="Semua aksi berisiko ditandai sudah ditinjau"' }),
          body: `<div class="timeline" style="padding:0">${kritis.map((l) => `
            <div class="tl red"><span class="d"></span><div><div class="t">${AKSI[l.aksi][1]} · ${esc(l.user)}</div><div class="m">${l.w} · ${esc(l.det)}</div></div></div>`).join("")}</div>`,
        })}
        ${card({
          title: "Aktivitas per jam", desc: "Jumlah log tercatat hari ini", icon: "bar_chart",
          body: chart("audit-jam", (k) => ({
            type: "bar",
            data: { labels: jam.map((j) => j[0] + ".00"), datasets: [{ label: "Aktivitas", data: jam.map((j) => j[1]), backgroundColor: k.c1, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 28 }] },
            options: { scales: { y: { beginAtZero: true, grid: { color: k.grid } }, x: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${num(c.raw)} aktivitas` } } } },
          })),
        })}
      </div>`;
    },
    mount(root) {
      const rows = [...root.querySelectorAll("tr.au-row")];
      let sev = "all";
      const apply = () => {
        const q = (root.querySelector("#au-search")?.value || "").toLowerCase();
        rows.forEach((r) => {
          const okS = sev === "all" || !!r.querySelector(`[data-sev="${sev}"]`);
          r.hidden = !(okS && (!q || r.textContent.toLowerCase().includes(q)));
        });
      };
      root.querySelector("#au-chips")?.addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (c) { sev = c.dataset.f; apply(); } });
      root.querySelector("#au-search")?.addEventListener("input", apply);
      root.addEventListener("click", (e) => { const v = e.target.closest("[data-au]"); if (v) auditDetail(Number(v.dataset.au)); });
    },
  };

  /* =====================================================================
     PANDUAN UI (STYLE GUIDE)
     ===================================================================== */
  const VARIANTS = [
    ["primary", "#1565c0 → #1e88e5", "Aksi utama: simpan, proses, navigasi utama", "Simpan", "save"],
    ["success", "#15a34a → #22c55e", "Tambah baru, bayar, setujui, terima, selesaikan", "Bayar", "payments"],
    ["warning", "#e08a00 → #f5a524", "Ubah/edit, tahan (hold), revisi, penyesuaian", "Ubah", "edit"],
    ["danger", "#dc2640 → #f0435b", "Hapus, batal, void, pemusnahan, ekspor PDF", "Void", "block"],
    ["info", "#0891b2 → #22b8d8", "Lihat detail, cek, pratinjau", "Lihat Detail", "visibility"],
    ["purple", "#6d3fd6 → #8b5cf6", "Racikan, resep, fitur farmasi khusus, salin resep", "Buat Racikan", "science"],
    ["teal", "#0f8a75 → #14b8a6", "Ekspor Excel, cetak/print, sinkronisasi", "Cetak", "print"],
    ["dark", "#334566 → #4b5d80", "Kembali, tutup, riwayat", "Kembali", "arrow_back"],
    ["pink", "#d63384 → #ec4899", "Promo, diskon, member & poin", "Promo", "sell"],
    ["light", "surface + border", "Aksi sekunder netral di dalam kartu/modal (Batal)", "Batal", ""],
    ["white", "#ffffff", "Aksi utama di atas pita gradasi biru (header halaman)", "Input Resep", "prescriptions"],
    ["glass", "putih 16% + blur", "Aksi sekunder di atas pita gradasi biru", "Unduh", "download"],
  ];
  const onGrad = (html) => `<div style="background:var(--grad-primary);padding:10px;border-radius:var(--radius-sm);display:inline-flex;gap:8px">${html}</div>`;
  const swatch = (bg, name, val) => `<div class="swatch"><div class="c" style="background:${bg}"></div><div class="i"><b>${name}</b><span class="mono muted">${val}</span></div></div>`;
  const swGrid = (html, min = 120) => `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${min}px,1fr));gap:12px">${html}</div>`;
  const sec = (id, title, desc, ic, body, tone = "") => `<div id="${id}" style="scroll-margin-top:84px">${card({ title, desc, icon: ic, tone, body })}</div>`;
  const TOC = [["pd-warna", "Warna", "palette"], ["pd-tipo", "Tipografi", "text_fields"], ["pd-tombol", "Tombol", "smart_button"], ["pd-bayang", "Bayangan & FAB", "layers"], ["pd-badge", "Badge & Golongan", "sell"], ["pd-form", "Form", "edit_note"], ["pd-nav", "Tab & Chip", "tab"], ["pd-feedback", "Umpan Balik", "notifications"], ["pd-data", "Data", "table"], ["pd-cetak", "Struk & Etiket", "receipt_long"]];

  window.PAGES.panduan = {
    render() {
      const blue = [["950", "#061a45"], ["900", "#0a2a66"], ["800", "#0b3a8c"], ["700", "#0d47a1"], ["600", "#1565c0"], ["500", "#1e88e5"], ["400", "#42a5f5"], ["300", "#7cc4fa"], ["100", "#dcecfd"], ["50", "#eef6ff"]];
      const sample = ["OB0017", "OB0002", "OB0036", "OB0038"].map((k) => DB.obat.find((o) => o.kode === k));
      return `
      ${UI.pageHeader({
        title: "Panduan UI (Style Guide)",
        sub: "Sistem desain FarmaKasir: warna, tipografi, bahasa warna tombol, elevasi, komponen, dan pola cetak. Rujukan wajib untuk setiap halaman baru.",
        crumbs: ["Pengaturan", "Panduan UI"],
        actions: `${btn("Unduh Token CSS", "white", { icon: "download", attrs: 'data-toast="Token desain (app.css :root) diunduh"' })}${btn("Mode gelap/terang", "glass", { icon: "contrast", attrs: 'data-pd-theme' })}`,
      })}

      <div class="card"><div class="card-body stack">
        <div class="row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">
          <div class="sq-ico blue">${icon("auto_awesome")}</div>
          <div><b>Prinsip desain</b><div class="small muted" style="margin-top:4px">1) Biru gradasi sebagai identitas & penanda area utama. 2) Tombol melayang berbayang berwarna agar fungsi dikenali sebelum label dibaca. 3) Warna = fungsi, konsisten di seluruh modul. 4) Kepatuhan farmasi terlihat: golongan obat, ED, dan alergi selalu ditandai. 5) Semua warna melalui token CSS sehingga mode gelap otomatis.</div></div>
        </div>
        <div class="chips">${TOC.map(([id, l, ic]) => `<button type="button" class="chip" data-scroll="${id}">${icon(ic)}${l}</button>`).join("")}</div>
      </div></div>

      ${sec("pd-warna", "Palet warna", "Token di :root pada app.css — jangan menulis hex langsung di halaman", "palette", `
        <div class="lbl-sm" style="margin-bottom:10px">Brand blue ramp (--blue-*)</div>
        ${swGrid(blue.map(([k, h]) => swatch(`var(--blue-${k})`, `blue-${k}`, h)).join(""), 90)}
        <div class="lbl-sm" style="margin:18px 0 10px">Gradasi</div>
        ${swGrid([
          ["var(--grad-primary)", "--grad-primary", "135° #0d47a1 → #42a5f5 · tombol hero, chip aktif, modal header"],
          ["var(--grad-sidebar)", "--grad-sidebar", "180° #0a2a66 → #1565c0 · sidebar navigasi"],
          ["var(--grad-hero)", "--grad-hero", "120° #0b3a8c → #4fb3f6 · pita header halaman, login"],
        ].map(([g, n, d]) => swatch(g, n, d)).join(""), 220)}
        <div class="lbl-sm" style="margin:18px 0 10px">Warna semantik tombol (--c-*)</div>
        ${swGrid(VARIANTS.slice(0, 9).map(([v, hex]) => swatch(`linear-gradient(135deg,var(--c-${v}),var(--c-${v}-2))`, v, hex)).join(""), 150)}
        <div class="lbl-sm" style="margin:18px 0 10px">Netral & grafik</div>
        ${swGrid([["var(--bg)", "--bg", "latar aplikasi"], ["var(--surface)", "--surface", "kartu"], ["var(--surface-2)", "--surface-2", "header tabel"], ["var(--border)", "--border", "garis"], ["var(--text)", "--text", "teks utama"], ["var(--text-3)", "--text-3", "teks redup"],
          ["var(--chart-1)", "--chart-1", "seri 1"], ["var(--chart-2)", "--chart-2", "seri 2"], ["var(--chart-3)", "--chart-3", "seri 3"], ["var(--chart-4)", "--chart-4", "seri 4"], ["var(--chart-5)", "--chart-5", "seri 5"]].map(([g, n, d]) => swatch(g, n, d)).join(""), 110)}`)}

      ${sec("pd-tipo", "Tipografi", "Plus Jakarta Sans untuk tampilan & isi, JetBrains Mono untuk kode", "text_fields", `
        <div class="stack" style="gap:0">
          ${[
            ["Display / login", "font-size:38px;font-weight:800;letter-spacing:-.02em", "Apotek lebih rapi", "38 / 800"],
            ["Judul halaman (h1)", "font-size:26px;font-weight:800;letter-spacing:-.02em", "Stok Obat", "26 / 800"],
            ["Angka statistik", "font-size:24px;font-weight:800;font-variant-numeric:tabular-nums", "Rp 142,6 jt", "24 / 800 tabular"],
            ["Judul kartu (h3)", "font-size:15.5px;font-weight:700", "Transaksi terbaru", "15,5 / 700"],
            ["Isi / body", "font-size:14px", "Obat diminum sesudah makan, habiskan antibiotik.", "14 / 400"],
            ["Label form", "font-size:12.5px;font-weight:600;color:var(--text-2)", "Tanggal kedaluwarsa", "12,5 / 600"],
            ["Keterangan", "font-size:12px;color:var(--text-3)", "Diperbarui 5 menit lalu", "12 / 400"],
          ].map(([n, st, s, spec]) => `<div class="row between" style="padding:12px 0;border-bottom:1px solid var(--border);gap:16px"><div style="${st};min-width:0">${s}</div><div class="small muted" style="text-align:right">${n}<br><span class="mono">${spec}</span></div></div>`).join("")}
          <div class="row between" style="padding:12px 0;gap:16px"><div class="mono" style="font-size:14px">INV/PST/2609/0412 · OB0017 · 8992858605019 · BATCH DE2519A</div><div class="small muted" style="text-align:right">JetBrains Mono<br><span class="mono">nomor dokumen, kode, barcode, batch</span></div></div>
        </div>`)}

      ${sec("pd-tombol", "Bahasa warna tombol", "Warna menyatakan fungsi — wajib konsisten di semua halaman", "smart_button", `
        ${table({
          columns: [
            { label: "Varian", render: (v) => `<span class="mono strong">.btn.${v[0]}</span>` },
            { label: "Warna", render: (v) => `<div class="row" style="gap:8px;flex-wrap:nowrap"><i style="width:18px;height:18px;border-radius:6px;display:inline-block;flex-shrink:0;background:${["light", "white", "glass"].includes(v[0]) ? (v[0] === "light" ? "var(--surface);border:1px solid var(--border)" : "var(--grad-primary)") : `linear-gradient(135deg,var(--c-${v[0]}),var(--c-${v[0]}-2))`}"></i><span class="mono small nowrap">${v[1]}</span></div>` },
            { label: "Fungsi", render: (v) => v[2] },
            { label: "Contoh", render: (v) => { const b = btn(v[3], v[0], { icon: v[4], attrs: `data-toast="Contoh tombol ${v[0]}" data-tone="info"` }); return ["white", "glass"].includes(v[0]) ? onGrad(b) : b; } },
          ],
          rows: VARIANTS,
        })}
        <div class="grid g-2" style="margin-top:20px">
          <div class="stack">
            <div class="lbl-sm">Ukuran</div>
            <div class="row" style="align-items:center">${btn("Kecil (sm)", "primary", { size: "sm", icon: "add" })}${btn("Default", "primary", { icon: "add" })}${btn("Besar (lg)", "primary", { size: "lg", icon: "add" })}</div>
            <div class="row" style="align-items:center">${btn("Bayar (xl)", "success", { size: "xl", icon: "payments" })}${btn("", "info", { icon: "visibility", title: "Ikon" })}${btn("", "danger", { icon: "delete", size: "sm", title: "Ikon kecil" })}</div>
            <div class="small muted">Kasir memakai <span class="mono">xl</span> untuk tombol bayar; tabel memakai tombol ikon <span class="mono">sm</span>. <span class="mono">block</span> membuat tombol selebar wadah.</div>
          </div>
          <div class="stack">
            <div class="lbl-sm">Outline (aksi sekunder berwarna)</div>
            <div class="row">${["primary", "success", "warning", "danger", "purple", "teal"].map((v) => btn(v, v, { outline: true, size: "sm" })).join("")}</div>
            <div class="lbl-sm" style="margin-top:6px">Aksi baris tabel — UI.rowActions()</div>
            <div>${UI.rowActions(["view", "edit", "delete", "print", "approve", "history", "copy", "send"], "contoh")}</div>
            <div class="small muted">Lihat (info) · Ubah (warning) · Hapus (danger) · Cetak (teal) · Setujui (success) · Riwayat (dark) · Salin (purple) · Kirim (primary)</div>
            <div class="row">${btn("Nonaktif", "primary", { attrs: "disabled" })}<span class="small muted">atribut <span class="mono">disabled</span> = opasitas 50%</span></div>
          </div>
        </div>`)}

      ${sec("pd-bayang", "Elevasi, bayangan berwarna & FAB", "Komponen interaktif tampak melayang dan terangkat saat disentuh", "layers", `
        <div class="grid g-3" style="gap:14px">
          ${[["--shadow-sm", "Elemen datar: swatch, input"], ["--shadow-md", "Kartu, stat tile (default)"], ["--shadow-lg", "Hover kartu, toast, dropdown"]].map(([s, d]) => `<div style="padding:18px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border);box-shadow:var(${s})"><b class="mono small">${s}</b><div class="small muted">${d}</div></div>`).join("")}
        </div>
        <div class="grid g-2" style="margin-top:20px">
          <div class="stack">
            <div class="small">Setiap tombol berwarna memakai <b>bayangan dengan warna tombolnya sendiri</b> (variabel <span class="mono">--brgb</span>), sorotan tipis di tepi atas, dan <b>terangkat 3px saat hover</b> dengan transisi pegas. Saat ditekan tombol turun kembali. Stat tile & kartu produk juga terangkat saat hover.</div>
            ${codeBlock(`.btn {\n  background: linear-gradient(135deg, var(--b1), var(--b2));\n  box-shadow: 0 8px 18px -6px rgba(var(--brgb), .65),\n              inset 0 1px 0 rgba(255,255,255,.22);\n}\n.btn:hover  { transform: translateY(-3px); }\n.btn:active { transform: translateY(0); }`)}
          </div>
          <div class="stack">
            <div class="row" style="gap:16px;flex-wrap:nowrap;align-items:flex-start">
              <button type="button" class="fab" style="flex-shrink:0" aria-label="Contoh FAB" data-toast="FAB: buka menu aksi cepat" data-tone="info">${icon("add")}</button>
              <div class="small"><b>Floating Action Button (FAB)</b> — tombol bulat 60px bergradasi di pojok kanan bawah semua halaman (kecuali Kasir). Membuka menu aksi cepat: Transaksi Kasir, Input Resep, Buat Racikan, Surat Pesanan, Cek Kedaluwarsa. Ikon berputar 45° saat terbuka.</div>
            </div>
            <div class="fab-menu" style="align-items:flex-start">${btn("Transaksi Kasir", "success", { icon: "point_of_sale", size: "sm" })}${btn("Buat Racikan", "purple", { icon: "science", size: "sm" })}</div>
            <div class="small muted">Radius: <span class="mono">--radius-sm 10px</span> (input), <span class="mono">--radius 14px</span>, <span class="mono">--radius-lg 20px</span> (kartu), modal 22px.</div>
          </div>
        </div>`)}

      ${sec("pd-badge", "Badge, status & golongan obat", "Badge berwarna lembut (tinted) agar tetap terbaca di mode gelap", "sell", `
        <div class="lbl-sm" style="margin-bottom:8px">Nada badge</div>
        <div class="row">${["blue", "green", "amber", "red", "cyan", "purple", "teal", "pink", "gray"].map((t) => badge(t, t)).join("")}${badge("solid", "solid")}${badge("dengan ikon", "red", { icon: "warning" })}${badge("dengan titik", "green", { dot: true })}</div>
        <div class="lbl-sm" style="margin:16px 0 8px">Status dokumen — UI.status()</div>
        <div class="row">${["Lunas", "Aktif", "Selesai", "Pending", "Menunggu TTD Apoteker", "Dalam Perjalanan", "Diproses", "Diracik", "Siap Diserahkan", "Draft", "Nonaktif", "Retur Sebagian", "Void", "Kedaluwarsa", "Ditolak"].map(status).join("")}</div>
        <div class="lbl-sm" style="margin:20px 0 8px">Golongan obat — UI.golongan() (penandaan resmi)</div>
        ${table({
          cls: "compact",
          columns: [
            { label: "Tanda", render: (g) => golongan(g[0]) },
            { label: "Penandaan pada kemasan", render: (g) => g[1] },
            { label: "Ketentuan di sistem", render: (g) => `<span class="small">${g[2]}</span>` },
          ],
          rows: [
            ["bebas", "Lingkaran hijau dengan garis tepi hitam", "Dijual bebas tanpa resep"],
            ["terbatas", "Lingkaran biru dengan garis tepi hitam + kotak peringatan P.No.1–P.No.6", "Tanpa resep dalam jumlah terbatas; peringatan dicetak di struk"],
            ["keras", "Lingkaran merah dengan garis tepi hitam dan huruf K di tengah", "Wajib resep dokter, kecuali daftar Obat Wajib Apotek (OWA)"],
            ["psikotropika", "Sama dengan obat keras: lingkaran merah huruf K", "Resep asli, SP khusus psikotropika, lapor SIPNAP bulanan"],
            ["narkotika", "Palang medali merah: lingkaran putih bertepi merah dengan palang merah", "Resep asli, lemari khusus terkunci, SP khusus narkotika, lapor SIPNAP"],
            ["oot", "Tanpa tanda khusus di kemasan; label sistem oranye", "Obat-Obat Tertentu (mis. tramadol, dekstrometorfan): dibatasi jumlahnya & dicatat"],
            ["prekursor", "Tanpa tanda khusus di kemasan; label sistem ungu", "Prekursor farmasi (mis. pseudoefedrin): pencatatan & pelaporan khusus"],
          ],
        })}`)}

      ${sec("pd-form", "Kontrol form", "Label di atas field, petunjuk (hint) di bawah, fokus bercincin biru", "edit_note", `
        <div class="form-grid cols-3">
          ${input("Input teks", { ph: "Nama obat" })}
          ${input("Input dengan ikon", { ph: "Cari / scan barcode", icon: "barcode_scanner" })}
          ${select("Select", ["Strip", "Box", "Botol", "Tube"])}
          ${input("Input angka", { type: "number", value: 12, hint: "Petunjuk tambahan" })}
          ${input("Input tanggal", { type: "date", value: DB.iso(DB.addDays(180)) })}
          ${input("Input kecil (sm)", { ph: "sm", size: "sm" })}
          ${textarea("Textarea", { ph: "Catatan apoteker", cls: "full" })}
        </div>
        <div class="row" style="margin-top:14px;gap:20px">
          <label class="check"><input type="checkbox" checked>Checkbox</label>
          <label class="check"><input type="radio" name="pd-r" checked>Radio A</label>
          <label class="check"><input type="radio" name="pd-r">Radio B</label>
          <span class="row" style="gap:8px">${sw(true, "Switch aktif")}<span class="small">Switch aktif</span></span>
          <span class="row" style="gap:8px">${sw(false, "Switch nonaktif")}<span class="small">Switch nonaktif</span></span>
        </div>
        <div style="margin-top:14px;max-width:420px">${input("Input besar (lg) — kasir", { ph: "Scan barcode…", size: "lg" })}</div>`)}

      ${sec("pd-nav", "Tab & chip", "Tab untuk berpindah panel; chip untuk filter cepat satu pilihan", "tab", `
        <div class="stack">
          ${tabs("pd-tabs", [{ id: "a", label: "Semua", icon: "list", n: 42 }, { id: "b", label: "Menipis", icon: "inventory", n: 9 }, { id: "c", label: "Habis", icon: "block", n: 3 }], "a")}
          <div data-panel-group="pd-tabs" data-panel="a" class="small muted">Panel "Semua": 42 item obat.</div>
          <div data-panel-group="pd-tabs" data-panel="b" class="small muted" hidden>Panel "Menipis": 9 item di bawah stok minimum.</div>
          <div data-panel-group="pd-tabs" data-panel="c" class="small muted" hidden>Panel "Habis": 3 item stok 0.</div>
          <div style="background:var(--grad-primary);padding:12px;border-radius:var(--radius)">${tabs("pd-tabs2", [{ id: "x", label: "Hari ini" }, { id: "y", label: "Minggu ini" }, { id: "z", label: "Bulan ini" }], "x", true)}</div>
          <div class="chips" data-chip-group="pd-chip">${["Semua", "Obat Bebas", "Obat Keras", "Psikotropika", "Alkes"].map((c, i) => `<button type="button" class="chip ${i === 0 ? "active" : ""}">${c}</button>`).join("")}</div>
        </div>`)}

      ${sec("pd-feedback", "Umpan balik: alert, toast, modal, kosong", "Nada: info (biru), warn (oranye), danger (merah), success (hijau)", "notifications", `
        <div class="grid g-2" style="gap:14px">
          ${alert("info", "info", "Info", "Sinkronisasi berikutnya pukul 12.00.")}
          ${alert("warn", "warning", "Peringatan", "3 batch ED kurang dari 90 hari.")}
          ${alert("danger", "error", "Bahaya", "Pasien alergi penisilin — Amoxicillin diblokir.")}
          ${alert("success", "check_circle", "Berhasil", "Surat Pesanan terkirim ke PBF.")}
        </div>
        <div class="grid g-3" style="margin-top:18px">
          <div class="stack"><div class="lbl-sm">Toast (klik untuk mencoba)</div><div class="row">
            ${btn("Success", "success", { size: "sm", attrs: 'data-toast="Transaksi tersimpan" data-tone="success"' })}
            ${btn("Info", "primary", { size: "sm", attrs: 'data-toast="Sinkronisasi berjalan" data-tone="info"' })}
            ${btn("Warn", "warning", { size: "sm", attrs: 'data-toast="Stok menipis" data-tone="warn"' })}
            ${btn("Danger", "danger", { size: "sm", attrs: 'data-toast="Gagal terhubung ke printer" data-tone="danger"' })}</div></div>
          <div class="stack"><div class="lbl-sm">Modal & konfirmasi</div><div class="row">
            ${btn("Buka Modal", "info", { size: "sm", icon: "open_in_new", attrs: "data-pd-modal" })}
            ${btn("Konfirmasi Hapus", "danger", { size: "sm", icon: "delete", attrs: "data-pd-confirm" })}</div>
            <div class="small muted">Gunakan UI.confirmBox — window.confirm tidak diizinkan.</div></div>
          <div class="card" style="box-shadow:none"><div class="empty" style="padding:20px">${icon("inbox")}<b>Belum ada data</b><span class="small">State kosong: ikon, judul, ajakan.</span>${btn("Tambah Data", "success", { size: "sm", icon: "add" })}</div></div>
        </div>`)}

      ${sec("pd-data", "Tampilan data: stat tile, tabel, progres", "Angka rata kanan dan tabular; kode dengan font mono", "table", `
        <div class="grid g-3">
          ${stat({ label: "Penjualan hari ini", value: short(142600000), icon: "payments", tone: "primary", delta: 6.2, foot: "vs kemarin", hero: true })}
          ${stat({ label: "Resep dilayani", value: "186", icon: "prescriptions", tone: "purple", delta: 7.8, foot: "stat tile standar" })}
          ${stat({ label: "Retur", value: "4", icon: "assignment_return", tone: "danger", delta: -12.5, foot: "delta negatif" })}
        </div>
        <div class="card" style="margin-top:18px;box-shadow:none">${table({
          columns: [
            { label: "Kode", render: (o) => `<span class="mono">${o.kode}</span>` },
            { label: "Nama obat", render: (o) => `<div class="t-main">${esc(o.nama)}</div><div class="t-sub">${esc(o.generik)}</div>` },
            { label: "Golongan", render: (o) => golongan(o.golongan) },
            { label: "Stok", cls: "num", render: (o) => num(o.stok.PST) },
            { label: "Harga jual", cls: "num", render: (o) => `<b>${rp(o.hargaJual)}</b>` },
            { label: "Status", render: (o) => (o.stok.PST < o.min ? status("Menipis") : status("Aman")) },
            { label: "", cls: "actions", render: (o) => UI.rowActions(["view", "edit", "delete"], o.nama) },
          ],
          rows: sample,
        })}</div>
        <div class="grid g-3" style="margin-top:18px">
          <div class="stack" style="gap:6px"><span class="small">Default (biru)</span>${progress(72, 100)}</div>
          <div class="stack" style="gap:6px"><span class="small">Tercapai (hijau)</span>${progress(100, 100, "green")}</div>
          <div class="stack" style="gap:6px"><span class="small">Kritis (merah)</span>${progress(18, 100, "red")}</div>
        </div>`)}

      ${sec("pd-cetak", "Struk & etiket", "Pratinjau cetak selalu putih (kertas), tidak mengikuti mode gelap", "receipt_long", `
        <div class="grid g-3" style="align-items:start">
          <div class="stack"><div class="lbl-sm">Struk thermal 80 mm (.receipt)</div>${receiptPreview().replace('id="rcp-prev"', "").replace('id="rcp-head-out"', "").replace('id="rcp-foot-out"', "")}</div>
          <div class="stack"><div class="lbl-sm">Etiket putih — obat dalam (.etiket.putih)</div>
            <div class="etiket putih">
              <div class="hd">${esc(DB.apotek.nama.toUpperCase())}<div style="font-weight:400;font-size:10px">${esc(DB.apotek.alamat)}</div><div style="font-weight:400;font-size:10px">Apt. ${esc(DB.apotek.apotekerPJ.replace("apt. ", ""))}</div></div>
              <div class="row between"><span>No. 0088</span><span>${tgl(DB.TODAY)}</span></div>
              <div><b>Hendra Wijaya</b></div>
              <div class="sig">1 x sehari 1 tablet</div>
              <div class="center">Pagi hari · sesudah makan</div>
              <div class="dashed"></div>
              <div class="row between"><span>Amlodipine 10 mg</span><span>30 tab</span></div>
              <div class="row between" style="font-size:10.5px"><span>ED: ${tgl(DB.addDays(400))}</span><span>Batch DE2519A</span></div>
            </div></div>
          <div class="stack"><div class="lbl-sm">Etiket biru — obat luar (.etiket.biru)</div>
            <div class="etiket biru">
              <div class="hd">${esc(DB.apotek.nama.toUpperCase())}<div style="font-weight:400;font-size:10px">${esc(DB.apotek.alamat)}</div></div>
              <div class="row between"><span>No. 0091</span><span>${tgl(DB.TODAY)}</span></div>
              <div><b>Siti Aminah</b></div>
              <div class="sig">2 x sehari dioleskan tipis</div>
              <div class="center"><b>OBAT LUAR — TIDAK UNTUK DIMINUM</b></div>
              <div class="dashed"></div>
              <div class="row between"><span>Hydrocortisone Krim 2,5%</span><span>1 tube</span></div>
            </div>
            <div class="small muted">Etiket putih untuk obat dalam (oral), etiket biru untuk obat luar (topikal, tetes, suppositoria).</div></div>
        </div>`)}`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        const s = e.target.closest("[data-scroll]");
        if (s) root.querySelector("#" + s.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (e.target.closest("[data-pd-theme]")) document.getElementById("theme-btn")?.click();
        if (e.target.closest("[data-pd-modal]")) modal.open({
          title: "Contoh modal", icon: "open_in_new",
          body: `<p>Modal memiliki header bergradasi biru, isi yang dapat digulir, dan footer lengket berisi aksi. Ukuran: <span class="mono">sm</span> 440px, default 640px, <span class="mono">lg</span> 920px, <span class="mono">xl</span> 1120px.</p>${alert("info", "info", "Tips", "Tekan Esc atau klik area gelap untuk menutup.")}`,
          foot: `${btn("Tutup", "dark", { attrs: "data-close" })}${btn("Simpan", "primary", { icon: "save", attrs: 'data-close data-toast="Contoh: data disimpan"' })}`,
        });
        if (e.target.closest("[data-pd-confirm]")) confirmBox({ title: "Hapus item?", icon: "delete", okLabel: "Ya, hapus", msg: "Contoh dialog konfirmasi untuk aksi berisiko (hapus, void, pemusnahan).", onOk: () => toast("Item dihapus", "danger") });
      });
    },
  };
})();
