
/* =====================================
   KONFIGURASI SUPABASE
===================================== */

const SUPABASE_URL = "dkxjzplmlhhfzgbjqhbt";
const SUPABASE_KEY = "sb_publishable_a6SuErIdMXT7y3LG43RFXA_RAorKNYq";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =====================================
   VARIABEL
===================================== */

let daftarMakanan = [];
let keranjang = [];
let sedangMemproses = false;

const rupiah = (angka) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(angka) || 0);

const aman = (teks) =>
  String(teks ?? "").replace(/[&<>"']/g, karakter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[karakter]);

function pesan(id, teks, sukses = false) {
  const elemen = document.getElementById(id);
  if (!elemen) return;
  elemen.textContent = teks;
  elemen.style.color = sukses ? "#22c55e" : "#ff781f";
}

function formatTanggal(tanggal) {
  return new Date(tanggal).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/* =====================================
   LOGIN DAN LOGOUT
===================================== */

document.getElementById("formLogin").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (sedangMemproses) return;

  sedangMemproses = true;
  const tombol = event.submitter;
  if (tombol) tombol.disabled = true;

  pesan("pesanLogin", "Sedang login...");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  sedangMemproses = false;
  if (tombol) tombol.disabled = false;

  if (error) {
    pesan("pesanLogin", "Login gagal: " + error.message);
    return;
  }

  await bukaAplikasi();
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Gagal keluar: " + error.message);
    return;
  }

  document.getElementById("aplikasi").classList.add("hidden");
  document.getElementById("halamanLogin").classList.remove("hidden");
  document.getElementById("password").value = "";
});

async function periksaLogin() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    pesan("pesanLogin", error.message);
    return;
  }

  if (data.session) {
    await bukaAplikasi();
  } else {
    document.getElementById("halamanLogin").classList.remove("hidden");
    document.getElementById("aplikasi").classList.add("hidden");
  }
}

async function bukaAplikasi() {
  document.getElementById("halamanLogin").classList.add("hidden");
  document.getElementById("aplikasi").classList.remove("hidden");

  await muatSemuaData();
  pindahHalaman("dashboard");
}

/* =====================================
   NAVIGASI
===================================== */

document.querySelectorAll(".nav").forEach(tombol => {
  tombol.addEventListener("click", () => {
    pindahHalaman(tombol.dataset.page);
  });
});

function pindahHalaman(nama) {
  document.querySelectorAll(".page").forEach(halaman => {
    halaman.classList.add("hidden");
  });

  document.getElementById("page-" + nama).classList.remove("hidden");

  document.querySelectorAll(".nav").forEach(tombol => {
    tombol.classList.toggle(
      "active",
      tombol.dataset.page === nama
    );
  });

  const judul = {
    dashboard: "Dashboard",
    kasir: "Kasir",
    makanan: "Menu Makanan",
    riwayat: "Riwayat Transaksi"
  };

  document.getElementById("judulHalaman").textContent =
    judul[nama] || "Dashboard";

  if (nama === "dashboard") tampilkanDashboard();
  if (nama === "kasir") tampilkanMenuKasir();
  if (nama === "makanan") tampilkanMakanan();
  if (nama === "riwayat") tampilkanRiwayat();
}

/* =====================================
   MEMUAT DATA
===================================== */

async function muatSemuaData() {
  await ambilMakanan();
  await tampilkanDashboard();
}

async function ambilMakanan() {
  const { data, error } = await db
    .from("makanan")
    .select("*")
    .order("id_makanan", { ascending: false });

  if (error) {
    console.error(error);
    pesan("pesanMakanan", "Gagal mengambil menu: " + error.message);
    return;
  }

  daftarMakanan = data || [];
}

/* =====================================
   DASHBOARD
===================================== */

async function tampilkanDashboard() {
  const { data: transaksi, error } = await db
    .from("transaksi")
    .select("total");

  if (error) {
    console.error(error);
    return;
  }

  const jumlahTransaksi = transaksi.length;
  const pendapatan = transaksi.reduce(
    (jumlah, item) => jumlah + Number(item.total),
    0
  );

  document.getElementById("statMenu").textContent =
    daftarMakanan.length;

  document.getElementById("statTransaksi").textContent =
    jumlahTransaksi;

  document.getElementById("statPendapatan").textContent =
    rupiah(pendapatan);
}

/* =====================================
   CRUD MENU MAKANAN
===================================== */

async function tampilkanMakanan() {
  await ambilMakanan();

  const pencarian = document
    .getElementById("cariMakanan")
    .value.toLowerCase();

  const hasil = daftarMakanan.filter(item =>
    item.nama_makanan.toLowerCase().includes(pencarian)
  );

  const tbody = document.getElementById("tabelMakanan");

  if (!hasil.length) {
    tbody.innerHTML = `
      <tr><td colspan="4">Belum ada data makanan.</td></tr>
    `;
    return;
  }

  tbody.innerHTML = hasil.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${aman(item.nama_makanan)}</td>
      <td>${rupiah(item.harga)}</td>
      <td>
        <button class="action-btn edit-btn"
          data-edit="${item.id_makanan}">Edit</button>
        <button class="action-btn delete-btn"
          data-hapus="${item.id_makanan}">Hapus</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      editMakanan(tombol.dataset.edit);
    });
  });

  tbody.querySelectorAll("[data-hapus]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      hapusMakanan(tombol.dataset.hapus);
    });
  });
}

document.getElementById("formMakanan").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("idMakanan").value;
  const nama = document.getElementById("namaMakanan").value.trim();
  const harga = Number(document.getElementById("hargaMakanan").value);

  if (!nama || !Number.isSafeInteger(harga) || harga <= 0) {
    pesan("pesanMakanan", "Nama dan harga harus diisi dengan benar.");
    return;
  }

  const tombol = document.getElementById("btnSimpan");
  tombol.disabled = true;

  let hasil;

  if (id) {
    hasil = await db
      .from("makanan")
      .update({
        nama_makanan: nama,
        harga: harga
      })
      .eq("id_makanan", id);
  } else {
    hasil = await db
      .from("makanan")
      .insert([{
        nama_makanan: nama,
        harga: harga
      }]);
  }

  tombol.disabled = false;

  if (hasil.error) {
    pesan("pesanMakanan", "Gagal menyimpan: " + hasil.error.message);
    return;
  }

  resetFormMakanan();
  pesan("pesanMakanan", "Data makanan berhasil disimpan.", true);
  await ambilMakanan();
  await tampilkanMakanan();
  tampilkanDashboard();
  tampilkanMenuKasir();
});

function editMakanan(id) {
  const item = daftarMakanan.find(
    makanan => String(makanan.id_makanan) === String(id)
  );

  if (!item) return;

  document.getElementById("idMakanan").value = item.id_makanan;
  document.getElementById("namaMakanan").value = item.nama_makanan;
  document.getElementById("hargaMakanan").value = item.harga;

  document.getElementById("judulFormMakanan").textContent =
    "Edit Makanan";

  document.getElementById("btnSimpan").textContent = "Simpan Perubahan";
  document.getElementById("btnBatal").classList.remove("hidden");

  document.getElementById("formMakanan").scrollIntoView({
    behavior: "smooth"
  });
}

async function hapusMakanan(id) {
  const item = daftarMakanan.find(
    makanan => String(makanan.id_makanan) === String(id)
  );

  if (!item) return;

  if (!confirm(`Yakin ingin menghapus ${item.nama_makanan}?`)) return;

  const { error } = await db
    .from("makanan")
    .delete()
    .eq("id_makanan", id);

  if (error) {
    alert("Gagal menghapus. Makanan mungkin sudah digunakan dalam transaksi. " + error.message);
    return;
  }

  await ambilMakanan();
  await tampilkanMakanan();
  await tampilkanDashboard();
  tampilkanMenuKasir();
}

function resetFormMakanan() {
  document.getElementById("formMakanan").reset();
  document.getElementById("idMakanan").value = "";
  document.getElementById("judulFormMakanan").textContent =
    "Tambah Makanan";
  document.getElementById("btnSimpan").textContent = "Simpan Menu";
  document.getElementById("btnBatal").classList.add("hidden");
}

document.getElementById("btnBatal").addEventListener("click", resetFormMakanan);

document.getElementById("cariMakanan").addEventListener("input", tampilkanMakanan);

/* =====================================
   MENU KASIR
===================================== */

function tampilkanMenuKasir() {
  const pencarian = document
    .getElementById("cariMenu")
    .value.toLowerCase();

  const hasil = daftarMakanan.filter(item =>
    item.nama_makanan.toLowerCase().includes(pencarian)
  );

  const tempat = document.getElementById("daftarMenu");

  if (!hasil.length) {
    tempat.innerHTML = `<p class="empty">Menu tidak ditemukan.</p>`;
    return;
  }

  tempat.innerHTML = hasil.map(item => `
    <div class="menu-card">
      <h4>${aman(item.nama_makanan)}</h4>
      <p>${rupiah(item.harga)}</p>
      <button class="btn-primary" data-tambah="${item.id_makanan}">
        + Tambah
      </button>
    </div>
  `).join("");

  tempat.querySelectorAll("[data-tambah]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      tambahKeranjang(tombol.dataset.tambah);
    });
  });
}

document.getElementById("cariMenu").addEventListener("input", tampilkanMenuKasir);

/* =====================================
   KERANJANG
===================================== */

function tambahKeranjang(id) {
  const item = daftarMakanan.find(
    makanan => String(makanan.id_makanan) === String(id)
  );

  if (!item) return;

  const ada = keranjang.find(
    makanan => makanan.id_makanan === item.id_makanan
  );

  if (ada) {
    ada.jumlah++;
  } else {
    keranjang.push({
      id_makanan: item.id_makanan,
      nama_makanan: item.nama_makanan,
      harga: Number(item.harga),
      jumlah: 1
    });
  }

  tampilkanKeranjang();
}

function tampilkanKeranjang() {
  const tempat = document.getElementById("isiKeranjang");

  if (!keranjang.length) {
    tempat.innerHTML = `<p class="empty">Belum ada makanan dipilih.</p>`;
    document.getElementById("totalBayar").textContent = rupiah(0);
    return;
  }

  tempat.innerHTML = keranjang.map(item => `
    <div class="cart-item">
      <div>
        <strong>${aman(item.nama_makanan)}</strong>
        <small>${rupiah(item.harga)} × ${item.jumlah}</small>
        <div class="cart-controls">
          <button data-kurang="${item.id_makanan}">−</button>
          <span>${item.jumlah}</span>
          <button data-tambah-jumlah="${item.id_makanan}">+</button>
          <button class="remove-item" data-hapus-cart="${item.id_makanan}">Hapus</button>
        </div>
      </div>
      <strong>${rupiah(item.harga * item.jumlah)}</strong>
    </div>
  `).join("");

  tempat.querySelectorAll("[data-kurang]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      ubahJumlah(tombol.dataset.kurang, -1);
    });
  });

  tempat.querySelectorAll("[data-tambah-jumlah]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      ubahJumlah(tombol.dataset.tambahJumlah, 1);
    });
  });

  tempat.querySelectorAll("[data-hapus-cart]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      keranjang = keranjang.filter(
        item => String(item.id_makanan) !== tombol.dataset.hapusCart
      );
      tampilkanKeranjang();
    });
  });

  const total = keranjang.reduce(
    (jumlah, item) => jumlah + item.harga * item.jumlah,
    0
  );

  document.getElementById("totalBayar").textContent = rupiah(total);
}

function ubahJumlah(id, perubahan) {
  const item = keranjang.find(
    makanan => String(makanan.id_makanan) === String(id)
  );

  if (!item) return;

  item.jumlah += perubahan;

  if (item.jumlah <= 0) {
    keranjang = keranjang.filter(
      makanan => makanan.id_makanan !== item.id_makanan
    );
  }

  tampilkanKeranjang();
}

document.getElementById("btnKosongkan").addEventListener("click", () => {
  keranjang = [];
  tampilkanKeranjang();
  pesan("pesanKasir", "Keranjang sudah dikosongkan.", true);
});

/* =====================================
   CHECKOUT / SIMPAN TRANSAKSI
===================================== */

document.getElementById("btnBayar").addEventListener("click", async () => {
  if (sedangMemproses) return;

  if (!keranjang.length) {
    pesan("pesanKasir", "Keranjang masih kosong.");
    return;
  }

  const total = keranjang.reduce(
    (jumlah, item) => jumlah + item.harga * item.jumlah,
    0
  );

  if (!Number.isSafeInteger(total) || total <= 0) {
    pesan("pesanKasir", "Total transaksi tidak valid.");
    return;
  }

  if (!confirm("Lanjutkan pembayaran sebesar " + rupiah(total) + "?")) {
    return;
  }

  sedangMemproses = true;
  const tombol = document.getElementById("btnBayar");
  tombol.disabled = true;
  tombol.textContent = "Memproses...";

  // Simpan transaksi utama
  const { data: transaksi, error: errorTransaksi } = await db
    .from("transaksi")
    .insert([{ total: total }])
    .select()
    .single();

  if (errorTransaksi) {
    pesan("pesanKasir", "Transaksi gagal: " + errorTransaksi.message);
    selesaiBayar();
    return;
  }

  // Simpan rincian transaksi
  const detail = keranjang.map(item => ({
    id_transaksi: transaksi.id_transaksi,
    id_makanan: item.id_makanan,
    nama_makanan: item.nama_makanan,
    harga: item.harga,
    jumlah: item.jumlah,
    subtotal: item.harga * item.jumlah
  }));

  const { error: errorDetail } = await db
    .from("detail_transaksi")
    .insert(detail);

  if (errorDetail) {
    // Coba batalkan transaksi utama jika detail gagal
    const { error: errorHapus } = await db
      .from("transaksi")
      .delete()
      .eq("id_transaksi", transaksi.id_transaksi);

    let keterangan = "Detail transaksi gagal disimpan: " + errorDetail.message;

    if (errorHapus) {
      keterangan += " Perlu periksa transaksi #" + transaksi.id_transaksi +
        " di Supabase karena pembatalan otomatis gagal.";
    }

    pesan("pesanKasir", keterangan);
    selesaiBayar();
    return;
  }

  keranjang = [];
  tampilkanKeranjang();
  pesan("pesanKasir", "Pembayaran berhasil! Nomor transaksi #" + transaksi.id_transaksi, true);

  await tampilkanDashboard();
  selesaiBayar();
});

function selesaiBayar() {
  sedangMemproses = false;
  const tombol = document.getElementById("btnBayar");
  tombol.disabled = false;
  tombol.textContent = "BAYAR SEKARANG";
}

/* =====================================
   RIWAYAT TRANSAKSI
===================================== */

async function tampilkanRiwayat() {
  const tbody = document.getElementById("tabelRiwayat");

  const { data, error } = await db
    .from("transaksi")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    tbody.innerHTML = `
      <tr><td colspan="4">Gagal mengambil data: ${aman(error.message)}</td></tr>
    `;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="4">Belum ada transaksi.</td></tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr>
      <td>#${item.id_transaksi}</td>
      <td>${formatTanggal(item.tanggal)}</td>
      <td>${rupiah(item.total)}</td>
      <td>
        <button class="action-btn detail-btn"
          data-detail="${item.id_transaksi}">Lihat Detail</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-detail]").forEach(tombol => {
    tombol.addEventListener("click", () => {
      lihatDetail(tombol.dataset.detail);
    });
  });
}

async function lihatDetail(id) {
  const kotak = document.getElementById("detailRiwayat");
  const isi = document.getElementById("isiDetailRiwayat");

  kotak.classList.remove("hidden");
  isi.innerHTML = "<p>Memuat detail transaksi...</p>";

  const { data, error } = await db
    .from("detail_transaksi")
    .select("*")
    .eq("id_transaksi", id);

  if (error) {
    isi.textContent = "Gagal mengambil detail: " + error.message;
    return;
  }

  if (!data.length) {
    isi.innerHTML = "<p>Tidak ada detail transaksi.</p>";
    return;
  }

  isi.innerHTML = `
    <p style="margin-bottom:15px;color:#ff781f">
      Nomor Transaksi: #${aman(id)}
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nama Makanan</th>
            <th>Harga</th>
            <th>Jumlah</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>${aman(item.nama_makanan)}</td>
              <td>${rupiah(item.harga)}</td>
              <td>${item.jumlah}</td>
              <td>${rupiah(item.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* =====================================
   MULAI APLIKASI
===================================== */

periksaLogin();

db.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    document.getElementById("aplikasi").classList.add("hidden");
    document.getElementById("halamanLogin").classList.remove("hidden");
  }
});
