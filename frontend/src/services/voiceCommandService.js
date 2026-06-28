/**
 * Voice Command Intent Extraction Service
 * Extracts symptoms, conditions, and other details from voice commands
 * For booking consultation and symptom checking with voice
 */

const SYMPTOMS_DATABASE = {
  en: {
    fever: ['fever', 'temperature', 'hot', 'burning'],
    cold: ['cold', 'cough', 'congestion', 'runny nose', 'nasal', 'sinus'],
    headache: ['headache', 'head pain', 'migraine', 'head ache'],
    bodyache: ['body ache', 'body pain', 'muscle pain', 'joints', 'joint pain', 'arthritis'],
    shivering: ['shivering', 'chills', 'shiver', 'cold sensation'],
    cough: ['cough', 'coughing', 'persistent cough', 'dry cough', 'wet cough'],
    throat: ['throat', 'sore throat', 'throat pain', 'throat ache', 'strep'],
    nausea: ['nausea', 'vomiting', 'feeling sick', 'dizzy', 'dizziness', 'vertigo'],
    diarrhea: ['diarrhea', 'loose motions', 'stomach', 'gastro', 'loose stool'],
    itching: ['itching', 'itch', 'itchy', 'rash', 'allergy', 'allergic'],
    acne: ['acne', 'pimple', 'breakout', 'skin'],
    pain: ['pain', 'ache', 'hurt', 'hurting', 'sore'],
    bleeding: ['bleeding', 'bleed', 'blood', 'hemorrhage'],
    breathless: ['breathless', 'shortness of breath', 'breathing', 'asthma', 'wheezing'],
    anxiety: ['anxiety', 'anxious', 'panic', 'stress', 'depression', 'sad', 'sadness'],
    insomnia: ['insomnia', 'sleep', 'sleepless', 'cannot sleep', 'can\'t sleep'],
    fatigue: ['fatigue', 'tired', 'tired ness', 'weakness', 'weak', 'exhausted'],
  },
  hi: {
    fever: ['बुखार', 'तापमान', 'ताप'],
    cold: ['जुकाम', 'सर्दी', 'खांसी', 'नाक', 'नाकबंद'],
    headache: ['सिरदर्द', 'सिर दर्द', 'सिर में दर्द'],
    bodyache: ['शरीर में दर्द', 'बदन दर्द', 'जोड़'],
    shivering: ['कंपकंपी', 'ठंड लगना', 'सर्दी'],
    cough: ['खांसी', 'खांसते हैं'],
    throat: ['गले में दर्द', 'गला खराब', 'गले में खराश'],
    nausea: ['चक्कर', 'उल्टी', 'मतली', 'बीमार'],
    diarrhea: ['दस्त', 'पेट ख़राब', 'पेट दर्द'],
    itching: ['खुजली', 'खुजलाहट', 'एलर्जी', 'दाने'],
    acne: ['मुंहासे', 'कील', 'पिंपल'],
    pain: ['दर्द', 'तकलीफ'],
    bleeding: ['रक्तस्राव', 'खून', 'रक्त'],
    breathless: ['साँस', 'दम', 'अस्थमा', 'साँस कि कमी'],
  },
  kn: {
    fever: ['ಜ್ವರ', 'ಉಷ್ಣತೆ', 'ಬೆಚ್ಚಗಿನ'],
    cold: ['ಶೀತ', 'ಥಳ್ಳಾಟ', 'ಕಾಸು', 'ಮೂಗು'],
    headache: ['ತಲೆನೋವು', 'ತಲೆ ನೋವು', 'ತಲೆಯ ಒಗಟು'],
    bodyache: ['ದೇಹ ನೋವು', 'ಜೋಡಿ ನೋವು', 'ಸ್ನಾಯು ನೋವು'],
    shivering: ['ನಡುಕ', 'ಥಂಡಿ', 'ಶೀತ ಸಂವೇದನೆ'],
    cough: ['ಕಾಸು', 'ತೊರೆಯುತ್ತಿದೆ'],
    throat: ['ತುತ್ತು ನೋವು', 'ತುತ್ತು ಬೇಜರು', 'ತುತ್ತು ಅಸುಖ'],
    nausea: ['ದೃಷ್ಟಿಭ್ರಮ', 'ವಾಂತಿ', 'ದೇಹವಲ್ಲ ಹೇಗೆದೆ', 'ಅನಾರೋಗ್ಯ'],
    diarrhea: ['ಸಡಿಲ', 'ಹೊಟ್ಟೆ', 'ಹೊಟ್ಟೆ ನೋವು'],
    itching: ['ಗೀರುಣೆ', 'ಕರುಳು', 'ಅಲರ್ಜಿ', 'ರಾಶ್'],
  },
};

const SPECIALTIES_FOR_SYMPTOMS = {
  fever: 'General Physician',
  cold: 'General Physician',
  headache: 'General Physician',
  bodyache: 'General Physician',
  shivering: 'General Physician',
  cough: 'General Physician',
  throat: 'ENT',
  nausea: 'Gastroenterologist',
  diarrhea: 'Gastroenterologist',
  itching: 'Dermatologist',
  acne: 'Dermatologist',
  pain: 'General Physician',
  bleeding: 'General Physician',
  breathless: 'General Physician',
  anxiety: 'Psychiatrist',
  insomnia: 'Psychiatrist',
  fatigue: 'General Physician',
};

/**
 * Extract detected symptoms from voice input
 */
export const extractSymptomsFromVoice = (voiceText, language = 'en') => {
  if (!voiceText) return [];

  const text = voiceText.toLowerCase().trim();
  const symptomsData = SYMPTOMS_DATABASE[language] || SYMPTOMS_DATABASE.en;
  const detectedSymptoms = [];

  Object.entries(symptomsData).forEach(([symptomName, keywords]) => {
    keywords.forEach((keyword) => {
      if (text.includes(keyword.toLowerCase())) {
        if (!detectedSymptoms.includes(symptomName)) {
          detectedSymptoms.push(symptomName);
        }
      }
    });
  });

  return detectedSymptoms;
};

/**
 * Get recommended doctor specialty for detected symptoms
 */
export const getRecommendedSpecialty = (symptoms) => {
  if (!symptoms || symptoms.length === 0) {
    return 'General Physician';
  }

  // Priority: use first detected symptom's specialty
  const specialties = symptoms
    .map((symptom) => SPECIALTIES_FOR_SYMPTOMS[symptom] || 'General Physician')
    .filter(Boolean);

  return specialties[0] || 'General Physician';
};

/**
 * Format symptoms for display in UI
 */
export const formatSymptomsForDisplay = (symptoms, language = 'en') => {
  if (!symptoms || symptoms.length === 0) return '';

  return symptoms
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(', ');
};

/**
 * Create a voice-based consultation request
 */
export const createVoiceConsultationRequest = (voiceText, language = 'en') => {
  const symptoms = extractSymptomsFromVoice(voiceText, language);
  const specialty = getRecommendedSpecialty(symptoms);

  return {
    symptoms,
    specialty,
    voiceDescription: voiceText,
    // Removed test-only simulated detection details (confidence randomness)
    language,
    timestamp: new Date(),
  };
};

/**
 * Create a voice-based symptom check request
 */
export const createVoiceSymptomCheckRequest = (voiceText, language = 'en') => {
  const symptoms = extractSymptomsFromVoice(voiceText, language);

  return {
    symptoms,
    voiceDescription: voiceText,
    requestType: 'voice-symptom-check',
    timestamp: new Date(),
  };
};

export default {
  extractSymptomsFromVoice,
  getRecommendedSpecialty,
  formatSymptomsForDisplay,
  createVoiceConsultationRequest,
  createVoiceSymptomCheckRequest,
};
