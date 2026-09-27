/* =====================================================================
   UI helpers — dipakai semua halaman (window.UI)
   Setiap helper mengembalikan string HTML.
   ===================================================================== */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
  const num = (n) => Math.round(n || 0).toLocaleString("id-ID");
  const pct = (n, d = 1) => (n || 0).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
  const short = (n) => {
    const a = Math.abs(n);
    if (a >= 1e9) return "Rp " + (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " M";
    if (a >= 1e6) return "Rp " + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
    return rp(n);
  };
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = (s) => { const d = new Date(s); return `${String(d.getDate()).padStart(2, "0")} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
  const cabangNama = (id) => (window.DB.cabang.find((c) => c.id === id) || { nama: id }).nama;

  const icon = (name, cls = "") => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;

  /* Tombol. variant: primary|success|warning|danger|info|purple|teal|dark|pink|light|white|glass
     opts: { icon, size: 'sm'|'lg'|'xl', attrs, block, outline, title } */
  const btn = (label, variant = "primary", opts = {}) => {
    const cls = ["btn", variant, opts.size || "", opts.block ? "block" : "", opts.outline ? "outline" : "", !label ? "icon" : ""].filter(Boolean).join(" ");
    const title = opts.title || (!label ? "" : "");
    return `<button type="button" class="${cls}" ${title ? `title="${esc(title)}" aria-label="${esc(title)}"` : ""} ${opts.attrs || ""}>${opts.icon ? icon(opts.icon) : ""}${label ? `<span>${label}</span>` : ""}</button>`;
  };
  /* Tombol aksi baris tabel standar (ikon saja, berwarna sesuai fungsi) */
  const rowActions = (list = ["view", "edit", "delete"], ctx = "") => {
    const map = {
      view: ["visibility", "info", "Lihat detail"],
      edit: ["edit", "warning", "Ubah"],
      delete: ["delete", "danger", "Hapus"],
      print: ["print", "teal", "Cetak"],
      approve: ["check", "success", "Setujui"],
      history: ["history", "dark", "Riwayat"],
      copy: ["content_copy", "purple", "Salin"],
      send: ["send", "primary", "Kirim"],
    };
    return `<div class="btn-group">${list.map((k) => {
      const [ic, v, t] = map[k];
      return btn("", v, { icon: ic, size: "sm", title: t, attrs: `data-toast="${esc(t)}${ctx ? " · " + esc(ctx) : ""}"` });
    }).join("")}</div>`;
  };

  const badge = (text, tone = "gray", opts = {}) => `<span class="badge ${tone} ${opts.dot ? "dot" : ""}">${opts.icon ? icon(opts.icon) : ""}${text}</span>`;

  const statusTone = {
    "Lunas": "green", "Aktif": "green", "Selesai": "green", "Diterima": "green", "Diserahkan": "green", "Disetujui": "green", "Aman": "green", "Tercapai": "green",
    "Piutang": "amber", "Menunggu TTD Apoteker": "amber", "Verifikasi": "amber", "Diterima Sebagian": "amber", "Dalam Perjalanan": "cyan", "Dikirim": "cyan", "Menipis": "amber", "Jatuh Tempo": "amber", "Pending": "amber",
    "Void": "red", "Nonaktif": "gray", "Retur Sebagian": "purple", "Draft": "gray", "Habis": "red", "Kedaluwarsa": "red", "Ditolak": "red", "Terlambat": "red",
    "Diracik": "purple", "Siap Diserahkan": "blue", "Permintaan": "blue", "Diproses": "blue",
  };
  const status = (s) => badge(s, statusTone[s] || "gray", { dot: true });

  const golongan = (g) => `<span class="gol ${g}" title="${esc(window.DB.golonganLabel[g] || g)}"><i></i>${esc(window.DB.golonganLabel[g] || g)}</span>`;

  /* Header halaman di atas pita gradasi biru */
  const pageHeader = ({ title, sub = "", crumbs = [], actions = "" }) => `
    <div class="page-head">
      <div>
        <div class="crumbs">${icon("home")}<span>Beranda</span>${crumbs.map((c) => `${icon("chevron_right")}<span>${esc(c)}</span>`).join("")}</div>
        <h1>${esc(title)}</h1>
        ${sub ? `<p class="sub">${sub}</p>` : ""}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </div>`;

  /* Kartu */
  const card = ({ title = "", desc = "", icon: ic = "", tone = "", tools = "", body = "", foot = "", flush = false, cls = "", id = "" }) => `
    <section class="card ${cls}" ${id ? `id="${id}"` : ""}>
      ${title ? `<div class="card-head">${ic ? `<div class="card-icon ${tone ? "sq-ico " + tone : ""}">${icon(ic)}</div>` : ""}<div><h3>${title}</h3>${desc ? `<div class="desc">${desc}</div>` : ""}</div>${tools ? `<div class="tools">${tools}</div>` : ""}</div>` : ""}
      <div class="card-body ${flush ? "flush" : ""}">${body}</div>
      ${foot ? `<div class="card-foot">${foot}</div>` : ""}
    </section>`;

  /* Kartu statistik. tone: primary|success|warning|danger|info|purple|teal|pink */
  const stat = ({ label, value, icon: ic = "insights", tone = "primary", delta = null, foot = "", hero = false }) => `
    <div class="stat ${hero ? "hero" : ""}">
      <div class="top"><span class="label">${label}</span><span class="ico tone-${tone}">${icon(ic)}</span></div>
      <div class="value">${value}</div>
      <div class="foot">${delta !== null ? `<span class="delta ${delta >= 0 ? "up" : "down"}">${icon(delta >= 0 ? "trending_up" : "trending_down")}${delta >= 0 ? "+" : ""}${pct(delta)}</span>` : ""}${foot}</div>
    </div>`;

  /* Tabel. columns: [{key,label,cls,render:(row,i)=>html}] */
  const table = ({ columns, rows, foot = "", cls = "", rowCls = null, empty = "Tidak ada data" }) => `
    <div class="table-wrap"><table class="tbl ${cls}">
      <thead><tr>${columns.map((c) => `<th class="${c.cls || ""}">${c.label}</th>`).join("")}</tr></thead>
      <tbody>${rows.length ? rows.map((r, i) => `<tr class="${rowCls ? rowCls(r, i) : ""}">${columns.map((c) => `<td class="${c.cls || ""}">${c.render ? c.render(r, i) : esc(r[c.key])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}"><div class="empty">${icon("inbox")}${empty}</div></td></tr>`}</tbody>
      ${foot ? `<tfoot>${foot}</tfoot>` : ""}
    </table></div>`;

  const pager = (total, per = 10) => `
    <div class="pager"><span>Menampilkan 1–${Math.min(per, total)} dari ${num(total)} data</span>
      <select class="select sm" style="width:auto" aria-label="Baris per halaman"><option>10</option><option>25</option><option>50</option><option>100</option></select>
      <div class="pages"><button type="button" aria-label="Sebelumnya">‹</button><button type="button" class="on">1</button><button type="button">2</button><button type="button">3</button><button type="button" aria-label="Berikutnya">›</button></div>
    </div>`;

  /* Tabs sederhana: items [{id,label,icon,n}] — gunakan data-tab-group untuk interaksi */
  const tabs = (group, items, active, onGrad = false) => `
    <div class="tabs ${onGrad ? "on-grad" : ""}" role="tablist" data-tab-group="${group}">
      ${items.map((t) => `<button type="button" role="tab" class="tab ${t.id === active ? "active" : ""}" data-tab="${t.id}">${t.icon ? icon(t.icon) : ""}${t.label}${t.n !== undefined ? `<span class="n">${t.n}</span>` : ""}</button>`).join("")}
    </div>`;

  /* Form fields */
  let fid = 0;
  const field = (label, control, hint = "", cls = "") => `<div class="field ${cls}"><label>${label}</label>${control}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const input = (label, opts = {}) => {
    const id = opts.id || `f${++fid}`;
    const ctrl = `<input id="${id}" class="input ${opts.size || ""}" type="${opts.type || "text"}" value="${esc(opts.value ?? "")}" placeholder="${esc(opts.ph || "")}" ${opts.attrs || ""}>`;
    return `<div class="field ${opts.cls || ""}"><label for="${id}">${label}</label>${opts.icon ? `<div class="input-icon">${icon(opts.icon)}${ctrl}</div>` : ctrl}${opts.hint ? `<span class="hint">${opts.hint}</span>` : ""}</div>`;
  };
  const select = (label, options, opts = {}) => {
    const id = opts.id || `f${++fid}`;
    return `<div class="field ${opts.cls || ""}"><label for="${id}">${label}</label><select id="${id}" class="select ${opts.size || ""}" ${opts.attrs || ""}>${options.map((o) => {
      const v = typeof o === "object" ? o.v : o; const l = typeof o === "object" ? o.l : o;
      return `<option value="${esc(v)}" ${String(v) === String(opts.value) ? "selected" : ""}>${esc(l)}</option>`;
    }).join("")}</select>${opts.hint ? `<span class="hint">${opts.hint}</span>` : ""}</div>`;
  };
  const textarea = (label, opts = {}) => {
    const id = opts.id || `f${++fid}`;
    return `<div class="field ${opts.cls || ""}"><label for="${id}">${label}</label><textarea id="${id}" class="textarea" placeholder="${esc(opts.ph || "")}">${esc(opts.value || "")}</textarea></div>`;
  };

  /* Filter bar standar laporan: periode + cabang + tombol */
  const cabangOptions = (withAll = true) => [...(withAll ? [{ v: "ALL", l: "Semua Cabang" }] : []), ...window.DB.cabang.map((c) => ({ v: c.id, l: c.nama }))];
  const filterBar = (extra = "", actions = null) => `
    <div class="filterbar">
      ${input("Dari tanggal", { type: "date", value: window.DB.iso(window.DB.addDays(-29)) })}
      ${input("Sampai tanggal", { type: "date", value: window.DB.iso(window.DB.TODAY) })}
      ${select("Cabang", cabangOptions(), { value: window.APP?.state.cabang || "ALL" })}
      ${extra}
      <div class="actions">${actions ?? `${btn("Tampilkan", "primary", { icon: "filter_alt", attrs: 'data-toast="Filter diterapkan"' })}${btn("Excel", "teal", { icon: "table_view", attrs: 'data-toast="Laporan diekspor ke Excel (.xlsx)"' })}${btn("PDF", "danger", { icon: "picture_as_pdf", attrs: 'data-toast="Laporan diekspor ke PDF"' })}`}</div>
    </div>`;

  const progress = (value, max, tone = "") => `<div class="progress ${tone}" role="progressbar" aria-valuenow="${Math.round((value / max) * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.min(100, (value / max) * 100).toFixed(1)}%"></span></div>`;

  const alert = (tone, ic, title, msg) => `<div class="alert ${tone}">${icon(ic)}<div><b>${title}</b>${msg}</div></div>`;

  const legend = (items) => `<div class="legend">${items.map(([label, color]) => `<span><i style="background:${color}"></i>${esc(label)}</span>`).join("")}</div>`;

  /* ---------- Modal ---------- */
  const modal = {
    open({ title, icon: ic = "", body = "", foot = "", size = "" }) {
      modal.close();
      const el = document.createElement("div");
      el.className = "overlay";
      el.id = "modal-overlay";
      el.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">${ic ? icon(ic) : ""}<h3>${title}</h3><button type="button" class="x" data-close aria-label="Tutup">${icon("close")}</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
      </div>`;
      el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) modal.close(); });
      document.body.appendChild(el);
      const f = el.querySelector("input,select,textarea,button:not(.x)");
      if (f) f.focus();
      return el;
    },
    close() { document.getElementById("modal-overlay")?.remove(); },
  };

  /* Konfirmasi (pengganti confirm() yang tidak tersedia di viewer) */
  const confirmBox = ({ title, msg, okLabel = "Ya, lanjutkan", okVariant = "danger", icon: ic = "help", onOk }) => {
    const el = modal.open({
      title, icon: ic, size: "sm",
      body: `<p>${msg}</p>`,
      foot: `${btn("Batal", "light", { attrs: "data-close" })}${btn(okLabel, okVariant, { icon: "check", attrs: 'id="confirm-ok"' })}`,
    });
    el.querySelector("#confirm-ok").addEventListener("click", () => { modal.close(); onOk && onOk(); });
  };

  /* ---------- Toast ---------- */
  const toast = (msg, tone = "success") => {
    let wrap = document.querySelector(".toasts");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toasts"; wrap.setAttribute("role", "status"); document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = `toast ${tone}`;
    const ic = { success: "check_circle", info: "info", warn: "warning", danger: "error" }[tone] || "check_circle";
    t.innerHTML = `${icon(ic, "fill")}<span>${esc(msg)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  };

  /* ---------- Charts (Chart.js) ----------
     Halaman memanggil UI.chart('id', config) di dalam render(); grafik dibuat setelah DOM terpasang. */
  const chartSpecs = []; // grafik milik halaman aktif (+ modal yang terbuka)
  const liveCharts = [];
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const chart = (id, cfg, cls = "") => {
    const i = chartSpecs.findIndex((c) => c.id === id);
    if (i >= 0) chartSpecs.splice(i, 1);
    chartSpecs.push({ id, cfg });
    return `<div class="chart-box ${cls}"><canvas id="${id}" role="img" aria-label="Grafik"></canvas></div>`;
  };
  const resetCharts = () => { liveCharts.splice(0).forEach((c) => c.destroy()); chartSpecs.length = 0; };
  const colors = () => ({
    c1: cssVar("--chart-1"), c2: cssVar("--chart-2"), c3: cssVar("--chart-3"), c4: cssVar("--chart-4"), c5: cssVar("--chart-5"),
    grid: cssVar("--chart-grid"), text: cssVar("--chart-text"), surface: cssVar("--surface"),
  });
  /* (Re)build semua grafik yang kanvasnya ada di DOM — aman dipanggil berulang (mis. saat pindah tab) */
  const mountCharts = () => {
    liveCharts.splice(0).forEach((c) => c.destroy());
    if (!window.Chart) return;
    const k = colors();
    Chart.defaults.font.family = cssVar("--font") || "sans-serif";
    Chart.defaults.color = k.text;
    Chart.defaults.borderColor = k.grid;
    chartSpecs.forEach(({ id, cfg }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const c = typeof cfg === "function" ? cfg(k, el) : cfg;
      c.options = c.options || {};
      c.options.responsive = true;
      c.options.maintainAspectRatio = false;
      c.options.plugins = Object.assign({ legend: { display: false }, tooltip: { backgroundColor: "#0a2a66", padding: 10, cornerRadius: 10, titleFont: { weight: "700" } } }, c.options.plugins || {});
      liveCharts.push(new Chart(el, c));
    });
  };
  /* area gradient untuk line chart */
  const areaFill = (el, color) => {
    const g = el.getContext("2d").createLinearGradient(0, 0, 0, el.clientHeight || 280);
    g.addColorStop(0, color + "55"); g.addColorStop(1, color + "00");
    return g;
  };
  const rpTick = (v) => (Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString("id-ID") + " M" : Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString("id-ID") + " jt" : v.toLocaleString("id-ID"));

  window.UI = { esc, rp, num, pct, short, tgl, cabangNama, icon, btn, rowActions, badge, status, golongan, pageHeader, card, stat, table, pager, tabs, field, input, select, textarea, cabangOptions, filterBar, progress, alert, legend, modal, confirmBox, toast, chart, mountCharts, resetCharts, areaFill, rpTick, colors };
})();
