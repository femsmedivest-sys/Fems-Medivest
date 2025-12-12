// Gantikan dengan Web App URL anda (berakhir /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxvDVNstuLeaxr5YmrKZyu-xb26TV6bM7zETgLQnhXu8VNOgnMYkbttKeAmmsco50j/exec";

document.addEventListener('DOMContentLoaded', () => {

    const bookingForm = document.getElementById('booking-form');
    const messageEl = document.getElementById('booking-message');
    const submitBtn = bookingForm.querySelector('.submit-btn');

    function setMessage(msg, isError = false) {
        messageEl.textContent = msg;
        messageEl.className =
            `mt-3 text-center text-sm font-bold ${isError ? 'text-red-400' : 'text-green-400'}`;
    }

    // Submit pinjaman baru
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.textContent = 'Menghantar...';
        submitBtn.disabled = true;
        setMessage('Sila tunggu, menghantar data...');

        const formData = new FormData(bookingForm);
        const data = { ...Object.fromEntries(formData.entries()), action: 'loan' };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.status === 'success') {
                setMessage('✅ ' + result.message);
                bookingForm.reset();
                loadStatus();
            } else {
                throw new Error(result.message || 'Response error');
            }
        } catch (err) {
            setMessage('❌ Ralat Peminjaman: ' + err.message, true);
        } finally {
            submitBtn.textContent = 'HANTAR REKOD PINJAMAN';
            submitBtn.disabled = false;
        }
    });

    // TAB SWITCH
    const tabBooking = document.getElementById('tab-booking');
    const tabStatus = document.getElementById('tab-status');
    const contentBooking = document.getElementById('tab-booking-content');
    const contentStatus = document.getElementById('tab-status-content');

    function activateTab(tab) {
        if (tab === 'booking') {
            contentBooking.classList.add('active');
            contentStatus.classList.remove('active');
            tabBooking.classList.add('active');
            tabStatus.classList.remove('active');
        } else {
            contentBooking.classList.remove('active');
            contentStatus.classList.add('active');
            tabBooking.classList.remove('active');
            tabStatus.classList.add('active');
            loadStatus();
        }
    }

    tabBooking.addEventListener('click', () => activateTab('booking'));
    tabStatus.addEventListener('click', () => activateTab('status'));


    // Load status records
    async function loadStatus() {
        const container = document.getElementById('status-container');
        container.innerHTML = `<p class="text-gray-300 text-center">Memuatkan status terkini...</p>`;

        try {
            const res = await fetch(APPS_SCRIPT_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();

            if (!result.data || result.data.length === 0) {
                container.innerHTML = `<p class="text-gray-300 text-center">Tiada rekod pinjaman.</p>`;
                return;
            }

            // Susun data: Aktif (SEDANG DIGUNAKAN), BOOKED, kemudian TELAH DIPULANGKAN
            const list = result.data.sort((a, b) => {
                // Berikan 'weight' untuk sorting
                const getSortWeight = (status) => {
                    if (status === "SEDANG DIGUNAKAN") return 1;
                    if (status === "BOOKED") return 2;
                    return 3; // Telah Dipulangkan
                };

                return getSortWeight(a.Status) - getSortWeight(b.Status);
            });

            container.innerHTML = "";
            list.forEach(item => {
                // Tentukan status, kelas badge, dan teks
                const status = item.Status || "Tiada Status";
                const upperStatus = status.toUpperCase();

                // Semak status: Telah Dipulangkan / BOOKED / SEDANG DIGUNAKAN
                const isReturned = upperStatus === "TELAH DIPULANGKAN" || upperStatus === "RETURNED";
                const isBooked = upperStatus === "BOOKED";

                let statusClass = "status-pending"; // Default: Sedang Digunakan
                let statusDisplay = "Sedang Digunakan";

                if (isReturned) {
                    statusClass = "status-pulang";
                    statusDisplay = "Telah Dipulangkan";
                } else if (isBooked) {
                    statusClass = "status-kosong"; // Guna warna kelabu untuk booked
                    statusDisplay = "BOOKED";
                }

                const tarikhMasaAmbil = item.TarikhMasaAmbil || '-';
                // item.ReturnedAt sudah diformat di Apps Script
                const returnedDateDisplay = item.ReturnedAt && item.ReturnedAt.length > 5 ? item.ReturnedAt : '-';
                const returnRemark = item.ReturnRemark || ''; // Ambil remark dari Apps Script

                const card = document.createElement('div');
                card.className = "drone-card";

                // Tentukan butang aksi
                let actionButtonHtml = '';

                if (isReturned) {
                    // Tambah Tarikh Pulang yang diformat + Remark
                    actionButtonHtml = `
                        <p class="text-green-400 text-sm font-semibold">Tarikh Pulang: ${returnedDateDisplay}</p>
                        ${returnRemark ? `<p class="text-xs font-medium text-gray-400 mt-1">Remark: ${returnRemark}</p>` : ''}
                    `;
                } else if (isBooked) {
                    // Butang CANCEL (warna merah)
                    actionButtonHtml = `<div><button class="action-btn cancel-btn" data-row="${item.row}" style="background-color: #ef4444;">BATALKAN</button></div>`;
                } else {
                    // Butang PULANGKAN (warna asal kuning)
                    actionButtonHtml = `<div><button class="action-btn return-btn" data-row="${item.row}">PULANGKAN</button></div>`;
                }


                card.innerHTML = `
                    <div class="flex justify-between items-start">
                      <div>
                        <p class="text-gray-300 text-sm">
                          <span class="label-badge">Nama Peminjam:</span> ${escapeHtml(item.NamaPeminjam || "-")}
                        </p>
                        <p class="text-gray-300 text-sm">
                          <span class="label-badge">Site Peminjam:</span> ${escapeHtml(item.SitePeminjam || "-")} 
                        </p>
                        <p class="text-gray-300 text-sm">
                          <span class="label-badge">Model Drone:</span> ${escapeHtml(item.DroneModel || "-")} 
                        </p>
                        <p class="text-gray-300 text-sm mt-2">
                          <span class="label-badge">Tarikh & Masa Ambil:</span> ${tarikhMasaAmbil}
                        </p>
                        <p class="text-gray-300 text-sm">
                          <span class="label-badge">Lokasi Penerbangan:</span> ${escapeHtml(item.LokasiPenerbangan || "-")}
                        </p>
                        <p class="text-gray-300 text-sm">
                          <span class="label-badge">Tujuan Penerbangan:</span> ${escapeHtml(item.TujuanPenerbangan || "-")}
                        </p>
                      </div>

                      <div class="text-right">
                        <div class="mb-2">
                          <span class="status-badge ${statusClass}">${statusDisplay}</span>
                        </div>

                        ${actionButtonHtml}
                      </div>
                    </div>
                  `;

                container.appendChild(card);
            });

            if (list.length === 0) {
                container.innerHTML = `<p class="text-gray-300 text-center">Tiada Pinjaman.</p>`;
            }

        } catch (err) {
            container.innerHTML = `<p class="text-red-400 text-center">Ralat memuatkan status: ${err.message}</p>`;
        }
    }


    // 🛑 EVENT LISTENER BARU UNTUK BUTANG PULANGKAN (Membuka Modal)
    document.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('.return-btn');
        if (!btn) return;

        const row = btn.getAttribute('data-row');
        if (!row) return alert('Row ID tidak ditemui.');

        // Buka Modal Pulangan
        const returnModal = document.getElementById('return-modal');
        returnModal.setAttribute('data-current-row', row);
        returnModal.style.display = 'block';

        // Reset input dan butang
        document.getElementById('next-user-input').style.display = 'none';
        document.getElementById('confirm-htj-btn').style.display = 'none';
        document.getElementById('next-peminjam-input').value = '';

        // Pastikan tiada pilihan yang disorot
        const optionHtjBtn = document.getElementById('option-htj');
        const optionNextBtn = document.getElementById('option-next');
        optionHtjBtn.classList.remove('selected');
        optionNextBtn.classList.remove('selected');
    });

    // === LOGIK MODAL BARU ===
    const returnModal = document.getElementById('return-modal');
    if (returnModal) { // Pastikan modal wujud sebelum menambah listener
        const nextUserInput = document.getElementById('next-user-input');
        const nextPeminjamInput = document.getElementById('next-peminjam-input');
        const confirmHtjBtn = document.getElementById('confirm-htj-btn');
        const confirmNextBtn = document.getElementById('confirm-next-btn');
        const optionHtjBtn = document.getElementById('option-htj');
        const optionNextBtn = document.getElementById('option-next');
        const closeBtn = returnModal.querySelector('.close-btn');

        // Tutup modal bila klik X
        closeBtn.onclick = function () {
            returnModal.style.display = "none";
        }

        // Tutup modal bila klik luar
        window.onclick = function (event) {
            if (event.target == returnModal) {
                returnModal.style.display = "none";
            }
        }

        // Pilih Pulang ke HTJ
        optionHtjBtn.onclick = function () {
            nextUserInput.style.display = 'none';
            confirmHtjBtn.style.display = 'block';
            nextPeminjamInput.value = '';
            optionHtjBtn.classList.add('selected');
            optionNextBtn.classList.remove('selected');
        };

        // Pilih Serah kepada Pengguna Seterusnya
        optionNextBtn.onclick = function () {
            nextUserInput.style.display = 'block';
            confirmHtjBtn.style.display = 'none';
            optionNextBtn.classList.add('selected');
            optionHtjBtn.classList.remove('selected');
        };


        // Fungsi utama untuk menghantar permintaan pulangan/serahan
        async function handleReturnAction(row, returnRemark, nextPeminjam) {
            const btnToDisable = nextPeminjam ? confirmNextBtn : confirmHtjBtn;
            const originalText = btnToDisable.textContent;

            const confirmMsg = nextPeminjam
                ? `Sahkan: Serah drone ini kepada ${nextPeminjam}? (Rekod ini akan ditutup)`
                : 'Sahkan: Pulang drone ini ke HTJ? (Rekod ini akan ditutup)';

            if (!confirm(confirmMsg)) return;

            btnToDisable.disabled = true;
            btnToDisable.textContent = 'Memproses...';

            try {
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'return',
                        row: row,
                        returnRemark: returnRemark, // 'Pulang ke HTJ'
                        nextPeminjam: nextPeminjam // Nama peminjam seterusnya (kosong jika HTJ)
                    })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const resJson = await response.json();
                if (resJson.status === 'success') {
                    alert(resJson.message);
                    loadStatus();
                    returnModal.style.display = "none"; // Tutup modal
                } else {
                    throw new Error(resJson.message || 'Gagal mengemaskini');
                }
            } catch (err) {
                alert('Ralat Pulangan: ' + err.message);
            } finally {
                btnToDisable.disabled = false;
                btnToDisable.textContent = originalText;
            }
        }


        // Klik Sahkan Pulangan ke HTJ
        confirmHtjBtn.onclick = function () {
            const row = returnModal.getAttribute('data-current-row');
            if (!row) return;
            handleReturnAction(row, 'Pulang ke HTJ', '');
        };

        // Klik Sahkan Penyerahan (Next Person)
        confirmNextBtn.onclick = function () {
            const row = returnModal.getAttribute('data-current-row');
            const nextPeminjam = nextPeminjamInput.value.trim();

            if (!row) return;
            if (nextPeminjam.length < 3) {
                return alert('Sila masukkan Nama Peminjam Seterusnya yang sah.');
            }

            handleReturnAction(row, 'Diserahkan', nextPeminjam);
        };
    }
    // === TAMAT LOGIK MODAL BARU ===


    // Global click listener for CANCEL buttons
    document.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('.cancel-btn');
        if (!btn) return;

        const row = btn.getAttribute('data-row');
        if (!row) return alert('Row ID tidak ditemui.');

        // Confirm
        const ok = confirm('⚠️ SAHKAN: Anda ingin MEMBATALKAN pinjaman drone ini? Tindakan ini akan memadamkan rekod.');
        if (!ok) return;

        // Disable button semasa request
        btn.disabled = true;
        btn.textContent = 'Memadam...';

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'cancel', row: row })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const resJson = await response.json();
            if (resJson.status === 'success') {
                loadStatus();
                alert(resJson.message);
            } else {
                throw new Error(resJson.message || 'Gagal membatalkan');
            }
        } catch (err) {
            alert('Ralat Pembatalan: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'BATALKAN';
        }
    });


    // small helper to escape HTML
    function escapeHtml(unsafe) {
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Load initial status if status tab active
    if (contentStatus.classList.contains('active')) {
        loadStatus();
    }

});