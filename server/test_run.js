const { analyze_transactions } = require("./utils/bsDataAnalytics");

// Simulate a reversal pair (Challan 123: debit + credit) and one plain debit
const mockData = [
    { "Particulars": "Transfer", "Challan No.": 123, "Debit": 100, "Credit": 0 },
    { "Particulars": "Transfer", "Challan No.": 123, "Debit": 0,   "Credit": 100 },
    { "Particulars": "Cash",     "Challan No.": 0,   "Debit": 50,  "Credit": 0 },
    { "Particulars": "TXN bulk", "Challan No.": 456, "Debit": 200, "Credit": 0 },
    { "Particulars": "Fee",      "Challan No.": 789, "Debit": 0,   "Credit": 300 },
];

console.log("Starting analysis...");
const start = Date.now();
const res = analyze_transactions(mockData, 1000, 950);
console.log("Done in", Date.now() - start, "ms");
console.log("Valid:", res.ValidTransactions.length);
console.log("Invalid (reversals):", res.InvalidTransactions.length);
console.log("Balance Order:", res.BalanceOrder.length);
console.log("Bulk Payments:", res.BulkPayments.length);
console.log("Challan Stats:", res.ChallanRepeatStats.length);
console.log("Summary Opening Balance:", res.Summary["Opening Balance"]);
