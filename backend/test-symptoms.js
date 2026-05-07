(async () => {
  const svc = require('./src/services/simpleStoreService');
  const summary = await svc.getPatientDoctorHistorySummary({
    patientPhone: '9999999999',
    doctorName: 'Dr Ramesh',
    appointmentDate: '2026-04-25'
  });
  
  console.log('=== PATIENT HISTORY SUMMARY ===');
  console.log('Visits:', summary.visitCountWithDoctor);
  console.log('Last Visit:', summary.lastVisitDate);
  console.log('---');
  console.log('Symptoms:', summary.recentSymptoms);
  console.log('Diagnoses:', summary.recentDiagnoses);
  console.log('Medicines:', summary.recentMedicines);
  console.log('---');
  summary.summaryBullets.forEach((bullet, i) => {
    console.log(`[${i+1}] ${bullet}`);
  });
})().catch(e => { console.error(e); process.exit(1); });
