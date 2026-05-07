const normalizeLanguageCode = (language) => {
  const normalized = String(language || '').trim().toLowerCase();
  if (normalized.startsWith('hi')) return 'hi';
  if (normalized.startsWith('kn')) return 'kn';
  return 'en';
};

const createServiceError = (message, { statusCode = 500, code } = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const transcribeAudioBuffer = async ({
  audioBuffer,
  filename = `voice-${Date.now()}.m4a`,
  mimetype = 'audio/m4a',
  language = 'en',
  prompt,
}) => {
  void normalizeLanguageCode(language);
  void audioBuffer;
  void filename;
  void mimetype;
  void prompt;

  throw createServiceError(
    'Cloud voice transcription is disabled. Use on-device speech recognition instead.',
    { statusCode: 501, code: 'VOICE_TRANSCRIPTION_DISABLED' }
  );
};

module.exports = {
  transcribeAudioBuffer,
};
