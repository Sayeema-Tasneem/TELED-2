import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const MenuButton = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.menuButton} onPress={onPress}>
    <Text style={styles.icon}>{icon}</Text>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuDesc}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const menuItems = [
    {
      icon: '👨‍⚕️',
      title: t('home.consultDoctor'),
      description: t('home.consultDesc'),
    },
    {
      icon: '🔍',
      title: t('home.symptomChecker'),
      description: t('home.symptomDesc'),
    },
    {
      icon: '💊',
      title: t('home.medicineReminder'),
      description: t('home.medicineDesc'),
    },
    {
      icon: '📋',
      title: t('home.healthRecords'),
      description: t('home.recordsDesc'),
    },
    {
      icon: '🏥',
      title: t('home.nearbyHospitals'),
      description: t('home.hospitalDesc'),
    },
    {
      icon: '⚙️',
      title: t('home.medicalEquipment'),
      description: t('home.equipmentDesc'),
    },
    {
      icon: '🚨',
      title: t('home.emergencyHelp'),
      description: t('home.emergencyDesc'),
    },
    {
      icon: '🎤',
      title: t('home.healthAssistant'),
      description: t('home.assistantDesc'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('home.welcome')} 👋</Text>
        <Text style={styles.subGreeting}>{t('home.greeting')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <MenuButton
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
            onPress={() => {
              // TODO: Navigate to respective screens
            }}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1f4788',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    fontSize: 32,
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
