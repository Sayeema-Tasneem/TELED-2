import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import languageService from '../services/languageService';

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

export default function SymptomCheckerScreen() {
  const symptoms = [
    t('screens.symptoms.fever', 'Fever'),
    t('screens.symptoms.cough', 'Cough'),
    t('screens.symptoms.headache', 'Headache'),
    t('screens.symptoms.stomachPain', 'Stomach Pain'),
    t('screens.symptoms.weakness', 'Weakness'),
  ];

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleGetAnalysis = () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert(
        'Info',
        'Please select at least one symptom to get analysis'
      );
      return;
    }

    Alert.alert(
      t('screens.symptoms.analysis', 'Analysis'),
      `You have selected: ${selectedSymptoms.join(', ')}\n\nBased on your symptoms, we recommend consulting a doctor for proper diagnosis.`,
      [
        {
          text: t('common.ok'),
          onPress: () => {},
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.symptoms.title')}</Text>
        <Text style={styles.subtitle}>{t('screens.symptoms.subtitle')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.symptoms.selectSymptoms')}</Text>
          <View style={styles.symptomsGrid}>
            {symptoms.map((symptom, index) => (
              <SymptomButton
                key={index}
                symptom={symptom}
                selected={selectedSymptoms.includes(symptom)}
                onPress={() => toggleSymptom(symptom)}
              />
            ))}
          </View>
        </View>

        {selectedSymptoms.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>Selected Symptoms:</Text>
            {selectedSymptoms.map((symptom, index) => (
              <View key={index} style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>✓ {symptom}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.analysisButton,
            selectedSymptoms.length === 0 && styles.analysisButtonDisabled,
          ]}
          onPress={handleGetAnalysis}
          disabled={selectedSymptoms.length === 0}
        >
          <Text style={styles.analysisButtonText}>{t('screens.symptoms.getAnalysis')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
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
});
