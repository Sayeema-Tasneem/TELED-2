/**
 * Notification Service - Local push notifications for medicine reminders
 * Uses expo-notifications for cross-platform notification support
 */

import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const MEDICINE_ALARM_CHANNEL_ID = 'medicine-alarm-v2';
const IN_APP_ALARM_URI =
  'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
const MEDICINE_ALARM_RING_MS = 10000;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  static scheduleMap = new Map(); // Track scheduled notifications
  static activeAlarmSounds = [];
  static alarmStopTimer = null;
  static veryLoudModeEnabled = false;

  static setVeryLoudMode(enabled) {
    NotificationService.veryLoudModeEnabled = !!enabled;
    return NotificationService.veryLoudModeEnabled;
  }

  static isVeryLoudModeEnabled() {
    return !!NotificationService.veryLoudModeEnabled;
  }

  static async stopInAppEmergencyTone() {
    try {
      if (NotificationService.alarmStopTimer) {
        clearTimeout(NotificationService.alarmStopTimer);
        NotificationService.alarmStopTimer = null;
      }

      if (NotificationService.activeAlarmSounds.length > 0) {
        for (const sound of NotificationService.activeAlarmSounds) {
          try {
            await sound.stopAsync();
          } catch (_) {
            // Ignore stop failures
          }
          try {
            await sound.unloadAsync();
          } catch (_) {
            // Ignore unload failures
          }
        }
        NotificationService.activeAlarmSounds = [];
      }
    } catch (error) {
      console.warn('Error stopping in-app emergency tone:', error?.message || error);
    }
  }

  static async playInAppEmergencyTone(durationMs = null) {
    try {
      await NotificationService.stopInAppEmergencyTone();

      const isVeryLoud = NotificationService.isVeryLoudModeEnabled();
      const computedDurationMs = MEDICINE_ALARM_RING_MS;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      const layers = isVeryLoud
        ? [
            { volume: 1.0, positionMillis: 0 },
            { volume: 1.0, positionMillis: 120 },
            { volume: 0.95, positionMillis: 260 },
          ]
        : [
            { volume: 1.0, positionMillis: 0 },
            { volume: 0.9, positionMillis: 180 },
          ];

      const loadedSounds = [];
      for (const layer of layers) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: IN_APP_ALARM_URI },
          {
            shouldPlay: true,
            isLooping: true,
            volume: layer.volume,
            positionMillis: layer.positionMillis,
          }
        );
        loadedSounds.push(sound);
      }

      NotificationService.activeAlarmSounds = loadedSounds;
      NotificationService.alarmStopTimer = setTimeout(() => {
        NotificationService.stopInAppEmergencyTone().catch(() => {});
      }, computedDurationMs);
    } catch (error) {
      console.warn('In-app emergency tone failed:', error?.message || error);
    }
  }

  static matchesMedicineNotification(notificationLike, medicine) {
    const medicineId = String(medicine?.id || '');
    const medicineName = String(medicine?.name || '').trim().toLowerCase();
    const content = notificationLike?.content || notificationLike?.request?.content || {};
    const data = content?.data || {};
    const body = String(content?.body || '').toLowerCase();
    const dataMedicineId = String(data?.medicineId || '');

    if (medicineId && dataMedicineId && medicineId === dataMedicineId) {
      return true;
    }

    if (medicineName && body.includes(medicineName)) {
      return true;
    }

    return false;
  }

  /**
   * Ensure Android channel exists for scheduled reminders
   */
  static async ensureReminderChannel() {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.deleteNotificationChannelAsync(MEDICINE_ALARM_CHANNEL_ID);
    } catch (_) {
      // Safe no-op if channel doesn't exist yet
    }

    await Notifications.setNotificationChannelAsync(MEDICINE_ALARM_CHANNEL_ID, {
      name: 'Medicine Alarm',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 600, 200, 600, 200, 600, 200, 600],
      lightColor: '#FF0000',
      sound: 'default',
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
      },
      enableVibrate: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      const finalStatus = status;
      if (finalStatus === 'granted') {
        await NotificationService.ensureReminderChannel();
      }
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Schedule a medicine reminder
   * @param {string} medicineId - Medicine ID
   * @param {string} medicineName - Name of medicine
   * @param {string} time - Time in HH:MM format
   * @param {string|null} dateString - YYYY-MM-DD for one-time schedule, null for daily repeat
   */
  static async scheduleMedicineReminder(medicineId, medicineName, time, dateString = null, userId = null) {
    try {
      await NotificationService.ensureReminderChannel();

      const [hours, minutes] = time.split(':').map(Number);

      let trigger;
      if (dateString) {
        const triggerDate = new Date(`${dateString}T${time}:00`);
        if (Number.isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
          return null;
        }
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
        };
      } else {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
        };
      }

      const notification = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${time} • ${medicineName}`,
          body: `Please scan ${medicineName} to confirm intake`,
          data: {
            medicineId,
            medicineName,
            userId,
            time,
            dateString,
            type: 'medicine_reminder',
            reminderStage: 'primary',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          interruptionLevel: 'timeSensitive',
        },
        trigger,
      });

      // Track notification
      const key = `${medicineId}_${time}_${dateString || 'repeat'}_primary`;
      NotificationService.scheduleMap.set(key, notification);

      console.log(`Medicine reminder scheduled: ${medicineName} at ${time}`);
      return notification;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return null;
    }
  }

  static async scheduleEscalationReminders(medicine, time, dateString) {
    try {
      if (!medicine?.id || !medicine?.name) {
        return [];
      }

      await NotificationService.ensureReminderChannel();
      const [hours, minutes] = String(time).split(':').map(Number);
      let baseDate = null;
      if (dateString) {
        baseDate = new Date(`${dateString}T00:00:00`);
        if (Number.isNaN(baseDate.getTime())) {
          return [];
        }
      }

      // Total alarm rings per dose: 3 (primary + 2 follow-ups)
      const levels = [2, 4];
      const ids = [];
      for (let idx = 0; idx < levels.length; idx += 1) {
        const offsetMinutes = levels[idx];
        const totalMinutes = minutes + offsetMinutes;
        const escHour = (hours + Math.floor(totalMinutes / 60)) % 24;
        const escMinute = ((totalMinutes % 60) + 60) % 60;

        let trigger;
        if (dateString) {
          const triggerDate = new Date(baseDate);
          triggerDate.setHours(escHour, escMinute, 0, 0);
          if (triggerDate <= new Date()) {
            continue;
          }
          trigger = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
          };
        } else {
          trigger = {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: escHour,
            minute: escMinute,
            ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
          };
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${time} • ${medicine.name}`,
            body: `Please scan ${medicine.name} now to confirm intake`,
            data: {
              medicineId: medicine.id,
              medicineName: medicine.name,
              time,
              dateString,
              type: 'medicine_reminder',
              reminderStage: `followup_${idx + 1}`,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            interruptionLevel: 'timeSensitive',
          },
          trigger,
        });

        const key = `${medicine.id}_${time}_${dateString || 'repeat'}_followup_${idx + 1}`;
        NotificationService.scheduleMap.set(key, notificationId);
        ids.push(notificationId);
      }

      return ids;
    } catch (error) {
      console.error('Error scheduling escalation reminders:', error);
      return [];
    }
  }

  /**
   * Schedule daily medicine reminders
   * @param {object} medicine - Medicine object
   */
  static async scheduleDailyReminders(medicine) {
    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permission not granted. Skipping reminder scheduling.');
        return [];
      }

      const reminders = [];

      // Schedule notification for each time the medicine should be taken
      if (medicine.times && Array.isArray(medicine.times)) {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const startDate = medicine.startDate && medicine.startDate > todayString
          ? medicine.startDate
          : todayString;

        let endDate = medicine.endDate || null;
        if (!endDate && medicine.durationDays) {
          const start = new Date(`${medicine.startDate || todayString}T00:00:00`);
          start.setDate(start.getDate() + Number(medicine.durationDays) - 1);
          endDate = start.toISOString().split('T')[0];
        }

        if (endDate) {
          const start = new Date(`${startDate}T00:00:00`);
          const end = new Date(`${endDate}T00:00:00`);
          const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
          const safeDays = Math.min(Math.max(totalDays, 0), 365);

          for (let offset = 0; offset < safeDays; offset += 1) {
            const d = new Date(start);
            d.setDate(d.getDate() + offset);
            const dateString = d.toISOString().split('T')[0];

            for (const time of medicine.times) {
              const notificationId = await NotificationService.scheduleMedicineReminder(
                medicine.id,
                medicine.name,
                time,
                dateString,
                medicine.userId || null
              );
              if (notificationId) {
                reminders.push(notificationId);
                const escalationIds = await NotificationService.scheduleEscalationReminders(medicine, time, dateString);
                reminders.push(...escalationIds);
              }
            }
          }
        } else {
          for (const time of medicine.times) {
            const notificationId = await NotificationService.scheduleMedicineReminder(
              medicine.id,
              medicine.name,
              time,
                null,
                medicine.userId || null
            );
            if (notificationId) {
              reminders.push(notificationId);
              const escalationIds = await NotificationService.scheduleEscalationReminders(medicine, time, null);
              reminders.push(...escalationIds);
            }
          }
        }
      }

      return reminders;
    } catch (error) {
      console.error('Error scheduling daily reminders:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled reminder
   * @param {string} medicineId - Medicine ID
   * @param {string} time - Time in HH:MM format
   */
  static async cancelReminder(medicineId, time) {
    try {
      const key = `${medicineId}_${time}`;
      const notificationId = NotificationService.scheduleMap.get(key);

      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        NotificationService.scheduleMap.delete(key);
        console.log(`Reminder cancelled: ${medicineId} at ${time}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      return false;
    }
  }

  /**
   * Cancel all reminders for a medicine
   * @param {object} medicine - Medicine object
   */
  static async cancelAllReminders(medicine) {
    try {
      const cancelled = [];

      if (!medicine?.id) return cancelled;

      // Cancel in-memory tracked IDs first
      for (const [key, notificationId] of NotificationService.scheduleMap.entries()) {
        if (key.startsWith(`${medicine.id}_`)) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          NotificationService.scheduleMap.delete(key);
          cancelled.push(notificationId);
        }
      }

      // Also cancel any scheduled notifications persisted by Expo for this medicine
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of scheduled) {
        if (NotificationService.matchesMedicineNotification(item, medicine)) {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
          cancelled.push(item.identifier);
        }
      }

      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const item of presented) {
        if (NotificationService.matchesMedicineNotification(item, medicine)) {
          await Notifications.dismissNotificationAsync(item.request.identifier);
          cancelled.push(item.request.identifier);
        }
      }

      return cancelled;
    } catch (error) {
      console.error('Error cancelling all reminders:', error);
      return [];
    }
  }

  /**
   * Send instant notification (no scheduling)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data
   */
  static async sendInstantNotification(title, body, data = {}) {
    try {
      await NotificationService.ensureReminderChannel();

      const isMedicineAlarmTest =
        String(data?.type || '').toLowerCase() === 'medicine_alarm_test';

      if (isMedicineAlarmTest) {
        NotificationService.playInAppEmergencyTone().catch(() => {});
      }

      const trigger =
        Platform.OS === 'android' && isMedicineAlarmTest
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(Date.now() + 1200),
              channelId: MEDICINE_ALARM_CHANNEL_ID,
            }
          : null;

      const notification = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'instant',
            ...data,
          },
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
          priority: Notifications.AndroidNotificationPriority.MAX,
          interruptionLevel: 'timeSensitive',
        },
        trigger,
      });

      return notification;
    } catch (error) {
      console.error('Error sending instant notification:', error);
      return null;
    }
  }

  /**
   * Setup notification listeners
   * @param {function} onNotificationReceived - Callback when notification received
   * @param {function} onNotificationTapped - Callback when notification tapped
   */
  static setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    try {
      // Listen for incoming notifications
      const receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        }
      );

      // Listen for notification taps
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          if (onNotificationTapped) {
            onNotificationTapped(response.notification.request.content.data);
          }
        }
      );

      return {
        receivedSubscription,
        responseSubscription,
        unsubscribe: () => {
          receivedSubscription.remove();
          responseSubscription.remove();
        },
      };
    } catch (error) {
      console.error('Error setting up listeners:', error);
      return null;
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Cancel all scheduled and presented notifications for a specific medicine+time slot.
   * Called after successful scan to stop the alarm and all follow-up reminders.
   */
  static async cancelMedicineTimeReminders(medicineId, time) {
    try {
      const id = String(medicineId);

      // Cancel in-memory tracked notifications for this medicine+time
      for (const [key, notifId] of Array.from(NotificationService.scheduleMap.entries())) {
        if (key.startsWith(`${id}_${time}_`)) {
          try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch (_) {}
          NotificationService.scheduleMap.delete(key);
        }
      }

      // Cancel any other scheduled notifications for this medicine+time
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of scheduled) {
        const data = item.content?.data || {};
        if (String(data.medicineId) === id && data.time === time) {
          try { await Notifications.cancelScheduledNotificationAsync(item.identifier); } catch (_) {}
        }
      }

      // Dismiss any already-shown (presented) notifications for this medicine+time
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const item of presented) {
        const data = item.request?.content?.data || {};
        if (String(data.medicineId) === id && data.time === time) {
          try { await Notifications.dismissNotificationAsync(item.request.identifier); } catch (_) {}
        }
      }
    } catch (error) {
      console.error('Error cancelling medicine time reminders:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      NotificationService.scheduleMap.clear();
      console.log('All notifications cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      return false;
    }
  }

  /**
   * Send take medicine now notification
   * @param {object} medicine - Medicine object
   */
  static async sendTakeMedicineNow(medicine) {
    return NotificationService.sendInstantNotification(
      '💊 Time for Medicine!',
      `Take ${medicine.name} - ${medicine.dosage}`,
      {
        medicineId: medicine.id,
        medicine: medicine.name,
        type: 'medicine_reminder',
      }
    );
  }

  /**
   * Send adherence reminder
   * @param {string} medicineName - Name of medicine
   * @param {number} missedDays - Number of days missed
   */
  static async sendAdherenceReminder(medicineName, missedDays) {
    return NotificationService.sendInstantNotification(
      '⚠️ Medicine Reminder',
      `You missed ${missedDays} days of ${medicineName}. Please take it today.`,
      {
        type: 'adherence_reminder',
      }
    );
  }

  /**
   * Send notification when equipment is close to the user.
   */
  static async sendNearbyEquipmentAlert(equipment) {
    return NotificationService.sendInstantNotification(
      '📍 Equipment Nearby',
      `${equipment.name} is ${equipment.distance?.toFixed?.(1) || 'nearby'} km away at ${equipment.providerName}`,
      {
        type: 'equipment_nearby',
        equipmentId: equipment.id,
      }
    );
  }

  /**
   * Send booking confirmation for equipment slots.
   */
  static async sendEquipmentBookingConfirmation(equipment, slot) {
    return NotificationService.sendInstantNotification(
      '✅ Equipment Booked',
      `${equipment.name} booked for ${slot.date} at ${slot.startTime}`,
      {
        type: 'equipment_booking',
        equipmentId: equipment.id,
        slotId: slot.id,
      }
    );
  }

  /**
   * Schedule three-tier appointment notifications:
   * 1. Instant: Appointment booked confirmation
   * 2. 10 min before: Reminder to join
   * 3. At appointment time: Final join alert with doctor name
   */
  static async scheduleAppointmentNotifications(appointmentData) {
    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permission not granted. Skipping appointment notification scheduling.');
        return [];
      }

      const {
        appointmentId,
        patientName,
        doctorName,
        appointmentDate,
        appointmentTime,
      } = appointmentData;

      if (!appointmentDate || !appointmentTime) {
        console.warn('Missing appointment date or time for notification scheduling.');
        return [];
      }

      const notificationIds = [];

      // Parse appointment time
      const [time, modifier = 'AM'] = String(appointmentTime).split(' ');
      const [hourString = '0', minuteString = '00'] = String(time || '00:00').split(':');
      let hours = Number(hourString);
      const minutes = Number(minuteString);

      if (modifier.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      }
      if (modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }

      const appointmentDateObj = new Date(`${appointmentDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      if (Number.isNaN(appointmentDateObj.getTime())) {
        console.warn('Invalid appointment date/time for notification scheduling.');
        return [];
      }

      // 1. Instant: Booking confirmation
      const bookingNotif = await NotificationService.sendInstantNotification(
        '✅ Appointment Booked!',
        `Your appointment with Dr. ${doctorName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
        {
          type: 'appointment_booked',
          appointmentId,
          patientName,
          doctorName,
        }
      );
      if (bookingNotif) {
        notificationIds.push(bookingNotif);
      }

      // 2. 10 minutes before appointment
      const reminderDate = new Date(appointmentDateObj.getTime() - 10 * 60 * 1000);
      if (reminderDate > new Date()) {
        const reminderTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
        };

        const reminderNotif = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📞 Join Video Call in 10 Minutes',
            body: `Your appointment with Dr. ${doctorName} starts in 10 minutes. Get ready to join!`,
            data: {
              type: 'appointment_reminder_10min',
              appointmentId,
              patientName,
              doctorName,
              appointmentTime,
            },
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
            priority: Notifications.AndroidNotificationPriority.HIGH,
            interruptionLevel: 'default',
          },
          trigger: reminderTrigger,
        });
        if (reminderNotif) {
          const key = `${appointmentId}_10min_reminder`;
          NotificationService.scheduleMap.set(key, reminderNotif);
          notificationIds.push(reminderNotif);
        }
      }

      // 3. At appointment time: Final join alert
      if (appointmentDateObj > new Date()) {
        const joinTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: appointmentDateObj,
          ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
        };

        const joinNotif = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎥 Time to Join Your Appointment!',
            body: `Please join your appointment with Dr. ${doctorName} now!`,
            data: {
              type: 'appointment_join_time',
              appointmentId,
              patientName,
              doctorName,
              appointmentTime,
            },
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
            priority: Notifications.AndroidNotificationPriority.MAX,
            interruptionLevel: 'timeSensitive',
          },
          trigger: joinTrigger,
        });
        if (joinNotif) {
          const key = `${appointmentId}_join_time`;
          NotificationService.scheduleMap.set(key, joinNotif);
          notificationIds.push(joinNotif);
        }
      }

      console.log(`Appointment notifications scheduled: ${doctorName} on ${appointmentDate} at ${appointmentTime}`);
      return notificationIds;
    } catch (error) {
      console.error('Error scheduling appointment notifications:', error);
      return [];
    }
  }
}

export default NotificationService;
