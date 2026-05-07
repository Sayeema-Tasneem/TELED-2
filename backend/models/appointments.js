// Mock appointments database
// In production, this would be in Firebase Firestore

let appointmentsDatabase = [
  {
    id: 'apt_001',
    userId: 'user_001',
    doctorId: 'doc_001',
    doctorName: 'Dr. Rajesh Singh',
    doctorSpecialization: 'General Physician',
    date: '2024-03-07',
    time: '09:00 AM',
    status: 'confirmed', // confirmed, completed, cancelled
    consultationType: 'In-Person',
    consultationFee: 500,
    symptoms: 'Cold and cough',
    notes: '',
    prescription: null,
    createdAt: new Date('2024-03-01'),
    cancelledAt: null,
    cancelReason: null,
  },
  {
    id: 'apt_002',
    userId: 'user_001',
    doctorId: 'doc_002',
    doctorName: 'Dr. Priya Sharma',
    doctorSpecialization: 'Pediatrician',
    date: '2024-02-28',
    time: '10:30 AM',
    status: 'completed',
    consultationType: 'Video Call',
    consultationFee: 400,
    symptoms: 'Child fever and weakness',
    notes: 'Child had viral fever. Prescribed rest and fluids.',
    prescription: {
      medicines: [
        { name: 'Paracetamol', dosage: '250mg', frequency: '4x daily', duration: '3 days' },
      ],
      advices: ['Rest', 'Drink plenty of fluids', 'Avoid cold foods'],
    },
    createdAt: new Date('2024-02-20'),
    cancelledAt: null,
    cancelReason: null,
  },
];

module.exports = {
  appointmentsDatabase,

  // Get all appointments for a user
  getUserAppointments: (userId) => {
    return appointmentsDatabase.filter(apt => apt.userId === userId);
  },

  // Get upcoming appointments for a user
  getUpcomingAppointments: (userId) => {
    const today = new Date().toISOString().split('T')[0];
    return appointmentsDatabase.filter(
      apt => apt.userId === userId && apt.date >= today && apt.status !== 'cancelled'
    );
  },

  // Get past appointments for a user
  getPastAppointments: (userId) => {
    const today = new Date().toISOString().split('T')[0];
    return appointmentsDatabase.filter(
      apt => apt.userId === userId && (apt.date < today || apt.status === 'completed')
    );
  },

  // Get appointment by ID
  getAppointmentById: (appointmentId) => {
    return appointmentsDatabase.find(apt => apt.id === appointmentId);
  },

  // Create new appointment
  createAppointment: (appointmentData) => {
    const newAppointment = {
      id: `apt_${Date.now()}`,
      ...appointmentData,
      status: 'confirmed',
      createdAt: new Date(),
      cancelledAt: null,
      cancelReason: null,
    };
    appointmentsDatabase.push(newAppointment);
    return newAppointment;
  },

  // Cancel appointment
  cancelAppointment: (appointmentId, reason) => {
    const appointment = appointmentsDatabase.find(apt => apt.id === appointmentId);
    if (appointment && appointment.status === 'confirmed') {
      appointment.status = 'cancelled';
      appointment.cancelledAt = new Date();
      appointment.cancelReason = reason;
      return true;
    }
    return false;
  },

  // Reschedule appointment
  rescheduleAppointment: (appointmentId, newDate, newTime) => {
    const appointment = appointmentsDatabase.find(apt => apt.id === appointmentId);
    if (appointment && appointment.status === 'confirmed') {
      appointment.date = newDate;
      appointment.time = newTime;
      return true;
    }
    return false;
  },

  // Mark appointment as completed
  completeAppointment: (appointmentId, prescription, notes) => {
    const appointment = appointmentsDatabase.find(apt => apt.id === appointmentId);
    if (appointment) {
      appointment.status = 'completed';
      appointment.prescription = prescription;
      appointment.notes = notes;
      return true;
    }
    return false;
  },

  // Get appointments for a doctor on a date
  getDoctorAppointmentsForDate: (doctorId, date) => {
    return appointmentsDatabase.filter(
      apt => apt.doctorId === doctorId && apt.date === date && apt.status === 'confirmed'
    );
  },
};
