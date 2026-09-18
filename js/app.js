// js/app.js — Expense & Budget Visualizer

// =============================================================================
// VALIDATOR
// Bertanggung jawab atas validasi seluruh input dari Input_Form.
// =============================================================================

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
const MAX_AMOUNT = 999999999.99;
const MAX_CATEGORY_LENGTH = 30;
const STORAGE_KEY = 'expense_transactions';
const CUSTOM_CATEGORIES_STORAGE_KEY = 'expense_custom_categories';

/** @type {string[]} */
let customCategories = [];

/** @type {'latest'|'amount-desc'|'amount-asc'|'category-asc'} */
let currentSort = 'latest';

/**
 * Memvalidasi data form sebelum diproses.
 * Mengumpulkan SEMUA error sekaligus — tidak berhenti di error pertama.
 *
 * @param {string} itemName  - nilai string dari input Item Name
 * @param {string} amountRaw - nilai string dari input Amount
 * @param {string} category  - nilai string dari dropdown Category
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateInput(itemName, amountRaw, category, categories = getCategories()) {
  const errors = [];

  // --- Validasi Item Name ---
  const trimmedName = (itemName || '').trim();
  if (trimmedName === '') {
    errors.push('Item Name tidak boleh kosong');
  } else if (trimmedName.length > 100) {
    errors.push('Item Name melebihi 100 karakter');
  }

  // --- Validasi Amount ---
  const trimmedAmount = (amountRaw || '').trim();
  if (trimmedAmount === '') {
    errors.push('Amount tidak boleh kosong');
  } else {
    const amountNum = Number(trimmedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Amount harus berupa angka positif');
    } else if (amountNum > MAX_AMOUNT) {
      errors.push('Amount melebihi nilai maksimum yang diizinkan');
    }
  }

  // --- Validasi Category ---
  if (!category || !categories.includes(category)) {
    errors.push('Category tidak valid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// STATE MANAGER
// Mengelola state in-memory (Transaction_List) dan sinkronisasi dengan Storage.
// =============================================================================

/**
 * @typedef {Object} Transaction
 * @property {string}  id        - UUID unik
 * @property {string}  itemName  - nama item, maks 100 karakter
 * @property {number}  amount    - nilai desimal positif, 0.01 – 999999999.99
 * @property {string}  category  - kategori bawaan atau kategori kustom
 * @property {number}  createdAt - Unix timestamp ms (Date.now())
 */

/** @type {Transaction[]} */
let transactions = [];

/**
 * Mengembalikan seluruh kategori yang tersedia, tanpa duplikasi.
 * @returns {string[]}
 */
function getCategories() {
  return [...DEFAULT_CATEGORIES, ...customCategories];
}

/**
 * Menormalkan dan memvalidasi nama kategori baru.
 * @param {string} rawName
 * @returns {{ valid: boolean, value: string, error: string }}
 */
function validateCategoryName(rawName) {
  const value = (rawName || '').trim().replace(/\s+/g, ' ');

  if (!value) {
    return { valid: false, value, error: 'Nama kategori tidak boleh kosong' };
  }
  if (value.length > MAX_CATEGORY_LENGTH) {
    return { valid: false, value, error: `Nama kategori maksimal ${MAX_CATEGORY_LENGTH} karakter` };
  }
  if (getCategories().some((category) => category.toLocaleLowerCase('id-ID') === value.toLocaleLowerCase('id-ID'))) {
    return { valid: false, value, error: 'Kategori tersebut sudah tersedia' };
  }

  return { valid: true, value, error: '' };
}

/**
 * Menghasilkan ID unik menggunakan crypto.randomUUID() dengan fallback.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

/**
 * Menambahkan transaction baru ke state, menyimpan ke storage, dan memicu re-render.
 * @param {{ itemName: string, amount: number, category: string }} transaction
 */
function addTransaction(transaction) {
  /** @type {Transaction} */
  const newTransaction = {
    id: generateId(),
    itemName: transaction.itemName,
    amount: transaction.amount,
    category: transaction.category,
    createdAt: Date.now(),
  };

  transactions.push(newTransaction);
  saveToStorage();
  renderAll();
}

/**
 * Menghapus transaction berdasarkan ID, menyimpan ke storage, dan memicu re-render.
 * @param {string} id
 */
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveToStorage();
  renderAll();
}

/**
 * Menghitung total balance dari seluruh transactions.
 * @returns {number}
 */
function computeTotalBalance() {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Menghitung total nominal per category.
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function computeCategoryTotals(txList = transactions) {
  return txList.reduce(
    (totals, t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      return totals;
    },
    {}
  );
}

/**
 * Memeriksa apakah localStorage API tersedia dan dapat digunakan.
 * Menggunakan try/catch untuk menangani private browsing dan browser restrictions.
 * @returns {boolean}
 */
function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Menyimpan kategori kustom. Kegagalan penyimpanan tidak membatalkan kategori
 * untuk sesi halaman yang sedang terbuka.
 */
function saveCustomCategories() {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
  } catch (e) {
    showStorageWarning('Kategori kustom tidak dapat disimpan. Perubahan Anda hanya berlaku untuk sesi ini.');
  }
}

/**
 * Memuat kategori kustom yang tersimpan dan mengabaikan data yang tidak valid.
 * @returns {string[]}
 */
function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set(DEFAULT_CATEGORIES.map((category) => category.toLocaleLowerCase('id-ID')));
    return parsed.filter((category) => {
      if (typeof category !== 'string') return false;
      const normalized = category.trim().replace(/\s+/g, ' ');
      const key = normalized.toLocaleLowerCase('id-ID');
      if (!normalized || normalized.length > MAX_CATEGORY_LENGTH || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((category) => category.trim().replace(/\s+/g, ' '));
  } catch (e) {
    return [];
  }
}

/**
 * Menambahkan kategori kustom ke state dan storage.
 * @param {string} rawName
 * @returns {{ valid: boolean, value: string, error: string }}
 */
function addCustomCategory(rawName) {
  const result = validateCategoryName(rawName);
  if (!result.valid) return result;

  customCategories.push(result.value);
  saveCustomCategories();
  renderCategoryOptions(result.value);
  return result;
}

/**
 * Memvalidasi bahwa sebuah objek memenuhi skema Transaction.
 * @param {*} item
 * @returns {boolean}
 */
function isValidTransaction(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim() === '') return false;
  if (typeof item.itemName !== 'string' || item.itemName.trim() === '' || item.itemName.length > 100) return false;
  if (typeof item.amount !== 'number' || !isFinite(item.amount) || item.amount <= 0 || item.amount > MAX_AMOUNT) return false;
  if (!getCategories().includes(item.category)) return false;
  if (typeof item.createdAt !== 'number' || !isFinite(item.createdAt)) return false;
  return true;
}

/**
 * Menyimpan transactions ke Local Storage.
 * Jika gagal (storage penuh, private mode, dll.), memanggil showStorageWarning().
 */
function saveToStorage() {
  try {
    const json = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    showStorageWarning('Data tidak dapat disimpan. Perubahan Anda hanya berlaku untuk sesi ini.');
  }
}

/**
 * Memuat transactions dari Local Storage.
 * Jika tidak ada data, data rusak, atau tidak memenuhi skema Transaction → kembalikan [].
 * Tidak pernah melempar exception.
 * @returns {Transaction[]}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.warn('[loadFromStorage] Data di storage bukan array — mengabaikan dan mulai dengan state kosong.');
      return [];
    }

    const valid = parsed.filter((item) => {
      const ok = isValidTransaction(item);
      if (!ok) {
        console.warn('[loadFromStorage] Item tidak memenuhi skema Transaction, dilewati:', item);
      }
      return ok;
    });

    // Jika ada item yang tidak valid, anggap data rusak sebagian → kembalikan hanya yang valid.
    // Jika semua item tidak valid dan array tidak kosong, treated as corrupt.
    if (valid.length === 0 && parsed.length > 0) {
      console.warn('[loadFromStorage] Semua item gagal validasi skema — mulai dengan state kosong.');
      return [];
    }

    return valid;
  } catch (e) {
    console.warn('[loadFromStorage] Gagal memuat data dari storage:', e.message);
    return [];
  }
}

// =============================================================================
// UI RENDERER
// Menangani semua operasi pembaruan DOM.
// =============================================================================

/**
 * Memformat angka sebagai string currency Rupiah.
 * Contoh: formatCurrency(25000) → "Rp 25.000,00"
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace('IDR', 'Rp')
    .trim();
}

/**
 * Memperbarui pilihan kategori pada form dan mempertahankan pilihan saat ini.
 * @param {string} [selectedCategory]
 */
function renderCategoryOptions(selectedCategory) {
  const select = document.getElementById('category');
  if (!select) return;

  const activeCategory = selectedCategory || select.value;
  select.innerHTML = '<option value="">-- Pilih Kategori --</option>';

  getCategories().forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    option.selected = category === activeCategory;
    select.appendChild(option);
  });
}

/**
 * Mengurutkan salinan transaksi untuk tampilan tanpa mengubah urutan penyimpanan.
 * @param {Transaction[]} txList
 * @param {string} sortOrder
 * @returns {Transaction[]}
 */
function sortTransactions(txList, sortOrder = currentSort) {
  const sorted = [...txList];

  const tieBreaker = (a, b) => b.createdAt - a.createdAt;
  if (sortOrder === 'amount-desc') {
    return sorted.sort((a, b) => b.amount - a.amount || tieBreaker(a, b));
  }
  if (sortOrder === 'amount-asc') {
    return sorted.sort((a, b) => a.amount - b.amount || tieBreaker(a, b));
  }
  if (sortOrder === 'category-asc') {
    return sorted.sort((a, b) => a.category.localeCompare(b.category, 'id-ID') || tieBreaker(a, b));
  }
  return sorted.sort(tieBreaker);
}

/**
 * Menghasilkan warna yang konsisten untuk kategori, termasuk kategori kustom.
 * @param {string} category
 * @returns {string}
 */
function getCategoryColor(category) {
  const fixedColors = {
    Food: '#FF6384',
    Transport: '#36A2EB',
    Fun: '#FFCE56',
  };
  if (fixedColors[category]) return fixedColors[category];

  const hash = [...category].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 0);
  return `hsl(${hash % 360} 65% 52%)`;
}

/**
 * Menghitung ringkasan transaksi untuk suatu bulan (format YYYY-MM).
 * @param {Transaction[]} txList
 * @param {string} month
 * @returns {{ total: number, count: number, topCategory: string, transactions: Transaction[] }}
 */
function getMonthlySummary(txList, month) {
  const monthTransactions = txList.filter((transaction) => {
    const date = new Date(transaction.createdAt);
    const transactionMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return transactionMonth === month;
  });
  const totals = computeCategoryTotals(monthTransactions);
  const topCategory = Object.entries(totals)
    .sort(([, amountA], [, amountB]) => amountB - amountA)[0]?.[0] || '—';

  return {
    total: monthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    count: monthTransactions.length,
    topCategory,
    transactions: monthTransactions,
  };
}

/** @returns {string} Bulan lokal saat ini dalam format YYYY-MM. */
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Merender angka ringkasan untuk bulan yang dipilih.
 */
function renderMonthlySummary() {
  const monthInput = document.getElementById('summary-month');
  if (!monthInput) return;

  const summary = getMonthlySummary(transactions, monthInput.value);
  const totalEl = document.getElementById('summary-total');
  const countEl = document.getElementById('summary-count');
  const categoryEl = document.getElementById('summary-top-category');

  if (totalEl) totalEl.textContent = formatCurrency(summary.total);
  if (countEl) countEl.textContent = String(summary.count);
  if (categoryEl) categoryEl.textContent = summary.topCategory;
}

/**
 * Merender ulang seluruh Transaction_List ke DOM.
 * Setiap item memuat Item Name, Amount (format currency), Category, dan tombol hapus.
 * @param {Transaction[]} txList
 */
function renderTransactionList(txList) {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  // Kosongkan list sebelum render ulang
  listEl.innerHTML = '';

  txList.forEach((tx) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHtml(tx.itemName)}</span>
        <span class="transaction-category">${escapeHtml(tx.category)}</span>
      </div>
      <div class="transaction-amount">${formatCurrency(tx.amount)}</div>
      <button
        class="btn-delete"
        data-id="${escapeHtml(tx.id)}"
        aria-label="Hapus ${escapeHtml(tx.itemName)}"
        type="button"
      >&times;</button>
    `;

    const categoryBadge = li.querySelector('.transaction-category');
    if (categoryBadge) {
      categoryBadge.style.backgroundColor = `color-mix(in srgb, ${getCategoryColor(tx.category)} 15%, transparent)`;
      categoryBadge.style.color = getCategoryColor(tx.category);
    }

    listEl.appendChild(li);
  });

  toggleEmptyState(txList.length === 0);
}

/**
 * Memperbarui tampilan Total_Balance di DOM.
 * @param {number} balance
 */
function renderTotalBalance(balance) {
  const el = document.getElementById('total-balance');
  if (!el) return;
  el.textContent = formatCurrency(balance);
}

/**
 * Menampilkan atau menyembunyikan pesan empty state untuk Transaction_List dan Chart.
 * @param {boolean} isEmpty
 */
function toggleEmptyState(isEmpty) {
  const emptyStateEl = document.getElementById('empty-state');
  const listEl = document.getElementById('transaction-list');
  const chartEmptyEl = document.getElementById('chart-empty-state');
  const chartContainer = document.getElementById('chart-container');

  if (emptyStateEl) emptyStateEl.hidden = !isEmpty;
  if (listEl) listEl.hidden = isEmpty;

  if (chartEmptyEl) chartEmptyEl.hidden = !isEmpty;
  if (chartContainer) chartContainer.hidden = isEmpty;
}

/**
 * Menampilkan pesan error validasi di bawah form.
 * @param {string[]} errors
 */
function showValidationErrors(errors) {
  const container = document.getElementById('validation-errors');
  const errorList = document.getElementById('error-list');
  if (!container || !errorList) return;

  errorList.innerHTML = '';
  errors.forEach((msg) => {
    const li = document.createElement('li');
    li.textContent = msg;
    errorList.appendChild(li);
  });

  container.hidden = false;
}

/**
 * Menghapus semua pesan error validasi.
 */
function clearValidationErrors() {
  const container = document.getElementById('validation-errors');
  const errorList = document.getElementById('error-list');
  if (!container || !errorList) return;

  errorList.innerHTML = '';
  container.hidden = true;
}

/**
 * Mengosongkan semua field pada Input_Form.
 */
function clearForm() {
  const form = document.getElementById('transaction-form');
  if (!form) return;
  form.reset();
}

/**
 * Menampilkan banner peringatan storage di bagian atas halaman.
 * @param {string} message
 */
function showStorageWarning(message) {
  const banner = document.getElementById('storage-warning');
  const msgEl = document.getElementById('storage-warning-message');
  const closeBtn = document.getElementById('storage-warning-close');

  if (!banner || !msgEl) {
    // Fallback jika DOM belum siap (misal: saat test)
    console.warn('[StorageWarning]', message);
    return;
  }

  msgEl.textContent = message;
  banner.hidden = false;

  // Pasang listener tutup satu kali
  if (closeBtn && !closeBtn.dataset.listenerAttached) {
    closeBtn.addEventListener('click', () => {
      banner.hidden = true;
    });
    closeBtn.dataset.listenerAttached = 'true';
  }
}

/**
 * Escape karakter HTML untuk mencegah XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================================
// CHART MANAGER
// Wrapper di atas Chart.js untuk mengelola lifecycle pie chart.
// =============================================================================

/** @type {import('chart.js').Chart|null} */
let chartInstance = null;

/**
 * Menghitung persentase per category dari total keseluruhan.
 * Hanya mengembalikan category dengan total > 0.
 *
 * @param {{ Food: number, Transport: number, Fun: number }} totals
 * @returns {{ label: string, value: number, percentage: string, color: string }[]}
 */
function computeChartData(totals) {
  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

  if (grandTotal === 0) {
    return [];
  }

  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([category, value]) => {
      const pct = (value / grandTotal) * 100;
      return {
        label: `${category} (${pct.toFixed(1)}%)`,
        value,
        percentage: pct.toFixed(1),
        color: getCategoryColor(category),
      };
    });
}

/**
 * Menginisialisasi Chart.js instance pada canvas element.
 * Dipanggil sekali saat aplikasi pertama kali dimuat.
 * Jika Chart.js tidak tersedia (gagal muat dari CDN), sembunyikan canvas
 * dan tampilkan pesan error.
 *
 * @param {HTMLCanvasElement} canvas
 */
function initChart(canvas) {
  // Tangani kasus Chart.js gagal dimuat dari CDN
  if (typeof Chart === 'undefined') {
    const chartError = document.getElementById('chart-error');
    const chartContainer = document.getElementById('chart-container');
    if (chartError) chartError.hidden = false;
    if (chartContainer) chartContainer.hidden = true;
    return;
  }

  if (!canvas) return;

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
        },
      },
    },
  });
}

/**
 * Memperbarui data chart berdasarkan category totals.
 * Hanya menampilkan category dengan total > 0 (Requirement 4.6).
 * Jika chartInstance belum diinisialisasi atau Chart.js tidak ada, tidak melakukan apa-apa.
 *
 * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
 */
function updateChart(categoryTotals) {
  if (!chartInstance) return;

  const chartData = computeChartData(categoryTotals);

  chartInstance.data.labels = chartData.map((d) => d.label);
  chartInstance.data.datasets[0].data = chartData.map((d) => d.value);
  chartInstance.data.datasets[0].backgroundColor = chartData.map((d) => d.color);

  chartInstance.update();
}

// =============================================================================
// RENDER ALL — dipanggil setelah setiap perubahan state
// =============================================================================

/**
 * Memicu re-render seluruh UI (Transaction_List, Total_Balance, Chart).
 */
function renderAll() {
  renderTransactionList(sortTransactions(transactions));
  renderTotalBalance(computeTotalBalance());
  updateChart(computeCategoryTotals());
  renderMonthlySummary();
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Menangani submit form penambahan transaksi.
 * - Mencegah default form submission
 * - Membaca nilai dari field form
 * - Memanggil validateInput(); jika tidak valid, tampilkan error
 * - Jika valid: bersihkan error, panggil addTransaction(), bersihkan form
 *
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const itemNameEl = document.getElementById('item-name');
  const amountEl = document.getElementById('amount');
  const categoryEl = document.getElementById('category');

  const itemName = itemNameEl ? itemNameEl.value : '';
  const amountRaw = amountEl ? amountEl.value : '';
  const category = categoryEl ? categoryEl.value : '';

  const result = validateInput(itemName, amountRaw, category);

  if (!result.valid) {
    showValidationErrors(result.errors);
    return;
  }

  clearValidationErrors();
  addTransaction({
    itemName: itemName.trim(),
    amount: parseFloat(amountRaw),
    category,
  });
  clearForm();
}

/**
 * Menangani klik hapus menggunakan event delegation pada container list transaksi.
 * Mencari elemen dengan atribut data-id pada target klik atau ancestor terdekatnya,
 * lalu memanggil deleteTransaction(id).
 *
 * @param {Event} event
 */
function handleDeleteClick(event) {
  const target = event.target;

  // Hanya tombol hapus yang boleh menghapus transaksi.
  const deleteBtn = target.closest('.btn-delete[data-id]');
  if (!deleteBtn) return;

  const id = deleteBtn.dataset.id;
  if (id) {
    deleteTransaction(id);
  }
}

// =============================================================================
// BOOTSTRAP / ENTRY POINT
// =============================================================================

/**
 * Menginisialisasi aplikasi saat DOM siap.
 * - Deteksi ketersediaan localStorage
 * - Muat data dari storage
 * - Inisialisasi chart
 * - Render UI awal
 * - Pasang event listeners: form submit, delete click (event delegation)
 */
function init() {
  // Deteksi ketersediaan localStorage — tampilkan peringatan satu kali jika tidak tersedia
  renderCategoryOptions();

  if (!isStorageAvailable()) {
    showStorageWarning(
      'Persistensi data tidak tersedia pada browser ini. Data hanya berlaku untuk sesi ini.'
    );
  } else {
    // Muat kategori sebelum transaksi agar transaksi berkategori kustom tervalidasi.
    customCategories = loadCustomCategories();
    transactions = loadFromStorage();
  }

  renderCategoryOptions();
  const summaryMonthEl = document.getElementById('summary-month');
  if (summaryMonthEl && !summaryMonthEl.value) {
    summaryMonthEl.value = getCurrentMonth();
  }

  // Inisialisasi Chart.js pada canvas element
  const canvas = document.getElementById('budget-chart');
  initChart(canvas);

  // Render UI awal
  renderAll();

  // Pasang event listener: form submit
  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Pasang event listener: hapus transaksi (event delegation pada list container)
  const listEl = document.getElementById('transaction-list');
  if (listEl) {
    listEl.addEventListener('click', handleDeleteClick);
  }

  // Bersihkan error saat pengguna mengetik di field form
  const itemNameEl = document.getElementById('item-name');
  const amountEl = document.getElementById('amount');
  const categoryEl = document.getElementById('category');
  const customCategoryEl = document.getElementById('custom-category');
  const addCategoryBtn = document.getElementById('add-category-btn');
  const sortEl = document.getElementById('sort-transactions');

  if (addCategoryBtn && customCategoryEl) {
    addCategoryBtn.addEventListener('click', () => {
      const result = addCustomCategory(customCategoryEl.value);
      if (!result.valid) {
        showValidationErrors([result.error]);
        return;
      }
      customCategoryEl.value = '';
      clearValidationErrors();
    });
  }

  if (sortEl) {
    sortEl.addEventListener('change', () => {
      currentSort = sortEl.value;
      renderAll();
    });
  }

  if (summaryMonthEl) {
    summaryMonthEl.addEventListener('change', renderMonthlySummary);
  }

  [itemNameEl, amountEl, categoryEl, customCategoryEl].forEach((el) => {
    if (el) {
      el.addEventListener('input', clearValidationErrors);
      el.addEventListener('change', clearValidationErrors);
    }
  });
}

// Jalankan init saat DOM siap (hanya di browser, bukan saat di-import oleh test runner)
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  document.addEventListener('DOMContentLoaded', init);
}

// =============================================================================
// EXPORTS (untuk unit testing)
// =============================================================================
export {
  // Validator
  validateInput,
  // StateManager
  addTransaction,
  deleteTransaction,
  computeTotalBalance,
  computeCategoryTotals,
  saveToStorage,
  loadFromStorage,
  isValidTransaction,
  generateId,
  // UIRenderer
  formatCurrency,
  renderTransactionList,
  renderTotalBalance,
  toggleEmptyState,
  showValidationErrors,
  clearValidationErrors,
  clearForm,
  showStorageWarning,
  escapeHtml,
  // ChartManager
  computeChartData,
  initChart,
  updateChart,
  getCategoryColor,
  // Features
  getCategories,
  validateCategoryName,
  addCustomCategory,
  sortTransactions,
  getMonthlySummary,
  getCurrentMonth,
  // Event Handlers & Bootstrap
  handleFormSubmit,
  handleDeleteClick,
  init,
};
