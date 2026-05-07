import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import simpleApiService from '../services/simpleApiService';
import NotificationService from '../services/notificationService';
import VoiceHelpIcon from '../components/VoiceHelpIcon';

const ALL_TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
];

const SPECIALTY_ALIAS_MAP = {
  'ent specialist': 'ENT',
  ent: 'ENT',
  otolaryngologist: 'ENT',
  gynecologist: 'Gynecologist',
  gynaecologist: 'Gynecologist',
  obstetrician: 'Gynecologist',
  'women health': 'Gynecologist',
  'womens health': 'Gynecologist',
  hepatology: 'Hepatologist',
  hepatologist: 'Hepatologist',
  allergology: 'Allergist',
  allergist: 'Allergist',
  endocrinology: 'Endocrinologist',
  endocrinologist: 'Endocrinologist',
  urology: 'Urologist',
  urologist: 'Urologist',
  nephrology: 'Nephrologist',
  nephrologist: 'Nephrologist',
  psychiatry: 'Psychiatrist',
  psychiatrist: 'Psychiatrist',
  psychology: 'Psychologist',
  psychologist: 'Psychologist',
  pediatrician: 'Pediatrics',
  paediatrician: 'Pediatrics',
  'general medicine': 'General Physician',
  physician: 'General Physician',
};

const SPECIALTY_RULES = [
  {
    specialty: 'Cardiologist',
    keywords: [
      'chest pain', 'palpitation', 'heart pain', 'high blood pressure', 'high bp', 'blood pressure',
      'chest pressure', 'heart',
    ],
  },
  {
    specialty: 'Pulmonologist',
    keywords: [
      'breathing problem', 'shortness of breath', 'breathlessness', 'asthma attack', 'asthma',
      'wheezing', 'chronic cough', 'cough with breathlessness', 'lung', 'cough with blood',
    ],
  },
  {
    specialty: 'ENT',
    keywords: [
      'ear pain', 'earache', 'ear infection', 'ear discharge', 'hearing loss', 'ringing ear',
      'sore throat', 'throat pain', 'sinus pain', 'sinus', 'nose block', 'tonsil', 'voice change',
      'runny nose', 'nose', 'throat',
    ],
  },
  {
    specialty: 'Dentist',
    keywords: [
      'tooth pain', 'toothache', 'bleeding gums', 'gum bleeding', 'gum pain', 'teeth', 'tooth', 'dental',
    ],
  },
  {
    specialty: 'Gastroenterologist',
    keywords: [
      'stomach pain', 'abdominal pain', 'acidity', 'gas', 'constipation', 'diarrhea', 'loose motion',
      'vomiting', 'nausea', 'ulcer', 'stomach', 'abdomen',
    ],
  },
  {
    specialty: 'Hepatologist',
    keywords: [
      'liver pain', 'jaundice', 'liver',
    ],
  },
  {
    specialty: 'Dermatologist',
    keywords: [
      'skin rash', 'itching skin', 'itching', 'eczema', 'fungal', 'acne', 'pimples', 'hair loss', 'skin', 'rash',
    ],
  },
  {
    specialty: 'Allergist',
    keywords: [
      'allergy', 'allergic', 'sneezing allergy',
    ],
  },
  {
    specialty: 'Orthopedic',
    keywords: [
      'joint pain', 'knee pain', 'back pain', 'neck pain', 'shoulder pain', 'bone pain', 'bone fracture',
      'fracture', 'muscle pain', 'joint', 'knee', 'back', 'neck', 'bone',
    ],
  },
  {
    specialty: 'Endocrinologist',
    keywords: [
      'diabetes symptoms', 'diabetes', 'thyroid problem', 'thyroid', 'obesity',
    ],
  },
  {
    specialty: 'Urologist',
    keywords: [
      'frequent urination', 'blood in urine', 'urinary', 'urine',
    ],
  },
  {
    specialty: 'Nephrologist',
    keywords: [
      'kidney pain', 'kidney',
    ],
  },
  {
    specialty: 'Ophthalmologist',
    keywords: [
      'eye pain', 'blurred vision', 'blur vision', 'vision blur', 'red eyes', 'eye redness', 'eye infection',
      'watery eyes', 'eye', 'vision',
    ],
  },
  {
    specialty: 'Gynecologist',
    keywords: [
      'pregnancy symptoms', 'pregnancy', 'irregular periods', 'irregular period', 'period pain', 'pcos',
      'white discharge', 'uterus', 'women', 'gyne', 'menstrual', 'pelvic pain',
    ],
  },
  {
    specialty: 'Psychiatrist',
    keywords: [
      'anxiety', 'depression',
    ],
  },
  {
    specialty: 'Psychologist',
    keywords: [
      'stress',
    ],
  },
  {
    specialty: 'Neurologist',
    keywords: [
      'headache', 'migraine', 'seizure', 'fits', 'numbness', 'tingling', 'memory loss', 'dizziness',
      'headache with dizziness', 'nerve', 'brain',
    ],
  },
  {
    specialty: 'Pediatrics',
    keywords: [
      'baby', 'child', 'kid', 'children', 'newborn', 'pediatric', 'infant',
    ],
  },
  {
    specialty: 'General Physician',
    keywords: [
      'fever', 'cold', 'body ache', 'weakness', 'fatigue', 'viral', 'infection',
      'pain',
    ],
  },
];

const getNextSevenDays = () => {
  const days = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date();
    date.setDate(date.getDate() + index);

    days.push({
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      weekday: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      fullLabel: date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    });
  }

  return days;
};

const parseSlotDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [datePart] = String(dateValue).split('T');
  const [time, modifier = 'AM'] = String(timeValue).split(' ');
  const [hourString = '9', minuteString = '00'] = String(time || '09:00').split(':');

  let hours = Number(hourString);
  const minutes = Number(minuteString);

  if (modifier.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  }

  if (modifier.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  const parsedDate = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(hours, minutes, 0, 0);
  return parsedDate;
};

const normalizeSpecialtyName = (specialty = '') => {
  const normalized = String(specialty || '').trim();
  if (!normalized) {
    return '';
  }

  const alias = SPECIALTY_ALIAS_MAP[normalized.toLowerCase()];
  return alias || normalized;
};

const keywordScore = (text, keyword) => {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase();
  if (!normalizedKeyword) {
    return 0;
  }

  if (text.includes(normalizedKeyword)) {
    return normalizedKeyword.includes(' ') ? 3 : 2;
  }

  return 0;
};

const hasAnyKeyword = (text, keywords = []) =>
  keywords.some((keyword) => keywordScore(text, keyword) > 0);

const pickAvailableSpecialty = (preferred, fallbackList, availableSpecialties) => {
  if (availableSpecialties.size === 0) {
    return preferred;
  }

  if (availableSpecialties.has(preferred)) {
    return preferred;
  }

  const fallback = (fallbackList || []).find((item) => availableSpecialties.has(item));
  if (fallback) {
    return fallback;
  }

  if (availableSpecialties.has('General Physician')) {
    return 'General Physician';
  }

  return availableSpecialties.values().next().value || 'General Physician';
};

const inferSpecialtyFromSymptoms = (symptomsText, doctors = []) => {
  const normalizedText = String(symptomsText || '').trim().toLowerCase();
  if (!normalizedText) {
    return 'General Physician';
  }

  const availableSpecialties = new Set(
    (Array.isArray(doctors) ? doctors : [])
      .map((doctor) => normalizeSpecialtyName(doctor?.specialty))
      .filter(Boolean)
  );

  const pulmonaryRedFlags = [
    'shortness of breath', 'breathlessness', 'breathing problem', 'difficulty breathing',
    'wheezing', 'asthma', 'chronic cough', 'cough with blood', 'cough with breathlessness',
  ];

  const cardioRedFlags = [
    'chest pain', 'chest pressure', 'heart pain', 'palpitation', 'high blood pressure', 'high bp',
  ];

  const neuroRedFlags = [
    'seizure', 'fits', 'numbness', 'memory loss', 'headache with dizziness',
  ];

  const commonGeneralSymptoms = [
    'cough', 'cold', 'fever', 'runny nose', 'sore throat', 'throat pain',
    'body ache', 'body pain', 'weakness', 'fatigue', 'headache',
    'vomiting', 'nausea', 'loose motion', 'diarrhea', 'acidity', 'gas',
  ];

  if (hasAnyKeyword(normalizedText, pulmonaryRedFlags)) {
    return pickAvailableSpecialty('Pulmonologist', ['General Physician'], availableSpecialties);
  }

  if (hasAnyKeyword(normalizedText, cardioRedFlags)) {
    return pickAvailableSpecialty('Cardiologist', ['General Physician'], availableSpecialties);
  }

  if (hasAnyKeyword(normalizedText, neuroRedFlags)) {
    return pickAvailableSpecialty('Neurologist', ['General Physician'], availableSpecialties);
  }

  if (hasAnyKeyword(normalizedText, commonGeneralSymptoms)) {
    return pickAvailableSpecialty('General Physician', ['ENT', 'Pulmonologist'], availableSpecialties);
  }

  const scores = SPECIALTY_RULES.map((rule) => {
    const specialty = normalizeSpecialtyName(rule.specialty);
    const score = rule.keywords.reduce((total, keyword) => total + keywordScore(normalizedText, keyword), 0);

    return {
      specialty,
      score,
      available: availableSpecialties.size === 0 ? true : availableSpecialties.has(specialty),
    };
  });

  const bestAvailable = scores
    .filter((item) => item.available && item.score > 0)
    .sort((left, right) => right.score - left.score)[0];

  if (bestAvailable) {
    return bestAvailable.specialty;
  }

  const bestAny = scores
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0];

  if (bestAny) {
    return bestAny.specialty;
  }

  if (availableSpecialties.has('General Physician')) {
    return 'General Physician';
  }

  return availableSpecialties.values().next().value || 'General Physician';
};

export default function BookAppointmentScreen({ route, navigation }) {
  const patient = route.params?.patient;
    const navigateBackToDashboard = () => {
      if (route.params?.doctor) {
        navigation.navigate('DoctorDashboard', { doctor: route.params.doctor });
        return;
      }

      if (patient) {
        navigation.navigate('PatientDashboard', { patient });
        return;
      }

      navigation.navigate('RoleSelect');
    };

  const initialMode = route.params?.mode || null;
  const initialSymptoms = route.params?.prefilledSymptoms || '';
  const initialRecommendedSpecialist = route.params?.recommendedSpecialist || '';

  const [stage, setStage] = useState(
    initialMode ? (initialMode === 'suggested' && !initialRecommendedSpecialist ? 'suggest' : 'doctor') : 'mode'
  );
  const [consultMode, setConsultMode] = useState(initialMode);
  const [symptomsText, setSymptomsText] = useState(initialSymptoms);
  const [recommendedSpecialty, setRecommendedSpecialty] = useState(normalizeSpecialtyName(initialRecommendedSpecialist));
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getNextSevenDays()[0].value);
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const availableDates = useMemo(() => getNextSevenDays(), []);

  const upcomingSlots = useMemo(() => {
    const now = Date.now();

    return ALL_TIME_SLOTS.filter((slot) => {
      const slotDateTime = parseSlotDateTime(selectedDate, slot);
      return slotDateTime ? slotDateTime.getTime() > now : true;
    });
  }, [selectedDate]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const result = await simpleApiService.getDoctors();
        const doctorList = Array.isArray(result?.doctors) ? result.doctors : [];
        setDoctors(doctorList);
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    if (!recommendedSpecialty) {
      return doctors;
    }

    const filtered = doctors.filter((doctor) => (
      normalizeSpecialtyName(doctor.specialty) === normalizeSpecialtyName(recommendedSpecialty)
      || doctor.specialty === recommendedSpecialty
    ));
    return filtered.length > 0 ? filtered : doctors;
  }, [doctors, recommendedSpecialty]);

  useEffect(() => {
    if (!selectedDoctor && filteredDoctors.length > 0) {
      setSelectedDoctor(filteredDoctors[0]);
    }
  }, [filteredDoctors, selectedDoctor]);

  useEffect(() => {
    const loadBookedSlots = async () => {
      if (!selectedDoctor?.name || !selectedDate) {
        setBookedSlots([]);
        return;
      }

      try {
        setLoadingSlots(true);
        const result = await simpleApiService.getAppointments({ doctorName: selectedDoctor.name, status: 'scheduled' });
        const appointments = Array.isArray(result?.appointments) ? result.appointments : [];
        const occupiedSlots = appointments
          .filter((appointment) => (appointment.appointmentDate || appointment.date) === selectedDate)
          .map((appointment) => appointment.appointmentTime)
          .filter(Boolean);

        setBookedSlots(occupiedSlots);
        if (selectedTime && occupiedSlots.includes(selectedTime)) {
          setSelectedTime('');
        }
      } catch (error) {
        setBookedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadBookedSlots();
  }, [selectedDate, selectedDoctor?.name, selectedTime]);

  useEffect(() => {
    if (selectedTime && !upcomingSlots.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [selectedTime, upcomingSlots]);

  const handleChooseMode = (mode) => {
    setConsultMode(mode);
    setRecommendedSpecialty('');
    setStage(mode === 'suggested' ? 'suggest' : 'doctor');
  };

  const handleChooseDoctor = (specialty, voiceSymptoms = []) => {
    const normalizedSpecialty = normalizeSpecialtyName(specialty);
    const text = Array.isArray(voiceSymptoms) && voiceSymptoms.length > 0
      ? voiceSymptoms.join(', ')
      : '';

    setConsultMode('suggested');
    if (text) {
      setSymptomsText(text);
    }
    setRecommendedSpecialty(normalizedSpecialty);
    setStage('doctor');
  };

  const handleSuggestDoctor = () => {
    if (!symptomsText.trim()) {
      Alert.alert('Symptoms required', 'Please write your symptoms to get a doctor suggestion.');
      return;
    }

    setRecommendedSpecialty(inferSpecialtyFromSymptoms(symptomsText, doctors));
    setStage('doctor');
  };

  const handleBookAppointment = async () => {
    if (!patient?.phone || !patient?.name) {
      Alert.alert('Login required', 'Please log in again before booking an appointment.');
      return;
    }

    if (!selectedDoctor || !selectedDate || !selectedTime) {
      Alert.alert('Incomplete booking', 'Please choose doctor, date, and time.');
      return;
    }

    const selectedDateInfo = availableDates.find((date) => date.value === selectedDate);

    try {
      setBooking(true);

      const result = await simpleApiService.createAppointment({
        patientId: patient.id || patient.phone,
        patientName: patient.name,
        patientPhone: patient.phone,
        doctorId: selectedDoctor.id || selectedDoctor.name,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        date: selectedDate,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        appointmentDay: selectedDateInfo?.weekday || '',
        consultationType: 'Video Call',
        reason: symptomsText.trim() || 'General consultation',
        symptoms: symptomsText.trim(),
        suggestedSpecialty: recommendedSpecialty,
        suggestedBySymptoms: consultMode === 'suggested',
      });

      // Schedule appointment notifications
      await NotificationService.scheduleAppointmentNotifications({
        appointmentId: result?.appointment?.id,
        patientName: patient.name,
        doctorName: selectedDoctor.name,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
      }).catch((error) => {
        console.warn('Failed to schedule appointment notifications:', error);
      });

      Alert.alert(
        'Appointment booked',
        `Your appointment with ${selectedDoctor.name} is booked for ${selectedDateInfo?.fullLabel || selectedDate} at ${selectedTime}.`,
        [
          {
            text: 'Join Video Call',
            onPress: () => navigation.navigate('VideoCall', {
              patient,
              focusAppointmentId: result?.appointment?.id,
            }),
          },
          {
            text: 'Done',
            onPress: navigateBackToDashboard,
          },
        ]
      );
    } catch (error) {
      Alert.alert('Booking failed', error.message || 'Unable to book this appointment right now.');
    } finally {
      setBooking(false);
    }
  };

  const handleBack = () => {
    if (stage === 'mode') {
      navigateBackToDashboard();
      return;
    }

    if (stage === 'suggest') {
      setStage('mode');
      return;
    }

    if (stage === 'doctor') {
      if (consultMode === 'suggested' && !route.params?.recommendedSpecialist) {
        setStage('suggest');
      } else {
        setStage('mode');
      }
      return;
    }

    if (stage === 'schedule') {
      setStage('doctor');
      return;
    }

    setStage('schedule');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerSide, styles.headerSideLeft]} />
        <Text style={styles.headerTitle} numberOfLines={1}>Consult Doctor</Text>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <VoiceHelpIcon 
            screenName="BookAppointment"
            language="en"
            onDoctorSelect={(specialty, symptoms) => handleChooseDoctor(specialty, symptoms)}
            onTimeSelect={(time) => setSelectedTime(time)}
            voicePrompt="Tell me your problem or the doctor you want. For example fever doctor or skin problem or dentist"
            followUpPrompt="I found doctors for your problem. Do you want to book the first available appointment"
            unclearPrompt="Sorry I did not understand. Please say something like fever doctor or heart problem"
          />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {stage === 'mode' && (
          <View>
            <Text style={styles.sectionTitle}>How would you like to consult?</Text>
            <TouchableOpacity style={styles.optionCard} onPress={() => handleChooseMode('suggested')}>
              <Text style={styles.optionTitle}>Get Suggested Doctor</Text>
              <Text style={styles.optionText}>Write symptoms and get the right doctor suggestion automatically.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={() => handleChooseMode('choose')}>
              <Text style={styles.optionTitle}>Choose Doctor</Text>
              <Text style={styles.optionText}>Pick your doctor yourself and book any free time slot.</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === 'suggest' && (
          <View>
            <Text style={styles.sectionTitle}>Tell us your symptoms</Text>
            <TextInput
              value={symptomsText}
              onChangeText={setSymptomsText}
              placeholder="Example: fever, cough, body pain since 2 days"
              placeholderTextColor="#7a8594"
              style={styles.textArea}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleSuggestDoctor}>
              <Text style={styles.primaryButtonText}>Get Doctor Suggestion</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === 'doctor' && (
          <View>
            <Text style={styles.sectionTitle}>{consultMode === 'suggested' ? 'Suggested doctor for your symptoms' : 'Choose your doctor'}</Text>

            {!!recommendedSpecialty && (
              <View style={styles.highlightCard}>
                <Text style={styles.highlightTitle}>Recommended specialty</Text>
                <Text style={styles.highlightText}>{recommendedSpecialty}</Text>
              </View>
            )}

            {loadingDoctors ? (
              <ActivityIndicator size="large" color="#1f6feb" />
            ) : (
              filteredDoctors.map((doctor) => {
                const isSelected = selectedDoctor?.id === doctor.id;
                return (
                  <TouchableOpacity
                    key={doctor.id}
                    style={[styles.doctorCard, isSelected && styles.doctorCardSelected]}
                    onPress={() => setSelectedDoctor(doctor)}
                  >
                    <Text style={[styles.doctorName, isSelected && styles.doctorNameSelected]}>{doctor.name}</Text>
                    <Text style={[styles.doctorSpecialty, isSelected && styles.doctorNameSelected]}>{doctor.specialty}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity style={[styles.primaryButton, !selectedDoctor && styles.primaryButtonDisabled]} disabled={!selectedDoctor} onPress={() => setStage('schedule')}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === 'schedule' && (
          <View>
            <Text style={styles.sectionTitle}>Select available slot</Text>
            <Text style={styles.sectionSubtitle}>Already-booked slots are disabled automatically.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroller}>
              {availableDates.map((date) => {
                const isSelected = selectedDate === date.value;
                return (
                  <TouchableOpacity key={date.value} style={[styles.dateCard, isSelected && styles.dateCardSelected]} onPress={() => setSelectedDate(date.value)}>
                    <Text style={[styles.dateWeekday, isSelected && styles.dateTextSelected]}>{date.weekday}</Text>
                    <Text style={[styles.dateLabel, isSelected && styles.dateTextSelected]}>{date.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingSlots ? (
              <ActivityIndicator size="small" color="#1f6feb" style={styles.slotLoader} />
            ) : (
              <>
                <View style={styles.slotGrid}>
                  {upcomingSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = selectedTime === slot;

                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotCard, isSelected && styles.slotCardSelected, isBooked && styles.slotCardDisabled]}
                        disabled={isBooked}
                        onPress={() => setSelectedTime(slot)}
                      >
                        <Text style={[styles.slotText, isSelected && styles.slotTextSelected, isBooked && styles.slotTextDisabled]}>{slot}</Text>
                        {isBooked && <Text style={styles.slotStatus}>Booked</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {upcomingSlots.length === 0 && (
                  <Text style={styles.noUpcomingSlotsText}>No upcoming slots are available for this date.</Text>
                )}
              </>
            )}

            <TouchableOpacity style={[styles.primaryButton, !selectedTime && styles.primaryButtonDisabled]} disabled={!selectedTime} onPress={() => setStage('confirm')}>
              <Text style={styles.primaryButtonText}>Review Booking</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === 'confirm' && (
          <View>
            <Text style={styles.sectionTitle}>Confirm your consultation</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Patient</Text>
                <Text style={styles.summaryValue}>{patient?.name || 'Patient'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doctor</Text>
                <Text style={styles.summaryValue}>{selectedDoctor?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Specialty</Text>
                <Text style={styles.summaryValue}>{selectedDoctor?.specialty}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>{availableDates.find((date) => date.value === selectedDate)?.fullLabel}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mode</Text>
                <Text style={styles.summaryValue}>Video Call</Text>
              </View>
            </View>

            {!!symptomsText.trim() && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Symptoms / problem</Text>
                <Text style={styles.symptomSummary}>{symptomsText}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.primaryButton, booking && styles.primaryButtonDisabled]} disabled={booking} onPress={handleBookAppointment}>
              {booking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Book Appointment</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.footerBackButton} onPress={handleBack} activeOpacity={0.85}>
          <Text style={styles.footerBackButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8ff',
  },
  header: {
    backgroundColor: '#1157c2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSide: {
    minWidth: 72,
  },
  headerSideLeft: {
    alignItems: 'flex-start',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  footerBackButton: {
    marginTop: 8,
    marginBottom: 4,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1157c2',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackButtonText: {
    color: '#1157c2',
    fontWeight: '800',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f2f67',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#4c6487',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d7e3f8',
    padding: 18,
    marginBottom: 14,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12396f',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#48627f',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#c8d7ef',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
    color: '#16355f',
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#1157c2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  highlightCard: {
    backgroundColor: '#e9f2ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bdd3f7',
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3562a5',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#103b75',
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d7e3f8',
    padding: 16,
    marginBottom: 12,
  },
  doctorCardSelected: {
    borderColor: '#1157c2',
    backgroundColor: '#ecf3ff',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12396f',
    marginBottom: 4,
  },
  doctorNameSelected: {
    color: '#1157c2',
  },
  doctorSpecialty: {
    fontSize: 15,
    color: '#4f6887',
  },
  dateScroller: {
    marginBottom: 16,
  },
  dateCard: {
    width: 88,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d7e3f8',
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  dateCardSelected: {
    backgroundColor: '#1157c2',
    borderColor: '#1157c2',
  },
  dateWeekday: {
    fontSize: 14,
    fontWeight: '700',
    color: '#355785',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#12396f',
  },
  dateTextSelected: {
    color: '#fff',
  },
  slotLoader: {
    marginVertical: 10,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  slotCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d7e3f8',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  slotCardSelected: {
    backgroundColor: '#1157c2',
    borderColor: '#1157c2',
  },
  slotCardDisabled: {
    backgroundColor: '#eef2f7',
    borderColor: '#d4dbe7',
  },
  slotText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#12396f',
  },
  slotTextSelected: {
    color: '#fff',
  },
  slotTextDisabled: {
    color: '#8b98aa',
  },
  slotStatus: {
    fontSize: 12,
    color: '#8b98aa',
    marginTop: 4,
    fontWeight: '700',
  },
  noUpcomingSlotsText: {
    fontSize: 14,
    color: '#5f7390',
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d7e3f8',
    padding: 16,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#5c718d',
    fontWeight: '700',
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    color: '#12396f',
    fontWeight: '800',
  },
  symptomSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: '#16355f',
    marginTop: 8,
  },
});
