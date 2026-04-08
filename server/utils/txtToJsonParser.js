const fs = require('fs');

const VALID_PREFIXES = [
    "10", "11", "20", "21", "22", "30", "31", "32",
    "40", "41", "43", "50", "51", "52", "53", "54", "55", "56", "61", "62", "70",
    "33", "34", "36", "38", "39"
];

const extraPrefixesRemarks = {
    "33": "1st Examination / Thesis Evaluation Challan (31-002)",
    "34": "1st Extension Challan (31-003)",
    "36": "1st Improvement of CGPA Challan (31-005)",
    "38": "1st Additional Supervision Fee Challan (31-007)",
    "39": "1st Plarigism Fee (31-008)"
};

/**
 * Filter out non-transaction lines (headers, separators, continuation text)
 */
function is_junk_line(line) {
    const junkPatterns = [
        "Continue on next page",
        "---",
        "ACCOUNT NO",
        "CURRENCY",
        "STATEMENT OF ACCOUNT",
        "BRANCH",
        "PERIOD",
        "ACCOUNT TYPE",
        "PRINTING DATE",
        "FREQUENCY",
        "PAGE NO",
        "USER",
        "DATE\\s+\\|\\s+VALUE DATE",
        "Opening balance",
        "BROUGHT FORWARD",
        "CARRIED FORWARD",
        "^\\s*$" // empty line
    ];
    
    for (const pattern of junkPatterns) {
        if (new RegExp(pattern, 'i').test(line)) {
            return true;
        }
    }
    
    if (/^[\|\s]+$/.test(line)) {
        return true;
    }
    
    return false;
}

/**
 * Clean up transaction description text
 */
function clean_particulars_field(text) {
    if (!text) return "";
    let cleaned = text;
    // 1. Replace pipe characters with spaces
    cleaned = cleaned.replace(/\|/g, ' ');
    // 2. Convert multiple dashes to single spaces
    cleaned = cleaned.replace(/-{2,}/g, ' ');
    // 3. Remove header information patterns
    // 4. Remove "BROUGHT FORWARD" continuations
    cleaned = cleaned.replace(/BROUGHT FORWARD/gi, '');
    cleaned = cleaned.replace(/CARRIED FORWARD/gi, '');
    // 5. Collapse multiple spaces to single space
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    // 6. Strip leading/trailing whitespace
    return cleaned.trim();
}

/**
 * Extract valid challan number from transaction description
 */
function extract_challan_number(text) {
    const matches = text.match(/\b0*\d{7,12}\b/g) || [];
    const validChallans = { 9: [], 8: [], 7: [] };
    
    for (const match of matches) {
        const numStr = match.replace(/^0+/, '');
        const len = numStr.length;
        if (len === 7 || len === 8 || len === 9) {
            const prefix = numStr.substring(0, 2);
            if (VALID_PREFIXES.includes(prefix)) {
                validChallans[len].push(parseInt(numStr, 10));
            }
        }
    }
    
    if (validChallans[9].length > 0) return validChallans[9][0];
    if (validChallans[8].length > 0) return validChallans[8][0];
    if (validChallans[7].length > 0) return validChallans[7][0];
    
    return 0; // Return 0 if no valid challan found
}

/**
 * Extract summary statistics from the bottom of statement
 */
function parse_summary(lines) {
    const summary = {
        "Opening Balance": 0.0,
        "Total Debit Transactions": 0,
        "Total Amount Debited": 0.0,
        "Total Credit Transactions": 0,
        "Total Amount Credited": 0.0,
        "Closing Balance": 0.0
    };
    
    const parseAmount = (str) => {
        const match = str.match(/(?:[\d,]+\.\d{2}|[\d,]+)/);
        if (match) {
            return parseFloat(match[0].replace(/,/g, ''));
        }
        return 0.0;
    };

    for (const line of lines) {
        if (/Opening balance/i.test(line)) {
            summary["Opening Balance"] = parseAmount(line);
        } else if (/Total Debit/i.test(line)) {
            // First look for count, then amount
            const matches = line.match(/(\d+)\s+[\w\s]+\s+([\d,]+\.\d{2}|[\d,]+)/);
            if (matches && matches.length >= 3) {
                summary["Total Debit Transactions"] = parseInt(matches[1], 10);
                summary["Total Amount Debited"] = parseAmount(matches[2]);
            }
        } else if (/Total Credit/i.test(line)) {
            const matches = line.match(/(\d+)\s+[\w\s]+\s+([\d,]+\.\d{2}|[\d,]+)/);
            if (matches && matches.length >= 3) {
                summary["Total Credit Transactions"] = parseInt(matches[1], 10);
                summary["Total Amount Credited"] = parseAmount(matches[2]);
            }
        } else if (/Closing balance/i.test(line)) {
            summary["Closing Balance"] = parseAmount(line);
        }
    }
    
    return summary;
}

/**
 * Main parser function to convert TXT content string to JSON
 */
function parse_txt_content_to_json(content) {
    const lines = content.split(/\r?\n/);
    
    const header = {};
    const transactions = [];
    let transaction = null;
    let table_started = false;
    let summary_lines = [];
    let in_summary_mode = false;
    
    const header_re = /^\s*([A-Za-z0-A-Za-z\s]+)\s*:\s*(.*)$/;
    const date_re = /^(\d{2}[A-Za-z]{3}\d{2})/;
    const extractAmount = (str) => parseFloat((str || "0").replace(/,/g, '')) || 0.0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/Opening balance/i.test(line) && !in_summary_mode) {
            in_summary_mode = true;
        }

        if (in_summary_mode) {
            summary_lines.push(line);
            continue;
        }

        if (!table_started) {
            const headerMatch = line.match(header_re);
            if (headerMatch) {
                const key = headerMatch[1].trim();
                const val = headerMatch[2].trim();
                // Avoid picking up transaction columns as headers
                const invalidKeys = ["DATE", "VALUE DATE", "PARTICULARS", "CHQ", "DEBIT", "CREDIT", "BALANCE"];
                if (!invalidKeys.some(k => key.toUpperCase().includes(k)) && key.length > 2) {
                    header[key] = val;
                }
            }
            if (/\|DATE/i.test(line.replace(/\s+/g, ''))) {
                table_started = true;
            }
            continue;
        }

        // Transaction parsing logic
        // Skip junk lines unless it contains a date in its columns
        const isJunk = is_junk_line(line);
        const columns = line.split('|').map(c => c.trim());
        const hasDateInCol = columns.some(c => date_re.test(c));

        if (isJunk && !hasDateInCol) {
            continue;
        }

        let dateIndex = columns.findIndex(c => date_re.test(c));

        // New transaction detection: enough columns and date found
        if (dateIndex !== -1 && columns.length >= 7) {
            if (transaction) {
                finalizeTransaction(transaction, transactions);
            }
            transaction = {
                "Date": columns[dateIndex],
                "Value Date": columns[dateIndex + 1] || "",
                "Particulars": columns[dateIndex + 2] || "",
                "Debit": extractAmount(columns[dateIndex + 4]),
                "Credit": extractAmount(columns[dateIndex + 5]),
                "Balance": extractAmount(columns[dateIndex + 6]),
                "Challan No.": 0,
                "Remarks": ""
            };
        } else if (transaction) {
            // Continuation line (accumulator)
            const parts = columns.filter(c => c !== "").join(" ");
            if (parts.length > 0) {
                transaction.Particulars += " " + parts;
            }
        }
    }

    if (transaction) {
        finalizeTransaction(transaction, transactions);
    }

    // Summary calculation
    let summary;
    if (summary_lines.length > 0) {
        summary = parse_summary(summary_lines);
    } else {
        summary = {
            "Opening Balance": 0.0,
            "Total Debit Transactions": 0,
            "Total Amount Debited": 0.0,
            "Total Credit Transactions": 0,
            "Total Amount Credited": 0.0,
            "Closing Balance": 0.0
        };
    }

    // Recalculate credit metrics manually
    if (transactions.length > 0) {
        let totalCreditCount = 0;
        let totalCreditAmount = 0.0;
        for (const tx of transactions) {
            if (tx.Credit > 0) {
                totalCreditCount++;
                totalCreditAmount += tx.Credit;
            }
        }
        summary["Total Credit Transactions"] = totalCreditCount;
        summary["Total Amount Credited"] = totalCreditAmount;
    }

    return {
        "Header": header,
        "Transactions": transactions,
        "Summary": summary
    };
}

/**
 * Main parser function to convert TXT file path to JSON
 */
function parse_txt_to_json(txt_path) {
    const content = fs.readFileSync(txt_path, 'utf8');
    return parse_txt_content_to_json(content);
}

function finalizeTransaction(tx, transactionsList) {
    tx.Particulars = clean_particulars_field(tx.Particulars);
    tx["Challan No."] = extract_challan_number(tx.Particulars);
    
    if (tx["Challan No."] > 0) {
        const prefix = tx["Challan No."].toString().substring(0, 2);
        if (extraPrefixesRemarks[prefix]) {
            tx.Remarks = extraPrefixesRemarks[prefix];
        } else if (VALID_PREFIXES.includes(prefix)) {
            tx.Remarks = "General/Standard Transaction";
        }
    }

    transactionsList.push(tx);
}

module.exports = {
    parse_txt_content_to_json,
    parse_txt_to_json,
    is_junk_line,
    clean_particulars_field,
    extract_challan_number,
    parse_summary
};

// Entry point implementation
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length >= 2) {
        const input_file = args[0];
        const output_file = args[1];
        
        try {
            console.log(`Parsing input file: ${input_file}`);
            const data = parse_txt_to_json(input_file);
            fs.writeFileSync(output_file, JSON.stringify(data, null, 4), 'utf8');
            console.log(`Successfully written output JSON to: ${output_file}`);
        } catch (error) {
            console.error(`Error parsing file: ${error.message}`);
        }
    } else {
        console.log("Usage: node txtToJsonParser.js <input.txt> <output.json>");
    }
}
