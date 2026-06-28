/**
 * Video Call Screen - Appointment-centric join flow for the simplified app
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import simpleApiService from '../services/simpleApiService';

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

const VIDEO_JOIN_EXPIRY_MINUTES = 20;

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

const parseAppointmentDateTime = (appointment) => {
  const dateValue = appointment?.appointmentDate || appointment?.date;
  const timeValue = appointment?.appointmentTime || '09:00 AM';

  if (!dateValue) {
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

  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
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

const getAppointmentRoomName = (appointment) => {
  const base = String(
    appointment?.id
    || `${appointment?.doctorName || 'doctor'}-${appointment?.patientPhone || 'patient'}-${appointment?.appointmentDate || appointment?.date || 'date'}-${appointment?.appointmentTime || 'time'}`
  );

  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `teled2-${safe || 'consult-room'}`;
};

const getAppointmentMeetingPassword = (appointment) => {
  const seed = String(
    appointment?.id
    || `${appointment?.doctorName || ''}${appointment?.patientPhone || ''}${appointment?.appointmentDate || appointment?.date || ''}${appointment?.appointmentTime || ''}`
  );

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  const numeric = Math.abs(hash).toString(36).toUpperCase();
  return `TD2-${numeric.slice(0, 6).padEnd(6, '0')}`;
};

const getJitsiMeetingUrl = (appointment) => `https://meet.jit.si/${getAppointmentRoomName(appointment)}`;

const formatAppointmentDate = (appointment) => {
  const date = parseAppointmentDateTime(appointment);
  if (!date) {
    return appointment?.appointmentDate || appointment?.date || 'Not scheduled';
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getJoinAvailability = (appointment) => {
  const appointmentTime = parseAppointmentDateTime(appointment);
  if (!appointmentTime) {
    return {
      canJoin: false,
      message: 'Appointment time is not available yet.',
      state: 'missing',
    };
  }

  const now = new Date();
  const joinStart = new Date(appointmentTime.getTime() - 15 * 60 * 1000);
  const joinEnd = new Date(appointmentTime.getTime() + VIDEO_JOIN_EXPIRY_MINUTES * 60 * 1000);

  if (now < joinStart) {
    return {
      canJoin: false,
      message: `Video call will be enabled 15 minutes before the appointment. Available from ${joinStart.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.`,
      state: 'future',
    };
  }

  if (now > joinEnd) {
    return {
      canJoin: false,
      message: 'Join consultation is disabled 20 minutes after appointment time.',
      state: 'past',
    };
  }

  return {
    canJoin: true,
    message: 'Your video call is ready to join.',
    state: 'joinable',
  };
};

export default function VideoCallScreen({ route, navigation }) {
  const patient = route.params?.patient;
  const doctor = route.params?.doctor;
    const navigateBackToDashboard = () => {
      if (doctor) {
        navigation.navigate('DoctorDashboard', { doctor });
        return;
      }

      if (patient) {
        navigation.navigate('PatientDashboard', { patient });
        return;
      }

      navigation.navigate('RoleSelect');
    };

  const focusAppointmentId = route.params?.focusAppointmentId;
  const routeAppointment = route.params?.appointment;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingAppointment, setManagingAppointment] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);

  const availableDates = useMemo(() => getNextSevenDays(), []);

  const upcomingRescheduleSlots = useMemo(() => {
    const now = Date.now();

    return ALL_TIME_SLOTS.filter((slot) => {
      const slotDateTime = parseSlotDateTime(rescheduleDate, slot);
      return slotDateTime ? slotDateTime.getTime() > now : true;
    });
  }, [rescheduleDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const filters = patient?.phone
        ? { patientPhone: patient.phone }
        : doctor?.name
        ? { doctorName: doctor.name }
        : {};

      const result = await simpleApiService.getAppointments(filters);
      const list = (Array.isArray(result?.appointments) ? result.appointments : []).filter(
        (appointment) => String(appointment?.status || '').toLowerCase() !== 'cancelled'
      );
      setAppointments(list);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAppointments);
    return unsubscribe;
  }, [doctor?.name, navigation, patient?.phone]);

  const upcomingAppointments = useMemo(() => {
    const list = [...appointments];

    if (routeAppointment?.id && !list.some((item) => item.id === routeAppointment.id)) {
      list.push(routeAppointment);
    }

    return list.sort((first, second) => {
      const firstDate = parseAppointmentDateTime(first)?.getTime() || Number.MAX_SAFE_INTEGER;
      const secondDate = parseAppointmentDateTime(second)?.getTime() || Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate;
    });
  }, [appointments, routeAppointment]);

  const selectedAppointment = useMemo(() => {
    const now = Date.now();
    if (focusAppointmentId) {
      const focused = upcomingAppointments.find((appointment) => appointment.id === focusAppointmentId);
      if (focused) {
        return focused;
      }
    }

    const nextUpcoming = upcomingAppointments.find((appointment) => {
      const appointmentDate = parseAppointmentDateTime(appointment);
      return appointmentDate ? appointmentDate.getTime() >= now : false;
    });

    if (nextUpcoming) {
      return nextUpcoming;
    }

    const lastPast = [...upcomingAppointments].reverse().find((appointment) => {
      const appointmentDate = parseAppointmentDateTime(appointment);
      return appointmentDate ? appointmentDate.getTime() < now : false;
    });

    return lastPast || null;
  }, [focusAppointmentId, upcomingAppointments]);

  const joinAvailability = useMemo(() => getJoinAvailability(selectedAppointment), [selectedAppointment]);

  const appointmentViewState = useMemo(() => {
    if (!selectedAppointment) {
      return {
        state: 'missing',
        title: 'No appointment scheduled',
        subtitle: 'Book a consultation first. It will appear here with date, day, time, and the video button.',
      };
    }

    if (joinAvailability.state === 'past') {
      return {
        state: 'past',
        title: 'Past appointment',
        subtitle: 'This appointment time has already passed.',
      };
    }

    if (joinAvailability.state === 'future') {
      return {
        state: 'future',
        title: 'Upcoming appointment',
        subtitle: joinAvailability.message,
      };
    }

    return {
      state: 'joinable',
      title: 'Your appointment is ready',
      subtitle: joinAvailability.message,
    };
  }, [joinAvailability.message, joinAvailability.state, selectedAppointment]);

  const meetingId = selectedAppointment ? getAppointmentRoomName(selectedAppointment) : '-';
  const meetingPassword = selectedAppointment ? getAppointmentMeetingPassword(selectedAppointment) : '-';

  useEffect(() => {
    if (!selectedAppointment) {
      setRescheduleDate('');
      setRescheduleTime('');
      return;
    }

    setRescheduleDate(selectedAppointment.appointmentDate || selectedAppointment.date || availableDates[0]?.value || '');
    setRescheduleTime(selectedAppointment.appointmentTime || '');
  }, [availableDates, selectedAppointment?.appointmentDate, selectedAppointment?.appointmentTime, selectedAppointment?.date, selectedAppointment?.id]);

  useEffect(() => {
    const loadBookedSlots = async () => {
      if (!rescheduleOpen || !selectedAppointment?.doctorName || !rescheduleDate) {
        setBookedSlots([]);
        return;
      }

      try {
        const result = await simpleApiService.getAppointments({
          doctorName: selectedAppointment.doctorName,
          status: 'scheduled',
        });

        const appointmentsForDate = (result?.appointments || []).filter((appointment) => (
          appointment.id !== selectedAppointment.id
          && (appointment.appointmentDate || appointment.date) === rescheduleDate
        ));

        setBookedSlots(appointmentsForDate.map((appointment) => appointment.appointmentTime).filter(Boolean));
      } catch (error) {
        setBookedSlots([]);
      }
    };

    loadBookedSlots();
  }, [rescheduleDate, rescheduleOpen, selectedAppointment?.doctorName, selectedAppointment?.id]);

  useEffect(() => {
    if (rescheduleTime && !upcomingRescheduleSlots.includes(rescheduleTime)) {
      setRescheduleTime('');
    }
  }, [rescheduleTime, upcomingRescheduleSlots]);

  const handleJoinCall = async () => {
    if (!selectedAppointment) {
      return;
    }

    if (!joinAvailability.canJoin) {
      Alert.alert('Not available yet', joinAvailability.message);
      return;
    }

    const jitsiUrl = getJitsiMeetingUrl(selectedAppointment);

    try {
      const supported = await Linking.canOpenURL(jitsiUrl);
      if (!supported) {
        Alert.alert('Unable to open call', 'Could not open the Jitsi meeting link on this device.');
        return;
      }

      await Linking.openURL(jitsiUrl);
    } catch (error) {
      Alert.alert('Join failed', error?.message || 'Could not open the Jitsi meeting.');
    }
  };

  const toggleReschedule = () => {
    if (!selectedAppointment) {
      return;
    }

    setRescheduleOpen((previous) => !previous);
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) {
      Alert.alert('Pick a slot', 'Please choose a new date and time for the appointment.');
      return;
    }

    const selectedDateInfo = availableDates.find((date) => date.value === rescheduleDate);

    try {
      setManagingAppointment(true);
      await simpleApiService.updateAppointment(selectedAppointment.id, {
        date: rescheduleDate,
        appointmentDate: rescheduleDate,
        appointmentTime: rescheduleTime,
        appointmentDay: selectedDateInfo?.weekday || '',
      });

      setRescheduleOpen(false);
      await loadAppointments();
      Alert.alert('Appointment rescheduled', `Your appointment has been moved to ${selectedDateInfo?.fullLabel || rescheduleDate} at ${rescheduleTime}.`);
    } catch (error) {
      Alert.alert('Reschedule failed', error.message || 'Could not reschedule the appointment.');
    } finally {
      setManagingAppointment(false);
    }
  };

  const handleDeleteAppointment = () => {
    if (!selectedAppointment) {
      return;
    }

    Alert.alert(
      'Delete appointment',
      'Are you sure you want to delete this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setManagingAppointment(true);
              await simpleApiService.deleteAppointment(selectedAppointment.id);
              setRescheduleOpen(false);
              await loadAppointments();
              Alert.alert('Appointment deleted', 'The appointment has been removed successfully.');
            } catch (error) {
              Alert.alert('Delete failed', error.message || 'Could not delete the appointment.');
            } finally {
              setManagingAppointment(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1157c2" />
          <Text style={styles.infoText}>Loading your appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedAppointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Join Video Call</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={72} color="#a5b5cc" />
          <Text style={styles.emptyTitle}>No appointment scheduled</Text>
          <Text style={styles.infoText}>Book a consultation first. It will appear here with date, day, time, and the video button.</Text>
        </View>

        <TouchableOpacity style={styles.footerBackButton} onPress={navigateBackToDashboard} activeOpacity={0.85}>
          <Text style={styles.footerBackButtonText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Join Video Call</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <MaterialCommunityIcons name="video-outline" size={40} color="#1157c2" />
          <Text style={styles.heroTitle}>{appointmentViewState.title}</Text>
          <Text style={styles.heroSubtitle}>{appointmentViewState.subtitle}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Doctor</Text>
            <Text style={styles.detailValue}>{selectedAppointment.doctorName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatAppointmentDate(selectedAppointment)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Day</Text>
            <Text style={styles.detailValue}>{selectedAppointment.appointmentDay || 'Scheduled'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{selectedAppointment.appointmentTime || 'Pending'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Consultation</Text>
            <Text style={styles.detailValue}>{selectedAppointment.consultationType || 'Video Call'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meeting room</Text>
            <Text style={styles.detailValue}>{meetingId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meeting password</Text>
            <Text style={styles.detailValue}>{meetingPassword}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Problem / symptoms</Text>
            <Text style={styles.notesText}>{selectedAppointment.reason || selectedAppointment.symptoms || 'No notes added'}</Text>
          </View>
        </View>

        {appointmentViewState.state !== 'past' ? (
          <TouchableOpacity style={[styles.joinButton, !joinAvailability.canJoin && styles.joinButtonDisabled]} disabled={!joinAvailability.canJoin} onPress={handleJoinCall}>
            <MaterialCommunityIcons name="video" size={22} color="#fff" />
            <Text style={styles.joinButtonText}>Join Video Call</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pastNoticeCard}>
            <MaterialCommunityIcons name="calendar-remove-outline" size={22} color="#7a4b00" />
            <Text style={styles.pastNoticeText}>This was a past appointment. You can no longer join this consultation.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.footerBackButton} onPress={navigateBackToDashboard} activeOpacity={0.85}>
          <Text style={styles.footerBackButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.manageRow}>
          {appointmentViewState.state !== 'past' && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, managingAppointment && styles.secondaryActionButtonDisabled]}
              disabled={managingAppointment}
              onPress={toggleReschedule}
            >
              <MaterialCommunityIcons name="calendar-edit" size={20} color="#1157c2" />
              <Text style={styles.secondaryActionText}>{rescheduleOpen ? 'Close Reschedule' : 'Reschedule'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.deleteButton, managingAppointment && styles.secondaryActionButtonDisabled]}
            disabled={managingAppointment}
            onPress={handleDeleteAppointment}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {rescheduleOpen && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reschedule appointment</Text>
            <Text style={styles.infoTextSmall}>Choose a new free slot for this same doctor.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroller}>
              {availableDates.map((date) => {
                const isSelected = rescheduleDate === date.value;
                return (
                  <TouchableOpacity
                    key={date.value}
                    style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                    onPress={() => setRescheduleDate(date.value)}
                  >
                    <Text style={[styles.dateWeekday, isSelected && styles.dateTextSelected]}>{date.weekday}</Text>
                    <Text style={[styles.dateLabel, isSelected && styles.dateTextSelected]}>{date.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.slotGrid}>
              {upcomingRescheduleSlots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                const isSelected = rescheduleTime === slot;

                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotCard, isSelected && styles.slotCardSelected, isBooked && styles.slotCardDisabled]}
                    disabled={isBooked || managingAppointment}
                    onPress={() => setRescheduleTime(slot)}
                  >
                    <Text style={[styles.slotText, isSelected && styles.slotTextSelected, isBooked && styles.slotTextDisabled]}>{slot}</Text>
                    {isBooked && <Text style={styles.slotStatus}>Booked</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {upcomingRescheduleSlots.length === 0 && (
              <Text style={styles.infoTextSmall}>No upcoming slots are available for this date.</Text>
            )}

            <TouchableOpacity
              style={[styles.joinButton, managingAppointment && styles.joinButtonDisabled]}
              disabled={managingAppointment}
              onPress={handleReschedule}
            >
              {managingAppointment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={22} color="#fff" />
                  <Text style={styles.joinButtonText}>Confirm Reschedule</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {upcomingAppointments.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Other scheduled appointments</Text>
            {upcomingAppointments
              .filter((appointment) => appointment.id !== selectedAppointment.id)
              .slice(0, 4)
              .map((appointment) => (
                <View key={appointment.id} style={styles.listItem}>
                  <Text style={styles.listDoctor}>{appointment.doctorName}</Text>
                  <Text style={styles.listMeta}>{formatAppointmentDate(appointment)} • {appointment.appointmentTime}</Text>
                </View>
              ))}
          </View>
        )}
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerBackButton: {
    marginTop: 12,
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12396f',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#55708e',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d7e3f8',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#12396f',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#57708f',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d7e3f8',
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12396f',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  detailColumn: {
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 15,
    color: '#60758f',
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    color: '#12396f',
    fontWeight: '800',
  },
  notesText: {
    marginTop: 8,
    fontSize: 15,
    color: '#294768',
    lineHeight: 22,
  },
  joinButton: {
    backgroundColor: '#1157c2',
    minHeight: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  joinButtonDisabled: {
    opacity: 0.45,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  pastNoticeCard: {
    backgroundColor: '#fff7e8',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0c36a',
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pastNoticeText: {
    flex: 1,
    color: '#7a4b00',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  manageRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1157c2',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionButtonDisabled: {
    opacity: 0.5,
  },
  secondaryActionText: {
    color: '#1157c2',
    fontWeight: '800',
    fontSize: 15,
  },
  deleteButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#d93b3b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  infoTextSmall: {
    fontSize: 14,
    color: '#55708e',
    lineHeight: 21,
    marginBottom: 12,
  },
  dateScroller: {
    marginBottom: 14,
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
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  listItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f6',
  },
  listDoctor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#12396f',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 14,
    color: '#60758f',
  },
});
