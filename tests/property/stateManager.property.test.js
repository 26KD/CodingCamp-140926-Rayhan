/**
 * Property-based tests untuk StateManager
 *
 * Feature: expense-budget-visualizer, Property 3: Penambahan valid menambah panjang list sebesar 1 dan mengosongkan form
 *
 * Validates: Requirements 1.6
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { addTransaction, deleteTransaction, loadFromStorage } from '../../js/app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Generator untuk sebuah transaction yang valid.
 * itemName: string non-kosong ≤ 100 karakter
 * amount: number dalam rentang 0.01 – 999999999.99
 * category: salah satu dari ['Food', 'Transport', 'Fun']
 */
const validTransactionArb = fc.record({
  itemName: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  amount: fc.double({
    min: 0.01,
    max: 999999999.99,
    noNaN: true,
    noDefaultInfinity: true,
  }),
  category: fc.constantFrom(...VALID_CATEGORIES),
});

/**
 * Membersihkan seluruh state in-memory dengan menghapus semua transaction yang
 * tersimpan di localStorage, lalu menghapusnya satu per satu via deleteTransaction.
 * Ini penting agar setiap iterasi property test dimulai dari kondisi bersih.
 */
function resetState() {
  // Hapus semua transaction yang ada di state in-memory dengan membaca dari storage
  // lalu menghapus satu per satu via deleteTransaction
  const existing = loadFromStorage();
  for (const t of existing) {
    deleteTransaction(t.id);
  }
  // Pastikan localStorage benar-benar bersih
  localStorage.removeItem('expense_transactions');
}

// ---------------------------------------------------------------------------
// Property 3: Penambahan transaction valid selalu menambah panjang list sebesar 1
// ---------------------------------------------------------------------------

describe('Property 3 — Penambahan valid menambah panjang list sebesar 1', () => {
  beforeEach(() => {
    resetState();
  });

  it(
    'setelah addTransaction dipanggil dengan data valid, panjang list bertambah tepat 1',
    () => {
      fc.assert(
        fc.property(validTransactionArb, (transaction) => {
          // Pastikan state bersih sebelum setiap iterasi
          resetState();

          // Catat panjang list sebelum penambahan
          const before = loadFromStorage();
          const lengthBefore = before.length; // harus 0 setelah reset

          // Tambahkan transaction
          addTransaction(transaction);

          // Baca state setelah penambahan
          const after = loadFromStorage();
          const lengthAfter = after.length;

          // Panjang harus bertambah tepat 1
          return lengthAfter === lengthBefore + 1;
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'transaction yang ditambahkan memiliki itemName, amount, dan category yang sesuai dengan input',
    () => {
      fc.assert(
        fc.property(validTransactionArb, (transaction) => {
          resetState();

          addTransaction(transaction);

          const after = loadFromStorage();
          // Harus ada tepat 1 item setelah reset + add
          if (after.length !== 1) return false;

          const saved = after[0];
          return (
            saved.itemName === transaction.itemName &&
            saved.amount === transaction.amount &&
            saved.category === transaction.category
          );
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'penambahan berurutan n transaction meningkatkan panjang list menjadi tepat n',
    () => {
      fc.assert(
        fc.property(
          fc.array(validTransactionArb, { minLength: 1, maxLength: 5 }),
          (transactionList) => {
            resetState();

            for (const t of transactionList) {
              addTransaction(t);
            }

            const after = loadFromStorage();
            return after.length === transactionList.length;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
