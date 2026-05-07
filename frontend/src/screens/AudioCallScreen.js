/**
 * Audio Call Screen - Full audio call interface
 * Optimized for weak internet connections
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import agoraService from '../services/agoraService';
import callService from '../services/callService';
import CallQualityIndicator from '../components/CallQualityIndicator';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

export default function AudioCallScreen({ route, navigation }) {
  const { appointment, callData } = route.params;

  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callQuality, setCallQuality] = useState('good');
  const [callStats, setCallStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Initialize Agora
        await agoraService.initialize(process.env.AGORA_APP_ID || 'mock_app_id');

        // Join channel (audio only)
        const userId = Math.floor(Math.random() * 1000000);
        await agoraService.joinChannel(
          callData.agoraToken,
          callData.agoraChannel,
          userId,
          false // disable video for audio call
        );

        // Enable speaker by default
        await agoraService.setSpeaker(true);

        setIsCallActive(true);
        setIsLoading(false);

        // Update call status to active
        await callService.updateCallStatus(callData.callId, 'active');
      } catch (error) {
        console.error('Error initializing call:', error);
        Alert.alert('Call Error', 'Failed to initialize call');
        navigation.goBack();
      }
    };

    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  // Monitor call quality
  useEffect(() => {
    if (!isCallActive) return;

    const qualityInterval = setInterval(() => {
      const indicator = agoraService.getQualityIndicator();
      setCallQuality(indicator.quality);

      const stats = agoraService.getCallStats();
      setCallStats(stats);
    }, 1000);

    return () => clearInterval(qualityInterval);
  }, [isCallActive]);

  // Update call duration
  useEffect(() => {
    if (!isCallActive) return;

    const durationInterval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(durationInterval);
  }, [isCallActive]);

  const cleanup = async () => {
    try {
      await agoraService.leaveChannel();
      await agoraService.destroy();
      if (isCallActive) {
        await callService.endCall(callData.callId, 'user_ended');
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleMute = async () => {
    try {
      await agoraService.enableLocalAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle mute');
    }
  };

  const handleToggleSpeaker = async () => {
    try {
      await agoraService.setSpeaker(!isSpeaker);
      setIsSpeaker(!isSpeaker);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle speaker');
    }
  };

  const handleEndCall = async () => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'End',
        onPress: async () => {
          try {
            await cleanup();
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to end call');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Connecting to call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Animation */}
      <View style={styles.animatedBg} />

      {/* Content */}
      <View style={styles.content}>
        {/* Call Quality Indicator */}
        <View style={styles.qualitySection}>
          <CallQualityIndicator quality={callQuality} stats={callStats} />
        </View>

        {/* Doctor Info */}
        <View style={styles.doctorSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>
              {appointment.doctorImage || '👨‍⚕️'}
            </Text>
          </View>
          <Text style={styles.doctorName}>{appointment.doctorName}</Text>
          <Text style={styles.specialization}>
            {appointment.doctorSpecialization}
          </Text>
        </View>

        {/* Call Duration */}
        <View style={styles.durationSection}>
          <Text style={styles.durationLabel}>Call Duration</Text>
          <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.statusSection}>
          <View style={[styles.statusIndicator, styles.statusActive]}>
            <Text style={styles.statusText}>● Connected</Text>
          </View>
          <Text style={styles.networkInfo}>
            Network Quality: {callQuality.toUpperCase()}
          </Text>
        </View>

        {/* Control Panel */}
        <View style={styles.controlPanel}>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                isMuted && styles.controlButtonActive,
              ]}
              onPress={handleToggleMute}
            >
              <MaterialCommunityIcons
                name={isMuted ? 'microphone-off' : 'microphone'}
                size={28}
                color="white"
              />
              <Text style={styles.controlLabel}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                isSpeaker && styles.controlButtonActive,
              ]}
              onPress={handleToggleSpeaker}
            >
              <MaterialCommunityIcons
                name={isSpeaker ? 'volume-high' : 'volume-mute'}
                size={28}
                color="white"
              />
              <Text style={styles.controlLabel}>
                {isSpeaker ? 'Speaker' : 'Earpiece'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <MaterialCommunityIcons
              name="phone-hangup"
              size={32}
              color="white"
            />
            <Text style={styles.endCallButtonText}>End Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Optimization Notice for Poor Networks */}
      {callQuality === 'poor' && (
        <View style={styles.optimizationNotice}>
          <MaterialCommunityIcons
            name="wifi-alert"
            size={16}
            color="#FF9800"
          />
          <Text style={styles.optimizationText}>
            Quality optimized for weak connection
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5c7a',
  },
  animatedBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  qualitySection: {
    width: '100%',
    marginTop: 16,
  },
  doctorSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    fontSize: 48,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '7 00',
    color: 'white',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  durationSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  durationLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  duration: {
    fontSize: 32,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'monospace',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusActive: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  networkInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  controlPanel: {
    width: '100%',
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.3)',
    borderRadius: 12,
  },
  controlLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
  },
  endCallButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  optimizationNotice: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  optimizationText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '500',
  },
});
