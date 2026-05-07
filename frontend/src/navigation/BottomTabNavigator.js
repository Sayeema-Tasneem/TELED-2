import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import languageService from '../services/languageService';
import { A11Y_COLORS, fs } from '../theme/accessibility';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import DoctorScreen from '../screens/DoctorScreen';
import EnhancedDoctorListScreen from '../screens/EnhancedDoctorListScreen';
import DoctorProfileScreen from '../screens/DoctorProfileScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import AppointmentDetailsScreen from '../screens/AppointmentDetailsScreen';
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import MedicineReminderScreen from '../screens/MedicineReminderScreen';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import NearbyHospitalsScreen from '../screens/NearbyHospitalsScreen';
import NearbyHospitalsMapScreen from '../screens/NearbyHospitalsMapScreen';
import EmergencyHelpScreen from '../screens/EmergencyHelpScreen';
import MedicalEquipmentScreen from '../screens/MedicalEquipmentScreen';
import EquipmentHubScreen from '../screens/EquipmentHubScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Medicine Stack Navigator
function MedicineStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedicineReminder" component={MedicineReminderScreen} />
      <Stack.Screen name="AddMedicineScreen" component={AddMedicineScreen} />
    </Stack.Navigator>
  );
}

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

// Home Stack Navigator
function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
      />
      <Stack.Screen
        name="EmergencyHelp"
        component={EmergencyHelpScreen}
      />
      <Stack.Screen
        name="MedicalEquipment"
        component={MedicalEquipmentScreen}
      />
      <Stack.Screen
        name="EquipmentHub"
        component={EquipmentHubScreen}
      />
    </Stack.Navigator>
  );
}

// Doctor Stack Navigator
function DoctorStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="DoctorList"
        component={EnhancedDoctorListScreen}
      />
      <Stack.Screen
        name="DoctorProfile"
        component={DoctorProfileScreen}
      />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
      />
    </Stack.Navigator>
  );
}

// Appointments Stack Navigator
function AppointmentsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AppointmentsList"
        component={AppointmentsScreen}
      />
      <Stack.Screen
        name="AppointmentDetails"
        component={AppointmentDetailsScreen}
      />
    </Stack.Navigator>
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: A11Y_COLORS.brand,
        tabBarInactiveTintColor: A11Y_COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: A11Y_COLORS.background,
          borderTopWidth: 1,
          borderTopColor: A11Y_COLORS.border,
          height: 86,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: fs(12),
          fontWeight: '700',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'DoctorStack':
              iconName = focused ? 'person-circle' : 'person-circle-outline';
              break;
            case 'Appointments':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Symptoms':
              iconName = focused ? 'pulse' : 'pulse-outline';
              break;
            case 'Medicine':
              iconName = focused ? 'medical' : 'medical-outline';
              break;
            case 'Records':
              iconName = focused ? 'document' : 'document-outline';
              break;
            case 'Hospitals':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'EquipmentHubTab':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={focused ? 32 : 30} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('nav.home', 'Home'),
        }}
      />
      <Tab.Screen
        name="DoctorStack"
        component={DoctorStackNavigator}
        options={{
          tabBarLabel: t('nav.doctor', 'Doctor'),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStackNavigator}
        options={{
          tabBarLabel: 'Appointments',
        }}
      />
      <Tab.Screen
        name="Symptoms"
        component={SymptomCheckerScreen}
        options={{
          tabBarLabel: t('nav.symptoms', 'Symptoms'),
        }}
      />
      <Tab.Screen
        name="Medicine"
        component={MedicineStackNavigator}
        options={{
          tabBarLabel: t('nav.medicine', 'Medicine'),
        }}
      />
      <Tab.Screen
        name="Records"
        component={HealthRecordsScreen}
        options={{
          tabBarLabel: t('nav.records', 'Records'),
        }}
      />
      <Tab.Screen
        name="EquipmentHubTab"
        component={EquipmentHubScreen}
        options={{
          tabBarLabel: 'Equipment Hub',
        }}
      />
      <Tab.Screen
        name="Hospitals"
        component={NearbyHospitalsMapScreen}
        options={{
          tabBarLabel: t('nav.hospitals', 'Hospitals'),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
