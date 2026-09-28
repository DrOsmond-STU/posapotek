/* =====================================================================
   App shell, navigasi & router (window.APP)
   Halaman didaftarkan di window.PAGES[route] = { render(), mount(root) }
   ===================================================================== */
(function () {
  const { icon, esc, btn, toast, modal } = UI;
  window.PAGES = window.PAGES || {};

  const NAV = [
    { group: "Utama", items: [
      { id: "dashboard", label: "Dashboard", icon: "space_dashboard" },
    ] },
    { group: "Transaksi", items: [
      { id: "kasir", label: "Kasir (POS)", icon: "point_of_sale" },
      { id: "resep", label: "Resep Dokter", icon: "prescriptions", count: 3 },
      { id: "racikan", label: "Obat Racikan", icon: "science" },
      { id: "retur", label: "Retur Penjualan", icon: "assignment_return" },
      { id: "riwayat", label: "Riwayat Transaksi", icon: "receipt_long" },
      { id: "shift", label: "Shift & Kas", icon: "account_balance_wallet" },
    ] },
    { group: "Persediaan", items: [
      { id: "obat", label: "Master Obat", icon: "medication" },
      { id: "stok", label: "Stok Obat", icon: "inventory_2", count: 9, tone: "amber" },
      { id: "kadaluarsa", label: "Stok Kedaluwarsa", icon: "event_busy", count: 12 },
      { id: "opname", label: "Stok Opname", icon: "fact_check" },
      { id: "mutasi", label: "Mutasi Antar Cabang", icon: "swap_horiz" },
      { id: "kartustok", label: "Kartu Stok", icon: "history_edu" },
    ] },
    { group: "Pembelian", items: [
      { id: "pesanan", label: "Surat Pesanan (SP)", icon: "shopping_cart_checkout" },
      { id: "penerimaan", label: "Penerimaan Barang", icon: "local_shipping" },
      { id: "returbeli", label: "Retur Pembelian", icon: "undo" },
      { id: "hutang", label: "Hutang Supplier", icon: "request_quote" },
      { id: "supplier", label: "Supplier / PBF", icon: "factory" },
    ] },
    { group: "Relasi", items: [
      { id: "pelanggan", label: "Pasien & Member", icon: "groups" },
      { id: "dokter", label: "Dokter", icon: "stethoscope" },
    ] },
    { group: "Akuntansi & Keuangan", items: [
      { id: "coa", label: "Chart of Account", icon: "account_tree" },
      { id: "jurnal", label: "Jurnal Umum", icon: "edit_note" },
      { id: "bukubesar", label: "Kartu Buku Besar", icon: "menu_book" },
      { id: "neracasaldo", label: "Neraca Saldo", icon: "balance" },
      { id: "lap-labarugi", label: "Laba Rugi", icon: "trending_up" },
      { id: "neraca", label: "Neraca", icon: "account_balance" },
    ] },
    { group: "Laporan", items: [
      { id: "lap-penjualan", label: "Laporan Penjualan", icon: "monitoring" },
      { id: "lap-cabang", label: "Laporan Cabang", icon: "store" },
      { id: "lap-konsolidasi", label: "Laporan Konsolidasi", icon: "account_tree" },
      { id: "lap-sales", label: "Laporan Sales", icon: "badge" },
      { id: "lap-stok", label: "Laporan Persediaan", icon: "warehouse" },
      { id: "lap-pembelian", label: "Laporan Pembelian", icon: "shopping_bag" },
      { id: "lap-kadaluarsa", label: "Laporan Kedaluwarsa", icon: "timer_off" },
      { id: "lap-narkotika", label: "Narkotika & Psikotropika", icon: "shield" },
    ] },
    { group: "Pengaturan", items: [
      { id: "cabang", label: "Manajemen Cabang", icon: "storefront" },
      { id: "pengguna", label: "Pengguna & Hak Akses", icon: "manage_accounts" },
      { id: "pengaturan", label: "Pengaturan Sistem", icon: "settings" },
      { id: "audit", label: "Log Aktivitas", icon: "policy" },
      { id: "panduan", label: "Panduan UI (Style Guide)", icon: "palette" },
    ] },
  ];
  const ALL = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

  // Halaman laporan/keuangan yang mengikuti lingkup cabang (per cabang / konsolidasi)
  const SCOPED = new Set(["dashboard", "riwayat", "stok", "kadaluarsa", "hutang", "coa", "jurnal", "bukubesar", "neracasaldo", "lap-labarugi", "neraca",
    "lap-penjualan", "lap-cabang", "lap-konsolidasi", "lap-sales", "lap-stok", "lap-pembelian", "lap-kadaluarsa", "lap-narkotika"]);

  const state = { route: "dashboard", cabang: "PST", user: { nama: "Rina Wulandari", role: "Apoteker PJ", init: "RW" } };

  const readTheme = () => { try { return localStorage.getItem("fk-theme"); } catch (e) { return null; } };
  const saveTheme = (v) => { try { v ? localStorage.setItem("fk-theme", v) : localStorage.removeItem("fk-theme"); } catch (e) { /* abaikan */ } };
  const applyTheme = (v) => { if (v) document.documentElement.setAttribute("data-theme", v); else document.documentElement.removeAttribute("data-theme"); };
  applyTheme(readTheme());
  const isDark = () => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  function shell() {
    const nav = NAV.map((g) => `
      <div class="nav-group"><div class="nav-group-title">${g.group}</div>
        ${g.items.map((i) => `<a href="#${i.id}" data-go="${i.id}" class="${i.id === state.route ? "active" : ""}">${icon(i.icon)}<span>${i.label}</span>${i.count ? `<span class="count ${i.tone || ""}">${i.count}</span>` : ""}</a>`).join("")}
      </div>`).join("");

    return `
    <div class="app" id="app-shell">
      <aside class="sidebar" aria-label="Navigasi utama">
        <div class="brand">
          <div class="brand-logo">${icon("local_pharmacy", "fill")}</div>
          <div><div class="brand-name">FarmaKasir</div><div class="brand-sub">POS &amp; Manajemen Apotek</div></div>
        </div>
        <label class="branch-switch" for="branch-select">
          ${icon("storefront")}
          <span style="flex:1;min-width:0"><span class="lbl">Cabang aktif</span>
          <select id="branch-select">${[{ id: "ALL", nama: "Semua Cabang (Konsolidasi)" }, ...DB.cabang].map((c) => `<option value="${c.id}" ${c.id === state.cabang ? "selected" : ""}>${esc(c.nama)}</option>`).join("")}</select></span>
          ${icon("unfold_more")}
        </label>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <div class="avatar">${state.user.init}</div>
            <div style="flex:1;min-width:0"><div class="name">apt. ${esc(state.user.nama)}</div><div class="role">${esc(state.user.role)} · ${esc(state.cabang)}</div></div>
            <button type="button" class="btn glass icon sm" title="Keluar" aria-label="Keluar" data-go="login">${icon("logout")}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn menu-btn" id="menu-btn" aria-label="Buka menu">${icon("menu")}</button>
          <div class="search">${icon("search")}<input id="global-search" type="search" placeholder="Cari obat, transaksi, resep, pasien…" aria-label="Pencarian global"><kbd>/</kbd></div>
          <div class="topbar-right">
            <span class="shift-pill"><span class="pulse"></span>Shift Pagi · Kasir 01</span>
            <div class="clock"><b id="clock-time">--:--</b><span id="clock-date"></span></div>
            <button type="button" class="icon-btn" id="theme-btn" title="Mode terang/gelap" aria-label="Ganti mode terang/gelap">${icon(isDark() ? "light_mode" : "dark_mode")}</button>
            <button type="button" class="icon-btn" id="notif-btn" title="Notifikasi" aria-label="Notifikasi">${icon("notifications")}<span class="dot"></span></button>
            <button type="button" class="icon-btn" data-go="pengaturan" title="Pengaturan" aria-label="Pengaturan">${icon("settings")}</button>
          </div>
        </header>
        <main class="content"><div class="page" id="page"></div></main>
      </div>
      <div class="fab-wrap" id="fab">
        <div class="fab-menu">
          ${btn("Transaksi Kasir", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' })}
          ${btn("Input Resep", "primary", { icon: "prescriptions", attrs: 'data-go="resep"' })}
          ${btn("Buat Racikan", "purple", { icon: "science", attrs: 'data-go="racikan"' })}
          ${btn("Surat Pesanan", "warning", { icon: "shopping_cart_checkout", attrs: 'data-go="pesanan"' })}
          ${btn("Cek Kedaluwarsa", "danger", { icon: "event_busy", attrs: 'data-go="kadaluarsa"' })}
        </div>
        <button type="button" class="fab" id="fab-btn" aria-label="Aksi cepat" title="Aksi cepat">${icon("add")}</button>
      </div>
    </div>`;
  }

  function comingSoon(meta) {
    return UI.pageHeader({ title: meta.label, crumbs: [meta.group, meta.label] }) +
      UI.card({ body: `<div class="empty">${icon("construction")}<b>Modul sedang disiapkan</b><span>Halaman ${esc(meta.label)} belum tersedia di purwarupa ini.</span></div>` });
  }

  function renderRoute() {
    const route = state.route;
    const root = document.getElementById("root");
    if (route === "login") {
      root.innerHTML = window.PAGES.login ? window.PAGES.login.render() : "";
      window.PAGES.login?.mount?.(root);
      document.title = "FarmaKasir";
      return;
    }
    if (!document.getElementById("app-shell")) root.innerHTML = shell();
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.go === route));
    const shellEl = document.getElementById("app-shell");
    shellEl.className = shellEl.className.replace(/\broute-\S+/g, "").trim() + " route-" + route;
    const meta = ALL.find((i) => i.id === route) || ALL[0];
    const page = window.PAGES[route];
    // Ganti kontainer halaman dengan elemen baru agar listener halaman sebelumnya tidak menumpuk
    const prev = document.getElementById("page");
    const el = prev.cloneNode(false);
    prev.replaceWith(el);
    UI.resetCharts();
    el.innerHTML = page ? page.render({ meta, state }) : comingSoon(meta);
    // Semua laporan bisa dilihat per cabang atau konsolidasi: sisipkan pemilih lingkup di bawah judul
    if (SCOPED.has(route) && !el.querySelector(".scope-bar")) el.querySelector(".page-head")?.insertAdjacentHTML("afterend", UI.scopeBar(state.cabang));
    page?.mount?.(el, { meta, state });
    UI.mountCharts();
    document.getElementById("app-shell").classList.remove("nav-open");
    document.getElementById("fab").classList.remove("open");
    window.scrollTo(0, 0);
  }

  function go(route) {
    if (!route) return;
    if (route !== "login" && !ALL.find((i) => i.id === route)) route = "dashboard";
    state.route = route;
    const h = "#" + route;
    if (location.hash !== h) history.replaceState(null, "", h);
    if (route !== "login" && !document.getElementById("app-shell")) document.getElementById("root").innerHTML = "";
    renderRoute();
  }

  function tick() {
    const t = document.getElementById("clock-time");
    if (!t) return;
    const d = new Date();
    t.textContent = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    document.getElementById("clock-date").textContent = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function openNotif() {
    modal.open({
      title: "Notifikasi", icon: "notifications", size: "sm",
      body: `<div class="list" style="margin:-20px -22px">${DB.notif.map((n) => `
        <div class="list-item"><div class="sq-ico ${n.tone}">${icon(n.ic)}</div>
          <div class="grow"><div class="title">${esc(n.t)}</div><div class="meta">${esc(n.m)} · ${esc(n.w)}</div></div>
          ${btn("", "info", { icon: "arrow_forward", size: "sm", title: "Buka", attrs: `data-go="${n.go}" data-close` })}
        </div>`).join("")}</div>`,
      foot: `${btn("Tandai semua dibaca", "success", { icon: "done_all", attrs: 'data-toast="Semua notifikasi ditandai dibaca" data-close' })}`,
    });
  }

  /* ---------- Delegasi event global ---------- */
  document.addEventListener("click", (e) => {
    const scEl = e.target.closest("[data-scope]");
    if (scEl) { setScope(scEl.dataset.scope); return; }

    const goEl = e.target.closest("[data-go]");
    if (goEl) { e.preventDefault(); modal.close(); go(goEl.dataset.go); return; }

    const tEl = e.target.closest("[data-toast]");
    if (tEl) toast(tEl.dataset.toast, tEl.dataset.tone || "success");

    const tab = e.target.closest("[data-tab-group] .tab");
    if (tab) {
      const grp = tab.closest("[data-tab-group]");
      grp.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      const name = grp.dataset.tabGroup;
      document.querySelectorAll(`[data-panel-group="${name}"]`).forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
      UI.mountCharts();
    }

    const chip = e.target.closest("[data-chip-group] .chip");
    if (chip) chip.closest("[data-chip-group]").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));

    if (e.target.closest("#fab-btn")) document.getElementById("fab").classList.toggle("open");
    if (e.target.closest("#menu-btn")) document.getElementById("app-shell").classList.toggle("nav-open");
    if (e.target.closest("#notif-btn")) openNotif();
    if (e.target.closest("#theme-btn")) {
      const next = isDark() ? "light" : "dark";
      applyTheme(next); saveTheme(next);
      document.querySelector("#theme-btn .ms").textContent = isDark() ? "light_mode" : "dark_mode";
      renderRoute();
    }
    const shell = document.getElementById("app-shell");
    if (shell && shell.classList.contains("nav-open") && !e.target.closest(".sidebar") && !e.target.closest("#menu-btn")) shell.classList.remove("nav-open");
  });

  function setScope(v) {
    if (!v || v === state.cabang) return;
    state.cabang = v;
    const y = window.scrollY;
    toast(v === "ALL" ? "Lingkup: konsolidasi semua cabang" : `Lingkup: ${UI.cabangNama(v)}`, "info");
    document.getElementById("root").innerHTML = "";
    renderRoute();
    window.scrollTo(0, y);
  }

  document.addEventListener("change", (e) => {
    if (e.target.id === "branch-select" || e.target.matches("[data-scope-cabang]")) setScope(e.target.value);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { modal.close(); document.getElementById("fab")?.classList.remove("open"); }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (e.key === "/" && !typing) { e.preventDefault(); document.getElementById("global-search")?.focus(); }
    if (e.key === "F2") { e.preventDefault(); go("kasir"); }
  });

  window.addEventListener("hashchange", () => { const r = location.hash.slice(1); if (r && r !== state.route) go(r); });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (!document.documentElement.getAttribute("data-theme")) renderRoute(); });

  window.APP = { state, go, NAV, ALL, render: renderRoute, isDark };

  document.addEventListener("DOMContentLoaded", () => {
    const r = location.hash.slice(1);
    go(r || "dashboard");
    tick();
    setInterval(tick, 1000);
  });
})();
