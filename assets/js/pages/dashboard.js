/* Dashboard */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, card, stat, rp, num, short, table, status, badge, chart, areaFill, rpTick, esc, legend, progress, tgl } = UI;

  window.PAGES.dashboard = {
    render({ state }) {
      // Lingkup: konsolidasi (semua cabang) atau per cabang → angka diskalakan dengan porsi omzet cabang
      const ALL = state.cabang === "ALL";
      const totOmzet = DB.cabang.reduce((a, c) => a + c.omzet, 0);
      const f = ALL ? 1 : DB.cabang.find((c) => c.id === state.cabang).omzet / totOmzet;
      const cabs = ALL ? DB.cabang.map((c) => c.id) : [state.cabang];
      const h = DB.harian.map((d) => ({ ...d, umum: Math.round(d.umum * f), resep: Math.round(d.resep * f), total: Math.round(d.total * f), trx: Math.round(d.trx * f) }));
      const today = h[h.length - 1];
      const yday = h[h.length - 2];
      const lr = GL.labaRugi(state.cabang);
      const nr = GL.neraca(state.cabang);
      const dlt = ((today.total - yday.total) / yday.total) * 100;
      const cab = state.cabang === "ALL" ? "Semua Cabang" : UI.cabangNama(state.cabang);
      const low = DB.obat.filter((o) => cabs.some((c) => (o.stok[c] || 0) < o.min));
      const expired = DB.batches.filter((b) => b.sisaHari < 0 && cabs.includes(b.cabang));
      const near = DB.batches.filter((b) => b.sisaHari >= 0 && b.sisaHari <= 90 && cabs.includes(b.cabang));
      const top = [
        ["Paracetamol 500 mg", 1840, 10120000], ["Amoxicillin 500 mg", 1210, 10285000], ["Vitamin C 1000 mg", 612, 27540000],
        ["OBH Combi Batuk Flu", 598, 11661000], ["Amlodipine 10 mg", 544, 4624000], ["Omeprazole 20 mg", 489, 5134500],
      ];
      top.forEach((t) => { t[1] = Math.max(1, Math.round(t[1] * f)); t[2] = Math.round(t[2] * f); });
      const maxTop = Math.max(...top.map((t) => t[1]));

      return `
      ${UI.pageHeader({
        title: `Selamat pagi, apt. ${state.user.nama.split(" ")[0]}`,
        sub: `Ringkasan operasional <b>${esc(ALL ? "semua cabang (konsolidasi)" : cab)}</b> hari ini, ${tgl(DB.TODAY)}. Data diperbarui otomatis setiap 5 menit.`,
        crumbs: ["Dashboard"],
        actions: `${btn("Buka Kasir", "success", { icon: "point_of_sale", attrs: 'data-go="kasir"' })}${btn("Input Resep", "white", { icon: "prescriptions", attrs: 'data-go="resep"' })}${btn("Unduh Ringkasan", "glass", { icon: "download", attrs: 'data-toast="Ringkasan harian diunduh (PDF)"' })}`,
      })}

      <div class="grid g-4">
        ${stat({ label: "Penjualan hari ini", value: short(today.total), icon: "payments", tone: "primary", delta: dlt, foot: "vs kemarin", hero: true })}
        ${stat({ label: "Jumlah transaksi", value: num(today.trx), icon: "receipt_long", tone: "success", delta: 4.2, foot: `rata-rata ${rp(today.total / today.trx)}` })}
        ${stat({ label: "Resep dilayani", value: num(Math.round(186 * f)), icon: "prescriptions", tone: "purple", delta: 7.8, foot: `${Math.round(24 * f)} racikan · ${Math.max(1, Math.round(5 * f))} iter` })}
        ${stat({ label: "Laba kotor bulan ini", value: short(lr.lk), icon: "savings", tone: "teal", foot: `margin ${UI.pct(lr.lk / lr.bersih * 100)} · dari jurnal` })}
      </div>

      <div class="grid g-4">
        <button type="button" class="stat" data-go="stok" style="text-align:left;cursor:pointer">
          <div class="top"><span class="label">Stok di bawah minimum</span><span class="ico tone-warning">${icon("inventory")}</span></div>
          <div class="value">${low.length} item</div><div class="foot">${badge("Perlu SP", "amber", { dot: true })} buat pesanan ke PBF</div>
        </button>
        <button type="button" class="stat" data-go="kadaluarsa" style="text-align:left;cursor:pointer">
          <div class="top"><span class="label">Sudah kedaluwarsa</span><span class="ico tone-danger">${icon("event_busy")}</span></div>
          <div class="value">${expired.length} batch</div><div class="foot">${badge("Karantina", "red", { dot: true })} nilai ${short(expired.reduce((s, b) => s + b.qty * b.hargaBeli, 0))}</div>
        </button>
        <button type="button" class="stat" data-go="kadaluarsa" style="text-align:left;cursor:pointer">
          <div class="top"><span class="label">ED ≤ 90 hari</span><span class="ico tone-pink">${icon("hourglass_bottom")}</span></div>
          <div class="value">${near.length} batch</div><div class="foot">${badge("Pantau", "pink", { dot: true })} prioritaskan FEFO</div>
        </button>
        <button type="button" class="stat" data-go="hutang" style="text-align:left;cursor:pointer">
          <div class="top"><span class="label">Hutang usaha ke PBF</span><span class="ico tone-info">${icon("request_quote")}</span></div>
          <div class="value">${short(nr.hutang)}</div><div class="foot">${badge(`${short(nr.hutang * 0.106)} jatuh tempo 7 hari`, "cyan", { dot: true })}</div>
        </button>
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Tren penjualan 30 hari", desc: "Penjualan bebas (umum) dan resep, dalam rupiah", icon: "show_chart",
          tools: `<div class="tabs" data-tab-group="dash-trend"><button type="button" class="tab active" data-tab="30">30 hari</button><button type="button" class="tab" data-tab="7">7 hari</button></div>`,
          body: `${legend([["Penjualan umum", "var(--chart-1)"], ["Penjualan resep", "var(--chart-2)"]])}
            <div data-panel-group="dash-trend" data-panel="30">${chart("ch-trend", (k, el) => ({
              type: "line",
              data: { labels: h.map((d) => d.tgl.slice(8) + "/" + d.tgl.slice(5, 7)), datasets: [
                { label: "Umum", data: h.map((d) => d.umum), borderColor: k.c1, backgroundColor: areaFill(el, k.c1), fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 },
                { label: "Resep", data: h.map((d) => d.resep), borderColor: k.c2, backgroundColor: "transparent", tension: .35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 },
              ] },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: { ticks: { callback: rpTick }, grid: { color: k.grid } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${rp(c.raw)}` } } } },
            }))}</div>
            <div data-panel-group="dash-trend" data-panel="7" hidden>${chart("ch-trend7", (k) => ({
              type: "bar",
              data: { labels: h.slice(-7).map((d) => new Date(d.tgl).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })), datasets: [
                { label: "Umum", data: h.slice(-7).map((d) => d.umum), backgroundColor: k.c1, borderRadius: 4, borderSkipped: "bottom", stack: "s" },
                { label: "Resep", data: h.slice(-7).map((d) => d.resep), backgroundColor: k.c2, borderRadius: 4, borderSkipped: "bottom", stack: "s" },
              ] },
              options: { interaction: { mode: "index", intersect: false }, scales: { y: { stacked: true, ticks: { callback: rpTick }, grid: { color: k.grid } }, x: { stacked: true, grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${rp(c.raw)}` } } } },
            }))}</div>`,
        })}
        ${card({
          title: "Komposisi pembayaran", desc: "Hari ini, seluruh kasir", icon: "donut_small", tone: "cyan",
          body: `${chart("ch-pay", (k) => ({
            type: "doughnut",
            data: { labels: ["Tunai", "QRIS", "Debit", "Kartu Kredit", "Transfer/Tempo"], datasets: [{ data: [38, 31, 17, 8, 6], backgroundColor: [k.c1, k.c2, k.c3, k.c4, k.c5], borderColor: k.surface, borderWidth: 2 }] },
            options: { cutout: "68%", plugins: { tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}%` } } } },
          }), "sm")}
          <div class="stack" style="margin-top:14px">
            ${[["Tunai", 38, "var(--chart-1)"], ["QRIS", 31, "var(--chart-2)"], ["Debit", 17, "var(--chart-3)"], ["Kartu Kredit", 8, "var(--chart-4)"], ["Transfer/Tempo", 6, "var(--chart-5)"]].map(([l, v, c]) => `<div class="row between small"><span class="row" style="gap:8px"><i style="width:10px;height:10px;border-radius:3px;background:${c};display:inline-block"></i>${l}</span><b class="num">${v}%</b></div>`).join("")}
          </div>`,
        })}
      </div>

      <div class="grid g-3">
        ${card({
          title: "Obat terlaris", desc: "Berdasarkan qty terjual bulan ini", icon: "local_fire_department", tone: "amber",
          body: `<div class="stack">${top.map(([n, q, v], i) => `
            <div class="stack" style="gap:6px"><div class="row between"><span class="strong small">${i + 1}. ${esc(n)}</span><span class="small muted num">${num(q)} unit</span></div>${progress(q, maxTop, i === 0 ? "" : "green")}</div>`).join("")}</div>`,
        })}
        ${card({
          title: "Performa cabang", desc: ALL ? "Omzet bulan berjalan vs target" : "Cabang aktif ditandai · pembanding semua cabang", icon: "store", tone: "purple",
          tools: btn("Detail", "info", { size: "sm", icon: "arrow_forward", attrs: 'data-go="lap-cabang"' }),
          body: `<div class="stack">${DB.cabang.map((c) => {
            const p = (c.omzet / c.target) * 100;
            return `<div class="stack" style="gap:6px"><div class="row between"><span class="strong small">${esc(c.nama.replace("Cabang ", ""))} ${c.id === state.cabang ? badge("Aktif", "green") : ""}</span><span class="small num ${p >= 100 ? "" : "muted"}">${UI.pct(p)}</span></div>${progress(c.omzet, c.target, p >= 100 ? "green" : p >= 90 ? "" : "amber")}<div class="small muted num">${short(c.omzet)} / ${short(c.target)}</div></div>`;
          }).join("")}</div>`,
        })}
        ${card({
          title: "Perlu tindakan", desc: "Peringatan sistem", icon: "notifications_active", tone: "red", flush: true,
          body: `<div class="list">${DB.notif.map((n) => `
            <div class="list-item"><div class="sq-ico ${n.tone}">${icon(n.ic)}</div><div class="grow"><div class="title small">${esc(n.t)}</div><div class="meta">${esc(n.m)}</div></div>
            ${btn("", "info", { icon: "chevron_right", size: "sm", title: "Buka", attrs: `data-go="${n.go}"` })}</div>`).join("")}</div>`,
        })}
      </div>

      <div class="grid g-2-1">
        ${card({
          title: "Transaksi terbaru", desc: `${esc(ALL ? "Semua cabang" : cab)} · hari ini`, icon: "receipt_long", flush: true,
          tools: btn("Semua transaksi", "primary", { size: "sm", icon: "list", attrs: 'data-go="riwayat"' }),
          body: table({
            columns: [
              { label: "No. Invoice", render: (r, i) => `<span class="mono strong">${ALL ? cabs[i % cabs.length] : state.cabang}/${r.no.split("/").pop()}</span><div class="t-sub">${r.waktu} · ${esc(r.kasir)}</div>` },
              { label: "Pelanggan", render: (r) => `${esc(r.pelanggan)}<div class="t-sub">${badge(r.jenis, { Resep: "blue", Racikan: "purple", Bebas: "gray", B2B: "teal" }[r.jenis])}</div>` },
              { label: "Bayar", key: "bayar" },
              { label: "Total", cls: "num", render: (r) => `<b>${rp(r.total)}</b>` },
              { label: "Status", render: (r) => status(r.status) },
            ],
            rows: DB.transaksi.slice(0, 6),
          }),
        })}
        ${card({
          title: "Antrian resep", desc: "Status penyiapan obat", icon: "prescriptions", tone: "purple", flush: true,
          tools: btn("Kelola", "purple", { size: "sm", icon: "arrow_forward", attrs: 'data-go="resep"' }),
          body: `<div class="list">${DB.resep.slice(0, 5).map((r) => `
            <div class="list-item"><div class="avatar sm">${r.pasien.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
            <div class="grow"><div class="title small">${esc(r.pasien)} ${r.racikan ? badge("Racikan", "purple") : ""}</div><div class="meta">${esc(r.dokter)} · ${r.jam}</div></div>${status(r.status)}</div>`).join("")}</div>`,
        })}
      </div>`;
    },
  };
})();
