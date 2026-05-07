/**
 * Nearby Hospitals Screen
 * Shows hospitals, clinics, pharmacies with distance, ratings, and directions
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { i18n } from '../services/languageService';
import HospitalsService from '../services/hospitalsService';
import GeolocationService from '../services/geolocationService';
import VoiceHelpIcon from '../components/VoiceHelpIcon';
import FacilityStatusService from '../services/facilityStatusService';

const { width } = Dimensions.get('window');
const MIN_NEARBY_DISTANCE_KM = 0.1;
const NEARBY_SEARCH_RADIUS_KM = 10; // Search only within 10 km
const th = (key, defaultValue = '') => i18n.t(`screens.hospitals.${key}`, { defaultValue });
const tc = (key, defaultValue = '') => i18n.t(`common.${key}`, { defaultValue });

const NearbyHospitalsScreen = ({ route, navigation }) => {
  const [hospitals, setHospitals] = useState([]);
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [areaStats, setAreaStats] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const locationRef = useRef(null);

  // Load nearby hospitals
  const loadNearbyHospitals = useCallback(async (locationOverride = null, silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      // Get user location
      const location = locationOverride || await GeolocationService.getCurrentLocation();
      setUserLocation(location);
      locationRef.current = location;

      // Get nearby hospitals
      const apiType = selectedType;
      const nearby = await HospitalsService.getNearby(
        location.latitude,
        location.longitude,
        NEARBY_SEARCH_RADIUS_KM,
        apiType
      );

      const typeFiltered = nearby.filter((item) =>
        selectedType === 'all' ? true : item.type === selectedType
      );

      // Add distance to each hospital
      const withDistance = typeFiltered.map((hospital) => ({
        ...hospital,
        distance: GeolocationService.calculateDistance(
          location.latitude,
          location.longitude,
          hospital.latitude,
          hospital.longitude
        ),
      }));

      const nearbyOnly = withDistance
        .filter((item) => {
          const distanceKm = Number(item.distance);
          return (
            Number.isFinite(distanceKm)
            && distanceKm >= MIN_NEARBY_DISTANCE_KM
            && distanceKm <= NEARBY_SEARCH_RADIUS_KM
          );
        })
        .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));

      setHospitals(nearbyOnly);
      setFilteredHospitals(nearbyOnly);
      setLastUpdatedAt(new Date());

      // Get area stats
      try {
        const stats = await HospitalsService.getAreaSummary(
          location.latitude,
          location.longitude,
          NEARBY_SEARCH_RADIUS_KM
        );
        setAreaStats(stats);
      } catch (statsError) {
        console.error('Error loading hospital area summary:', statsError);
        setAreaStats(null);
      }
    } catch (error) {
      console.error('Error loading hospitals:', error);
      Alert.alert(tc('error', 'Error'), error?.message || th('failedToLoadHospitals', 'Failed to load hospitals'));
      setHospitals([]);
      setFilteredHospitals([]);
      setAreaStats(null);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedType]);

  useFocusEffect(
    useCallback(() => {
      let locationSubscription;
      loadNearbyHospitals();

      const intervalId = setInterval(() => {
        loadNearbyHospitals(locationRef.current, true);
      }, 30000);

      (async () => {
        try {
          locationSubscription = await GeolocationService.watchLocation(
            (nextLocation) => {
              locationRef.current = nextLocation;
              setUserLocation(nextLocation);
              loadNearbyHospitals(nextLocation, true);
            },
            () => {}
          );
        } catch (error) {
          // non-blocking: periodic refresh still runs
        }
      })();

      return () => {
        clearInterval(intervalId);
        GeolocationService.stopWatchingLocation(locationSubscription);
      };
    }, [loadNearbyHospitals])
  );

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNearbyHospitals();
    setRefreshing(false);
  }, [loadNearbyHospitals]);

  // Handle search and filtering
  useEffect(() => {
    let filtered = hospitals;

    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.address.toLowerCase().includes(query) ||
          h.services?.some((s) => s.toLowerCase().includes(query))
      );
    }

    setFilteredHospitals(filtered);
  }, [searchQuery, hospitals]);

  // Get type color and icon
  const getTypeInfo = (type) => {
    const types = {
      hospital: { color: '#E53935', icon: 'hospital-box' },
      clinic: { color: '#F57C00', icon: 'doctor' },
      pharmacy: { color: '#43A047', icon: 'pill' },
    };
    return types[type] || { color: '#1976D2', icon: 'map-marker' };
  };

  const getDialablePhoneNumber = (phone) => {
    if (!phone) return '';
    const firstNumber = String(phone).split(/[;,]/)[0].trim();
    return firstNumber.replace(/[^\d+]/g, '');
  };

  // Handle call
  const handleCall = async (phone, name = '') => {
    const dialableNumber = getDialablePhoneNumber(phone);

    if (!dialableNumber) {
      Alert.alert(
        tc('error', 'Error'),
        th('phoneNotAvailable', `${name || 'This facility'} does not have a phone number listed`)
      );
      return;
    }

    const telUrl = `tel:${dialableNumber}`;

    try {
      const supported = await Linking.canOpenURL(telUrl);
      if (!supported) {
        Alert.alert(tc('error', 'Error'), th('failedToCall', 'Failed to make call'));
        return;
      }

      await Linking.openURL(telUrl);
    } catch (error) {
      Alert.alert(tc('error', 'Error'), th('failedToCall', 'Failed to make call'));
    }
  };

  // Handle directions
  const handleDirections = (latitude, longitude, name) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(mapsUrl).catch(() => {
      Alert.alert(tc('error', 'Error'), th('failedToOpenMaps', 'Failed to open maps'));
    });
  };

  // Render hospital card
  const renderHospitalCard = ({ item }) => {
    const typeInfo = getTypeInfo(item.type);
    const dialablePhone = getDialablePhoneNumber(item.phone);
    const statusLabel = FacilityStatusService.getStatusLabel(item.operatingHours);
    const statusColor = FacilityStatusService.getStatusColor(item.operatingHours);
    const nextStatusChange = FacilityStatusService.getNextStatusChange(item.operatingHours);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (navigation?.getState?.()?.routeNames?.includes('HospitalDetail')) {
            navigation.navigate('HospitalDetail', { hospitalId: item.id });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeInfo.color }]}>
            <MaterialCommunityIcons name={typeInfo.icon} size={24} color="#FFF" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.hospitalName}>{item.name}</Text>
            <View style={styles.typeAndDistance}>
              <Text style={styles.hospitalType}>{item.type.toUpperCase()}</Text>
              <View style={styles.distanceBadge}>
                <MaterialCommunityIcons name="map-marker" size={12} color="#1976D2" />
                <Text style={styles.distance}>{Number(item.distance || 0).toFixed(1)} km</Text>
              </View>
            </View>
          </View>
          <View style={styles.ratingBox}>
            <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
            <Text style={styles.rating}>{item.rating ?? '-'}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <MaterialCommunityIcons 
            name={statusLabel === 'Open' ? 'check-circle' : 'clock-outline'} 
            size={14} 
            color="#FFF" 
          />
          <Text style={styles.statusText}>{statusLabel}</Text>
          {nextStatusChange && <Text style={styles.nextStatusText}> • {nextStatusChange}</Text>}
        </View>

        <Text style={styles.address}>{item.address}</Text>

        {dialablePhone ? (
          <Text style={styles.address}>{th('phone', 'Phone')}: {item.phone}</Text>
        ) : null}

        {item.services && item.services.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={styles.servicesLabel}>{th('services', 'Services')}</Text>
            <View style={styles.servicesList}>
              {item.services.slice(0, 3).map((service, idx) => (
                <View key={idx} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
              {item.services.length > 3 && (
                <Text style={styles.moreServices}>+{item.services.length - 3}</Text>
              )}
            </View>
          </View>
        )}

        {item.emergencyAvailable && (
          <View style={styles.emergencyBadge}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#E53935" />
            <Text style={styles.emergencyText}>{th('emergencyAvailable', 'Emergency Services Available')}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          {dialablePhone ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={() => handleCall(item.phone, item.name)}
            >
              <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
              <Text style={styles.actionText}>{th('call', 'Call')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => handleDirections(item.latitude, item.longitude, item.name)}
          >
            <MaterialCommunityIcons name="directions" size={18} color="#1976D2" />
            <Text style={[styles.actionText, styles.directionsText]}>
              {th('directions', 'Directions')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{th('title', 'Nearby Hospitals')}</Text>
          <View style={styles.headerActions}>
            <VoiceHelpIcon 
              screenName="NearbyHospitals"
              language="en"
            />
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <MaterialCommunityIcons name="refresh" size={24} color="#1976D2" />
            </TouchableOpacity>
          </View>
        </View>

      {userLocation && (
        <View style={styles.locationSection}>
          <View style={styles.locationPill}>
            <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#1976D2" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>{th('currentLocation', 'Your Location')}</Text>
              <Text style={styles.locationCoords}>
                {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.accuracyText}>
                Accuracy: ±{Math.round(userLocation.accuracy || 50)}m
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => loadNearbyHospitals(null, false)}
              style={styles.refreshLocationButton}
            >
              <MaterialCommunityIcons name="refresh" size={18} color="#1976D2" />
            </TouchableOpacity>
          </View>

          {lastUpdatedAt && (
            <Text style={styles.updatedText}>
              🔄 Showing hospitals from {MIN_NEARBY_DISTANCE_KM.toFixed(1)} km to {NEARBY_SEARCH_RADIUS_KM} km • Updated: {lastUpdatedAt.toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder={th('searchPlaceholder', 'Search hospitals, clinics, or pharmacies')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Area Summary */}
      {areaStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{th('hospitals', 'Hospitals')}</Text>
            <Text style={styles.statValue}>{areaStats.hospitals || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{th('clinics', 'Clinics')}</Text>
            <Text style={styles.statValue}>{areaStats.clinics || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{th('pharmacies', 'Pharmacies')}</Text>
            <Text style={styles.statValue}>{areaStats.pharmacies || 0}</Text>
          </View>
        </View>
      )}

      {/* Filter Tags */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['all', 'hospital', 'clinic', 'pharmacy'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterTag,
              selectedType === type && styles.filterTagActive,
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text
              style={[
                styles.filterTagText,
                selectedType === type && styles.filterTagTextActive,
              ]}
            >
              {type === 'all'
                ? th('allTypes', 'All')
                : type === 'hospital'
                ? th('hospitals', 'Hospitals')
                : type === 'clinic'
                ? th('clinics', 'Clinics')
                : th('pharmacies', 'Pharmacies')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading or Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>{tc('loading', 'Loading...')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHospitals}
          renderItem={renderHospitalCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="hospital-box" size={48} color="#CCC" />
              <Text style={styles.emptyText}>
                {selectedType === 'all'
                  ? th('noNearbyFacilitiesFound', 'No nearby facilities found')
                  : selectedType === 'clinic'
                  ? th('noClinicsNearby', 'No nearby clinics found')
                  : selectedType === 'pharmacy'
                  ? th('noPharmaciesNearby', 'No nearby pharmacies found')
                  : th('noHospitalsNearby', 'No nearby hospitals found')}
              </Text>
            </View>
          }
        />
      )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#1976D2',
    gap: 10,
  },
  locationSection: {
    backgroundColor: '#F5F5F5',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '700',
    marginBottom: 2,
  },
  locationCoords: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  accuracyText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  refreshLocationButton: {
    padding: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
  },
  updatedText: {
    fontSize: 11,
    color: '#1976D2',
    marginHorizontal: 14,
    marginBottom: 8,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 12,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  filterScroll: {
    height: 40,
    paddingHorizontal: 12,
  },
  filterTag: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
  },
  filterTagActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterTagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterTagTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  typeAndDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hospitalType: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginRight: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distance: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
    marginLeft: 2,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFB300',
    marginLeft: 2,
  },
  address: {
    fontSize: 12,
    color: '#666',
    marginVertical: 8,
    lineHeight: 16,
  },
  servicesSection: {
    marginVertical: 8,
  },
  servicesLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
    fontWeight: '600',
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceText: {
    fontSize: 10,
    color: '#666',
  },
  moreServices: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '600',
    marginTop: 2,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 8,
  },
  emergencyText: {
    fontSize: 11,
    color: '#E53935',
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 4,
  },
  nextStatusText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  directionsButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  directionsText: {
    color: '#1976D2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});

export default NearbyHospitalsScreen;


