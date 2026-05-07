import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import languageService from '../services/languageService';
import geolocationService from '../services/geolocationService';
import authService from '../services/authService';

const EMERGENCY_CONTACT_KEY = 'emergency_contact_number';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const AMBULANCE_NUMBER = '108';
const CONFIGURED_EMERGENCY_CONTACT = process.env.EXPO_PUBLIC_EMERGENCY_CONTACT_NUMBER || '';

export default function EmergencyHelpScreen() {
  const navigation = useNavigation();
  const [sendingSms, setSendingSms] = useState(false);
  const [savedContact, setSavedContact] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [showContactEdit, setShowContactEdit] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(EMERGENCY_CONTACT_KEY).then(val => {
      if (val) {
        setSavedContact(val);
        setContactInput(val);
      }
    });
  }, []);

  const handleSaveContact = async () => {
    const trimmed = contactInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a phone number.');
      return;
    }
    // Basic phone validation — digits, spaces, +, -, () only
    if (!/^[\d\s+\-().]{7,15}$/.test(trimmed)) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setSavingContact(true);
    await AsyncStorage.setItem(EMERGENCY_CONTACT_KEY, trimmed);
    setSavedContact(trimmed);
    setShowContactEdit(false);
    setSavingContact(false);
    Alert.alert('Saved', `Emergency contact set to ${trimmed}`);
  };

  const getEmergencyContactNumber = async () => {
    // Priority: saved in-app contact > env var > user's own phone
    if (savedContact) return savedContact;
    if (CONFIGURED_EMERGENCY_CONTACT) return CONFIGURED_EMERGENCY_CONTACT;
    const userPhone = await authService.getPhoneNumber();
    return userPhone || '';
  };

  const handleNotifyContact = async () => {
    const contact = savedContact || CONFIGURED_EMERGENCY_CONTACT;
    if (!contact) {
      Alert.alert('No Contact', 'Please set an emergency contact first.');
      return;
    }
    setSendingSms(true);
    try {
      let locationText = '';
      try {
        const location = await geolocationService.getCurrentLocation();
        locationText = ` My location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      } catch (_) { /* location optional */ }
      const rawMessage = `EMERGENCY! I need immediate help.${locationText}`;
      const smsUrl = `sms:${contact}?body=${encodeURIComponent(rawMessage)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (!canOpen) {
        Alert.alert('Error', 'Unable to open SMS app.');
        return;
      }
      await Linking.openURL(smsUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to send emergency SMS.');
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.emergency.title', 'Emergency Help')}</Text>
        <Text style={styles.subtitle}>
          {t('screens.emergency.subtitle', 'Get instant help with one tap')}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        <TouchableOpacity
          style={styles.oneTapButton}
          onPress={async () => {
            await Linking.openURL(`tel:${AMBULANCE_NUMBER}`);
            await handleNotifyContact();
          }}
        >
          <Text style={styles.oneTapIcon}>🚨</Text>
          <Text style={styles.oneTapTitle}>
            {t('screens.emergency.oneTapButton', 'ONE-TAP EMERGENCY')}
          </Text>
          <Text style={styles.oneTapDescription}>
            Calls ambulance (108) and notifies your emergency contact
          </Text>
        </TouchableOpacity>

        {/* ── Emergency Treatment Videos ── */}
        <TouchableOpacity
          style={styles.treatmentVideosCard}
          onPress={() => navigation.navigate('EmergencyAnimationList')}
        >
          <View style={styles.treatmentVideosHeader}>
            <MaterialCommunityIcons name="play-circle-outline" size={28} color="#1976d2" />
            <View style={styles.treatmentVideosText}>
              <Text style={styles.treatmentVideosTitle}>📹 Treatment Videos</Text>
              <Text style={styles.treatmentVideosSubtitle}>
                Learn proper first aid for emergencies
              </Text>
            </View>
          </View>
          <View style={styles.treatmentVideosFooter}>
            <Text style={styles.treatmentVideosInfo}>
              CPR, Choking, Bleeding, Burns & More →
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Emergency Contact Card ── */}
        <View style={styles.contactCard}>
          <View style={styles.contactCardHeader}>
            <Text style={styles.contactCardTitle}>👤 Emergency Contact</Text>
            {savedContact ? (
              <TouchableOpacity onPress={() => setShowContactEdit(v => !v)}>
                <Text style={styles.contactEditLink}>{showContactEdit ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {savedContact && !showContactEdit ? (
            <>
              <Text style={styles.contactSavedNumber}>{savedContact}</Text>
              <TouchableOpacity
                style={[styles.notifyButton, sendingSms && styles.notifyButtonDisabled]}
                onPress={handleNotifyContact}
                disabled={sendingSms}
              >
                {sendingSms
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.notifyButtonText}>🆘  Notify Contact Now</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.contactHint}>
                {savedContact ? 'Update phone number:' : 'Set a contact to notify with 1 tap:'}
              </Text>
              <TextInput
                style={styles.contactInput}
                value={contactInput}
                onChangeText={setContactInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                maxLength={15}
              />
              <TouchableOpacity
                style={[styles.contactSaveButton, savingContact && styles.notifyButtonDisabled]}
                onPress={handleSaveContact}
                disabled={savingContact}
              >
                {savingContact
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.contactSaveButtonText}>Save Contact</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    backgroundColor: '#b71c1c',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: '#ffe0e0',
    fontSize: 13,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  oneTapButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  oneTapIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  oneTapTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  oneTapDescription: {
    color: '#fff5f5',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionIcon: {
    fontSize: 30,
    marginRight: 14,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    color: '#1f1f1f',
    fontWeight: '700',
  },
  actionSubtitle: {
    marginTop: 3,
    color: '#666',
    fontSize: 12,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  contactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  contactEditLink: {
    fontSize: 13,
    color: '#1565c0',
    fontWeight: '600',
  },
  contactSavedNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  contactHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  contactInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f1f1f',
    marginBottom: 10,
  },
  contactSaveButton: {
    backgroundColor: '#1565c0',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  contactSaveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  notifyButton: {
    backgroundColor: '#b71c1c',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  notifyButtonDisabled: {
    opacity: 0.55,
  },
  notifyButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  treatmentVideosCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  treatmentVideosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  treatmentVideosText: {
    flex: 1,
    marginLeft: 12,
  },
  treatmentVideosTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  treatmentVideosSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  treatmentVideosFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  treatmentVideosInfo: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '600',
  },
});
