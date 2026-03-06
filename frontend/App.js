import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import ProfileCreationScreen from './src/screens/ProfileCreationScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';

// Import services
import languageService from './src/services/languageService';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize language service
        await languageService.initializeLanguage();
        
        // Check if user is authenticated
        // For now, default to LoginScreen
        setInitialRoute('Login');
      } catch (error) {
        console.error('Initialization error:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1f4788" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
          />
          <Stack.Screen 
            name="OTP" 
            component={OTPScreen} 
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileCreationScreen} 
          />
          <Stack.Screen 
            name="MainApp" 
            component={BottomTabNavigator} 
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </>
  );
}
