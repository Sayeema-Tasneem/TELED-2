/**
 * Message Bubble Component - Individual message display
 * Shows text messages, images, and uploaded files
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function MessageBubble({
  message,
  isOwn = false,
  onImagePress = null,
  onDelete = null,
}) {
  const [imageLoading, setImageLoading] = useState(true);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleOpenFile = () => {
    if (message.mediaUrl) {
      Linking.openURL(message.mediaUrl).catch((err) =>
        console.error('Error opening file:', err)
      );
    }
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      {/* Sender info (only for received messages) */}
      {!isOwn && (
        <Text style={styles.senderName}>
          {message.senderName} ({message.senderRole})
        </Text>
      )}

      {/* Message content based on type */}
      {message.messageType === 'text' && (
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text style={[styles.messageText, isOwn && styles.ownText]}>
            {message.content}
          </Text>
        </View>
      )}

      {message.messageType === 'image' && message.mediaUrl && (
        <TouchableOpacity
          onPress={() => onImagePress?.(message.mediaUrl)}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri: message.mediaUrl }}
            style={styles.messageImage}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {message.messageType === 'file' && message.mediaUrl && (
        <TouchableOpacity
          style={[
            styles.fileBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
          onPress={handleOpenFile}
        >
          <MaterialCommunityIcons
            name={
              message.mediaType?.includes('pdf')
                ? 'file-pdf-box'
                : 'file-document'
            }
            size={24}
            color={isOwn ? '#fff' : '#2196F3'}
            style={styles.fileIcon}
          />
          <View style={styles.fileInfo}>
            <Text
              style={[
                styles.fileName,
                isOwn && { color: 'white' },
              ]}
              numberOfLines={1}
            >
              {message.fileName}
            </Text>
            <Text
              style={[
                styles.fileSize,
                isOwn && { color: 'rgba(255,255,255,0.8)' },
              ]}
            >
              {formatFileSize(message.fileSize)}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="download"
            size={20}
            color={isOwn ? '#fff' : '#2196F3'}
          />
        </TouchableOpacity>
      )}

      {message.messageType === 'deleted' && (
        <View style={[styles.messageBubble, styles.deletedBubble]}>
          <Text style={styles.deletedText}>
            [Message deleted]
          </Text>
        </View>
      )}

      {/* Timestamp and read status */}
      <View style={styles.messageFooter}>
        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
        {isOwn && message.isRead && (
          <MaterialCommunityIcons
            name="check-double"
            size={14}
            color="#4CAF50"
            style={styles.readIcon}
          />
        )}
      </View>

      {/* Delete button for own messages */}
      {isOwn && message.messageType !== 'deleted' && onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(message.id)}
        >
          <MaterialCommunityIcons
            name="close"
            size={16}
            color="#FF5252"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ownBubble: {
    backgroundColor: '#2196F3',
  },
  otherBubble: {
    backgroundColor: '#E0E0E0',
  },
  messageText: {
    color: '#000',
    fontSize: 14,
    lineHeight: 20,
  },
  ownText: {
    color: 'white',
  },
  deletedBubble: {
    backgroundColor: '#BDBDBD',
  },
  deletedText: {
    color: '#666',
    fontStyle: 'italic',
  },
  imageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  fileBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  readIcon: {
    marginLeft: 4,
  },
  deleteButton: {
    position: 'absolute',
    right: -30,
    top: 0,
    padding: 4,
  },
});
