import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import languageService from '../services/languageService';
import authService from '../services/authService';
import { A11Y_COLORS, fs, MIN_BUTTON_HEIGHT, MIN_TOUCH_HEIGHT } from '../theme/accessibility';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

const MenuButton = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.menuButton} onPress={onPress} activeOpacity={0.9}>
    <Text style={styles.icon}>{icon}</Text>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuDesc} numberOfLines={2}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }) {
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState(
    languageService.getCurrentLanguage() || 'en'
  );

  const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

  const handleLanguageChange = (code) => {
    const changed = languageService.setLanguage(code);
    if (changed) {
      setCurrentLang(code);
    }
    setLangModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert(t('common.logout', 'Logout'), t('home.logoutConfirm', 'Are you sure you want to logout?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('common.logout', 'Logout'),
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const handleConsultDoctor = () => {
    Alert.alert(
      t('home.consultDoctor', 'Consult Doctor'),
      t('home.consultChoiceMessage', 'How would you like to continue?'),
      [
        {
          text: t('home.getSuggestion', 'Get Suggestion'),
          onPress: () => navigation.navigate('Symptoms'),
        },
        {
          text: t('home.chooseDoctor', 'Choose Doctor'),
          onPress: () => navigation.navigate('DoctorStack'),
        },
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const activeLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const menuItems = [
    {
      icon: '👨‍⚕️',
      title: t('home.consultDoctor'),
      description: t('home.consultDesc'),
      screen: 'DoctorStack',
      action: 'consultDoctor',
    },
    {
      icon: '🔍',
      title: t('home.symptomChecker'),
      description: t('home.symptomDesc'),
      screen: 'Symptoms',
    },
    {
      icon: '💊',
      title: t('home.medicineReminder'),
      description: t('home.medicineDesc'),
      screen: 'Medicine',
    },
    {
      icon: '📋',
      title: t('home.healthRecords'),
      description: t('home.recordsDesc'),
      screen: 'Records',
    },
    {
      icon: '🏥',
      title: t('home.nearbyHospitals'),
      description: t('home.hospitalDesc'),
      screen: 'Hospitals',
    },
    {
      icon: '⚙️',
      title: 'Equipment Hub',
      description: 'Doctor-verified lend/donate medical equipment',
      screen: 'EquipmentHub',
    },
    {
      icon: '🚨',
      title: t('home.emergencyHelp'),
      description: t('home.emergencyDesc'),
      screen: 'EmergencyHelp',
    },
    {
      icon: '🎤',
      title: t('home.healthAssistant'),
      description: t('home.assistantDesc'),
      screen: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{t('home.welcome')} 👋</Text>
          <Text style={styles.subGreeting}>{t('home.greeting')}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Language Selector */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.headerBtnIcon}>🌐</Text>
            <Text style={styles.headerBtnLabel}>{activeLang.code.toUpperCase()}</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity style={[styles.headerBtn, styles.logoutBtn]} onPress={handleLogout}>
            <Text style={styles.headerBtnIcon}>🚪</Text>
            <Text style={styles.headerBtnLabel}>{t('common.logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.langModal}>
            <Text style={styles.langModalTitle}>Select Language</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langOption,
                  currentLang === lang.code && styles.langOptionActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.langLabel,
                    currentLang === lang.code && styles.langLabelActive,
                  ]}
                >
                  {lang.label}
                </Text>
                {currentLang === lang.code && (
                  <Text style={styles.langCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <MenuButton
              key={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
              onPress={() => {
                if (item.action === 'consultDoctor') {
                  handleConsultDoctor();
                } else if (item.screen) {
                  navigation.navigate(item.screen);
                }
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: A11Y_COLORS.surface,
  },
  header: {
    backgroundColor: A11Y_COLORS.brand,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  headerBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 68,
    minHeight: MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  logoutBtn: {
    backgroundColor: 'rgba(231,76,60,0.75)',
  },
  headerBtnIcon: {
    fontSize: 26,
  },
  headerBtnLabel: {
    fontSize: fs(12),
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  greeting: {
    fontSize: fs(22),
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: fs(14),
    color: '#E5ECFF',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: '48%',
    minHeight: 170,
    flexDirection: 'column',
    backgroundColor: A11Y_COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_BUTTON_HEIGHT + 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    fontSize: 44,
    marginBottom: 12,
  },
  menuContent: {
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: fs(18),
    fontWeight: '700',
    color: A11Y_COLORS.textPrimary,
    textAlign: 'center',
  },
  menuDesc: {
    fontSize: fs(14),
    color: A11Y_COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  // Language modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  langModal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 180,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  langModalTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    minHeight: MIN_TOUCH_HEIGHT,
  },
  langOptionActive: {
    backgroundColor: '#eef4ff',
  },
  langFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  langLabel: {
    flex: 1,
    fontSize: fs(16),
    color: A11Y_COLORS.textPrimary,
  },
  langLabelActive: {
    color: '#1f4788',
    fontWeight: '700',
  },
  langCheck: {
    fontSize: 16,
    color: '#1f4788',
    fontWeight: 'bold',
  },
});
