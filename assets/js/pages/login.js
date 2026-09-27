/* Login (layar penuh, tanpa app shell) */
(function () {
  window.PAGES = window.PAGES || {};
  const { icon, btn, esc, badge, select, toast } = UI;

  const ROLES = [
    { id: "apoteker", label: "Apoteker", ic: "medication", user: "rina.wulandari" },
    { id: "kasir", label: "Kasir", ic: "point_of_sale", user: "fikri.r" },
    { id: "owner", label: "Owner", ic: "workspace_premium", user: "anton.w" },
  ];
  const KPI = [
    ["storefront", "5 cabang", "terhubung real-time ke pusat"],
    ["receipt_long", "42.000+", "transaksi per bulan"],
    ["event_busy", "Peringatan ED", "otomatis dengan metode FEFO"],
    ["shield", "Laporan SIPNAP", "narkotika & psikotropika siap kirim"],
  ];
  const ms = (name, style) => `<span class="ms" aria-hidden="true" style="${style}">${name}</span>`;

  window.PAGES.login = {
    render() {
      return `
      <div class="login" style="min-height:100vh;min-height:100dvh">
        <section class="login-art">
          <div class="row" style="gap:12px;flex-wrap:nowrap">
            <div class="brand-logo">${icon("local_pharmacy", "fill")}</div>
            <div><div class="brand-name">FarmaKasir</div><div class="brand-sub">POS &amp; Manajemen Apotek</div></div>
          </div>
          <div>
            <h2>Apotek multi-cabang, satu kasir yang rapi.</h2>
            <p>Penjualan bebas & resep, racikan, stok per batch dan kedaluwarsa, Surat Pesanan ke PBF, hingga laporan konsolidasi — semuanya tersinkron antar cabang.</p>
          </div>
          <div class="float-cards" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            ${KPI.map(([ic, b, s]) => `
              <div class="float-card">
                ${ms(ic, "font-size:22px;color:var(--on-grad);margin-bottom:8px;display:block")}
                <b>${b}</b><span>${s}</span>
              </div>`).join("")}
          </div>
          <div class="small" style="opacity:.8">Terintegrasi SATUSEHAT · BPJS Kesehatan PRB · SIPNAP · e-Faktur</div>
        </section>

        <section class="login-form">
          <div class="login-box">
            <div>
              <h1>Masuk ke FarmaKasir</h1>
              <p class="muted" style="margin-top:6px">Pilih peran Anda, lalu masuk dengan akun yang terdaftar.</p>
            </div>

            <div class="role-pick" role="radiogroup" aria-label="Peran pengguna" id="lg-roles">
              ${ROLES.map((r, i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? "active" : ""}" data-role="${r.id}">${icon(r.ic)}${r.label}</button>`).join("")}
            </div>

            ${select("Cabang", UI.cabangOptions(false), { id: "lg-cabang", value: "PST" })}

            <div class="field"><label for="lg-user">Nama pengguna</label>
              <div class="input-icon">${icon("person")}<input id="lg-user" class="input" type="text" autocomplete="username" value="${esc(ROLES[0].user)}" placeholder="Nama pengguna"></div>
            </div>

            <div class="field"><label for="lg-pass">Kata sandi</label>
              <div class="input-icon">${icon("lock")}
                <input id="lg-pass" class="input" type="password" autocomplete="current-password" value="farmakasir" placeholder="Kata sandi" style="padding-right:48px">
                <button type="button" id="lg-eye" aria-label="Tampilkan kata sandi" title="Tampilkan kata sandi"
                  style="position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;border-radius:9px;background:transparent;color:var(--text-3);cursor:pointer;display:grid;place-items:center">
                  ${ms("visibility", "position:static;transform:none")}
                </button>
              </div>
            </div>

            <div class="row between">
              <label class="check"><input type="checkbox" checked>Ingat saya di perangkat ini</label>
              <button type="button" class="small strong" style="background:none;border:0;padding:0;color:var(--c-primary-2);cursor:pointer" data-toast="Tautan reset kata sandi dikirim ke email terdaftar" data-tone="info">Lupa kata sandi?</button>
            </div>

            ${btn("Masuk sebagai Apoteker", "success", { size: "xl", block: true, icon: "login", attrs: 'id="lg-submit" data-go="dashboard"' })}

            <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="divider" style="flex:1"></div><span class="small muted">atau</span><div class="divider" style="flex:1"></div></div>
            ${btn("Masuk cepat dengan PIN kasir", "light", { block: true, icon: "pin", attrs: 'data-toast="Masukkan 6 digit PIN di keypad kasir" data-tone="info"' })}

            <div class="row between small muted" style="margin-top:8px">
              <span>FarmaKasir v2.6.0 · build 2609</span>
              ${badge("Server online", "green", { dot: true })}
            </div>
          </div>
        </section>
      </div>`;
    },

    mount(root) {
      const roles = root.querySelector("#lg-roles");
      const user = root.querySelector("#lg-user");
      const submit = root.querySelector("#lg-submit span:not(.ms)");
      roles?.addEventListener("click", (e) => {
        const b = e.target.closest("[data-role]");
        if (!b) return;
        roles.querySelectorAll("[data-role]").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-checked", String(x === b)); });
        const r = ROLES.find((x) => x.id === b.dataset.role);
        user.value = r.user;
        if (submit) submit.textContent = `Masuk sebagai ${r.label}`;
      });

      const pass = root.querySelector("#lg-pass");
      const eye = root.querySelector("#lg-eye");
      eye?.addEventListener("click", () => {
        const show = pass.type === "password";
        pass.type = show ? "text" : "password";
        eye.querySelector(".ms").textContent = show ? "visibility_off" : "visibility";
        const t = show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi";
        eye.setAttribute("aria-label", t); eye.title = t;
      });

      root.querySelectorAll("#lg-user, #lg-pass").forEach((el) => el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        toast("Berhasil masuk. Selamat bekerja!");
        window.APP.go("dashboard");
      }));
    },
  };
})();
