/**
 * Browser compatibility checks for audio recording and playback features
 */

export interface BrowserCompatibility {
  mediaRecorder: boolean;
  audioContext: boolean;
  getUserMedia: boolean;
  audioPlayback: boolean;
  isSupported: boolean;
  unsupportedFeatures: string[];
  recommendedBrowser?: string;
}

export function checkBrowserCompatibility(): BrowserCompatibility {
  const unsupportedFeatures: string[] = [];
  let recommendedBrowser: string | undefined;

  // Check MediaRecorder API
  const mediaRecorder = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported !== undefined;
  if (!mediaRecorder) {
    unsupportedFeatures.push('Audio Recording (MediaRecorder API)');
  }

  // Check AudioContext (handle both standard and webkit prefix)
  const audioContext = 
    typeof AudioContext !== 'undefined' || 
    typeof (window as any).webkitAudioContext !== 'undefined';
  if (!audioContext) {
    unsupportedFeatures.push('Audio Processing (AudioContext API)');
  }

  // Check getUserMedia (handle both standard and legacy)
  const getUserMedia = !!(
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
    ((navigator as any).getUserMedia) ||
    ((navigator as any).webkitGetUserMedia) ||
    ((navigator as any).mozGetUserMedia)
  );
  if (!getUserMedia) {
    unsupportedFeatures.push('Microphone Access (getUserMedia API)');
  }

  // Check audio playback (HTML5 Audio)
  const audioPlayback = typeof HTMLAudioElement !== 'undefined';
  if (!audioPlayback) {
    unsupportedFeatures.push('Audio Playback (HTML5 Audio)');
  }

  // Detect browser and provide recommendations
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edg|opr/.test(userAgent);
  const isFirefox = /firefox|fxios/.test(userAgent);
  const isEdge = /edg/.test(userAgent);

  // Check iOS Safari version (MediaRecorder requires iOS 14.3+)
  if (isIOS && isSafari) {
    const iosVersionMatch = userAgent.match(/os (\d+)_(\d+)/);
    if (iosVersionMatch) {
      const major = parseInt(iosVersionMatch[1], 10);
      const minor = parseInt(iosVersionMatch[2], 10);
      if (major < 14 || (major === 14 && minor < 3)) {
        unsupportedFeatures.push('iOS Safari version too old (requires iOS 14.3+)');
        recommendedBrowser = 'Please update to iOS 14.3 or later, or use Chrome on iOS';
      }
    }
  }

  // Check if MediaRecorder is supported but no codecs work
  if (mediaRecorder) {
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    const hasSupportedType = supportedTypes.some(type => MediaRecorder.isTypeSupported(type));
    if (!hasSupportedType) {
      unsupportedFeatures.push('No supported audio recording formats');
      if (isIOS) {
        recommendedBrowser = 'iOS Safari has limited MediaRecorder support. Try Chrome or Firefox on iOS.';
      }
    }
  }

  const isSupported = unsupportedFeatures.length === 0;

  return {
    mediaRecorder,
    audioContext,
    getUserMedia,
    audioPlayback,
    isSupported,
    unsupportedFeatures,
    recommendedBrowser,
  };
}

export function getBrowserInfo(): { name: string; version?: string; isMobile: boolean } {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android/.test(userAgent);

  if (/chrome/.test(userAgent) && !/edg|opr/.test(userAgent)) {
    const match = userAgent.match(/chrome\/(\d+)/);
    return {
      name: 'Chrome',
      version: match ? match[1] : undefined,
      isMobile,
    };
  }
  if (/safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)) {
    const match = userAgent.match(/version\/(\d+)/);
    return {
      name: 'Safari',
      version: match ? match[1] : undefined,
      isMobile,
    };
  }
  if (/firefox|fxios/.test(userAgent)) {
    const match = userAgent.match(/firefox\/(\d+)/);
    return {
      name: 'Firefox',
      version: match ? match[1] : undefined,
      isMobile,
    };
  }
  if (/edg/.test(userAgent)) {
    const match = userAgent.match(/edg\/(\d+)/);
    return {
      name: 'Edge',
      version: match ? match[1] : undefined,
      isMobile,
    };
  }

  return {
    name: 'Unknown',
    isMobile,
  };
}

