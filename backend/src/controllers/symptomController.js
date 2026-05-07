/**
 * Symptom Controller - Rule-based symptom analysis endpoint
 * Provides centralized symptom suggestion logic for frontend clients
 */

const symptomCatalog = [
  { id: 'fever', label: 'Fever' },
  { id: 'cough', label: 'Cough' },
  { id: 'headache', label: 'Headache' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'bodyPain', label: 'Body Pain' },
  { id: 'soreThroat', label: 'Sore Throat' },
  { id: 'runnyNose', label: 'Runny Nose' },
  { id: 'stomachPain', label: 'Stomach Pain' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'vomiting', label: 'Vomiting' },
  { id: 'diarrhea', label: 'Diarrhea' },
  { id: 'chestPain', label: 'Chest Pain' },
  { id: 'shortnessOfBreath', label: 'Shortness of Breath' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'skinRash', label: 'Skin Rash' },
];

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
    remedies: [
      'Drink warm liquids: herbal tea, warm water with honey and lemon, ginger tea, turmeric milk',
      'Use paracetamol or ibuprofen for fever and body pain (follow package dosage)',
      'Use saline nasal drops for runny nose and congestion',
      'Gargle with warm salt water for sore throat (1/2 teaspoon salt in warm water, 3-4 times daily)',
      'Get 8-10 hours of sleep to boost immunity',
      'Eat nutritious foods: soups, broths, fruits, vegetables, dairy products',
      'Use humidifier or breathe steam from hot water to ease congestion',
    ],
    precautions: [
      'Avoid close contact with others to prevent transmission',
      'Cover your mouth when coughing or sneezing',
      'Wash hands frequently with soap and water for 20 seconds',
      'Do not smoke or expose yourself to secondhand smoke',
      'Avoid cold food, drinks and air conditioning',
      'Do not take antibiotics unless prescribed by doctor',
      'Stay away from people with weakened immunity',
      'Do not ignore persistent high fever (>38.5°C) - consult doctor',
    ],
    homeCare: [
      'Rest: Take complete bed rest for at least 3-5 days',
      'Hydration: Drink at least 3 liters of fluid daily (water, juice, soup, coconut water)',
      'Diet: Eat light and easy-to-digest food - rice, dal, khichdi, vegetables',
      'Fever management: Use cool compresses on forehead if fever is high',
      'Throat relief: Consume ice cream, popsicles, or honey to soothe throat',
      'Vitamin C: Include citrus fruits, berries, kiwi for immune boost',
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
    remedies: [
      'Steam inhalation: Breathe steam from hot water bowl for 10-15 minutes, 3-4 times daily',
      'Cough syrup: Use OTC cough suppressant for dry cough or expectorant for productive cough',
      'Lozenges: Use throat lozenges for sore throat relief (honey or eucalyptus)',
      'Antibiotics: Only if prescribed by doctor for bacterial infection',
      'Expectorants: Guaifenesin helps clear mucus from airways',
      'Chest rubs: Apply mentholated vapor rub on chest and throat',
      'Honey: Consume 1-2 teaspoons of honey to soothe cough (not for children <1 year)',
      'Ginger tea: Fresh ginger with honey helps reduce inflammation',
    ],
    precautions: [
      'Avoid smoking and secondhand smoke exposure',
      'Stay away from dust, pollution, and chemical fumes',
      'Do not go to crowded places or use public transport',
      'Wear N95 mask if you must go out',
      'Use separate towel, dishes, and utensils',
      'Avoid cold, refrigerated foods and drinks',
      'Do not skip doses of prescribed medications',
      'If breathing becomes severely difficult, seek emergency care immediately',
      'Avoid sleeping flat - use extra pillows to prop up head',
    ],
    homeCare: [
      'Rest: Take leave from work/school for 5-7 days',
      'Humidity: Use humidifier or keep steam vaporizer running at night',
      'Fluids: Drink warm water, herbal tea, warm milk, soup broths',
      'Nutrition: Eat protein-rich foods - chicken, eggs, milk, yogurt, nuts',
      'Ventilation: Ensure good air circulation but avoid cold drafts',
      'Monitoring: Check oxygen saturation if available, note any worsening',
      'Posture: Sleep with head elevated to ease breathing',
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
    remedies: [
      'Pain relievers: Take paracetamol 650mg or ibuprofen 400mg every 6 hours as needed',
      'Triptans: Consult doctor for prescription - sumatriptan for severe migraines',
      'Cold compress: Apply ice pack or cold water compress to forehead/temples for 15-20 minutes',
      'Massage: Gently massage temples, neck, and shoulders',
      'Pressure points: Apply firm pressure on the area between thumb and index finger',
      'Hydration: Drink plenty of water - dehydration often triggers headaches',
      'Caffeine: Limited caffeine (tea/coffee) may help, but avoid overdependence',
      'Rest: Take a 30-minute nap in dark room if possible',
    ],
    precautions: [
      'Maintain regular sleep schedule - go to bed and wake at same time daily',
      'Avoid skipping meals - eat at regular intervals',
      'Limit caffeine and alcohol intake',
      'Avoid stress triggers - practice relaxation techniques',
      'Do not use pain relievers more than 3 days per week (medication overuse headache)',
      'Avoid strong smells, loud noise, and bright lights',
      'Stay away from known trigger foods: chocolate, cheese, citrus, processed foods',
      'Exercise regularly but avoid overexertion',
      'Keep migraine diary to identify triggers',
    ],
    homeCare: [
      'Environment: Create a dark, quiet, cool room for migraine episodes',
      'Position: Lie down with head slightly elevated on pillows',
      'Massage: Have someone gently massage your neck and shoulders',
      'Breathing: Practice deep breathing exercises - slow, deep breaths',
      'Stretching: Gentle neck stretches to release tension (not during acute migraine)',
      'Yoga: Try yoga poses like child pose and downward dog for tension relief',
      'Meditation: 10 minutes of meditation or mindfulness daily',
      'Heat therapy: Use warm compress for tension-type headaches (opposite of cold)',
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
    remedies: [
      'ORS (Oral Rehydration Solution): Mix 1 liter water + 6 teaspoons sugar + 1/2 teaspoon salt - drink regularly',
      'Electrolyte drinks: Coconut water, buttermilk, diluted fruit juices',
      'Antacids: Antacid tablets or suspensions to reduce stomach acidity',
      'Anti-emetics: Ondansetron or metoclopramide for vomiting (prescription required)',
      'Anti-diarrheal: Loperamide (only if no blood in stool) - not for children',
      'Probiotics: Yogurt with live cultures or probiotic supplements',
      'Ginger: Fresh ginger tea or ginger candies for nausea',
      'Turmeric milk: Turmeric with black pepper and milk for inflammation',
      'Bland foods: Bananas, rice, applesauce, toast, boiled vegetables (BRAT diet)',
    ],
    precautions: [
      'Avoid all oily, spicy, fried, and fatty foods during recovery',
      'Do not consume dairy except yogurt (unless lactose intolerant)',
      'Avoid raw vegetables, fruits, and salads temporarily',
      'Do not eat heavy or high-fiber foods',
      'Avoid caffeine, alcohol, and smoking',
      'Wash hands before eating and after using bathroom',
      'Do not share food, water, or utensils with others',
      'Keep food covered and protected from insects',
      'Drink only boiled/filtered water or ORS',
      'If diarrhea continues >3 days or has blood, seek medical help immediately',
    ],
    homeCare: [
      'Rest: Avoid strenuous activity for 2-3 days',
      'Fluid intake: Drink small amounts of ORS frequently (every 30 minutes) instead of large quantities',
      'Gradual diet: Start with clear liquids, then bland foods, then normal diet over 3-4 days',
      'Keep warm: Wear comfortable clothing and keep abdomen warm',
      'Heating pad: Use warm heating pad on abdomen for pain relief',
      'Posture: Sit upright after meals to aid digestion',
      'Monitor: Track fluid intake and output, note color of stool',
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
    remedies: [
      'EMERGENCY: Call ambulance (102 in India) immediately if experiencing chest pain or difficulty breathing',
      'Aspirin: Chew 300-325mg aspirin immediately (if not allergic) - only as first aid while waiting for ambulance',
      'Nitroglycerin: Use prescribed sublingual tablet if you have history of angina',
      'Oxygen: Request oxygen support from paramedics or at hospital',
      'Monitor vitals: Check blood pressure, heart rate, oxygen saturation regularly',
      'ECG: Undergo ECG at hospital for diagnosis',
      'Troponin test: Blood test to check for heart damage',
    ],
    precautions: [
      'URGENT: Do not delay - every minute is critical in cardiac emergencies',
      'Do not drive yourself to hospital - call ambulance',
      'Do not exercise or exert yourself until cleared by cardiologist',
      'Stop smoking completely - critical for heart health',
      'Limit salt intake - follow low-sodium diet',
      'Avoid stress and anxiety triggers',
      'Take all prescribed cardiac medications regularly',
      'Monitor blood pressure and weight daily',
      'Follow up with cardiologist for regular check-ups',
      'Learn CPR and first aid if not already trained',
    ],
    homeCare: [
      'Recovery: Follow doctor\'s advice strictly for post-acute phase',
      'Activity: Gradually increase physical activity under medical supervision',
      'Diet: Low-salt, low-fat, high-fiber diet with heart-healthy foods',
      'Stress management: Meditation, yoga, counseling as recommended',
      'Medications: Take all prescribed medicines on time without missing',
      'Sleep: Get 7-8 hours of quality sleep daily',
      'Support: Keep family informed and maintain emotional support',
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
    remedies: [
      'Antihistamines: Cetirizine 10mg or loratadine 10mg once daily for allergic reactions',
      'Topical creams: Calamine lotion or hydrocortisone 1% cream for itching (2-3 times daily)',
      'Moisturizers: Apply fragrance-free moisturizer on clean, damp skin',
      'Oatmeal bath: Add colloidal oatmeal to lukewarm bath water for 15-20 minutes',
      'Cold compress: Apply cold, damp cloth to affected areas for 10-15 minutes',
      'Neem paste: Mix neem powder with coconut oil and apply on rash',
      'Turmeric paste: Mix turmeric powder with raw honey for anti-inflammatory effect',
      'Antibiotic cream: Only if rash shows signs of infection (pus, warmth, swelling)',
    ],
    precautions: [
      'Avoid scratching the rash - it can lead to infection',
      'Identify and avoid known allergens (food, pollen, animal, dust)',
      'Use hypoallergenic and fragrance-free soaps and lotions',
      'Avoid harsh chemicals - wear gloves when cleaning',
      'Keep area clean and dry - moisture promotes infection',
      'Do not wear tight or synthetic clothing - choose cotton',
      'Avoid extreme temperatures and excessive sweating',
      'Do not apply cosmetics or creams on rash without doctor approval',
      'If rash spreads rapidly or causes difficulty breathing, seek emergency help',
      'Change bed sheets and towels frequently',
    ],
    homeCare: [
      'Bathing: Use lukewarm water (not hot), limit duration to 5-10 minutes',
      'Drying: Pat dry gently, do not rub skin',
      'Hydration: Drink plenty of water to flush out allergens',
      'Diet: Avoid common allergen foods - nuts, shellfish, eggs, dairy if suspicious',
      'Clothing: Wear loose, soft cotton clothes instead of synthetic',
      'Room: Keep room dust-free with air purifier if available',
      'Laundry: Wash bedding in hypoallergenic detergent weekly',
      'Humidity: Use humidifier to prevent skin from drying out',
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
  return requiredAny.filter((symptom) => selectedSymptoms.includes(symptom)).length;
};

const getTopRule = (selectedSymptoms) => {
  const applicableRules = conditionRules
    .map((rule) => {
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
  return emergencySymptoms.some((symptom) => selectedSymptoms.includes(symptom));
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
  remedies: [
    'Rest: Get adequate sleep (7-8 hours) to allow body to recover',
    'Hydration: Drink at least 3 liters of water daily',
    'Over-the-counter painkillers: Paracetamol 650mg or ibuprofen 400mg as needed',
    'Warm compress: Use for body pain relief',
    'Avoid stress: Practice relaxation and deep breathing',
  ],
  precautions: [
    'Do not self-medicate with antibiotics or strong drugs',
    'Avoid crowded places to prevent spreading to others',
    'Maintain basic hygiene - wash hands frequently',
    'Do not ignore worsening symptoms',
    'Seek medical help if symptoms persist beyond 3 days',
  ],
  homeCare: [
    'Rest: Take it easy and avoid strenuous activity',
    'Environment: Keep room clean, well-ventilated, and at comfortable temperature',
    'Diet: Eat healthy, nutritious foods when able',
    'Hydration: Keep fluid intake consistent throughout the day',
    'Monitoring: Keep track of any changes in symptoms',
  ],
});

const analyzeSymptoms = (selectedSymptoms = []) => {
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
        remedies: topRule.remedies,
        precautions: topRule.precautions,
        homeCare: topRule.homeCare,
      }
    : buildFallbackAnalysis(uniqueSymptoms);

  const severity = emergencyFlag ? 'urgent' : finalAnalysis.severity;

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
    remedies: finalAnalysis.remedies,
    precautions: finalAnalysis.precautions,
    homeCare: finalAnalysis.homeCare,
    warning:
      severity === 'urgent'
        ? 'This may require urgent medical attention. If severe, use emergency help immediately.'
        : null,
    disclaimer:
      'This is a rule-based suggestion, not a final diagnosis. Please consult a qualified doctor.',
  };
};

module.exports = {
  /**
   * GET /api/symptoms/catalog
   * Return available symptoms from backend catalog
   */
  getSymptomCatalog: (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        symptoms: symptomCatalog,
        count: symptomCatalog.length,
      });
    } catch (error) {
      console.error('Error getting symptom catalog:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch symptom catalog',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/symptoms/analyze
   * Analyze selected symptoms and return recommendation
   */
  analyze: (req, res) => {
    try {
      const { symptoms } = req.body;

      if (!Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'symptoms array is required and must contain at least one item',
        });
      }

      const validSymptomIds = new Set(symptomCatalog.map((item) => item.id));
      const invalidSymptoms = symptoms.filter((symptom) => !validSymptomIds.has(symptom));

      if (invalidSymptoms.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid symptom IDs provided',
          invalidSymptoms,
        });
      }

      const analysis = analyzeSymptoms(symptoms);

      return res.status(200).json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to analyze symptoms',
        error: error.message,
      });
    }
  },
};
