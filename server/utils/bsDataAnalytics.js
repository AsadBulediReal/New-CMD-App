function is_bulk_payment(txn) {
    const particulars = (txn["Particulars"] || "").toString().toLowerCase();
    return particulars.includes("txn");
}

function calculate_detailed_summary(
    valid_transactions,
    invalid_transactions,
    balance_order,
    bulk_payments,
    opening_balance = "",
    closing_balance = ""
) {
    const balance_order_count = balance_order.length;
    const balance_order_amount = balance_order.reduce((sum, txn) => sum + (parseFloat(txn["Debit"]) || 0), 0);

    // Bulk Payment Stats — Credit only (debit side not tracked in summary)
    const bulk_payment_credit_txns = bulk_payments.filter(txn => (parseFloat(txn["Credit"]) || 0) > 0);
    const bulk_payment_credit_count = bulk_payment_credit_txns.length;
    const bulk_payment_credit_amount = bulk_payment_credit_txns.reduce((sum, txn) => sum + (parseFloat(txn["Credit"]) || 0), 0);

    // Reversal Stats (from invalid_transactions)
    const debit_reversal_txns = invalid_transactions.filter(txn => (parseFloat(txn["Debit"]) || 0) > 0);
    const debit_reversal_count = debit_reversal_txns.length;
    const debit_reversal_amount = debit_reversal_txns.reduce((sum, txn) => sum + (parseFloat(txn["Debit"]) || 0), 0);

    const credit_reversal_txns = invalid_transactions.filter(txn => (parseFloat(txn["Credit"]) || 0) > 0);
    const credit_reversal_count = credit_reversal_txns.length;
    const credit_reversal_amount = credit_reversal_txns.reduce((sum, txn) => sum + (parseFloat(txn["Credit"]) || 0), 0);

    // Total Debit (Balance Order + Reversals only — Bulk Payments excluded from debit summary)
    const total_debit_count = balance_order_count + debit_reversal_count;
    const total_debit_amount = balance_order_amount + debit_reversal_amount;

    const approved_credit_txns = valid_transactions.filter(txn => (parseFloat(txn["Credit"]) || 0) > 0);
    const approved_credit_count = approved_credit_txns.length;
    const approved_credit_amount = approved_credit_txns.reduce((sum, txn) => sum + (parseFloat(txn["Credit"]) || 0), 0);

    const total_credit_count = credit_reversal_count + approved_credit_count + bulk_payment_credit_count;
    const total_credit_amount = credit_reversal_amount + approved_credit_amount + bulk_payment_credit_amount;

    return {
        "Opening Balance": opening_balance || "",
        "Closing Balance": closing_balance || "",
        "Debit Transactions": {
            "Balance Order (Debit) Transactions": { "Count": balance_order_count, "Amount": balance_order_amount },
            "Debit (Reversal) Transactions":      { "Count": debit_reversal_count, "Amount": debit_reversal_amount },
            "Total Debit Transactions":            { "Count": total_debit_count,   "Amount": total_debit_amount }
        },
        "Credit Transactions": {
            "Bulk Payment (Credit) Transactions": { "Count": bulk_payment_credit_count, "Amount": bulk_payment_credit_amount },
            "Credit (Reversal) Transactions": { "Count": credit_reversal_count, "Amount": credit_reversal_amount },
            "Approved Credit Transactions": { "Count": approved_credit_count, "Amount": approved_credit_amount },
            "Total Credit Transactions": { "Count": total_credit_count, "Amount": total_credit_amount }
        }
    };
}

function generate_challan_repeat_stats(transactions) {
    // Build stats map in a single O(n) pass
    const challan_map = new Map();

    for (const txn of transactions) {
        const challan = txn["Challan No."];
        if (!challan || challan === 0 || challan === "0") continue;

        const key = String(challan);
        if (!challan_map.has(key)) {
            challan_map.set(key, { debited: 0, credited: 0, debit_amount: 0 });
        }
        const entry = challan_map.get(key);
        const debit = parseFloat(txn["Debit"]) || 0;
        const credit = parseFloat(txn["Credit"]) || 0;
        if (debit > 0) { entry.debited += 1; entry.debit_amount += debit; }
        if (credit > 0) { entry.credited += 1; }
    }

    const result = [];
    for (const [challan, entry] of challan_map.entries()) {
        if (entry.debited > 0) {
            result.push({
                "challan no.": challan,
                "challan debited": entry.debited,
                "challan credited": entry.credited,
                "Remaing Credit Challan": entry.credited - entry.debited,
                "Debit Amount": entry.debit_amount
            });
        }
    }
    return result;
}

function analyze_transactions(transactions, openingBalance, closingBalance) {
    const valid_transactions = [];
    const invalid_transactions = [];
    const balance_order = [];
    const bulk_payments = [];

    // ── FAST O(n) Reversal Detection ────────────────────────────────────────
    // Build two queues indexed by challan: one for pending debits, one for
    // pending credits. Walk the array once and match pairs immediately.
    //
    // A reversal pair is: debit txn with challan X  ↔  credit txn with challan X (no debit).
    // We mark matched indices and skip them in the classification pass.

    const pendingDebits  = new Map(); // challan -> [index, ...]
    const pendingCredits = new Map(); // challan -> [index, ...]
    const reversalSet    = new Set(); // indices of matched reversal transactions

    for (let i = 0; i < transactions.length; i++) {
        const txn = transactions[i];
        const challan = txn["Challan No."];
        if (!challan || challan === 0 || String(challan) === "0") continue;

        const key    = String(challan);
        const debit  = parseFloat(txn["Debit"])  || 0;
        const credit = parseFloat(txn["Credit"]) || 0;

        if (debit > 0 && credit === 0) {
            // Debit side — try to match a waiting credit
            if (pendingCredits.has(key) && pendingCredits.get(key).length > 0) {
                const creditIdx = pendingCredits.get(key).shift();
                reversalSet.add(i);
                reversalSet.add(creditIdx);
                invalid_transactions.push(txn, transactions[creditIdx]);
            } else {
                if (!pendingDebits.has(key)) pendingDebits.set(key, []);
                pendingDebits.get(key).push(i);
            }
        } else if (credit > 0 && debit === 0) {
            // Credit side — try to match a waiting debit
            if (pendingDebits.has(key) && pendingDebits.get(key).length > 0) {
                const debitIdx = pendingDebits.get(key).shift();
                reversalSet.add(i);
                reversalSet.add(debitIdx);
                invalid_transactions.push(transactions[debitIdx], txn);
            } else {
                if (!pendingCredits.has(key)) pendingCredits.set(key, []);
                pendingCredits.get(key).push(i);
            }
        }
    }

    // ── Classification pass (skip already-matched reversals) ────────────────
    for (let i = 0; i < transactions.length; i++) {
        if (reversalSet.has(i)) continue; // already handled as reversal

        const txn = transactions[i];
        const hasChallan = txn["Challan No."] && String(txn["Challan No."]) !== "0";
        const debit  = parseFloat(txn["Debit"])  || 0;
        const credit = parseFloat(txn["Credit"]) || 0;

        if (is_bulk_payment(txn)) {
            bulk_payments.push(txn);
        } else if (hasChallan && credit > 0 && debit === 0) {
            valid_transactions.push(txn);
        } else if (hasChallan && debit > 0 && credit === 0) {
            invalid_transactions.push(txn);
        } else if (!hasChallan && debit > 0) {
            balance_order.push(txn);
        } else {
            valid_transactions.push(txn);
        }
    }

    const calc_summary = calculate_detailed_summary(
        valid_transactions,
        invalid_transactions,
        balance_order,
        bulk_payments,
        openingBalance,
        closingBalance
    );

    const challan_repeat_stats = generate_challan_repeat_stats(transactions);

    return {
        ValidTransactions: valid_transactions,
        InvalidTransactions: invalid_transactions,
        BalanceOrder: balance_order,
        BulkPayments: bulk_payments,
        ChallanRepeatStats: challan_repeat_stats,
        Summary: calc_summary
    };
}

module.exports = { analyze_transactions };
