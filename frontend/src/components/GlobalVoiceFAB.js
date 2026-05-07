/**
 * Global Voice FAB Component
 * Floating voice button available on all screens
 * Contextually adapts based on current screen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import voiceCommandService from '../services/voiceCommandService';
import { useVoiceContext } from '../context/VoiceContext';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition?.ExpoSpeechRecognitionModule || null;
  useSpeechRecognitionEvent = speechRecognition?.useSpeechRecognitionEvent || (() => {});
} catch (error) {
  console.log('Speech recognition not available');
}

const GlobalVoiceFAB = ({ onVoiceInput, onDoctorSelect, onTimeSelect, onSymptomDetected, language = 'en', t = (key) => key }) => {
  const { updateVoiceState, currentScreen, voiceContextData } = useVoiceContext();
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));
  const voiceSessionTimeoutRef = useRef(null);

  const getSpeechLocaleForLanguage = (lang) => {
    if (lang === 'hi') return 'hi-IN';
    if (lang === 'kn') return 'kn-IN';
    return 'en-IN';
  };

  const speakText = useCallback((text) => {
    Speech.stop();
    Speech.speak(String(text), {
      language: getSpeechLocaleForLanguage(language),
      rate: 0.95,
    });
  }, [language]);

  const normalizeCommand = (input = '') =>
    String(input)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Extract doctor specialty from voice
  const extractDoctorPreference = (voiceText) => {
    const text = normalizeCommand(voiceText);
    const doctorKeywords = {
      'general physician': ['general', 'physician', 'doctor', 'fever', 'cold', 'common', 'normal'],
      'pediatrics': ['child', 'baby', 'pediatric', 'kids', 'children'],
      'cardiology': ['heart', 'cardiac', 'chest pain', 'blood pressure'],
      'dermatology': ['skin', 'rash', 'acne', 'pimple', 'itching'],
      'ent': ['ear', 'nose', 'throat', 'ent', 'hearing'],
      'gynecology': ['women', 'gynec', 'period', 'pregnancy'],
    };

    for (const [specialty, keywords] of Object.entries(doctorKeywords)) {
      if (keywords.some((kw) => text.includes(normalizeCommand(kw)))) {
        return specialty;
      }
    }
    return 'general physician';
  };

  // Extract time from voice
  const extractTimePreference = (voiceText) => {
    const text = normalizeCommand(voiceText);
    const timePatterns = {
      '09:00 AM': ['9am', '9 am', 'morning', 'early', 'breakfast time'],
      '02:00 PM': ['2pm', '2 pm', 'afternoon', 'lunch', '14:00'],
      '06:00 PM': ['6pm', '6 pm', 'evening', 'sunset'],
      '10:00 PM': ['10pm', '10 pm', 'night', 'late'],
    };

    for (const [time, keywords] of Object.entries(timePatterns)) {
      if (keywords.some((kw) => text.includes(normalizeCommand(kw)))) {
        return time;
      }
    }
    return null;
  };

  const handleScreenSpecificVoice = useCallback(async (voiceText) => {
    const symptoms = voiceCommandService.extractSymptomsFromVoice(voiceText, language);
    
    if (currentScreen === 'BookAppointment') {
      // Handle doctor selection
      const specialty = extractDoctorPreference(voiceText);
      if (onDoctorSelect) {
        await onDoctorSelect(specialty, symptoms);
        speakText(`Selecting ${specialty}`);
      }

      // Handle time selection
      const time = extractTimePreference(voiceText);
      if (time && onTimeSelect) {
        await onTimeSelect(time);
        speakText(`Selected time ${time}`);
      }
    } else if (currentScreen === 'SymptomChecker') {
      if (symptoms.length > 0 && onSymptomDetected) {
        await onSymptomDetected(symptoms);
        const symptomText = symptoms.join(', ');
        speakText(`Detected symptoms: ${symptomText}`);
      }
    }

    // Generic voice input callback
    if (onVoiceInput) {
      await onVoiceInput(voiceText, symptoms);
    }
  }, [currentScreen, language, onVoiceInput, onDoctorSelect, onTimeSelect, onSymptomDetected, speakText]);

  const startListening = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert('Voice Help', 'Voice recognition not available on this device');
      return;
    }

    try {
      setIsListening(true);
      updateVoiceState({ isListening: true });

      await ExpoSpeechRecognitionModule.start({
        lang: getSpeechLocaleForLanguage(language),
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });

      // Auto-stop after 10 seconds
      voiceSessionTimeoutRef.current = setTimeout(() => {
        stopListening();
      }, 10000);
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      updateVoiceState({ isListening: false });
    }
  }, [language, updateVoiceState]);

  const stopListening = useCallback(async () => {
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
    }
    setIsListening(false);
    updateVoiceState({ isListening: false });
    ExpoSpeechRecognitionModule?.stop?.();
  }, [updateVoiceState]);

  useSpeechRecognitionEvent('result', (event) => {
    const latestText = event?.results?.[0]?.transcript;
    if (latestText) {
      setHeardText(latestText);
      updateVoiceState({ heardText: latestText });
    }

    if (event?.isFinal && latestText) {
      stopListening();
      handleScreenSpecificVoice(latestText);
    }
  });

  useSpeechRecognitionEvent('error', () => {
    stopListening();
  });

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      // Pulse animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      await startListening();
    }
  }, [isListening, startListening, stopListening, scaleAnim]);

  // Voice FAB removed globally from UI as requested.
  return null;

};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  fabWrapper: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabActive: {
    backgroundColor: '#FF4444',
  },
  listeningIndicator: {
    position: 'absolute',
    bottom: 70,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  micPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginRight: 8,
  },
  listeningText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  heardTextContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 10,
  },
  heardTextLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  heardTextValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});

export default GlobalVoiceFAB;
