import { describe, expect, it } from 'vitest';
import {
  getMonthlySummary,
  sortTransactions,
  validateCategoryName,
} from '../../js/app.js';

const transactions = [
  { id: '1', itemName: 'Kopi', amount: 25000, category: 'Food', createdAt: new Date(2026, 8, 3).getTime() },
  { id: '2', itemName: 'Vitamin', amount: 50000, category: 'Kesehatan', createdAt: new Date(2026, 8, 10).getTime() },
  { id: '3', itemName: 'Bus', amount: 15000, category: 'Transport', createdAt: new Date(2026, 7, 30).getTime() },
];

describe('Kategori kustom', () => {
  it('menolak kategori bawaan yang diduplikasi dan menerima nama baru', () => {
    expect(validateCategoryName('food').valid).toBe(false);
    expect(validateCategoryName('Kesehatan').valid).toBe(true);
  });
});

describe('Ringkasan bulanan', () => {
  it('menghitung transaksi, total, dan kategori terbesar untuk bulan terpilih', () => {
    const summary = getMonthlySummary(transactions, '2026-09');

    expect(summary.count).toBe(2);
    expect(summary.total).toBe(75000);
    expect(summary.topCategory).toBe('Kesehatan');
  });
});

describe('Pengurutan transaksi', () => {
  it('mengurutkan nominal terbesar lebih dahulu tanpa mengubah daftar asal', () => {
    const sorted = sortTransactions(transactions, 'amount-desc');

    expect(sorted.map((transaction) => transaction.id)).toEqual(['2', '1', '3']);
    expect(transactions.map((transaction) => transaction.id)).toEqual(['1', '2', '3']);
  });

  it('mengurutkan kategori secara alfabetis', () => {
    const sorted = sortTransactions(transactions, 'category-asc');

    expect(sorted.map((transaction) => transaction.category)).toEqual(['Food', 'Kesehatan', 'Transport']);
  });
});
