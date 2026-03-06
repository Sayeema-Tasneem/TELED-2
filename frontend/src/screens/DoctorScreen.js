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

const DoctorCard = ({ doctor, onPress }) => (
  <TouchableOpacity style={styles.doctorCard} onPress={onPress}>
    <View style={styles.doctorInfo}>
      <Text style={styles.doctorName}>{doctor.name}</Text>
      <Text style={styles.specialization}>{doctor.specialization}</Text>
      <View style={styles.ratingContainer}>
        <Text style={styles.rating}>⭐ {doctor.rating}</Text>
        <Text style={styles.consultFee}>{doctor.consultFee}</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.bookButton}>
      <Text style={styles.bookButtonText}>{t('common.next')}</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

export default function DoctorScreen() {
  const [doctors] = useState([
    {
      id: 1,
      name: 'Dr. Rajesh Kumar',
      specialization: 'General Medicine',
      rating: 4.8,
      consultFee: '₹300',
    },
    {
      id: 2,
      name: 'Dr. Priya Singh',
      specialization: 'Pediatrician',
      rating: 4.9,
      consultFee: '₹350',
    },
    {
      id: 3,
      name: 'Dr. Amit Patel',
      specialization: 'Cardiologist',
      rating: 4.7,
      consultFee: '₹500',
    },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.doctor.title')}</Text>
        <Text style={styles.subtitle}>{t('screens.doctor.subtitle')}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>{t('screens.doctor.searchDoctors')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>{t('screens.doctor.myAppointments')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <DoctorCard doctor={item} onPress={() => {}} />
          )}
          scrollEnabled={false}
        />
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
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#e0e0e0',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  specialization: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 12,
  },
  consultFee: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4788',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
