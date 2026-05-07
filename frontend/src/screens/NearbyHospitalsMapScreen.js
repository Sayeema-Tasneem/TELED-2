/**
 * Nearby Hospitals Map Screen
 * Shows hospitals on Google Maps with your current location
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { i18n } from '../services/languageService';
import HospitalsService from '../services/hospitalsService';
import GeolocationService from '../services/geolocationService';

const { width, height } = Dimensions.get('window');
const MIN_SEARCH_DISTANCE_KM = 0.1;
const SEARCH_RADIUS_KM = 10;

const NearbyHospitalsMapScreen = ({ navigation }) => {
  const [hospitals, setHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showListView, setShowListView] = useState(false);
  const mapRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  // Request location permission and load hospitals
  const loadHospitals = useCallback(async () => {
    try {
      setLoading(true);

      // Request location permission
      const hasPermission = await GeolocationService.checkLocationPermission();
      if (!hasPermission) {
        const granted = await GeolocationService.requestLocationPermission();
        if (!granted) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location access to find nearby hospitals',
            [
              {
                text: 'Retry',
                onPress: () => loadHospitals(),
              },
              {
                text: 'Cancel',
                onPress: () => setLoading(false),
              },
            ]
          );
          return;
        }
      }

      // Get current location with detailed logging
      console.log('📍 Requesting FRESH current location...');
      const location = await GeolocationService.getCurrentLocation();
      
      const logInfo = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: Math.round(location.accuracy),
        timestamp: new Date(location.timestamp).toLocaleTimeString(),
      };
      
      console.log('✅ GOT FRESH GPS LOCATION:', logInfo);
      console.log('🗺️ Map URL for debugging:', 
        `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      );

      setUserLocation(location);

      // Fetch nearby hospitals
      console.log('🏥 Fetching hospitals within ' + SEARCH_RADIUS_KM + ' km...');
      const nearby = await HospitalsService.getNearby(
        location.latitude,
        location.longitude,
        SEARCH_RADIUS_KM,
        'all'
      );

      // Calculate distances and sort
      const withDistance = nearby.map((hospital) => ({
        ...hospital,
        distance: GeolocationService.calculateDistance(
          location.latitude,
          location.longitude,
          hospital.latitude,
          hospital.longitude
        ),
      }));

      const sorted = withDistance
        .filter((item) => {
          const distanceKm = Number(item?.distance);
          return (
            Number.isFinite(distanceKm)
            && distanceKm >= MIN_SEARCH_DISTANCE_KM
            && distanceKm <= SEARCH_RADIUS_KM
          );
        })
        .sort((a, b) => a.distance - b.distance);
      console.log(`✅ Found ${sorted.length} hospitals`);
      setHospitals(sorted);

      // Center map on user location
      if (mapRef.current && location) {
        mapRef.current.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000
        );
      }
    } catch (error) {
      console.error('❌ Error loading hospitals:', error);
      Alert.alert('Error', error.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load hospitals when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadHospitals();

      // Watch for location updates every 30 seconds
      const intervalId = setInterval(() => {
        loadHospitals();
      }, 30000);

      return () => clearInterval(intervalId);
    }, [loadHospitals])
  );

  const getTypeColor = (type) => {
    switch (type) {
      case 'hospital':
        return '#E53935';
      case 'clinic':
        return '#F57C00';
      case 'pharmacy':
        return '#43A047';
      default:
        return '#1976D2';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'hospital':
        return 'hospital-box';
      case 'clinic':
        return 'doctor';
      case 'pharmacy':
        return 'pill';
      default:
        return 'map-marker';
    }
  };

  const handleMarkerPress = (hospital) => {
    setSelectedHospital(hospital);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    }
  };

  const handleCallHospital = async (hospital) => {
    if (!hospital.phone) {
      Alert.alert('No Phone Number', 'This facility does not have a phone number listed');
      return;
    }

    const phoneNumber = hospital.phone.split(/[;,]/)[0].trim().replace(/[^\d+]/g, '');
    if (!phoneNumber) return;

    try {
      const { Linking } = require('react-native');
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to make call');
    }
  };

  const handleDirections = (hospital) => {
    const { Linking } = require('react-native');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`;
    Linking.openURL(mapsUrl).catch(() => {
      Alert.alert('Error', 'Failed to open maps');
    });
  };

  if (loading && !userLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Getting your location...</Text>
          <Text style={styles.loadingSubtext}>Searching for nearby hospitals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={
          userLocation
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : {
                latitude: 12.9716,
                longitude: 77.5946,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
        showsUserLocation={true}
        followsUserLocation={false}
      >
        {/* User Location Marker */}
        {userLocation && (
          <>
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              title="Your Location"
              description={`Accuracy: ±${Math.round(userLocation.accuracy)}m`}
            >
              <View style={styles.userLocationMarker}>
                <View style={styles.userLocationDot} />
              </View>
            </Marker>

            {/* 10 km search radius circle */}
            <Circle
              center={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              radius={SEARCH_RADIUS_KM * 1000}
              strokeColor="rgba(25, 118, 210, 0.2)"
              fillColor="rgba(25, 118, 210, 0.1)"
              strokeWidth={2}
            />
          </>
        )}

        {/* Hospital Markers */}
        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            coordinate={{
              latitude: hospital.latitude,
              longitude: hospital.longitude,
            }}
            onPress={() => handleMarkerPress(hospital)}
            pinColor={getTypeColor(hospital.type)}
            title={hospital.name}
            description={`${hospital.distance.toFixed(1)} km away`}
          />
        ))}
      </MapView>

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Nearby Hospitals</Text>
          <Text style={styles.headerSubtitle}>
            {hospitals.length} facilities found from {MIN_SEARCH_DISTANCE_KM.toFixed(1)} km to {SEARCH_RADIUS_KM} km
          </Text>
          {userLocation && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>Your GPS: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</Text>
              <Text style={styles.debugText}>Accuracy: ±{Math.round(userLocation.accuracy)}m</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={loadHospitals} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={24} color="#1976D2" />
        </TouchableOpacity>
      </View>

      {/* Toggle View Button */}
      <TouchableOpacity
        style={[styles.toggleButton, showListView && styles.toggleButtonActive]}
        onPress={() => setShowListView(!showListView)}
      >
        <MaterialCommunityIcons
          name={showListView ? 'map' : 'format-list-bulleted'}
          size={20}
          color="#FFF"
        />
        <Text style={styles.toggleButtonText}>{showListView ? 'Show Map' : 'Show List'}</Text>
      </TouchableOpacity>

      {/* Hospital List View (Bottom Sheet) */}
      {showListView ? (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {hospitals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="hospital-box" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No hospitals found nearby</Text>
            </View>
          ) : (
            hospitals.map((hospital) => (
              <TouchableOpacity
                key={hospital.id}
                style={styles.listItem}
                onPress={() => {
                  handleMarkerPress(hospital);
                  setShowListView(false);
                }}
              >
                <View style={[styles.listItemIcon, { backgroundColor: getTypeColor(hospital.type) }]}>
                  <MaterialCommunityIcons name={getTypeIcon(hospital.type)} size={20} color="#FFF" />
                </View>

                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{hospital.name}</Text>
                  <Text style={styles.listItemDistance}>
                    📍 {hospital.distance.toFixed(1)} km away
                  </Text>
                  <Text style={styles.listItemAddress}>{hospital.address}</Text>
                  <View style={styles.listItemRating}>
                    <MaterialCommunityIcons name="star" size={12} color="#FFB300" />
                    <Text style={styles.listItemRatingText}>
                      {hospital.rating ? hospital.rating.toFixed(1) : 'N/A'} ⭐
                    </Text>
                  </View>
                </View>

                <View style={styles.listItemActions}>
                  {hospital.phone && (
                    <TouchableOpacity
                      onPress={() => handleCallHospital(hospital)}
                      style={styles.actionIcon}
                    >
                      <MaterialCommunityIcons name="phone" size={18} color="#4CAF50" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDirections(hospital)}
                    style={styles.actionIcon}
                  >
                    <MaterialCommunityIcons name="directions" size={18} color="#1976D2" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        // Selected Hospital Info Card (Map View)
        selectedHospital && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoCardIcon, { backgroundColor: getTypeColor(selectedHospital.type) }]}>
                <MaterialCommunityIcons name={getTypeIcon(selectedHospital.type)} size={24} color="#FFF" />
              </View>
              <View style={styles.infoCardTitle}>
                <Text style={styles.infoCardName}>{selectedHospital.name}</Text>
                <Text style={styles.infoCardType}>{selectedHospital.type.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedHospital(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardDistance}>📍 {selectedHospital.distance.toFixed(1)} km away</Text>
              <Text style={styles.infoCardAddress}>{selectedHospital.address}</Text>

              {selectedHospital.rating && (
                <View style={styles.infoCardRating}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                  <Text style={styles.infoCardRatingText}>{selectedHospital.rating.toFixed(1)} rating</Text>
                </View>
              )}

              {selectedHospital.phone && (
                <Text style={styles.infoCardPhone}>📞 {selectedHospital.phone}</Text>
              )}

              {selectedHospital.operatingHours && (
                <Text style={styles.infoCardHours}>🕐 {selectedHospital.operatingHours}</Text>
              )}
            </View>

            <View style={styles.infoCardActions}>
              {selectedHospital.phone && (
                <TouchableOpacity
                  style={[styles.infoActionButton, styles.callButton]}
                  onPress={() => handleCallHospital(selectedHospital)}
                >
                  <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
                  <Text style={styles.infoActionText}>Call</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.infoActionButton, styles.directionsButton]}
                onPress={() => handleDirections(selectedHospital)}
              >
                <MaterialCommunityIcons name="directions" size={18} color="#1976D2" />
                <Text style={[styles.infoActionText, { color: '#1976D2' }]}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  debugInfo: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  debugText: {
    fontSize: 9,
    color: '#FF6B6B',
    fontFamily: 'monospace',
    lineHeight: 12,
  },
  refreshButton: {
    padding: 8,
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    borderWidth: 3,
    borderColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
  },
  toggleButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#1976D2',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#43A047',
  },
  toggleButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  listContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.6,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  listItemDistance: {
    fontSize: 11,
    color: '#1976D2',
    marginTop: 2,
    fontWeight: '600',
  },
  listItemAddress: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  listItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  listItemRatingText: {
    fontSize: 10,
    color: '#FFB300',
    fontWeight: '600',
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 6,
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoCardTitle: {
    flex: 1,
  },
  infoCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  infoCardType: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  infoCardContent: {
    marginBottom: 12,
  },
  infoCardDistance: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  infoCardAddress: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    lineHeight: 16,
  },
  infoCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  infoCardRatingText: {
    fontSize: 11,
    color: '#FFB300',
    fontWeight: '600',
  },
  infoCardPhone: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 6,
    fontWeight: '600',
  },
  infoCardHours: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  infoCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  infoActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  directionsButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  infoActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});

export default NearbyHospitalsMapScreen;
