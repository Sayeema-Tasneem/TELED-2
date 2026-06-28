/**
 * Medicine Reminder Screen - Manage medicines and track intake
 * Main interface for viewing, adding, and managing medicines
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MedicineService from '../services/medicineService';
import NotificationService from '../services/notificationService';
import MissedMedicineAlertService from '../services/missedMedicineAlertService';
import * as Notifications from 'expo-notifications';
import i18n from '../services/languageService';
import authService from '../services/authService';
import { A11Y_COLORS, fs, MIN_BUTTON_HEIGHT, MIN_TOUCH_HEIGHT } from '../theme/accessibility';

// Delegate to languageService.t directly so both call styles are supported:
// t(key, 'default string', { ...options }) and t(key, { ...options })
const t = (...args) => i18n.t(...args);

export default function MedicineReminderScreen({ navigation, route }) {
  const userId = route?.params?.pendingScanUserId || route?.params?.userId || 'user_123';
  const pendingScanMedicineId = route?.params?.pendingScanMedicineId || null;
  const pendingScanTime = route?.params?.pendingScanTime || null;
  const pendingScanNonce = route?.params?.pendingScanNonce || null;
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationAllowed, setNotificationAllowed] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [selectedMedicineModal, setSelectedMedicineModal] = useState(null);
  const [scanModalState, setScanModalState] = useState(null);
  const [scanError, setScanError] = useState('');
  const [cameraGranted, setCameraGranted] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [lastHandledScanToken, setLastHandledScanToken] = useState(null);
  const [activeTab, setActiveTab] = useState('set');

  const today = new Date().toISOString().split('T')[0];

  const takenEntries = useMemo(() => {
    const entries = medicines.flatMap((medicine) =>
      (medicine.intakeDates || []).flatMap((entry) =>
        (entry.times || []).map((time) => ({
          medicineId: medicine.id,
          medicineName: medicine.name,
          date: entry.date,
          time,
        }))
      )
    );

    return entries.sort((a, b) => {
      const aDate = `${a.date}T${a.time || '00:00'}:00`;
      const bDate = `${b.date}T${b.time || '00:00'}:00`;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [medicines]);

  const medicinesById = useMemo(() => {
    const map = new Map();
    medicines.forEach((medicine) => map.set(String(medicine.id), medicine));
    return map;
  }, [medicines]);

  const remindersSetCount = useMemo(
    () => medicines.reduce((sum, medicine) => sum + ((medicine?.times || []).length || 0), 0),
    [medicines]
  );

  const takenTodayCount = useMemo(
    () => takenEntries.filter((entry) => entry.date === today).length,
    [takenEntries, today]
  );

  const takenTotalCount = useMemo(() => takenEntries.length, [takenEntries]);

  const isReminderEligibleMedicine = (medicine) => {
    const status = String(medicine?.status || '').toLowerCase();
    const isPausedOrInactive = ['paused', 'inactive', 'cancelled'].includes(status);
    return Array.isArray(medicine?.times) && medicine.times.length > 0 && !isPausedOrInactive;
  };

  useEffect(() => {
    loadMedicines();
    loadStatistics();
    requestNotificationPermissions();
  }, []);

  // Setup notification listeners for foreground notification handling
  useEffect(() => {
    const handleNotificationReceived = (notification) => {
      const data = notification.request.content.data;
      console.log('📬 Notification received while app in foreground:', data?.medicineName, data?.time);
      
      if (data?.type === 'medicine_reminder') {
        // Play audio alarm for foreground notifications
        NotificationService.playInAppEmergencyTone().catch(err => 
          console.warn('Failed to play alarm sound:', err?.message)
        );

        Alert.alert(
          'Medicine reminder',
          `Time to take ${data?.medicineName || 'your medicine'}${data?.time ? ` at ${data.time}` : ''}.`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Scan now',
              onPress: () => {
                navigation.navigate('MedicineReminder', {
                  pendingScanMedicineId: String(data.medicineId || ''),
                  pendingScanUserId: data.userId || userId,
                  pendingScanTime: data.time || null,
                  pendingScanNonce: Date.now(),
                });
              },
            },
          ]
        );
      }
    };

    const handleNotificationResponse = (response) => {
      const data = response.notification.request.content.data;
      console.log('👆 User tapped notification:', data?.medicineName);
      
      if (data?.medicineId && data?.type === 'medicine_reminder') {
        // Stop alarm when user taps notification
        NotificationService.stopInAppEmergencyTone().catch(err =>
          console.warn('Failed to stop alarm:', err?.message)
        );
        
        // Navigate to medicine details or mark as taken
        navigation.navigate('MedicineReminder', {
          pendingScanMedicineId: String(data.medicineId),
          pendingScanUserId: data.userId || userId,
          pendingScanTime: data.time || null,
          pendingScanNonce: Date.now(),
        });
      }
    };

    // Subscribe to incoming notifications while app is in foreground
    const notificationSubscription = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    // Subscribe to user tapping notifications
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
      NotificationService.stopInAppEmergencyTone().catch(() => {});
    };
  }, [navigation, userId]);

  const requestNotificationPermissions = async () => {
    const allowed = await NotificationService.requestPermissions();
    if (!allowed) {
      Alert.alert(
        i18n.t('notifications'),
        i18n.t('notificationPermissionRequired')
      );
    }

    // Update local status
    try {
      const status = await NotificationService.getPermissionsStatus();
      setNotificationAllowed(!!status);
    } catch (_) {
      setNotificationAllowed(Boolean(allowed));
    }

    return allowed;
  };

  const checkNotificationStatus = async () => {
    try {
      const status = await NotificationService.getPermissionsStatus();
      setNotificationAllowed(!!status);
      return status;
    } catch (error) {
      console.warn('Failed to check notification status:', error);
      return false;
    }
  };

  // Schedule missed medicine alerts for the next 30 minutes
  const scheduleMissedMedicineAlerts = async (medicines) => {
    try {
      const emergencyContact = await AsyncStorage.getItem('emergency_contact_number');
      if (!emergencyContact) {
        console.log('No emergency contact set for missed medicine alerts');
        return;
      }

      const userPhone = await authService.getPhoneNumber();
      const userName = 'Patient'; // You can enhance this to get actual user name from profile

      const today = new Date().toISOString().split('T')[0];

      medicines.forEach((medicine) => {
        if (!isReminderEligibleMedicine(medicine)) return;

        (medicine.times || []).forEach((time) => {
          MissedMedicineAlertService.scheduleMissedMedicineAlert(
            medicine.id,
            medicine.name,
            time,
            emergencyContact,
            userName,
            userPhone
          );
        });
      });
    } catch (error) {
      console.error('Error scheduling missed medicine alerts:', error);
    }
  };

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const userMedicines = await MedicineService.getUserMedicines(userId);
      setMedicines(userMedicines);

      const activeMedicines = userMedicines.filter(isReminderEligibleMedicine);
      await NotificationService.syncMedicineReminderList(activeMedicines);

      // Schedule missed medicine alerts for caregiver notification
      await scheduleMissedMedicineAlerts(activeMedicines);

      // Also refresh permission flag when loading medicines
      checkNotificationStatus().catch(() => {});


    } catch (error) {
      console.error('Error loading medicines:', error);
      Alert.alert(t('common.error'), error?.message || t('screens.medicine.failedToConnect'));
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await MedicineService.getMedicineStatistics(userId);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicines();
    await loadStatistics();
    setRefreshing(false);
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicineScreen', { userId });
  };

  const handleClearAllReminderNotifications = () => {
    Alert.alert(
      t('screens.medicine.confirm'),
      t('screens.medicine.clearAllConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.medicine.clear'),
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.cancelAllNotifications();
              Alert.alert(t('common.success'), t('screens.medicine.allReminderNotificationsCleared'));
            } catch (error) {
              Alert.alert(t('common.error'), t('screens.medicine.failedToClearReminderNotifications'));
            }
          },
        },
      ]
    );
  };



  const openScanModal = async (medicine, time) => {
    await NotificationService.stopInAppEmergencyTone();
    setScanError('');
    let granted = cameraGranted;
    if (!granted) {
      const current = await Camera.getCameraPermissionsAsync();
      if (current.granted) {
        granted = true;
      } else {
        const asked = await Camera.requestCameraPermissionsAsync();
        granted = asked.granted;
      }
      setCameraGranted(granted);
    }
    setScanModalState({ medicine, time });
    setScanProcessing(false);
  };

  useEffect(() => {
    if (!scanModalState) return;
    NotificationService.stopInAppEmergencyTone().catch(() => {});
  }, [scanModalState]);

  useEffect(() => {
    if (!pendingScanMedicineId || !medicines?.length) {
      return;
    }

    const target = medicines.find(
      (m) => String(m.id) === String(pendingScanMedicineId)
    );
    if (!target) {
      return;
    }

    const scanToken = `${pendingScanMedicineId}_${pendingScanTime || ''}_${pendingScanNonce || ''}`;
    if (scanToken === lastHandledScanToken) {
      return;
    }

    setLastHandledScanToken(scanToken);
    openScanModal(target, pendingScanTime);
    navigation.setParams?.({
      pendingScanMedicineId: null,
      pendingScanTime: null,
      pendingScanNonce: null,
    });
  }, [
    pendingScanMedicineId,
    pendingScanTime,
    pendingScanNonce,
    medicines,
    lastHandledScanToken,
    navigation,
  ]);

  const handleMarkAsTaken = async (medicine, time) => {
    await openScanModal(medicine, time);
  };

  const recordIntakeForMedicine = async (medicine, time) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await MedicineService.recordIntake(medicine.id, today, time);
      
      Alert.alert(
        i18n.t('success'),
        `${i18n.t('intakeRecorded')} ${medicine.name}`
      );
      
      loadMedicines();
      loadStatistics();
    } catch (error) {
      console.error(`[MedicineReminder] Error recording intake:`, error);
      const errorMessage = error?.message || t('screens.medicine.failedToRecordIntake');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const normalizeForScanValidation = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const hasTabletForm = (medicine) => {
    const normalizedName = normalizeForScanValidation(medicine?.name);
    const normalizedDosage = normalizeForScanValidation(medicine?.dosage);
    const combinedText = `${normalizedName} ${normalizedDosage}`;
    const hasExplicitTabletText = /\btab(?:let)?s?\b/.test(combinedText);
    const hasNonTabletText = /\b(capsule|capsules|syrup|suspension|injection|drops?|ointment|gel|powder|cream|solution|spray|lotion|liquid|inhaler)\b/.test(combinedText);
    const hasTabletDoseField = Number(medicine?.tabletsPerDose) > 0;

    return !hasNonTabletText && (hasExplicitTabletText || hasTabletDoseField);
  };

  const handleVerifyScannedItem = async () => {
    if (!scanModalState || scanProcessing) return;

    setScanProcessing(true);
    await NotificationService.stopInAppEmergencyTone();
    const { medicine, time } = scanModalState;
    setScanModalState(null);
    setScanError('');
    await NotificationService.cancelMedicineTimeReminders(medicine.id, time);
    // Cancel the missed medicine alert since medicine was taken
    MissedMedicineAlertService.cancelMissedMedicineAlert(medicine.id, time);
    await recordIntakeForMedicine(medicine, time);
    setScanProcessing(false);
  };

  const handleTogglePause = async (medicine) => {
    try {
      if (medicine.status === 'active') {
        await MedicineService.pauseMedicine(medicine.id);
        await NotificationService.cancelAllReminders(medicine);
        // Cancel all missed medicine alerts for this medicine
        (medicine.times || []).forEach((time) => {
          MissedMedicineAlertService.cancelMissedMedicineAlert(medicine.id, time);
        });
      } else if (medicine.status === 'paused') {
        await MedicineService.resumeMedicine(medicine.id);
        await NotificationService.scheduleDailyReminders(medicine);
        // Reschedule missed medicine alerts when resuming
        await scheduleMissedMedicineAlerts([medicine]);
      }

      Alert.alert(t('common.success'), t('screens.medicine.medicineStatusUpdated'));
      loadMedicines();
    } catch (error) {
      Alert.alert(t('common.error'), t('screens.medicine.failedToUpdateMedicineStatus'));
    }
  };

  const handleDeleteMedicine = (medicine) => {
    Alert.alert(
      i18n.t('confirm'),
      `${i18n.t('deleteConfirm')} ${medicine.name}?`,
      [
        { text: i18n.t('cancel'), onPress: () => {} },
        {
          text: i18n.t('delete'),
          onPress: async () => {
            try {
              await NotificationService.cancelAllReminders(medicine);
              // Cancel all missed medicine alerts for this medicine
              (medicine.times || []).forEach((time) => {
                MissedMedicineAlertService.cancelMissedMedicineAlert(medicine.id, time);
              });
              await MedicineService.deleteMedicine(medicine.id);
              Alert.alert(t('common.success'), t('screens.medicine.medicineDeleted'));
              loadMedicines();
            } catch (error) {
              Alert.alert(t('common.error'), t('screens.medicine.failedToDeleteMedicine'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

    const openAppNotificationSettings = async () => {
      try {
        // On most platforms this opens the app settings where notifications can be toggled
        await Linking.openSettings();
      } catch (error) {
        console.warn('Failed to open settings:', error);
        Alert.alert(t('screens.medicine.settings'), t('screens.medicine.unableToOpenSettings'));
      }
    };

    const renderNotificationHelper = () => {
      if (notificationAllowed) return null;

      return (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>{t('screens.medicine.notificationsDisabled')}</Text>
          <View style={styles.permissionActions}>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={async () => {
                const granted = await requestNotificationPermissions();
                if (granted) {
                  await NotificationService.syncMedicineReminderList(medicines.filter(isReminderEligibleMedicine));
                  Alert.alert(t('common.success'), t('screens.medicine.notificationsEnabledAndSynced'));
                } else {
                  openAppNotificationSettings();
                }
              }}
            >
              <Text style={styles.permissionButtonText}>{t('screens.medicine.enableNotifications')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionLink} onPress={openAppNotificationSettings}>
              <Text style={styles.permissionLinkText}>{t('screens.medicine.openSettings')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };

  const renderMedicineCard = ({ item: medicine }) => {
    const todayIntakes = medicine.intakeDates.find((d) => d.date === today)?.times || [];

    return (
      <TouchableOpacity
        key={medicine.id}
        style={[
          styles.medicineCard,
          medicine.status === 'paused' && styles.pausedCard,
        ]}
        onPress={() => setSelectedMedicineModal(medicine)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <Text style={styles.dosage}>{medicine.dosage}</Text>
            {medicine.purpose && (
              <Text style={styles.purpose}>{medicine.purpose}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(medicine.status) }]}>
            <Text style={styles.statusText}>{medicine.status.charAt(0).toUpperCase() + medicine.status.slice(1)}</Text>
          </View>
        </View>

        {medicine.status === 'active' && (
          <View style={styles.timesContainer}>
            <Text style={styles.timesLabel}>{t('screens.medicine.schedule')}:</Text>
            <View style={styles.timePills}>
              {medicine.times.map((time) => {
                const isTaken = todayIntakes.includes(time);
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timePill, isTaken && styles.takenPill]}
                    onPress={() => handleMarkAsTaken(medicine, time)}
                  >
                    <Ionicons
                      name={isTaken ? 'checkmark-circle' : 'alarm'}
                      size={24}
                      color={isTaken ? '#fff' : '#666'}
                    />
                    <Text style={[styles.timeText, isTaken && styles.takenText]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddMedicineScreen', { medicineId: medicine.id, userId })}
          >
            <Ionicons name="pencil" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleTogglePause(medicine)}
          >
            <Ionicons
              name={medicine.status === 'active' ? 'pause' : 'play'}
              size={24}
              color="#FF9500"
            />
            <Text style={styles.actionText}>
              {medicine.status === 'active' ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => handleDeleteMedicine(medicine)}
          >
            <Ionicons name="trash" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'paused':
        return '#FF9500';
      case 'completed':
        return '#8E8E93';
      default:
        return '#007AFF';
    }
  };

  const StatView = () => {
    if (!statistics) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statistics.activeMedicines}</Text>
          <Text style={styles.statLabel}>{t('screens.medicine.active')}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.totalIntakeRow}>
            <Text style={styles.statValue}>{statistics.totalIntakes}</Text>
            <TouchableOpacity
              style={styles.addMiniButton}
              onPress={handleAddMedicine}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.statLabel}>{t('screens.medicine.totalIntakes')}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('screens.medicine.remindersPageTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.topActionsRow}>
        <TouchableOpacity style={styles.clearNotificationsButton} onPress={handleClearAllReminderNotifications}>
          <Ionicons name="notifications-off" size={20} color="#fff" />
          <Text style={styles.clearNotificationsText}>{t('screens.medicine.clearReminderNotifications')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'set' && styles.tabButtonActive]}
          onPress={() => setActiveTab('set')}
        >
          <Text style={[styles.tabText, activeTab === 'set' && styles.tabTextActive]}>
            {t('screens.medicine.remindersSet', { count: remindersSetCount })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'taken' && styles.tabButtonActive]}
          onPress={() => setActiveTab('taken')}
        >
          <Text style={[styles.tabText, activeTab === 'taken' && styles.tabTextActive]}>
            {t('screens.medicine.takenSummary', {
              todayCount: takenTodayCount,
              totalCount: takenTotalCount,
            })}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {statistics && <StatView />}

        {activeTab === 'set' && medicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={84} color="#D0D0D0" />
            <Text style={styles.emptyText}>{t('screens.medicine.noMedicinesAddedYet')}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddMedicine}
            >
              <Text style={styles.emptyButtonText}>{t('screens.medicine.addMedicine')}</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'set' ? (
          <FlatList
            data={medicines}
            renderItem={renderMedicineCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.medicinesList}
          />
        ) : takenEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done" size={84} color="#D0D0D0" />
            <Text style={styles.emptyText}>{t('screens.medicine.noIntakeRecordedYet')}</Text>
          </View>
        ) : (
          <View style={styles.takenList}>
            {takenEntries.map((entry, idx) => (
              <View key={`${entry.medicineId}_${entry.date}_${entry.time}_${idx}`} style={styles.takenCard}>
                <View style={styles.takenRow}>
                  <View style={styles.takenLeft}>
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    <View>
                      <Text style={styles.takenName}>{entry.medicineName}</Text>
                        <Text style={styles.takenMeta}>
                          {t('screens.medicine.takenOn', { date: entry.date, time: entry.time })}
                        </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.takenEditButton}
                    onPress={() => {
                      const med = medicinesById.get(String(entry.medicineId));
                      if (!med) return;
                      navigation.navigate('AddMedicineScreen', {
                        medicineId: med.id,
                        userId,
                      });
                    }}
                  >
                    <Ionicons name="pencil" size={18} color="#007AFF" />
                    <Text style={styles.takenEditText}>{t('screens.medicine.edit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Medicine Details Modal */}
      <Modal
        visible={!!selectedMedicineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMedicineModal(null)}
      >
        {selectedMedicineModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedMedicineModal.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMedicineModal(null)}>
                  <Ionicons name="close" size={30} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('screens.medicine.dosage')}:</Text>
                  <Text style={styles.detailValue}>
                    {selectedMedicineModal.dosage}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('screens.medicine.frequency')}:</Text>
                  <Text style={styles.detailValue}>
                    {selectedMedicineModal.frequency}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('screens.medicine.schedule')}:</Text>
                  <View style={styles.timesList}>
                    {selectedMedicineModal.times.map((time) => (
                      <Text key={time} style={styles.timeItem}>
                        • {time}
                      </Text>
                    ))}
                  </View>
                </View>

                {selectedMedicineModal.purpose && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('screens.medicine.purpose')}:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMedicineModal.purpose}
                    </Text>
                  </View>
                )}

                {selectedMedicineModal.instructions && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('screens.medicine.instructions')}:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMedicineModal.instructions}
                    </Text>
                  </View>
                )}

                {selectedMedicineModal.sideEffects && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('screens.medicine.sideEffects')}:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMedicineModal.sideEffects}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setSelectedMedicineModal(null)}
              >
                <Text style={styles.closeModalButtonText}>{t('screens.medicine.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={!!scanModalState}
        animationType="slide"
        onRequestClose={() => setScanModalState(null)}
      >
        <View style={styles.scanContainer}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanTitle}>{t('screens.medicine.showYourMedicine')}</Text>
            <TouchableOpacity onPress={() => setScanModalState(null)}>
              <Ionicons name="close" size={30} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.scanSubtitle}>
            {scanModalState?.medicine?.name} • {scanModalState?.time}
          </Text>

          {!cameraGranted ? (
            <View style={styles.scanPermissionBox}>
              <Text style={styles.scanInfoText}>{t('screens.medicine.cameraPermissionRequired')}</Text>
              <TouchableOpacity style={styles.scanPrimaryButton} onPress={async () => {
                const result = await Camera.requestCameraPermissionsAsync();
                setCameraGranted(result.granted);
              }}>
                <Text style={styles.scanPrimaryButtonText}>{t('screens.medicine.allowCamera')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.cameraView}
                facing="back"
                barcodeScannerEnabled={false}
                onCameraReady={() => {
                  NotificationService.stopInAppEmergencyTone().catch(() => {});
                }}
              />
            </View>
          )}

          <Text style={styles.scanHintText}>
            {t('screens.medicine.scanHint')}
          </Text>

          <TouchableOpacity
            style={[styles.scanConfirmButton, scanProcessing && styles.submitButtonDisabled]}
            onPress={handleVerifyScannedItem}
            disabled={scanProcessing}
          >
            {scanProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.scanConfirmButtonText}>{t('screens.medicine.verify')}</Text>
              </>
            )}
          </TouchableOpacity>

          {!!scanError && <Text style={styles.scanErrorText}>{scanError}</Text>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: A11Y_COLORS.surface,
  },
  debugControlsWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  debugButton: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  debugButtonNeutral: {
    borderColor: '#999',
  },
  debugButtonDanger: {
    borderColor: '#c33',
  },
  debugButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  debugButtonTextDanger: {
    color: '#c33',
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
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: fs(24),
    fontWeight: 'bold',
    color: A11Y_COLORS.textPrimary,
  },
  addButton: {
    minHeight: MIN_TOUCH_HEIGHT,
    minWidth: MIN_TOUCH_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: MIN_TOUCH_HEIGHT,
  },
  topActionsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  clearNotificationsButton: {
    minHeight: MIN_TOUCH_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clearNotificationsText: {
    color: '#fff',
    fontSize: fs(13),
    fontWeight: '700',
  },
  

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: MIN_TOUCH_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: A11Y_COLORS.brand,
    borderColor: A11Y_COLORS.brand,
  },
  tabText: {
    fontSize: fs(14),
    fontWeight: '700',
    color: A11Y_COLORS.textPrimary,
  },
  tabTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: fs(20),
    fontWeight: 'bold',
    color: A11Y_COLORS.brand,
  },
  totalIntakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addMiniButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: A11Y_COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: fs(12),
    color: A11Y_COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  medicinesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  takenList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  takenCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8eef8',
  },
  takenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  takenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  takenEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MIN_TOUCH_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b8d5ff',
    backgroundColor: '#eef5ff',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  takenEditText: {
    color: '#007AFF',
    fontSize: fs(12),
    fontWeight: '700',
  },
  takenName: {
    fontSize: fs(15),
    fontWeight: '700',
    color: A11Y_COLORS.textPrimary,
  },
  takenMeta: {
    marginTop: 2,
    fontSize: fs(12),
    color: A11Y_COLORS.textSecondary,
    fontWeight: '600',
  },
  medicineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  permissionBanner: {
    backgroundColor: '#FFF4E5',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  permissionText: {
    color: '#7A4A00',
    fontSize: fs(13),
    marginBottom: 8,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  permissionButton: {
    backgroundColor: A11Y_COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  permissionLink: {
    marginLeft: 12,
  },
  permissionLinkText: {
    color: A11Y_COLORS.brand,
    textDecorationLine: 'underline',
  },
  pausedCard: {
    borderLeftColor: '#FF9500',
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: fs(18),
    fontWeight: '600',
    color: A11Y_COLORS.textPrimary,
    marginBottom: 4,
  },
  dosage: {
    fontSize: fs(14),
    color: A11Y_COLORS.textSecondary,
    marginBottom: 4,
  },
  purpose: {
    fontSize: fs(12),
    color: A11Y_COLORS.textMuted,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  timesContainer: {
    marginBottom: 12,
  },
  timesLabel: {
    fontSize: fs(12),
    fontWeight: '600',
    color: A11Y_COLORS.textSecondary,
    marginBottom: 8,
  },
  timePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  takenPill: {
    backgroundColor: '#34C759',
  },
  timeText: {
    fontSize: fs(13),
    fontWeight: '500',
    color: '#333',
  },
  takenText: {
    color: '#fff',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_HEIGHT,
    borderRadius: 8,
    backgroundColor: A11Y_COLORS.background,
    gap: 4,
  },
  dangerButton: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  actionText: {
    fontSize: fs(12),
    color: A11Y_COLORS.brand,
    fontWeight: '500',
  },
  dangerText: {
    color: '#FF3B30',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: fs(16),
    color: A11Y_COLORS.textMuted,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: A11Y_COLORS.brand,
    borderRadius: 8,
    minHeight: MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: fs(20),
    fontWeight: 'bold',
    color: '#000',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: fs(12),
    fontWeight: '600',
    color: A11Y_COLORS.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: fs(14),
    color: A11Y_COLORS.textPrimary,
  },
  timesList: {
    marginTop: 4,
  },
  timeItem: {
    fontSize: fs(14),
    color: A11Y_COLORS.textPrimary,
    marginBottom: 4,
  },
  closeModalButton: {
    backgroundColor: A11Y_COLORS.brand,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    minHeight: MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fs(16),
  },
  scanContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scanTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    color: A11Y_COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  scanSubtitle: {
    fontSize: fs(14),
    color: A11Y_COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  cameraWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
  },
  cameraView: {
    width: '100%',
    height: 380,
  },
  scanPermissionBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
  },
  scanInfoText: {
    color: A11Y_COLORS.textSecondary,
    fontSize: fs(14),
    textAlign: 'center',
  },
  scanPrimaryButton: {
    backgroundColor: A11Y_COLORS.brand,
    borderRadius: 8,
    minHeight: MIN_TOUCH_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanPrimaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fs(14),
  },
  scanErrorText: {
    marginTop: 12,
    color: '#d93025',
    fontSize: fs(13),
    fontWeight: '600',
  },
  scanHintText: {
    marginTop: 10,
    color: A11Y_COLORS.textMuted,
    fontSize: fs(12),
    lineHeight: 18,
  },
  scanConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a7a4a',
    borderRadius: 12,
    minHeight: MIN_TOUCH_HEIGHT + 8,
    marginTop: 16,
    gap: 8,
    paddingHorizontal: 16,
  },
  scanConfirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fs(16),
  },
});
