# API Documentation — finance-ids backend

Base URL (local): `http://localhost:4000` · Base URL (production): `https://finance-ids-production.up.railway.app`

Semua endpoint `Authenticated` membutuhkan header `Authorization: Bearer <token>` (token didapat dari `POST /api/auth/login`). Semua nominal uang dalam Rupiah (integer, tanpa desimal). Format tanggal `YYYY-MM-DD`.

## Health Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/health | GET | Mengecek status API | - | Public | - |
| /api/health/db | GET | Mengecek koneksi ke database | - | Public | - |

## Auth Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/auth/login | POST | Melakukan login dan mendapatkan token | Body: { email, password } | Public | - |

## Me Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/me | GET | Mengambil profil pengguna yang sedang login | - | Authenticated | Semua role |

## User Endpoints (khusus Superadmin)

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/users | GET | Mengambil daftar pengguna | - | Authenticated | Superadmin |
| /api/users | POST | Menambahkan pengguna baru | Body: { email, password, fullName, role } | Authenticated | Superadmin |
| /api/users/:id/role | PATCH | Mengubah role pengguna tertentu | Param: id<br>Body: { role } | Authenticated | Superadmin |
| /api/users/:id/active | PATCH | Mengaktifkan/menonaktifkan pengguna tertentu | Param: id<br>Body: { isActive } | Authenticated | Superadmin |

## Notes Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/notes | GET | Mengambil daftar catatan dashboard | - | Authenticated | Semua role |
| /api/notes | POST | Menambahkan catatan baru | Body: { body } | Authenticated | Superadmin, Admin, Director |

## Dashboard Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/dashboard | GET | Mengambil ringkasan kesehatan finansial perusahaan (kas, pendapatan, laba, invoice belum dibayar, status proyek) | - | Authenticated | Semua role |

## Invoice Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/invoices | GET | Mengambil daftar invoice beserta ringkasannya | - | Authenticated | Semua role |
| /api/invoices | POST | Menambahkan invoice baru | Body: { invoiceNumber, projectId, amount, issuedDate, dueDate } | Authenticated | Superadmin, Admin |
| /api/invoices/:id | PATCH | Memperbarui informasi invoice tertentu | Param: id<br>Body: { amount, issuedDate, dueDate } | Authenticated | Superadmin, Admin |
| /api/invoices/:id/payment | PATCH | Mencatat pembayaran yang diterima untuk invoice tertentu | Param: id<br>Body: { amountReceived, receivedDate } | Authenticated | Superadmin, Admin |
| /api/invoices/:id/void | PATCH | Membatalkan invoice tertentu (ditolak jika sudah ada pembayaran) | Param: id | Authenticated | Superadmin, Admin |

## Project Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/projects | GET | Mengambil daftar proyek beserta statistiknya | - | Authenticated | Semua role |
| /api/projects | POST | Menambahkan proyek baru (klien lama via clientId, atau klien baru via newClient) | Body: { clientId \| newClient: { name, clientType }, name, productLine, contractValue, budget } | Authenticated | Superadmin, Admin |
| /api/projects/:id | PATCH | Memperbarui nama/lini produk/nilai kontrak proyek tertentu | Param: id<br>Body: { name, productLine, contractValue } | Authenticated | Superadmin, Admin |
| /api/projects/:id | DELETE | Menghapus proyek tertentu (ditolak jika sudah punya histori invoice/pengeluaran) | Param: id | Authenticated | Superadmin, Admin |
| /api/projects/:id/flag | PATCH | Menandai/melepas tanda proyek untuk ditinjau | Param: id<br>Body: { isFlagged } | Authenticated | Superadmin, Admin, Director |
| /api/projects/:id/budget | PATCH | Mengubah anggaran proyek tertentu | Param: id<br>Body: { budget } | Authenticated | Superadmin, Admin, Director |

## Client Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/clients | GET | Mengambil daftar klien | - | Authenticated | Semua role |

## Budget Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/budgets | GET | Mengambil data anggaran vs pengeluaran (per bulan atau sepanjang waktu) | Query: ?scope (YYYY-MM-01 atau all) | Authenticated | Semua role |
| /api/budgets/categories/:category | PATCH | Mengubah rencana anggaran kategori tertentu (payroll/operations/project_costs) | Param: category<br>Body: { plannedAmount } | Authenticated | Superadmin, Admin, Director |
| /api/budgets/expenses | POST | Mencatat pengeluaran baru (Money Out). Jika `dueDate` diisi, dicatat sebagai tagihan vendor belum dibayar (butuh `partnerId`); jika tidak, dicatat sebagai pengeluaran tunai yang langsung lunas | Body: { category, description, amount, spentOn, projectId, partnerId?, dueDate? } — projectId wajib jika category=project_costs, harus null selainnya; partnerId wajib jika dueDate diisi | Authenticated | Superadmin, Admin |
| /api/budgets/expenses/:id/void | PATCH | Membatalkan pengeluaran/tagihan vendor tertentu (ditolak jika sudah ada pembayaran) | Param: id | Authenticated | Superadmin, Admin |

## Trend Endpoints

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/trends | GET | Mengambil tren pendapatan tahun berjalan (per bulan, per lini produk, per tipe klien) | - | Authenticated | Semua role |
| /api/trends/targets/:period | PATCH | Mengubah target pendapatan bulan tertentu | Param: period (YYYY-MM-01)<br>Body: { targetAmount } | Authenticated | Superadmin, Admin, Director |

## Accounting Endpoints

Ditambahkan 2026-08-11 — general ledger double-entry di balik invoices/expenses yang sudah ada. Diperluas 2026-08-11 (fase 2) dengan vendor bill payment, loan, dan fiscal period. Lihat `docs/erd.md` bagian "Accounting core" dan `docs/accounting-flows.md` untuk model datanya. Endpoint ini belum dipakai UI (belum ada halaman Accounting), disiapkan untuk fase berikutnya.

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/accounting/accounts | GET | Mengambil chart of accounts | - | Authenticated | Semua role |
| /api/accounting/trial-balance | GET | Saldo setiap akun (Trial Balance) | Query: ?asOf (YYYY-MM-DD, default: semua waktu) | Authenticated | Semua role |
| /api/accounting/summary | GET | Ringkasan P&L + Balance Sheet (assets, liabilities, equity, revenue, expenses, netIncome, cash, receivables, payables) | Query: ?asOf | Authenticated | Semua role |
| /api/accounting/general-ledger | GET | Baris jurnal yang sudah posted, bisa difilter | Query: ?accountId, ?projectId, ?partnerId, ?from, ?to | Authenticated | Semua role |
| /api/accounting/projects/:id/profitability | GET | Revenue/cost/profit satu proyek, derived dari ledger | Param: id<br>Query: ?asOf | Authenticated | Semua role |
| /api/accounting/ar-aging | GET | Piutang belum dibayar, dikelompokkan per umur (current/1-30/31-60/61-90/90+) | Query: ?asOf | Authenticated | Semua role |
| /api/accounting/ap-aging | GET | Utang vendor belum dibayar, dikelompokkan per umur | Query: ?asOf | Authenticated | Semua role |
| /api/accounting/debt | GET | Pinjaman aktif beserta sisa pokok (derived) | - | Authenticated | Semua role |
| /api/accounting/entries | POST | Mencatat jurnal manual (harus balance, >=2 baris) | Body: { journalCode, accountingDate, description, reference?, lines: [{ accountCode, partnerId?, projectId?, description?, debit, credit }] } | Authenticated | Superadmin, Admin |
| /api/accounting/vendor-bills/:id/payment | POST | Mencatat pembayaran tagihan vendor (id = id pengeluaran dengan dueDate), mendukung pembayaran sebagian | Param: id<br>Body: { amountPaid, paymentDate } | Authenticated | Superadmin, Admin |
| /api/accounting/loans | POST | Mencatat pinjaman baru sekaligus posting pencairan dana (Dr Bank / Cr Loan Liability) | Body: { reference, lenderPartnerId, liabilityAccountId, principalAmount, interestRatePct?, startDate, maturityDate? } | Authenticated | Superadmin, Admin |
| /api/accounting/loans/:id/repayment | POST | Mencatat pembayaran pokok dan/atau bunga pinjaman | Param: id<br>Body: { principalAmount?, interestAmount?, paymentDate } — minimal salah satu diisi | Authenticated | Superadmin, Admin |
| /api/accounting/fiscal-periods | GET | Mengambil daftar periode fiskal beserta statusnya (open/closed) | - | Authenticated | Semua role |
| /api/accounting/fiscal-periods/:period | PUT | Membuka/menutup periode fiskal tertentu — periode tertutup menolak semua posting baru | Param: period (YYYY-MM-01)<br>Body: { status: "open" \| "closed" } | Authenticated | Superadmin, Admin |

## Partner Endpoints

Ditambahkan 2026-08-11 (fase 2 accounting) — identitas finansial generik (customer/vendor/employee/lender), superset dari `/api/clients` yang sudah ada. `GET /api/clients` tetap dipakai frontend untuk picker proyek/invoice; endpoint ini untuk vendor/lender yang dibutuhkan tagihan vendor dan pinjaman.

| Endpoint | Method | Deskripsi | Request | Authorization | Roles |
|---|---|---|---|---|---|
| /api/partners | GET | Mengambil daftar partner, bisa difilter per peran | Query: ?role (customer\|vendor\|employee\|lender) | Authenticated | Semua role |
| /api/partners | POST | Menambahkan partner baru (vendor/lender/employee/customer) | Body: { name, clientType?, isCustomer?, isVendor?, isEmployee?, isLender?, taxId? } — minimal satu peran true | Authenticated | Superadmin, Admin |
