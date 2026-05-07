/**
 * Hospital Detail Screen
 * Shows comprehensive hospital information with all details and actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { i18n } from '../services/languageService';
import HospitalsService from '../services/hospitalsService';
import GeolocationService from '../services/geolocationService';

const HospitalDetailScreen = ({ route, navigation }) => {
  const { hospitalId } = route?.params || {};
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    const loadHospitalDetail = async () => {
      try {
        if (!hospitalId) {
          Alert.alert(i18n.t('error'), i18n.t('hospitalNotFound'));
          navigation.goBack();
          return;
        }

        const data = await HospitalsService.getHospitalById(hospitalId);
        setHospital(data);

        // Get user location for distance calculation
        try {
          const location = await GeolocationService.getCurrentLocation();
          const dist = GeolocationService.calculateDistance(
            location.latitude,
            location.longitude,
            data.latitude,
            data.longitude
          );
          setDistance(dist);
        } catch (error) {
          console.error('Error calculating distance:', error);
        }
      } catch (error) {
        console.error('Error loading hospital:', error);
        Alert.alert(i18n.t('error'), i18n.t('failedToLoadHospital'));
      } finally {
        setLoading(false);
      }
    };

    loadHospitalDetail();
  }, [hospitalId, navigation]);

  const handleCall = () => {
    if (hospital?.phone) {
      Linking.openURL(`tel:${hospital.phone}`).catch(() => {
        Alert.alert(i18n.t('error'), i18n.t('failedToCall'));
      });
    }
  };

  const handleEmail = () => {
    if (hospital?.email) {
      Linking.openURL(`mailto:${hospital.email}`).catch(() => {
        Alert.alert(i18n.t('error'), i18n.t('failedToEmail'));
      });
    }
  };

  const handleDirections = () => {
    if (hospital) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`;
      Linking.openURL(mapsUrl).catch(() => {
        Alert.alert(i18n.t('error'), i18n.t('failedToOpenMaps'));
      });
    }
  };

  const handleShare = async () => {
    if (!hospital) return;

    const message = `
${hospital.name}
${hospital.type.toUpperCase()}

Address: ${hospital.address}
Phone: ${hospital.phone}
Rating: ⭐ ${hospital.rating}

${hospital.services ? `Services:\n${hospital.services.join('\n')}` : ''}

Emergency Available: ${hospital.emergencyAvailable ? 'Yes' : 'No'}
Ambulance Available: ${hospital.ambulanceAvailable ? 'Yes' : 'No'}
    `;

    try {
      await Share.share({
        message,
        title: hospital.name,
      });
    } catch (error) {
      Alert.alert(i18n.t('error'), i18n.t('sharingFailed'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hospital) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="hospital-box" size={48} color="#CCC" />
          <Text style={styles.emptyText}>{i18n.t('hospitalNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = {
    hospital: { color: '#E53935', icon: 'hospital-box' },
    clinic: { color: '#F57C00', icon: 'doctor' },
    pharmacy: { color: '#43A047', icon: 'pill' },
  }[hospital.type] || { color: '#1976D2', icon: 'map-marker' };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{i18n.t('details')}</Text>
          <TouchableOpacity onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={24} color="#1976D2" />
          </TouchableOpacity>
        </View>

        {/* Hospital Header Card */}
        <View style={styles.headerCard}>
          <View style={[styles.typeIcon, { backgroundColor: typeInfo.color }]}>
            <MaterialCommunityIcons name={typeInfo.icon} size={32} color="#FFF" />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.hospitalName}>{hospital.name}</Text>
            <Text style={styles.hospitalType}>{hospital.type.toUpperCase()}</Text>

            <View style={styles.ratingAndDistance}>
              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                <Text style={styles.rating}>{hospital.rating}</Text>
              </View>

              {distance && (
                <View style={styles.distanceBadge}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#4CAF50" />
                  <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#1976D2" />
            <Text style={styles.cardTitle}>{i18n.t('address')}</Text>
          </View>
          <Text style={styles.addressText}>{hospital.address}</Text>
          <Text style={styles.cityState}>
            {hospital.city}, {hospital.state}
          </Text>

          <TouchableOpacity style={styles.directionsBtn} onPress={handleDirections}>
            <MaterialCommunityIcons name="directions" size={18} color="#FFF" />
            <Text style={styles.directionsBtnText}>{i18n.t('getDirections')}</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="phone" size={20} color="#1976D2" />
            <Text style={styles.cardTitle}>{i18n.t('contact')}</Text>
          </View>

          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <MaterialCommunityIcons name="phone" size={18} color="#4CAF50" />
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>{i18n.t('phone')}</Text>
              <Text style={styles.contactValue}>{hospital.phone}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          {hospital.email && (
            <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
              <MaterialCommunityIcons name="email" size={18} color="#2196F3" />
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>{i18n.t('email')}</Text>
                <Text style={styles.contactValue}>{hospital.email}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          )}

          {hospital.website && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() =>
                Linking.openURL(`https://${hospital.website}`).catch(() => {})
              }
            >
              <MaterialCommunityIcons name="web" size={18} color="#FF9800" />
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>{i18n.t('website')}</Text>
                <Text style={styles.contactValue}>{hospital.website}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Operating Hours Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="clock" size={20} color="#1976D2" />
            <Text style={styles.cardTitle}>{i18n.t('operatingHours')}</Text>
          </View>
          <Text style={styles.operatingHours}>{hospital.operatingHours}</Text>
        </View>

        {/* Services Card */}
        {hospital.services && hospital.services.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#1976D2" />
              <Text style={styles.cardTitle}>{i18n.t('services')}</Text>
            </View>
            <View style={styles.servicesList}>
              {hospital.services.map((service, idx) => (
                <View key={idx} style={styles.serviceItem}>
                  <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Features Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="star" size={20} color="#1976D2" />
            <Text style={styles.cardTitle}>{i18n.t('features')}</Text>
          </View>

          <View style={styles.feature}>
            <MaterialCommunityIcons
              name={hospital.emergencyAvailable ? 'check-circle' : 'close-circle'}
              size={20}
              color={hospital.emergencyAvailable ? '#4CAF50' : '#999'}
            />
            <Text style={styles.featureText}>{i18n.t('emergencyAvailable')}</Text>
          </View>

          <View style={styles.feature}>
            <MaterialCommunityIcons
              name={hospital.ambulanceAvailable ? 'check-circle' : 'close-circle'}
              size={20}
              color={hospital.ambulanceAvailable ? '#4CAF50' : '#999'}
            />
            <Text style={styles.featureText}>{i18n.t('ambulanceAvailable')}</Text>
          </View>

          <View style={styles.feature}>
            <MaterialCommunityIcons
              name={hospital.acceptingNewPatients ? 'check-circle' : 'close-circle'}
              size={20}
              color={hospital.acceptingNewPatients ? '#4CAF50' : '#999'}
            />
            <Text style={styles.featureText}>{i18n.t('acceptingNewPatients')}</Text>
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('statistics')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hospital.rating}</Text>
              <Text style={styles.statLabel}>{i18n.t('rating')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hospital.reviewCount || 0}</Text>
              <Text style={styles.statLabel}>{i18n.t('reviews')}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCall}>
            <MaterialCommunityIcons name="phone" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>{i18n.t('call')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.directionsBtn2]}
            onPress={handleDirections}
          >
            <MaterialCommunityIcons name="directions" size={20} color="#1976D2" />
            <Text style={[styles.actionBtnText, styles.actionBtnTextDark]}>
              {i18n.t('directions')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.footerBackButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.footerBackButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerSpacer: {
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  footerBackButton: {
    marginTop: 12,
    marginBottom: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1976D2',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '800',
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  hospitalType: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 4,
  },
  ratingAndDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFB300',
    marginLeft: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  cityState: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  directionsBtn: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  directionsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactDetails: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  operatingHours: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  servicesList: {
    gap: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 10,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 10,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  callBtn: {
    backgroundColor: '#4CAF50',
  },
  directionsBtn2: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  actionBtnTextDark: {
    color: '#1976D2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});

export default HospitalDetailScreen;
