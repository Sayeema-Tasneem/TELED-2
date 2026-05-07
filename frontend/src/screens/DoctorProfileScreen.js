import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const InfoSection = ({ icon, title, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.infoContent}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export default function DoctorProfileScreen({ route, navigation }) {
  const { doctorId } = route.params;
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorDetails();
  }, [doctorId]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      // Mock doctor details - in production, fetch from backend API
      const mockDoctorDetails = {
        id: 'doc_001',
        name: 'Dr. Rajesh Singh',
        specialization: 'General Physician',
        qualification: 'MBBS, MD',
        experience: 12,
        hospital: 'City General Hospital',
        rating: 4.8,
        reviews: 156,
        consultationFee: 500,
        image: '👨‍⚕️',
        about:
          'Experienced general physician with 12 years of practice in rural healthcare. Specializes in preventive medicine and chronic disease management.',
        languages: ['English', 'Hindi', 'Punjabi'],
        consultationType: ['In-Person', 'Video Call', 'Audio Call'],
        recentReviews: [
          {
            name: 'Ramesh K.',
            rating: 5,
            text: 'Excellent service. Very patient and explained everything clearly.',
            date: '2024-02-28',
          },
          {
            name: 'Sunita M.',
            rating: 5,
            text: 'Best doctor in the area. Highly recommended!',
            date: '2024-02-25',
          },
          {
            name: 'Vikram P.',
            rating: 4,
            text: 'Good consultation. Would recommend.',
            date: '2024-02-20',
          },
        ],
      };

      // Simulate finding the doctor based on ID
      let selectedDoctor = mockDoctorDetails;
      if (doctorId === 'doc_002') {
        selectedDoctor = {
          ...mockDoctorDetails,
          id: 'doc_002',
          name: 'Dr. Priya Sharma',
          specialization: 'Pediatrician',
          qualification: 'MBBS, DCH',
          experience: 8,
          hospital: 'Rural Health Centre',
          rating: 4.6,
          reviews: 98,
          consultationFee: 400,
          image: '👩‍⚕️',
          about: 'Specialized in child healthcare and preventive medicine.',
          languages: ['English', 'Hindi', 'Kannada'],
          consultationType: ['In-Person', 'Video Call'],
        };
      }

      setDoctor(selectedDoctor);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch doctor details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Doctor not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Doctor Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
        </View>

        {/* Doctor Card */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorImage}>{doctor.image}</Text>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.specialization}>{doctor.specialization}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingValue}>⭐ {doctor.rating}</Text>
            <Text style={styles.reviewCount}>
              ({doctor.reviews} {t('screens.doctor.reviews', 'reviews')})
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>📚</Text>
              <Text style={styles.badgeText}>{doctor.qualification}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🏥</Text>
              <Text style={styles.badgeText}>{doctor.experience} yrs</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{doctor.about}</Text>
        </View>

        {/* Information Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>

          <InfoSection icon="🏢" title="Hospital" value={doctor.hospital} />
          <InfoSection
            icon="💷"
            title="Consultation Fee"
            value={`₹${doctor.consultationFee}`}
          />
          <InfoSection icon="🗣️" title="Languages" value={doctor.languages.join(', ')} />
        </View>

        {/* Consultation Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Types</Text>
          <View style={styles.consultationTypes}>
            {doctor.consultationType.map(type => (
              <View key={type} style={styles.consultationBadge}>
                <Text style={styles.consultationText}>{type}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Reviews</Text>
          {doctor.recentReviews.map((review, index) => (
            <View key={index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{review.name}</Text>
                <Text style={styles.reviewRating}>⭐ {review.rating}</Text>
              </View>
              <Text style={styles.reviewDate}>{review.date}</Text>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() =>
              navigation.navigate('BookAppointment', { doctorId: doctor.id })
            }
          >
            <Text style={styles.bookButtonText}>
              {t('screens.doctor.bookAppointment', 'Book Appointment')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={() =>
              Alert.alert('Call', `Calling ${doctor.name}...`)
            }
          >
            <Text style={styles.callButtonText}>📞 Quick Call</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.footerBackButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.footerBackButtonText}>← Back</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  footerBackButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1f4788',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f4788',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    padding: 16,
  },
  doctorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  doctorImage: {
    fontSize: 60,
    marginBottom: 12,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f4788',
  },
  specialization: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff9800',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 13,
    color: '#666',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  badge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f4788',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginTop: 4,
  },
  aboutText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  consultationTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  consultationBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  consultationText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  reviewRating: {
    fontSize: 13,
    color: '#ff9800',
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  actionSection: {
    marginHorizontal: 16,
    marginVertical: 12,
    marginBottom: 8,
    marginTop: 8,
    gap: 12,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  callButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
