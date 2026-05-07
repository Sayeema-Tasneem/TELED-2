import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const VIDEO_LIBRARY = [
  {
    id: 'snake-bite',
    title: 'Snake Bite First Aid',
    category: 'Emergency',
    emergencyLevel: 'Critical',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
    downloadName: 'snake-bite-first-aid.mp4',
    summary: 'Stay calm, keep the person still, remove rings/tight items, and rush to the hospital immediately.',
    do: [
      'Keep the patient calm and still.',
      'Immobilize the bitten limb below heart level if possible.',
      'Get emergency medical help immediately.',
    ],
    dont: [
      'Do not cut, suck, or squeeze the bite.',
      'Do not apply ice, a tourniquet, or chemicals.',
      'Do not let the patient walk around unnecessarily.',
    ],
    warning: 'Snake bites can become life-threatening fast. This video is for first aid only — go to a hospital immediately.',
  },
  {
    id: 'leech-bite',
    title: 'Leech Bite Care',
    category: 'Bites',
    emergencyLevel: 'Medium',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    downloadName: 'leech-bite-care.mp4',
    summary: 'Detach the leech safely, clean the wound, and watch for prolonged bleeding or infection.',
    do: [
      'Wash hands and clean the area with clean water.',
      'Let the leech release naturally or gently detach it from the head end.',
      'Apply gentle pressure if there is bleeding and seek help if bleeding continues.',
    ],
    dont: [
      'Do not yank the leech off forcefully.',
      'Do not use salt, heat, or chemicals directly on the skin.',
      'Do not scratch the wound.',
    ],
    warning: 'If the wound keeps bleeding, swells, or shows signs of infection, get medical help.',
  },
  {
    id: 'burns',
    title: 'Burns First Aid',
    category: 'Emergency',
    emergencyLevel: 'High',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
    downloadName: 'burns-first-aid.mp4',
    summary: 'Cool the burn with running water, remove tight items, and cover with a clean cloth.',
    do: [
      'Cool the area under cool running water for 20 minutes.',
      'Remove rings, watches, or tight clothing near the burn.',
      'Cover with a sterile non-stick dressing or clean cloth.',
    ],
    dont: [
      'Do not apply toothpaste, butter, oil, or ice directly.',
      'Do not pop blisters.',
      'Do not peel stuck clothing off the burn.',
    ],
    warning: 'For large, deep, facial, or electrical burns, seek emergency care immediately.',
  },
  {
    id: 'bleeding-cuts',
    title: 'Cuts and Bleeding',
    category: 'Wounds',
    emergencyLevel: 'High',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-20s.mp4',
    downloadName: 'cuts-and-bleeding.mp4',
    summary: 'Apply firm pressure, raise the wound if possible, and keep it clean until help arrives.',
    do: [
      'Apply direct pressure using clean cloth or gauze.',
      'Raise the injured area if it does not cause more pain.',
      'Seek urgent care if bleeding is heavy or not stopping.',
    ],
    dont: [
      'Do not keep lifting the cloth to check every few seconds.',
      'Do not remove deeply embedded objects.',
      'Do not ignore signs of shock or fainting.',
    ],
    warning: 'If blood soaks through cloth quickly or the wound is deep, call emergency services.',
  },
  {
    id: 'choking',
    title: 'Choking Response',
    category: 'Emergency',
    emergencyLevel: 'Critical',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-30s.mp4',
    downloadName: 'choking-response.mp4',
    summary: 'If the person cannot speak or breathe, get emergency help and start first-response measures immediately.',
    do: [
      'Ask the person to cough if they can speak.',
      'Call emergency help if breathing is blocked.',
      'Use approved first-aid technique if you are trained to do so.',
    ],
    dont: [
      'Do not put fingers blindly into the mouth.',
      'Do not give water or food.',
      'Do not wait if the person is turning blue or cannot breathe.',
    ],
    warning: 'Choking is an emergency. If the airway is blocked, act immediately.',
  },
  {
    id: 'dehydration',
    title: 'Dehydration Support',
    category: 'General Care',
    emergencyLevel: 'Medium',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-60s.mp4',
    downloadName: 'dehydration-support.mp4',
    summary: 'Give small sips of water or ORS, rest the person, and watch for dizziness or weakness.',
    do: [
      'Offer small, frequent sips of clean water or ORS.',
      'Keep the person in a cool place and allow rest.',
      'Monitor for confusion, fainting, or no urination.',
    ],
    dont: [
      'Do not force large amounts of fluid at once.',
      'Do not ignore signs of severe weakness or confusion.',
      'Do not delay medical care if vomiting continues.',
    ],
    warning: 'Severe dehydration needs medical attention, especially in children or elderly patients.',
  },
];

const sanitizeFilename = (value) => String(value || 'video')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'video';

const ensureDirectory = async () => {
  const directory = `${FileSystem.documentDirectory}first-aid-videos/`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
  return directory;
};

const getLocalVideoPath = async (video) => {
  const directory = await ensureDirectory();
  const filename = video?.downloadName || `${sanitizeFilename(video?.id || video?.title)}.mp4`;
  return `${directory}${filename}`;
};

const hasDownloadedVideo = async (video) => {
  try {
    const localPath = await getLocalVideoPath(video);
    const info = await FileSystem.getInfoAsync(localPath);
    return info.exists ? localPath : null;
  } catch (error) {
    return null;
  }
};

const resolvePlaybackUri = async (video) => {
  if (!video?.videoUrl) {
    return null;
  }

  const localPath = await hasDownloadedVideo(video);
  return localPath || video.videoUrl;
};

const getLocalVideoUri = async (video) => {
  const destination = await getLocalVideoPath(video);
  const info = await FileSystem.getInfoAsync(destination);

  if (info.exists) {
    return destination;
  }

  const result = await FileSystem.downloadAsync(video.videoUrl, destination);
  return result.uri;
};

const downloadVideo = async (video) => {
  if (!video?.videoUrl) {
    throw new Error('Video URL not available');
  }

  const localUri = await getLocalVideoUri(video);
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(localUri, {
      mimeType: 'video/mp4',
      dialogTitle: video.title || 'Download video',
      UTI: 'public.mpeg-4',
    });
  }

  return localUri;
};

const firstAidVideoService = {
  list: () => [...VIDEO_LIBRARY],
  getById: (id) => VIDEO_LIBRARY.find((item) => item.id === id) || null,
  downloadVideo,
  getLocalVideoUri,
  getLocalVideoPath,
  hasDownloadedVideo,
  resolvePlaybackUri,
};

export default firstAidVideoService;
export { VIDEO_LIBRARY };
