import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import emergencyAnimationService from '../services/emergencyAnimationService';
import EmergencyTreatmentGuide from '../components/EmergencyTreatmentGuide';

const LEVEL_COLORS = {
  CRITICAL: { bg: '#ffebee', text: '#c62828', label: '🔴 CRITICAL' },
  HIGH: { bg: '#fff3e0', text: '#e65100', label: '🟠 HIGH' },
  MEDIUM: { bg: '#e8f5e9', text: '#2e7d32', label: '🟡 MEDIUM' },
};

export default function EmergencyAnimationListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [allEmergencies] = useState(emergencyAnimationService.getAllEmergencies());

  const filteredEmergencies = searchQuery
    ? emergencyAnimationService.search(searchQuery)
    : allEmergencies;

  const getEmergencyIcon = (id) => {
    const icons = {
      cpr: 'heart',
      choking: 'throat',
      'severe-bleeding': 'blood-bag',
      burns: 'fire',
      'snake-bite': 'bug',
      shock: 'alert-circle',
      'heart-attack': 'heart-broken',
      drowning: 'water',
      poisoning: 'bottle-poison',
      fracture: 'bone',
    };
    return icons[id] || 'medical-bag';
  };

  const getEmergencyColor = (id) => {
    const colors = {
      cpr: '#e53935',
      choking: '#d32f2f',
      'severe-bleeding': '#c62828',
      burns: '#f57c00',
      'snake-bite': '#6a1b9a',
      shock: '#00796b',
      'heart-attack': '#e91e63',
      drowning: '#1976d2',
      poisoning: '#7b1fa2',
      fracture: '#f57f17',
    };
    return colors[id] || '#1976d2';
  };

  if (selectedEmergency) {
    return (
      <EmergencyTreatmentGuide
        emergency={selectedEmergency}
        onClose={() => setSelectedEmergency(null)}
      />
    );
  }

  const renderEmergencyCard = ({ item }) => (
    <TouchableOpacity
      style={styles.emergencyCard}
      onPress={() => setSelectedEmergency(item)}
    >
      <View style={styles.cardContent}>
        {/* Left: Icon */}
        <View
          style={[styles.iconCircle, { backgroundColor: getEmergencyColor(item.id) }]}
        >
          <MaterialCommunityIcons
            name={getEmergencyIcon(item.id)}
            size={28}
            color="#fff"
          />
        </View>

        {/* Middle: Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>

        {/* Right: Severity & Arrow */}
        <View style={styles.cardRight}>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: LEVEL_COLORS[item.severity]?.bg },
            ]}
          >
            <Text
              style={[
                styles.severityText,
                { color: LEVEL_COLORS[item.severity]?.text },
              ]}
            >
              {item.severity}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Emergency Treatment</Text>
          <Text style={styles.headerSubtitle}>Learn proper first aid</Text>
        </View>
        <MaterialCommunityIcons name="hospital-box" size={32} color="#fff" />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search CPR, choking, burns..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#ccc"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Results Count */}
      <View style={styles.resultInfo}>
        <Text style={styles.resultText}>
          {filteredEmergencies.length} treatment{filteredEmergencies.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      {/* Emergency List */}
      <FlatList
        data={filteredEmergencies}
        renderItem={renderEmergencyCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="magnify-close" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
      />

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information" size={20} color="#0066cc" />
        <Text style={styles.infoText}>
          These videos are for educational purposes. Always call 108 in emergencies.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#b71c1c',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  resultInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emergencyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
  },
  cardRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  infoBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#bbdefb',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#0066cc',
    marginLeft: 12,
    flex: 1,
  },
});
