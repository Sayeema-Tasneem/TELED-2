/**
 * Emergency Animation Service
 * Provides treatment animation videos for various emergency scenarios
 */

const EMERGENCY_ANIMATIONS = {
  // CPR - Cardiopulmonary Resuscitation
  cpr: {
    id: 'cpr',
    title: 'CPR - Cardiopulmonary Resuscitation',
    description: 'Life-saving technique for cardiac arrest',
    severity: 'CRITICAL',
    // Direct YouTube watch URL for authoritative CPR guidance
    videoUrl: 'https://www.youtube.com/watch?v=BQNNOh8c8ks',
    duration: 180,
    steps: [
      'Check if person is responsive',
      'Call emergency (108)',
      'Position person on firm, flat surface',
      'Open airway gently',
      'Begin chest compressions (100-120 per minute)',
      'Give rescue breaths (2 breaths after 30 compressions)',
      'Continue until help arrives',
    ],
    dos: [
      'Push hard and fast on the center of chest',
      'Use full arm strength',
      'Maintain rhythm and don\'t stop',
    ],
    donts: [
      'Do not delay starting CPR',
      'Do not move the person unnecessarily',
      'Do not stop CPR until ambulance arrives',
    ],
    warning: 'This is emergency resuscitation. Seek professional medical training before using in real scenarios.',
  },

  // Heimlich Maneuver - Choking
  choking: {
    id: 'choking',
    title: 'Heimlich Maneuver - Choking Relief',
    description: 'Emergency procedure to remove airway blockage',
    severity: 'CRITICAL',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=HGBBu4zr8sM',
    duration: 120,
    steps: [
      'Ask person to cough if they can',
      'Stand behind the person',
      'Place fist above navel, below ribcage',
      'Grasp fist with other hand',
      'Quick upward thrusts (6-10 times)',
      'Repeat if needed',
      'Call 108 if unsuccessful',
    ],
    dos: [
      'Act immediately if person cannot breathe',
      'Use forceful upward thrusts',
      'Call emergency if unsuccessful after 1 minute',
    ],
    donts: [
      'Do not slap back while person is choking',
      'Do not put fingers in throat blindly',
      'Do not delay emergency call',
    ],
    warning: 'Severe airway obstruction is life-threatening. Call 108 immediately.',
  },

  // Severe Bleeding Control
  severeBleedingControl: {
    id: 'severe-bleeding',
    title: 'Severe Bleeding Control - Tourniquet Application',
    description: 'Stop life-threatening bleeding from limbs',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=NxO5LvgqZe0',
    duration: 240,
    steps: [
      'Call 108 immediately',
      'Position patient safely',
      'Apply direct pressure with clean cloth',
      'If arterial bleeding, apply tourniquet above wound',
      'Tourniquet 2-3 inches above the wound',
      'Tighten until bleeding stops',
      'Mark time on tourniquet',
      'Keep tourniquet above heart level',
      'Do not remove tourniquet until at hospital',
    ],
    dos: [
      'Apply pressure firmly and continuously',
      'Use sterile gauze if available',
      'Keep tourniquet visible and documented',
      'Elevate limb if possible',
    ],
    donts: [
      'Do not apply tourniquet directly on skin',
      'Do not loosen tourniquet once applied',
      'Do not ignore signs of shock',
      'Do not forget to note tourniquet time',
    ],
    warning: 'Severe bleeding can be fatal. Apply tourniquet only for life-threatening limb bleeding.',
  },

  // Burns Treatment
  burns: {
    id: 'burns',
    title: 'Burns - Immediate First Aid',
    description: 'Proper treatment for thermal burns',
      severity: 'HIGH',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=TLr2qsEhpC8',
    duration: 150,
    steps: [
      'Move away from heat source',
      'For minor burns: Run cool water for 20 minutes',
      'Remove jewelry and tight clothing',
      'Apply loose sterile dressing',
      'Give pain relief if conscious',
      'For severe burns: Call 108 immediately',
      'Do not remove stuck clothing',
      'Keep burned area clean',
    ],
    dos: [
      'Cool the burn with running water',
      'Cover with clean, dry cloth',
      'Raise burned limb if possible',
      'Give fluids if conscious and can swallow',
    ],
    donts: [
      'Do not use ice directly on skin',
      'Do not apply oils, butter, or toothpaste',
      'Do not pop blisters',
      'Do not immerse large burns in water',
    ],
    warning: 'For deep, large, or facial burns, seek emergency care immediately.',
  },

  // Snake Bite Treatment
  snakeBite: {
    id: 'snake-bite',
    title: 'Snake Bite - Emergency Response',
    description: 'First aid for snake bite victims',
      severity: 'CRITICAL',
    // Direct YouTube watch URL (St John Ambulance / regional)
    videoUrl: 'https://www.youtube.com/watch?v=lLkw4BXa7pQ',
    duration: 180,
    steps: [
      'Move away from snake to safety',
      'Keep the person calm and still',
      'Immobilize the bitten limb',
      'Keep limb below heart level if possible',
      'Remove rings and tight items',
      'Apply firm pressure above bite',
      'Call ambulance (108) immediately',
      'Do NOT cut or suck the wound',
      'Get to hospital within 30 minutes if possible',
    ],
    dos: [
      'Keep patient completely still',
      'Immobilize the bitten limb',
      'Apply pressure above the bite',
      'Get emergency help immediately',
    ],
    donts: [
      'Do not cut, suck, or squeeze the bite',
      'Do not apply ice or tourniquet',
      'Do not use chemicals',
      'Do not let patient walk around',
    ],
    warning: 'Snake bite venom can be fatal. Hospital treatment is essential. Get help immediately.',
  },

  // Shock Treatment
  shockTreatment: {
    id: 'shock',
    title: 'Shock - Emergency Response',
    description: 'Stabilize someone in medical shock',
      severity: 'CRITICAL',
    // Direct YouTube watch URL (general shock treatment guidance)
    videoUrl: 'https://www.youtube.com/watch?v=61urGQrmeNM',
    duration: 120,
    steps: [
      'Call 108 immediately',
      'Lay person flat',
      'Elevate legs 12 inches if no spinal injury',
      'Keep person warm with blankets',
      'Do not give food or drink',
      'Monitor breathing and pulse',
      'Stay with person until help arrives',
      'Reassure and keep calm',
    ],
    dos: [
      'Keep person warm and dry',
      'Monitor vital signs',
      'Keep airway open',
      'Position for recovery if unconscious',
    ],
    donts: [
      'Do not move person with spinal injury',
      'Do not give food or drink',
      'Do not leave person alone',
      'Do not apply direct heat (use blankets only)',
    ],
    warning: 'Shock is life-threatening and requires immediate medical attention.',
  },

  // Heart Attack Response
  heartAttack: {
    id: 'heart-attack',
    title: 'Heart Attack - Emergency Response',
    description: 'First aid during suspected heart attack',
      severity: 'CRITICAL',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=gDwt7dD3awc',
    duration: 150,
    steps: [
      'Call 108 immediately',
      'Have person sit or lie down',
      'Keep person calm and reassured',
      'If available, give aspirin (300mg)',
      'Loosen tight clothing',
      'If person becomes unconscious, place in recovery position',
      'Be ready to perform CPR',
      'Keep CPR going until ambulance arrives',
    ],
    dos: [
      'Call emergency immediately',
      'Have person rest in comfortable position',
      'Administer aspirin if conscious',
      'Be ready to provide CPR',
    ],
    donts: [
      'Do not delay calling emergency',
      'Do not move person unless necessary',
      'Do not give anything by mouth if unconscious',
      'Do not stop CPR once started',
    ],
    warning: 'Heart attack is life-threatening. Seek immediate medical attention.',
  },

  // Drowning Response
  drowning: {
    id: 'drowning',
    title: 'Drowning - Water Rescue & Revival',
    description: 'Emergency response for water emergencies',
      severity: 'CRITICAL',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=v1YrU55ACbE',
    duration: 180,
    steps: [
      'Call 108 immediately',
      'Ensure personal safety while rescuing',
      'Remove person from water if safe to do so',
      'Clear airway (tilt head back slightly)',
      'If not breathing, start CPR immediately',
      'Turn head to side if choking water',
      'Do not leave person alone',
      'Continue CPR until help arrives',
    ],
    dos: [
      'Get person out of water safely',
      'Start CPR if not breathing',
      'Keep person warm after rescue',
      'Position on side if recovering',
    ],
    donts: [
      'Do not enter deep water if untrained',
      'Do not delay CPR',
      'Do not leave rescued person alone',
      'Do not forget to call emergency',
    ],
    warning: 'Drowning can be silent and fatal. Immediate CPR is critical.',
  },

  // Poisoning Response
  poisoning: {
    id: 'poisoning',
    title: 'Poisoning - Emergency Response',
    description: 'First aid for chemical or substance poisoning',
      severity: 'CRITICAL',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=b2ieb8BZJuY',
    duration: 120,
    steps: [
      'Call 108 and poison helpline immediately',
      'Identify the poison if possible',
      'Move to fresh air if toxic gas',
      'If ingested, call poison center before inducing vomiting',
      'Keep sample of poison for hospital',
      'Monitor breathing and consciousness',
      'Place in recovery position if unconscious',
      'Have CPR ready if needed',
    ],
    dos: [
      'Call emergency immediately',
      'Keep poison sample for identification',
      'Monitor vital signs',
      'Follow poison center instructions',
    ],
    donts: [
      'Do not induce vomiting without guidance',
      'Do not wait for symptoms to develop',
      'Do not apply pressure to chest if swallowed corrosive',
      'Do not forget to identify the poison',
    ],
    warning: 'Poisoning can be rapidly fatal. Seek emergency help immediately.',
  },

  // Fracture Treatment
  fracture: {
    id: 'fracture',
    title: 'Fracture - Immobilization & Care',
    description: 'Proper handling of bone fractures',
      severity: 'HIGH',
    // Direct YouTube watch URL (St John Ambulance)
    videoUrl: 'https://www.youtube.com/watch?v=2v8vlXgGXwE',
    duration: 150,
    steps: [
      'Stop any bleeding with pressure',
      'Immobilize the injured area',
      'Apply ice wrapped in cloth (15 minutes)',
      'Elevate injured limb if possible',
      'For open fractures, cover wound with clean cloth',
      'Do not straighten the broken bone',
      'Call ambulance for severe fractures',
      'Apply sling or splint if trained',
    ],
    dos: [
      'Immobilize immediately',
      'Apply ice to reduce swelling',
      'Elevate to reduce bleeding',
      'Call emergency for severe fractures',
    ],
    donts: [
      'Do not move the fracture',
      'Do not apply ice directly to skin',
      'Do not attempt to straighten',
      'Do not ignore open fractures',
    ],
    warning: 'Severe fractures need medical attention. Improper handling can cause permanent damage.',
  },
};

const emergencyAnimationService = {
  /**
   * Get all emergency animations
   */
  getAllEmergencies: () => Object.values(EMERGENCY_ANIMATIONS),

  /**
   * Get specific emergency animation by ID
   */
  getEmergencyById: (id) => EMERGENCY_ANIMATIONS[id] || null,

  /**
   * Get emergencies by category
   */
  getByCategory: (category) => {
    return Object.values(EMERGENCY_ANIMATIONS).filter(e => e.id.includes(category));
  },

  /**
   * Search emergencies by title or description
   */
  search: (query) => {
    const q = query.toLowerCase();
    return Object.values(EMERGENCY_ANIMATIONS).filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    );
  },

  /**
   * Get emergency with all treatment details
   */
  getFullEmergencyGuide: (id) => {
    const emergency = EMERGENCY_ANIMATIONS[id];
    if (!emergency) return null;
    return {
      ...emergency,
      formattedSteps: emergency.steps.map((step, index) => ({
        order: index + 1,
        text: step,
      })),
    };
  },
};

export default emergencyAnimationService;
