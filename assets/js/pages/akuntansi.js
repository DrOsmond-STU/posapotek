/* Akuntansi: Chart of Account, Jurnal Umum, Kartu Buku Besar, Neraca Saldo, Neraca.
   Semua halaman membaca window.GL (assets/js/akuntansi.js) sehingga saling terintegrasi
   dengan Laba Rugi & Laporan Konsolidasi. */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, pct, short, badge, esc, tgl, tabs, input, select, alert, modal, toast, confirmBox, chart, rpTick, areaFill, legend } = UI;

  /* ---------- helper ---------- */
  const acc = (v) => (Math.round(v) === 0 ? `<span class="muted">—</span>` : v < 0 ? `(${num(-v)})` : num(v));
  const dcell = (v) => `<td class="num">${v > 0 ? num(v) : `<span class="muted">—</span>`}</td>`;
  const dk = (v) => (Math.round(v) === 0 ? `${dcell(0)}${dcell(0)}` : v > 0 ? `${dcell(v)}${dcell(0)}` : `${dcell(0)}${dcell(-v)}`);
  const scopeLbl = (st) => (st.cabang === "ALL" ? "Gabungan semua cabang" : UI.cabangNama(st.cabang));
  const scopeCab = (st) => st.cabang || "ALL";
  const cabShort = (id) => UI.cabangNama(id).replace(/^Cabang\s+/, "");
  const TIPE_TONE = { Aset: "blue", Liabilitas: "amber", Ekuitas: "purple", Pendapatan: "green", HPP: "red", Beban: "pink", "Lain-lain": "cyan", Pajak: "gray" };
  const tipeBadge = (t) => badge(t, TIPE_TONE[t] || "gray");
  const normalBadge = (n) => badge(n === "D" ? "Debit" : "Kredit", n === "D" ? "blue" : "amber");
  const sumberBadge = (s) => badge(s, GL.SUMBER_TONE[s] || "gray");
  const cabBadge = (id) => `<span class="badge gray">${esc(id)}</span>`;
  // saldo ditampilkan menurut sisi normal akun (positif = normal)
  const normalSaldo = (a, v) => (a.normal === "D" ? v : -v);
  const akunOptions = (sel) => {
    const groups = {};
    GL.DETAIL.forEach((a) => { (groups[a.tipe] = groups[a.tipe] || []).push(a); });
    return Object.entries(groups).map(([t, list]) => `<optgroup label="${esc(t)}">${list.map((a) => `<option value="${a.kode}" ${a.kode === sel ? "selected" : ""}>${a.kode} · ${esc(a.nama)}</option>`).join("")}</optgroup>`).join("");
  };
  const toLedger = (kode) => `data-ledger="${kode}"`;
  const bindLedgerLinks = (root) => root.querySelectorAll("[data-ledger]").forEach((b) => b.addEventListener("click", () => { GL.ui.akun = b.dataset.ledger; UI.modal.close(); APP.go("bukubesar"); }));
  const periodeTxt = () => { const p = GL.periode(); return `${p.label} (1–${Number(p.to.slice(8))})`; };
  const integrasi = (active) => {
    const items = [["coa", "Chart of Account", "account_tree"], ["jurnal", "Jurnal Umum", "edit_note"], ["bukubesar", "Buku Besar", "menu_book"], ["neracasaldo", "Neraca Saldo", "balance"], ["lap-labarugi", "Laba Rugi", "trending_up"], ["neraca", "Neraca", "account_balance"], ["lap-konsolidasi", "Konsolidasi", "hub"]];
    return `<div class="card" style="padding:12px 16px"><div class="row" style="gap:6px">
      <span class="small muted strong" style="margin-right:4px">${icon("sync_alt")} Alur terintegrasi:</span>
      ${items.map(([id, l, ic], i) => `${i ? `<span class="muted">${icon("chevron_right")}</span>` : ""}<button type="button" class="chip ${id === active ? "active" : ""}" data-go="${id}">${icon(ic)}${l}</button>`).join("")}
    </div></div>`;
  };

  /* =====================================================================
     1. CHART OF ACCOUNT
     ===================================================================== */
  window.PAGES.coa = {
    render({ state }) {
      const cab = scopeCab(state);
      const tb = GL.trial(cab);
      const saldo = {};
      tb.forEach((r) => { saldo[r.kode] = r.akhir; });
      // roll-up saldo ke akun induk
      GL.COA.slice().reverse().forEach((a) => { if (a.parent) saldo[a.parent] = (saldo[a.parent] || 0) + (saldo[a.kode] || 0); });
      const det = GL.DETAIL.length;
      const tot = tb.reduce((a, r) => a + r.akhir, 0);
      const count = (t) => GL.DETAIL.filter((a) => a.tipe === t).length;

      const rows = GL.COA.map((a) => {
        const s = normalSaldo(a, saldo[a.kode] || 0);
        return `<tr data-tipe="${a.tipe}" data-q="${esc((a.kode + " " + a.nama).toLowerCase())}" class="${a.header && a.level <= 2 ? "group" : ""}">
          <td><span class="mono ${a.header ? "strong" : ""}" style="padding-left:${(a.level - 1) * 16}px">${a.kode}</span></td>
          <td class="${a.header ? "strong" : ""}" style="padding-left:${(a.level - 1) * 16 + 14}px">${a.header ? icon(a.level === 1 ? "folder" : "folder_open", "") + " " : ""}${esc(a.nama)}</td>
          <td>${a.level > 1 ? tipeBadge(a.tipe) : ""}</td>
          <td>${a.level > 1 ? `<span class="small">${a.laporan}</span>` : ""}</td>
          <td>${a.header ? badge("Header", "gray") : normalBadge(a.normal)}</td>
          <td class="num ${a.header ? "strong" : ""}">${acc(s)}</td>
          <td class="actions">${a.header ? "" : `<div class="btn-group">${btn("", "info", { icon: "menu_book", size: "sm", title: "Buka buku besar", attrs: toLedger(a.kode) })}${btn("", "warning", { icon: "edit", size: "sm", title: "Ubah akun", attrs: `data-edit-akun="${a.kode}"` })}${btn("", "danger", { icon: "block", size: "sm", title: "Nonaktifkan", attrs: `data-toast="Akun ${a.kode} tidak dapat dinonaktifkan karena masih bersaldo / dipakai pemetaan otomatis" data-tone="warn"` })}</div>`}</td>
        </tr>`;
      }).join("");

      return `
      ${UI.pageHeader({
        title: "Chart of Account (COA)",
        sub: `Bagan akun standar apotek (mengacu SAK EP) untuk ${esc(scopeLbl(state))}. Saldo per ${tgl(GL.periode().to)} dihitung langsung dari jurnal.`,
        crumbs: ["Akuntansi", "Chart of Account"],
        actions: `${btn("Tambah Akun", "success", { icon: "add", attrs: 'id="coa-add"' })}${btn("Import Excel", "teal", { icon: "upload_file", attrs: 'data-toast="Template impor COA (.xlsx) siap diunggah" data-tone="info"' })}${btn("Ekspor", "glass", { icon: "download", attrs: 'data-toast="COA diekspor ke Excel"' })}`,
      })}
      ${integrasi("coa")}
      <div class="grid g-4">
        ${stat({ label: "Akun detail (posting)", value: num(det), icon: "account_tree", tone: "primary", foot: `${GL.COA.length - det} akun header · 4 level`, hero: true })}
        ${stat({ label: "Akun neraca", value: num(count("Aset") + count("Liabilitas") + count("Ekuitas")), icon: "account_balance", tone: "info", foot: `Aset ${count("Aset")} · Liabilitas ${count("Liabilitas")} · Ekuitas ${count("Ekuitas")}` })}
        ${stat({ label: "Akun laba rugi", value: num(det - count("Aset") - count("Liabilitas") - count("Ekuitas")), icon: "trending_up", tone: "success", foot: `Pendapatan ${count("Pendapatan")} · HPP ${count("HPP")} · Beban ${count("Beban")}` })}
        ${stat({ label: "Kontrol saldo", value: Math.round(tot) === 0 ? "Seimbang" : rp(tot), icon: Math.round(tot) === 0 ? "verified" : "error", tone: Math.round(tot) === 0 ? "teal" : "danger", foot: "Σ debit − Σ kredit seluruh akun = 0" })}
      </div>
      <div>${tabs("coa-tab", [{ id: "daftar", label: "Daftar Akun", icon: "list" }, { id: "map", label: "Pemetaan Jurnal Otomatis", icon: "hub", n: GL.MAPPING.length }, { id: "struktur", label: "Struktur Kode", icon: "schema" }], "daftar")}</div>

      <div data-panel-group="coa-tab" data-panel="daftar">
        ${card({
          title: "Daftar akun", desc: "Klik ikon buku untuk membuka kartu buku besar akun", icon: "list_alt", flush: true,
          tools: `<div class="input-icon" style="min-width:200px">${icon("search")}<input id="coa-q" class="input sm" type="search" placeholder="Cari kode / nama akun" aria-label="Cari akun"></div>`,
          body: `<div style="padding:12px 20px 4px"><div class="chips" data-chip-group="coa-tipe" id="coa-tipe">${["Semua", ...Object.values(GL.TIPE)].map((t, i) => `<button type="button" class="chip ${i ? "" : "active"}" data-t="${t}">${t}</button>`).join("")}</div></div>
            <div class="table-wrap"><table class="tbl compact" id="coa-table"><thead><tr><th>Kode</th><th>Nama akun</th><th>Tipe</th><th>Laporan</th><th>Saldo normal</th><th class="num">Saldo (Rp)</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`,
        })}
      </div>

      <div data-panel-group="coa-tab" data-panel="map" hidden>
        ${card({
          title: "Pemetaan jurnal otomatis", desc: "Setiap transaksi operasional langsung membentuk jurnal ke akun berikut (dapat diubah per cabang)", icon: "hub", tone: "purple", flush: true,
          body: UI.table({
            columns: [
              { label: "Transaksi / modul", render: (r) => `<b>${esc(r[0])}</b>` },
              { label: "Debit", render: (r) => esc(r[1]) },
              { label: "Kredit", render: (r) => esc(r[2]) },
              { label: "Kode akun (D / K)", render: (r) => `<span class="mono small">${esc(r[3])}</span>` },
              { label: "Status", render: () => badge("Otomatis", "green", { dot: true }) },
              { label: "", cls: "actions", render: (r) => btn("Buka modul", "info", { size: "sm", icon: "open_in_new", attrs: `data-go="${r[4]}"` }) },
            ],
            rows: GL.MAPPING,
          }),
          foot: `<span class="small muted">${icon("info")} Jurnal otomatis diposting real-time saat transaksi disimpan. Perubahan pemetaan hanya berlaku untuk transaksi berikutnya dan tercatat di log aktivitas.</span>`,
        })}
      </div>

      <div data-panel-group="coa-tab" data-panel="struktur" hidden>
        <div class="grid g-2">
          ${card({
            title: "Format kode akun", icon: "schema", tone: "cyan",
            body: `<div class="stack">
              <div class="mono" style="font-size:22px;font-weight:700">1 - 1 1 0 3</div>
              <dl class="kv" style="grid-template-columns:auto 1fr">
                <dt>Digit 1</dt><dd style="text-align:left">Kelompok (1 Aset … 8 Pajak)</dd>
                <dt>Digit 2</dt><dd style="text-align:left">Golongan (lancar / tidak lancar)</dd>
                <dt>Digit 3</dt><dd style="text-align:left">Sub golongan (kas, piutang, persediaan)</dd>
                <dt>Digit 4–5</dt><dd style="text-align:left">Nomor urut akun detail</dd>
              </dl>
              ${alert("info", "lightbulb", "Hanya akun detail yang bisa diposting", "Akun header menjumlahkan saldo akun di bawahnya secara otomatis.")}
            </div>`,
          })}
          ${card({
            title: "Kelompok akun", icon: "category", flush: true,
            body: UI.table({
              columns: [{ label: "Kode", render: (r) => `<span class="mono strong">${r[0]}</span>` }, { label: "Kelompok", render: (r) => tipeBadge(r[1]) }, { label: "Saldo normal", render: (r) => normalBadge(r[2]) }, { label: "Laporan", key: 3 }],
              rows: [["1", "Aset", "D", "Neraca"], ["2", "Liabilitas", "K", "Neraca"], ["3", "Ekuitas", "K", "Neraca"], ["4", "Pendapatan", "K", "Laba Rugi"], ["5", "HPP", "D", "Laba Rugi"], ["6", "Beban", "D", "Laba Rugi"], ["7", "Lain-lain", "K", "Laba Rugi"], ["8", "Pajak", "D", "Laba Rugi"]],
            }),
          })}
        </div>
      </div>`;
    },
    mount(root) {
      bindLedgerLinks(root);
      const q = root.querySelector("#coa-q");
      let tipe = "Semua";
      const apply = () => {
        const v = q.value.trim().toLowerCase();
        root.querySelectorAll("#coa-table tbody tr").forEach((tr) => {
          const okT = tipe === "Semua" || tr.dataset.tipe === tipe;
          const okQ = !v || tr.dataset.q.includes(v);
          tr.hidden = !(okT && okQ);
        });
      };
      q.addEventListener("input", apply);
      root.querySelector("#coa-tipe").addEventListener("click", (e) => { const c = e.target.closest("[data-t]"); if (c) { tipe = c.dataset.t; apply(); } });
      const openForm = (a) => {
        const heads = GL.COA.filter((x) => x.header && x.level > 1);
        modal.open({
          title: a ? `Ubah akun ${a.kode}` : "Tambah akun", icon: "account_tree",
          body: `<div class="form-grid">
            ${input("Kode akun", { value: a ? a.kode : "1-1105", hint: "Format X-XXXX, unik" })}
            ${input("Nama akun", { value: a ? a.nama : "Bank BRI - Operasional Cabang" })}
            ${select("Akun induk", heads.map((h) => ({ v: h.kode, l: `${h.kode} · ${h.nama}` })), { value: a ? a.parent : "1-1100" })}
            ${select("Saldo normal", [{ v: "D", l: "Debit" }, { v: "K", l: "Kredit" }], { value: a ? a.normal : "D" })}
            ${select("Berlaku untuk", ["Semua cabang", ...DB.cabang.map((c) => c.nama)])}
            ${input("Saldo awal", { value: "0", hint: "Diisi saat migrasi; selanjutnya saldo dari jurnal" })}
            <label class="check full"><input type="checkbox" checked> Akun aktif & dapat dipilih pada jurnal manual</label>
          </div>`,
          foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Akun", "primary", { icon: "save", attrs: `data-toast="Akun ${a ? "diperbarui" : "ditambahkan"}" data-close` })}`,
        });
      };
      root.querySelector("#coa-add").addEventListener("click", () => openForm(null));
      root.querySelectorAll("[data-edit-akun]").forEach((b) => b.addEventListener("click", () => openForm(GL.akun(b.dataset.editAkun))));
    },
  };

  /* =====================================================================
     2. JURNAL UMUM
     ===================================================================== */
  let jFilter = { q: "", sumber: "Semua", limit: 25 };
  const journalRows = (list) => list.map((j) => j.lines.map((l, i) => {
    const a = GL.akun(l.akun);
    return `<tr class="${i === 0 ? "j-first" : ""}" ${i === 0 ? `style="border-top:2px solid var(--border-strong)"` : ""}>
      <td class="nowrap">${i === 0 ? `<b>${tgl(j.tgl)}</b>` : ""}</td>
      <td>${i === 0 ? `<button type="button" class="btn light sm" data-jv="${j.no}" style="font-family:var(--mono)">${j.no}</button><div class="t-sub">${esc(j.ref)}</div>` : ""}</td>
      <td style="padding-left:${l.k ? 34 : 14}px"><button type="button" class="mono small" ${toLedger(l.akun)} style="background:none;border:0;color:var(--c-primary-2);cursor:pointer;padding:0">${l.akun}</button> ${esc(a.nama)}</td>
      <td>${i === 0 ? `${esc(j.ket)}<div class="row" style="gap:4px;margin-top:4px">${cabBadge(j.cabang)} ${sumberBadge(j.sumber)}</div>` : ""}</td>
      ${dcell(l.d)}${dcell(l.k)}
    </tr>`;
  }).join("")).join("");

  function jurnalManual(state, preset) {
    const cab = state.cabang === "ALL" ? "PST" : state.cabang;
    const P = GL.periode();
    const lines = preset ? preset.lines.map((l) => ({ ...l })) : [{ akun: "6-1501", d: 850000, k: 0 }, { akun: "1-1101", d: 0, k: 850000 }];
    const TPL = {
      "": null,
      sewa: { ket: "Pembayaran sewa gedung 12 bulan dibayar dimuka", lines: [{ akun: "1-1403", d: 312000000, k: 0 }, { akun: "1-1103", d: 0, k: 312000000 }] },
      modal: { ket: "Setoran tambahan modal pemegang saham", lines: [{ akun: "1-1103", d: 250000000, k: 0 }, { akun: "3-1101", d: 0, k: 250000000 }] },
      aset: { ket: "Pembelian lemari pendingin vaksin (medical refrigerator)", lines: [{ akun: "1-2101", d: 38500000, k: 0 }, { akun: "1-1103", d: 0, k: 38500000 }] },
      piutang: { ket: "Penghapusan piutang klinik tak tertagih", lines: [{ akun: "6-1901", d: 2750000, k: 0 }, { akun: "1-1201", d: 0, k: 2750000 }] },
    };
    const el = modal.open({
      title: preset ? "Jurnal balik (reversal)" : "Buat jurnal manual", icon: "edit_note", size: "xl",
      body: `
        <div class="form-grid cols-4">
          ${input("Tanggal", { id: "jm-tgl", type: "date", value: P.to, attrs: `min="${P.from}" max="${P.to}"` })}
          ${select("Cabang", DB.cabang.map((c) => ({ v: c.id, l: c.nama })), { id: "jm-cab", value: preset ? preset.cabang : cab })}
          ${input("No. bukti / referensi", { id: "jm-ref", value: preset ? preset.ref : "MEMO/KEU/0928" })}
          ${select("Template", [{ v: "", l: "— Tanpa template —" }, { v: "sewa", l: "Bayar sewa dibayar dimuka" }, { v: "modal", l: "Setoran modal" }, { v: "aset", l: "Pembelian aset tetap" }, { v: "piutang", l: "Hapus piutang tak tertagih" }], { id: "jm-tpl" })}
          ${input("Keterangan", { id: "jm-ket", value: preset ? preset.ket : "Pembelian ATK tambahan untuk kasir", cls: "full" })}
        </div>
        <div class="table-wrap"><table class="tbl compact"><thead><tr><th style="min-width:280px">Akun</th><th class="num" style="min-width:150px">Debit</th><th class="num" style="min-width:150px">Kredit</th><th></th></tr></thead>
          <tbody id="jm-lines"></tbody>
          <tfoot><tr><td>${btn("Tambah baris", "success", { size: "sm", icon: "add", attrs: 'id="jm-add"' })}</td><td class="num" id="jm-td"></td><td class="num" id="jm-tk"></td><td></td></tr></tfoot></table></div>
        <div id="jm-check"></div>`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn("Simpan Draft", "warning", { icon: "draft", attrs: 'data-toast="Draft jurnal disimpan (belum memengaruhi saldo)" data-close' })}${btn("Posting Jurnal", "primary", { icon: "task_alt", attrs: 'id="jm-post"' })}`,
    });
    const tbody = el.querySelector("#jm-lines");
    const draw = () => {
      tbody.innerHTML = lines.map((l, i) => `<tr>
        <td><select class="select sm" data-i="${i}" data-f="akun" aria-label="Akun baris ${i + 1}">${akunOptions(l.akun)}</select></td>
        <td><input class="input sm num" data-i="${i}" data-f="d" inputmode="numeric" value="${l.d ? num(l.d) : ""}" placeholder="0" aria-label="Debit baris ${i + 1}"></td>
        <td><input class="input sm num" data-i="${i}" data-f="k" inputmode="numeric" value="${l.k ? num(l.k) : ""}" placeholder="0" aria-label="Kredit baris ${i + 1}"></td>
        <td class="actions">${btn("", "danger", { icon: "delete", size: "sm", title: "Hapus baris", attrs: `data-del="${i}"` })}</td></tr>`).join("");
      calc();
    };
    const calc = () => {
      const d = lines.reduce((a, l) => a + (+l.d || 0), 0), k = lines.reduce((a, l) => a + (+l.k || 0), 0);
      el.querySelector("#jm-td").innerHTML = `<b>${rp(d)}</b>`;
      el.querySelector("#jm-tk").innerHTML = `<b>${rp(k)}</b>`;
      const ok = d === k && d > 0;
      el.querySelector("#jm-check").innerHTML = ok
        ? alert("success", "check_circle", "Jurnal seimbang", `Total debit = total kredit = ${rp(d)}. Setelah diposting, saldo langsung masuk ke buku besar, neraca saldo, laba rugi & neraca.`)
        : alert("danger", "error", "Jurnal belum seimbang", `Selisih ${rp(Math.abs(d - k))}. Lengkapi baris debit/kredit sebelum posting.`);
      el.querySelector("#jm-post").disabled = !ok;
    };
    tbody.addEventListener("input", (e) => {
      const t = e.target.closest("[data-f]"); if (!t) return;
      const l = lines[+t.dataset.i];
      if (t.dataset.f === "akun") l.akun = t.value;
      else {
        const v = parseInt(t.value.replace(/\D/g, ""), 10) || 0;
        const other = t.dataset.f === "d" ? "k" : "d";
        l[t.dataset.f] = v; t.value = v ? num(v) : "";
        if (v && l[other]) { l[other] = 0; const o = tbody.querySelector(`[data-i="${t.dataset.i}"][data-f="${other}"]`); if (o) o.value = ""; }
      }
      calc();
    });
    tbody.addEventListener("change", (e) => { const t = e.target.closest('[data-f="akun"]'); if (t) lines[+t.dataset.i].akun = t.value; });
    tbody.addEventListener("click", (e) => { const b = e.target.closest("[data-del]"); if (b && lines.length > 2) { lines.splice(+b.dataset.del, 1); draw(); } });
    el.querySelector("#jm-add").addEventListener("click", () => { lines.push({ akun: "6-1901", d: 0, k: 0 }); draw(); });
    el.querySelector("#jm-tpl").addEventListener("change", (e) => {
      const t = TPL[e.target.value]; if (!t) return;
      lines.splice(0, lines.length, ...t.lines.map((l) => ({ ...l })));
      el.querySelector("#jm-ket").value = t.ket; draw();
    });
    el.querySelector("#jm-post").addEventListener("click", () => {
      try {
        const j = GL.addJournal({ tgl: el.querySelector("#jm-tgl").value, cabang: el.querySelector("#jm-cab").value, ref: el.querySelector("#jm-ref").value, ket: el.querySelector("#jm-ket").value, lines });
        modal.close();
        toast(`Jurnal ${j.no} diposting. Buku besar, neraca saldo, laba rugi & neraca diperbarui.`, "success");
        APP.render();
      } catch (err) { toast(err.message, "danger"); }
    });
    draw();
  }

  function jurnalDetail(no, state) {
    const j = GL.journals("ALL").find((x) => x.no === no);
    if (!j) return;
    const d = j.lines.reduce((a, l) => a + l.d, 0);
    const el = modal.open({
      title: `Jurnal ${j.no}`, icon: "receipt_long", size: "lg",
      body: `
        <div class="grid g-2">
          <dl class="kv"><dt>Tanggal</dt><dd>${tgl(j.tgl)}</dd><dt>Cabang</dt><dd>${esc(UI.cabangNama(j.cabang))}</dd><dt>Sumber</dt><dd>${sumberBadge(j.sumber)}</dd></dl>
          <dl class="kv"><dt>Referensi</dt><dd class="mono">${esc(j.ref)}</dd><dt>Diposting oleh</dt><dd>${esc(j.user)}</dd><dt>Status</dt><dd>${UI.status("Selesai").replace("Selesai", "Posted")}</dd></dl>
        </div>
        <p><b>Keterangan:</b> ${esc(j.ket)}</p>
        <div class="table-wrap"><table class="tbl compact"><thead><tr><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th><th></th></tr></thead><tbody>
          ${j.lines.map((l) => `<tr><td style="padding-left:${l.k ? 34 : 14}px"><span class="mono">${l.akun}</span> ${esc(GL.akun(l.akun).nama)}</td>${dcell(l.d)}${dcell(l.k)}<td class="actions">${btn("", "info", { icon: "menu_book", size: "sm", title: "Buku besar", attrs: toLedger(l.akun) })}</td></tr>`).join("")}
        </tbody><tfoot><tr><td>Total</td><td class="num">${num(d)}</td><td class="num">${num(d)}</td><td></td></tr></tfoot></table></div>
        ${j.sumber === "Manual" ? "" : alert("info", "bolt", "Jurnal otomatis", `Dibentuk sistem dari modul <b>${esc(j.sumber)}</b>. Koreksi dilakukan lewat jurnal balik atau dokumen sumbernya.`)}`,
      foot: `${btn("Tutup", "dark", { attrs: "data-close" })}${btn("Cetak Bukti Jurnal", "teal", { icon: "print", attrs: 'data-toast="Bukti jurnal dikirim ke printer"' })}${btn("Buat Jurnal Balik", "warning", { icon: "undo", attrs: 'id="jv-rev"' })}`,
    });
    bindLedgerLinks(el);
    el.querySelector("#jv-rev").addEventListener("click", () => {
      jurnalManual(state, { cabang: j.cabang, ref: `REV/${j.no}`, ket: `Jurnal balik atas ${j.no}: ${j.ket}`, lines: j.lines.map((l) => ({ akun: l.akun, d: l.k, k: l.d })) });
    });
  }

  window.PAGES.jurnal = {
    render({ state }) {
      const cab = scopeCab(state);
      const all = GL.journals(cab);
      const list = all.filter((j) => (jFilter.sumber === "Semua" || j.sumber === jFilter.sumber) && (!jFilter.q || `${j.no} ${j.ref} ${j.ket} ${j.lines.map((l) => l.akun + " " + GL.akun(l.akun).nama).join(" ")}`.toLowerCase().includes(jFilter.q.toLowerCase())));
      const shown = list.slice().reverse().slice(0, jFilter.limit);
      const sumD = list.reduce((a, j) => a + j.lines.reduce((s, l) => s + l.d, 0), 0);
      const sumK = list.reduce((a, j) => a + j.lines.reduce((s, l) => s + l.k, 0), 0);
      const auto = all.filter((j) => j.sumber !== "Manual").length;
      const pny = all.filter((j) => j.sumber === "Penyesuaian" || j.sumber === "Pajak").length;
      const cnt = {};
      all.forEach((j) => { cnt[j.sumber] = (cnt[j.sumber] || 0) + 1; });
      return `
      ${UI.pageHeader({
        title: "Jurnal Umum",
        sub: `Seluruh jurnal ${esc(scopeLbl(state))} periode ${periodeTxt()}, otomatis dari transaksi & manual. Terbaru di atas.`,
        crumbs: ["Akuntansi", "Jurnal Umum"],
        actions: `${btn("Buat Jurnal Manual", "success", { icon: "add", attrs: 'id="j-new"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Jurnal umum diekspor ke Excel"' })}${btn("Tutup Buku", "danger", { icon: "lock", attrs: 'id="j-close"' })}`,
      })}
      ${integrasi("jurnal")}
      <div class="grid g-4">
        ${stat({ label: "Jurnal periode ini", value: num(all.length), icon: "edit_note", tone: "primary", foot: `${num(all.reduce((a, j) => a + j.lines.length, 0))} baris posting`, hero: true })}
        ${stat({ label: "Jurnal otomatis", value: num(auto), icon: "bolt", tone: "info", foot: `${pct(auto / all.length * 100)} dari modul operasional` })}
        ${stat({ label: "Manual & penyesuaian", value: num(all.length - auto + pny), icon: "tune", tone: "purple", foot: `${all.length - auto} manual · ${pny} penyesuaian/pajak` })}
        ${stat({ label: "Kontrol debit = kredit", value: sumD === sumK ? "Seimbang" : "Selisih", icon: sumD === sumK ? "verified" : "error", tone: sumD === sumK ? "teal" : "danger", foot: `Σ ${short(sumD)} (hasil filter)` })}
      </div>
      <section class="card">
        <div class="filterbar">
          <div class="field" style="max-width:none;flex:2 1 260px"><label for="j-q">Cari</label><div class="input-icon">${icon("search")}<input id="j-q" class="input" type="search" value="${esc(jFilter.q)}" placeholder="No. jurnal, referensi, keterangan, kode/nama akun"></div></div>
          ${input("Dari", { type: "date", value: GL.periode().from })}
          ${input("Sampai", { type: "date", value: GL.periode().to })}
          <div class="actions">${btn("Terapkan", "primary", { icon: "filter_alt", attrs: 'id="j-apply"' })}</div>
        </div>
        <div style="padding:12px 20px 0"><div class="chips" data-chip-group="j-src" id="j-src">
          ${["Semua", ...GL.SUMBER].filter((s) => s === "Semua" || cnt[s]).map((s) => `<button type="button" class="chip ${s === jFilter.sumber ? "active" : ""}" data-s="${s}">${s}${s !== "Semua" ? ` <span class="badge gray">${cnt[s]}</span>` : ""}</button>`).join("")}
        </div></div>
        <div class="table-wrap"><table class="tbl compact">
          <thead><tr><th>Tanggal</th><th>No. jurnal / ref</th><th>Akun</th><th>Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead>
          <tbody>${shown.length ? journalRows(shown) : `<tr><td colspan="6"><div class="empty">${icon("search_off")}<b>Tidak ada jurnal</b><span>Ubah kata kunci atau sumber jurnal.</span></div></td></tr>`}</tbody>
          <tfoot><tr><td colspan="4">Total ${num(list.length)} jurnal (hasil filter)</td><td class="num">${num(sumD)}</td><td class="num">${num(sumK)}</td></tr></tfoot>
        </table></div>
        <div class="card-foot"><span class="small muted">Menampilkan ${num(shown.length)} dari ${num(list.length)} jurnal</span><span class="spacer"></span>
          ${shown.length < list.length ? btn("Muat 25 jurnal lagi", "info", { icon: "expand_more", attrs: 'id="j-more"' }) : ""}</div>
      </section>`;
    },
    mount(root, { state }) {
      bindLedgerLinks(root);
      root.querySelector("#j-new").addEventListener("click", () => jurnalManual(state));
      root.querySelectorAll("[data-jv]").forEach((b) => b.addEventListener("click", () => jurnalDetail(b.dataset.jv, state)));
      const q = root.querySelector("#j-q");
      const go = () => { jFilter.q = q.value.trim(); jFilter.limit = 25; APP.render(); };
      root.querySelector("#j-apply").addEventListener("click", go);
      q.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      root.querySelector("#j-src").addEventListener("click", (e) => { const c = e.target.closest("[data-s]"); if (c) { jFilter.sumber = c.dataset.s; jFilter.limit = 25; APP.render(); } });
      root.querySelector("#j-more")?.addEventListener("click", () => { jFilter.limit += 25; APP.render(); });
      root.querySelector("#j-close").addEventListener("click", () => confirmBox({
        title: "Tutup buku periode ini?", icon: "lock",
        msg: `Periode <b>${GL.periode().label}</b> akan dikunci. Jurnal baru tidak dapat diposting ke periode ini, dan saldo akun nominal (pendapatan & beban) ditutup ke <b>Laba Tahun Berjalan</b>. Pastikan neraca saldo seimbang dan semua penyesuaian sudah diposting.`,
        okLabel: "Tutup buku", onOk: () => toast("Simulasi: tutup buku dijadwalkan pada akhir bulan setelah verifikasi Keuangan", "info"),
      }));
    },
  };

  /* =====================================================================
     3. KARTU BUKU BESAR
     ===================================================================== */
  window.PAGES.bukubesar = {
    render({ state }) {
      const cab = scopeCab(state);
      const a = GL.akun(GL.ui.akun) || GL.akun("1-1103");
      const L = GL.ledger(a.kode, cab);
      const ns = (v) => normalSaldo(a, v);
      const idx = GL.DETAIL.findIndex((x) => x.kode === a.kode);
      const prev = GL.DETAIL[idx - 1], next = GL.DETAIL[idx + 1];
      // saldo akhir harian untuk grafik
      const P = GL.periode();
      const days = Number(P.to.slice(8));
      const daily = [];
      let run = L.awal, ri = 0;
      for (let d = 1; d <= days; d++) {
        const ds = `${P.from.slice(0, 8)}${String(d).padStart(2, "0")}`;
        while (ri < L.rows.length && L.rows[ri].tgl <= ds) { run = L.rows[ri].saldo; ri++; }
        daily.push(ns(run));
      }
      const MAXROW = 400;
      const rows = L.rows.slice(0, MAXROW);
      return `
      ${UI.pageHeader({
        title: "Kartu Buku Besar",
        sub: `Mutasi & saldo berjalan per akun untuk ${esc(scopeLbl(state))}, periode ${periodeTxt()}.`,
        crumbs: ["Akuntansi", "Buku Besar"],
        actions: `${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Kartu buku besar diekspor ke Excel"' })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: 'data-toast="Kartu buku besar diekspor ke PDF"' })}${btn("Jurnal Umum", "glass", { icon: "edit_note", attrs: 'data-go="jurnal"' })}`,
      })}
      ${integrasi("bukubesar")}
      <section class="card"><div class="filterbar" style="border-radius:var(--radius-lg)">
        <div class="field" style="max-width:none;flex:3 1 320px"><label for="bb-akun">Akun</label><select id="bb-akun" class="select">${akunOptions(a.kode)}</select></div>
        ${select("Cabang", UI.cabangOptions(), { value: cab, id: "bb-cab" })}
        <div class="actions">
          ${btn("", "dark", { icon: "chevron_left", title: "Akun sebelumnya", attrs: prev ? `${toLedger(prev.kode)}` : "disabled" })}
          ${btn("", "dark", { icon: "chevron_right", title: "Akun berikutnya", attrs: next ? `${toLedger(next.kode)}` : "disabled" })}
        </div>
      </div></section>

      <div class="grid g-4">
        ${stat({ label: `${a.kode} · ${a.nama}`, value: rp(ns(L.akhir)), icon: "menu_book", tone: "primary", foot: `Saldo akhir per ${tgl(P.to)} · normal ${a.normal === "D" ? "debit" : "kredit"}`, hero: true })}
        ${stat({ label: "Saldo awal", value: rp(ns(L.awal)), icon: "first_page", tone: "dark", foot: GL.isNeraca(a.kode) ? `per ${tgl(P.from)}` : "akun nominal mulai dari 0 tiap periode" })}
        ${stat({ label: "Total debit", value: rp(L.d), icon: "add_circle", tone: "info", foot: `${num(L.rows.filter((r) => r.d).length)} posting` })}
        ${stat({ label: "Total kredit", value: rp(L.k), icon: "remove_circle", tone: "warning", foot: `${num(L.rows.filter((r) => r.k).length)} posting` })}
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Saldo akhir harian", desc: `Rp, sisi normal ${a.normal === "D" ? "debit" : "kredit"}`, icon: "show_chart",
          body: chart("bb-ch", (k, el) => ({
            type: "line",
            data: { labels: daily.map((_, i) => String(i + 1)), datasets: [{ label: "Saldo", data: daily, borderColor: k.c1, backgroundColor: areaFill(el, k.c1), fill: true, tension: 0.25, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 }] },
            options: { interaction: { mode: "index", intersect: false }, scales: { y: { ticks: { callback: rpTick }, grid: { color: k.grid } }, x: { grid: { display: false }, title: { display: true, text: `Tanggal (${P.label})` } } }, plugins: { tooltip: { callbacks: { title: (c) => `${c[0].label} ${P.label}`, label: (c) => ` Saldo: ${rp(c.raw)}` } } } },
          }), "sm"),
        })}
        ${card({
          title: "Info akun", icon: "info", tone: "cyan",
          body: `<dl class="kv">
            <dt>Kode</dt><dd class="mono">${a.kode}</dd>
            <dt>Nama</dt><dd>${esc(a.nama)}</dd>
            <dt>Tipe</dt><dd>${tipeBadge(a.tipe)}</dd>
            <dt>Saldo normal</dt><dd>${normalBadge(a.normal)}</dd>
            <dt>Laporan</dt><dd>${a.laporan}</dd>
            <dt>Induk</dt><dd>${esc((GL.akun(a.parent) || {}).nama || "-")}</dd>
          </dl>
          <div class="row" style="margin-top:14px">${btn("Lihat di " + (GL.isNeraca(a.kode) ? "Neraca" : "Laba Rugi"), "primary", { size: "sm", icon: "arrow_forward", attrs: `data-go="${GL.isNeraca(a.kode) ? "neraca" : "lap-labarugi"}"` })}${btn("Neraca Saldo", "info", { size: "sm", icon: "balance", attrs: 'data-go="neracasaldo"' })}</div>`,
        })}
      </div>

      ${card({
        title: `Buku besar ${a.kode} · ${esc(a.nama)}`, desc: `${num(L.rows.length)} transaksi${L.rows.length > MAXROW ? ` · ditampilkan ${MAXROW} pertama` : ""}`, icon: "receipt_long", flush: true,
        body: `<div class="table-wrap"><table class="tbl compact">
          <thead><tr><th>Tanggal</th><th>No. jurnal</th><th>Referensi</th><th>Keterangan</th><th>Cabang</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo</th><th>D/K</th></tr></thead>
          <tbody>
            <tr class="group"><td>${tgl(P.from)}</td><td colspan="6">Saldo awal</td><td class="num">${num(Math.abs(L.awal))}</td><td>${L.awal >= 0 ? "D" : "K"}</td></tr>
            ${rows.map((r) => `<tr><td class="nowrap">${tgl(r.tgl)}</td><td><button type="button" class="btn light sm" data-jv="${r.no}" style="font-family:var(--mono)">${r.no}</button></td><td class="mono small">${esc(r.ref)}</td><td>${esc(r.ket)}<div class="t-sub">${esc(r.sumber)}</div></td><td>${cabBadge(r.cabang)}</td>${dcell(r.d)}${dcell(r.k)}<td class="num strong">${num(Math.abs(r.saldo))}</td><td>${r.saldo >= 0 ? "D" : "K"}</td></tr>`).join("")}
          </tbody>
          <tfoot><tr><td colspan="5">Mutasi periode & saldo akhir</td><td class="num">${num(L.d)}</td><td class="num">${num(L.k)}</td><td class="num">${num(Math.abs(L.akhir))}</td><td>${L.akhir >= 0 ? "D" : "K"}</td></tr></tfoot>
        </table></div>`,
      })}`;
    },
    mount(root, { state }) {
      bindLedgerLinks(root);
      root.querySelector("#bb-akun").addEventListener("change", (e) => { GL.ui.akun = e.target.value; APP.render(); });
      root.querySelector("#bb-cab").addEventListener("change", (e) => {
        APP.state.cabang = e.target.value;
        const bs = document.getElementById("branch-select"); if (bs) bs.value = e.target.value;
        APP.render();
      });
      root.querySelectorAll("[data-jv]").forEach((b) => b.addEventListener("click", () => jurnalDetail(b.dataset.jv, state)));
    },
  };

  /* =====================================================================
     4. NERACA SALDO (+ Neraca Lajur)
     ===================================================================== */
  window.PAGES.neracasaldo = {
    render({ state }) {
      const cab = scopeCab(state);
      const tb = GL.trial(cab).filter((r) => r.awal || r.d || r.k);
      const T = { awD: 0, awK: 0, d: 0, k: 0, akD: 0, akK: 0 };
      tb.forEach((r) => { if (r.awal > 0) T.awD += r.awal; else T.awK -= r.awal; T.d += r.d; T.k += r.k; if (r.akhir > 0) T.akD += r.akhir; else T.akK -= r.akhir; });
      const ok = Math.round(T.akD) === Math.round(T.akK);
      const groups = Object.values(GL.TIPE);
      const nsRows = groups.map((g) => {
        const rs = tb.filter((r) => r.tipe === g);
        if (!rs.length) return "";
        return `<tr class="group"><td colspan="9">${esc(g)}</td></tr>` + rs.map((r) => `<tr>
          <td><button type="button" class="mono small" ${toLedger(r.kode)} style="background:none;border:0;color:var(--c-primary-2);cursor:pointer;padding:0">${r.kode}</button></td><td>${esc(r.nama)}</td>
          ${dk(r.awal)}${dcell(r.d)}${dcell(r.k)}${dk(r.akhir)}
          <td class="actions">${btn("", "info", { icon: "menu_book", size: "sm", title: "Buku besar", attrs: toLedger(r.kode) })}</td></tr>`).join("");
      }).join("");

      // Neraca lajur
      const lr = tb.filter((r) => !GL.isNeraca(r.kode));
      const nr = tb.filter((r) => GL.isNeraca(r.kode));
      const W = { nsD: T.akD, nsK: T.akK, lrD: 0, lrK: 0, nD: 0, nK: 0 };
      lr.forEach((r) => { if (r.akhir > 0) W.lrD += r.akhir; else W.lrK -= r.akhir; });
      nr.forEach((r) => { if (r.akhir > 0) W.nD += r.akhir; else W.nK -= r.akhir; });
      const laba = W.lrK - W.lrD;
      const wRow = (r) => { const isN = GL.isNeraca(r.kode); return `<tr><td class="mono small">${r.kode}</td><td>${esc(r.nama)}</td>${dk(r.akhir)}${isN ? dk(0) : dk(r.akhir)}${isN ? dk(r.akhir) : dk(0)}</tr>`; };

      return `
      ${UI.pageHeader({
        title: "Neraca Saldo",
        sub: `Saldo awal, mutasi & saldo akhir seluruh akun ${esc(scopeLbl(state))} periode ${periodeTxt()}. Sumber: jurnal umum.`,
        crumbs: ["Akuntansi", "Neraca Saldo"],
        actions: `${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Neraca saldo diekspor ke Excel"' })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: 'data-toast="Neraca saldo diekspor ke PDF"' })}${btn("Jurnal Penyesuaian", "glass", { icon: "tune", attrs: 'data-go="jurnal"' })}`,
      })}
      ${integrasi("neracasaldo")}
      <div class="grid g-4">
        ${stat({ label: "Total saldo debit", value: short(T.akD), icon: "add_circle", tone: "primary", foot: `mutasi debit ${short(T.d)}`, hero: true })}
        ${stat({ label: "Total saldo kredit", value: short(T.akK), icon: "remove_circle", tone: "warning", foot: `mutasi kredit ${short(T.k)}` })}
        ${stat({ label: "Status", value: ok ? "Seimbang" : "Tidak seimbang", icon: ok ? "verified" : "error", tone: ok ? "teal" : "danger", foot: `selisih ${rp(T.akD - T.akK)}` })}
        ${stat({ label: "Laba bersih berjalan", value: short(laba), icon: "trending_up", tone: "success", foot: "pendapatan − beban (kolom laba rugi)" })}
      </div>
      ${ok ? alert("success", "task_alt", "Neraca saldo seimbang", `Total debit ${rp(T.akD)} = total kredit ${rp(T.akK)}. Siap disusun menjadi laporan laba rugi dan neraca.`) : alert("danger", "error", "Neraca saldo tidak seimbang", "Periksa jurnal yang belum seimbang sebelum menyusun laporan keuangan.")}
      <div>${tabs("ns-tab", [{ id: "ns", label: "Neraca Saldo", icon: "balance" }, { id: "lajur", label: "Neraca Lajur (Worksheet)", icon: "view_week" }], "ns")}</div>

      <div data-panel-group="ns-tab" data-panel="ns">
        ${card({
          title: "Neraca saldo", desc: `${num(tb.length)} akun bersaldo · klik kode untuk buka buku besar`, icon: "balance", flush: true,
          body: `<div class="table-wrap"><table class="tbl compact">
            <thead>
              <tr><th rowspan="2">Kode</th><th rowspan="2">Nama akun</th><th colspan="2" class="center">Saldo awal</th><th colspan="2" class="center">Mutasi</th><th colspan="2" class="center">Saldo akhir</th><th rowspan="2"></th></tr>
              <tr><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Debit</th><th class="num">Kredit</th></tr>
            </thead>
            <tbody>${nsRows}</tbody>
            <tfoot><tr><td colspan="2">Total</td><td class="num">${num(T.awD)}</td><td class="num">${num(T.awK)}</td><td class="num">${num(T.d)}</td><td class="num">${num(T.k)}</td><td class="num">${num(T.akD)}</td><td class="num">${num(T.akK)}</td><td></td></tr></tfoot>
          </table></div>`,
        })}
      </div>

      <div data-panel-group="ns-tab" data-panel="lajur" hidden>
        ${card({
          title: "Neraca lajur", desc: "Neraca saldo dipisah ke kolom Laba Rugi dan Neraca; laba bersih menyeimbangkan keduanya", icon: "view_week", tone: "purple", flush: true,
          body: `<div class="table-wrap"><table class="tbl compact">
            <thead>
              <tr><th rowspan="2">Kode</th><th rowspan="2">Nama akun</th><th colspan="2" class="center">Neraca saldo</th><th colspan="2" class="center">Laba rugi</th><th colspan="2" class="center">Neraca</th></tr>
              <tr><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Debit</th><th class="num">Kredit</th></tr>
            </thead>
            <tbody>${nr.map(wRow).join("")}${lr.map(wRow).join("")}
              <tr class="group"><td colspan="2">Jumlah</td><td class="num">${num(W.nsD)}</td><td class="num">${num(W.nsK)}</td><td class="num">${num(W.lrD)}</td><td class="num">${num(W.lrK)}</td><td class="num">${num(W.nD)}</td><td class="num">${num(W.nK)}</td></tr>
              <tr><td></td><td class="strong">Laba bersih periode berjalan</td><td></td><td></td><td class="num strong">${laba >= 0 ? num(laba) : ""}</td><td class="num strong">${laba < 0 ? num(-laba) : ""}</td><td class="num strong">${laba < 0 ? num(-laba) : ""}</td><td class="num strong">${laba >= 0 ? num(laba) : ""}</td></tr>
            </tbody>
            <tfoot><tr><td colspan="2">Total seimbang</td><td class="num">${num(W.nsD)}</td><td class="num">${num(W.nsK)}</td><td class="num">${num(W.lrD + Math.max(laba, 0))}</td><td class="num">${num(W.lrK + Math.max(-laba, 0))}</td><td class="num">${num(W.nD + Math.max(-laba, 0))}</td><td class="num">${num(W.nK + Math.max(laba, 0))}</td></tr></tfoot>
          </table></div>`,
          foot: `${btn("Buka Laba Rugi", "primary", { size: "sm", icon: "trending_up", attrs: 'data-go="lap-labarugi"' })}${btn("Buka Neraca", "info", { size: "sm", icon: "account_balance", attrs: 'data-go="neraca"' })}`,
        })}
      </div>`;
    },
    mount(root) { bindLedgerLinks(root); },
  };

  /* =====================================================================
     5. NERACA (Laporan Posisi Keuangan)
     ===================================================================== */
  window.PAGES.neraca = {
    render({ state }) {
      const cab = scopeCab(state);
      const ALL = cab === "ALL";
      const N1 = GL.neraca(cab, "akhir"), N0 = GL.neraca(cab, "awal");
      const E = ALL ? GL.eliminasi() : null;
      const e0 = ALL ? { pAC: N0.piutangAC, hAC: N0.hutangAC } : null;
      const P = GL.periode();
      const lrYTD = GL.labaRugi(cab, P.m + 1);
      // akun-akun per sisi; saldo ditampilkan menurut sisi normal
      const line = (kode, v1, v0, extra = "") => {
        const a = GL.akun(kode);
        return `<tr><td style="padding-left:28px"><button type="button" class="mono small" ${toLedger(kode)} style="background:none;border:0;color:var(--c-primary-2);cursor:pointer;padding:0">${kode}</button> ${esc(a.nama)}${extra}</td><td class="num">${acc(v1)}</td><td class="num muted">${acc(v0)}</td></tr>`;
      };
      const sub = (l, v1, v0, strong = true) => `<tr><td class="${strong ? "strong" : ""}">${l}</td><td class="num ${strong ? "strong" : ""}">${acc(v1)}</td><td class="num muted ${strong ? "strong" : ""}">${acc(v0)}</td></tr>`;
      const grp = (l) => `<tr class="group"><td colspan="3">${l}</td></tr>`;
      const keys = (pre) => Object.keys(N1.val).filter((k) => k.startsWith(pre) && !GL.akun(k).header).sort();
      const V = (N, k, sign) => sign * (N.val[k] || 0);
      const elimRow = (l, v1, v0) => `<tr><td style="padding-left:28px"><span class="badge pink">Eliminasi</span> ${l}</td><td class="num">${acc(v1)}</td><td class="num muted">${acc(v0)}</td></tr>`;

      const pAC1 = ALL ? E.piutangAC : 0, pAC0 = ALL ? e0.pAC : 0;
      const hAC1 = ALL ? E.hutangAC : 0, hAC0 = ALL ? e0.hAC : 0;
      const aset1 = N1.aset - pAC1, aset0 = N0.aset - pAC0;
      const liab1 = N1.liab - hAC1, liab0 = N0.liab - hAC0;
      const al1 = N1.al - pAC1, al0 = N0.al - pAC0;
      const lp1 = N1.liabPendek - hAC1, lp0 = N0.liabPendek - hAC0;

      const asetTbl = `
        ${grp("Aset lancar")}
        ${keys("1-1").map((k) => line(k, V(N1, k, 1), V(N0, k, 1))).join("")}
        ${ALL ? elimRow("Piutang antar cabang", -pAC1, -pAC0) : ""}
        ${sub("Jumlah aset lancar", al1, al0)}
        ${grp("Aset tidak lancar")}
        ${keys("1-2").map((k) => line(k, V(N1, k, 1), V(N0, k, 1))).join("")}
        ${sub("Jumlah aset tidak lancar", N1.tetap, N0.tetap)}`;
      const leTbl = `
        ${grp("Liabilitas jangka pendek")}
        ${keys("2-1").map((k) => line(k, V(N1, k, -1), V(N0, k, -1))).join("")}
        ${ALL ? elimRow("Hutang antar cabang", -hAC1, -hAC0) : ""}
        ${sub("Jumlah liabilitas jangka pendek", lp1, lp0)}
        ${grp("Liabilitas jangka panjang")}
        ${keys("2-2").map((k) => line(k, V(N1, k, -1), V(N0, k, -1))).join("")}
        ${sub("Jumlah liabilitas", liab1, liab0)}
        ${grp("Ekuitas")}
        ${keys("3-").map((k) => line(k, V(N1, k, -1), V(N0, k, -1), k === "3-1301" ? ` <button type="button" class="badge green" data-go="lap-labarugi" style="border:0;cursor:pointer">dari Laba Rugi</button>` : "")).join("")}
        ${sub("Jumlah ekuitas", N1.ekuitas, N0.ekuitas)}`;
      const table = (head, body, t1, t0, tl) => `<div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>${head} <span class="t-sub">(Rp)</span></th><th class="num">${tgl(P.to)}</th><th class="num">${tgl(P.from)}</th></tr></thead>
        <tbody>${body}</tbody><tfoot><tr><td>${tl}</td><td class="num">${num(t1)}</td><td class="num">${num(t0)}</td></tr></tfoot></table></div>`;
      const le1 = liab1 + N1.ekuitas, le0 = liab0 + N0.ekuitas;
      const ok = Math.round(aset1) === Math.round(le1) && Math.round(aset0) === Math.round(le0);
      const cr = al1 / lp1, qr = (al1 - N1.persediaan) / lp1, der = liab1 / N1.ekuitas, roe = lrYTD.lb / N1.ekuitas * 100;
      const comp = [["Kas & bank", N1.kas], ["Piutang", N1.piutang + N1.piutangAC - pAC1], ["Persediaan", N1.persediaan], ["Dibayar dimuka", N1.dimuka], ["Aset tetap (neto)", N1.tetap]];

      return `
      ${UI.pageHeader({
        title: "Neraca",
        sub: `Laporan posisi keuangan ${esc(ALL ? "konsolidasian semua cabang (setelah eliminasi antar cabang)" : scopeLbl(state))} per ${tgl(P.to)}, dibanding awal bulan. Disusun otomatis dari neraca saldo.`,
        crumbs: ["Akuntansi", "Neraca"],
        actions: `${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Neraca diekspor ke Excel"' })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: 'data-toast="Neraca diekspor ke PDF"' })}${btn(ALL ? "Per Cabang" : "Konsolidasi", "glass", { icon: "hub", attrs: 'data-go="lap-konsolidasi"' })}`,
      })}
      ${integrasi("neraca")}
      <div class="grid g-4">
        ${stat({ label: "Total aset", value: short(aset1), icon: "account_balance", tone: "primary", delta: (aset1 - aset0) / aset0 * 100, foot: "vs awal bulan", hero: true })}
        ${stat({ label: "Total liabilitas", value: short(liab1), icon: "credit_card", tone: "warning", foot: `${pct(liab1 / aset1 * 100)} dari aset` })}
        ${stat({ label: "Total ekuitas", value: short(N1.ekuitas), icon: "savings", tone: "purple", foot: `laba tahun berjalan ${short(N1.lbj)}` })}
        ${stat({ label: "Kontrol neraca", value: ok ? "Seimbang" : "Tidak seimbang", icon: ok ? "verified" : "error", tone: ok ? "teal" : "danger", foot: "Aset = Liabilitas + Ekuitas" })}
      </div>
      ${ALL ? alert("info", "hub", "Neraca konsolidasian", `Piutang antar cabang ${rp(pAC1)} dieliminasi terhadap hutang antar cabang ${rp(hAC1)}. Penjualan internal ${rp(E.penjualanInternal)} dan HPP internal-nya juga dieliminasi di laba rugi konsolidasi.`) : ""}
      <div class="grid g-2">
        ${card({ title: "Aset", icon: "account_balance_wallet", flush: true, body: table("Aset", asetTbl, aset1, aset0, "TOTAL ASET") })}
        ${card({ title: "Liabilitas & ekuitas", icon: "request_quote", tone: "amber", flush: true, body: table("Liabilitas & ekuitas", leTbl, le1, le0, "TOTAL LIABILITAS & EKUITAS") })}
      </div>
      <div class="grid g-3-2">
        ${card({
          title: "Komposisi aset", desc: `Per ${tgl(P.to)}, Rp`, icon: "donut_small", tone: "cyan",
          body: `${legend(comp.map((c, i) => [c[0], `var(--chart-${i + 1})`]))}
            ${chart("nr-ch", (k) => ({
              type: "bar",
              data: { labels: comp.map((c) => c[0]), datasets: [{ label: "Nilai", data: comp.map((c) => c[1]), backgroundColor: [k.c1, k.c2, k.c3, k.c4, k.c5], borderRadius: 4, borderSkipped: "left" }] },
              options: { indexAxis: "y", scales: { x: { beginAtZero: true, ticks: { callback: rpTick }, grid: { color: k.grid } }, y: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${rp(c.raw)} (${pct(c.raw / aset1 * 100)})` } } } },
            }), "sm")}`,
        })}
        ${card({
          title: "Rasio keuangan", desc: "Dihitung dari neraca & laba rugi s.d. hari ini", icon: "speed", tone: "green",
          body: `<div class="stack">
            ${[["Current ratio", cr.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "×", "aset lancar ÷ liabilitas pendek", cr >= 1.5], ["Quick ratio", qr.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "×", "tanpa persediaan", qr >= 0.8], ["Debt to equity", der.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "×", "liabilitas ÷ ekuitas", der <= 1], ["ROE (YTD)", pct(roe), `laba bersih Jan–${GL.BULAN[P.m].slice(0, 3)} ${short(lrYTD.lb)}`, roe >= 10]].map(([l, v, d, good]) => `
              <div class="row between"><div><div class="strong">${l}</div><div class="small muted">${d}</div></div><div class="row" style="gap:8px"><b class="num" style="font-size:18px">${v}</b>${badge(good ? "Sehat" : "Pantau", good ? "green" : "amber", { dot: true })}</div></div>`).join('<div class="divider"></div>')}
          </div>`,
        })}
      </div>`;
    },
    mount(root) { bindLedgerLinks(root); },
  };
})();
