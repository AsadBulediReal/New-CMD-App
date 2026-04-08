# TXT to JSON Parser - Blueprint & Recreation Guide

## Overview
This script converts text-based bank statement files (in .txt format, likely pipe-delimited bank account statements) into structured JSON format with transaction parsing, validation, and enrichment.

---

## High-Level Workflow

```
Input TXT File
     ↓
Parse Header Information (Account Details)
     ↓
Parse Transaction Table (Date, Amount, etc.)
     ↓
Extract Challan Numbers from Transaction Details
     ↓
Clean and Validate Transaction Data
     ↓
Parse Summary Section (Opening/Closing Balance)
     ↓
Enrich Transactions with Remarks
     ↓
Output JSON File
```

---

## Core Components

### 1. **Configuration** (Static Data)
```python
VALID_PREFIXES = [
    "10", "11", "20", "21", "22", "30", "31", "32",
    "40", "41", "43", "50", "51", "52", "53", "54", "55", "56", "61", "62", "70",
    "33", "34", "36", "38", "39"
]

extraPrefixesRemarks = {
    "33": "1st Examination / Thesis Evaluation Challan (31-002)",
    "34": "1st Extension Challan (31-003)",
    "36": "1st Improvement of CGPA Challan (31-005)",
    "38": "1st Additional Supervision Fee Challan (31-007)",
    "39": "1st Plarigism Fee (31-008)"
}
```
**Purpose**: Define valid challan number prefixes and their descriptions (remarks)

#### Complete Challan Prefix Reference

| Prefix | Type | Description/Remarks |
|--------|------|---------------------|
| 10 | Standard | General/Standard Transaction |
| 11 | Standard | General/Standard Transaction |
| 20 | Standard | General/Standard Transaction |
| 21 | Standard | General/Standard Transaction |
| 22 | Standard | General/Standard Transaction |
| 30 | Standard | General/Standard Transaction |
| 31 | Standard | General/Standard Transaction |
| 32 | Standard | General/Standard Transaction |
| 33 | Special | 1st Examination / Thesis Evaluation Challan (31-002) |
| 34 | Special | 1st Extension Challan (31-003) |
| 36 | Special | 1st Improvement of CGPA Challan (31-005) |
| 38 | Special | 1st Additional Supervision Fee Challan (31-007) |
| 39 | Special | 1st Plarigism Fee (31-008) |
| 40 | Standard | General/Standard Transaction |
| 41 | Standard | General/Standard Transaction |
| 43 | Standard | General/Standard Transaction |
| 50 | Standard | General/Standard Transaction |
| 51 | Standard | General/Standard Transaction |
| 52 | Standard | General/Standard Transaction |
| 53 | Standard | General/Standard Transaction |
| 54 | Standard | General/Standard Transaction |
| 55 | Standard | General/Standard Transaction |
| 56 | Standard | General/Standard Transaction |
| 61 | Standard | General/Standard Transaction |
| 62 | Standard | General/Standard Transaction |
| 70 | Standard | General/Standard Transaction |

**Summary**:
- **Total Valid Prefixes**: 27
- **Standard Prefixes** (22): General transactions without specific remarks
- **Special Prefixes** (5): University-specific fee types with explicit remarks (33, 34, 36, 38, 39)

---

### 2. **Helper Functions**

#### `is_junk_line(line: str) -> bool`
- **Purpose**: Filter out non-transaction lines (headers, separators, continuation text)
- **Input**: A single line of text
- **Output**: Boolean (True if line is "junk", False if it's useful)
- **Logic**: Regex pattern matching against 20+ known junk patterns
- **Patterns Detected**:
  - "Continue on next page"
  - Table separators ("---")
  - Meta information ("ACCOUNT NO", "CURRENCY", etc.)
  - Statement markers ("BROUGHT FORWARD", "CARRIED FORWARD")

#### `clean_particulars_field(text: str) -> str`
- **Purpose**: Clean up transaction description text
- **Input**: Raw particulars field from transaction
- **Output**: Cleaned text string
- **Transformations**:
  1. Replace pipe characters with spaces
  2. Convert multiple dashes to single spaces
  3. Remove header information patterns
  4. Remove "BROUGHT FORWARD" continuations
  5. Collapse multiple spaces to single space
  6. Strip leading/trailing whitespace

#### `extract_challan_number(text: str) -> int`
- **Purpose**: Extract valid challan number from transaction description
- **Input**: Text containing challan number
- **Output**: Integer challan number or 0 if not found
- **Algorithm**:
  1. Find all 7-12 digit numbers using regex: `\b0*\d{7,12}\b`
  2. Strip leading zeros
  3. Check if length is 7, 8, or 9 digits
  4. Check if first 2 digits match `VALID_PREFIXES`
  5. Return first valid number (priority: 9 digits > 8 digits > 7 digits)
  6. Return 0 if no valid challan found
- **Challan Format**: 9-digit code where first 2 digits are prefix

#### `parse_summary(lines: list) -> dict`
- **Purpose**: Extract summary statistics from the bottom of statement
- **Input**: List of lines from summary section
- **Output**: Dictionary with summary data
- **Extracts**:
  - Opening Balance
  - Total Debit Transactions (count)
  - Total Amount Debited
  - Total Credit Transactions (count)
  - Total Amount Credited
  - Closing Balance
- **Regex Pattern**: `[\d,]+\.\d{2}` for currency values

---

### 3. **Main Parser Function**

#### `parse_txt_to_json(txt_path: str) -> dict`

**Input**: Path to .txt file

**Output Structure**:
```json
{
    "Header": {
        "ACCOUNT NO": "123456",
        "FOR THE PERIOD ENDING": "31-JAN-2026",
        "CURRENCY": "PKR",
        ...
    },
    "Transactions": [
        {
            "Date": "01JAN26",
            "Value Date": "01JAN26",
            "Particulars": "Transaction description",
            "Debit": 1000.50,
            "Credit": 0.0,
            "Balance": 5000.00,
            "Challan No.": 101002345,
            "Remarks": "1st Examination / Thesis Evaluation Challan..."
        },
        ...
    ],
    "Summary": {
        "Opening Balance": 6000.50,
        "Total Credit Transactions": 5,
        "Total Amount Credited": 2500.00,
        ...
    }
}
```

**Algorithm**:

1. **File Reading**
   - Open TXT file with UTF-8 encoding
   - Read all lines

2. **Initialize State**
   ```python
   header = {}
   transactions = []
   transaction = {} # Current transaction being built
   table_started = False
   summary_lines = []
   ```

3. **Regex Compilations**
   - `header_re`: Extract "KEY : VALUE" patterns
   - `date_re`: Match date format (e.g., "01JAN26")
   - `number_re`: Match currency format (e.g., "1,000.50")

4. **Line-by-Line Processing**
   
   **Stage 1: Summary Detection**
   - If "Opening balance" found → Enter summary mode
   - Collect all following lines until end

   **Stage 2: Header Extraction**
   - If table not started:
     - Try to match header patterns (Account No, Period, Type, etc.)
     - When row starts with "|DATE" → Mark table_started = True
   - Skip non-matching lines

   **Stage 3: Transaction Parsing**
   - Split line by pipe character "|"
   - **New Transaction Detection**: `len(columns) >= 7 AND date found in column[1]`
     - Save previous transaction
     - Create new transaction with 6 fields from columns[1-6]
   - **Continuation Line**: Append to current transaction's Particulars field

5. **Post-Processing Each Transaction**
   - Extract challan number
   - Clean particulars text
   - Map challan prefix to remarks
   - Append to transactions list

6. **Summary Calculation**
   - Parse summary section (if present)
   - Calculate credit transaction counts/amounts by scanning transactions
   - Store in summary dict

7. **Return** combined result object

---

## Data Structures

### Transaction Object
```python
{
    "Date": str,           # Format: "01JAN26"
    "Value Date": str,     # Format: "01JAN26"
    "Particulars": str,    # Transaction description
    "Debit": float,        # Debit amount
    "Credit": float,       # Credit amount
    "Balance": float,      # Running balance
    "Challan No.": int,    # Extracted challan number (0 if none)
    "Remarks": str         # Auto-populated from challan prefix
}
```

### Header Object
```python
{
    "ACCOUNT NO": str,
    "FOR THE PERIOD ENDING": str,
    "ACCOUNT TYPE": str,
    "CURRENCY": str,
    "PRINTING DATE": str,
    "FREQUENCY": str,
    "PAGE NO": str,
    "USER": str
}
```

### Summary Object
```python
{
    "Opening Balance": float,
    "Total Debit Transactions": int,
    "Total Amount Debited": float,
    "Total Credit Transactions": int,
    "Total Amount Credited": float,
    "Closing Balance": float
}
```

---

## Regular Expressions Used

| Pattern | Purpose | Example Match |
|---------|---------|----------------|
| `(ACCOUNT NO\|FOR THE PERIOD...):\s*(.*)` | Extract header key-value pairs | "ACCOUNT NO : 123456" |
| `(\d{2}[A-Z]{3}\d{2})` | Date format | "01JAN26" |
| `[\d,]+\.\d{2}` | Currency format | "1,000.50" |
| `\b0*\d{7,12}\b` | Find potential challan numbers | "0101002345", "101002345" |
| Various junk patterns | Identify non-transaction lines | See `is_junk_line()` |

---

## Key Design Decisions

1. **Multi-digit Challan Priority**: 9-digit → 8-digit → 7-digit
   - Prioritizes longer, more specific challan numbers

2. **Continuation Lines**: Transaction descriptions can span multiple physical lines
   - Accumulates into "Particulars" field until new transaction detected

3. **Junk Line Filtering**: Extensive pattern list prevents header/separator contamination
   - Creates clean, isolated transaction data

4. **Double Extraction**: Challan extracted twice
   - Once when transaction finalized
   - Once for the last transaction (edge case handling)

5. **Lazy Summary Parsing**: Only parses summary if "Opening balance" found
   - Handles files with/without summary section

6. **Credit-only Summary**: Recalculates credit metrics manually
   - Ensures accuracy by scanning all transactions

---

## How to Recreate This Script

### Step 1: Setup
```python
import re
import json
```

### Step 2: Define Constants
```python
VALID_PREFIXES = ["10", "11", "20", ...]
extraPrefixesRemarks = {"33": "...", ...}
```

### Step 3: Implement Helper Functions
- `is_junk_line()` - 20+ regex patterns
- `clean_particulars_field()` - 5 text transformations
- `extract_challan_number()` - 3-bucket priority logic
- `parse_summary()` - 6 regex extractions

### Step 4: Implement Main Parser
- Initialize state variables
- Compile regex patterns
- Loop through file lines
- Handle 3 stages: Summary → Header → Transactions
- Post-process transactions

### Step 5: Add Entry Point
```python
if __name__ == "__main__":
    input_file = input("Enter TXT file name: ").strip()
    data = parse_txt_to_json(f"{input_file}.txt")
    output_file = input("Enter output JSON file name: ").strip()
    with open(f"{output_file}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
```

---

## Testing Checklist

- [ ] Reads TXT file correctly (UTF-8 encoding)
- [ ] Extracts all header fields
- [ ] Detects table start correctly
- [ ] Parses transaction rows with pipe delimiters
- [ ] Handles multi-line transaction descriptions
- [ ] Extracts challan numbers with priority order
- [ ] Cleans particulars text (removes symbols, collapses spaces)
- [ ] Maps challan prefixes to remarks
- [ ] Parses summary section
- [ ] Handles edge cases (no summary, missing fields)
- [ ] Outputs valid JSON with proper formatting
- [ ] Handles special characters (non-ASCII) correctly

---

## Edge Cases Handled

1. **Multi-line Particulars**: Continues accumulating until next transaction date detected
2. **Missing Fields**: Uses default values (empty strings, 0.0, null)
3. **Malformed Dates**: Checks with regex before using
4. **Currency Formatting**: Removes commas before converting to float
5. **No Challan Number**: Returns 0, remarks = empty string
6. **Missing Summary**: Only includes if "Opening balance" found
7. **Various Date Formats**: Flexible regex pattern `(\d{2}[A-Z]{3}\d{2})`

---

## Performance Characteristics

- **Time Complexity**: O(n) where n = number of lines
- **Space Complexity**: O(m) where m = number of transactions
- **Bottleneck**: Regex matching on every line and junk pattern checking
- **Optimization**: Could compile junk patterns once (already done with `header_re`, `date_re`, `number_re`)

---

## Related Files

- Input: `.txt` files (bank statements)
- Output: `.json` files (parsed data)
- Used by: Other scripts in the project that process JSON data
  - `bs_data_analytics.py`
  - `bs_json_to_execl.py`
  - `compare_bs_mis.py`

