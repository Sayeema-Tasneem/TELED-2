// Mock doctor database
// In production, this would be in Firebase Firestore

const doctorsDatabase = [
  {
    id: 'doc_001',
    name: 'Dr. Rajesh Singh',
    specialization: 'General Physician',
    qualification: 'MBBS, MD',
    experience: 12,
    hospital: 'City General Hospital',
    rating: 4.8,
    reviews: 156,
    consultationFee: 500,
    image: '👨‍⚕️',
    about: 'Experienced general physician with 12 years of practice in rural healthcare.',
    languages: ['English', 'Hindi', 'Punjabi'],
    availableSlots: {
      '2024-03-07': [
        { time: '09:00 AM', available: true },
        { time: '09:30 AM', available: true },
        { time: '10:00 AM', available: false },
        { time: '10:30 AM', available: true },
        { time: '11:00 AM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: false },
        { time: '03:00 PM', available: true },
        { time: '03:30 PM', available: true },
        { time: '04:00 PM', available: true },
      ],
      '2024-03-08': [
        { time: '09:00 AM', available: true },
        { time: '09:30 AM', available: true },
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: false },
        { time: '11:00 AM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: true },
        { time: '03:30 PM', available: false },
        { time: '04:00 PM', available: true },
      ],
    },
    consultationType: ['In-Person', 'Video Call', 'Audio Call'],
  },
  {
    id: 'doc_002',
    name: 'Dr. Priya Sharma',
    specialization: 'Pediatrician',
    qualification: 'MBBS, DCH',
    experience: 8,
    hospital: 'Rural Health Centre',
    rating: 4.6,
    reviews: 98,
    consultationFee: 400,
    image: '👩‍⚕️',
    about: 'Specialized in child healthcare and preventive medicine for rural communities.',
    languages: ['English', 'Hindi', 'Kannada'],
    availableSlots: {
      '2024-03-07': [
        { time: '09:30 AM', available: true },
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: true },
        { time: '11:00 AM', available: false },
        { time: '11:30 AM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: true },
        { time: '03:30 PM', available: true },
        { time: '04:00 PM', available: true },
        { time: '04:30 PM', available: false },
      ],
      '2024-03-08': [
        { time: '09:00 AM', available: false },
        { time: '09:30 AM', available: true },
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: true },
        { time: '11:00 AM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: false },
        { time: '03:30 PM', available: true },
        { time: '04:00 PM', available: true },
      ],
    },
    consultationType: ['In-Person', 'Video Call'],
  },
  {
    id: 'doc_003',
    name: 'Dr. Arun Kumar',
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD Cardiology',
    experience: 15,
    hospital: 'Apollo Medical Centre',
    rating: 4.9,
    reviews: 234,
    consultationFee: 800,
    image: '👨‍⚕️',
    about: 'Expert cardiologist with extensive experience in cardiac care and prevention.',
    languages: ['English', 'Hindi', 'Tamil', 'Telugu'],
    availableSlots: {
      '2024-03-07': [
        { time: '08:30 AM', available: true },
        { time: '09:00 AM', available: true },
        { time: '09:30 AM', available: false },
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: true },
        { time: '01:30 PM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: false },
        { time: '03:30 PM', available: true },
      ],
      '2024-03-08': [
        { time: '08:30 AM', available: true },
        { time: '09:00 AM', available: true },
        { time: '09:30 AM', available: true },
        { time: '10:00 AM', available: false },
        { time: '10:30 AM', available: true },
        { time: '01:30 PM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: true },
        { time: '03:30 PM', available: true },
      ],
    },
    consultationType: ['In-Person', 'Video Call', 'Audio Call'],
  },
  {
    id: 'doc_004',
    name: 'Dr. Meera Patel',
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD Dermatology',
    experience: 10,
    hospital: 'Community Health Clinic',
    rating: 4.7,
    reviews: 142,
    consultationFee: 600,
    image: '👩‍⚕️',
    about: 'Specializes in skin conditions and cosmetic dermatology with modern treatment approaches.',
    languages: ['English', 'Hindi', 'Gujarati'],
    availableSlots: {
      '2024-03-07': [
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: true },
        { time: '11:00 AM', available: true },
        { time: '11:30 AM', available: false },
        { time: '12:00 PM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: true },
        { time: '03:30 PM', available: true },
        { time: '04:00 PM', available: true },
      ],
      '2024-03-08': [
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: false },
        { time: '11:00 AM', available: true },
        { time: '11:30 AM', available: true },
        { time: '12:00 PM', available: true },
        { time: '02:00 PM', available: true },
        { time: '02:30 PM', available: true },
        { time: '03:00 PM', available: true },
        { time: '03:30 PM', available: false },
        { time: '04:00 PM', available: true },
      ],
    },
    consultationType: ['In-Person', 'Video Call'],
  },
];

module.exports = {
  doctorsDatabase,
  
  // Get all doctors for listing
  getAllDoctors: () => {
    return doctorsDatabase.map(doc => ({
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      experience: doc.experience,
      hospital: doc.hospital,
      rating: doc.rating,
      reviews: doc.reviews,
      consultationFee: doc.consultationFee,
      image: doc.image,
    }));
  },

  // Get doctor by ID with full details
  getDoctorById: (doctorId) => {
    return doctorsDatabase.find(doc => doc.id === doctorId);
  },

  // Get available slots for a doctor on a specific date
  getAvailableSlots: (doctorId, date) => {
    const doctor = doctorsDatabase.find(doc => doc.id === doctorId);
    if (!doctor || !doctor.availableSlots[date]) {
      return [];
    }
    return doctor.availableSlots[date].filter(slot => slot.available);
  },

  // Book a slot (mark as unavailable)
  bookSlot: (doctorId, date, time) => {
    const doctor = doctorsDatabase.find(doc => doc.id === doctorId);
    if (!doctor || !doctor.availableSlots[date]) {
      return false;
    }
    
    const slot = doctor.availableSlots[date].find(s => s.time === time);
    if (slot && slot.available) {
      slot.available = false;
      return true;
    }
    return false;
  },

  // Release a slot (mark as available)
  releaseSlot: (doctorId, date, time) => {
    const doctor = doctorsDatabase.find(doc => doc.id === doctorId);
    if (!doctor || !doctor.availableSlots[date]) {
      return false;
    }
    
    const slot = doctor.availableSlots[date].find(s => s.time === time);
    if (slot && !slot.available) {
      slot.available = true;
      return true;
    }
    return false;
  },
};
