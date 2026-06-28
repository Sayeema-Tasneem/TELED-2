import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import firstAidVideoService from '../services/firstAidVideoService';
import videoService from '../services/videoService';

const LEVEL_STYLES = {
  Critical: { backgroundColor: '#FEE4E2', color: '#B42318' },
  High: { backgroundColor: '#FFF4DB', color: '#9A6700' },
  Medium: { backgroundColor: '#E8F0FE', color: '#175CD3' },
};

const SECTION_COPY = {
  title: 'Primary Treatment Videos',
  subtitle: 'Curated YouTube links for first aid, organized by category so patients and doctors can find the right guidance fast.',
  search: 'Search burn, choking, snake bite...',
  all: 'All',
  featured: 'Featured guidance',
  library: 'Video library',
  open: 'Open YouTube',
  share: 'Share link',
  link: 'YouTube link',
  warnings: 'Important note',
  tips: 'Why this helps',
  noVideos: 'No videos match this search.',
  openEmergency: 'Open Emergency Help',
};

const groupVideosByCategory = (videos) =>
  videos.reduce((acc, video) => {
    const key = video.category || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(video);
    return acc;
  }, {});

const normalize = (value = '') => String(value).toLowerCase().trim();

const filterVideos = (videos, query, selectedCategory) => {
  const q = normalize(query);

  return videos.filter((video) => {
    const categoryMatch = selectedCategory === SECTION_COPY.all || video.category === selectedCategory;
    const haystack = normalize([
      video.title,
      video.description || video.summary,
      video.category,
      video.targetCondition,
      ...(video.tags || video.symptoms || []),
    ].join(' '));
    const queryMatch = !q || haystack.includes(q);
    return categoryMatch && queryMatch;
  });
};

const VideoCard = ({ video, onOpen, onShare, isSelected = false }) => {
  const levelStyle = LEVEL_STYLES[video.emergencyLevel] || LEVEL_STYLES.Medium;

  return (
    <TouchableOpacity style={[styles.videoCard, isSelected && styles.videoCardSelected]} activeOpacity={0.92} onPress={onOpen}>
      <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
      <View style={styles.videoContent}>
        <View style={styles.videoHeaderRow}>
          <View style={[styles.levelBadge, { backgroundColor: levelStyle.backgroundColor }]}>
            <Text style={[styles.levelBadgeText, { color: levelStyle.color }]}>{video.emergencyLevel}</Text>
          </View>
          <Text style={styles.categoryText}>{video.category}</Text>
        </View>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoSummary}>{video.summary}</Text>
        <View style={styles.videoMetaRow}>
          <Text style={styles.metaText}>{video.targetCondition}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{video.tags?.slice(0, 2).join(', ')}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onOpen}>
            <MaterialCommunityIcons name="youtube" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>{SECTION_COPY.open}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onShare}>
            <MaterialCommunityIcons name="share-variant" size={16} color="#1157C2" />
            <Text style={styles.secondaryButtonText}>{SECTION_COPY.share}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ title, subtitle, icon }) => (
  <View style={styles.sectionHeaderWrap}>
    <View style={styles.sectionHeaderIconWrap}>
      <MaterialCommunityIcons name={icon} size={20} color="#1157C2" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

export default function FirstAidVideosScreen({ navigation }) {
  // Static first aid videos
  const staticVideos = useMemo(() => firstAidVideoService.list(), []);
  const categories = useMemo(() => [SECTION_COPY.all, ...firstAidVideoService.getCategoryList()], []);
  const featuredVideos = useMemo(() => firstAidVideoService.getFeaturedVideos(), []);
  
  // Backend videos (user-uploaded and approved)
  const [backendVideos, setBackendVideos] = useState([]);
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(SECTION_COPY.all);
  
  // Combine static and backend videos
  const videos = useMemo(() => [...staticVideos, ...backendVideos], [staticVideos, backendVideos]);
  
  // Track search queries - even if no results found
  const trackSearch = (query, resultCount) => {
    if (query.trim()) {
      videoService.trackSearchQuery(query, resultCount);
      // Fire and forget - non-critical endpoint
      // Admin will see this search in analytics even if no videos found
    }
  };
  
  // Load backend videos
  useEffect(() => {
    const loadBackendVideos = async () => {
      try {
        const response = await videoService.getAllVideos();
        // Response structure: { count: X, videos: [...] }
        const allVideos = response?.videos || [];
        // Only show active videos to users
        const activeVideos = allVideos.filter(v => v.status === 'active');
        setBackendVideos(activeVideos);
      } catch (error) {
        console.log('Could not load backend videos:', error.message);
        setBackendVideos([]);
      }
    };
    loadBackendVideos();
  }, []);
  
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const filteredVideos = useMemo(() => {
    return filterVideos(videos, submittedSearchQuery, selectedCategory);
  }, [submittedSearchQuery, selectedCategory, videos]);

  const groupedVideos = useMemo(() => groupVideosByCategory(filteredVideos), [filteredVideos]);
  const hasSubmittedSearch = Boolean(submittedSearchQuery.trim());
  const hasSearchResults = filteredVideos.length > 0;
  const selectedVideo = useMemo(
    () => {
      if (hasSubmittedSearch && !hasSearchResults) return null;
      return filteredVideos.find((video) => video.id === selectedVideoId) || filteredVideos[0] || null;
    },
    [filteredVideos, hasSearchResults, hasSubmittedSearch, selectedVideoId]
  );
  
  // Initialize selectedVideoId when videos load
  useEffect(() => {
    if (!selectedVideoId && videos.length > 0) {
      setSelectedVideoId(featuredVideos[0]?.id || videos[0]?.id || null);
    }
  }, [videos.length]);

  const submitSearch = () => {
    const query = draftSearchQuery.trim();
    setSubmittedSearchQuery(query);
    setSelectedVideoId(null);

    if (query) {
      const results = filterVideos(videos, query, selectedCategory);
      trackSearch(query, results.length);
    }
  };

  const clearSearch = () => {
    setDraftSearchQuery('');
    setSubmittedSearchQuery('');
    setSelectedVideoId(null);
  };

  const stats = useMemo(() => ({
    total: videos.length,
    urgent: videos.filter((video) => video.emergencyLevel === 'Critical' || video.emergencyLevel === 'High').length,
    categories: categories.length - 1,
  }), [videos, categories.length]);

  const openYoutube = async (video) => {
    try {
      await Linking.openURL(video.youtubeUrl);
    } catch (error) {
      Alert.alert('Unable to open YouTube', 'Please try again in a moment.');
    }
  };

  const shareLink = async (video) => {
    try {
      await Share.share({
        message: `${video.title}\n${video.youtubeUrl}`,
        url: video.youtubeUrl,
      });
    } catch (error) {
      // user dismissed sharing
    }
  };

  const openEmergencyHelp = () => {
    navigation.navigate('EmergencyHelp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="play-box-multiple" size={28} color="#1157C2" />
            </View>
            <TouchableOpacity style={styles.emergencyChip} onPress={openEmergencyHelp}>
              <MaterialCommunityIcons name="alert-octagon" size={16} color="#D92D20" />
              <Text style={styles.emergencyChipText}>Emergency help</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroEyebrow}>Doctor-friendly video library</Text>
          <Text style={styles.heroTitle}>{SECTION_COPY.title}</Text>
          <Text style={styles.heroSubtitle}>{SECTION_COPY.subtitle}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Videos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.urgent}</Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.categories}</Text>
              <Text style={styles.statLabel}>Partitions</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={20} color="#667085" />
            <TextInput
              value={draftSearchQuery}
              onChangeText={setDraftSearchQuery}
              placeholder={SECTION_COPY.search}
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={submitSearch}
            />
            {draftSearchQuery ? (
              <TouchableOpacity onPress={clearSearch}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#98A2B3" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.searchButton, !draftSearchQuery.trim() && styles.searchButtonDisabled]}
              onPress={submitSearch}
              disabled={!draftSearchQuery.trim()}
            >
              <MaterialCommunityIcons name="magnify" size={16} color="#fff" />
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{category}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedVideo ? (
          <View style={styles.featuredCard}>
            <SectionHeader title={SECTION_COPY.featured} subtitle="Tap open to watch on YouTube with captions and playback controls." icon="star-circle-outline" />
            <VideoCard
              video={selectedVideo}
              isSelected
              onOpen={() => openYoutube(selectedVideo)}
              onShare={() => shareLink(selectedVideo)}
            />
            {/* Link row removed: use the primary Open YouTube button on the card instead of showing raw URL */}
          </View>
        ) : null}

        {!hasSubmittedSearch && featuredVideos.length > 0 ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Urgent picks" subtitle="High-priority guidance for common emergency situations." icon="alert-circle-outline" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
              {featuredVideos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.urgentCard}
                  onPress={() => {
                    setSelectedVideoId(video.id);
                    openYoutube(video);
                  }}
                >
                  <Image source={{ uri: video.thumbnailUrl }} style={styles.urgentThumb} />
                  <View style={styles.urgentBody}>
                    <Text style={styles.urgentTitle}>{video.title}</Text>
                    <Text style={styles.urgentSummary} numberOfLines={2}>{video.summary}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <SectionHeader title={SECTION_COPY.library} subtitle="Videos are grouped so each condition has its own clean section." icon="view-grid-outline" />

          {Object.entries(groupedVideos).length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="video-off-outline" size={40} color="#B42318" />
              <Text style={styles.emptyTitle}>
                {hasSubmittedSearch ? 'No Results Found' : SECTION_COPY.noVideos}
              </Text>
              {hasSubmittedSearch && (
                <>
                  <Text style={styles.emptySubtext}>
                    We couldn't find any videos for "{submittedSearchQuery}"
                  </Text>
                  <View style={styles.emptyActionBox}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                    <Text style={styles.emptyAction}>
                      Our admin team has been notified. They'll review your search request and upload relevant videos soon!
                    </Text>
                  </View>
                </>
              )}
            </View>
          ) : (
            Object.entries(groupedVideos).map(([category, categoryVideos]) => (
              <View key={category} style={styles.partitionCard}>
                <View style={styles.partitionHeader}>
                  <Text style={styles.partitionTitle}>{category}</Text>
                  <View style={styles.partitionCountPill}>
                    <Text style={styles.partitionCountText}>{categoryVideos.length}</Text>
                  </View>
                </View>

                {categoryVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isSelected={video.id === selectedVideo?.id}
                    onOpen={() => {
                      setSelectedVideoId(video.id);
                      openYoutube(video);
                    }}
                    onShare={() => shareLink(video)}
                  />
                ))}
              </View>
            ))
          )}
        </View>

        {selectedVideo ? (
          <View style={styles.infoCard}>
            <SectionHeader title={SECTION_COPY.warnings} subtitle="Use the link as guidance only — emergency care should still be called when needed." icon="shield-alert-outline" />
            <Text style={styles.infoText}>{selectedVideo.warning}</Text>
            <Text style={styles.infoSubtext}>
              Video topic: {selectedVideo.targetCondition}
            </Text>
          </View>
        ) : null}

        {selectedVideo ? (
          <View style={styles.infoCard}>
            <SectionHeader title={SECTION_COPY.tips} subtitle="What this video is meant to support." icon="help-circle-outline" />
            {selectedVideo.do?.slice(0, 3).map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FF',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF4DB',
    borderColor: '#FFD27D',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emergencyChipText: {
    color: '#9A6700',
    fontWeight: '800',
    fontSize: 12,
  },
  heroEyebrow: {
    color: '#175CD3',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#101828',
  },
  heroSubtitle: {
    color: '#475467',
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1157C2',
  },
  statLabel: {
    marginTop: 4,
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#101828',
    fontWeight: '600',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1157C2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchButtonDisabled: {
    backgroundColor: '#98A2B3',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  chipsRow: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
  },
  categoryChipActive: {
    backgroundColor: '#1157C2',
  },
  categoryChipText: {
    color: '#344054',
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  featuredCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 16,
    gap: 12,
  },
  sectionBlock: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 16,
    gap: 12,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#101828',
  },
  sectionHeaderSubtitle: {
    color: '#667085',
    marginTop: 2,
    lineHeight: 19,
  },
  horizontalCards: {
    gap: 12,
    paddingVertical: 2,
  },
  urgentCard: {
    width: 240,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    overflow: 'hidden',
  },
  urgentThumb: {
    width: '100%',
    height: 130,
    backgroundColor: '#EEF2FF',
  },
  urgentBody: {
    padding: 12,
    gap: 6,
  },
  urgentTitle: {
    color: '#101828',
    fontWeight: '900',
    fontSize: 14,
  },
  urgentSummary: {
    color: '#667085',
    lineHeight: 19,
    fontSize: 12,
  },
  partitionCard: {
    gap: 10,
    marginTop: 4,
  },
  partitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partitionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#101828',
  },
  partitionCountPill: {
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  partitionCountText: {
    color: '#1157C2',
    fontWeight: '800',
    fontSize: 12,
  },
  videoCard: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FAFBFF',
    marginTop: 10,
  },
  videoCardSelected: {
    borderColor: '#1157C2',
    backgroundColor: '#EEF4FF',
  },
  thumbnail: {
    width: 112,
    backgroundColor: '#D6E4FF',
  },
  videoContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  videoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
    textAlign: 'right',
  },
  videoTitle: {
    color: '#101828',
    fontWeight: '900',
    fontSize: 15,
  },
  videoSummary: {
    color: '#475467',
    lineHeight: 19,
    fontSize: 12,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '600',
  },
  metaDot: {
    color: '#98A2B3',
    fontSize: 11,
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D92D20',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#1157C2',
    fontWeight: '800',
    fontSize: 12,
  },
  
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 16,
    gap: 10,
  },
  infoText: {
    color: '#344054',
    lineHeight: 21,
  },
  infoSubtext: {
    color: '#667085',
    fontWeight: '700',
    fontSize: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: 18,
    color: '#1157C2',
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    color: '#344054',
    lineHeight: 21,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    color: '#B42318',
    fontWeight: '900',
    fontSize: 18,
  },
  emptySubtext: {
    color: '#667085',
    fontSize: 14,
    maxWidth: 300,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  emptyAction: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
});
