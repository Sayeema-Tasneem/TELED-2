/**
 * Geolocation Service
 * Handles location requests and permission management using Expo Location
 */

import * as Location from 'expo-location';

class GeolocationService {
  /**
   * Request location permission
   */
  static async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is already granted
   */
  static async checkLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current user location (one-time)
   * @param {object} options - Location options
   * @returns {object} {latitude, longitude, accuracy}
   */
  static async getCurrentLocation(options = {}) {
    try {
      const hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      // ALWAYS get fresh high-accuracy location (not cached)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest, // High accuracy to get real location
        timeout: 15000, // 15 second timeout
        maximumAge: 0, // Don't use cached location - get fresh
        ...options,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      console.log('📍 Got fresh GPS location:', {
        lat: coords.latitude.toFixed(4),
        lon: coords.longitude.toFixed(4),
        accuracy: Math.round(coords.accuracy) + ' meters',
      });

      return coords;
    } catch (error) {
      console.error('❌ Error getting current location:', error.message);
      
      // If high accuracy fails, try balanced as fallback
      try {
        console.log('⚠️  High accuracy failed, trying balanced accuracy...');
        const fallbackLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
          maximumAge: 0,
        });

        const coords = {
          latitude: fallbackLocation.coords.latitude,
          longitude: fallbackLocation.coords.longitude,
          accuracy: fallbackLocation.coords.accuracy,
        };

        console.log('📍 Got balanced GPS location:', {
          lat: coords.latitude.toFixed(4),
          lon: coords.longitude.toFixed(4),
        });

        return coords;
      } catch (fallbackError) {
        console.error('❌ Both location methods failed:', fallbackError.message);
        throw new Error('Unable to get your location. Please ensure location services are enabled.');
      }
    }
  }

  /**
   * Get location with high accuracy (slower but more accurate)
   */
  static async getHighAccuracyLocation() {
    try {
      const hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (error) {
      console.error('Error getting high accuracy location:', error);
      throw error;
    }
  }

  /**
   * Watch user location (continuous tracking)
   * Returns unsubscribe function to stop watching
   */
  static async watchLocation(onLocationUpdate, onError = null) {
    try {
      const hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update if moved 10 meters
        },
        (location) => {
          onLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          });
        }
      );

      return subscription; // Return subscription to unsubscribe later
    } catch (error) {
      console.error('Error watching location:', error);
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  static async getAddressFromCoordinates(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street || '',
          city: address.city || '',
          region: address.region || '',
          country: address.country || '',
          postalCode: address.postalCode || '',
          fullAddress: [
            address.street,
            address.city,
            address.region,
            address.country,
          ]
            .filter(Boolean)
            .join(', '),
        };
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  /**
   * Get coordinates from address using forward geocoding
   */
  static async getCoordinatesFromAddress(address) {
    try {
      const results = await Location.geocodeAsync(address);

      if (results.length > 0) {
        const result = results[0];
        return {
          latitude: result.latitude,
          longitude: result.longitude,
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Sort hospitals by distance
   */
  static sortByDistance(hospitals, userLat, userLon) {
    return hospitals
      .map((hospital) => ({
        ...hospital,
        distance: this.calculateDistance(
          userLat,
          userLon,
          hospital.latitude,
          hospital.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Filter hospitals by radius
   */
  static filterByRadius(hospitals, userLat, userLon, radiusKm) {
    return hospitals.filter((hospital) => {
      const distance = this.calculateDistance(
        userLat,
        userLon,
        hospital.latitude,
        hospital.longitude
      );
      return distance <= radiusKm;
    });
  }

  /**
   * Stop watching location
   */
  static stopWatchingLocation(subscription) {
    if (subscription) {
      subscription.remove();
    }
  }
}

export default GeolocationService;
