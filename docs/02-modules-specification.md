# 02 — Application Modules & Functional Specifications

**System Code**: `CMD-APP-V1`  
**Module Suite**: `MOD-01` through `MOD-06` + `Document Vault`  

---

## 1. Module Overview Matrix

| Code | Name | Route | Purpose |
| :--- | :--- | :--- | :--- |
| `MOD-01` | **TXT Statement Ingestion** | `/upload-txt` | Raw bank statement noise reduction & JSON output |
| `MOD-02` | **BS ↔ MIS Reconciliation** | `/reconcile` | Bank statement vs MIS ledger cross-verification |
| `MOD-03` | **Report Consolidation** | `/merge-json` | Multi-file workbook consolidation & unioning |
| `MOD-04` | **Financial Analytics** | `/analytics` | Cashflow analysis, bulk detection, and reversal engine |
| `MOD-05` | **Audit Categorizer** | `/audit` | Type Code rule-based auto-classification |
| `MOD-06` | **Excel Workbench** | `/upload` | On-the-fly spreadsheet editor & decryption |
| `STORAGE`| **Document Vault** | `/saved-files` | Central repository, inspection & bulk ZIP export |

---

## 2. Detailed Functional Specifications

### MOD-01: TXT Statement Ingestion (`/upload-txt`)
- **Parser Engine**: `server/utils/txtToJsonParser.js`
- Filters out bank statement headers, page separators, and continuations:
  - `"Continue on next page"`, `"STATEMENT OF ACCOUNT"`, `"BROUGHT FORWARD"`, etc.
- Regex extraction of 7-to-9 digit Challan IDs mapped against university prefixes.
- Separates **1Bill Records** (`BRANCH`, `1BILL_PAY`, `MV-FW`) from **Auto Records**.
- Recalculates total debit/credit transaction counts and amounts.

### MOD-02: BS ↔ MIS Reconciliation (`/reconcile`)
- **Matching Engine**: `server/utils/reconcileHelper.js`
- Compares Bank Statement (BS) credits with MIS ledger fee records.
- Composite Key: `${ChallanNo}_${Amount.toFixed(2)}`.
- Remarks Fallback: Parses remarks column for updated/alternate Challan numbers.
- Emits 4 sheets: `Verified MIS`, `Not Verified BS`, `Not Verified MIS`, `Summary`.

### MOD-03: Report Consolidation Engine (`/merge-json`)
- **Route Controller**: `server/routes/analytics.js` (`/merge-files`)
- Selects multiple stored reports with Shift+Click range support.
- Combines sheets from multiple workbooks into unified target sheets.
- Preserves distinct columns across all merged datasets.

### MOD-04: Financial Analytics Portal (`/analytics`)
- **Analysis Engine**: `server/utils/bsDataAnalytics.js`
- Detects bulk payment distribution entries (searching for `"txn"` in particulars).
- Fast $O(N)$ Reversal Detection: Dual-queue matching pairing debits and credits on identical Challans.
- Balance Order classification for non-challan debits.
- Emits 6 sheets: `Valid Transactions`, `Invalid Transactions`, `Balance Order`, `Bulk Payments`, `Challan Repeat Stats`, `Detailed Summary`.

### MOD-05: Audit Categorizer Engine (`/audit`)
- **Rule Engine**: `server/utils/auditHelper.js`
- Classifies ledger entries into 21+ university audit categories:
  - `10`: Examination Semester, `20`: Admission Processing, `30`: DRGS Admission,
  - `40`: Boys Hostel, `41`: Girls Hostel, `50`: Annual Degree Certificates,
  - `61`: SUTC Testing, `62`: Career Portal, `70`: Alumni Registration, etc.
- Modes: `strict` (both type code and challan prefix must agree), `type_code`, `challan_no`.
- Unmatched entries routed to `nullData` with explicit rejection reasons.

### MOD-06: Excel Workbench & Document Vault (`/upload`, `/saved-files`)
- Ingests `.xlsx`, `.xls`, `.csv` with client/server password decryption via `officecrypto-tool`.
- High-density data grid with in-cell editing and multi-sheet tab navigation.
- Vault repository with full-text search, date filters, in-place renaming, and bulk ZIP download.
