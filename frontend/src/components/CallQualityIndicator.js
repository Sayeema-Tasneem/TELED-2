/**
 * Call Quality Indicator Component
 * Display network quality and call stats in real-time
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function CallQualityIndicator({ quality = 'good', stats = {} }) {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Animate pulse effect
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const getQualityColor = () => {
    switch (quality) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FFC107';
      case 'poor':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getQualityIcon = () => {
    switch (quality) {
      case 'excellent':
        return 'signal-5';
      case 'good':
        return 'signal-4';
      case 'fair':
        return 'signal-3';
      case 'poor':
        return 'signal-2';
      default:
        return 'signal-variant-off';
    }
  };

  const getQualityLabel = () => {
    switch (quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor Connection';
      default:
        return 'No Signal';
    }
  };

  const qualityColor = getQualityColor();

  return (
    <View style={styles.container}>
      {/* Quality Indicator Pill */}
      <Animated.View
        style={[
          styles.qualityPill,
          { backgroundColor: qualityColor },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <MaterialCommunityIcons
          name={getQualityIcon()}
          size={14}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.qualityText}>{getQualityLabel()}</Text>
      </Animated.View>

      {/* Detailed Stats (if provided) */}
      {Object.keys(stats).length > 0 && (
        <View style={styles.statsContainer}>
          {stats.videoBitrate > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Video: {stats.videoBitrate} kbps</Text>
            </View>
          )}
          {stats.audioBitrate > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Audio: {stats.audioBitrate} kbps</Text>
            </View>
          )}
          {stats.videoFrameRate > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>FPS: {stats.videoFrameRate}</Text>
            </View>
          )}
          {stats.packetLossRate !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>
                Loss: {(stats.packetLossRate * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Warning for poor connection */}
      {quality === 'poor' && (
        <View style={styles.warningBar}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={14}
            color="#FF5252"
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
            Weak connection - adjusting quality
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
  },
  qualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  icon: {
    marginRight: 6,
  },
  qualityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statRow: {
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  warningBar: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5252',
  },
  warningIcon: {
    marginRight: 6,
  },
  warningText: {
    color: '#FF5252',
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
  },
});
