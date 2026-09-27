/* Kasir (POS) — penjualan obat bebas, obat resep & racikan */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, esc, rp, num, badge, golongan, modal, toast, confirmBox } = UI;

  const needsRx = ["keras", "psikotropika", "narkotika"];
  const limited = ["oot", "prekursor"];
  const byKode = (k) => DB.obat.find((o) => o.kode === k);

  // Keranjang contoh agar layar kasir terbuka dalam keadaan realistis
  let cart = [
    { kode: "OB0001", qty: 2, unit: "Strip" },
    { kode: "OB0023", qty: 1, unit: "Tube" },
    { kode: "OB0009", qty: 1, unit: "Botol" },
  ];
  let customer = "MB-00121";
  let filter = { kat: "Semua", q: "" };
  let invSeq = 413;
  const held = [
    { no: "HOLD-01", pelanggan: "Umum", item: 3, total: 58500, jam: "10:21" },
    { no: "HOLD-02", pelanggan: "Siti Aminah", item: 2, total: 41000, jam: "10:35" },
  ];

  const cabangId = (state) => (state.cabang === "ALL" ? "PST" : state.cabang);
  const unitPrice = (o, unit) => (unit === "Tablet" || unit === "Kapsul" || unit === "Kaplet" ? Math.round(o.hargaJual / o.isi / 100) * 100 : o.hargaJual);
  const member = () => DB.pelanggan.find((p) => p.id === customer);
  const discRate = () => ({ "Member Gold": 0.05, "Member Silver": 0.03, "Member Reguler": 0.01 }[member()?.tipe] || 0);

  function totals() {
    const sub = cart.reduce((s, c) => s + unitPrice(byKode(c.kode), c.unit) * c.qty, 0);
    const disc = Math.round(sub * discRate());
    const after = sub - disc;
    const round = (Math.ceil(after / 100) * 100) - after;
    const grand = after + round;
    const dpp = Math.round(grand / 1.11);
    return { sub, disc, round, grand, dpp, ppn: grand - dpp, items: cart.reduce((s, c) => s + c.qty, 0) };
  }

  function gridHTML(state) {
    const cb = cabangId(state);
    const q = filter.q.toLowerCase();
    const list = DB.obat.filter((o) => (filter.kat === "Semua" || o.kategori === filter.kat) && (!q || (o.nama + o.generik + o.barcode + o.kode).toLowerCase().includes(q)));
    if (!list.length) return `<div class="empty" style="grid-column:1/-1">${icon("search_off")}<b>Obat tidak ditemukan</b><span>Coba nama generik, kode, atau pindai barcode.</span></div>`;
    return list.map((o) => {
      const s = o.stok[cb] || 0;
      const st = s === 0 ? badge("Habis", "red") : s < o.min ? badge(`Sisa ${s}`, "amber") : badge(`Stok ${s}`, "green");
      const ic = { Sirup: "water_full", Krim: "sanitizer", Salep: "sanitizer", Cairan: "water_drop", "Tetes Mata": "water_drop", Pcs: "medical_services", Serbuk: "grain" }[o.bentuk] || "pill";
      return `<button type="button" class="prod" data-add="${o.kode}" ${s === 0 ? 'aria-disabled="true"' : ""}>
        <span class="st">${st}</span>
        <span class="thumb">${icon(ic)}</span>
        <span class="nm">${esc(o.nama)}</span>
        <span class="ds">${esc(o.generik)}</span>
        <span class="foot">${golongan(o.golongan)}</span>
        <span class="foot"><span class="pr">${rp(o.hargaJual)}</span><span class="ds">/${esc(o.satuan)}</span></span>
      </button>`;
    }).join("");
  }

  function cartHTML() {
    if (!cart.length) return `<div class="empty">${icon("shopping_basket")}<b>Keranjang kosong</b><span>Pindai barcode atau pilih obat di sebelah kiri.</span></div>`;
    return cart.map((c, i) => {
      const o = byKode(c.kode);
      const units = [o.satuan, ...(o.isi > 1 ? [o.bentuk.split(" ")[0]] : [])];
      const flag = needsRx.includes(o.golongan) ? badge("Wajib resep", "red", { icon: "prescriptions" }) : limited.includes(o.golongan) ? badge("Dibatasi", "amber", { icon: "front_hand" }) : "";
      return `<div class="ci">
        <div><div class="nm">${esc(o.nama)}</div><div class="meta">${rp(unitPrice(o, c.unit))} / ${esc(c.unit)} · Rak ${esc(o.rak)} ${flag}</div></div>
        <div class="tot">${rp(unitPrice(o, c.unit) * c.qty)}</div>
        <div class="row" style="gap:8px">
          <div class="qty"><button type="button" data-dec="${i}" aria-label="Kurangi">−</button><span>${c.qty}</span><button type="button" data-inc="${i}" aria-label="Tambah">+</button></div>
          <select class="select sm" data-unit="${i}" style="width:auto" aria-label="Satuan">${units.map((u) => `<option ${u === c.unit ? "selected" : ""}>${esc(u)}</option>`).join("")}</select>
        </div>
        <div style="text-align:right">${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus item", attrs: `data-del="${i}"` })}</div>
      </div>`;
    }).join("");
  }

  function sumHTML() {
    const t = totals();
    const m = member();
    return `
      <div class="r"><span>Subtotal (${t.items} item)</span><b>${rp(t.sub)}</b></div>
      <div class="r"><span>Diskon ${m && discRate() ? esc(m.tipe) + " " + discRate() * 100 + "%" : "member"}</span><b style="color:var(--t-red-fg)">− ${rp(t.disc)}</b></div>
      <div class="r"><span>Pembulatan</span><b>${rp(t.round)}</b></div>
      <div class="r muted small"><span>DPP ${rp(t.dpp)} · PPN 11% (termasuk)</span><span>${rp(t.ppn)}</span></div>
      <div class="dashed"></div>
      <div class="r" style="align-items:baseline"><span class="strong">TOTAL BAYAR</span><span class="grand">${rp(t.grand)}</span></div>`;
  }

  function refresh(root, state) {
    root.querySelector("#pos-grid").innerHTML = gridHTML(state);
    root.querySelector("#cart-items").innerHTML = cartHTML();
    root.querySelector("#cart-sum").innerHTML = sumHTML();
    root.querySelector("#cart-count").textContent = cart.length;
    const m = member();
    root.querySelector("#cust-info").innerHTML = m && m.id !== "UMUM"
      ? `${esc(m.tipe)} · ${num(m.poin)} poin${m.alergi !== "-" ? ` · <b style="color:#ffd5db">Alergi: ${esc(m.alergi)}</b>` : ""}`
      : "Tanpa member · tidak dapat poin";
  }

  function addItem(kode, root, state) {
    const o = byKode(kode);
    if (!o) return;
    const s = o.stok[cabangId(state)] || 0;
    if (s === 0) { toast(`${o.nama} habis di cabang ini. Cek stok cabang lain atau buat mutasi.`, "danger"); return; }
    const doAdd = () => {
      const ex = cart.find((c) => c.kode === kode && c.unit === o.satuan);
      if (ex) ex.qty++; else cart.push({ kode, qty: 1, unit: o.satuan });
      refresh(root, state);
      if (limited.includes(o.golongan)) toast(`${o.nama}: golongan ${DB.golonganLabel[o.golongan]}, penjualan dibatasi maks. 1 strip per pasien`, "warn");
      else toast(`${o.nama} ditambahkan`, "success");
    };
    if (o.golongan === "narkotika" || o.golongan === "psikotropika") {
      confirmBox({
        title: "Obat wajib resep asli", icon: "shield",
        msg: `<b>${esc(o.nama)}</b> termasuk ${DB.golonganLabel[o.golongan]}. Penyerahan hanya dengan resep asli dokter dan dicatat untuk laporan SIPNAP. Lanjutkan melalui menu Resep Dokter?`,
        okLabel: "Buka Resep Dokter", okVariant: "purple", onOk: () => APP.go("resep"),
      });
      return;
    }
    if (o.golongan === "keras") {
      confirmBox({
        title: "Obat keras", icon: "prescriptions",
        msg: `<b>${esc(o.nama)}</b> adalah obat keras (logo K). Pastikan pasien membawa resep dokter atau obat termasuk daftar OWA (Obat Wajib Apotek) dan telah dikonfirmasi apoteker.`,
        okLabel: "Sudah dicek, tambahkan", okVariant: "success", onOk: doAdd,
      });
      return;
    }
    doAdd();
  }

  function openPay(root, state) {
    if (!cart.length) { toast("Keranjang masih kosong", "warn"); return; }
    const t = totals();
    const quick = [t.grand, Math.ceil(t.grand / 50000) * 50000, Math.ceil(t.grand / 100000) * 100000, Math.ceil(t.grand / 100000) * 100000 + 100000].filter((v, i, a) => a.indexOf(v) === i);
    const methods = [["payments", "Tunai"], ["qr_code_2", "QRIS"], ["credit_card", "Debit"], ["credit_score", "Kartu Kredit"], ["account_balance", "Transfer"], ["schedule", "Tempo / Piutang"]];
    const el = modal.open({
      title: "Pembayaran", icon: "point_of_sale", size: "lg",
      body: `
        <div class="grid g-2">
          <div class="stack">
            <div class="big-total"><div class="l">Total yang harus dibayar</div><div class="v">${rp(t.grand)}</div><div class="small" style="color:#d4e7ff">${t.items} item · ${esc(member()?.nama || "Umum")}</div></div>
            <div class="lbl-sm">Metode pembayaran</div>
            <div class="pay-methods" id="pay-methods">${methods.map(([ic, l], i) => `<button type="button" class="pay-m ${i === 0 ? "active" : ""}" data-m="${l}">${icon(ic)}${l}</button>`).join("")}</div>
            <div class="alert info" id="pay-note">${icon("info")}<div><b>Tunai</b>Masukkan nominal uang yang diterima, kembalian dihitung otomatis.</div></div>
          </div>
          <div class="stack">
            ${UI.input("Uang diterima", { id: "pay-cash", type: "text", value: num(quick[1] || t.grand), size: "lg", attrs: 'inputmode="numeric" autocomplete="off"' })}
            <div class="row">${quick.map((v) => btn(v === t.grand ? "Uang pas" : num(v), "light", { size: "sm", attrs: `data-quick="${v}"` })).join("")}</div>
            <div class="numpad" id="numpad">${["7", "8", "9", "⌫", "4", "5", "6", "C", "1", "2", "3", "00", "0", "000"].map((k) => `<button type="button" data-k="${k}" ${k === "000" ? 'style="grid-column:span 2"' : ""}>${k}</button>`).join("")}</div>
            <div class="card" style="box-shadow:none"><div class="card-body"><dl class="kv">
              <dt>Total</dt><dd>${rp(t.grand)}</dd>
              <dt>Dibayar</dt><dd id="pay-paid">-</dd>
              <dt class="strong">Kembalian</dt><dd id="pay-change" style="font-size:20px;color:var(--c-success)">-</dd>
            </dl></div></div>
          </div>
        </div>`,
      foot: `${btn("Kembali", "dark", { icon: "arrow_back", attrs: "data-close" })}${btn("Simpan & Cetak Struk", "success", { icon: "print", size: "lg", attrs: 'id="pay-done"' })}`,
    });
    const cash = el.querySelector("#pay-cash");
    let method = "Tunai";
    const parse = () => parseInt(cash.value.replace(/\D/g, ""), 10) || 0;
    const upd = () => {
      const v = method === "Tunai" ? parse() : t.grand;
      el.querySelector("#pay-paid").textContent = rp(v);
      const ch = v - t.grand;
      const chEl = el.querySelector("#pay-change");
      chEl.textContent = ch < 0 ? `Kurang ${rp(-ch)}` : rp(ch);
      chEl.style.color = ch < 0 ? "var(--c-danger)" : "var(--c-success)";
      el.querySelector("#pay-done").disabled = ch < 0;
    };
    cash.addEventListener("input", () => { const v = parse(); cash.value = v ? num(v) : ""; upd(); });
    el.querySelectorAll("[data-quick]").forEach((b) => b.addEventListener("click", () => { cash.value = num(+b.dataset.quick); upd(); }));
    el.querySelector("#numpad").addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]")?.dataset.k; if (!k) return;
      let s = String(parse());
      if (k === "C") s = "0"; else if (k === "⌫") s = s.slice(0, -1) || "0"; else s = (s === "0" ? "" : s) + k;
      cash.value = num(+s); upd();
    });
    const notes = {
      Tunai: "Masukkan nominal uang yang diterima, kembalian dihitung otomatis.",
      QRIS: "Tampilkan QR dinamis di layar pelanggan. Status pembayaran terverifikasi otomatis.",
      Debit: "Gesek/tap kartu di mesin EDC, masukkan 6 digit terakhir no. approval.",
      "Kartu Kredit": "Gunakan EDC bank. Biaya MDR 1,8% ditanggung apotek.",
      Transfer: "Transfer ke BCA 123-456-7890 a.n. PT Sehat Bersama Farma. Unggah bukti transfer.",
      "Tempo / Piutang": "Hanya untuk pelanggan B2B (klinik/praktik) dengan limit kredit aktif. Butuh persetujuan supervisor.",
    };
    el.querySelector("#pay-methods").addEventListener("click", (e) => {
      const b = e.target.closest(".pay-m"); if (!b) return;
      method = b.dataset.m;
      el.querySelectorAll(".pay-m").forEach((x) => x.classList.toggle("active", x === b));
      el.querySelector("#pay-note").innerHTML = `${icon("info")}<div><b>${esc(method)}</b>${notes[method]}</div>`;
      cash.disabled = method !== "Tunai";
      upd();
    });
    el.querySelector("#pay-done").addEventListener("click", () => {
      const paid = method === "Tunai" ? parse() : t.grand;
      showReceipt(root, state, { ...t, method, paid });
    });
    upd();
  }

  function showReceipt(root, state, t) {
    const cb = DB.cabang.find((c) => c.id === cabangId(state));
    const no = `INV/${cb.id}/${DB.iso(DB.TODAY).slice(8, 10)}${DB.iso(DB.TODAY).slice(5, 7)}/${String(invSeq).padStart(4, "0")}`;
    const now = new Date();
    const lines = cart.map((c) => { const o = byKode(c.kode); const p = unitPrice(o, c.unit); return `<div>${esc(o.nama)}</div><div class="r"><span>${c.qty} ${esc(c.unit)} x ${num(p)}</span><span>${num(p * c.qty)}</span></div>`; }).join("");
    const m = member();
    modal.open({
      title: "Transaksi berhasil", icon: "check_circle", size: "sm",
      body: `
        ${UI.alert("success", "task_alt", `Pembayaran ${esc(t.method)} diterima`, `Kembalian <b>${rp(t.paid - t.grand)}</b>. Stok berkurang otomatis (FEFO).`)}
        <div class="receipt">
          <div class="c"><b>${esc(DB.apotek.nama.toUpperCase())}</b><br>${esc(cb.nama)}<br>${esc(DB.apotek.telp)}<br>${esc(DB.apotek.sia)}</div><hr>
          <div class="r"><span>${no}</span></div>
          <div class="r"><span>${now.toLocaleDateString("id-ID")} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span><span>Kasir: Fikri</span></div>
          <div>Pelanggan: ${esc(m?.nama || "Umum")}</div><hr>
          ${lines}<hr>
          <div class="r"><span>Subtotal</span><span>${num(t.sub)}</span></div>
          <div class="r"><span>Diskon member</span><span>-${num(t.disc)}</span></div>
          <div class="r"><span>Pembulatan</span><span>${num(t.round)}</span></div>
          <div class="r"><b>TOTAL</b><b>${num(t.grand)}</b></div>
          <div class="r"><span>${esc(t.method)}</span><span>${num(t.paid)}</span></div>
          <div class="r"><span>Kembali</span><span>${num(t.paid - t.grand)}</span></div>
          <div class="r"><span>DPP / PPN 11%</span><span>${num(t.dpp)} / ${num(t.ppn)}</span></div><hr>
          ${m && m.id !== "UMUM" ? `<div class="c">Poin didapat: +${Math.floor(t.grand / 10000)} · Total ${num(m.poin + Math.floor(t.grand / 10000))}</div><hr>` : ""}
          <div class="c">Apoteker: ${esc(cb.apoteker)}<br>Simpan obat di tempat sejuk & kering.<br>Semoga lekas sembuh.</div>
        </div>`,
      foot: `${btn("Kirim WhatsApp", "success", { icon: "chat", attrs: 'data-toast="Struk digital dikirim ke WhatsApp pelanggan"' })}${btn("Cetak Ulang", "teal", { icon: "print", attrs: 'data-toast="Struk dikirim ke printer thermal 80 mm"' })}${btn("Transaksi Baru", "primary", { icon: "add_shopping_cart", attrs: 'id="new-trx"' })}`,
    });
    document.getElementById("new-trx").addEventListener("click", () => {
      cart = []; customer = "UMUM"; invSeq++;
      modal.close();
      const sel = root.querySelector("#pos-cust"); if (sel) sel.value = customer;
      root.querySelector("#pos-inv").textContent = `INV/${cb.id}/${DB.iso(DB.TODAY).slice(8, 10)}${DB.iso(DB.TODAY).slice(5, 7)}/${String(invSeq).padStart(4, "0")}`;
      refresh(root, state);
      root.querySelector("#pos-scan").focus();
    });
  }

  function openHeld() {
    modal.open({
      title: "Transaksi ditahan", icon: "pause_circle",
      body: UI.table({
        columns: [
          { label: "No", render: (r) => `<span class="mono strong">${r.no}</span>` },
          { label: "Pelanggan", key: "pelanggan" }, { label: "Jam", key: "jam" },
          { label: "Item", cls: "num", key: "item" }, { label: "Total", cls: "num", render: (r) => rp(r.total) },
          { label: "", cls: "actions", render: (r) => btn("Lanjutkan", "primary", { size: "sm", icon: "play_arrow", attrs: `data-toast="${r.no} dimuat ke keranjang" data-close` }) + " " + btn("", "danger", { size: "sm", icon: "delete", title: "Hapus", attrs: `data-toast="${r.no} dihapus" data-tone="danger" data-close` }) },
        ],
        rows: held,
      }),
    });
  }

  window.PAGES.kasir = {
    render({ state }) {
      const cb = DB.cabang.find((c) => c.id === cabangId(state));
      return `
      ${UI.pageHeader({
        title: "Kasir Penjualan",
        sub: `${esc(cb.nama)} · Kasir 01 · Shift Pagi (07.00–15.00). ${state.cabang === "ALL" ? "Mode konsolidasi: transaksi dicatat ke Cabang Pusat." : ""}`,
        crumbs: ["Transaksi", "Kasir (POS)"],
        actions: `${btn("Resep Dokter", "purple", { icon: "prescriptions", attrs: 'data-go="resep"' })}${btn("Racikan", "purple", { icon: "science", attrs: 'data-go="racikan"' })}${btn(`Ditahan (${held.length})`, "warning", { icon: "pause_circle", attrs: 'id="btn-held"' })}${btn("Riwayat", "glass", { icon: "history", attrs: 'data-go="riwayat"' })}`,
      })}
      <div class="pos">
        <div class="pos-left">
          <section class="card">
            <div class="scan-bar">
              <div class="input-icon">${icon("barcode_scanner")}<input id="pos-scan" class="input lg" type="search" placeholder="Pindai barcode atau ketik nama obat / zat aktif… (F1)" aria-label="Cari obat" autocomplete="off"></div>
              ${btn("Cari", "primary", { icon: "search", size: "lg", attrs: 'id="pos-search-btn"' })}
              ${btn("Cek Harga", "info", { icon: "sell", size: "lg", attrs: 'data-toast="Mode cek harga aktif: pindai barcode untuk melihat harga tanpa menambah ke keranjang" data-tone="info"' })}
            </div>
            <div style="padding:0 14px 6px">
              <div class="chips" data-chip-group="kat" id="pos-kat">
                ${["Semua", ...DB.kategori].map((k) => `<button type="button" class="chip ${k === filter.kat ? "active" : ""}" data-kat="${esc(k)}">${esc(k)}</button>`).join("")}
              </div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><div class="card-icon">${icon("medication")}</div><div><h3>Daftar obat</h3><div class="desc">Klik untuk menambah ke keranjang. Obat keras & psikotropika meminta konfirmasi resep.</div></div>
              <div class="tools">${UI.legend([["Bebas", "#22a447"], ["Bebas terbatas", "#1e6fd9"], ["Keras / psikotropika", "#e02424"], ["OOT", "#f59e0b"], ["Prekursor", "#7c3aed"]])}</div></div>
            <div class="prod-grid" id="pos-grid"></div>
          </section>
        </div>

        <aside class="card cart" aria-label="Keranjang">
          <div class="cart-head">
            <div class="row between"><span class="ttl">${icon("shopping_cart")} Keranjang <span class="badge solid" id="cart-count">0</span></span><span class="inv" id="pos-inv">INV/${cb.id}/${DB.iso(DB.TODAY).slice(8, 10)}${DB.iso(DB.TODAY).slice(5, 7)}/${String(invSeq).padStart(4, "0")}</span></div>
            <div class="cart-cust">${icon("person")}
              <div style="flex:1;min-width:0">
                <select id="pos-cust" class="select sm" aria-label="Pelanggan" style="background:rgba(255,255,255,.95);color:#0f1e3a;border:0">${DB.pelanggan.map((p) => `<option value="${p.id}" ${p.id === customer ? "selected" : ""}>${esc(p.nama)}${p.id !== "UMUM" ? " · " + p.id : ""}</option>`).join("")}</select>
                <div class="small" id="cust-info" style="margin-top:4px;color:#d7e8ff"></div>
              </div>
              ${btn("", "white", { icon: "person_add", size: "sm", title: "Tambah member baru", attrs: 'data-go="pelanggan"' })}
            </div>
          </div>
          <div class="cart-items" id="cart-items"></div>
          <div class="cart-sum" id="cart-sum"></div>
          <div class="cart-actions">
            ${btn("Tahan", "warning", { icon: "pause", attrs: 'id="btn-hold"' })}
            ${btn("Diskon", "pink", { icon: "sell", attrs: 'id="btn-disc"' })}
            ${btn("Batal", "danger", { icon: "close", attrs: 'id="btn-cancel"' })}
            ${btn("Bayar (F12)", "success", { icon: "payments", size: "xl", block: true, attrs: 'id="btn-pay" style="grid-column:1/-1"' })}
          </div>
          <div class="hotkeys"><span><kbd>F1</kbd> Cari</span><span><kbd>F2</kbd> Kasir</span><span><kbd>F4</kbd> Tahan</span><span><kbd>F8</kbd> Pelanggan</span><span><kbd>F12</kbd> Bayar</span><span><kbd>Esc</kbd> Tutup</span></div>
        </aside>
      </div>`;
    },

    mount(root, { state }) {
      refresh(root, state);
      const scan = root.querySelector("#pos-scan");
      const doSearch = () => {
        const v = scan.value.trim();
        const exact = DB.obat.find((o) => o.barcode === v || o.kode.toLowerCase() === v.toLowerCase());
        if (exact) { addItem(exact.kode, root, state); scan.value = ""; filter.q = ""; }
        else filter.q = v;
        root.querySelector("#pos-grid").innerHTML = gridHTML(state);
      };
      scan.addEventListener("input", () => { filter.q = scan.value.trim(); root.querySelector("#pos-grid").innerHTML = gridHTML(state); });
      scan.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
      root.querySelector("#pos-search-btn").addEventListener("click", doSearch);
      root.querySelector("#pos-kat").addEventListener("click", (e) => {
        const c = e.target.closest("[data-kat]"); if (!c) return;
        filter.kat = c.dataset.kat; root.querySelector("#pos-grid").innerHTML = gridHTML(state);
      });
      root.querySelector("#pos-grid").addEventListener("click", (e) => { const p = e.target.closest("[data-add]"); if (p) addItem(p.dataset.add, root, state); });
      root.querySelector("#cart-items").addEventListener("click", (e) => {
        const t = e.target.closest("[data-inc],[data-dec],[data-del]"); if (!t) return;
        if (t.dataset.inc !== undefined) cart[+t.dataset.inc].qty++;
        if (t.dataset.dec !== undefined) { const c = cart[+t.dataset.dec]; c.qty--; if (c.qty <= 0) cart.splice(+t.dataset.dec, 1); }
        if (t.dataset.del !== undefined) cart.splice(+t.dataset.del, 1);
        refresh(root, state);
      });
      root.querySelector("#cart-items").addEventListener("change", (e) => {
        const s = e.target.closest("[data-unit]"); if (!s) return;
        cart[+s.dataset.unit].unit = s.value; refresh(root, state);
      });
      root.querySelector("#pos-cust").addEventListener("change", (e) => {
        customer = e.target.value; refresh(root, state);
        const m = member();
        if (m && m.alergi !== "-") toast(`Perhatian: ${m.nama} alergi ${m.alergi}`, "warn");
      });
      root.querySelector("#btn-pay").addEventListener("click", () => openPay(root, state));
      root.querySelector("#btn-held").addEventListener("click", openHeld);
      root.querySelector("#btn-hold").addEventListener("click", () => {
        if (!cart.length) { toast("Tidak ada transaksi untuk ditahan", "warn"); return; }
        const t = totals();
        held.push({ no: `HOLD-0${held.length + 1}`, pelanggan: member()?.nama || "Umum", item: t.items, total: t.grand, jam: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) });
        cart = []; refresh(root, state);
        root.querySelector("#btn-held span:last-child").textContent = `Ditahan (${held.length})`;
        toast("Transaksi ditahan. Buka lagi dari tombol Ditahan.", "info");
      });
      root.querySelector("#btn-cancel").addEventListener("click", () => {
        if (!cart.length) return;
        confirmBox({ title: "Batalkan transaksi?", icon: "delete_forever", msg: "Semua item di keranjang akan dihapus. Tindakan ini tercatat di log aktivitas.", okLabel: "Ya, batalkan", onOk: () => { cart = []; refresh(root, state); toast("Transaksi dibatalkan", "danger"); } });
      });
      root.querySelector("#btn-disc").addEventListener("click", () => {
        modal.open({
          title: "Diskon & promo", icon: "sell", size: "sm",
          body: `${UI.select("Jenis diskon", ["Diskon member otomatis", "Diskon persen (%)", "Potongan nominal (Rp)", "Voucher promo", "Tukar poin (100 poin = Rp 10.000)"])}
            ${UI.input("Nilai", { value: "5", hint: "Diskon manual di atas 10% membutuhkan PIN supervisor." })}
            ${UI.input("PIN supervisor", { type: "password", ph: "••••••" })}`,
          foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Terapkan Diskon", "pink", { icon: "check", attrs: 'data-toast="Diskon diterapkan" data-close' })}`,
        });
      });
      const keys = (e) => {
        if (APP.state.route !== "kasir") { document.removeEventListener("keydown", keys); return; }
        if (e.key === "F12") { e.preventDefault(); openPay(root, state); }
        if (e.key === "F1") { e.preventDefault(); scan.focus(); }
        if (e.key === "F4") { e.preventDefault(); root.querySelector("#btn-hold").click(); }
        if (e.key === "F8") { e.preventDefault(); root.querySelector("#pos-cust").focus(); }
      };
      document.removeEventListener("keydown", window.__posKeys || (() => {}));
      window.__posKeys = keys;
      document.addEventListener("keydown", keys);
    },
  };
})();
