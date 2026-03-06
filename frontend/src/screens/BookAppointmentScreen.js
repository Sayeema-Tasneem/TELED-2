import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const TimeSlotGrid = ({ slots, selectedTime, onSelectTime }) => (
  <View style={styles.slotsGrid}>
    {slots.map((slot, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.timeSlot,
          selectedTime === slot && styles.timeSlotSelected,
        ]}
        onPress={() => onSelectTime(slot)}
      >
        <Text
          style={[
            styles.timeSlotText,
            selectedTime === slot && styles.timeSlotTextSelected,
          ]}
        >
          {slot}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function BookAppointmentScreen({ route, navigation }) {
  const { doctorId } = route.params;
  const [step, setStep] = useState(1); // 1: Date, 2: Time, 3: Details, 4: Confirm

  // Mock doctor data
  const [doctor] = useState({
    id: doctorId,
    name: 'Dr. Rajesh Singh',
    specialization: 'General Physician',
    consultationFee: 500,
  });

  const [selectedDate, setSelectedDate] = useState('2024-03-07');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedConsultationType, setSelectedConsultationType] = useState('In-Person');
  const [selectedSymptoms, setSelectedSymptoms] = useState('');
  const [loading, setLoading] = useState(false);

  // Available dates for next 7 days
  const availableDates = ['2024-03-07', '2024-03-08', '2024-03-09', '2024-03-10'];

  // Mock time slots
  const timeSlots =
    selectedDate === '2024-03-07'
      ? [
          '09:00 AM',
          '09:30 AM',
          '10:30 AM',
          '11:00 AM',
          '02:00 PM',
          '03:00 PM',
          '03:30 PM',
          '04:00 PM',
        ]
      : [
          '09:00 AM',
          '09:30 AM',
          '10:00 AM',
          '11:00 AM',
          '02:00 PM',
          '02:30 PM',
          '03:00 PM',
          '04:00 PM',
        ];

  const consultationTypes = ['In-Person', 'Video Call', 'Audio Call'];
  const commonSymptoms = [
    'Fever',
    'Cough',
    'Cold',
    'Headache',
    'Body Pain',
    'Weakness',
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedSymptoms) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      // Simulate API call to book appointment
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert('Success', 'Appointment booked successfully!', [
        {
          text: 'View Appointment',
          onPress: () => navigation.navigate('Appointments'),
        },
        {
          text: 'Continue',
          onPress: () => navigation.popToTop(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (step === 1 ? navigation.goBack() : setStep(step - 1))}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <Text style={styles.stepIndicator}>
          Step {step} of 4
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map(index => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Doctor Info */}
        <View style={styles.doctorSummary}>
          <Text style={styles.doctorSummaryTitle}>{doctor.name}</Text>
          <Text style={styles.doctorSummarySpec}>{doctor.specialization}</Text>
        </View>

        {/* Step 1: Select Date */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Select Date</Text>
            <View style={styles.dateGrid}>
              {availableDates.map(date => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateCard,
                    selectedDate === date && styles.dateCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedTime('');
                  }}
                >
                  <Text style={styles.dateCardText}>{formatDate(date)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Select Time */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>
              Select Time - {formatDate(selectedDate)}
            </Text>
            <TimeSlotGrid
              slots={timeSlots}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
            />

            <TouchableOpacity
              style={styles.nextButton}
              disabled={!selectedTime}
              onPress={() => setStep(3)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Consultation Details</Text>

            {/* Consultation Type */}
            <Text style={styles.fieldLabel}>Consultation Type</Text>
            <View style={styles.optionsGrid}>
              {consultationTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionCard,
                    selectedConsultationType === type &&
                      styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedConsultationType(type)}
                >
                  <Text
                    style={[
                      styles.optionCardText,
                      selectedConsultationType === type &&
                        styles.optionCardTextSelected,
                    ]}
                  >
                    {type === 'In-Person' && '🏥 '}
                    {type === 'Video Call' && '📹 '}
                    {type === 'Audio Call' && '☎️ '}
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Symptoms */}
            <Text style={styles.fieldLabel}>Chief Complaints</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your symptoms..."
              placeholderTextColor="#999"
              value={selectedSymptoms}
              onChangeText={setSelectedSymptoms}
              multiline
              numberOfLines={4}
            />

            {/* Common Symptoms Quick Add */}
            <Text style={styles.fieldLabel}>Quick Select</Text>
            <View style={styles.symptomsGrid}>
              {commonSymptoms.map(symptom => (
                <TouchableOpacity
                  key={symptom}
                  style={styles.symptomChip}
                  onPress={() => {
                    setSelectedSymptoms(
                      selectedSymptoms ? selectedSymptoms + ', ' + symptom : symptom
                    );
                  }}
                >
                  <Text style={styles.symptomChipText}>{symptom}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(4)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Confirm Your Booking</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doctor:</Text>
                <Text style={styles.summaryValue}>{doctor.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type:</Text>
                <Text style={styles.summaryValue}>{selectedConsultationType}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fee:</Text>
                <Text style={styles.summaryValue}>₹{doctor.consultationFee}</Text>
              </View>
            </View>

            <View style={styles.symptomsBox}>
              <Text style={styles.fieldLabel}>Symptoms:</Text>
              <Text style={styles.symptomsText}>{selectedSymptoms}</Text>
            </View>

            <TouchableOpacity
              style={[styles.nextButton, styles.bookButtonFinal]}
              onPress={handleConfirmBooking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>Confirm & Book</Text>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 12,
    color: '#e0e0e0',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  doctorSummary: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  doctorSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f4788',
  },
  doctorSummarySpec: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4788',
    marginBottom: 12,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  dateCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateCardSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dateCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f4788',
  },
  dateCardSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dateCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f4788',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeSlot: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeSlotSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f4788',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4788',
    marginBottom: 10,
    marginTop: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionCardSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  optionCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  optionCardTextSelected: {
    color: '#4CAF50',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  symptomChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  symptomChipText: {
    fontSize: 12,
    color: '#1f4788',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookButtonFinal: {
    marginBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4788',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  symptomsBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  symptomsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
