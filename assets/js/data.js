/* =====================================================================
   Data akun demo (Apotek Sehat Bersama, 5 cabang). Semua angka fiktif.
   ===================================================================== */
(function () {
  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);
  const addDays = (d) => { const x = new Date(TODAY); x.setDate(x.getDate() + d); return x; };
  const iso = (d) => d.toISOString().slice(0, 10);

  // Pseudo-random deterministik agar data konsisten tiap muat ulang
  let seed = 20260927;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));

  const apotek = {
    nama: "Apotek Sehat Bersama",
    badanUsaha: "PT Sehat Bersama Farma",
    npwp: "01.234.567.8-012.000",
    alamat: "Jl. RS Fatmawati No. 88, Cilandak, Jakarta Selatan",
    telp: "(021) 750 1234",
    apotekerPJ: "apt. Rina Wulandari, S.Farm.",
    sipa: "SIPA 449.1/0231/DPMPTSP/2024",
    sia: "SIA 503/0087/DPMPTSP/2023",
  };

  const cabang = [
    { id: "PST", nama: "Cabang Pusat Fatmawati", kota: "Jakarta Selatan", apoteker: "apt. Rina Wulandari", target: 1450000000, omzet: 1386500000, trx: 9812, karyawan: 14, jam: "24 jam" },
    { id: "BKS", nama: "Cabang Bekasi Summarecon", kota: "Bekasi", apoteker: "apt. Dimas Pratama", target: 980000000, omzet: 1012300000, trx: 7420, karyawan: 10, jam: "07.00–23.00" },
    { id: "DPK", nama: "Cabang Depok Margonda", kota: "Depok", apoteker: "apt. Sari Nuraini", target: 870000000, omzet: 802750000, trx: 6655, karyawan: 9, jam: "07.00–22.00" },
    { id: "TGR", nama: "Cabang Tangerang BSD", kota: "Tangerang Selatan", apoteker: "apt. Yoga Aditya", target: 920000000, omzet: 948200000, trx: 6910, karyawan: 9, jam: "07.00–23.00" },
    { id: "BGR", nama: "Cabang Bogor Pajajaran", kota: "Bogor", apoteker: "apt. Maya Kartika", target: 640000000, omzet: 571900000, trx: 4870, karyawan: 7, jam: "08.00–22.00" },
  ];

  const kategori = ["Analgesik & Antipiretik", "Antibiotik", "Batuk & Flu", "Saluran Cerna", "Kardiovaskular", "Diabetes", "Vitamin & Suplemen", "Kulit & Topikal", "Mata & THT", "Alat Kesehatan", "Ibu & Anak", "Psikotropika & Narkotika"];

  // golongan: bebas | terbatas | keras | psikotropika | narkotika | oot | prekursor
  const obat = [
    ["OB0001", "Paracetamol 500 mg", "Paracetamol", "Analgesik & Antipiretik", "bebas", "Tablet", "Strip", 10, 3800, 5500, "Kimia Farma", "A1-01", "8992858600013"],
    ["OB0002", "Panadol Extra", "Paracetamol + Kafein", "Analgesik & Antipiretik", "terbatas", "Kaplet", "Strip", 10, 11200, 14500, "GSK", "A1-02", "8992695101019"],
    ["OB0003", "Ibuprofen 400 mg", "Ibuprofen", "Analgesik & Antipiretik", "keras", "Tablet", "Strip", 10, 4200, 7000, "Hexpharm", "A1-03", "8992696420105"],
    ["OB0004", "Asam Mefenamat 500 mg", "Asam Mefenamat", "Analgesik & Antipiretik", "keras", "Kaplet", "Strip", 10, 3500, 6000, "Novapharin", "A1-04", "8992858600211"],
    ["OB0005", "Amoxicillin 500 mg", "Amoxicillin trihidrat", "Antibiotik", "keras", "Kapsul", "Strip", 10, 5200, 8500, "Indofarma", "B2-01", "8992943100014"],
    ["OB0006", "Cefadroxil 500 mg", "Cefadroxil", "Antibiotik", "keras", "Kapsul", "Strip", 10, 12500, 19000, "Hexpharm", "B2-02", "8992696420303"],
    ["OB0007", "Azithromycin 500 mg", "Azithromycin", "Antibiotik", "keras", "Tablet", "Strip", 3, 28000, 42000, "Dexa Medica", "B2-03", "8992858601119"],
    ["OB0008", "Ciprofloxacin 500 mg", "Ciprofloxacin", "Antibiotik", "keras", "Tablet", "Strip", 10, 6800, 11000, "Kimia Farma", "B2-04", "8992858601225"],
    ["OB0009", "OBH Combi Batuk Flu 100 ml", "Succus Liquiritiae + Paracetamol", "Batuk & Flu", "terbatas", "Sirup", "Botol", 1, 14800, 19500, "Combiphar", "C1-01", "8992858603038"],
    ["OB0010", "Dextromethorphan 15 mg", "Dextromethorphan HBr", "Batuk & Flu", "oot", "Tablet", "Strip", 10, 2400, 4000, "Kimia Farma", "C1-02", "8992858603114"],
    ["OB0011", "Pseudoephedrine 60 mg", "Pseudoephedrine HCl", "Batuk & Flu", "prekursor", "Tablet", "Strip", 10, 6100, 9500, "Sanbe", "C1-03", "8992858603220"],
    ["OB0012", "Ambroxol 30 mg", "Ambroxol HCl", "Batuk & Flu", "keras", "Tablet", "Strip", 10, 2900, 5000, "Dexa Medica", "C1-04", "8992858603336"],
    ["OB0013", "Omeprazole 20 mg", "Omeprazole", "Saluran Cerna", "keras", "Kapsul", "Strip", 10, 6400, 10500, "Novell", "D1-01", "8992858604012"],
    ["OB0014", "Antasida Doen", "Al(OH)3 + Mg(OH)2", "Saluran Cerna", "bebas", "Tablet Kunyah", "Strip", 10, 2100, 3500, "Phapros", "D1-02", "8992858604128"],
    ["OB0015", "Loperamide 2 mg", "Loperamide HCl", "Saluran Cerna", "terbatas", "Tablet", "Strip", 10, 3900, 6500, "Hexpharm", "D1-03", "8992858604234"],
    ["OB0016", "Oralit 200 ml", "Garam Rehidrasi Oral", "Saluran Cerna", "bebas", "Serbuk", "Sachet", 1, 900, 1500, "Pharin", "D1-04", "8992858604340"],
    ["OB0017", "Amlodipine 10 mg", "Amlodipine besylate", "Kardiovaskular", "keras", "Tablet", "Strip", 10, 4800, 8500, "Dexa Medica", "E1-01", "8992858605019"],
    ["OB0018", "Captopril 25 mg", "Captopril", "Kardiovaskular", "keras", "Tablet", "Strip", 10, 2200, 4000, "Indofarma", "E1-02", "8992858605125"],
    ["OB0019", "Simvastatin 20 mg", "Simvastatin", "Kardiovaskular", "keras", "Tablet", "Strip", 10, 4100, 7500, "Kimia Farma", "E1-03", "8992858605231"],
    ["OB0020", "Clopidogrel 75 mg", "Clopidogrel", "Kardiovaskular", "keras", "Tablet", "Strip", 10, 18500, 27000, "Sanbe", "E1-04", "8992858605347"],
    ["OB0021", "Metformin 500 mg", "Metformin HCl", "Diabetes", "keras", "Tablet", "Strip", 10, 3100, 5500, "Hexpharm", "E2-01", "8992858606016"],
    ["OB0022", "Glimepiride 2 mg", "Glimepiride", "Diabetes", "keras", "Tablet", "Strip", 10, 5600, 9500, "Dexa Medica", "E2-02", "8992858606122"],
    ["OB0023", "Vitamin C 1000 mg", "Asam Askorbat", "Vitamin & Suplemen", "bebas", "Tablet Effervescent", "Tube", 10, 32000, 45000, "Bayer", "F1-01", "8992858607013"],
    ["OB0024", "Becom-Zet", "Multivitamin + Zinc", "Vitamin & Suplemen", "bebas", "Kaplet", "Strip", 10, 16500, 23000, "Kalbe", "F1-02", "8992858607129"],
    ["OB0025", "Sangobion", "Ferrous gluconate + Vit", "Vitamin & Suplemen", "bebas", "Kapsul", "Strip", 10, 16800, 22500, "Merck", "F1-03", "8992858607235"],
    ["OB0026", "Hydrocortisone Krim 2,5%", "Hydrocortisone acetate", "Kulit & Topikal", "keras", "Krim", "Tube", 1, 7200, 12000, "Kimia Farma", "G1-01", "8992858608010"],
    ["OB0027", "Betadine Solution 30 ml", "Povidone iodine 10%", "Kulit & Topikal", "bebas", "Cairan", "Botol", 1, 18900, 26000, "Mahakam Beta Farma", "G1-02", "8992858608126"],
    ["OB0028", "Salep 2-4", "As. Salisilat + Sulfur", "Kulit & Topikal", "bebas", "Salep", "Pot", 1, 5200, 8500, "Kimia Farma", "G1-03", "8992858608232"],
    ["OB0029", "Insto Regular 7,5 ml", "Tetrahydrozoline HCl", "Mata & THT", "terbatas", "Tetes Mata", "Botol", 1, 12400, 17000, "Combiphar", "H1-01", "8992858609019"],
    ["OB0030", "Cendo Xitrol", "Dexamethasone + Neomycin", "Mata & THT", "keras", "Tetes Mata", "Botol", 1, 34500, 48000, "Cendo", "H1-02", "8992858609125"],
    ["OB0031", "Masker Medis 3 Ply", "Masker", "Alat Kesehatan", "bebas", "Pcs", "Box", 50, 22000, 35000, "OneMed", "I1-01", "8992858610016"],
    ["OB0032", "Termometer Digital", "Termometer", "Alat Kesehatan", "bebas", "Pcs", "Pcs", 1, 24000, 39000, "OneMed", "I1-02", "8992858610122"],
    ["OB0033", "Tensimeter Digital", "Sphygmomanometer", "Alat Kesehatan", "bebas", "Pcs", "Unit", 1, 285000, 395000, "Omron", "I1-03", "8992858610238"],
    ["OB0034", "Tempra Sirup 60 ml", "Paracetamol 160 mg/5 ml", "Ibu & Anak", "bebas", "Sirup", "Botol", 1, 42000, 56000, "Taisho", "J1-01", "8992858611015"],
    ["OB0035", "Zinc Sirup 20 mg/5 ml", "Zinc sulfate", "Ibu & Anak", "keras", "Sirup", "Botol", 1, 17500, 26000, "Novell", "J1-02", "8992858611121"],
    ["OB0036", "Alprazolam 0,5 mg", "Alprazolam", "Psikotropika & Narkotika", "psikotropika", "Tablet", "Strip", 10, 9800, 16000, "Mersifarma", "K1-01", "8992858612012"],
    ["OB0037", "Diazepam 5 mg", "Diazepam", "Psikotropika & Narkotika", "psikotropika", "Tablet", "Strip", 10, 3900, 7000, "Indofarma", "K1-02", "8992858612128"],
    ["OB0038", "Codeine 10 mg", "Codeine phosphate", "Psikotropika & Narkotika", "narkotika", "Tablet", "Strip", 10, 14500, 22000, "Kimia Farma", "K1-03", "8992858612234"],
    ["OB0039", "Dexamethasone 0,5 mg", "Dexamethasone", "Analgesik & Antipiretik", "keras", "Tablet", "Strip", 10, 1500, 3000, "Harsen", "A1-05", "8992858600327"],
    ["OB0040", "Cetirizine 10 mg", "Cetirizine HCl", "Batuk & Flu", "keras", "Tablet", "Strip", 10, 2600, 5000, "Hexpharm", "C1-05", "8992858603442"],
    ["OB0041", "CTM 4 mg", "Chlorpheniramine maleate", "Batuk & Flu", "terbatas", "Tablet", "Strip", 10, 900, 2000, "Kimia Farma", "C1-06", "8992858603558"],
    ["OB0042", "Lactulose Sirup 60 ml", "Lactulose", "Saluran Cerna", "keras", "Sirup", "Botol", 1, 48000, 65000, "Kalbe", "D1-05", "8992858604456"],
  ].map((r, i) => {
    const stok = {};
    cabang.forEach((c) => { stok[c.id] = ri(0, 18) === 0 ? ri(0, 6) : ri(12, 240); });
    const min = r[6] === "Unit" || r[6] === "Pcs" ? 3 : 20;
    return {
      kode: r[0], nama: r[1], generik: r[2], kategori: r[3], golongan: r[4], bentuk: r[5], satuan: r[6], isi: r[7],
      hargaBeli: r[8], hargaJual: r[9], hargaResep: Math.round(r[9] * 1.1 / 100) * 100, hargaMember: Math.round(r[9] * 0.95 / 100) * 100,
      pabrik: r[10], rak: r[11], barcode: r[12], stok, min, pajak: 11, aktif: true,
    };
  });

  const golonganLabel = {
    bebas: "Obat Bebas", terbatas: "Bebas Terbatas", keras: "Obat Keras", psikotropika: "Psikotropika",
    narkotika: "Narkotika", oot: "OOT", prekursor: "Prekursor",
  };

  // Batch + tanggal kedaluwarsa (ED)
  const batches = [];
  const edOffsets = [-40, -12, -3, 9, 18, 26, 41, 58, 75, 88, 120, 150, 170, 210, 260, 320, 400, 480, 540, 610, 700];
  obat.forEach((o, i) => {
    const n = 1 + (i % 3);
    for (let k = 0; k < n; k++) {
      const off = edOffsets[(i * 3 + k * 7) % edOffsets.length];
      const cab = cabang[(i + k) % cabang.length].id;
      batches.push({
        kode: o.kode, nama: o.nama, golongan: o.golongan, satuan: o.satuan, cabang: cab,
        batch: `${o.pabrik.slice(0, 2).toUpperCase()}${(2400 + i * 7 + k).toString()}${String.fromCharCode(65 + k)}`,
        ed: iso(addDays(off)), sisaHari: off, qty: ri(4, 90), hargaBeli: o.hargaBeli,
        supplier: ["PT Kimia Farma Trading", "PT Anugerah Pharmindo Lestari", "PT Enseval Putera Megatrading", "PT Parit Padang Global", "PT Bina San Prima"][(i + k) % 5],
      });
    }
  });

  const pelanggan = [
    { id: "MB-00121", nama: "Budi Santoso", hp: "0812-8812-3301", tipe: "Member Gold", poin: 2450, total: 8450000, kunjungan: 42, alergi: "Penisilin", lahir: "1978-04-12", bpjs: "0001234567891" },
    { id: "MB-00188", nama: "Siti Aminah", hp: "0813-1122-9087", tipe: "Member Silver", poin: 980, total: 3120000, kunjungan: 18, alergi: "-", lahir: "1985-11-02", bpjs: "-" },
    { id: "MB-00203", nama: "Hendra Wijaya", hp: "0857-7788-4412", tipe: "Member Gold", poin: 3120, total: 11200000, kunjungan: 57, alergi: "Sulfa", lahir: "1962-07-21", bpjs: "0002233445566" },
    { id: "MB-00245", nama: "Dewi Lestari", hp: "0811-9087-2231", tipe: "Member Reguler", poin: 210, total: 890000, kunjungan: 6, alergi: "-", lahir: "1992-02-14", bpjs: "-" },
    { id: "MB-00261", nama: "Agus Salim", hp: "0821-3345-6677", tipe: "Member Silver", poin: 1340, total: 4560000, kunjungan: 25, alergi: "Aspirin", lahir: "1970-09-30", bpjs: "0003344556677" },
    { id: "MB-00277", nama: "Rudi Hartono", hp: "0812-5566-7788", tipe: "Member Reguler", poin: 95, total: 410000, kunjungan: 3, alergi: "-", lahir: "1999-12-01", bpjs: "-" },
    { id: "MB-00290", nama: "Lina Marlina", hp: "0878-1234-9900", tipe: "Member Gold", poin: 2760, total: 9870000, kunjungan: 48, alergi: "-", lahir: "1981-06-18", bpjs: "0004455667788" },
    { id: "UMUM", nama: "Pelanggan Umum", hp: "-", tipe: "Umum", poin: 0, total: 0, kunjungan: 0, alergi: "-", lahir: "-", bpjs: "-" },
  ];

  const dokter = [
    { id: "DR-001", nama: "dr. Andi Pratama, Sp.PD", sip: "SIP 503/1102/DINKES/2024", spesialis: "Penyakit Dalam", faskes: "RS Fatmawati", hp: "0812-1111-2222", resep: 142 },
    { id: "DR-002", nama: "dr. Maria Ulfa, Sp.A", sip: "SIP 503/0987/DINKES/2023", spesialis: "Anak", faskes: "Klinik Tumbuh Kembang", hp: "0813-2222-3333", resep: 118 },
    { id: "DR-003", nama: "dr. Bambang Susilo", sip: "SIP 503/0765/DINKES/2024", spesialis: "Umum", faskes: "Klinik Pratama Sehat", hp: "0857-3333-4444", resep: 206 },
    { id: "DR-004", nama: "drg. Nia Kurniasih", sip: "SIP 503/0543/DINKES/2022", spesialis: "Gigi", faskes: "Praktik Mandiri", hp: "0811-4444-5555", resep: 37 },
    { id: "DR-005", nama: "dr. Fajar Nugroho, Sp.KK", sip: "SIP 503/1234/DINKES/2025", spesialis: "Kulit & Kelamin", faskes: "RS Pondok Indah", hp: "0821-5555-6666", resep: 64 },
    { id: "DR-006", nama: "dr. Ratna Sari, Sp.JP", sip: "SIP 503/1456/DINKES/2024", spesialis: "Jantung", faskes: "RS Harapan Kita", hp: "0878-6666-7777", resep: 88 },
  ];

  const supplier = [
    { id: "PBF-01", nama: "PT Kimia Farma Trading & Distribution", kota: "Jakarta", izin: "PBF 10.03/PBF/2021", top: 30, hutang: 184500000, cp: "Ibu Wati", hp: "021-4211000" },
    { id: "PBF-02", nama: "PT Anugerah Pharmindo Lestari", kota: "Jakarta", izin: "PBF 10.07/PBF/2020", top: 45, hutang: 226800000, cp: "Bpk. Hari", hp: "021-4602200" },
    { id: "PBF-03", nama: "PT Enseval Putera Megatrading", kota: "Jakarta", izin: "PBF 10.11/PBF/2022", top: 30, hutang: 97250000, cp: "Ibu Vera", hp: "021-4602300" },
    { id: "PBF-04", nama: "PT Parit Padang Global", kota: "Tangerang", izin: "PBF 36.02/PBF/2021", top: 60, hutang: 58900000, cp: "Bpk. Joko", hp: "021-5380000" },
    { id: "PBF-05", nama: "PT Bina San Prima", kota: "Bandung", izin: "PBF 32.05/PBF/2019", top: 30, hutang: 41300000, cp: "Ibu Rini", hp: "022-7300100" },
  ];

  const users = [
    { id: "U01", nama: "Rina Wulandari", role: "Apoteker PJ", cabang: "PST", email: "rina@sehatbersama.id", status: "Aktif", login: "Hari ini 07.58" },
    { id: "U02", nama: "Fikri Ramadhan", role: "Kasir", cabang: "PST", email: "fikri@sehatbersama.id", status: "Aktif", login: "Hari ini 07.02" },
    { id: "U03", nama: "Nabila Putri", role: "TTK / Asisten Apoteker", cabang: "PST", email: "nabila@sehatbersama.id", status: "Aktif", login: "Hari ini 07.10" },
    { id: "U04", nama: "Dimas Pratama", role: "Apoteker PJ", cabang: "BKS", email: "dimas@sehatbersama.id", status: "Aktif", login: "Hari ini 08.05" },
    { id: "U05", nama: "Yulia Anggraini", role: "Admin Gudang", cabang: "PST", email: "yulia@sehatbersama.id", status: "Aktif", login: "Kemarin 17.20" },
    { id: "U06", nama: "Teguh Santoso", role: "Keuangan", cabang: "PST", email: "teguh@sehatbersama.id", status: "Aktif", login: "Hari ini 09.12" },
    { id: "U07", nama: "Anton Wibisono", role: "Owner", cabang: "Semua", email: "anton@sehatbersama.id", status: "Aktif", login: "Hari ini 06.45" },
    { id: "U08", nama: "Reza Mahendra", role: "Kasir", cabang: "DPK", email: "reza@sehatbersama.id", status: "Nonaktif", login: "12 hari lalu" },
  ];

  // Tenaga penjual / sales (kasir + TTK + sales B2B)
  const sales = [
    { id: "S01", nama: "Fikri Ramadhan", jabatan: "Kasir", cabang: "PST", target: 320000000, omzet: 338400000, trx: 2210, resep: 0, upsell: 64 },
    { id: "S02", nama: "Nabila Putri", jabatan: "TTK", cabang: "PST", target: 280000000, omzet: 262900000, trx: 1540, resep: 612, upsell: 48 },
    { id: "S03", nama: "Galih Saputra", jabatan: "Kasir", cabang: "BKS", target: 250000000, omzet: 271100000, trx: 1880, resep: 0, upsell: 71 },
    { id: "S04", nama: "Putri Handayani", jabatan: "TTK", cabang: "BKS", target: 230000000, omzet: 219800000, trx: 1320, resep: 488, upsell: 39 },
    { id: "S05", nama: "Rizky Firmansyah", jabatan: "Kasir", cabang: "DPK", target: 210000000, omzet: 187300000, trx: 1602, resep: 0, upsell: 33 },
    { id: "S06", nama: "Intan Permata", jabatan: "TTK", cabang: "TGR", target: 240000000, omzet: 256700000, trx: 1455, resep: 530, upsell: 58 },
    { id: "S07", nama: "Bayu Kurniawan", jabatan: "Sales B2B (Klinik)", cabang: "PST", target: 400000000, omzet: 421500000, trx: 186, resep: 0, upsell: 0 },
    { id: "S08", nama: "Wulan Sari", jabatan: "Kasir", cabang: "BGR", target: 160000000, omzet: 142600000, trx: 1210, resep: 0, upsell: 27 },
  ];

  // Penjualan harian 30 hari terakhir (semua cabang)
  const harian = [];
  for (let d = 29; d >= 0; d--) {
    const dt = addDays(-d);
    const weekend = [0, 6].includes(dt.getDay());
    const base = weekend ? 158 : 142;
    const umum = Math.round((base + ri(-18, 22)) * 1e6 / 1.9);
    const resep = Math.round((base * 0.55 + ri(-10, 14)) * 1e6 / 1.9);
    harian.push({ tgl: iso(dt), umum, resep, total: umum + resep, trx: ri(1050, 1420) });
  }

  // Bulanan 12 bulan (konsolidasi)
  const bulanNama = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const bulanan = [];
  for (let m = 11; m >= 0; m--) {
    const dt = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    const pend = Math.round((3.9 + (11 - m) * 0.06 + rnd() * 0.35) * 1e9);
    const hpp = Math.round(pend * (0.66 + rnd() * 0.03));
    const biaya = Math.round(pend * (0.14 + rnd() * 0.02));
    bulanan.push({ bulan: `${bulanNama[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`, pendapatan: pend, hpp, biaya, laba: pend - hpp - biaya });
  }

  const transaksi = [
    { no: "INV/PST/2609/0412", waktu: "10:42", pelanggan: "Budi Santoso", jenis: "Resep", item: 4, total: 286500, bayar: "QRIS", kasir: "Fikri R.", status: "Lunas" },
    { no: "INV/PST/2609/0411", waktu: "10:38", pelanggan: "Umum", jenis: "Bebas", item: 2, total: 33500, bayar: "Tunai", kasir: "Fikri R.", status: "Lunas" },
    { no: "INV/PST/2609/0410", waktu: "10:31", pelanggan: "Hendra Wijaya", jenis: "Racikan", item: 3, total: 142000, bayar: "Debit BCA", kasir: "Nabila P.", status: "Lunas" },
    { no: "INV/PST/2609/0409", waktu: "10:24", pelanggan: "Umum", jenis: "Bebas", item: 5, total: 127000, bayar: "Tunai", kasir: "Fikri R.", status: "Lunas" },
    { no: "INV/PST/2609/0408", waktu: "10:17", pelanggan: "Siti Aminah", jenis: "Resep", item: 2, total: 98500, bayar: "Transfer", kasir: "Nabila P.", status: "Lunas" },
    { no: "INV/PST/2609/0407", waktu: "10:09", pelanggan: "Klinik Pratama Sehat", jenis: "B2B", item: 18, total: 3450000, bayar: "Tempo 30 hari", kasir: "Bayu K.", status: "Piutang" },
    { no: "INV/PST/2609/0406", waktu: "09:58", pelanggan: "Umum", jenis: "Bebas", item: 1, total: 45000, bayar: "GoPay", kasir: "Fikri R.", status: "Void" },
    { no: "INV/PST/2609/0405", waktu: "09:51", pelanggan: "Lina Marlina", jenis: "Resep", item: 6, total: 412000, bayar: "Kartu Kredit", kasir: "Nabila P.", status: "Lunas" },
    { no: "INV/PST/2609/0404", waktu: "09:40", pelanggan: "Umum", jenis: "Bebas", item: 3, total: 61500, bayar: "Tunai", kasir: "Fikri R.", status: "Retur Sebagian" },
    { no: "INV/PST/2609/0403", waktu: "09:32", pelanggan: "Agus Salim", jenis: "Resep", item: 3, total: 176000, bayar: "QRIS", kasir: "Nabila P.", status: "Lunas" },
  ];

  const resep = [
    { no: "RSP/PST/2609/0088", tgl: iso(TODAY), jam: "10:40", pasien: "Budi Santoso", umur: "48 th", dokter: "dr. Andi Pratama, Sp.PD", faskes: "RS Fatmawati", item: 4, racikan: 0, status: "Diserahkan", total: 286500, iter: 0 },
    { no: "RSP/PST/2609/0089", tgl: iso(TODAY), jam: "10:52", pasien: "Alya Putri (anak)", umur: "4 th", dokter: "dr. Maria Ulfa, Sp.A", faskes: "Klinik Tumbuh Kembang", item: 3, racikan: 1, status: "Diracik", total: 164000, iter: 0 },
    { no: "RSP/PST/2609/0090", tgl: iso(TODAY), jam: "11:05", pasien: "Hendra Wijaya", umur: "64 th", dokter: "dr. Ratna Sari, Sp.JP", faskes: "RS Harapan Kita", item: 5, racikan: 0, status: "Verifikasi", total: 538000, iter: 2 },
    { no: "RSP/PST/2609/0091", tgl: iso(TODAY), jam: "11:12", pasien: "Siti Aminah", umur: "41 th", dokter: "dr. Fajar Nugroho, Sp.KK", faskes: "RS Pondok Indah", item: 2, racikan: 1, status: "Diterima", total: 0, iter: 0 },
    { no: "RSP/PST/2609/0092", tgl: iso(TODAY), jam: "11:20", pasien: "Rudi Hartono", umur: "26 th", dokter: "dr. Bambang Susilo", faskes: "Klinik Pratama Sehat", item: 3, racikan: 0, status: "Siap Diserahkan", total: 97500, iter: 0 },
    { no: "RSP/PST/2509/0071", tgl: iso(addDays(-1)), jam: "16:44", pasien: "Lina Marlina", umur: "45 th", dokter: "dr. Andi Pratama, Sp.PD", faskes: "RS Fatmawati", item: 6, racikan: 0, status: "Diserahkan", total: 412000, iter: 1 },
  ];

  const po = [
    { no: "SP/PST/2609/031", tgl: iso(addDays(-1)), supplier: "PT Anugerah Pharmindo Lestari", jenis: "Reguler", item: 24, total: 38750000, status: "Dikirim" },
    { no: "SP/PST/2609/032", tgl: iso(addDays(-1)), supplier: "PT Kimia Farma Trading & Distribution", jenis: "Narkotika", item: 1, total: 1450000, status: "Menunggu TTD Apoteker" },
    { no: "SP/PST/2609/033", tgl: iso(TODAY), supplier: "PT Enseval Putera Megatrading", jenis: "Psikotropika", item: 2, total: 2980000, status: "Draft" },
    { no: "SP/PST/2609/030", tgl: iso(addDays(-3)), supplier: "PT Parit Padang Global", jenis: "Prekursor", item: 3, total: 4120000, status: "Diterima Sebagian" },
    { no: "SP/PST/2609/029", tgl: iso(addDays(-4)), supplier: "PT Bina San Prima", jenis: "Reguler", item: 16, total: 21600000, status: "Selesai" },
    { no: "SP/PST/2609/028", tgl: iso(addDays(-6)), supplier: "PT Anugerah Pharmindo Lestari", jenis: "OOT", item: 2, total: 1860000, status: "Selesai" },
  ];

  const mutasi = [
    { no: "MUT/2609/014", tgl: iso(TODAY), dari: "PST", ke: "BGR", item: 8, nilai: 6420000, status: "Dalam Perjalanan", pengirim: "Yulia A." },
    { no: "MUT/2609/013", tgl: iso(addDays(-1)), dari: "BKS", ke: "DPK", item: 5, nilai: 3180000, status: "Diterima", pengirim: "Galih S." },
    { no: "MUT/2609/012", tgl: iso(addDays(-2)), dari: "PST", ke: "TGR", item: 12, nilai: 9870000, status: "Diterima", pengirim: "Yulia A." },
    { no: "MUT/2609/015", tgl: iso(TODAY), dari: "TGR", ke: "PST", item: 3, nilai: 1240000, status: "Permintaan", pengirim: "Intan P." },
  ];

  const notif = [
    { ic: "event_busy", tone: "red", t: "12 batch obat sudah kedaluwarsa", m: "Segera karantina & proses retur/pemusnahan", w: "5 mnt lalu", go: "kadaluarsa" },
    { ic: "inventory", tone: "amber", t: "9 item di bawah stok minimum", m: "Cabang Pusat · buat Surat Pesanan", w: "18 mnt lalu", go: "stok" },
    { ic: "receipt_long", tone: "blue", t: "Resep baru dari dr. Ratna Sari, Sp.JP", m: "Pasien Hendra Wijaya · iter 2x", w: "22 mnt lalu", go: "resep" },
    { ic: "local_shipping", tone: "purple", t: "Mutasi MUT/2609/014 dikirim ke Bogor", m: "8 item · Rp 6.420.000", w: "40 mnt lalu", go: "mutasi" },
    { ic: "payments", tone: "cyan", t: "Hutang PBF jatuh tempo 3 hari lagi", m: "PT Anugerah Pharmindo Lestari · Rp 38.750.000", w: "1 jam lalu", go: "hutang" },
  ];

  window.DB = { TODAY, addDays, iso, apotek, cabang, kategori, obat, golonganLabel, batches, pelanggan, dokter, supplier, users, sales, harian, bulanan, transaksi, resep, po, mutasi, notif };
})();
