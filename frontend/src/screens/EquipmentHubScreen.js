import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';

const STORAGE_KEY = 'equipmentHub:simpleStore:v3';
const ROLES = ['donor', 'patient'];
const CATEGORIES = [
  'wheelchair',
  'walker',
  'hospital bed',
  'bp monitor',
  'crutches',
  'cpap',
  'oxygen concentrator',
  'other',
];

const DEFAULT_LISTINGS = [
  {
    id: 'listing_seed_1',
    donorName: 'Ramesh Kumar',
    donorAddress: 'Basavanagudi, Bengaluru',
    category: 'wheelchair',
    itemName: 'Foldable Wheelchair',
    photos: ['https://example.com/wheelchair-1.jpg'],
    contactPhone: '9000000001',
    pickupAddress: 'Basavanagudi, Bengaluru',
    createdAt: new Date().toISOString(),
    status: 'available',
  },
];

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const normalize = (value) => String(value || '').trim().toLowerCase();

export default function EquipmentHubScreen() {
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(null);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('wheelchair');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [donorStep, setDonorStep] = useState(1);
  const [donorForm, setDonorForm] = useState({
    donorName: '',
    donorAddress: '',
    category: 'wheelchair',
    itemName: '',
    photos: [],
    photoInput: '',
    contactPhone: '',
    pickupAddress: '',
  });

  const [patientForm, setPatientForm] = useState({
    patientName: '',
    wantCategory: 'wheelchair',
    wantText: '',
  });

  const cameraRef = React.useRef(null);

  useEffect(() => {
    const loadStore = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = parseJson(raw, null);
        setListings(Array.isArray(parsed?.listings) && parsed.listings.length > 0 ? parsed.listings : DEFAULT_LISTINGS);
        setRequests(Array.isArray(parsed?.requests) ? parsed.requests : []);
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, []);

  const persistStore = async (nextListings, nextRequests) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ listings: nextListings, requests: nextRequests }));
  };

  const matchingListings = useMemo(
    () =>
      listings.filter((item) => item.status === 'available').filter((item) => {
        if (selectedCategory === 'other') return true;
        return normalize(item.category) === normalize(selectedCategory);
      }),
    [listings, selectedCategory]
  );

  const resetDonorFlow = () => {
    setDonorStep(1);
    setDonorForm({
      donorName: '',
      donorAddress: '',
      category: 'wheelchair',
      itemName: '',
      photos: [],
      photoInput: '',
      contactPhone: '',
      pickupAddress: '',
    });
  };

  const handlePhotoInputSave = () => {
    const photos = donorForm.photoInput
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);

    setDonorForm((prev) => ({ ...prev, photos }));
    Alert.alert('Photos added', photos.length > 0 ? 'Photo links saved for this listing.' : 'No photo links added.');
  };

  const openCameraForPhoto = async () => {
    try {
      const current = await Camera.getCameraPermissionsAsync();
      let granted = current.granted;

      if (!granted) {
        const asked = await Camera.requestCameraPermissionsAsync();
        granted = asked.granted;
      }

      setCameraGranted(granted);

      if (!granted) {
        Alert.alert('Camera permission required', 'Please allow camera access to take a photo.');
        return;
      }

      setShowCameraModal(true);
    } catch (error) {
      Alert.alert('Camera unavailable', 'Unable to open the camera in this build.');
    }
  };

  const captureOnePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setDonorForm((prev) => ({ ...prev, photos: [photo.uri] }));
        setShowCameraModal(false);
        Alert.alert('Photo captured', 'One photo has been added to this listing.');
      }
    } catch (error) {
      Alert.alert('Capture failed', 'Could not capture the photo.');
    }
  };

  const handleDonorNext = () => {
    if (donorStep === 1) {
      if (!donorForm.donorName.trim() || !donorForm.donorAddress.trim()) {
        Alert.alert('Please enter donor name and address.');
        return;
      }
      setDonorStep(2);
      return;
    }

    if (donorStep === 2) {
      if (!donorForm.itemName.trim()) {
        Alert.alert('Please enter what they are going to donate.');
        return;
      }
      setDonorStep(3);
      return;
    }

    if (donorStep === 3) {
      setDonorStep(4);
    }
  };

  const handleDonorSubmit = async () => {
    if (!/^\d{10}$/.test(donorForm.contactPhone)) {
      Alert.alert('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!donorForm.pickupAddress.trim()) {
      Alert.alert('Please enter pickup address.');
      return;
    }

    const listing = {
      id: createId('listing'),
      donorName: donorForm.donorName.trim(),
      donorAddress: donorForm.donorAddress.trim(),
      category: donorForm.category,
      itemName: donorForm.itemName.trim(),
      photos: donorForm.photos,
      contactPhone: donorForm.contactPhone.trim(),
      pickupAddress: donorForm.pickupAddress.trim(),
      createdAt: new Date().toISOString(),
      status: 'available',
    };

    const nextListings = [listing, ...listings];
    setListings(nextListings);
    await persistStore(nextListings, requests);
    resetDonorFlow();
    Alert.alert('Equipment submitted.');
  };

  const handlePatientSubmit = async () => {
    if (!patientForm.wantText.trim()) {
      Alert.alert('Please enter what patient wants.');
      return;
    }

    const request = {
      id: createId('request'),
      patientName: patientForm.patientName.trim(),
      wantCategory: patientForm.wantCategory,
      wantText: patientForm.wantText.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextRequests = [request, ...requests];
    setRequests(nextRequests);
    setSelectedCategory(patientForm.wantCategory);
    setShowPatientResults(true);
    await persistStore(listings, nextRequests);
  };

  const renderRoleSwitch = () => (
    <View style={styles.roleRow}>
      {ROLES.map((role) => (
        <TouchableOpacity
          key={role}
          style={[styles.roleButton, activeRole === role && styles.roleButtonActive]}
          onPress={() => setActiveRole(role)}
        >
          <Text style={[styles.roleText, activeRole === role && styles.roleTextActive]}>
            {role === 'donor' ? 'Donor' : 'Patient'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCategoryChips = (value, onChange) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category}
          style={[styles.chip, value === category && styles.chipActive]}
          onPress={() => onChange(category)}
        >
          <Text style={[styles.chipText, value === category && styles.chipTextActive]}>{category}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPhotoPreview = (photos = []) => {
    if (!photos.length) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
        {photos.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.previewImage} />
        ))}
      </ScrollView>
    );
  };

  const renderDonorStep = () => {
    if (donorStep === 1) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Donor Details</Text>
          <TextInput
            style={styles.input}
            value={donorForm.donorName}
            onChangeText={(donorName) => setDonorForm((prev) => ({ ...prev, donorName }))}
            placeholder="Donor name"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={donorForm.donorAddress}
            onChangeText={(donorAddress) => setDonorForm((prev) => ({ ...prev, donorAddress }))}
            placeholder="Donor address"
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleDonorNext}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (donorStep === 2) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What Are You Donating?</Text>
          {renderCategoryChips(donorForm.category, (category) => setDonorForm((prev) => ({ ...prev, category })))}
          <TextInput
            style={styles.input}
            value={donorForm.itemName}
            onChangeText={(itemName) => setDonorForm((prev) => ({ ...prev, itemName }))}
            placeholder="Equipment name"
            placeholderTextColor="#94A3B8"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setDonorStep(1)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButtonInline} onPress={handleDonorNext}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (donorStep === 3) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <Text style={styles.label}>Take one photo of the equipment, or paste a photo link below.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={openCameraForPhoto}>
            <Text style={styles.primaryButtonText}>Take One Photo</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={donorForm.photoInput}
            onChangeText={(photoInput) => setDonorForm((prev) => ({ ...prev, photoInput }))}
            placeholder="Or paste a photo URL"
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePhotoInputSave}>
            <Text style={styles.secondaryButtonText}>Save Photo Link</Text>
          </TouchableOpacity>
          <Text style={styles.itemMeta}>Selected photos: {donorForm.photos.length}</Text>
          {renderPhotoPreview(donorForm.photos)}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setDonorStep(2)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButtonInline} onPress={handleDonorNext}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>How Patient Can Contact</Text>
        <TextInput
          style={styles.input}
          value={donorForm.contactPhone}
          onChangeText={(contactPhone) => setDonorForm((prev) => ({ ...prev, contactPhone: contactPhone.replace(/[^0-9]/g, '').slice(0, 10) }))}
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor="#94A3B8"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={donorForm.pickupAddress}
          onChangeText={(pickupAddress) => setDonorForm((prev) => ({ ...prev, pickupAddress }))}
          placeholder="Pickup address"
          placeholderTextColor="#94A3B8"
          multiline
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setDonorStep(3)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButtonInline} onPress={handleDonorSubmit}>
            <Text style={styles.primaryButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPatientView = () => (
    <>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What Patient Wants</Text>
        <TextInput
          style={styles.input}
          value={patientForm.patientName}
          onChangeText={(patientName) => setPatientForm((prev) => ({ ...prev, patientName }))}
          placeholder="Patient name"
          placeholderTextColor="#94A3B8"
        />
        {renderCategoryChips(patientForm.wantCategory, (wantCategory) => setPatientForm((prev) => ({ ...prev, wantCategory })))}
        <TextInput
          style={[styles.input, styles.textArea]}
          value={patientForm.wantText}
          onChangeText={(wantText) => setPatientForm((prev) => ({ ...prev, wantText }))}
          placeholder="What patient wants"
          placeholderTextColor="#94A3B8"
          multiline
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handlePatientSubmit}>
          <Text style={styles.primaryButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {showPatientResults ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Available Options</Text>
          {matchingListings.length === 0 ? (
            <Text style={styles.itemMeta}>No available options for {selectedCategory}.</Text>
          ) : (
            matchingListings.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{item.itemName}</Text>
                <Text style={styles.itemMeta}>Type: {item.category}</Text>
                <Text style={styles.itemMeta}>Donor: {item.donorName}</Text>
                <Text style={styles.itemMeta}>Contact: {item.contactPhone}</Text>
                <Text style={styles.itemMeta}>Pickup: {item.pickupAddress}</Text>
                <Text style={styles.itemMeta}>Photos: {item.photos?.length || 0}</Text>
                {renderPhotoPreview(item.photos)}
              </View>
            ))
          )}
        </View>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <Text style={styles.loaderText}>Loading Equipment Hub...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Equipment Hub</Text>
        <Text style={styles.headerSub}>Choose donor or patient</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {renderRoleSwitch()}

        {!activeRole ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Choose an option</Text>
            <Text style={styles.label}>Select `Donor` or `Patient` above.</Text>
          </View>
        ) : null}

        {activeRole === 'donor' ? renderDonorStep() : null}
        {activeRole === 'patient' ? renderPatientView() : null}
      </ScrollView>

      <Modal visible={showCameraModal} animationType="slide" onRequestClose={() => setShowCameraModal(false)}>
        <SafeAreaView style={styles.cameraModalContainer}>
          <View style={styles.cameraModalHeader}>
            <Text style={styles.cameraModalTitle}>Take one photo</Text>
            <TouchableOpacity onPress={() => setShowCameraModal(false)}>
              <Text style={styles.cameraCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          {!cameraGranted ? (
            <View style={styles.cameraPermissionBox}>
              <Text style={styles.label}>Camera permission is required to take a photo.</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={async () => {
                  const asked = await Camera.requestCameraPermissionsAsync();
                  setCameraGranted(asked.granted);
                }}
              >
                <Text style={styles.primaryButtonText}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                ref={cameraRef}
                style={styles.cameraView}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
              />
              <TouchableOpacity
                style={[styles.captureButton, !cameraReady && styles.captureButtonDisabled]}
                onPress={captureOnePhoto}
                disabled={!cameraReady}
              >
                <Text style={styles.captureButtonText}>Capture</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    color: '#64748B',
    fontSize: 15,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    marginTop: 4,
    color: '#64748B',
  },
  content: {
    padding: 12,
    paddingBottom: 30,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleText: {
    color: '#334155',
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  label: {
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chipRow: {
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  chipText: {
    color: '#334155',
  },
  chipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryButtonInline: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemMeta: {
    marginTop: 4,
    color: '#64748B',
  },
  previewRow: {
    marginTop: 8,
  },
  previewImage: {
    width: 84,
    height: 84,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  cameraModalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  cameraModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
  },
  cameraModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraCloseText: {
    color: '#93C5FD',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraPermissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cameraWrap: {
    flex: 1,
    padding: 16,
  },
  cameraView: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  captureButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
