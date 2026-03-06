import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
} from 'react-native';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const HospitalCard = ({ name, type, distance, rating, phone, address }) => (
  <View style={styles.hospitalCard}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleSection}>
        <Text style={styles.hospitalName}>{name}</Text>
        <Text style={styles.hospitalType}>{type}</Text>
      </View>
      <View style={styles.ratingBadge}>
        <Text style={styles.ratingText}>⭐ {rating}</Text>
      </View>
    </View>

    <View style={styles.cardDetails}>
      <Text style={styles.detailText}>📍 {distance}</Text>
      <Text style={styles.detailText}>{address}</Text>
    </View>

    <View style={styles.cardActions}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Call', `Calling ${phone}`)}
      >
        <Text style={styles.actionButtonText}>📞 {t('screens.hospitals.call')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.directionButton]}
        onPress={() => Alert.alert('Directions', `Opening directions to ${name}`)}
      >
        <Text style={styles.directionButtonText}>🗺️ {t('screens.hospitals.directions')}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function NearbyHospitalsScreen() {
  const [hospitals] = useState([
    {
      id: 1,
      name: 'City General Hospital',
      type: 'Multi-Specialty',
      distance: '2.3 km away',
      rating: 4.5,
      phone: '+91-80-4242-4242',
      address: '123 Main Street, Health Nagar',
    },
    {
      id: 2,
      name: 'Rural Health Centre',
      type: 'Primary Health Centre',
      distance: '1.8 km away',
      rating: 4.2,
      phone: '+91-80-1234-5678',
      address: '456 Village Road, Gram Panchayat',
    },
    {
      id: 3,
      name: 'Apollo Medical Centre',
      type: 'Diagnostic Centre',
      distance: '3.5 km away',
      rating: 4.7,
      phone: '+91-80-9876-5432',
      address: '789 Tech Park, Medical District',
    },
    {
      id: 4,
      name: 'Community Health Clinic',
      type: 'Primary Health Centre',
      distance: '1.2 km away',
      rating: 4.0,
      phone: '+91-80-1111-2222',
      address: '321 Market Road, Town Centre',
    },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.hospitals.title')}</Text>
        <Text style={styles.subtitle}>{t('screens.hospitals.subtitle')}</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>{t('screens.hospitals.mapPlaceholder')}</Text>
        <Text style={styles.mapSubText}>{t('screens.hospitals.mapSubtext')}</Text>
      </View>

      <View style={styles.filterSection}>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>🔍 {t('screens.hospitals.search')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>⚙️ {t('screens.hospitals.filter')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {hospitals.length} {t('screens.hospitals.found')}
          </Text>
        </View>
        {hospitals.map((hospital) => (
          <HospitalCard key={hospital.id} {...hospital} />
        ))}
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
  mapPlaceholder: {
    backgroundColor: '#e3f2fd',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#90caf9',
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4788',
  },
  mapSubText: {
    fontSize: 12,
    color: '#64b5f6',
    marginTop: 4,
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f4788',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  hospitalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4788',
  },
  hospitalType: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cardDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  directionButton: {
    backgroundColor: '#bbdefb',
  },
  directionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4788',
  },
});
