const auditCategories = {
  "10": "examination_semester",
  "11": "examination_semester_convocation_fee",
  "20": "admission_processing_fee",
  "21": "admission_fee",
  "22": "admission_retain",
  "30": "drgs_admission_processing_fee",
  "31": "drgs_challan",
  "32": "drgs_convocation_fee",
  "40": "hostel_accomodation_fee_boys",
  "41": "hostel_accomodation_fee_girls",
  "43": "hostel_accomodation_fee_girls_pg",
  "50": "examination_annual_certificate",
  "51": "general_branch_annual",
  "52": "examination_annual_exam_fee",
  "53": "general_branch_on_campus",
  "54": "examination_semester_affailated_college",
  "55": "examination_annual_convocation_fee",
  "56": "general_branch_graduate_studies",
  "61": "sutc",
  "62": "career_portal_challan",
  "70": "miscellaneous_alumni_registration_fee"
};

/**
 * Categorize and audit transactions based on their TYPE_CODE prefix.
 * @param {Array<Object>} transactions - The mapped rows
 * @param {Array<string>} selectedCategories - Allowed categories. If empty array, all are allowed.
 * @param {string} validationMode - strict, type_code, challan_no
 * @returns {Object} { categoryData, nullData, mismatchedData, summaryRows }
 */
function audit_transactions(transactions, selectedCategories = [], validationMode = "strict") {
  const categoryData = {};
  const nullData = [];
  let nullDataAmount = 0;
  const summaryMap = {}; // { categoryName: { count, totalAmount } }

  // Initialize summary map and arrays
  const categoriesToProcess = selectedCategories.length > 0 
    ? selectedCategories 
    : Object.values(auditCategories);

  categoriesToProcess.forEach(cat => {
    categoryData[cat] = [];
    summaryMap[cat] = { count: 0, totalAmount: 0 };
  });

  transactions.forEach(row => {
    const typeCode = String(row["TYPE_CODE"] || "").trim();
    const challanNo = String(row["CHALLAN_NO"] || "").trim();
    const amountRaw = row["AMOUNT"];
    let amount = 0;
    
    // Parse amount strictly
    if (typeof amountRaw === "number") {
      amount = amountRaw;
    } else if (typeof amountRaw === "string") {
      const parsed = parseFloat(amountRaw.replace(/,/g, ''));
      if (!isNaN(parsed)) amount = parsed;
    }

    const typeCodePrefix = typeCode.substring(0, 2);
    const challanPrefix = challanNo.substring(0, 2);

    row["Prefix Match (First 2 Chars)"] = (typeCodePrefix === challanPrefix && typeCodePrefix !== "") ? "Yes" : "No";
    row["Exact Number Match"] = (typeCode === challanNo && typeCode !== "") ? "Yes" : "No";

    let prefixToUse = "";
    let isMismatched = false;

    // Detect if they both have prefixes but disagree
    if (validationMode === "strict") {
        if (typeCodePrefix && challanPrefix) {
            if (typeCodePrefix !== challanPrefix) {
                isMismatched = true;
            } else {
                prefixToUse = typeCodePrefix;
            }
        } else if (typeCodePrefix) {
            prefixToUse = typeCodePrefix;
        } else if (challanPrefix) {
            prefixToUse = challanPrefix;
        }
    } else if (validationMode === "type_code") {
        prefixToUse = typeCodePrefix;
    } else if (validationMode === "challan_no") {
        prefixToUse = challanPrefix;
    }

    // Strict Correctness Check
    if (isMismatched || !auditCategories[prefixToUse]) {
        if (validationMode === "strict" && isMismatched) {
            row["Audit Reason"] = "Mismatched TYPE_CODE / CHALLAN_NO";
        } else {
            row["Audit Reason"] = "Invalid/Missing Category Prefix";
        }
        nullData.push(row);
        nullDataAmount += amount;
        return; // skip further categorization
    }

    const categoryName = auditCategories[prefixToUse];


    if (categoryName && categoriesToProcess.includes(categoryName)) {
      categoryData[categoryName].push(row);
      summaryMap[categoryName].count += 1;
      summaryMap[categoryName].totalAmount += amount;
    } else {
      nullData.push(row);
      nullDataAmount += amount;
    }
  });

  // Build the summary rows
  const summaryRows = [];
  let totalRecords = 0;
  let totalAmountRaw = 0;

  categoriesToProcess.forEach(cat => {
    totalRecords += summaryMap[cat].count;
    totalAmountRaw += summaryMap[cat].totalAmount;

    summaryRows.push({
      "Category": cat,
      "Records Count": summaryMap[cat].count,
      "Total Amount": summaryMap[cat].totalAmount.toFixed(2)
    });
  });

  totalRecords += nullData.length;
  totalAmountRaw += nullDataAmount;

  summaryRows.push({
    "Category": "nullData (Uncategorized)",
    "Records Count": nullData.length,
    "Total Amount": nullDataAmount.toFixed(2)
  });

  summaryRows.push({
    "Category": "GRAND TOTAL",
    "Records Count": totalRecords,
    "Total Amount": totalAmountRaw.toFixed(2)
  });

  return {
    categoryData,
    nullData,
    summaryRows
  };
}

module.exports = {
  auditCategories,
  audit_transactions
};
