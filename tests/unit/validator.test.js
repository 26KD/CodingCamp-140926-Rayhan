/**
 * Unit tests untuk Validator — validateInput(itemName, amountRaw, category)
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect } from 'vitest';
import { validateInput } from '../../js/app.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const VALID_NAME = 'Nasi Goreng';
const VALID_AMOUNT = '25000';
const VALID_CATEGORY = 'Food';

// ---------------------------------------------------------------------------
// Requirement 1.2 & 1.3 — Field kosong (single dan multiple)
// ---------------------------------------------------------------------------
describe('Requirement 1.2 & 1.3 — Validasi field kosong', () => {
  it('mengembalikan valid: false dan error ketika itemName kosong', () => {
    const result = validateInput('', VALID_AMOUNT, VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Pesan error harus menyebutkan nama field
    expect(result.errors.some((e) => /item name/i.test(e))).toBe(true);
  });

  it('mengembalikan valid: false dan error ketika amountRaw kosong', () => {
    const result = validateInput(VALID_NAME, '', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('mengembalikan valid: false dan error ketika category kosong', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, '');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /category/i.test(e))).toBe(true);
  });

  it('mengumpulkan SEMUA error sekaligus ketika itemName dan amountRaw kosong', () => {
    const result = validateInput('', '', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    // Harus ada error untuk itemName DAN amount — tidak berhenti di error pertama
    const hasNameError = result.errors.some((e) => /item name/i.test(e));
    const hasAmountError = result.errors.some((e) => /amount/i.test(e));
    expect(hasNameError).toBe(true);
    expect(hasAmountError).toBe(true);
  });

  it('mengumpulkan SEMUA error sekaligus ketika seluruh field kosong (itemName, amount, category)', () => {
    const result = validateInput('', '', '');
    expect(result.valid).toBe(false);
    // Ketiga field bermasalah harus muncul di errors
    const hasNameError = result.errors.some((e) => /item name/i.test(e));
    const hasAmountError = result.errors.some((e) => /amount/i.test(e));
    const hasCategoryError = result.errors.some((e) => /category/i.test(e));
    expect(hasNameError).toBe(true);
    expect(hasAmountError).toBe(true);
    expect(hasCategoryError).toBe(true);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('mengembalikan valid: false ketika itemName hanya berisi spasi (whitespace-only)', () => {
    const result = validateInput('   ', VALID_AMOUNT, VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /item name/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.2 — Panjang Item Name
// ---------------------------------------------------------------------------
describe('Requirement 1.2 — Panjang Item Name', () => {
  it('menerima itemName tepat 100 karakter', () => {
    const name100 = 'a'.repeat(100);
    const result = validateInput(name100, VALID_AMOUNT, VALID_CATEGORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('menolak itemName 101 karakter', () => {
    const name101 = 'a'.repeat(101);
    const result = validateInput(name101, VALID_AMOUNT, VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /item name/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.4 — Amount nol, negatif, atau non-numerik
// ---------------------------------------------------------------------------
describe('Requirement 1.4 — Amount tidak valid (nol, negatif, non-numerik)', () => {
  it('menolak amount = 0', () => {
    const result = validateInput(VALID_NAME, '0', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('menolak amount negatif (-1)', () => {
    const result = validateInput(VALID_NAME, '-1', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('menolak amount negatif besar (-999)', () => {
    const result = validateInput(VALID_NAME, '-999', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('menolak amount berupa teks biasa ("abc")', () => {
    const result = validateInput(VALID_NAME, 'abc', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('menolak amount berupa karakter spesial ("12abc")', () => {
    const result = validateInput(VALID_NAME, '12abc', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.5 — Batas atas Amount: 999999999.99
// ---------------------------------------------------------------------------
describe('Requirement 1.5 — Batas atas Amount (999999999.99)', () => {
  it('menerima amount TEPAT di batas: 999999999.99 → valid: true', () => {
    const result = validateInput(VALID_NAME, '999999999.99', VALID_CATEGORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('menolak amount MELEBIHI batas: 999999999.991 → valid: false', () => {
    const result = validateInput(VALID_NAME, '999999999.991', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('menolak amount jauh di atas batas: 1000000000', () => {
    const result = validateInput(VALID_NAME, '1000000000', VALID_CATEGORY);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true);
  });

  it('menerima amount sedikit di bawah batas: 999999999.98', () => {
    const result = validateInput(VALID_NAME, '999999999.98', VALID_CATEGORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('menerima amount minimum valid: 0.01', () => {
    const result = validateInput(VALID_NAME, '0.01', VALID_CATEGORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.3 — Category tidak dikenal
// ---------------------------------------------------------------------------
describe('Requirement 1.3 — Category tidak valid', () => {
  it('menolak category tidak dikenal ("Entertainment")', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, 'Entertainment');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /category/i.test(e))).toBe(true);
  });

  it('menolak category huruf kecil ("food") — case-sensitive', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, 'food');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /category/i.test(e))).toBe(true);
  });

  it('menolak category null', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, null);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /category/i.test(e))).toBe(true);
  });

  it('menolak category undefined', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /category/i.test(e))).toBe(true);
  });

  it('menerima category "Food" (valid)', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, 'Food');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('menerima category "Transport" (valid)', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, 'Transport');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('menerima category "Fun" (valid)', () => {
    const result = validateInput(VALID_NAME, VALID_AMOUNT, 'Fun');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path — input valid lengkap
// ---------------------------------------------------------------------------
describe('Happy path — input lengkap dan valid', () => {
  it('mengembalikan valid: true dan errors kosong untuk input yang benar', () => {
    const result = validateInput('Kopi Susu', '15000', 'Food');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('menerima amount desimal positif biasa (12500.50)', () => {
    const result = validateInput('Bensin', '12500.50', 'Transport');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
