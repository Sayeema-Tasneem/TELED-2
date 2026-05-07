/**
 * Prescription Detail Screen
 * Shows detailed prescription information with medicines and follow-up
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { i18n } from '../services/languageService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import HealthRecordsService from '../services/healthRecordsService';

const PrescriptionDetailScreen = ({ route, navigation }) => {
  const { prescriptionId } = route?.params || {};
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Load prescription details
  useEffect(() => {
    const loadPrescription = async () => {
      try {
        if (!prescriptionId) {
          Alert.alert(i18n.t('error'), i18n.t('prescriptionNotFound'));
          navigation.goBack();
          return;
        }

        const data = await HealthRecordsService.getPrescription(prescriptionId);
        setPrescription(data);
        await HealthRecordsService.saveLocalPrescription(data);
      } catch (error) {
        console.error('Error loading prescription:', error);
        Alert.alert(i18n.t('error'), i18n.t('failedToLoadPrescription'));
      } finally {
        setLoading(false);
      }
    };

    loadPrescription();
  }, [prescriptionId, navigation]);

  // Handle share
  const handleShare = async () => {
    if (!prescription) return;

    const message = `
${i18n.t('prescription')}
Doctor: ${prescription.doctorName}
Date: ${new Date(prescription.date).toLocaleDateString()}
Diagnosis: ${prescription.diagnosis}

Medicines:
${prescription.medicines?.map((med, idx) => `${idx + 1}. ${med}`).join('\n')}

Advice: ${prescription.advice || 'N/A'}
Follow-up: ${prescription.followUpDate || 'Not scheduled'}
    `;

    try {
      await Share.share({
        message: message,
        title: `${i18n.t('prescription')} - ${prescription.doctorName}`,
      });
    } catch (error) {
      Alert.alert(i18n.t('error'), i18n.t('sharingFailed'));
    }
  };

  const generatePrescriptionHtml = () => {
    if (!prescription) return '';

    const medicinesList = (prescription.medicines || [])
      .map((med, idx) => `<li>${idx + 1}. ${med}</li>`)
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
            h1 { color: #1976D2; margin-bottom: 4px; }
            .sub { color: #666; margin-bottom: 16px; }
            .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
            .label { font-weight: bold; color: #555; }
            ul { margin: 8px 0 0 18px; }
          </style>
        </head>
        <body>
          <h1>Digital Prescription</h1>
          <div class="sub">Generated on ${new Date().toLocaleString()}</div>

          <div class="card"><span class="label">Doctor:</span> ${prescription.doctorName || 'N/A'}</div>
          <div class="card"><span class="label">Date:</span> ${new Date(prescription.date).toLocaleDateString()}</div>
          <div class="card"><span class="label">Diagnosis:</span> ${prescription.diagnosis || 'N/A'}</div>
          <div class="card"><span class="label">Medicines:</span><ul>${medicinesList || '<li>N/A</li>'}</ul></div>
          <div class="card"><span class="label">Advice:</span> ${prescription.advice || 'N/A'}</div>
          <div class="card"><span class="label">Follow-up:</span> ${prescription.followUpDate || 'Not scheduled'}</div>
        </body>
      </html>
    `;
  };

  const handleDownloadPdf = async () => {
    if (!prescription) return;

    setDownloadingPdf(true);
    try {
      const html = generatePrescriptionHtml();
      const { uri } = await Print.printToFileAsync({ html });

      const safeDoctor = (prescription.doctorName || 'doctor')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const targetUri = `${FileSystem.documentDirectory}prescription-${safeDoctor}-${Date.now()}.pdf`;

      await FileSystem.copyAsync({
        from: uri,
        to: targetUri,
      });

      Alert.alert(
        i18n.t('success'),
        i18n.t('screens.healthRecords.pdfDownloaded', { defaultValue: 'Prescription PDF saved successfully' })
      );
    } catch (error) {
      console.error('Error downloading prescription PDF:', error);
      Alert.alert(
        i18n.t('error'),
        i18n.t('screens.healthRecords.pdfDownloadFailed', { defaultValue: 'Failed to download prescription PDF' })
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!prescription) return;

    try {
      const html = generatePrescriptionHtml();
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          i18n.t('error'),
          i18n.t('screens.healthRecords.pdfShareFailed', { defaultValue: 'PDF sharing is not available on this device' })
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${i18n.t('prescription')} PDF`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Error sharing prescription PDF:', error);
      Alert.alert(
        i18n.t('error'),
        i18n.t('screens.healthRecords.pdfShareFailed', { defaultValue: 'Failed to share prescription PDF' })
      );
    }
  };

  // Handle prescription status update
  const handleStatusUpdate = async (newStatus) => {
    try {
      Alert.alert(
        i18n.t('confirm'),
        `${i18n.t('updateStatus')} ${newStatus}?`,
        [
          { text: i18n.t('cancel'), onPress: () => {} },
          {
            text: i18n.t('confirm'),
            onPress: async () => {
              const updated = await HealthRecordsService.updatePrescription(prescriptionId, {
                status: newStatus,
              });
              setPrescription(updated);
              Alert.alert(i18n.t('success'), i18n.t('prescriptionUpdated'));
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(i18n.t('error'), i18n.t('failedToUpdate'));
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

  if (!prescription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="inbox" size={48} color="#CCC" />
          <Text style={styles.emptyText}>{i18n.t('prescriptionNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{i18n.t('prescriptionDetails')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSharePdf} style={styles.headerIconButton}>
              <MaterialCommunityIcons name="file-pdf-box" size={24} color="#1976D2" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
              <MaterialCommunityIcons name="share-variant" size={24} color="#1976D2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Doctor Info Card */}
        <View style={styles.card}>
          <View style={styles.doctorHeader}>
            <MaterialCommunityIcons name="doctor" size={40} color="#4CAF50" />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{prescription.doctorName}</Text>
              <Text style={styles.specialization}>Medical Professional</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>{i18n.t('date')}</Text>
            <Text style={styles.value}>{new Date(prescription.date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{i18n.t('status')}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    prescription.status === 'active'
                      ? '#4CAF50'
                      : prescription.status === 'completed'
                      ? '#2196F3'
                      : '#FF9800',
                },
              ]}
            >
              <Text style={styles.statusText}>{prescription.status}</Text>
            </View>
          </View>
        </View>

        {/* Diagnosis Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('diagnosis')}</Text>
          <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
        </View>

        {/* Medicines Card */}
        {prescription.medicines && prescription.medicines.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('medicines')}</Text>
            {prescription.medicines.map((medicine, index) => (
              <View key={index} style={styles.medicineItem}>
                <View style={styles.medicineNumber}>
                  <Text style={styles.medicineNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.medicineName}>{medicine}</Text>
                <TouchableOpacity
                  onPress={() => {
                    // Could navigate to medicine reminder if medicine exists
                  }}
                  style={styles.medicineLink}
                >
                  <MaterialCommunityIcons name="link" size={16} color="#1976D2" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Advice Card */}
        {prescription.advice && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('advice')}</Text>
            <View style={styles.adviceBox}>
              <MaterialCommunityIcons name="information" size={20} color="#FF9800" />
              <Text style={styles.adviceText}>{prescription.advice}</Text>
            </View>
          </View>
        )}

        {/* Follow-up Card */}
        {prescription.followUpDate && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('followUpAppointment')}</Text>
            <View style={styles.followUpBox}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#2196F3" />
              <View style={styles.followUpInfo}>
                <Text style={styles.followUpDate}>
                  {new Date(prescription.followUpDate).toLocaleDateString()}
                </Text>
                <Text style={styles.followUpSubtext}>{i18n.t('scheduleConsultation')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes Card */}
        {prescription.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('notes')}</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{prescription.notes}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {prescription.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleStatusUpdate('completed')}
            >
              <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>{i18n.t('markComplete')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#1976D2" />
            <Text style={[styles.actionButtonText, styles.shareButtonText]}>
              {i18n.t('share')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialCommunityIcons name="download" size={20} color="#FFF" />
            )}
            <Text style={styles.actionButtonText}>
              {i18n.t('screens.healthRecords.downloadPdf', { defaultValue: 'Download PDF' })}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  specialization: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  label: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  diagnosisText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  medicineNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicineNumberText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  medicineName: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  medicineLink: {
    padding: 4,
  },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  adviceText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  followUpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  followUpInfo: {
    marginLeft: 12,
    flex: 1,
  },
  followUpDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  followUpSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  notesText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  shareButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  downloadButton: {
    backgroundColor: '#1f4788',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
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
  shareButtonText: {
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

export default PrescriptionDetailScreen;
