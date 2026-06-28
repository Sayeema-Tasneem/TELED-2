import React from 'react';
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

const parseAppointmentDateTime = (appointment) => {
  const dateValue = appointment?.appointmentDate || appointment?.date;
  const timeValue = appointment?.appointmentTime || appointment?.time || '09:00 AM';
  if (!dateValue) return null;

  const [datePart] = String(dateValue).split('T');
  const [time, modifier = 'AM'] = String(timeValue).split(' ');
  const [hourString = '9', minuteString = '00'] = String(time || '09:00').split(':');

  let hours = Number(hourString);
  const minutes = Number(minuteString || 0);
  if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const isPastAppointment = (appointment) => {
  const dt = parseAppointmentDateTime(appointment);
  if (!dt) return false;
  return dt.getTime() < Date.now();
};

export default function AppointmentDetailsScreen({ route, navigation }) {
  const { appointment } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Doctor Section */}
        <View style={styles.section}>
          <View style={styles.doctorHeader}>
            <Text style={styles.doctorIcon}>{appointment.doctorImage || '👨‍⚕️'}</Text>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{appointment.doctorName}</Text>
              <Text style={styles.specialization}>{appointment.doctorSpecialization}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Date</Text>
            <Text style={styles.detailValue}>{appointment.date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🕐 Time</Text>
            <Text style={styles.detailValue}>{appointment.time}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💬 Type</Text>
            <Text style={styles.detailValue}>{appointment.consultationType}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💷 Fee</Text>
            <Text style={styles.detailValue}>₹{appointment.consultationFee}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📊 Status</Text>
            <Text
              style={[
                styles.detailValue,
                appointment.status === 'confirmed'
                  ? styles.statusConfirmed
                  : styles.statusCompleted,
              ]}
            >
              {appointment.status === 'confirmed' ? '🔵 Confirmed' : '✓ Completed'}
            </Text>
          </View>
        </View>

        {/* Symptoms/Complaints */}
        {appointment.symptoms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chief Complaints</Text>
            <View style={styles.symptomsBox}>
              <Text style={styles.symptomsText}>{appointment.symptoms}</Text>
            </View>
          </View>
        )}

        {/* Doctor Notes */}
        {appointment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Doctor's Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          </View>
        )}

        {/* Prescription */}
        {appointment.status === 'completed' && appointment.prescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💊 Prescription</Text>

            {appointment.prescription.medicines &&
              appointment.prescription.medicines.length > 0 && (
                <View style={styles.medicinesBox}>
                  <Text style={styles.medicineSectionTitle}>Medicines</Text>
                  {appointment.prescription.medicines.map((med, index) => (
                    <View key={index} style={styles.medicineItem}>
                      <Text style={styles.medicineName}>{med.name}</Text>
                      <Text style={styles.medicineDetails}>
                        {med.dosage} • {med.frequency}
                      </Text>
                      <Text style={styles.medicineDuration}>
                        Duration: {med.duration}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

            {appointment.prescription.advices &&
              appointment.prescription.advices.length > 0 && (
                <View style={styles.advicesBox}>
                  <Text style={styles.adviceSectionTitle}>Doctor's Advice</Text>
                  {appointment.prescription.advices.map((advice, index) => (
                    <View key={index} style={styles.adviceItem}>
                      <Text style={styles.adviceBullet}>•</Text>
                      <Text style={styles.adviceText}>{advice}</Text>
                    </View>
                  ))}
                </View>
              )}
          </View>
        )}

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Alert.alert('Call', `Calling doctor...`)}
          >
            <Text style={styles.contactButtonText}>📞 Call Doctor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactButton, styles.contactButtonSecondary]}
            onPress={() => Alert.alert('Message', `Messaging doctor...`)}
          >
            <Text style={styles.contactButtonSecondaryText}>💬 Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        {appointment.status === 'confirmed' && !isPastAppointment(appointment) && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => Alert.alert('Reschedule', 'Opening booking screen...')}
            >
              <Text style={styles.rescheduleButtonText}>📅 Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() =>
                Alert.alert('Cancel Appointment', 'Are you sure?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive' },
                ])
              }
            >
              <Text style={styles.cancelButtonText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.footerBackButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.footerBackButtonText}>← Back</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 56,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  footerBackButton: {
    marginTop: 12,
    marginBottom: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1f4788',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f4788',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
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
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4788',
  },
  specialization: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f4788',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4788',
  },
  statusConfirmed: {
    color: '#4CAF50',
  },
  statusCompleted: {
    color: '#666',
  },
  symptomsBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  symptomsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  notesBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1f4788',
  },
  notesText: {
    fontSize: 13,
    color: '#1f4788',
    lineHeight: 20,
  },
  medicinesBox: {
    marginBottom: 12,
  },
  medicineSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f4788',
    marginBottom: 10,
  },
  medicineItem: {
    backgroundColor: '#fff9f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  medicineName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4788',
  },
  medicineDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  medicineDuration: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  advicesBox: {
    marginTop: 12,
  },
  adviceSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f4788',
    marginBottom: 10,
  },
  adviceItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  adviceBullet: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: '600',
  },
  adviceText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  contactButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  contactButtonSecondary: {
    backgroundColor: '#e8f5e9',
  },
  contactButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actionSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
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
});
