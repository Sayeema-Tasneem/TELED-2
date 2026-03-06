import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

const MedicineItem = ({ medicine, onTake, onDelete }) => (
  <View style={styles.medicineCard}>
    <View style={styles.medicineInfo}>
      <Text style={styles.medicineName}>{medicine.name}</Text>
      <Text style={styles.dosage}>{medicine.dosage}</Text>
      <Text style={styles.time}>⏰ {medicine.time}</Text>
    </View>
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.takeButton} onPress={onTake}>
        <Text style={styles.takeButtonText}>✓</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AddMedicineModal = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = () => {
    if (name && dosage && time) {
      onAdd({ name, dosage, time });
      setName('');
      setDosage('');
      setTime('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('screens.medicine.addMedicine')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalForm}>
            <TextInput
              style={styles.input}
              placeholder={t('screens.medicine.medicineName')}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder={t('screens.medicine.dosage')}
              value={dosage}
              onChangeText={setDosage}
            />
            <TextInput
              style={styles.input}
              placeholder={t('screens.medicine.time')}
              value={time}
              onChangeText={setTime}
            />

            <TouchableOpacity
              style={[styles.addButton, (!name || !dosage || !time) && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!name || !dosage || !time}
            >
              <Text style={styles.addButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function MedicineReminderScreen() {
  const [medicines, setMedicines] = useState([
    {
      id: 1,
      name: 'Aspirin',
      dosage: '1 tablet',
      time: '08:00 AM',
    },
    {
      id: 2,
      name: 'Vitamin D',
      dosage: '1 capsule',
      time: '10:00 AM',
    },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddMedicine = (medicine) => {
    setMedicines([
      ...medicines,
      { id: Date.now(), ...medicine },
    ]);
    setShowAddModal(false);
  };

  const handleDeleteMedicine = (id) => {
    setMedicines(medicines.filter((m) => m.id !== id));
  };

  const handleTakeMedicine = (id) => {
    // TODO: Log medicine intake
    alert(t('screens.medicine.takeMedicine') + ' recorded');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.medicine.title')}</Text>
        <Text style={styles.subtitle}>{t('screens.medicine.subtitle')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t('screens.medicine.myMedicines')}</Text>
        
        {medicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('screens.medicine.noDosesToday')}</Text>
          </View>
        ) : (
          <FlatList
            data={medicines}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MedicineItem
                medicine={item}
                onTake={() => handleTakeMedicine(item.id)}
                onDelete={() => handleDeleteMedicine(item.id)}
              />
            )}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.addMedicineButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addMedicineButtonText}>+ {t('screens.medicine.addMedicine')}</Text>
        </TouchableOpacity>
      </View>

      <AddMedicineModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMedicine}
      />
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  medicineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dosage: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 6,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  takeButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addMedicineButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addMedicineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  modalForm: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#ddd',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
