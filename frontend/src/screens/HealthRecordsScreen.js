import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const RecordCard = ({ type, title, date, details }) => (
  <View style={styles.recordCard}>
    <View style={styles.recordHeader}>
      <Text style={styles.recordType}>{type}</Text>
      <Text style={styles.recordDate}>{date}</Text>
    </View>
    <Text style={styles.recordTitle}>{title}</Text>
    <Text style={styles.recordDetails}>{details}</Text>
  </View>
);

export default function HealthRecordsScreen() {
  const [activeTab, setActiveTab] = useState('prescriptions');

  const prescriptions = [
    {
      id: 1,
      type: '💊',
      title: 'Amoxicillin',
      date: '2024-03-01',
      details: 'Dose: 500mg, 3x daily for 7 days\nDoctor: Dr. Rajesh Singh',
    },
    {
      id: 2,
      type: '💊',
      title: 'Vitamin D3',
      date: '2024-02-15',
      details: 'Dose: 1000 IU daily\nDoctor: Dr. Priya Sharma',
    },
  ];

  const reports = [
    {
      id: 1,
      type: '📄',
      title: 'Blood Test Report',
      date: '2024-02-28',
      details: 'Haemoglobin: 12.5 g/dL\nRBC: 4.5 million/μL',
    },
    {
      id: 2,
      type: '📄',
      title: 'Chest X-Ray',
      date: '2024-02-10',
      details: 'Status: Normal\nNo abnormalities detected',
    },
  ];

  const consultations = [
    {
      id: 1,
      type: '👨‍⚕️',
      title: 'General Checkup',
      date: '2024-03-05',
      details: 'Doctor: Dr. Arun Kumar\nComplaints: Mild cough and cold',
    },
    {
      id: 2,
      type: '👨‍⚕️',
      title: 'Dental Consultation',
      date: '2024-02-20',
      details: 'Doctor: Dr. Meera Patel\nIssue: Tooth cleaning',
    },
  ];

  const getTabData = () => {
    switch (activeTab) {
      case 'prescriptions':
        return prescriptions;
      case 'reports':
        return reports;
      case 'consultations':
        return consultations;
      default:
        return prescriptions;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'prescriptions':
        return t('screens.records.prescriptions');
      case 'reports':
        return t('screens.records.reports');
      case 'consultations':
        return t('screens.records.consultations');
      default:
        return '';
    }
  };

  const tabData = getTabData();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.records.title')}</Text>
        <Text style={styles.subtitle}>{t('screens.records.subtitle')}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabLabel, activeTab === 'prescriptions' && styles.activeTabLabel]}>
            💊 {t('screens.records.prescriptions')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabLabel, activeTab === 'reports' && styles.activeTabLabel]}>
            📄 {t('screens.records.reports')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'consultations' && styles.activeTab]}
          onPress={() => setActiveTab('consultations')}
        >
          <Text style={[styles.tabLabel, activeTab === 'consultations' && styles.activeTabLabel]}>
            👨‍⚕️ {t('screens.records.consultations')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {tabData.length > 0 ? (
          tabData.map((item) => (
            <RecordCard
              key={item.id}
              type={item.type}
              title={item.title}
              date={item.date}
              details={item.details}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>{t('screens.records.noRecords')}</Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 20,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#e8f5e9',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  activeTabLabel: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4788',
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recordDetails: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
