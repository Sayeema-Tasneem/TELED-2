import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function EmergencyTreatmentGuide({ emergency, onClose }) {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const { height, width } = useWindowDimensions();

  const handleVideoError = (error) => {
    console.error('Video load error:', error);
    setVideoError(true);
    setVideoLoading(false);
  };

  const handlePlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setVideoLoading(false);
    }
  };

  const openExternalUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot open link', 'No application can open this link on your device.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error('Failed to open URL', err);
      Alert.alert('Error', 'Unable to open the video. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={true} style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{emergency.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Severity Badge */}
        <View style={styles.severityContainer}>
          {emergency.severity === 'CRITICAL' && (
            <View style={styles.severityBadgeCritical}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#c62828" />
              <Text style={styles.severityLabelCritical}>CRITICAL - Life Threatening</Text>
              <Text style={styles.severityDescCritical}>Requires immediate emergency call (108)</Text>
            </View>
          )}
          {emergency.severity === 'HIGH' && (
            <View style={styles.severityBadgeHigh}>
              <MaterialCommunityIcons name="alert" size={24} color="#e65100" />
              <Text style={styles.severityLabelHigh}>HIGH PRIORITY - Serious</Text>
              <Text style={styles.severityDescHigh}>Seek medical attention urgently</Text>
            </View>
          )}
          {emergency.severity === 'MEDIUM' && (
            <View style={styles.severityBadgeMedium}>
              <MaterialCommunityIcons name="information" size={24} color="#2e7d32" />
              <Text style={styles.severityLabelMedium}>MODERATE - Monitor closely</Text>
              <Text style={styles.severityDescMedium}>Watch for worsening symptoms</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.descriptionBox}>
          <Text style={styles.description}>{emergency.description}</Text>
        </View>

        {/* Video Section */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionLabel}>📹 Treatment Video</Text>
          <View style={[styles.videoContainer, { height: (width - 32) * 0.5625 }]}>
            {/* If the URL points to YouTube search/results or youtu.be, open externally instead of using expo-av */}
            {((emergency.videoUrl || '').includes('youtube.com') || (emergency.videoUrl || '').includes('youtu.be')) ? (
              <View style={styles.youtubeContainer}>
                <MaterialCommunityIcons name="youtube" size={56} color="#ff0000" />
                <Text style={styles.youtubeText}>Open guidance on YouTube</Text>
                <TouchableOpacity
                  style={styles.youtubeButton}
                  onPress={() => openExternalUrl(emergency.videoUrl)}
                >
                  <Text style={styles.youtubeButtonText}>Open YouTube</Text>
                </TouchableOpacity>
              </View>
            ) : (
              (videoError ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="video-off" size={48} color="#999" />
                  <Text style={styles.errorText}>Unable to load video</Text>
                  <Text style={styles.errorSubtext}>Check your internet connection</Text>
                </View>
              ) : (
                <Video
                  source={{ uri: emergency.videoUrl }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  style={styles.video}
                  onError={handleVideoError}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />
              ))
            )}
          </View>
        </View>

        {/* Steps Section */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionLabel}>📋 Step-by-Step Treatment</Text>
          {emergency.steps.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Do's Section */}
        <View style={styles.dosSection}>
          <View style={styles.doHeaderRow}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#067647" />
            <Text style={styles.doHeaderTitle}>✓ Do These Things</Text>
          </View>
          {emergency.dos.map((doItem, index) => (
            <View key={index} style={styles.doItem}>
              <Text style={styles.doBullet}>✓</Text>
              <Text style={styles.doText}>{doItem}</Text>
            </View>
          ))}
        </View>

        {/* Don'ts Section */}
        <View style={styles.dontsSection}>
          <View style={styles.dontHeaderRow}>
            <MaterialCommunityIcons name="close-circle" size={24} color="#b42318" />
            <Text style={styles.dontHeaderTitle}>✗ Avoid These Things</Text>
          </View>
          {emergency.donts.map((dontItem, index) => (
            <View key={index} style={styles.dontItem}>
              <Text style={styles.dontBullet}>✗</Text>
              <Text style={styles.dontText}>{dontItem}</Text>
            </View>
          ))}
        </View>

        {/* Warning Section */}
        {emergency.warning && (
          <View style={styles.warningBox}>
            <MaterialCommunityIcons name="alert-circle" size={28} color="#d97706" />
            <Text style={styles.warningTitle}>⚠️ Important Warning</Text>
            <Text style={styles.warningText}>{emergency.warning}</Text>
          </View>
        )}

        {/* Emergency Button */}
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => Linking.openURL('tel:108')}
        >
          <MaterialCommunityIcons name="phone-emergency" size={28} color="#fff" />
          <Text style={styles.emergencyButtonText}>Call Emergency (108)</Text>
        </TouchableOpacity>

        <View style={styles.spacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#b71c1c',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    severityContainer: {
      marginHorizontal: 12,
      marginTop: 12,
      borderRadius: 10,
      overflow: 'hidden',
    },
    severityBadgeCritical: {
      backgroundColor: '#ffebee',
      borderLeftWidth: 5,
      borderLeftColor: '#c62828',
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    severityLabelCritical: {
      fontSize: 14,
      fontWeight: '700',
      color: '#c62828',
      marginLeft: 12,
      flex: 1,
    },
    severityDescCritical: {
      fontSize: 11,
      color: '#c62828',
      marginLeft: 12,
      marginTop: 2,
    },
    severityBadgeHigh: {
      backgroundColor: '#fff3e0',
      borderLeftWidth: 5,
      borderLeftColor: '#e65100',
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    severityLabelHigh: {
      fontSize: 14,
      fontWeight: '700',
      color: '#e65100',
      marginLeft: 12,
      flex: 1,
    },
    severityDescHigh: {
      fontSize: 11,
      color: '#e65100',
      marginLeft: 12,
      marginTop: 2,
    },
    severityBadgeMedium: {
      backgroundColor: '#e8f5e9',
      borderLeftWidth: 5,
      borderLeftColor: '#2e7d32',
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    severityLabelMedium: {
      fontSize: 14,
      fontWeight: '700',
      color: '#2e7d32',
      marginLeft: 12,
      flex: 1,
    },
    severityDescMedium: {
      fontSize: 11,
      color: '#2e7d32',
      marginLeft: 12,
      marginTop: 2,
    },
  },
  descriptionBox: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  description: {
    fontSize: 14,
    color: '#5a4f00',
    fontWeight: '500',
  },
  videoSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  videoContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  errorSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
  },
  youtubeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  youtubeText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  youtubeButton: {
    marginTop: 12,
    backgroundColor: '#ff0000',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  youtubeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  stepsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#b71c1c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  dosSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#ecfdf3',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#067647',
  },
  doHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#067647',
    marginLeft: 8,
  },
  doItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  doBullet: {
    color: '#067647',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  doText: {
    flex: 1,
    fontSize: 14,
    color: '#1e4620',
    lineHeight: 20,
  },
  dontsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fde2e2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#b42318',
  },
  dontHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dontHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b42318',
    marginLeft: 8,
  },
  dontItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dontBullet: {
    color: '#b42318',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  dontText: {
    flex: 1,
    fontSize: 14,
    color: '#5a2a2a',
    lineHeight: 20,
  },
  warningBox: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d97706',
    marginTop: 8,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  emergencyButton: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#b71c1c',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  spacing: {
    height: 20,
  },
});
