/**
 * Safe float conversion handling commas and whitespace
 */
function safe_float(val) {
  if (val === null || val === undefined) return null;
  try {
    const str = String(val).replace(/,/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  } catch (e) {
    return null;
  }
}

/**
 * Get value from record using multiple possible field names
 */
function get_field_value(record, ...field_names) {
  for (const name of field_names) {
    if (name && typeof name === "string" && name in record) return record[name];
  }
  return null;
}

/**
 * Normalize challan string to avoid javascript parseInt precision drops 
 * and support alphanumeric challans.
 */
function normalize_challan(ch) {
  if (ch === null || ch === undefined || ch === "") return null;
  let str = String(ch).trim().toUpperCase();
  // Strip leading zeros for numeric values to simulate old parseInt behaviour safely
  if (/^0+\d+$/.test(str)) {
    str = str.replace(/^0+/, "");
  }
  return str !== "" ? str : null;
}

/**
 * Extract actual challan number from MIS remarks if available
 */
function extract_actual_challan_from_mis(remarks, original_challan_no) {
  if (!remarks) return null;
  const parts = String(remarks).trim().split(/\s+/);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.length > 3) { // usually alternative challans are decent length
      const actual = normalize_challan(lastPart);
      const orig = normalize_challan(original_challan_no);
      if (actual && orig && actual !== orig) {
        return actual;
      }
    }
  }
  return null;
}

/**
 * Calculate total amount from records
 */
function total_amount(records, amount_fields) {
  let total = 0;
  for (const rec of records) {
    const amt = safe_float(get_field_value(rec, ...amount_fields));
    if (amt !== null) total += amt;
  }
  return total;
}

/**
 * Core reconciliation logic
 */
function reconcile_bs_vs_mis(bsTransactions, misData, bsMapping, misMapping) {
  const mis_challans = {};
  const mis_data_stored = [...misData];

  // 1. Build MIS lookup dictionary
  mis_data_stored.forEach((record, index) => {
    record._record_id = index;
    
    // Use mapped names if provided, otherwise fallback to defaults in blueprint
    const raw_challan = get_field_value(record, misMapping["Challan No."], "CHALLAN_NO", "Challan No.", "consumer no");
    const challan_no = normalize_challan(raw_challan);
    const amount = safe_float(get_field_value(record, misMapping["Amount"], "PAID_AMOUNT", "Amount", "amount", "AMOUNT"));
    const remarks = get_field_value(record, misMapping["Remarks"], "Remarks", "REMARKS");

    if (challan_no && amount !== null) {
      const key = `${challan_no}_${amount.toFixed(2)}`;
      if (!mis_challans[key]) mis_challans[key] = [];
      mis_challans[key].push(record);

      // Check for alternative challan in remarks
      const actual_c_no = extract_actual_challan_from_mis(remarks, challan_no);
      if (actual_c_no) {
        record["Actual Challan Used"] = actual_c_no;
        const alt_key = `${actual_c_no}_${amount.toFixed(2)}`;
        if (!mis_challans[alt_key]) mis_challans[alt_key] = [];
        
        // Avoid duplicate entry of same record ID under same key if possible
        if (!mis_challans[alt_key].some(r => r._record_id === index)) {
          mis_challans[alt_key].push(record);
        }
      }
    }
  });

  // 2. Match BS against MIS
  const verified_mis = [];
  const not_verified_bs = [];
  const matched_mis_ids = new Set();

  bsTransactions.forEach(bs_rec => {
    const raw_challan = get_field_value(bs_rec, bsMapping["Challan No."], "Challan No.", "consumer no", "CHALLAN_NO");
    const challan_no = normalize_challan(raw_challan);
    const amount = safe_float(get_field_value(bs_rec, bsMapping["Amount"], "Credit", "Amount", "amount", "AMOUNT"));

    if (challan_no && amount !== null) {
      const key = `${challan_no}_${amount.toFixed(2)}`;
      if (mis_challans[key]) {
        let matched = false;
        for (const mis_rec of mis_challans[key]) {
          if (!matched_mis_ids.has(mis_rec._record_id)) {
            verified_mis.push(mis_rec);
            matched_mis_ids.add(mis_rec._record_id);
            matched = true;
            break; // One MIS record per BS record (assuming 1-to-1 matching for simple reconciliation)
          }
        }
        if (!matched) {
          not_verified_bs.push(bs_rec);
        }
      } else {
        not_verified_bs.push(bs_rec);
      }
    } else {
      not_verified_bs.push(bs_rec);
    }
  });

  // 3. Find Unmatched MIS
  const not_verified_mis = mis_data_stored.filter(rec => !matched_mis_ids.has(rec._record_id));

  // 4. Generate Summary
  const summary = {
    verified_mis_count: verified_mis.length,
    not_verified_bs_count: not_verified_bs.length,
    not_verified_mis_count: not_verified_mis.length,
    
    verified_total_amount: total_amount(verified_mis, [misMapping["Amount"], "PAID_AMOUNT", "Amount", "amount", "AMOUNT"]),
    unverified_bs_total: total_amount(not_verified_bs, [bsMapping["Amount"], "Credit", "Amount", "amount", "AMOUNT"]),
    unverified_mis_total: total_amount(not_verified_mis, [misMapping["Amount"], "PAID_AMOUNT", "Amount", "amount", "AMOUNT"]),
  };

  return {
    verified_mis,
    not_verified_bs,
    not_verified_mis,
    summary
  };
}

module.exports = {
  reconcile_bs_vs_mis
};
