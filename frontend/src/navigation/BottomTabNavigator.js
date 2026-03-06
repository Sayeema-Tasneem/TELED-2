import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import languageService from '../services/languageService';

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
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import NearbyHospitalsScreen from '../screens/NearbyHospitalsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

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
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
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
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
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
        component={MedicineReminderScreen}
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
        name="Hospitals"
        component={NearbyHospitalsScreen}
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
