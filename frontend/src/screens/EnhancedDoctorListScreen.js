import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const DoctorCard = ({ doctor, onPress }) => (
  <TouchableOpacity style={styles.doctorCard} onPress={onPress}>
    <View style={styles.cardTop}>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorImage}>{doctor.image}</Text>
        <View style={styles.infoSection}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.specialization}>{doctor.specialization}</Text>
          <Text style={styles.hospital}>🏥 {doctor.hospital}</Text>
        </View>
      </View>
      <View style={styles.ratingBadge}>
        <Text style={styles.rating}>⭐</Text>
        <Text style={styles.ratingValue}>{doctor.rating}</Text>
        <Text style={styles.reviewCount}>({doctor.reviews})</Text>
      </View>
    </View>

    <View style={styles.cardDetails}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>{t('screens.doctor.experience', 'Exp')}</Text>
        <Text style={styles.detailValue}>{doctor.experience} yrs</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>{t('screens.doctor.fee', 'Fee')}</Text>
        <Text style={styles.detailValue}>₹{doctor.consultationFee}</Text>
      </View>
    </View>

    <TouchableOpacity style={styles.viewButton}>
      <Text style={styles.viewButtonText}>
        {t('screens.doctor.viewProfile', 'View Profile')}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

export default function EnhancedDoctorListScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      // In production, fetch from backend
      const mockDoctors = [
        {
          id: 'doc_001',
          name: 'Dr. Rajesh Singh',
          specialization: 'General Physician',
          experience: 12,
          hospital: 'City General Hospital',
          rating: 4.8,
          reviews: 156,
          consultationFee: 500,
          image: '👨‍⚕️',
        },
        {
          id: 'doc_002',
          name: 'Dr. Priya Sharma',
          specialization: 'Pediatrician',
          experience: 8,
          hospital: 'Rural Health Centre',
          rating: 4.6,
          reviews: 98,
          consultationFee: 400,
          image: '👩‍⚕️',
        },
        {
          id: 'doc_003',
          name: 'Dr. Arun Kumar',
          specialization: 'Cardiologist',
          experience: 15,
          hospital: 'Apollo Medical Centre',
          rating: 4.9,
          reviews: 234,
          consultationFee: 800,
          image: '👨‍⚕️',
        },
        {
          id: 'doc_004',
          name: 'Dr. Meera Patel',
          specialization: 'Dermatologist',
          experience: 10,
          hospital: 'Community Health Clinic',
          rating: 4.7,
          reviews: 142,
          consultationFee: 600,
          image: '👩‍⚕️',
        },
      ];
      setDoctors(mockDoctors);
      setFilteredDoctors(mockDoctors);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = doctors;

    // Filter by search query
    if (searchQuery.length > 0) {
      filtered = filtered.filter(
        doctor =>
          doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by specialization
    if (selectedSpecialization !== 'All') {
      filtered = filtered.filter(
        doctor => doctor.specialization === selectedSpecialization
      );
    }

    setFilteredDoctors(filtered);
  }, [searchQuery, selectedSpecialization, doctors]);

  const specializations = [
    'All',
    'General Physician',
    'Pediatrician',
    'Cardiologist',
    'Dermatologist',
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.doctor.title', 'Consult Doctor')}</Text>
        <Text style={styles.subtitle}>
          {t('screens.doctor.subtitle', 'Book appointment with doctors')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('screens.doctor.searchPlaceholder', 'Search doctor or specialty')}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Specialization Filter */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.specializationScroll}
          >
            {specializations.map(spec => (
              <TouchableOpacity
                key={spec}
                style={[
                  styles.filterChip,
                  selectedSpecialization === spec && styles.filterChipActive,
                ]}
                onPress={() => setSelectedSpecialization(spec)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSpecialization === spec && styles.filterChipTextActive,
                  ]}
                >
                  {spec}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Counter */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredDoctors.length}{' '}
            {t('screens.doctor.doctorsFound', 'doctors found')}
          </Text>
        </View>

        {/* Doctors List */}
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map(doctor => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onPress={() =>
                navigation.navigate('DoctorProfile', { doctorId: doctor.id })
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>
              {t('screens.doctor.noDoctorsFound', 'No doctors found')}
            </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterSection: {
    marginBottom: 16,
  },
  specializationScroll: {
    flexGrow: 0,
  },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  doctorCard: {
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  doctorImage: {
    fontSize: 40,
    marginRight: 12,
  },
  infoSection: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4788',
  },
  specialization: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  hospital: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rating: {
    fontSize: 18,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff9800',
  },
  reviewCount: {
    fontSize: 10,
    color: '#999',
  },
  cardDetails: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f4788',
    marginTop: 4,
  },
  viewButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
