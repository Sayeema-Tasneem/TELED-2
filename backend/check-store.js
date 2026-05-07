const fs = require('fs');
const path = require('path');

const storeFile = path.join(__dirname, './data/simpleStore.json');
const data = JSON.parse(fs.readFileSync(storeFile, 'utf-8'));

console.log('=== STORE DATA ===');
console.log('Total consultations:', data.consultations.length);
console.log('Total prescriptions:', data.prescriptions.length);

if (data.consultations.length > 0) {
  console.log('\nFirst 3 consultations:');
  data.consultations.slice(0, 3).forEach((c, i) => {
    console.log(`[${i+1}]`, {
      id: c.id,
      patientPhone: c.patientPhone,
      doctorName: c.doctorName,
      date: c.date,
      reason: c.reason,
      symptoms: c.symptoms,
    });
  });
}

if (data.prescriptions.length > 0) {
  console.log('\nFirst 3 prescriptions:');
  data.prescriptions.slice(0, 3).forEach((p, i) => {
    console.log(`[${i+1}]`, {
      id: p.id,
      patientPhone: p.patientPhone,
      doctorName: p.doctorName,
      date: p.date,
      diagnosis: p.diagnosis,
      medicines: p.medicines?.length,
    });
  });
}
