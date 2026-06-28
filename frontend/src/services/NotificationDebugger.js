/**
 * Notification Debugger Component
 * Add this to your app for easy testing of notification system
 * 
 * Usage in any screen:
 * import NotificationDebugger from '../services/NotificationDebugger';
 * <NotificationDebugger />
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import NotificationService from './notificationService';

export default function NotificationDebugger() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await NotificationService.verifyScheduledNotifications();
      setDiagnostics(result);
      setTestMessage('✅ Diagnostics completed');
    } catch (error) {
      setTestMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotif = async () => {
    setLoading(true);
    try {
      const result = await NotificationService.sendTestNotification();
      setTestMessage(result ? '✅ Test notification sent!' : '❌ Failed to send');
    } catch (error) {
      setTestMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelAllNotifs = async () => {
    setLoading(true);
    try {
      await NotificationService.cancelAllNotifications();
      setTestMessage('✅ All notifications cancelled');
      await runDiagnostics();
    } catch (error) {
      setTestMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = async () => {
    setLoading(true);
    try {
      const status = await NotificationService.getPermissionsStatus();
      setTestMessage(status ? '✅ Permissions GRANTED' : '❌ Permissions DENIED');
    } catch (error) {
      setTestMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Notification Debugger</Text>
      
      <ScrollView style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary]}
          onPress={runDiagnostics}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📊 Run Diagnostics</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSuccess]}
          onPress={sendTestNotif}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📤 Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonInfo]}
          onPress={checkPermission}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔒 Check Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonDanger]}
          onPress={cancelAllNotifs}
          disabled={loading}
        >
          <Text style={styles.buttonText}>❌ Cancel All Notifications</Text>
        </TouchableOpacity>
      </ScrollView>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

      {testMessage && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{testMessage}</Text>
        </View>
      )}

      {diagnostics && (
        <View style={styles.diagnosticsBox}>
          <Text style={styles.diagnosticsTitle}>Diagnostics Result:</Text>
          <Text style={styles.diagnosticsText}>
            Permission: {diagnostics.permissionGranted ? '✅' : '❌'}
          </Text>
          <Text style={styles.diagnosticsText}>
            Total Scheduled: {diagnostics.totalScheduled || 0}
          </Text>
          <Text style={styles.diagnosticsText}>
            Medicine Reminders: {diagnostics.medicineReminders || 0}
          </Text>
          {diagnostics.error && (
            <Text style={[styles.diagnosticsText, { color: 'red' }]}>
              Error: {diagnostics.error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 12,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonInfo: {
    backgroundColor: '#5AC8FA',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
  messageBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  messageText: {
    fontSize: 13,
    color: '#333',
  },
  diagnosticsBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  diagnosticsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  diagnosticsText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});
