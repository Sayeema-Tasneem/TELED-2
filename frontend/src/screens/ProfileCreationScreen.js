import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import languageService from '../services/languageService';
import authService from '../services/authService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const SelectDropdown = ({ label, value, options, onSelect, placeholder }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.selectContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.selectText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdown}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function ProfileCreationScreen({ navigation, route }) {
  const { phoneNumber } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const genderOptions = [t('profile.male'), t('profile.female'), t('profile.other')];
  const bloodTypeOptions = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
  ];

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', t('profile.firstNameRequired'));
      return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', t('profile.invalidEmail'));
      return false;
    }
    if (pincode && !/^\d{6}$/.test(pincode)) {
      Alert.alert('Error', t('profile.invalidPincode'));
      return false;
    }
    if (!agreeTerms && !address.trim()) {
      // Terms not required, just need basic info
      return true;
    }
    return true;
  };

  const handleCompleteProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Send profile data to backend
      const profileData = {
        phoneNumber,
        firstName,
        lastName,
        email,
        gender,
        bloodType,
        address,
        city,
        state,
        pincode,
        preferredLanguage,
        agreeTerms,
      };

      await authService.createProfile(profileData);

      // Set language preference
      languageService.setLanguage(preferredLanguage);

      Alert.alert('Success', t('profile.profileUpdated'), [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Profile creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Navigate to home with basic info
    languageService.setLanguage(preferredLanguage);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            {/* Basic Information */}
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder={t('profile.firstName')}
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder={t('profile.lastName')}
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('profile.email')}
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {/* Health Information */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Health Information
            </Text>

            <SelectDropdown
              label={t('profile.gender')}
              value={gender}
              options={genderOptions}
              onSelect={setGender}
              placeholder={t('profile.selectGender')}
            />

            <SelectDropdown
              label={t('profile.bloodType')}
              value={bloodType}
              options={bloodTypeOptions}
              onSelect={setBloodType}
              placeholder={t('profile.selectBloodType')}
            />

            {/* Address Information */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Address
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('profile.address')}
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder={t('profile.city')}
                placeholderTextColor="#999"
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={[styles.input, styles.halfWidth]}
                placeholder={t('profile.state')}
                placeholderTextColor="#999"
                value={state}
                onChangeText={setState}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('profile.pincode')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
            />

            {/* Preferences */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              {t('profile.language')}
            </Text>

            <View style={styles.languageButtons}>
              {languageOptions.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    preferredLanguage === lang.code && styles.languageButtonActive,
                  ]}
                  onPress={() => setPreferredLanguage(lang.code)}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      preferredLanguage === lang.code && styles.languageButtonTextActive,
                    ]}
                  >
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Terms */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View
                style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
              >
                {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>{t('profile.terms')}</Text>
            </TouchableOpacity>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? t('common.loading') : t('profile.completeProfile')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>{t('profile.skipForNow')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1f4788',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  halfWidth: {
    width: '48%',
  },
  selectContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  selectText: {
    fontSize: 14,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  dropdown: {
    color: '#999',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    width: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#333',
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  languageButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  languageButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  languageButtonText: {
    fontSize: 12,
    color: '#666',
  },
  languageButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
