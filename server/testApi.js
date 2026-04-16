const http = require('http');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect("mongodb://localhost:27017/cmd_app");
  // Find a reasonably large file
  let file = await mongoose.connection.collection('storedfiles').findOne({ 'sheets.0.rows': { $exists: true } }, { sort: { _id: -1 } });
  
  if (!file) {
      console.log("No file");
      process.exit();
  }

  const postData = JSON.stringify({
    fileId: file._id.toString(),
    sheetName: file.sheets && file.sheets.length ? file.sheets[0].name : "",
    fieldMap: { "TYPE_CODE": "TYPE_CODE", "CHALLAN_NO": "CHALLAN_NO", "AMOUNT": "AMOUNT" },
    categories: [
      "examination_semester", "examination_semester_convocation_fee", "admission_processing_fee",
      "admission_fee", "admission_retain", "drgs_admission_processing_fee", "drgs_challan",
      "drgs_convocation_fee", "hostel_accomodation_fee_boys", "hostel_accomodation_fee_girls",
      "hostel_accomodation_fee_girls_pg", "examination_annual_certificate", "general_branch_annual",
      "examination_annual_exam_fee", "general_branch_on_campus", "examination_semester_affailated_college",
      "examination_annual_convocation_fee", "general_branch_graduate_studies", "sutc",
      "career_portal_challan", "miscellaneous_alumni_registration_fee"
    ]
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/audit-saved-file',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => { console.log(data.substring(0, 500)); process.exit(); });
  });

  req.on('error', (e) => {
    console.error(`problem: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}
test();
