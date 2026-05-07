/**
 * Medicine Model - Medicine schedule and intake tracking
 * Manages user medications with dosage, timing, and reminders
 */

let medicines = {
  // Medicine ID -> Medicine object mapping
};

let intakeLogs = [
  // Medical intake history
];

const toDateOnly = (dateValue) => {
  const d = new Date(dateValue);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (dateString, days) => {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
};

const isMedicineInCourseWindow = (medicine, targetDate = toDateOnly(new Date())) => {
  const startDate = medicine.startDate || targetDate;
  if (targetDate < startDate) return false;

  if (medicine.endDate && targetDate > medicine.endDate) return false;

  if (medicine.daysToTake === 'alternate') {
    const start = new Date(`${startDate}T00:00:00`);
    const target = new Date(`${targetDate}T00:00:00`);
    const dayDiff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    return dayDiff % 2 === 0;
  }

  if (Array.isArray(medicine.specificDays) && medicine.specificDays.length > 0) {
    const target = new Date(`${targetDate}T00:00:00`);
    const weekday = target.toLocaleDateString('en-US', { weekday: 'long' });
    return medicine.specificDays.includes(weekday);
  }

  return true;
};

// Generate unique medicine ID
const generateMedicineId = () => {
  return `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  // Add a new medicine
  addMedicine: (userId, medicineData) => {
    const medicineId = generateMedicineId();
    const parsedDurationDays = parseInt(medicineData.durationDays, 10);
    const resolvedStartDate = medicineData.startDate || toDateOnly(new Date());
    const resolvedEndDate = medicineData.endDate
      || (Number.isFinite(parsedDurationDays) && parsedDurationDays > 0
        ? addDays(resolvedStartDate, parsedDurationDays - 1)
        : null);

    const newMedicine = {
      id: medicineId,
      userId,
      name: medicineData.name,
      dosage: medicineData.dosage, // e.g., "1 tablet", "5ml"
      frequency: medicineData.frequency, // e.g., "Once daily", "Twice daily"
      times: medicineData.times, // Array of times like ["08:00", "14:00"]
      tabletsPerDose: parseFloat(medicineData.tabletsPerDose) || null,
      timesPerDay: parseInt(medicineData.timesPerDay, 10) || (Array.isArray(medicineData.times) ? medicineData.times.length : 1),
      instructions: medicineData.instructions || '',
      startDate: resolvedStartDate,
      endDate: resolvedEndDate, // null = indefinite
      durationDays: Number.isFinite(parsedDurationDays) && parsedDurationDays > 0
        ? parsedDurationDays
        : null,
      daysToTake: medicineData.daysToTake || 'daily', // 'daily', 'alternate', or specific days
      specificDays: medicineData.specificDays || [], // e.g., ['Monday', 'Wednesday']
      purpose: medicineData.purpose || '', // Why taking this medicine
      sideEffects: medicineData.sideEffects || '',
      prescribedBy: medicineData.prescribedBy || '',
      status: 'active', // 'active', 'paused', 'completed'
      intakeDates: [], // Array of dates when medicine was taken
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    medicines[medicineId] = newMedicine;
    return newMedicine;
  },

  // Get medicine by ID
  getMedicineById: (medicineId) => {
    return medicines[medicineId] || null;
  },

  // Get all medicines for a user
  getUserMedicines: (userId) => {
    return Object.values(medicines)
      .filter((med) => med.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Get active medicines for a user
  getUserActiveMedicines: (userId) => {
    const today = toDateOnly(new Date());
    return Object.values(medicines)
      .filter((med) => med.userId === userId && med.status === 'active')
      .filter((med) => isMedicineInCourseWindow(med, today))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Update medicine details
  updateMedicine: (medicineId, updateData) => {
    if (medicines[medicineId]) {
      medicines[medicineId] = {
        ...medicines[medicineId],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      return medicines[medicineId];
    }
    return null;
  },

  // Record medicine intake
  recordIntake: (medicineId, date, time) => {
    const medicine = medicines[medicineId];
    if (!medicine) return null;

    // Check if already logged
    const logIndex = medicine.intakeDates.findIndex((entry) => entry.date === date);
    
    if (logIndex === -1) {
      // New date entry
      medicine.intakeDates.push({
        date,
        times: [time],
        notes: '',
      });
    } else {
      // Add to existing date
      if (!medicine.intakeDates[logIndex].times.includes(time)) {
        medicine.intakeDates[logIndex].times.push(time);
      }
    }

    // Add to global log
    intakeLogs.push({
      medicineId,
      date,
      time,
      timestamp: new Date().toISOString(),
    });

    return medicine;
  },

  // Mark as taken for a specific time
  markAsTaken: (medicineId, date, scheduledTime) => {
    const medicine = medicines[medicineId];
    if (!medicine) return null;

    const dateEntry = medicine.intakeDates.find((entry) => entry.date === date);
    if (!dateEntry) {
      medicine.intakeDates.push({
        date,
        times: [scheduledTime],
        notes: '',
        takenAt: new Date().toISOString(),
      });
    } else if (!dateEntry.times.includes(scheduledTime)) {
      dateEntry.times.push(scheduledTime);
      dateEntry.takenAt = new Date().toISOString();
    }

    return medicine;
  },

  // Check if medicine was taken at a specific time
  isTakenAtTime: (medicineId, date, scheduledTime) => {
    const medicine = medicines[medicineId];
    if (!medicine) return false;

    const dateEntry = medicine.intakeDates.find((entry) => entry.date === date);
    return dateEntry && dateEntry.times.includes(scheduledTime);
  },

  // Pause medicine
  pauseMedicine: (medicineId) => {
    if (medicines[medicineId]) {
      medicines[medicineId].status = 'paused';
      medicines[medicineId].updatedAt = new Date().toISOString();
      return medicines[medicineId];
    }
    return null;
  },

  // Resume medicine
  resumeMedicine: (medicineId) => {
    if (medicines[medicineId]) {
      medicines[medicineId].status = 'active';
      medicines[medicineId].updatedAt = new Date().toISOString();
      return medicines[medicineId];
    }
    return null;
  },

  // Complete medicine course
  completeMedicine: (medicineId) => {
    if (medicines[medicineId]) {
      medicines[medicineId].status = 'completed';
      medicines[medicineId].endDate = new Date().toISOString().split('T')[0];
      medicines[medicineId].updatedAt = new Date().toISOString();
      return medicines[medicineId];
    }
    return null;
  },

  // Delete medicine
  deleteMedicine: (medicineId) => {
    const medicine = medicines[medicineId];
    if (medicine) {
      delete medicines[medicineId];
      return medicine;
    }
    return null;
  },

  // Get medicine statistics for user
  getMedicineStatistics: (userId) => {
    const userMedicines = Object.values(medicines).filter((med) => med.userId === userId);
    
    const activeMedicines = userMedicines.filter((med) => med.status === 'active');
    const completedMedicines = userMedicines.filter((med) => med.status === 'completed');
    const pausedMedicines = userMedicines.filter((med) => med.status === 'paused');

    // Calculate adherence
    let totalMedicines = 0;
    let totalIntakes = 0;

    userMedicines.forEach((med) => {
      totalMedicines += med.times.length;
      totalIntakes += med.intakeDates.reduce((sum, entry) => sum + entry.times.length, 0);
    });

    const adherenceRate =
      totalMedicines > 0 ? Math.round((totalIntakes / totalMedicines) * 100) : 0;

    return {
      totalMedicines: userMedicines.length,
      activeMedicines: activeMedicines.length,
      completedMedicines: completedMedicines.length,
      pausedMedicines: pausedMedicines.length,
      totalIntakes,
      adherenceRate, // Percentage of doses taken
      averageIntakesPerDay: totalMedicines > 0 ? (totalIntakes / userMedicines.length).toFixed(1) : 0,
    };
  },

  // Get intake history
  getIntakeHistory: (medicineId, days = 30) => {
    const medicine = medicines[medicineId];
    if (!medicine) return null;

    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    const history = medicine.intakeDates.filter((entry) => {
      const date = new Date(entry.date);
      return date >= startDate && date <= today;
    });

    return {
      medicineId,
      medicineName: medicine.name,
      period: `Last ${days} days`,
      intakeRecords: history,
      totalDosesTaken: history.reduce((sum, entry) => sum + entry.times.length, 0),
      averageIntakesPerDay: (
        history.reduce((sum, entry) => sum + entry.times.length, 0) / days
      ).toFixed(1),
    };
  },

  // Get today's medicines
  getTodaysMedicines: (userId, date = new Date().toISOString().split('T')[0]) => {
    const userMedicines = Object.values(medicines).filter(
      (med) => med.userId === userId
        && med.status === 'active'
        && isMedicineInCourseWindow(med, date)
    );

    const todayMedicines = userMedicines.map((med) => {
      const dateEntry = med.intakeDates.find((entry) => entry.date === date);
      return {
        ...med,
        scheduledTimes: med.times,
        takenTimes: dateEntry?.times || [],
        notes: dateEntry?.notes || '',
      };
    });

    return todayMedicines;
  },

  // Add note to intake
  addIntakeNote: (medicineId, date, note) => {
    const medicine = medicines[medicineId];
    if (!medicine) return null;

    const dateEntry = medicine.intakeDates.find((entry) => entry.date === date);
    if (dateEntry) {
      dateEntry.notes = note;
    }

    return medicine;
  },

  // Clear all medicine data (for testing)
  clearAllMedicines: () => {
    medicines = {};
    intakeLogs = [];
  },
};
