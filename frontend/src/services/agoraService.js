/**
 * AgoraService - Stub for Expo Go compatibility
 * Full video/audio calls require a custom dev build (expo prebuild).
 * This stub keeps the app from crashing on import and logs a warning when
 * call methods are invoked.
 */

const UNSUPPORTED = (method) => {
  const msg = `[AgoraService] ${method}: video/audio calls are not available in Expo Go. Build a custom dev client to enable them.`;
  console.warn(msg);
  return Promise.resolve(null);
};

class AgoraService {
  constructor() {
    this.rtcEngine = null;
    this.channelName = '';
    this.isInitialized = false;
    this.currentQuality = 'good';
    this.networkQuality = 5;
    this.stats = {
      videoBitrate: 0,
      audioBitrate: 0,
      videoFrameRate: 0,
      audioPacketLossRate: 0,
      videoPacketLossRate: 0,
      rtt: 0,
      jitter: 0,
    };
  }

  async initialize() { return UNSUPPORTED('initialize'); }
  setupEventListeners() {}
  async joinChannel() { return UNSUPPORTED('joinChannel'); }
  async configureVideoForOptimalPerformance() { return UNSUPPORTED('configureVideoForOptimalPerformance'); }
  async optimizeForNetworkQuality() { return UNSUPPORTED('optimizeForNetworkQuality'); }
  updateQualityIndicator() {}
  async enableLocalVideo() { return UNSUPPORTED('enableLocalVideo'); }
  async enableLocalAudio() { return UNSUPPORTED('enableLocalAudio'); }
  async switchCamera() { return UNSUPPORTED('switchCamera'); }
  async setSpeaker() { return UNSUPPORTED('setSpeaker'); }
  async leaveChannel() { return UNSUPPORTED('leaveChannel'); }
  async destroy() { return UNSUPPORTED('destroy'); }

  getEngine() { return null; }
  getCallStats() {
    return { ...this.stats, quality: this.currentQuality, networkQuality: this.networkQuality };
  }
  getQualityIndicator() {
    return { quality: this.currentQuality, score: this.networkQuality, stats: this.stats };
  }
}

export default new AgoraService();
