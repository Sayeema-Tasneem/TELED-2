(async () => {
  const svc = require('./src/services/simpleStoreService');
  const summary = await svc.getPatientDoctorHistorySummary({
    patientPhone: '6363895114',
    doctorName: 'Dr Ramesh',
    appointmentDate: '2026-04-25'
  });
  
  console.log('=== PATIENT HISTORY SUMMARY ===');
  console.log('Visits:', summary.visitCountWithDoctor);
  console.log('Last Visit:', summary.lastVisitDate);
  console.log('---');
  console.log('Symptoms found:', summary.recentSymptoms);
  console.log('Diagnoses found:', summary.recentDiagnoses);
  console.log('Medicines found:', summary.recentMedicines);
  console.log('---');
  console.log('Summary bullets:');
  summary.summaryBullets.forEach((bullet, i) => {
    console.log(`  [${i+1}] ${bullet}`);
  });
})().catch(e => { console.error(e); process.exit(1); });
