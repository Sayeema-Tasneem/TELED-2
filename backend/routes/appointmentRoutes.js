const express = require('express');
const router = express.Router();
const doctorModel = require('../models/doctors');
const appointmentModel = require('../models/appointments');

// Get all doctors for listing
router.get('/doctors', (req, res) => {
  try {
    const doctors = doctorModel.getAllDoctors();
    res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message,
    });
  }
});

// Get doctor details by ID
router.get('/doctors/:doctorId', (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = doctorModel.getDoctorById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor details',
      error: error.message,
    });
  }
});

// Get available slots for a doctor on a specific date
router.get('/doctors/:doctorId/slots', (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required',
      });
    }

    const slots = doctorModel.getAvailableSlots(doctorId, date);
    
    res.status(200).json({
      success: true,
      data: slots,
      date: date,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message,
    });
  }
});

// Search doctors by specialization or name
router.get('/doctors/search', (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const allDoctors = doctorModel.getAllDoctors();
    const results = allDoctors.filter(doctor =>
      doctor.name.toLowerCase().includes(query.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(query.toLowerCase())
    );

    res.status(200).json({
      success: true,
      data: results,
      query: query,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching doctors',
      error: error.message,
    });
  }
});

// Book an appointment
router.post('/appointments/book', (req, res) => {
  try {
    const {
      userId,
      doctorId,
      doctorName,
      doctorSpecialization,
      date,
      time,
      consultationType,
      consultationFee,
      symptoms,
    } = req.body;

    // Validate required fields
    if (!userId || !doctorId || !date || !time || !consultationType || !symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if slot is available
    const availableSlots = doctorModel.getAvailableSlots(doctorId, date);
    const slotExists = availableSlots.some(slot => slot.time === time);

    if (!slotExists) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available',
      });
    }

    // Book the slot
    const slotBooked = doctorModel.bookSlot(doctorId, date, time);

    if (!slotBooked) {
      return res.status(400).json({
        success: false,
        message: 'Failed to book slot',
      });
    }

    // Create appointment record
    const appointment = appointmentModel.createAppointment({
      userId,
      doctorId,
      doctorName,
      doctorSpecialization,
      date,
      time,
      consultationType,
      consultationFee,
      symptoms,
      notes: '',
      prescription: null,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error booking appointment',
      error: error.message,
    });
  }
});

// Get user's appointments
router.get('/appointments/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = appointmentModel.getUserAppointments(userId);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message,
    });
  }
});

// Get upcoming appointments for user
router.get('/appointments/user/:userId/upcoming', (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = appointmentModel.getUpcomingAppointments(userId);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming appointments',
      error: error.message,
    });
  }
});

// Get past appointments for user
router.get('/appointments/user/:userId/past', (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = appointmentModel.getPastAppointments(userId);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching past appointments',
      error: error.message,
    });
  }
});

// Get appointment details
router.get('/appointments/:appointmentId', (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = appointmentModel.getAppointmentById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment',
      error: error.message,
    });
  }
});

// Cancel appointment
router.post('/appointments/:appointmentId/cancel', (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = appointmentModel.getAppointmentById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Release the slot back
    const slotReleased = require('../models/doctors').releaseSlot(
      appointment.doctorId,
      appointment.date,
      appointment.time
    );

    if (!slotReleased) {
      return res.status(400).json({
        success: false,
        message: 'Failed to release slot',
      });
    }

    // Cancel the appointment
    const cancelled = appointmentModel.cancelAppointment(appointmentId, reason || '');

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: 'Failed to cancel appointment',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message,
    });
  }
});

// Reschedule appointment
router.post('/appointments/:appointmentId/reschedule', (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: 'New date and time are required',
      });
    }

    const appointment = appointmentModel.getAppointmentById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Check if new slot is available
    const availableSlots = require('../models/doctors').getAvailableSlots(
      appointment.doctorId,
      newDate
    );
    const newSlotExists = availableSlots.some(slot => slot.time === newTime);

    if (!newSlotExists) {
      return res.status(400).json({
        success: false,
        message: 'New time slot is not available',
      });
    }

    // Release old slot
    const oldSlotReleased = require('../models/doctors').releaseSlot(
      appointment.doctorId,
      appointment.date,
      appointment.time
    );

    if (!oldSlotReleased) {
      return res.status(400).json({
        success: false,
        message: 'Failed to release old slot',
      });
    }

    // Book new slot
    const newSlotBooked = require('../models/doctors').bookSlot(
      appointment.doctorId,
      newDate,
      newTime
    );

    if (!newSlotBooked) {
      // Restore old slot if new booking fails
      require('../models/doctors').bookSlot(
        appointment.doctorId,
        appointment.date,
        appointment.time
      );
      return res.status(400).json({
        success: false,
        message: 'Failed to book new slot',
      });
    }

    // Update appointment
    const rescheduled = appointmentModel.rescheduleAppointment(
      appointmentId,
      newDate,
      newTime
    );

    if (!rescheduled) {
      return res.status(400).json({
        success: false,
        message: 'Failed to reschedule appointment',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointmentModel.getAppointmentById(appointmentId),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rescheduling appointment',
      error: error.message,
    });
  }
});

module.exports = router;
