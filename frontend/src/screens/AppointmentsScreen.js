import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const AppointmentCard = ({ appointment, onPress, onCancel, onReschedule }) => {
  const isUpcoming = appointment.status === 'confirmed';
  const statusColor = isUpcoming ? '#4CAF50' : '#999';

  return (
    <TouchableOpacity style={styles.appointmentCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.doctorSection}>
          <Text style={styles.doctorIcon}>{appointment.doctorImage || '👨‍⚕️'}</Text>
          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>{appointment.doctorName}</Text>
            <Text style={styles.doctorSpecialization}>
              {appointment.doctorSpecialization}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {appointment.status === 'confirmed' ? '🔵 Confirmed' : '✓ Completed'}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{appointment.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>🕐</Text>
          <Text style={styles.detailText}>{appointment.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>💬</Text>
          <Text style={styles.detailText}>{appointment.consultationType}</Text>
        </View>
      </View>

      {appointment.symptoms && (
        <View style={styles.symptomsSection}>
          <Text style={styles.symptomLabel}>Complaints:</Text>
          <Text style={styles.symptomText}>{appointment.symptoms}</Text>
        </View>
      )}

      {appointment.status === 'completed' && appointment.prescription && (
        <View style={styles.prescriptionBox}>
          <Text style={styles.prescriptionLabel}>💊 Prescription Available</Text>
        </View>
      )}

      {isUpcoming && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => onReschedule(appointment.id)}
          >
            <Text style={styles.rescheduleButtonText}>📅 Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => onCancel(appointment.id)}
          >
            <Text style={styles.cancelButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function AppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([
    {
      id: 'apt_001',
      doctorName: 'Dr. Rajesh Singh',
      doctorSpecialization: 'General Physician',
      doctorImage: '👨‍⚕️',
      date: '2024-03-07',
      time: '09:00 AM',
      status: 'confirmed',
      consultationType: 'In-Person',
      consultationFee: 500,
      symptoms: 'Cold and cough',
      notes: '',
      prescription: null,
    },
    {
      id: 'apt_002',
      doctorName: 'Dr. Priya Sharma',
      doctorSpecialization: 'Pediatrician',
      doctorImage: '👩‍⚕️',
      date: '2024-02-28',
      time: '10:30 AM',
      status: 'completed',
      consultationType: 'Video Call',
      consultationFee: 400,
      symptoms: 'Child fever and weakness',
      notes: 'Child had viral fever. Prescribed rest and fluids.',
      prescription: {
        medicines: [
          {
            name: 'Paracetamol',
            dosage: '250mg',
            frequency: '4x daily',
            duration: '3 days',
          },
        ],
        advices: ['Rest', 'Drink plenty of fluids', 'Avoid cold foods'],
      },
    },
  ]);

  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'confirmed'
  );
  const pastAppointments = appointments.filter(apt => apt.status === 'completed');

  const currentAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const handleCancelAppointment = (appointmentId) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes, Cancel',
        onPress: () => {
          setAppointments(prevAppointments =>
            prevAppointments.map(apt =>
              apt.id === appointmentId
                ? { ...apt, status: 'cancelled' }
                : apt
            )
          );
          Alert.alert('Success', 'Appointment cancelled successfully');
        },
        style: 'destructive',
      },
    ]);
  };

  const handleRescheduleAppointment = (appointmentId) => {
    Alert.alert(
      'Reschedule Appointment',
      'This will open the booking screen to select a new date and time'
    );
    // In a real app, navigate to booking screen
  };

  const handleViewDetails = (appointment) => {
    navigation.navigate('AppointmentDetails', { appointment });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Appointments</Text>
        <Text style={styles.subtitle}>View and manage your appointments</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'upcoming' && styles.tabLabelActive,
            ]}
          >
            📅 Upcoming ({upcomingAppointments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'past' && styles.tabLabelActive,
            ]}
          >
            ✓ Past ({pastAppointments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {currentAppointments.length > 0 ? (
          currentAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onPress={() => handleViewDetails(appointment)}
              onCancel={() => handleCancelAppointment(appointment.id)}
              onReschedule={() => handleRescheduleAppointment(appointment.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'upcoming' ? '📭' : '📋'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'No upcoming appointments'
                : 'No past appointments'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('DoctorStack')}
              >
                <Text style={styles.bookButtonText}>Book an Appointment</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1f4788',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#e8f5e9',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabLabelActive: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  doctorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f4788',
  },
  doctorSpecialization: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 18,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  symptomsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  symptomLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f4788',
  },
  symptomText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  prescriptionBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  prescriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescheduleButton: {
    backgroundColor: '#e8f5e9',
  },
  rescheduleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#ffebee',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f44336',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
