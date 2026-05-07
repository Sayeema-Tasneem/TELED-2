import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  View,
  Text,
  Linking,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import languageService from '../services/languageService';
import authService from '../services/authService';
import simpleApiService from '../services/simpleApiService';
import HospitalsService from '../services/hospitalsService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const RecordCard = ({ type, title, date, details, onDownload, actionButtons = [] }) => (
  <View style={styles.recordCard}>
    <View style={styles.recordHeader}>
      <Text style={styles.recordType}>{type}</Text>
      <Text style={styles.recordDate}>{date}</Text>
    </View>
    <Text style={styles.recordTitle}>{title}</Text>
    <Text style={styles.recordDetails}>{details}</Text>
    {onDownload ? (
      <TouchableOpacity style={styles.downloadButton} onPress={onDownload}>
        <Text style={styles.downloadButtonText}>{t('screens.records.downloadPdf', 'Download PDF')}</Text>
      </TouchableOpacity>
    ) : null}

    {Array.isArray(actionButtons) && actionButtons.length > 0 ? (
      <View style={styles.inlineActionsRow}>
        {actionButtons.map((button) => (
          <TouchableOpacity key={button.key} style={styles.inlineActionButton} onPress={button.onPress}>
            <Text style={styles.inlineActionButtonText}>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : null}
  </View>
);

export default function HealthRecordsScreen({ route }) {
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [resolvedPatient, setResolvedPatient] = useState(route?.params?.patient || null);
  const [resolvedPhone, setResolvedPhone] = useState(route?.params?.patient?.phone || route?.params?.phoneNumber || '');
  const [nearbyVisible, setNearbyVisible] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyTitle, setNearbyTitle] = useState('Nearby Facilities');
  const [nearbyResults, setNearbyResults] = useState([]);

  useEffect(() => {
    setResolvedPatient(route?.params?.patient || null);
    setResolvedPhone(route?.params?.patient?.phone || route?.params?.phoneNumber || '');
  }, [route?.params?.patient, route?.params?.phoneNumber]);

  useEffect(() => {
    const restorePatientFromSession = async () => {
      if (resolvedPhone) {
        return;
      }

      try {
        const phone = await authService.getPhoneNumber();
        if (phone) {
          setResolvedPhone(phone);
        }
      } catch (error) {
        // ignore session restore errors and fall back to empty state
      }
    };

    restorePatientFromSession();
  }, [resolvedPhone]);

  const handleDownloadPrescription = async (item) => {
    try {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
            <h1 style="color: #1157c2; margin-bottom: 8px;">Prescription</h1>
            <p><strong>Patient:</strong> ${resolvedPatient?.name || 'Patient'}</p>
            <p><strong>Phone:</strong> ${resolvedPatient?.phone || resolvedPhone || '-'}</p>
            <p><strong>Doctor:</strong> ${item.doctorName || item.title || '-'}</p>
            <p><strong>Date:</strong> ${item.date || '-'}</p>
            <hr style="margin: 16px 0;" />
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${String(item.text || item.details || '-')}</pre>
          </body>
        </html>
      `;

      const result = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('screens.records.downloadPdf', 'Download PDF'),
          UTI: 'com.adobe.pdf',
        });
      }

      Alert.alert(
        t('common.success', 'Success'),
        t('screens.records.pdfDownloaded', 'Prescription PDF saved successfully')
      );
    } catch (error) {
      Alert.alert(
        t('common.error', 'Error'),
        t('screens.records.pdfDownloadFailed', 'Failed to download prescription PDF')
      );
    }
  };

  const openNearbyFacility = async (mode = 'lab', item = null) => {
    try {
      setNearbyLoading(true);
      setNearbyVisible(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission?.granted) {
        setNearbyLoading(false);
        Alert.alert('Location permission is required to find nearby places');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
      });
      const latitude = position?.coords?.latitude;
      const longitude = position?.coords?.longitude;

      if (!latitude || !longitude) {
        setNearbyLoading(false);
        Alert.alert('Unable to detect current location');
        return;
      }

      const rawNearby = await HospitalsService.getNearby(
        latitude,
        longitude,
        8,
        mode === 'pharmacy' ? 'pharmacy' : 'all',
        { liveOnly: true }
      );

      const normalize = (value = '') =>
        String(value)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const splitWords = (value = '') =>
        normalize(value)
          .split(/[\s,-]+/)
          .map((word) => word.trim())
          .filter((word) => word.length >= 3);

      const requestedContextText =
        mode === 'scan'
          ? (Array.isArray(item?.scans) ? item.scans.join(' ') : '')
          : (Array.isArray(item?.tests) ? item.tests.join(' ') : '');

      const requestedTerms = [...new Set(splitWords(requestedContextText))];

      const pharmacyKeywords = ['pharmacy', 'medical store', 'chemist', 'medicals'];
      const labKeywords = ['lab', 'laboratory', 'pathology', 'diagnostic', 'blood', 'collection'];
      const scanKeywords = ['scan', 'scanning', 'imaging', 'radiology', 'mri', 'ct', 'x-ray', 'ultrasound'];

      const filtered = (Array.isArray(rawNearby) ? rawNearby : []).filter((place) => {
        const servicesText = Array.isArray(place?.services)
          ? place.services.join(' ')
          : String(place?.services || '');

        const haystack = normalize(
          `${place?.name || ''} ${place?.address || ''} ${servicesText} ${place?.type || ''}`
        );

        const isPharmacy =
          String(place?.type || '').toLowerCase() === 'pharmacy' ||
          pharmacyKeywords.some((keyword) => haystack.includes(keyword));

        if (mode === 'pharmacy') {
          return isPharmacy;
        }

        const hasRequestedTerm = requestedTerms.some((term) => haystack.includes(term));

        if (mode === 'scan') {
          const looksLikeScanCenter = scanKeywords.some((keyword) => haystack.includes(keyword));
          return !isPharmacy && (looksLikeScanCenter || hasRequestedTerm);
        }

        const looksLikeLab = labKeywords.some((keyword) => haystack.includes(keyword));
        return !isPharmacy && (looksLikeLab || hasRequestedTerm);
      });

      const filteredSorted = [...filtered].sort(
        (a, b) => Number(a?.distance ?? Number.MAX_SAFE_INTEGER) - Number(b?.distance ?? Number.MAX_SAFE_INTEGER)
      );

      setNearbyTitle(
        mode === 'pharmacy'
          ? 'Nearby Pharmacies'
          : mode === 'scan'
            ? 'Nearby Scan Centres'
            : 'Nearby Blood Test Labs'
      );

      setNearbyResults(filteredSorted.slice(0, 20));
      setNearbyLoading(false);
    } catch (error) {
      setNearbyLoading(false);
      Alert.alert('Unable to open nearby search');
    }
  };

  const handleCallPlace = async (place) => {
    const rawPhone = String(place?.phone || '').trim();
    const dialPhone = rawPhone.replace(/[^+\d]/g, '');
    if (!dialPhone) {
      Alert.alert('Phone number not available for this place');
      return;
    }

    await Linking.openURL(`tel:${dialPhone}`);
  };

  const handleDirectionsToPlace = async (place) => {
    const latitude = Number(place?.latitude);
    const longitude = Number(place?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert('Location not available for this place');
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    await Linking.openURL(mapsUrl);
  };

  const reports = [
    {
      id: 1,
      type: '📄',
      title: 'Blood Test Report',
      date: '2024-02-28',
      details: 'Haemoglobin: 12.5 g/dL\nRBC: 4.5 million/μL',
    },
    {
      id: 2,
      type: '📄',
      title: 'Chest X-Ray',
      date: '2024-02-10',
      details: 'Status: Normal\nNo abnormalities detected',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      const loadHealthRecords = async () => {
      const phone = resolvedPatient?.phone || resolvedPhone;

      if (!phone) {
        setConsultations([]);
        setPrescriptions([]);
        return;
      }

      try {
        await simpleApiService.archiveExpiredAppointments(phone);
        const [consultationResult, prescriptionResult] = await Promise.all([
          simpleApiService.getPatientConsultations(phone),
          simpleApiService.getPatientPrescriptions(phone),
        ]);

        const rows = Array.isArray(consultationResult?.consultations)
          ? consultationResult.consultations
          : [];
        const prescriptionRows = Array.isArray(prescriptionResult?.prescriptions)
          ? prescriptionResult.prescriptions
          : [];

        const mapped = rows.map((item) => ({
          id: item.id,
          type: '👨‍⚕️',
          title: item.consultationType || 'Consultation',
          date: item.date || item.completedAt?.slice(0, 10) || '-',
          details: `Doctor: ${item.doctorName || '-'}\nReason: ${item.reason || '-'}\nTime: ${item.time || '-'}`,
        }));

        const mappedPrescriptions = prescriptionRows.map((item) => ({
          id: item.id,
          type: '💊',
          title: item.doctorName || 'Prescription',
          date: item.date || item.createdAt?.slice(0, 10) || '-',
          details: item.text || item.diagnosis || '-',
          text: item.text || '-',
          doctorName: item.doctorName || '-',
          tests: Array.isArray(item.tests) ? item.tests : [],
          scans: Array.isArray(item.scans) ? item.scans : [],
          medicines: Array.isArray(item.medicines) ? item.medicines : [],
        }));

        setConsultations(mapped);
        setPrescriptions(mappedPrescriptions);
      } catch (error) {
        setConsultations([]);
        setPrescriptions([]);
      }
      };

      loadHealthRecords();
    }, [resolvedPatient?.phone, resolvedPhone])
  );

  const getTabData = () => {
    switch (activeTab) {
      case 'prescriptions':
        return prescriptions;
      case 'reports':
        return reports;
      case 'consultations':
        return consultations;
      default:
        return prescriptions;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'prescriptions':
        return t('screens.records.prescriptions');
      case 'reports':
        return t('screens.records.reports');
      case 'consultations':
        return t('screens.records.consultations');
      default:
        return '';
    }
  };

  const tabData = getTabData();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.records.title')}</Text>
        <Text style={styles.subtitle}>{t('screens.records.subtitle')}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabLabel, activeTab === 'prescriptions' && styles.activeTabLabel]}>
            💊 {t('screens.records.prescriptions')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabLabel, activeTab === 'reports' && styles.activeTabLabel]}>
            📄 {t('screens.records.reports')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'consultations' && styles.activeTab]}
          onPress={() => setActiveTab('consultations')}
        >
          <Text style={[styles.tabLabel, activeTab === 'consultations' && styles.activeTabLabel]}>
            👨‍⚕️ {t('screens.records.consultations')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {tabData.length > 0 ? (
          tabData.map((item) => (
            <RecordCard
              key={item.id}
              type={item.type}
              title={item.title}
              date={item.date}
              details={item.details}
              onDownload={activeTab === 'prescriptions' ? () => handleDownloadPrescription(item) : null}
              actionButtons={activeTab === 'prescriptions' ? [
                ...(Array.isArray(item?.tests) && item.tests.length > 0 ? [{
                  key: `${item.id}-lab`,
                  label: 'Nearby Blood Test Labs',
                  onPress: () => openNearbyFacility('lab', item),
                }] : []),
                ...(Array.isArray(item?.scans) && item.scans.length > 0 ? [{
                  key: `${item.id}-scan`,
                  label: 'Nearby Scan Centres',
                  onPress: () => openNearbyFacility('scan', item),
                }] : []),
                {
                  key: `${item.id}-pharmacy`,
                  label: 'Nearby Pharmacies',
                  onPress: () => openNearbyFacility('pharmacy', item),
                },
              ] : []}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>{t('screens.records.noRecords')}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={nearbyVisible} animationType="slide" transparent onRequestClose={() => setNearbyVisible(false)}>
        <View style={styles.nearbyModalOverlay}>
          <View style={styles.nearbyModalCard}>
            <View style={styles.nearbyModalHeader}>
              <Text style={styles.nearbyModalTitle}>{nearbyTitle}</Text>
              <TouchableOpacity onPress={() => setNearbyVisible(false)}>
                <Text style={styles.nearbyCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {nearbyLoading ? (
              <View style={styles.nearbyLoadingWrap}>
                <ActivityIndicator size="large" color="#1157c2" />
                <Text style={styles.nearbyLoadingText}>Finding nearby places...</Text>
              </View>
            ) : nearbyResults.length === 0 ? (
              <View style={styles.nearbyLoadingWrap}>
                <Text style={styles.nearbyLoadingText}>No nearby places found. Try again in a different area.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {nearbyResults.map((place, index) => (
                  <View key={place?.id || `${place?.name || 'place'}_${index}`} style={styles.nearbyItemCard}>
                    <Text style={styles.nearbyItemName}>{place?.name || 'Nearby place'}</Text>
                    <Text style={styles.nearbyItemMeta}>📍 {place?.address || 'Address not available'}</Text>
                    <Text style={styles.nearbyItemMeta}>📏 {Number(place?.distance || 0).toFixed(1)} km away</Text>
                    <Text style={styles.nearbyItemMeta}>☎️ {place?.phone || 'Phone not available'}</Text>

                    <View style={styles.nearbyActionsRow}>
                      <TouchableOpacity style={styles.nearbyActionButton} onPress={() => handleCallPlace(place)}>
                        <Text style={styles.nearbyActionButtonText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nearbyActionButton} onPress={() => handleDirectionsToPlace(place)}>
                        <Text style={styles.nearbyActionButtonText}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#e8f5e9',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  activeTabLabel: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4788',
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recordDetails: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  downloadButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#1157c2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1157c2',
  },
  inlineActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  inlineActionButton: {
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#BCD2F8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  inlineActionButtonText: {
    color: '#1157c2',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  nearbyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  nearbyModalCard: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
  },
  nearbyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nearbyModalTitle: {
    fontSize: 18,
    color: '#103467',
    fontWeight: '800',
  },
  nearbyCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1157c2',
  },
  nearbyLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  nearbyLoadingText: {
    fontSize: 14,
    color: '#4a6385',
    textAlign: 'center',
  },
  nearbyItemCard: {
    borderWidth: 1,
    borderColor: '#d7e3f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fbff',
  },
  nearbyItemName: {
    fontSize: 15,
    color: '#103467',
    fontWeight: '800',
    marginBottom: 5,
  },
  nearbyItemMeta: {
    fontSize: 13,
    color: '#4a6385',
    marginBottom: 3,
  },
  nearbyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  nearbyActionButton: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#BCD2F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  nearbyActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1157c2',
  },
});
