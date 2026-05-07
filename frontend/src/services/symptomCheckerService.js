const symptomCatalog = [
  { id: 'fever', labelKey: 'screens.symptoms.fever', fallback: 'Fever' },
  { id: 'cough', labelKey: 'screens.symptoms.cough', fallback: 'Cough' },
  { id: 'headache', labelKey: 'screens.symptoms.headache', fallback: 'Headache' },
  { id: 'fatigue', labelKey: 'screens.symptoms.fatigue', fallback: 'Fatigue' },
  { id: 'bodyPain', labelKey: 'screens.symptoms.bodyPain', fallback: 'Body Pain' },
  { id: 'soreThroat', labelKey: 'screens.symptoms.soreThroat', fallback: 'Sore Throat' },
  { id: 'runnyNose', labelKey: 'screens.symptoms.runnyNose', fallback: 'Runny Nose' },
  { id: 'stomachPain', labelKey: 'screens.symptoms.stomachPain', fallback: 'Stomach Pain' },
  { id: 'nausea', labelKey: 'screens.symptoms.nausea', fallback: 'Nausea' },
  { id: 'vomiting', labelKey: 'screens.symptoms.vomiting', fallback: 'Vomiting' },
  { id: 'diarrhea', labelKey: 'screens.symptoms.diarrhea', fallback: 'Diarrhea' },
  { id: 'chestPain', labelKey: 'screens.symptoms.chestPain', fallback: 'Chest Pain' },
  { id: 'shortnessOfBreath', labelKey: 'screens.symptoms.shortnessOfBreath', fallback: 'Shortness of Breath' },
  { id: 'dizziness', labelKey: 'screens.symptoms.dizziness', fallback: 'Dizziness' },
  { id: 'skinRash', labelKey: 'screens.symptoms.skinRash', fallback: 'Skin Rash' },
];

const symptomTextMatchers = {
  fever: ['fever', 'temperature', 'high temp', 'bukhar', 'ಜ್ವರ'],
  cough: ['cough', 'khansi', 'ಕೆಮ್ಮು'],
  headache: ['headache', 'head pain', 'sir dard', 'ತಲೆನೋವು'],
  fatigue: ['fatigue', 'tired', 'weak', 'weakness', 'thakan', 'ಆಯಾಸ'],
  bodyPain: ['body pain', 'muscle pain', 'pain in body', 'body ache', 'ಶರೀರ ನೋವು', 'ear pain', 'ear ache', 'kan dard', 'ಕಿವಿ ನೋವು', 'tooth pain', 'toothache', 'ದಂತ ನೋವು', 'joint pain'],
  soreThroat: ['sore throat', 'throat pain', 'gale me dard', 'ಗಂಟಲು ನೋವು'],
  runnyNose: ['runny nose', 'cold', 'nose running', 'sardi', 'ಮೂಗು ನೀರು'],
  stomachPain: ['stomach pain', 'abdominal pain', 'pet dard', 'ಹೊಟ್ಟೆ ನೋವು'],
  nausea: ['nausea', 'feel like vomiting', 'vomit feeling', 'matli', 'ವಾಕರಿಕೆ'],
  vomiting: ['vomiting', 'vomit', 'ulti', 'ಓಕರಿ'],
  diarrhea: ['diarrhea', 'loose motion', 'motions', 'dast', 'ಜಲದೋಷ'],
  chestPain: ['chest pain', 'chest tightness', 'seene me dard', 'ಎದೆ ನೋವು'],
  shortnessOfBreath: ['shortness of breath', 'breathing problem', 'breathless', 'saans', 'ಉಸಿರಾಟ ತೊಂದರೆ'],
  dizziness: ['dizziness', 'giddiness', 'chakkar', 'ತಲೆಸುತ್ತು'],
  skinRash: ['skin rash', 'rash', 'itching', 'allergy', 'ಚರ್ಮದ ಹುಣ್ಣು'],
};

const specialistKeywordMap = [
  { specialist: 'ENT Specialist', keywords: ['ear', 'ear pain', 'ear ache', 'nose', 'throat', 'sinus'] },
  { specialist: 'Dentist', keywords: ['tooth', 'teeth', 'gum', 'dental'] },
  { specialist: 'Dermatologist', keywords: ['skin', 'rash', 'itch', 'allergy'] },
  { specialist: 'Ophthalmologist', keywords: ['eye', 'vision', 'blur', 'red eye'] },
  { specialist: 'Gastroenterologist', keywords: ['stomach', 'abdomen', 'gas', 'acidity', 'loose motion', 'diarrhea'] },
  { specialist: 'Orthopedic', keywords: ['joint', 'knee', 'back pain', 'neck pain', 'bone'] },
  { specialist: 'Pulmonologist', keywords: ['breath', 'chest', 'cough', 'asthma'] },
  { specialist: 'General Physician', keywords: [] },
];

const inferSpecialistFromText = (text = '') => {
  const normalized = String(text).toLowerCase();
  for (const item of specialistKeywordMap) {
    if (!item.keywords.length) continue;
    if (item.keywords.some((keyword) => normalized.includes(keyword))) {
      return item.specialist;
    }
  }
  return 'General Physician';
};

const buildTextOnlyFallbackAnalysis = (text = '') => {
  const specialist = inferSpecialistFromText(text);

  return {
    selectedSymptoms: [],
    condition: 'General Symptom Pattern',
    severity: 'low',
    severityLabel: severityLevels.low,
    confidence: 55,
    recommendedSpecialist: specialist,
    recommendation: `Consult ${specialist} for proper evaluation and treatment guidance.`,
    advice: [
      'Rest and stay hydrated.',
      'Track symptom duration and intensity.',
      'Seek immediate care if symptoms worsen suddenly.',
    ],
    warning: null,
    disclaimer:
      'This is a preliminary suggestion from text input, not a final diagnosis. Please consult a qualified doctor.',
  };
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const emergencySymptoms = ['chestPain', 'shortnessOfBreath', 'dizziness'];

const conditionRules = [
  {
    id: 'viralFlu',
    name: 'Possible Viral Fever / Flu',
    requiredAny: ['fever', 'cough', 'bodyPain', 'fatigue', 'soreThroat', 'runnyNose'],
    minMatches: 3,
    severity: 'medium',
    specialist: 'General Physician',
    score: 3,
    advice: [
      'Stay hydrated and rest well.',
      'Monitor temperature every 4-6 hours.',
      'Seek consultation if symptoms persist beyond 48 hours.',
    ],
  },
  {
    id: 'respiratoryInfection',
    name: 'Possible Respiratory Infection',
    requiredAny: ['cough', 'soreThroat', 'fever', 'shortnessOfBreath', 'fatigue'],
    minMatches: 3,
    severity: 'high',
    specialist: 'Pulmonologist',
    score: 4,
    advice: [
      'Avoid smoke and dust exposure.',
      'Use steam inhalation if comfortable.',
      'Consult a doctor soon for breathing-related symptoms.',
    ],
  },
  {
    id: 'migraineTension',
    name: 'Possible Migraine / Tension Headache',
    requiredAny: ['headache', 'nausea', 'vomiting', 'dizziness'],
    minMatches: 2,
    severity: 'medium',
    specialist: 'Neurologist',
    score: 2,
    advice: [
      'Rest in a quiet and dark environment.',
      'Stay hydrated and avoid skipping meals.',
      'Consult if headaches are frequent or severe.',
    ],
  },
  {
    id: 'gastroenteritis',
    name: 'Possible Stomach Infection / Gastric Issue',
    requiredAny: ['stomachPain', 'nausea', 'vomiting', 'diarrhea', 'fever'],
    minMatches: 2,
    severity: 'medium',
    specialist: 'Gastroenterologist',
    score: 3,
    advice: [
      'Drink oral rehydration solution (ORS).',
      'Avoid oily and spicy food temporarily.',
      'Consult doctor if vomiting/diarrhea continues.',
    ],
  },
  {
    id: 'cardiacConcern',
    name: 'Possible Cardiac Concern',
    requiredAny: ['chestPain', 'shortnessOfBreath', 'dizziness', 'fatigue'],
    minMatches: 2,
    severity: 'urgent',
    specialist: 'Cardiologist',
    score: 5,
    advice: [
      'Do not ignore chest pain or breathing difficulty.',
      'Avoid physical exertion until evaluated.',
      'Seek immediate medical help.',
    ],
  },
  {
    id: 'allergyDerm',
    name: 'Possible Allergy / Skin Condition',
    requiredAny: ['skinRash', 'runnyNose', 'soreThroat', 'cough'],
    minMatches: 2,
    severity: 'low',
    specialist: 'Dermatologist',
    score: 2,
    advice: [
      'Avoid known allergens if possible.',
      'Keep skin clean and dry.',
      'Consult if rash spreads or itching worsens.',
    ],
  },
];

const severityLevels = {
  low: 'Low',
  medium: 'Moderate',
  high: 'High',
  urgent: 'Urgent',
};

const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const specialistPriorityRank = {
  Cardiologist: 100,
  Pulmonologist: 90,
  Neurologist: 85,
  Gastroenterologist: 80,
  Dermatologist: 75,
  ENT: 70,
  GeneralPhysician: 50,
};

const inferSpecialistFromSymptoms = (selectedSymptoms = []) => {
  const symptomSet = new Set(selectedSymptoms);

  if (symptomSet.has('chestPain')) return 'Cardiologist';
  if (symptomSet.has('shortnessOfBreath')) return 'Pulmonologist';
  if (symptomSet.has('skinRash')) return 'Dermatologist';

  if (
    symptomSet.has('stomachPain')
    || symptomSet.has('diarrhea')
    || symptomSet.has('vomiting')
    || symptomSet.has('nausea')
  ) {
    return 'Gastroenterologist';
  }

  if (
    symptomSet.has('headache')
    || (symptomSet.has('dizziness') && symptomSet.has('nausea'))
  ) {
    return 'Neurologist';
  }

  if (symptomSet.has('soreThroat') || symptomSet.has('runnyNose')) {
    return 'ENT';
  }

  return 'General Physician';
};

const getMatchedCount = (selectedSymptoms, requiredAny) => {
  return requiredAny.filter(symptom => selectedSymptoms.includes(symptom)).length;
};

const getTopRule = (selectedSymptoms) => {
  const applicableRules = conditionRules
    .map(rule => {
      const matchedCount = getMatchedCount(selectedSymptoms, rule.requiredAny);

      if (matchedCount < rule.minMatches) {
        return null;
      }

      return {
        ...rule,
        matchedCount,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const rankDiff = severityRank[b.severity] - severityRank[a.severity];
      if (rankDiff !== 0) {
        return rankDiff;
      }

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const normalizedSpecialistA = String(a.specialist || '').replace(/\s+/g, '');
      const normalizedSpecialistB = String(b.specialist || '').replace(/\s+/g, '');
      const specialistDiff =
        (specialistPriorityRank[normalizedSpecialistB] || 0)
        - (specialistPriorityRank[normalizedSpecialistA] || 0);
      if (specialistDiff !== 0) {
        return specialistDiff;
      }

      return b.matchedCount - a.matchedCount;
    });

  return applicableRules[0] || null;
};

const hasEmergencySignal = (selectedSymptoms) => {
  return emergencySymptoms.some(symptom => selectedSymptoms.includes(symptom));
};

const buildFallbackAnalysis = (selectedSymptoms) => ({
  condition: 'General Symptom Pattern',
  severity: selectedSymptoms.length >= 4 ? 'medium' : 'low',
  specialist: inferSpecialistFromSymptoms(selectedSymptoms),
  confidence: selectedSymptoms.length >= 4 ? 65 : 50,
  advice: [
    'Track your symptoms for the next 24 hours.',
    'Stay hydrated and avoid self-medication.',
    'Consult a general physician for proper diagnosis.',
  ],
});

const analyzeSymptoms = (selectedSymptoms = []) => {
  if (!Array.isArray(selectedSymptoms) || selectedSymptoms.length === 0) {
    return null;
  }

  const uniqueSymptoms = [...new Set(selectedSymptoms)];
  const topRule = getTopRule(uniqueSymptoms);
  const emergencyFlag = hasEmergencySignal(uniqueSymptoms);

  const finalAnalysis = topRule
    ? {
        condition: topRule.name,
        severity: topRule.severity,
        specialist: topRule.specialist,
        confidence: Math.min(95, 50 + topRule.matchedCount * 12),
        advice: topRule.advice,
      }
    : buildFallbackAnalysis(uniqueSymptoms);

  const severity = emergencyFlag
    ? 'urgent'
    : finalAnalysis.severity;

  return {
    selectedSymptoms: uniqueSymptoms,
    condition: finalAnalysis.condition,
    severity,
    severityLabel: severityLevels[severity],
    confidence: finalAnalysis.confidence,
    recommendedSpecialist: finalAnalysis.specialist,
    recommendation:
      severity === 'urgent'
        ? 'Immediate consultation recommended.'
        : 'Doctor consultation recommended for confirmation and treatment.',
    advice: finalAnalysis.advice,
    warning:
      severity === 'urgent'
        ? 'This may require urgent medical attention. If severe, use emergency help immediately.'
        : null,
    disclaimer:
      'This is a rule-based suggestion, not a final diagnosis. Please consult a qualified doctor.',
  };
};

const symptomCheckerService = {
  symptomCatalog,
  analyzeSymptoms,
  extractSymptomsFromText: (text = '') => {
    const normalized = String(text).toLowerCase().trim();
    if (!normalized) return [];

    const detected = [];
    Object.entries(symptomTextMatchers).forEach(([symptomId, keywords]) => {
      const matchFound = keywords.some((keyword) => normalized.includes(keyword));
      if (matchFound) {
        detected.push(symptomId);
      }
    });

    return [...new Set(detected)];
  },

  analyzeSymptomsFromText: async (text = '') => {
    const detectedSymptoms = symptomCheckerService.extractSymptomsFromText(text);
    if (detectedSymptoms.length === 0) {
      return buildTextOnlyFallbackAnalysis(text);
    }

    const analysis = await symptomCheckerService.analyzeSymptomsRemote(detectedSymptoms);
    return {
      ...analysis,
      detectedSymptoms,
      originalText: text,
    };
  },

  analyzeSymptomsRemote: async (selectedSymptoms = []) => {
    if (!Array.isArray(selectedSymptoms) || selectedSymptoms.length === 0) {
      throw new Error('selectedSymptoms must contain at least one symptom');
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/symptoms/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: selectedSymptoms,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to analyze symptoms from backend');
      }

      return data.analysis;
    } catch (error) {
      console.warn('Backend symptom analysis unavailable, using local fallback:', error.message);
      return analyzeSymptoms(selectedSymptoms);
    }
  },
};

export default symptomCheckerService;