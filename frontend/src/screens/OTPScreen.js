import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import languageService from '../services/languageService';
import authService from '../services/authService';
import { A11Y_COLORS, fs, MIN_BUTTON_HEIGHT, MIN_TOUCH_HEIGHT } from '../theme/accessibility';
import VoiceHelpIcon from '../components/VoiceHelpIcon';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

export default function OTPScreen({ navigation, route }) {
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(languageService.getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = languageService.subscribe((nextLanguage) => {
      setCurrentLanguage(nextLanguage);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer(timer - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', t('auth.invalidOTP'));
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOTP(phoneNumber, otp);
      
      if (response.token) {
        // Navigate to profile creation
        navigation.navigate('Profile', { phoneNumber });
      } else {
        Alert.alert('Error', 'Failed to verify OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      Alert.alert(
        'Error',
        error.message || error.error || 'Invalid OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await authService.sendOTP(phoneNumber);
      
      if (response.success) {
        setTimer(60);
        setCanResend(false);
        setOtp('');
        
        // Show OTP in development mode
        if (response.otp) {
          Alert.alert('Development Mode', `New OTP: ${response.otp}`);
        } else {
          Alert.alert('Success', 'OTP sent to your phone');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backButton}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('auth.verifyOTP')}</Text>
          <VoiceHelpIcon 
            screenName="OTP"
            language={currentLanguage}
          />
        </View>

        <View style={styles.form}>
          <Text style={styles.desc}>
            {t('auth.otpSentTo')} +91 {phoneNumber}
          </Text>

          <Text style={styles.label}>{t('auth.enterOTP')}</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={otp.length !== 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.verifyOTP')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.timerText}>
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                <Text style={styles.resendLink}>{t('auth.resendOTP')}</Text>
              </TouchableOpacity>
            ) : (
              t('auth.resendIn', { seconds: timer }).replace('{{seconds}}', timer)
            )}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: A11Y_COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    marginTop: 20,
  },
  backButton: {
    fontSize: fs(16),
    color: A11Y_COLORS.brand,
    marginBottom: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: fs(28),
    fontWeight: 'bold',
    color: A11Y_COLORS.textPrimary,
  },
  desc: {
    fontSize: fs(14),
    color: A11Y_COLORS.textSecondary,
    marginBottom: 24,
  },
  form: {
    marginTop: 40,
  },
  label: {
    fontSize: fs(16),
    fontWeight: '600',
    color: A11Y_COLORS.textPrimary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: A11Y_COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: fs(20),
    letterSpacing: 4,
    marginBottom: 24,
    backgroundColor: A11Y_COLORS.surface,
    color: A11Y_COLORS.textPrimary,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  button: {
    backgroundColor: A11Y_COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: fs(18),
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: fs(14),
    color: A11Y_COLORS.textMuted,
  },
  resendLink: {
    color: A11Y_COLORS.brand,
    fontWeight: '600',
  },
});
