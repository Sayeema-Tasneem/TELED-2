// Admin Video Upload Dashboard Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import VideoService from '../services/videoService';

const AdminVideoUploadScreen = ({ route, theme = {} }) => {
  const colors = theme.colors || {};
  const [tab, setTab] = useState('upload'); // upload, pending, analytics
  const [loading, setLoading] = useState(false);

  // Upload form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Emergency',
    symptoms: '',
    videoUrl: '',
    duration: '',
    thumbnailUrl: '',
    tags: '',
    steps: '',
    dos: '',
    donts: '',
    warnings: '',
  });

  const [pendingVideos, setPendingVideos] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [token] = useState(route?.params?.token || '');

  useEffect(() => {
    fetchAnalytics();
    fetchPendingVideos();
  }, []);

  useEffect(() => {
    if (tab === 'pending') {
      fetchPendingVideos();
    } else if (tab === 'analytics') {
      fetchAnalytics();
    }
  }, [tab]);

  const fetchPendingVideos = async () => {
    try {
      setLoading(true);
      const data = await VideoService.getPendingVideos(token);
      setPendingVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (error) {
      console.log('Pending videos fetch error:', error.message);
      setPendingVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await VideoService.getAnalytics(token);
      // Ensure data has proper structure with defaults
      const analyticsData = {
        statistics: {
          totalVideos: data?.statistics?.totalVideos || 0,
          activeVideos: data?.statistics?.activeVideos || 0,
          pendingApproval: data?.statistics?.pendingApproval || 0,
          totalSearches: data?.statistics?.totalSearches || 0,
          successfulSearches: data?.statistics?.successfulSearches || 0,
          failedSearches: data?.statistics?.failedSearches || 0,
        },
        searchGaps: Array.isArray(data?.searchGaps) ? data.searchGaps : [],
        topSearches: Array.isArray(data?.topSearches) ? data.topSearches : [],
        message: data?.message || 'Analytics loaded',
      };
      setAnalytics(analyticsData);
    } catch (error) {
      console.log('Analytics fetch error:', error.message);
      // Set empty analytics instead of error
      setAnalytics({
        statistics: {
          totalVideos: 0,
          activeVideos: 0,
          pendingApproval: 0,
          totalSearches: 0,
          successfulSearches: 0,
          failedSearches: 0,
        },
        searchGaps: [],
        topSearches: [],
        message: 'Unable to load analytics',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUploadVideo = async () => {
    // Validate required fields
    if (
      !formData.title ||
      !formData.description ||
      !formData.videoUrl ||
      !formData.duration ||
      !formData.symptoms
    ) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const uploadData = {
        ...formData,
        duration: parseInt(formData.duration),
        symptoms: formData.symptoms.split(',').map((s) => s.trim()),
        tags: formData.tags.split(',').map((t) => t.trim()),
        steps: formData.steps.split('\n').map((s) => s.trim()),
        dos: formData.dos.split('\n').map((d) => d.trim()),
        donts: formData.donts.split('\n').map((d) => d.trim()),
        warnings: formData.warnings.split('\n').map((w) => w.trim()),
      };

      const result = await VideoService.uploadVideo(uploadData, token);
      Alert.alert('Success', result.message || 'Video uploaded successfully');
      fetchAnalytics();

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'Emergency',
        symptoms: '',
        videoUrl: '',
        duration: '',
        thumbnailUrl: '',
        tags: '',
        steps: '',
        dos: '',
        donts: '',
        warnings: '',
      });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVideo = async (videoId) => {
    try {
      setLoading(true);
      await VideoService.approveVideo(videoId, 'Approved', token);
      Alert.alert('✓ Success', 'Video approved and published');
      fetchPendingVideos();
      fetchAnalytics();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      if (error.response?.status === 404) {
        Alert.alert('Not Found', 'This video no longer exists');
      } else {
        Alert.alert('Error', errorMsg || 'Could not approve video');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRejectVideo = async (videoId) => {
    try {
      setLoading(true);
      await VideoService.rejectVideo(videoId, 'Admin rejected', token);
      Alert.alert('✓ Rejected', 'Video has been rejected');
      fetchPendingVideos();
      fetchAnalytics();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      if (error.response?.status === 404) {
        Alert.alert('Not Found', 'This video no longer exists');
      } else {
        Alert.alert('Error', errorMsg || 'Could not reject video');
      }
    } finally {
      setLoading(false);
    }
  };

  const missedSearchCount = analytics?.statistics?.failedSearches || 0;
  const searchGapCount = analytics?.searchGaps?.length || 0;
  const latestGap = analytics?.searchGaps?.[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#f5f5f5' }]}>
      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.primary || '#007AFF' }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upload' && styles.activeTab]}
          onPress={() => setTab('upload')}
        >
          <MaterialIcons name="upload" size={20} color={tab === 'upload' ? 'white' : '#666'} />
          <Text style={[styles.tabText, tab === 'upload' && styles.activeTabText]}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'pending' && styles.activeTab]}
          onPress={() => setTab('pending')}
        >
          <MaterialIcons name="pending-actions" size={20} color={tab === 'pending' ? 'white' : '#666'} />
          <Text style={[styles.tabText, tab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'analytics' && styles.activeTab]}
          onPress={() => setTab('analytics')}
        >
          <MaterialIcons name="analytics" size={20} color={tab === 'analytics' ? 'white' : '#666'} />
          <Text style={[styles.tabText, tab === 'analytics' && styles.activeTabText]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary || '#007AFF'} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {searchGapCount > 0 && (
            <TouchableOpacity
              style={styles.notificationCard}
              activeOpacity={0.9}
              onPress={() => setTab('analytics')}
            >
              <View style={styles.notificationIcon}>
                <MaterialIcons name="notifications-active" size={22} color="#B42318" />
              </View>
              <View style={styles.notificationBody}>
                <Text style={styles.notificationTitle}>
                  {searchGapCount} missing video request{searchGapCount === 1 ? '' : 's'}
                </Text>
                <Text style={styles.notificationText}>
                  Users searched and found no video. Top request: "{latestGap?.query}" ({latestGap?.count} search{latestGap?.count === 1 ? '' : 'es'}).
                </Text>
              </View>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{missedSearchCount}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* UPLOAD TAB */}
          {tab === 'upload' && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>📹 Upload New Treatment Video</Text>

              <InputField
                label="Title *"
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="e.g., CPR Technique"
              />

              <InputField
                label="Description *"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Detailed description of the treatment"
                multiline
              />

              <InputField
                label="Category"
                value={formData.category}
                onChangeText={(text) => handleInputChange('category', text)}
                placeholder="Emergency, FirstAid, etc."
              />

              <InputField
                label="Symptoms (comma-separated) *"
                value={formData.symptoms}
                onChangeText={(text) => handleInputChange('symptoms', text)}
                placeholder="chest pain, unconscious, no pulse"
              />

              <InputField
                label="Video URL *"
                value={formData.videoUrl}
                onChangeText={(text) => handleInputChange('videoUrl', text)}
                placeholder="https://example.com/video.mp4"
              />

              <InputField
                label="Duration (seconds) *"
                value={formData.duration}
                onChangeText={(text) => handleInputChange('duration', text)}
                placeholder="180"
                keyboardType="numeric"
              />

              <InputField
                label="Thumbnail URL"
                value={formData.thumbnailUrl}
                onChangeText={(text) => handleInputChange('thumbnailUrl', text)}
                placeholder="https://example.com/thumbnail.jpg"
              />

              <InputField
                label="Tags (comma-separated)"
                value={formData.tags}
                onChangeText={(text) => handleInputChange('tags', text)}
                placeholder="first-aid, emergency, life-saving"
              />

              <InputField
                label="Steps (one per line)"
                value={formData.steps}
                onChangeText={(text) => handleInputChange('steps', text)}
                placeholder="Step 1&#10;Step 2&#10;Step 3"
                multiline
              />

              <InputField
                label="Do's (one per line)"
                value={formData.dos}
                onChangeText={(text) => handleInputChange('dos', text)}
                placeholder="Do this&#10;Do that"
                multiline
              />

              <InputField
                label="Don'ts (one per line)"
                value={formData.donts}
                onChangeText={(text) => handleInputChange('donts', text)}
                placeholder="Avoid this&#10;Don't do that"
                multiline
              />

              <InputField
                label="Warnings (one per line)"
                value={formData.warnings}
                onChangeText={(text) => handleInputChange('warnings', text)}
                placeholder="Medical warning 1&#10;Medical warning 2"
                multiline
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary || '#007AFF' }]}
                onPress={handleUploadVideo}
                disabled={loading}
              >
                <MaterialIcons name="upload" size={20} color="white" />
                <Text style={styles.buttonText}>Upload Video</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PENDING VIDEOS TAB */}
          {tab === 'pending' && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>⏳ Pending Approval ({pendingVideos.length})</Text>

              {pendingVideos.length === 0 ? (
                <Text style={styles.emptyText}>No pending videos</Text>
              ) : (
                <FlatList
                  data={pendingVideos}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.videoCard}>
                      <Text style={styles.videoTitle}>{item.title}</Text>
                      <Text style={styles.videoDescription}>{item.description}</Text>
                      <Text style={styles.videoMeta}>Category: {item.category}</Text>
                      <Text style={styles.videoMeta}>
                        Symptoms: {item.symptoms.join(', ')}
                      </Text>
                      <Text style={styles.videoMeta}>
                        Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
                      </Text>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleApproveVideo(item.id)}
                        >
                          <MaterialIcons name="check-circle" size={20} color="white" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleRejectVideo(item.id)}
                        >
                          <MaterialIcons name="cancel" size={20} color="white" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {/* ANALYTICS TAB */}
          {tab === 'analytics' && analytics && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>📊 Search Analytics & Demand</Text>

              {/* Statistics */}
              <View style={styles.statsContainer}>
                <StatCard label="Total Videos" value={analytics.statistics.totalVideos} />
                <StatCard label="Active Videos" value={analytics.statistics.activeVideos} />
                <StatCard label="Pending Approval" value={analytics.statistics.pendingApproval} />
              </View>

              <View style={styles.statsContainer}>
                <StatCard label="Total Searches" value={analytics.statistics.totalSearches} />
                <StatCard label="Successful" value={analytics.statistics.successfulSearches} />
                <StatCard label="Failed" value={analytics.statistics.failedSearches} />
              </View>

              {/* Search Gaps with Demand Analysis */}
              {analytics.searchGaps && analytics.searchGaps.length > 0 && (
                <View>
                  <Text style={styles.subTitle}>🔍 Videos Users Are Searching For (But Missing)</Text>
                  <Text style={styles.analyticDescription}>
                    These treatments were searched for but no video exists. Upload them to help users!
                  </Text>
                  
                  {analytics.searchGaps.map((gap, index) => {
                    const demandLevel = gap.count > 5 ? 'HIGH' : gap.count > 2 ? 'MEDIUM' : 'LOW';
                    const demandColor = gap.count > 5 ? '#DC2626' : gap.count > 2 ? '#F59E0B' : '#10B981';
                    const demandEmoji = gap.count > 5 ? '🔴' : gap.count > 2 ? '🟠' : '🟢';
                    const searchText = gap.count === 1 ? 'person' : 'people';
                    
                    return (
                      <View
                        key={index}
                        style={[
                          styles.gapCard,
                          gap.priority === 'high'
                            ? styles.gapHigh
                            : gap.priority === 'medium'
                            ? styles.gapMedium
                            : styles.gapLow,
                        ]}
                      >
                        <View style={styles.gapHeader}>
                          <Text style={styles.gapQuery}>"{gap.query}"</Text>
                          <View style={[styles.demandBadge, { backgroundColor: demandColor }]}>
                            <Text style={styles.demandBadgeText}>{demandEmoji} {demandLevel}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.gapStats}>
                          {gap.count} {searchText} searched for this treatment
                        </Text>
                        
                        {gap.count > 5 && (
                          <Text style={styles.recommendation}>
                            ⚡ HIGH DEMAND - Users urgently need this video. Prioritize uploading!
                          </Text>
                        )}
                        {gap.count > 2 && gap.count <= 5 && (
                          <Text style={styles.recommendation}>
                            📌 MEDIUM DEMAND - Multiple users looking for this content.
                          </Text>
                        )}
                        {gap.count <= 2 && (
                          <Text style={styles.recommendation}>
                            💡 LOW DEMAND - A few users interested. Consider if relevant.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Top Searches - What's Popular */}
              {analytics.topSearches && analytics.topSearches.length > 0 && (
                <View style={styles.topSearchesSection}>
                  <Text style={styles.subTitle}>🔥 Most Popular Search Topics</Text>
                  <Text style={styles.analyticDescription}>
                    Videos that users search for most often. Ensure these are available.
                  </Text>
                  {analytics.topSearches.map((search, index) => (
                    <View key={index} style={styles.topSearchCard}>
                      <View style={styles.topSearchRank}>
                        <Text style={styles.topSearchRankNum}>#{index + 1}</Text>
                      </View>
                      <View style={styles.topSearchInfo}>
                        <Text style={styles.topSearchQuery}>{search.query}</Text>
                        <Text style={styles.topSearchCount}>{search.count} searches</Text>
                      </View>
                      {search.count > 5 && (
                        <View style={styles.trending}>
                          <Text style={styles.trendingText}>📈 Trending</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {analytics.searchGaps.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>✅ All Clear!</Text>
                  <Text style={styles.emptyStateText}>
                    No search gaps detected. Your video library is meeting user demands!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

// Input Field Component
const InputField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#999"
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      keyboardType={keyboardType}
    />
  </View>
);

// Statistics Card Component
const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FEE4E2',
    borderLeftWidth: 4,
    borderLeftColor: '#D92D20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE4E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    color: '#7A271A',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  notificationText: {
    color: '#912018',
    fontSize: 12,
    lineHeight: 17,
  },
  notificationBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D92D20',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#555',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  videoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  videoMeta: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  gapCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  gapHigh: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#ff9800',
  },
  gapMedium: {
    backgroundColor: '#f3e5f5',
    borderLeftColor: '#9c27b0',
  },
  gapLow: {
    backgroundColor: '#e8f5e9',
    borderLeftColor: '#4caf50',
  },
  gapQuery: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gapCount: {
    fontSize: 11,
    color: '#666',
  },
  topSearchCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  topSearchQuery: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  topSearchCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  // New styles for enhanced analytics
  analyticDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  gapStats: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recommendation: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  topSearchesSection: {
    marginTop: 24,
  },
  topSearchRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topSearchRankNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  topSearchInfo: {
    flex: 1,
  },
  trending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});

export default AdminVideoUploadScreen;
