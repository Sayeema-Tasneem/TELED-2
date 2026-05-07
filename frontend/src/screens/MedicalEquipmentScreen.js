import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import languageService from '../services/languageService';
import EquipmentService from '../services/equipmentService';
import GeolocationService from '../services/geolocationService';
import NotificationService from '../services/notificationService';

const DEMO_USER = {
  id: 'demo-user-1',
  name: 'Community Patient',
  phone: '+91-9000000000',
};

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);
const CATEGORIES = ['all', 'respiratory', 'diagnostic', 'mobility'];

const dateLabel = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const slotLabel = (slot) => `${slot.startTime} - ${slot.endTime}`;

export default function MedicalEquipmentScreen() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [radius, setRadius] = useState(8);
  const [userLocation, setUserLocation] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const notifiedEquipmentRef = useRef(new Set());
  const locationSubscriptionRef = useRef(null);

  const selectedEquipment = useMemo(
    () => equipment.find((item) => item.id === selectedEquipmentId) || null,
    [equipment, selectedEquipmentId]
  );

  const notifyNearbyEquipment = useCallback(async (items) => {
    const nearbyAvailable = items.filter(
      (item) => item.distance !== null && item.distance <= 2 && item.availability?.status === 'available'
    );

    for (const item of nearbyAvailable) {
      if (!notifiedEquipmentRef.current.has(item.id)) {
        notifiedEquipmentRef.current.add(item.id);
        await NotificationService.sendNearbyEquipmentAlert(item);
      }
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const history = await EquipmentService.getUserHistory(DEMO_USER.id);
      setBookingHistory(history);
    } catch (error) {
      console.error('Error loading equipment history:', error);
      setBookingHistory([]);
    }
  }, []);

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const location = await GeolocationService.getCurrentLocation();
      setUserLocation(location);

      const [items, areaSummary] = await Promise.all([
        EquipmentService.getNearby(
          location.latitude,
          location.longitude,
          radius,
          selectedCategory,
          searchQuery
        ),
        EquipmentService.getAreaSummary(location.latitude, location.longitude, radius),
      ]);

      setEquipment(items);
      setSummary(areaSummary);
      await notifyNearbyEquipment(items);

      if (!selectedEquipmentId && items.length > 0) {
        setSelectedEquipmentId(items[0].id);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('screens.equipment.failedToLoad', 'Failed to load medical equipment nearby')
      );
      setEquipment([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [notifyNearbyEquipment, radius, searchQuery, selectedCategory, selectedEquipmentId]);

  const loadSlots = useCallback(async (equipmentId) => {
    if (!equipmentId) {
      setAvailableSlots([]);
      return;
    }

    try {
      const details = await EquipmentService.getEquipmentDetails(equipmentId);
      const nextDate = details.availability?.nextAvailableSlot?.date;
      const slots = await EquipmentService.getSlots(equipmentId, nextDate || undefined);
      setAvailableSlots(slots.filter((slot) => slot.status === 'available'));
      setSelectedSlotId(null);
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEquipment();
      loadHistory();

      GeolocationService.watchLocation(
        async (location) => {
          setUserLocation(location);
          try {
            const items = await EquipmentService.getNearby(
              location.latitude,
              location.longitude,
              radius,
              selectedCategory,
              searchQuery
            );
            setEquipment(items);
            await notifyNearbyEquipment(items);
          } catch (error) {
            console.error('Error refreshing equipment during location watch:', error);
          }
        },
        (error) => console.error('Equipment location watch error:', error)
      )
        .then((subscription) => {
          locationSubscriptionRef.current = subscription;
        })
        .catch((error) => {
          console.error('Unable to start equipment location watch:', error);
        });

      return () => {
        GeolocationService.stopWatchingLocation(locationSubscriptionRef.current);
        locationSubscriptionRef.current = null;
      };
    }, [loadEquipment, loadHistory, notifyNearbyEquipment, radius, searchQuery, selectedCategory])
  );

  useEffect(() => {
    if (selectedEquipmentId) {
      loadSlots(selectedEquipmentId);
    }
  }, [loadSlots, selectedEquipmentId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEquipment(), loadHistory()]);
    setRefreshing(false);
  }, [loadEquipment, loadHistory]);

  const handleBookEquipment = useCallback(async () => {
    if (!selectedEquipment || !selectedSlotId) {
      Alert.alert(
        t('common.error', 'Error'),
        t('screens.equipment.selectSlotFirst', 'Please select a time slot first')
      );
      return;
    }

    const slot = availableSlots.find((item) => item.id === selectedSlotId);
    if (!slot) {
      return;
    }

    setBookingInProgress(true);
    try {
      await EquipmentService.bookSlot(selectedEquipment.id, {
        userId: DEMO_USER.id,
        userName: DEMO_USER.name,
        contactPhone: DEMO_USER.phone,
        date: slot.date,
        slotId: slot.id,
        purpose: 'Community usage booking',
      });

      await NotificationService.sendEquipmentBookingConfirmation(selectedEquipment, slot);

      Alert.alert(
        t('common.success', 'Success'),
        t('screens.equipment.bookingSuccess', 'Equipment slot booked successfully')
      );

      await Promise.all([loadEquipment(), loadSlots(selectedEquipment.id), loadHistory()]);
    } catch (error) {
      console.error('Error booking equipment:', error);
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('screens.equipment.bookingFailed', 'Failed to book equipment slot')
      );
    } finally {
      setBookingInProgress(false);
    }
  }, [availableSlots, loadEquipment, loadHistory, loadSlots, selectedEquipment, selectedSlotId]);

  const renderCategoryChip = (category) => {
    const isSelected = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.chip, isSelected && styles.chipActive]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
          {t(`screens.equipment.categories.${category}`, category)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEquipmentCard = ({ item }) => {
    const isSelected = item.id === selectedEquipmentId;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        activeOpacity={0.9}
        onPress={() => setSelectedEquipmentId(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.providerName}</Text>
          </View>
          <View style={styles.availabilityBadge}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#2E7D32" />
            <Text style={styles.availabilityText}>
              {item.availability?.availableSlotsCount || 0} {t('screens.equipment.slots', 'slots')}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#1976D2" />
          <Text style={styles.infoText}>
            {item.distance !== null ? `${item.distance.toFixed(1)} km` : '--'} · {item.address}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#7B1FA2" />
          <Text style={styles.infoText}>
            {item.availability?.nextAvailableSlot
              ? `${dateLabel(item.availability.nextAvailableSlot.date)} · ${item.availability.nextAvailableSlot.startTime}`
              : t('screens.equipment.fullyBooked', 'Fully booked')}
          </Text>
        </View>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{t(`screens.equipment.categories.${item.category}`, item.category)}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.condition}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>₹{item.depositAmount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const mapRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : {
        latitude: 12.9716,
        longitude: 77.5946,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('screens.equipment.title', 'Medical Equipment')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('screens.equipment.subtitle', 'Find, map, and book shared medical devices nearby')}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color="#1976D2" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('screens.equipment.searchPlaceholder', 'Search equipment or provider')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {CATEGORIES.map(renderCategoryChip)}
      </ScrollView>

      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('screens.equipment.totalNearby', 'Nearby')}</Text>
            <Text style={styles.summaryValue}>{summary.total}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('screens.equipment.availableNow', 'Available')}</Text>
            <Text style={styles.summaryValue}>{summary.availableNow}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('screens.equipment.radius', 'Radius')}</Text>
            <Text style={styles.summaryValue}>{summary.radiusKm} km</Text>
          </View>
        </View>
      )}

      <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            title={t('screens.equipment.youAreHere', 'You are here')}
            pinColor="#1976D2"
          />
        )}
        {equipment.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.name}
            description={`${item.providerName} · ${item.availability?.availableSlotsCount || 0} slots`}
            pinColor={item.id === selectedEquipmentId ? '#E53935' : '#43A047'}
            onPress={() => setSelectedEquipmentId(item.id)}
          />
        ))}
      </MapView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={equipment}
          keyExtractor={(item) => item.id}
          renderItem={renderEquipmentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            selectedEquipment ? (
              <View style={styles.detailPanel}>
                <Text style={styles.detailTitle}>{selectedEquipment.name}</Text>
                <Text style={styles.detailDescription}>{selectedEquipment.description}</Text>
                <Text style={styles.detailMeta}>
                  {t('screens.equipment.provider', 'Provider')}: {selectedEquipment.providerName}
                </Text>
                <Text style={styles.detailMeta}>
                  {t('screens.equipment.instructions', 'Instructions')}: {selectedEquipment.usageInstructions}
                </Text>

                <Text style={styles.sectionTitle}>{t('screens.equipment.availableSlots', 'Available slots')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotScroll}>
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => {
                      const active = slot.id === selectedSlotId;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          style={[styles.slotChip, active && styles.slotChipActive]}
                          onPress={() => setSelectedSlotId(slot.id)}
                        >
                          <Text style={[styles.slotDate, active && styles.slotTextActive]}>
                            {dateLabel(slot.date)}
                          </Text>
                          <Text style={[styles.slotTime, active && styles.slotTextActive]}>
                            {slotLabel(slot)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyInlineText}>{t('screens.equipment.noSlots', 'No open slots')}</Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.bookButton, bookingInProgress && styles.bookButtonDisabled]}
                  disabled={bookingInProgress}
                  onPress={handleBookEquipment}
                >
                  <MaterialCommunityIcons name="calendar-check" size={18} color="#FFF" />
                  <Text style={styles.bookButtonText}>
                    {bookingInProgress
                      ? t('common.loading', 'Loading...')
                      : t('screens.equipment.bookNow', 'Book this slot')}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>{t('screens.equipment.history', 'Your equipment history')}</Text>
                {bookingHistory.length > 0 ? (
                  bookingHistory.map((entry) => (
                    <View key={entry.id} style={styles.historyItem}>
                      <Text style={styles.historyTitle}>{entry.equipmentName}</Text>
                      <Text style={styles.historySubtitle}>
                        {dateLabel(entry.date)} · {entry.startTime} - {entry.endTime}
                      </Text>
                      <Text style={styles.historySubtitle}>{entry.providerName}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyInlineText}>
                    {t('screens.equipment.noHistory', 'No bookings yet. Your confirmed bookings will appear here.')}
                  </Text>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="medical-bag" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>
                {t('screens.equipment.noEquipmentFound', 'No equipment found for this area')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: '#111827',
  },
  chipScroll: {
    maxHeight: 48,
    marginTop: 12,
    paddingLeft: 16,
  },
  chip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFF',
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  map: {
    height: 200,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  detailPanel: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  detailMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#334155',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  slotScroll: {
    maxHeight: 88,
  },
  slotChip: {
    marginRight: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F8FAFC',
    minWidth: 110,
  },
  slotChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  slotDate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  slotTime: {
    marginTop: 4,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  slotTextActive: {
    color: '#FFF',
  },
  bookButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    marginLeft: 8,
    color: '#FFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSelected: {
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availabilityText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historyItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    color: '#64748B',
  },
  emptyInlineText: {
    fontSize: 12,
    color: '#64748B',
  },
});