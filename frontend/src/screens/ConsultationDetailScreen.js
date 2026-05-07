/**
 * Consultation Detail Screen
 * Shows detailed consultation information with symptoms, diagnosis, and recommendations
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { i18n } from '../services/languageService';
import HealthRecordsService from '../services/healthRecordsService';

const ConsultationDetailScreen = ({ route, navigation }) => {
  const { consultationId } = route?.params || {};
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load consultation details
  useEffect(() => {
    const loadConsultation = async () => {
      try {
        if (!consultationId) {
          Alert.alert(i18n.t('error'), i18n.t('consultationNotFound'));
          navigation.goBack();
          return;
        }

        const data = await HealthRecordsService.getConsultation(consultationId);
        setConsultation(data);
      } catch (error) {
        console.error('Error loading consultation:', error);
        Alert.alert(i18n.t('error'), i18n.t('failedToLoadConsultation'));
      } finally {
        setLoading(false);
      }
    };

    loadConsultation();
  }, [consultationId, navigation]);

  // Handle share
  const handleShare = async () => {
    if (!consultation) return;

    const message = `
${i18n.t('consultationDetails')}
Doctor: ${consultation.doctorName}
Date: ${new Date(consultation.date).toLocaleDateString()} ${consultation.time}
Type: ${consultation.type}

Chief Complaint: ${consultation.chiefComplaint}

${consultation.symptoms && consultation.symptoms.length > 0 ? `Symptoms:\n${consultation.symptoms.map((s) => `• ${s}`).join('\n')}\n` : ''}

Diagnosis: ${consultation.diagnosis || 'Pending'}

${consultation.medicines && consultation.medicines.length > 0 ? `Medicines:\n${consultation.medicines.map((m) => `• ${m}`).join('\n')}\n` : ''}

${consultation.testRecommendations && consultation.testRecommendations.length > 0 ? `Tests Recommended:\n${consultation.testRecommendations.map((t) => `• ${t}`).join('\n')}\n` : ''}

Advice: ${consultation.advice || 'N/A'}
Follow-up: ${consultation.followUpDate || 'Not scheduled'}
    `;

    try {
      await Share.share({
        message: message,
        title: `${i18n.t('consultation')} - ${consultation.doctorName}`,
      });
    } catch (error) {
      Alert.alert(i18n.t('error'), i18n.t('sharingFailed'));
    }
  };

  // Handle contact doctor
  const handleContactDoctor = () => {
    Alert.alert(i18n.t('contactDoctor'), i18n.t('selectContactMethod'), [
      { text: i18n.t('cancel'), onPress: () => {} },
      {
        text: i18n.t('call'),
        onPress: () => Linking.openURL('tel:+919876543210'),
      },
      {
        text: i18n.t('email'),
        onPress: () => Linking.openURL('mailto:doctor@example.com'),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  if (!consultation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="inbox" size={48} color="#CCC" />
          <Text style={styles.emptyText}>{i18n.t('consultationNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getConsultationTypeColor = (type) => {
    const colors = {
      video: '#4CAF50',
      audio: '#2196F3',
      chat: '#FF9800',
    };
    return colors[type] || '#666';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeftSpacer} />
          <Text style={styles.headerTitle}>{i18n.t('consultationDetails')}</Text>
          <TouchableOpacity onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Doctor Info Card */}
        <View style={styles.card}>
          <View style={styles.doctorHeader}>
            <MaterialCommunityIcons name="stethoscope" size={40} color="#2196F3" />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{consultation.doctorName}</Text>
              <Text style={styles.specialization}>Medical Professional</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>{i18n.t('date')}</Text>
            <Text style={styles.value}>{new Date(consultation.date).toLocaleDateString()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>{i18n.t('time')}</Text>
            <Text style={styles.value}>{consultation.time}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>{i18n.t('type')}</Text>
            <View style={[styles.typeBadge, { backgroundColor: getConsultationTypeColor(consultation.type) }]}>
              <MaterialCommunityIcons
                name={consultation.type === 'video' ? 'video' : consultation.type === 'audio' ? 'phone' : 'chat'}
                size={14}
                color="#FFF"
              />
              <Text style={styles.typeText}>{consultation.type}</Text>
            </View>
          </View>

          {consultation.callDuration && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{i18n.t('duration')}</Text>
              <Text style={styles.value}>{Math.ceil(consultation.callDuration / 60)} {i18n.t('minutes')}</Text>
            </View>
          )}
        </View>

        {/* Chief Complaint Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('complaint')}</Text>
          <View style={styles.complaintBox}>
            <Text style={styles.complaintText}>{consultation.chiefComplaint}</Text>
          </View>
        </View>

        {/* Symptoms Card */}
        {consultation.symptoms && consultation.symptoms.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('symptoms')}</Text>
            {consultation.symptoms.map((symptom, index) => (
              <View key={index} style={styles.symptomItem}>
                <View style={styles.symptomMarker} />
                <Text style={styles.symptomText}>{symptom}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Diagnosis Card */}
        {consultation.diagnosis && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('diagnosis')}</Text>
            <View style={styles.diagnosisBox}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.diagnosisText}>{consultation.diagnosis}</Text>
            </View>
          </View>
        )}

        {/* Medicines Card */}
        {consultation.medicines && consultation.medicines.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('prescribedMedicines')}</Text>
            {consultation.medicines.map((medicine, index) => (
              <View key={index} style={styles.medicineItem}>
                <View style={styles.medicineNumber}>
                  <Text style={styles.medicineNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.medicineName}>{medicine}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Test Recommendations */}
        {consultation.testRecommendations && consultation.testRecommendations.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('testRecommendations')}</Text>
            {consultation.testRecommendations.map((test, index) => (
              <View key={index} style={styles.testItem}>
                <MaterialCommunityIcons name="flask" size={16} color="#FF5722" />
                <Text style={styles.testText}>{test}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Advice Card */}
        {consultation.advice && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('advice')}</Text>
            <View style={styles.adviceBox}>
              <MaterialCommunityIcons name="lightbulb" size={20} color="#FF9800" />
              <Text style={styles.adviceText}>{consultation.advice}</Text>
            </View>
          </View>
        )}

        {/* Follow-up Card */}
        {consultation.followUpDate && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('followUpAppointment')}</Text>
            <View style={styles.followUpBox}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#2196F3" />
              <View style={styles.followUpInfo}>
                <Text style={styles.followUpDate}>
                  {new Date(consultation.followUpDate).toLocaleDateString()}
                </Text>
                <Text style={styles.followUpSubtext}>{i18n.t('scheduleConsultation')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes Card */}
        {consultation.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{i18n.t('notes')}</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{consultation.notes}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContactDoctor}
          >
            <MaterialCommunityIcons name="phone" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>{i18n.t('contact')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#2196F3" />
            <Text style={[styles.actionButtonText, styles.shareButtonText]}>
              {i18n.t('share')}
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
  headerLeftSpacer: {
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
    borderColor: '#2196F3',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '800',
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
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  complaintBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  complaintText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  symptomMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
    marginRight: 12,
  },
  symptomText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  diagnosisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  diagnosisText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 12,
    flex: 1,
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
    backgroundColor: '#2196F3',
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
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  testText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 12,
    flex: 1,
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
  contactButton: {
    backgroundColor: '#2196F3',
  },
  shareButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  shareButtonText: {
    color: '#2196F3',
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

export default ConsultationDetailScreen;
