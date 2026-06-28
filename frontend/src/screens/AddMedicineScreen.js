/**
 * Add Medicine Screen - Fully functional medicine planner
 * Supports tablets per dose, times/day, custom alarms, and duration in days.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import MedicineService from '../services/medicineService';
import NotificationService from '../services/notificationService';
import languageService from '../services/languageService';
import { A11Y_COLORS, fs, MIN_BUTTON_HEIGHT, MIN_TOUCH_HEIGHT } from '../theme/accessibility';

const t = (key, defaultValue = '') =>
  languageService.t(`screens.medicine.${key}`, defaultValue);
const tc = (key, defaultValue = '') =>
  languageService.t(`common.${key}`, defaultValue);

const toIsoDate = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDate = (dateString) => {
  const [y, m, d] = String(dateString).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const addDays = (dateString, daysToAdd) => {
  const d = parseDate(dateString);
  d.setDate(d.getDate() + daysToAdd);
  return toIsoDate(d);
};

const computeDurationDays = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 1;
};

const getDefaultTimes = (count) => {
  const safeCount = Math.max(1, Math.min(12, count));
  if (safeCount === 1) return ['08:00'];

  const times = [];
  const startHour = 8;
  const endHour = 22;
  const interval = (endHour - startHour) / (safeCount - 1);

  for (let i = 0; i < safeCount; i += 1) {
    const hour = Math.round(startHour + interval * i);
    times.push(`${String(hour).padStart(2, '0')}:00`);
  }

  return times;
};

const parseDoseFromText = (dosageText) => {
  const match = String(dosageText || '').match(/\d+(?:\.\d+)?/);
  if (!match) return '1';
  return match[0];
};

const buildDateFromTime = (timeString) => {
  const [h = 8, m = 0] = String(timeString || '08:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export default function AddMedicineScreen({ navigation, route }) {
  const userId = route?.params?.userId || 'user_123';
  const medicineId = route?.params?.medicineId;
  const isEditing = !!medicineId;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [medicineName, setMedicineName] = useState('');
  const [tabletsPerDose, setTabletsPerDose] = useState('1');
  const [timesPerDayInput, setTimesPerDayInput] = useState('1');
  const [times, setTimes] = useState(['08:00']);

  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  const [startDate, setStartDate] = useState(toIsoDate(new Date()));
  const [durationDays, setDurationDays] = useState('7');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState(0);

  const [timesModalVisible, setTimesModalVisible] = useState(false);

  const endDate = useMemo(() => {
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1) return startDate;
    return addDays(startDate, days - 1);
  }, [startDate, durationDays]);

  useEffect(() => {
    if (isEditing) {
      loadMedicineData();
    }
  }, [medicineId]);

  const loadMedicineData = async () => {
    try {
      setLoading(true);
      const medicine = await MedicineService.getMedicine(medicineId);

      setMedicineName(medicine.name || '');
      setTabletsPerDose(
        String(
          medicine.tabletsPerDose
            || parseDoseFromText(medicine.dosage)
            || 1
        )
      );

      const existingTimes =
        Array.isArray(medicine.times) && medicine.times.length > 0
          ? medicine.times
          : ['08:00'];
      setTimes(existingTimes);
      setTimesPerDayInput(String(existingTimes.length || medicine.timesPerDay || 1));

      setPurpose(medicine.purpose || '');
      setInstructions(medicine.instructions || '');
      setSideEffects(medicine.sideEffects || '');
      setPrescribedBy(medicine.prescribedBy || '');

      const existingStartDate = medicine.startDate || toIsoDate(new Date());
      setStartDate(existingStartDate);

      if (medicine.durationDays) {
        setDurationDays(String(medicine.durationDays));
      } else if (medicine.endDate) {
        setDurationDays(String(computeDurationDays(existingStartDate, medicine.endDate)));
      } else {
        setDurationDays('7');
      }
    } catch (error) {
      Alert.alert(tc('error', 'Error'), 'Failed to load medicine data');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const applyTimesPerDay = () => {
    const count = Number(timesPerDayInput);
    if (!Number.isFinite(count) || count < 1 || count > 12) {
      Alert.alert(tc('error', 'Error'), 'Times per day should be between 1 and 12');
      return;
    }

    setTimes(getDefaultTimes(count));
  };

  const updateTabletsPerDose = (delta) => {
    const current = Number.parseInt(tabletsPerDose, 10) || 1;
    const next = Math.max(1, Math.min(20, current + delta));
    setTabletsPerDose(String(next));
  };

  const updateTimesPerDay = (delta) => {
    const current = Number.parseInt(timesPerDayInput, 10) || 1;
    const next = Math.max(1, Math.min(12, current + delta));
    setTimesPerDayInput(String(next));
    setTimes(getDefaultTimes(next));
  };

  const handleAddTime = () => {
    const lastTime = times[times.length - 1] || '08:00';
    const [h, m] = lastTime.split(':').map(Number);
    const next = `${String((h + 1) % 24).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
    const nextTimes = [...times, next];
    setTimes(nextTimes);
    setTimesPerDayInput(String(nextTimes.length));
  };

  const handleRemoveTime = (index) => {
    if (times.length <= 1) {
      Alert.alert(tc('error', 'Error'), 'At least one reminder time is required');
      return;
    }

    const nextTimes = times.filter((_, i) => i !== index);
    setTimes(nextTimes);
    setTimesPerDayInput(String(nextTimes.length));
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (!selectedDate) return;

    const hh = String(selectedDate.getHours()).padStart(2, '0');
    const mm = String(selectedDate.getMinutes()).padStart(2, '0');
    const updated = [...times];
    updated[timePickerIndex] = `${hh}:${mm}`;

    const sortedUnique = [...new Set(updated)].sort();
    setTimes(sortedUnique);
    setTimesPerDayInput(String(sortedUnique.length));
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;
    setStartDate(toIsoDate(selectedDate));
  };

  const handleSubmit = async () => {
    if (!medicineName.trim()) {
      Alert.alert(tc('error', 'Error'), 'Please enter medicine name');
      return;
    }

    const doseNumber = Number(tabletsPerDose);
    if (!Number.isFinite(doseNumber) || doseNumber <= 0) {
      Alert.alert(tc('error', 'Error'), 'Please enter valid tablets per dose');
      return;
    }

    const daysNumber = Number(durationDays);
    if (!Number.isFinite(daysNumber) || daysNumber < 1 || daysNumber > 3650) {
      Alert.alert(tc('error', 'Error'), 'Please enter valid duration in days');
      return;
    }

    const uniqueTimes = [...new Set(times)].sort();
    if (uniqueTimes.length === 0) {
      Alert.alert(tc('error', 'Error'), 'Please add at least one reminder time');
      return;
    }

    try {
      setSubmitting(true);

      const medicineData = {
        name: medicineName.trim(),
        status: 'active',
        tabletsPerDose: doseNumber,
        dosage: `${doseNumber} tablet${doseNumber > 1 ? 's' : ''}`,
        timesPerDay: uniqueTimes.length,
        frequency:
          uniqueTimes.length === 1
            ? 'once_daily'
            : uniqueTimes.length === 2
            ? 'twice_daily'
            : uniqueTimes.length === 3
            ? 'thrice_daily'
            : 'custom',
        times: uniqueTimes,
        purpose: purpose.trim(),
        instructions: instructions.trim(),
        sideEffects: sideEffects.trim(),
        prescribedBy: prescribedBy.trim(),
        startDate,
        durationDays: daysNumber,
        endDate,
        daysToTake: 'daily',
      };

      if (isEditing) {
        const oldMedicine = await MedicineService.getMedicine(medicineId);
        await MedicineService.updateMedicine(medicineId, medicineData);
        await NotificationService.cancelAllReminders(oldMedicine);
        const reminders = await NotificationService.scheduleDailyReminders({
          ...oldMedicine,
          ...medicineData,
          id: medicineId,
        });
        if (!reminders.length) {
          Alert.alert(
            'Reminder Warning',
            'Medicine saved, but reminders were not scheduled. Please allow notifications in phone settings.'
          );
        }
      } else {
        const newMedicine = await MedicineService.addMedicine(userId, medicineData);
        const reminders = await NotificationService.scheduleDailyReminders(newMedicine);
        if (!reminders.length) {
          Alert.alert(
            'Reminder Warning',
            'Medicine saved, but reminders were not scheduled. Please allow notifications in phone settings.'
          );
        }
      }

      Alert.alert(
        tc('success', 'Success'),
        isEditing
          ? t('medicineUpdated', 'Medicine updated successfully!')
          : t('medicineAdded', 'Medicine added successfully!')
      );
      navigation.goBack();
    } catch (error) {
      console.error('Error saving medicine:', error);
      Alert.alert(tc('error', 'Error'), 'Failed to save medicine');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={36} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? t('editMedicine', 'Edit Medicine') : t('addMedicine', 'Add Medicine')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('medicineDetails', 'Medicine Details')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('medicineName', 'Medicine Name')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('enterMedicineName', 'Enter medicine name')}
              value={medicineName}
              onChangeText={setMedicineName}
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tablets per dose *</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => updateTabletsPerDose(-1)}>
                <Ionicons name="remove" size={24} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.stepperInput]}
                keyboardType="number-pad"
                value={tabletsPerDose}
                onChangeText={setTabletsPerDose}
                placeholder="1"
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity style={styles.stepperButton} onPress={() => updateTabletsPerDose(1)}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Times in a day *</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => updateTimesPerDay(-1)}>
                <Ionicons name="remove" size={24} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.stepperInput]}
                keyboardType="number-pad"
                value={timesPerDayInput}
                onChangeText={setTimesPerDayInput}
                placeholder="1"
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity style={styles.stepperButton} onPress={() => updateTimesPerDay(1)}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={applyTimesPerDay}>
              <Text style={styles.applyButtonText}>Apply custom times/day</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration (days) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={durationDays}
              onChangeText={setDurationDays}
              placeholder="7"
              placeholderTextColor="#aaa"
            />
            <Text style={styles.helperText}>Course end date: {endDate}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('startDate', 'Start Date')}</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.selectorText}>{startDate}</Text>
              <Ionicons name="calendar" size={26} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Reminder times</Text>
            <TouchableOpacity onPress={() => setTimesModalVisible(true)}>
              <Text style={styles.addLink}>Manage</Text>
            </TouchableOpacity>
          </View>

          {times.map((time, index) => (
            <View key={`${time}-${index}`} style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => {
                  setTimePickerIndex(index);
                  setShowTimePicker(true);
                }}
              >
                <Ionicons name="alarm" size={24} color={A11Y_COLORS.textPrimary} />
                <Text style={styles.timeText}>{time}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemoveTime(index)}>
                <Ionicons name="close-circle" size={28} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addTimeButton} onPress={handleAddTime}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.addTimeText}>{t('addTime', 'Add Time')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isEditing ? t('updateMedicine', 'Update Medicine') : t('addMedicine', 'Add Medicine')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={timesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reminder times</Text>
              <TouchableOpacity onPress={() => setTimesModalVisible(false)}>
                <Ionicons name="close" size={30} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={times}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item, index }) => (
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    style={styles.timeInput}
                    onPress={() => {
                      setTimePickerIndex(index);
                      setShowTimePicker(true);
                    }}
                  >
                    <Ionicons name="time" size={24} color={A11Y_COLORS.textPrimary} />
                    <Text style={styles.timeText}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveTime(index)}>
                    <Ionicons name="remove-circle" size={26} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
              ListFooterComponent={
                <TouchableOpacity style={styles.modalAddButton} onPress={handleAddTime}>
                  <Ionicons name="add-circle" size={26} color="#007AFF" />
                  <Text style={styles.modalAddText}>Add another time</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {showTimePicker && (
        <DateTimePicker
          value={buildDateFromTime(times[timePickerIndex])}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="light"
          textColor={A11Y_COLORS.textPrimary}
          onChange={handleTimeChange}
        />
      )}

      {showDatePicker && (
        <DateTimePicker
          value={parseDate(startDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="light"
          textColor={A11Y_COLORS.textPrimary}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: A11Y_COLORS.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: A11Y_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: A11Y_COLORS.border,
  },
  headerTitle: {
    fontSize: fs(20),
    fontWeight: 'bold',
    color: A11Y_COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'column',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: fs(14),
    fontWeight: '600',
    color: A11Y_COLORS.textPrimary,
    marginBottom: 8,
  },
  helperText: {
    marginTop: 6,
    fontSize: fs(12),
    color: A11Y_COLORS.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fs(14),
    backgroundColor: A11Y_COLORS.background,
    color: A11Y_COLORS.textPrimary,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  flexInput: {
    flex: 1,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: A11Y_COLORS.brand,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: A11Y_COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: MIN_TOUCH_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fs(12),
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: A11Y_COLORS.background,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  selectorText: {
    fontSize: fs(14),
    color: A11Y_COLORS.textPrimary,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addLink: {
    color: A11Y_COLORS.brand,
    fontSize: fs(12),
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: A11Y_COLORS.background,
    gap: 8,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  timeText: {
    fontSize: fs(14),
    color: A11Y_COLORS.textPrimary,
    fontWeight: '600',
  },
  addTimeButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  addTimeText: {
    color: A11Y_COLORS.brand,
    fontSize: fs(13),
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: A11Y_COLORS.brand,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 24,
    minHeight: MIN_BUTTON_HEIGHT,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '45%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '700',
    color: '#111',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalAddText: {
    color: A11Y_COLORS.brand,
    fontWeight: '600',
    fontSize: fs(14),
  },
});
