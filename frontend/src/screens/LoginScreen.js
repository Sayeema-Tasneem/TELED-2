import React, { useEffect, useState } from 'react';
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

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

export default function LoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(languageService.getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = languageService.subscribe((nextLanguage) => {
      setCurrentLanguage(nextLanguage);
    });

    return unsubscribe;
  }, []);

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Error', t('auth.invalidPhone'));
      return;
    }

    setLoading(true);
    try {
      const response = await authService.sendOTP(phoneNumber);
      
      if (response.success) {
        // Show OTP in development mode
        if (response.otp) {
          Alert.alert('Development Mode', `OTP: ${response.otp}`);
        }
        
        navigation.navigate('OTP', { phoneNumber });
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert(
        'Error',
        error.message || error.error || 'Failed to send OTP. Please try again.'
      );
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
          <Text style={styles.title}>🏥 {t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          <View style={styles.languageWrap}>
            <Text style={styles.languageLabel}>{t('profile.language', 'Language')}:</Text>
            <TouchableOpacity
              style={[styles.languageButton, currentLanguage === 'en' && styles.languageButtonActive]}
              onPress={() => languageService.setLanguage('en')}
              disabled={loading}
            >
              <Text style={[styles.languageButtonText, currentLanguage === 'en' && styles.languageButtonTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageButton, currentLanguage === 'hi' && styles.languageButtonActive]}
              onPress={() => languageService.setLanguage('hi')}
              disabled={loading}
            >
              <Text style={[styles.languageButtonText, currentLanguage === 'hi' && styles.languageButtonTextActive]}>हिन्दी</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.enterPhone')}</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>{t('auth.countryCode')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.phoneHint')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (phoneNumber.length !== 10 || loading) && styles.buttonDisabled,
            ]}
            onPress={handleSendOTP}
            disabled={phoneNumber.length !== 10 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.sendOTP')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.otpNote')}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: fs(32),
    fontWeight: 'bold',
    color: A11Y_COLORS.brand,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fs(16),
    color: A11Y_COLORS.textSecondary,
  },
  languageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  languageLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    color: A11Y_COLORS.textPrimary,
  },
  languageButton: {
    borderWidth: 1,
    borderColor: A11Y_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: A11Y_COLORS.surface,
  },
  languageButtonActive: {
    borderColor: A11Y_COLORS.brand,
    backgroundColor: '#E8F0FE',
  },
  languageButtonText: {
    fontSize: fs(13),
    color: A11Y_COLORS.textSecondary,
    fontWeight: '700',
  },
  languageButtonTextActive: {
    color: A11Y_COLORS.brand,
  },
  form: {
    marginTop: 20,
  },
  label: {
    fontSize: fs(16),
    fontWeight: '600',
    color: A11Y_COLORS.textPrimary,
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: A11Y_COLORS.border,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: A11Y_COLORS.surface,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  countryCode: {
    fontSize: fs(18),
    fontWeight: '600',
    color: A11Y_COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: fs(16),
    color: A11Y_COLORS.textPrimary,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  button: {
    backgroundColor: A11Y_COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    marginTop: 8,
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
  footerText: {
    fontSize: fs(14),
    color: A11Y_COLORS.textMuted,
    textAlign: 'center',
  },
});
