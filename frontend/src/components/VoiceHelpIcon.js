/**
 * Simple Voice Help Icon Component
 * Small, clickable icon that appears in header area of every screen
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import voiceCommandService from '../services/voiceCommandService';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition?.ExpoSpeechRecognitionModule || null;
  useSpeechRecognitionEvent = speechRecognition?.useSpeechRecognitionEvent || (() => {});
} catch (error) {
  console.log('Speech recognition not available');
}

const VoiceHelpIcon = ({ 
  onVoiceInput, 
  language = 'en', 
  screenName = 'Dashboard',
  onDoctorSelect,
  onTimeSelect,
  onSymptomDetected,
  voicePrompt,
  followUpPrompt,
  unclearPrompt,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));
  const voiceSessionTimeoutRef = useRef(null);
  const noSpeechRetryCountRef = useRef(0);

  const getSpeechLocaleForLanguage = (lang) => {
    if (lang === 'hi') return 'hi-IN';
    if (lang === 'kn') return 'kn-IN';
    return 'en-IN';
  };

  const speakText = useCallback((text, handlers = {}) => {
    Speech.stop();
    Speech.speak(String(text), {
      language: getSpeechLocaleForLanguage(language),
      rate: 0.95,
      onDone: handlers?.onDone,
      onError: handlers?.onError,
    });
  }, [language]);

  const isNoSpeechError = (error) => {
    const code = String(error?.code ?? '').toLowerCase();
    const type = String(error?.error ?? '').toLowerCase();
    const message = String(error?.message ?? '').toLowerCase();

    return code === '7' || type.includes('no-speech') || message.includes('no speech');
  };

  const normalizeCommand = (input = '') =>
    String(input)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Extract doctor specialty - more comprehensive
  const extractDoctorPreference = (voiceText) => {
    const text = normalizeCommand(voiceText);
    const doctorKeywords = {
      'general physician': ['general', 'physician', 'doctor', 'fever', 'cold', 'common', 'checkup', 'check-up'],
      'pediatrics': ['child', 'baby', 'pediatric', 'kids', 'children', 'pediatrician'],
      'cardiology': ['heart', 'cardiac', 'chest', 'cardiologist', 'heart disease'],
      'dermatology': ['skin', 'rash', 'acne', 'dermatologist', 'dermatology'],
      'ent': ['ear', 'nose', 'throat', 'ent', 'ear nose throat'],
      'orthopedics': ['bone', 'joint', 'fracture', 'orthopedic', 'orthopedist'],
      'ophthalmology': ['eye', 'vision', 'sight', 'ophthalmologist', 'eye doctor'],
      'neurology': ['brain', 'nerve', 'neurologist', 'neuro', 'migraine', 'headache'],
      'psychiatry': ['mental', 'psychiatrist', 'depression', 'anxiety', 'stress'],
      'oncology': ['cancer', 'oncologist', 'tumor'],
      'urology': ['urology', 'urologist', 'kidney'],
    };

    for (const [specialty, keywords] of Object.entries(doctorKeywords)) {
      if (keywords.some((kw) => text.includes(normalizeCommand(kw)))) {
        return specialty;
      }
    }
    return 'general physician';
  };

  // Extract time - more comprehensive
  const extractTimePreference = (voiceText) => {
    const text = normalizeCommand(voiceText);
    const timePatterns = {
      '09:00 AM': ['9am', '9 am', '9:00', '9:00 am', 'morning', 'breakfast', '09:00', 'nine am'],
      '10:00 AM': ['10am', '10 am', '10:00', '10:00 am', 'ten am'],
      '11:00 AM': ['11am', '11 am', '11:00', '11:00 am', 'eleven am'],
      '12:00 PM': ['12pm', '12 pm', '12:00', '12:00 pm', 'noon', 'twelve pm'],
      '02:00 PM': ['2pm', '2 pm', '2:00', '2:00 pm', 'afternoon', 'lunch', '14:00', 'two pm'],
      '03:00 PM': ['3pm', '3 pm', '3:00', '3:00 pm', 'three pm', '15:00'],
      '04:00 PM': ['4pm', '4 pm', '4:00', '4:00 pm', 'four pm', '16:00'],
      '05:00 PM': ['5pm', '5 pm', '5:00', '5:00 pm', 'five pm', '17:00'],
      '06:00 PM': ['6pm', '6 pm', '6:00', '6:00 pm', 'evening', '18:00', 'six pm'],
      '07:00 PM': ['7pm', '7 pm', '7:00', '7:00 pm', 'seven pm', '19:00'],
      '08:00 PM': ['8pm', '8 pm', '8:00', '8:00 pm', 'eight pm', '20:00'],
      '09:00 PM': ['9pm', '9 pm', '9:00', '9:00 pm', 'night', '21:00', 'nine pm'],
      '10:00 PM': ['10pm', '10 pm', '10:00', '10:00 pm', '22:00', 'ten pm'],
    };

    for (const [time, keywords] of Object.entries(timePatterns)) {
      if (keywords.some((kw) => text.includes(normalizeCommand(kw)))) {
        return time;
      }
    }
    return null;
  };

  const handleScreenSpecificVoice = useCallback((voiceText) => {
    const symptoms = voiceCommandService.extractSymptomsFromVoice(voiceText, language);
    
    // Handle screen-specific voice commands
    if (screenName === 'BookAppointment') {
      const text = normalizeCommand(voiceText);
      
      // Check if user is asking to choose a doctor
      if (text.includes('choose') && text.includes('doctor')) {
        speakText('Which doctor specialty would you like? Say cardiology, pediatrics, dermatology, ent, or general physician');
        return; // Wait for next input
      }
      
      const specialty = extractDoctorPreference(voiceText);
      if (specialty && onDoctorSelect) {
        onDoctorSelect(specialty, symptoms);
        if (followUpPrompt) {
          speakText(followUpPrompt);
        } else {
          speakText(`Selected ${specialty}`);
        }
      }

      const time = extractTimePreference(voiceText);
      if (time && onTimeSelect) {
        onTimeSelect(time);
        if (followUpPrompt) {
          speakText(followUpPrompt);
        } else {
          speakText(`Selected time ${time}`);
        }
      }
    } else if (screenName === 'SymptomChecker') {
      if (symptoms.length > 0 && onSymptomDetected) {
        onSymptomDetected(symptoms);
        if (followUpPrompt) {
          speakText(followUpPrompt);
        } else {
          speakText(`Detected: ${symptoms.join(', ')}`);
        }
      }
    }

    // Generic callback
    if (onVoiceInput) {
      onVoiceInput(voiceText, symptoms);
    }
  }, [screenName, language, onVoiceInput, onDoctorSelect, onTimeSelect, onSymptomDetected, speakText, followUpPrompt]);

  const startListening = useCallback(async () => {
    console.log('startListening called, ExpoSpeechRecognitionModule=', !!ExpoSpeechRecognitionModule);
    
    if (!ExpoSpeechRecognitionModule) {
      console.warn('Voice recognition module not available');
      Alert.alert('Voice Help', 'Voice recognition not available on this device');
      return;
    }

    try {
      console.log('Starting speech recognition, language:', getSpeechLocaleForLanguage(language));
      setIsListening(true);
      setHeardText('');

      await ExpoSpeechRecognitionModule.start({
        lang: getSpeechLocaleForLanguage(language),
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
      });

      console.log('Speech recognition started');

      // Auto-stop after 8 seconds
      voiceSessionTimeoutRef.current = setTimeout(() => {
        console.log('Voice timeout, stopping');
        stopListening();
      }, 8000);
    } catch (error) {
      console.error('Voice error starting:', error);
      setIsListening(false);
      Alert.alert('Voice Error', error?.message || 'Failed to start voice recognition');
    }
  }, [language]);

  const startListeningWithPrompt = useCallback(async () => {
    if (voicePrompt) {
      speakText(voicePrompt, {
        onDone: () => {
          setTimeout(() => {
            startListening();
          }, 250);
        },
        onError: () => {
          startListening();
        },
      });
      return;
    }

    await startListening();
  }, [startListening, speakText, voicePrompt]);

  const stopListening = useCallback(() => {
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
    }
    setIsListening(false);
    ExpoSpeechRecognitionModule?.stop?.();
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    console.log('Speech result event:', event);
    const latestText = event?.results?.[0]?.transcript;
    if (latestText) {
      console.log('Heard text:', latestText);
      setHeardText(latestText);
    }

    if (event?.isFinal && latestText) {
      console.log('Final result:', latestText);
      noSpeechRetryCountRef.current = 0;
      stopListening();
      handleScreenSpecificVoice(latestText);
    } else if (event?.isFinal && !latestText && unclearPrompt) {
      stopListening();
      speakText(unclearPrompt);
    }
  });

  useSpeechRecognitionEvent('error', (error) => {
    if (isNoSpeechError(error)) {
      console.warn('Speech no-speech event:', error);
    } else {
      console.error('Speech error event:', error);
    }

    stopListening();

    if (isNoSpeechError(error) && noSpeechRetryCountRef.current < 1) {
      noSpeechRetryCountRef.current += 1;
      speakText('I did not catch that. Please speak now.', {
        onDone: () => {
          setTimeout(() => {
            startListening();
          }, 200);
        },
        onError: () => {
          startListening();
        },
      });
      return;
    }

    noSpeechRetryCountRef.current = 0;
    if (unclearPrompt) {
      speakText(unclearPrompt);
    }
  });

  const toggleListening = useCallback(async () => {
    console.log('toggleListening called, isListening=', isListening);
    
    if (isListening) {
      console.log('Stopping listening');
      stopListening();
    } else {
      console.log('Starting listening');
      // Pulse animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      await startListeningWithPrompt();
    }
  }, [isListening, startListeningWithPrompt, stopListening, scaleAnim]);

  // Voice icon removed globally from UI as requested.
  return null;

};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  voiceButtonActive: {
    backgroundColor: '#FF4444',
  },
  pulsing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    opacity: 0.3,
  },
});

export default VoiceHelpIcon;
