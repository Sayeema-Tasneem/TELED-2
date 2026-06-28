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
const MEDICINE_REMINDER_OFFSETS_MINUTES = [0, 10, 20, 30, 40, 50, 60];

const toLocalDateString = (dateValue) => {
  const date = new Date(dateValue);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
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
      const computedDurationMs = durationMs || MEDICINE_ALARM_RING_MS;

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
      console.log('✓ Notification channel configured: Medicine Alarm (MAX importance, bypassDnd enabled)');
    } catch (error) {
      console.error('Failed to set notification channel:', error?.message);
      // Continue anyway - channel might not be available on all devices
    }
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
   * Get current notification permission status. Returns true if granted.
   */
  static async getPermissionsStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return String(status) === 'granted';
    } catch (error) {
      console.error('Error getting notification permissions status:', error);
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

      // IMPORTANT: Validate time format HH:MM
      const timeParts = String(time || '').split(':');
      if (timeParts.length !== 2) {
        console.error(`Invalid time format: ${time}. Expected HH:MM`);
        return [];
      }

      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);

      // Validate parsed values
      if (
        Number.isNaN(hours) || Number.isNaN(minutes) ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59
      ) {
        console.error(`Invalid time values: hours=${hours}, minutes=${minutes} from time=${time}`);
        return [];
      }

      const scheduledNotifications = [];

      // Ring at the selected time, then every 10 minutes for 1 hour.
      for (const offset of MEDICINE_REMINDER_OFFSETS_MINUTES) {
        let trigger;
        let triggerDate = null; // Declare outside if block for logging
        
        if (dateString) {
          const baseTime = new Date(`${dateString}T${time}:00`);
          triggerDate = new Date(baseTime.getTime() + offset * 60 * 1000);
          
          if (Number.isNaN(triggerDate.getTime())) {
            console.error(`Invalid date/time combination: ${dateString}T${time}:00`);
            continue;
          }

          // If the user saves during the selected minute, fire the primary
          // reminder immediately instead of silently missing that dose.
          const now = new Date();
          if (triggerDate < now) {
            const ageMs = now.getTime() - triggerDate.getTime();
            if (offset === 0 && ageMs < 60 * 1000) {
              triggerDate = new Date(now.getTime() + 1000);
            } else {
              console.debug(`Skipping past reminder: ${triggerDate} is before ${now}`);
              continue;
            }
          }
          
          trigger = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          };
        } else {
          // FIXED: Don't use DAILY trigger on Expo Go (doesn't work reliably)
          // This branch shouldn't be called anymore - see scheduleDailyReminders
          console.warn('WARNING: Daily reminders called with null dateString. This method now uses concrete dates.');
          continue;
        }

        // Use stronger title for first reminder, regular for follow-ups
        const title = offset === 0 
          ? `💊 Medicine Time: ${medicineName}`
          : `🔔 Medicine Reminder: ${medicineName}`;
        
        const body = offset === 0
          ? `Time to take ${medicineName} at ${time}. Tap to confirm intake.`
          : `Reminder: Please confirm intake of ${medicineName}.`;

        try {
          const notification = await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: {
                medicineId,
                medicineName,
                userId,
                time,
                dateString,
                type: 'medicine_reminder',
                reminderStage: offset === 0
                  ? 'primary'
                  : offset >= 60
                  ? 'emergency'
                  : `follow_up_${offset}min`,
              },
              sound: 'default',
              priority: offset === 0 || offset >= 60
                ? Notifications.AndroidNotificationPriority.MAX
                : Notifications.AndroidNotificationPriority.HIGH,
              interruptionLevel: offset === 0 || offset >= 60 ? 'timeSensitive' : 'default',
              ...(Platform.OS === 'android' ? { channelId: MEDICINE_ALARM_CHANNEL_ID } : {}),
            },
            trigger,
          });
          const timeStr = triggerDate ? triggerDate.toLocaleString() : 'unknown time';
          console.log(`✓ Notification scheduled: ${medicineName} ${offset === 0 ? '(primary)' : `(+${offset}min)`} for ${timeStr}`);

          scheduledNotifications.push({ 
            offset, 
            stage: offset === 0
              ? 'primary'
              : offset >= 60
              ? 'emergency'
              : `follow_up_${offset}min`,
            id: notification 
          });
        } catch (notifError) {
          console.error(`Failed to schedule notification for offset ${offset}:`, notifError);
        }
      }

      // Track all notifications
      scheduledNotifications.forEach(({ offset, stage, id }) => {
        const key = `${medicineId}_${time}_${dateString || 'repeat'}_${stage}`;
        NotificationService.scheduleMap.set(key, id);
      });

      console.log(`✓ Medicine reminder scheduled: ${medicineName} at ${time} on ${dateString || 'daily'} with ${scheduledNotifications.length} notifications`);
      return scheduledNotifications.map(({ id }) => id);
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return [];
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

      // Follow-up rings after the primary reminder: every 10 minutes for 1 hour.
      const levels = [10, 20, 30, 40, 50, 60];
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
            title: offsetMinutes >= 60 ? `🚨 Final medicine alert • ${medicine.name}` : `🚨 ${time} • ${medicine.name}`,
            body: offsetMinutes >= 60
              ? `Final reminder: scan ${medicine.name} now or your emergency contact may be notified.`
              : `Please scan ${medicine.name} now to confirm intake`,
            data: {
              medicineId: medicine.id,
              medicineName: medicine.name,
              time,
              dateString,
              type: 'medicine_reminder',
              reminderStage: offsetMinutes >= 60 ? 'emergency' : `follow_up_${offsetMinutes}min`,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            interruptionLevel: 'timeSensitive',
          },
          trigger,
        });

        const key = `${medicine.id}_${time}_${dateString || 'repeat'}_${offsetMinutes >= 60 ? 'emergency' : `follow_up_${offsetMinutes}min`}`;
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
   * FIXED: Uses concrete date scheduling (365 days) instead of DAILY triggers
   * DAILY triggers don't work reliably in Expo Go on Android
   * @param {object} medicine - Medicine object
   */
  static async scheduleDailyReminders(medicine) {
    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        console.warn('❌ Notification permission not granted. Reminders will not work.');
        return [];
      }

      if (!medicine?.times || !Array.isArray(medicine.times) || medicine.times.length === 0) {
        console.warn('❌ No reminder times configured for medicine:', medicine?.name);
        return [];
      }

      const reminders = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = toLocalDateString(today);

      // Determine start date
      let startDate = medicine.startDate;
      if (!startDate || startDate < todayString) {
        startDate = todayString;
      }

      // Determine end date
      let endDate = medicine.endDate;
      if (!endDate && medicine.durationDays) {
        const end = new Date(`${startDate}T00:00:00`);
        end.setDate(end.getDate() + Number(medicine.durationDays) - 1);
        endDate = toLocalDateString(end);
      }

      // FIXED: Use 365 days lookahead instead of 30 days
      // This ensures reminders work for a full year
      const lookaheadDays = endDate ? Math.floor((new Date(`${endDate}T00:00:00`) - today) / (1000 * 60 * 60 * 24)) + 1 : 365;
      const safeDays = Math.min(Math.max(lookaheadDays, 0), 365);

      console.log(`📅 Scheduling medicine "${medicine.name}" for ${safeDays} days starting ${startDate}`);

      // FIXED: Schedule concrete dates instead of using DAILY trigger
      const start = new Date(`${startDate}T00:00:00`);

      for (let dayOffset = 0; dayOffset < safeDays; dayOffset += 1) {
        const d = new Date(start);
        d.setDate(d.getDate() + dayOffset);
        const dateString = toLocalDateString(d);

        for (const time of medicine.times) {
          // Skip if medicine was already taken for this date/time
          if (dateString === todayString && medicine.intakeHistory?.[dateString]?.[time]) {
            console.log(`⏭️  Skipping already taken: ${medicine.name} ${dateString} ${time}`);
            continue;
          }

          console.log(`⏰ Scheduling reminder: ${medicine.name} at ${time} on ${dateString}`);
          
          try {
            const notificationIds = await NotificationService.scheduleMedicineReminder(
              medicine.id,
              medicine.name,
              time,
              dateString,
              medicine.userId || null
            );

            if (Array.isArray(notificationIds) && notificationIds.length > 0) {
              reminders.push(...notificationIds);
            } else {
              console.warn(`⚠️  Failed to schedule reminder for ${medicine.name} at ${time}`);
            }
          } catch (err) {
            console.error(`❌ Error scheduling ${medicine.name} at ${time}:`, err.message);
          }
        }
      }

      console.log(`✅ Scheduled ${reminders.length} reminders for "${medicine.name}"`);
      return reminders;
    } catch (error) {
      console.error('❌ Error scheduling daily reminders:', error);
      return [];
    }
  }

  /**
   * Rebuild reminders for a single medicine.
   * Cancels existing notifications first so the result stays idempotent.
   */
  static async syncMedicineReminders(medicine) {
    try {
      if (!medicine?.id || !Array.isArray(medicine?.times) || medicine.times.length === 0) {
        return [];
      }

      const status = String(medicine.status || '').toLowerCase();
      const isPausedOrInactive = ['paused', 'inactive', 'cancelled'].includes(status);
      if (isPausedOrInactive) {
        return [];
      }

      await NotificationService.cancelAllReminders(medicine);
      return await NotificationService.scheduleDailyReminders(medicine);
    } catch (error) {
      console.error('Error syncing medicine reminders:', error);
      return [];
    }
  }

  /**
   * Rebuild reminders for a list of medicines.
   */
  static async syncMedicineReminderList(medicines = []) {
    try {
      const results = [];
      for (const medicine of Array.isArray(medicines) ? medicines : []) {
        const reminderIds = await NotificationService.syncMedicineReminders(medicine);
        if (Array.isArray(reminderIds) && reminderIds.length > 0) {
          results.push(...reminderIds);
        }
      }
      return results;
    } catch (error) {
      console.error('Error syncing medicine reminder list:', error);
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
        trigger: null,
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

  /**
   * DIAGNOSTIC: Check if notifications are properly scheduled
   * Use this to verify that medicine reminders are actually scheduled
   */
  static async verifyScheduledNotifications() {
    try {
      console.log('\n========== NOTIFICATION DIAGNOSTIC ==========');
      
      // Check permissions
      const permStatus = await NotificationService.getPermissionsStatus();
      console.log(`✓ Notification Permission: ${permStatus ? '✅ GRANTED' : '❌ DENIED'}`);
      
      if (!permStatus) {
        console.warn('⚠️  Notifications are disabled! Users will not receive reminders.');
        return { permissionGranted: false };
      }

      // Get all scheduled
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`✓ Total Scheduled Notifications: ${scheduled.length}`);

      if (scheduled.length === 0) {
        console.warn('⚠️  NO NOTIFICATIONS SCHEDULED! Check if reminders are being added.');
        return { scheduled: 0, medicineReminders: 0 };
      }

      // Count medicine reminders
      const medicineReminders = scheduled.filter(n => 
        n.content?.data?.type === 'medicine_reminder'
      );
      console.log(`✓ Medicine Reminders: ${medicineReminders.length}`);

      // Show next 5 reminders
      console.log('\n📋 Next 5 Scheduled Reminders:');
      scheduled
        .sort((a, b) => {
          const aDate = new Date(a.trigger?.date || a.trigger?.dateString || 0);
          const bDate = new Date(b.trigger?.date || b.trigger?.dateString || 0);
          return aDate - bDate;
        })
        .slice(0, 5)
        .forEach((notif, idx) => {
          const triggerDate = notif.trigger?.date || new Date();
          console.log(`  ${idx + 1}. [${triggerDate.toLocaleString()}] ${notif.content?.title}`);
          if (notif.content?.data?.medicineId) {
            console.log(`     Medicine: ${notif.content?.data?.medicineName || 'Unknown'}`);
          }
        });

      console.log('\n✅ Notifications appear to be properly scheduled');
      console.log('==========================================\n');

      return {
        permissionGranted: true,
        totalScheduled: scheduled.length,
        medicineReminders: medicineReminders.length,
      };
    } catch (error) {
      console.error('❌ Error verifying notifications:', error);
      return { error: error.message };
    }
  }

  /**
   * DIAGNOSTIC: Test notification - shows a test notification immediately
   */
  static async sendTestNotification() {
    try {
      console.log('📤 Sending test notification...');
      const testNotif = await NotificationService.sendInstantNotification(
        '🧪 Test Notification',
        'If you see this, notifications are working! 🎉',
        {
          type: 'test',
          timestamp: new Date().toISOString(),
        }
      );

      if (testNotif) {
        console.log('✅ Test notification sent successfully');
        return true;
      } else {
        console.warn('⚠️  Test notification returned null');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return false;
    }
  }

  /**
   * DIAGNOSTIC: Full system check for notification issues
   */
  static async runFullNotificationDiagnostics() {
    console.log('\n🔍 === FULL NOTIFICATION DIAGNOSTICS ===\n');
    
    try {
      // 1. Check permission
      const permission = await NotificationService.getPermissionsStatus();
      console.log(`1️⃣  Notification Permission: ${permission ? '✅ GRANTED' : '❌ DENIED'}`);
      if (!permission) {
        console.warn('   ⚠️  ACTION: Go to Settings > Apps > Your App > Permissions > Notifications and enable');
      }

      // 2. Check scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`2️⃣  Scheduled Notifications: ${scheduled.length} total`);
      if (scheduled.length > 0) {
        const medicineReminders = scheduled.filter(n => n.content?.data?.type === 'medicine_reminder');
        console.log(`   📊 Medicine Reminders: ${medicineReminders.length}`);
        
        // Show next 3
        const next3 = scheduled
          .sort((a, b) => new Date(a.trigger?.date || 0) - new Date(b.trigger?.date || 0))
          .slice(0, 3);
        
        console.log('   📋 Next 3 reminders:');
        next3.forEach((n, i) => {
          const date = n.trigger?.date ? new Date(n.trigger.date).toLocaleString() : 'Unknown';
          console.log(`      ${i + 1}. ${date} - ${n.content?.title || 'No title'}`);
        });
      } else {
        console.warn('   ⚠️  No notifications scheduled! Check if medicines are saved.');
      }

      // 3. Check if app is in background (notifications will display)
      // In foreground, need to handle manually
      console.log(`3️⃣  Platform: ${Platform.OS} (${Platform.OS === 'android' ? 'Android' : 'iOS'})`);

      // 4. Check audio settings (on Android)
      if (Platform.OS === 'android') {
        try {
          const audioMode = await Audio.getAudioModeAsync();
          console.log(`4️⃣  Audio Mode: ${audioMode.playsInSilentModeIOS ? 'Plays in silent mode' : 'Respects silent mode'}`);
          console.log(`    Audio staysActive: ${audioMode.staysActiveInBackground ? 'Yes' : 'No'}`);
        } catch (e) {
          console.log('4️⃣  Audio Mode: Could not check');
        }
      }

      // 5. Recommendations
      console.log('\n💡 Troubleshooting Tips:');
      if (permission) {
        console.log('   ✅ Permissions OK');
      } else {
        console.log('   ❌ Grant notification permission first');
      }
      
      if (scheduled.length > 100) {
        console.log('   ✅ Good - many notifications scheduled');
      } else if (scheduled.length > 0) {
        console.log('   ⚠️  Few notifications - add more medicines');
      } else {
        console.log('   ❌ No notifications - add a medicine first');
      }
      
      console.log('\n4️⃣  Additional checks:');
      console.log('   • Check Do Not Disturb: Should be OFF for reminders');
      console.log('   • Check Battery Saver: Disable for notifications');
      console.log('   • Check Volume: Should be ON (not muted)');
      console.log('   • Check Ringer Mode: Should be normal or vibrate');
      console.log('   • Restart app: Sometimes helps');
      console.log('   • Test notification: Use sendTestNotification()');
      
      console.log('\n=================================\n');
      
      return {
        permissionGranted: permission,
        notificationCount: scheduled.length,
        platform: Platform.OS,
      };
    } catch (error) {
      console.error('❌ Diagnostic error:', error?.message);
      return { error: error?.message };
    }
  }

  /**
   * DIAGNOSTIC: Test if notification sound plays
   */
  static async testNotificationSound() {
    console.log('🔊 Testing notification sound...');
    try {
      await NotificationService.playInAppEmergencyTone(5000); // 5 second test
      console.log('✅ Sound playing for 5 seconds...');
      return true;
    } catch (error) {
      console.error('❌ Failed to play test sound:', error?.message);
      return false;
    }
  }
}

export default NotificationService;
