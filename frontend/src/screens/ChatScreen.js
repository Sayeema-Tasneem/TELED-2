/**
 * Chat Screen - Real-time messaging interface
 * Displays messages, allows sending texts and uploading files
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import chatService from '../services/chatService';
import MessageBubble from '../components/MessageBubble';
import languageService from '../services/languageService';

const t = (key, defaultValue = '') => languageService.t(key, defaultValue);

export default function ChatScreen({ route, navigation }) {
  const { appointment, sessionData } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize chat session
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const result = await chatService.createOrGetSession(sessionData);
        setChatSession(result.session);

        // Load messages
        await loadMessages(result.session.id);

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to initialize chat');
        navigation.goBack();
      }
    };

    initializeChat();
  }, []);

  // Load messages from chat session
  const loadMessages = async (sessionId) => {
    try {
      const result = await chatService.getMessages(sessionId, 50, 0);
      setMessages(result.messages);
      
      // Mark messages as read
      await chatService.markAllAsRead(sessionId, sessionData.userOneId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      // Send message
      const messageResult = await chatService.sendMessage(chatSession.id, {
        senderId: sessionData.userOneId,
        senderName: sessionData.userOneName,
        senderRole: sessionData.userOneRole,
        content: newMessage,
        messageType: 'text',
      });

      setMessages([...messages, messageResult.message]);
      setNewMessage('');

      // Stop typing indicator
      await chatService.updateTypingStatus(chatSession.id, sessionData.userOneId, false);
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = async (text) => {
    setNewMessage(text);

    // Update typing status
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      await chatService.updateTypingStatus(chatSession.id, sessionData.userOneId, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await chatService.updateTypingStatus(chatSession.id, sessionData.userOneId, false);
    }, 3000);
  };

  const handlePickImage = async () => {
    Alert.alert('Image upload unavailable', 'Gallery image upload is disabled in this build. Please send text only for now.');
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await chatService.deleteMessage(messageId);
            // Remove from local state
            setMessages(messages.map((msg) =>
              msg.id === messageId ? { ...msg, messageType: 'deleted', content: '[Message deleted]' } : msg
            ));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete message');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{appointment.doctorName}</Text>
          <Text style={styles.headerSubtitle}>{appointment.doctorSpecialization}</Text>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <MaterialCommunityIcons name="information-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={scrollViewRef}
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === sessionData.userOneId}
            onDelete={handleDeleteMessage}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing indicator */}
      {otherUserTyping && (
        <View style={styles.typingIndicator}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, styles.typingDot2]} />
          <View style={[styles.typingDot, styles.typingDot3]} />
        </View>
      )}

      <TouchableOpacity style={styles.footerBackButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.footerBackButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handlePickImage}
          >
            <MaterialCommunityIcons name="paperclip" size={24} color="#2196F3" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialCommunityIcons name="send" size={22} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerSpacer: {
    width: 40,
  },
  footerBackButton: {
    marginHorizontal: 12,
    marginTop: 8,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBackButtonText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '800',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  messagesContainer: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCC',
    marginHorizontal: 4,
  },
  typingDot2: {
    backgroundColor: '#AAA',
  },
  typingDot3: {
    backgroundColor: '#888',
  },
  imagePreviewContainer: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: '#FF5252',
    borderRadius: 12,
    padding: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    maxHeight: 100,
    fontSize: 14,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
