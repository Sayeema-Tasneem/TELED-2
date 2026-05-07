import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import languageService from '../services/languageService';
import symptomCheckerService from '../services/symptomCheckerService';
import VoiceHelpIcon from '../components/VoiceHelpIcon';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const SymptomButton = ({ symptom, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.symptomButton, selected && styles.symptomButtonSelected]}
    onPress={onPress}
  >
    <Text style={[styles.symptomText, selected && styles.symptomTextSelected]}>
      {symptom}
    </Text>
  </TouchableOpacity>
);

export default function SymptomCheckerScreen({ navigation, route }) {
  const symptoms = symptomCheckerService.symptomCatalog;
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomText, setSymptomText] = useState('');
  const [detectedSymptoms, setDetectedSymptoms] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  const toggleSymptom = (symptomId) => {
    if (selectedSymptoms.includes(symptomId)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptomId));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptomId]);
    }

    if (analysis) {
      setAnalysis(null);
      setDetectedSymptoms([]);
    }
  };

  const handleGetAnalysis = async () => {
    if (!symptomText.trim() && selectedSymptoms.length === 0) {
      Alert.alert(
        t('common.error', 'Error'),
        'Please select symptoms or type what you are feeling'
      );
      return;
    }

    try {
      const textDetected = symptomCheckerService.extractSymptomsFromText(symptomText);
      const combinedSymptoms = [...new Set([...selectedSymptoms, ...textDetected])];

      let result;
      if (combinedSymptoms.length > 0) {
        result = await symptomCheckerService.analyzeSymptomsRemote(combinedSymptoms);
        setDetectedSymptoms(combinedSymptoms);
      } else {
        // Always provide a suggestion for typed text, even when no catalog symptom matches
        result = await symptomCheckerService.analyzeSymptomsFromText(symptomText);
        setDetectedSymptoms(result?.detectedSymptoms || []);
      }

      setAnalysis(result);
    } catch (error) {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('screens.symptoms.analysisFailed', 'Failed to analyze symptoms')
      );
    }
  };

  const handleConsultDoctor = () => {
    if (!analysis?.recommendedSpecialist) {
      return;
    }

    navigation.navigate('BookAppointment', {
      patient: route?.params?.patient,
      mode: 'suggested',
      recommendedSpecialist: analysis.recommendedSpecialist,
      prefilledSymptoms: symptomText || detectedSymptoms.join(', '),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('screens.symptoms.title')}</Text>
          <Text style={styles.subtitle}>{t('screens.symptoms.subtitle')}</Text>
        </View>
        <View style={styles.voiceIconContainer}>
          <VoiceHelpIcon 
            screenName="SymptomChecker"
            language="en"
            onSymptomDetected={(symptoms) => {
              symptoms.forEach(s => toggleSymptom(s));
            }}
            voicePrompt="Tell me your symptoms. You can say things like headache fever cough"
            followUpPrompt="Based on your symptoms, I can suggest a suitable specialist doctor. Do you want to book an appointment"
            unclearPrompt="Please tell your symptoms clearly like stomach pain or cold and fever"
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.symptoms.selectSymptoms', 'Select your symptoms')}</Text>
          <View style={styles.symptomsGrid}>
            {symptoms.map((symptom) => (
              <SymptomButton
                key={symptom.id}
                symptom={t(symptom.labelKey, symptom.fallback)}
                selected={selectedSymptoms.includes(symptom.id)}
                onPress={() => toggleSymptom(symptom.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe your symptoms</Text>
          <TextInput
            style={styles.symptomInput}
            multiline
            numberOfLines={5}
            placeholder="Example: I have fever, body pain and cough since 2 days"
            placeholderTextColor="#7c8a99"
            value={symptomText}
            onChangeText={(text) => {
              setSymptomText(text);
              if (analysis) {
                setAnalysis(null);
                setDetectedSymptoms([]);
              }
            }}
          />
        </View>

        {detectedSymptoms.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>Detected symptoms</Text>
            {detectedSymptoms.map((symptom, index) => {
              const symptomItem = symptoms.find(item => item.id === symptom);

              return (
              <View key={index} style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>✓ {t(symptomItem?.labelKey, symptomItem?.fallback || symptom)}</Text>
              </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.analysisButton,
            !symptomText.trim() && selectedSymptoms.length === 0 && styles.analysisButtonDisabled,
          ]}
          onPress={handleGetAnalysis}
          disabled={!symptomText.trim() && selectedSymptoms.length === 0}
        >
          <Text style={styles.analysisButtonText}>{t('screens.symptoms.analyze', 'Analyze Symptoms')}</Text>
        </TouchableOpacity>

        {analysis && (
          <View style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>{t('screens.symptoms.analysisTitle', 'Analysis Summary')}</Text>

            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>{t('screens.symptoms.likelyCondition', 'Likely condition')}:</Text>
              <Text style={styles.analysisValue}>{analysis.condition}</Text>
            </View>

            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>{t('screens.symptoms.severity', 'Severity')}:</Text>
              <Text style={styles.analysisValue}>{analysis.severityLabel}</Text>
            </View>

            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>{t('screens.symptoms.confidence', 'Confidence')}:</Text>
              <Text style={styles.analysisValue}>{analysis.confidence}%</Text>
            </View>

            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>{t('screens.symptoms.recommendedSpecialist', 'Recommended specialist')}:</Text>
              <Text style={styles.analysisValue}>{analysis.recommendedSpecialist}</Text>
            </View>

            <Text style={styles.recommendationText}>{analysis.recommendation}</Text>

            {analysis.warning ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{analysis.warning}</Text>
              </View>
            ) : null}

            {/* General Advice Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>✓ General Advice</Text>
              {analysis.advice && analysis.advice.map((tip, index) => (
                <Text key={index} style={styles.listItem}>• {tip}</Text>
              ))}
            </View>

            {/* Home Care Section */}
            {analysis.homeCare && analysis.homeCare.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeading}>🏠 Home Care Tips</Text>
                {analysis.homeCare.map((tip, index) => (
                  <Text key={index} style={styles.listItem}>• {tip}</Text>
                ))}
              </View>
            )}

            {/* Remedies Section */}
            {analysis.remedies && analysis.remedies.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeading}>💊 Remedies & Treatment</Text>
                {analysis.remedies.map((remedy, index) => (
                  <Text key={index} style={styles.listItem}>• {remedy}</Text>
                ))}
              </View>
            )}

            {/* Precautions Section */}
            {analysis.precautions && analysis.precautions.length > 0 && (
              <View style={[styles.sectionContainer, styles.cautionSection]}>
                <Text style={styles.cautionHeading}>⚠️ Important Precautions</Text>
                {analysis.precautions.map((precaution, index) => (
                  <Text key={index} style={styles.cautionItem}>• {precaution}</Text>
                ))}
              </View>
            )}

            <Text style={styles.disclaimerText}>{analysis.disclaimer}</Text>

            <TouchableOpacity style={styles.consultButton} onPress={handleConsultDoctor}>
              <Text style={styles.consultButtonText}>{t('screens.symptoms.consultNow', 'Consult Doctor Now')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#1f4788',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flex: 1,
    paddingRight: 10,
  },
  voiceIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#e0e0e0',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  symptomButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    elevation: 1,
  },
  symptomButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  symptomText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  symptomTextSelected: {
    color: '#fff',
  },
  symptomInput: {
    backgroundColor: '#fff',
    borderColor: '#5f6b78',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    textAlignVertical: 'top',
    minHeight: 130,
  },
  selectedSection: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 12,
  },
  selectedItem: {
    marginBottom: 8,
  },
  selectedItemText: {
    fontSize: 13,
    color: '#1b5e20',
    fontWeight: '500',
  },
  analysisButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  analysisButtonDisabled: {
    backgroundColor: '#ddd',
  },
  analysisButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f4788',
    marginBottom: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analysisLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  analysisValue: {
    fontSize: 13,
    color: '#111',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  recommendationText: {
    marginTop: 10,
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '600',
  },
  warningBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff3f3',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  warningText: {
    color: '#b71c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  adviceTitle: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  adviceItem: {
    fontSize: 12,
    color: '#444',
    marginBottom: 4,
    lineHeight: 18,
  },
  disclaimerText: {
    marginTop: 12,
    fontSize: 11,
    color: '#777',
    fontStyle: 'italic',
  },
  sectionContainer: {
    marginTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f4788',
    marginBottom: 8,
  },
  listItem: {
    fontSize: 12,
    color: '#444',
    marginBottom: 6,
    lineHeight: 18,
    paddingLeft: 4,
  },
  cautionSection: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffd54f',
    borderBottomWidth: 1,
  },
  cautionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f57f17',
    marginBottom: 8,
  },
  cautionItem: {
    fontSize: 12,
    color: '#e65100',
    marginBottom: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  consultButton: {
    marginTop: 14,
    backgroundColor: '#1f4788',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  consultButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
