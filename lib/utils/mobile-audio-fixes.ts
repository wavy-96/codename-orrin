/**
 * Mobile-specific audio fixes and utilities
 */

type AudioContextState = 'suspended' | 'running' | 'closed' | 'interrupted';

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if device is Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Get the best audio format for MediaRecorder on the current device
 * iOS Safari has very limited MediaRecorder support
 */
export function getBestAudioFormat(): string | null {
  // iOS Safari prefers MP4/AAC
  if (isIOS()) {
    const iosFormats = [
      'audio/mp4',           // Best for iOS
      'audio/m4a',           // Alternative for iOS
      'audio/aac',           // iOS native
      'audio/webm',          // Fallback
    ];
    
    for (const format of iosFormats) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(format)) {
        console.log(`[Mobile Audio] iOS - Using format: ${format}`);
        return format;
      }
    }
  }
  
  // Android/Desktop prefers WebM
  const formats = [
    'audio/webm;codecs=opus',  // Best quality, widely supported
    'audio/webm',               // Fallback WebM
    'audio/ogg;codecs=opus',    // Alternative
    'audio/mp4',                // Fallback
    'audio/wav',                // Last resort
  ];
  
  for (const format of formats) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(format)) {
      console.log(`[Mobile Audio] Using format: ${format}`);
      return format;
    }
  }
  
  return null;
}

/**
 * Resume AudioContext with retry logic for mobile
 */
export async function resumeAudioContext(audioContext: AudioContext, maxRetries = 3): Promise<boolean> {
  // AudioContext is already running, no need to resume
  if (audioContext.state === 'running') {
    return true;
  }
  
  // AudioContext is closed, cannot resume
  if (audioContext.state === 'closed') {
    console.warn('[Mobile Audio] AudioContext is closed, cannot resume');
    return false;
  }
  
  // AudioContext is suspended or interrupted - try to resume
  for (let i = 0; i < maxRetries; i++) {
    try {
      await audioContext.resume();
      // Check state after resume (state can change to 'running' after resume)
      // Use type assertion since TypeScript doesn't know resume() can change the state
      const currentState = audioContext.state as AudioContextState;
      if (currentState === 'running') {
        console.log(`[Mobile Audio] AudioContext resumed successfully (attempt ${i + 1})`);
        return true;
      }
      // If still suspended/interrupted, wait and retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    } catch (error) {
      console.warn(`[Mobile Audio] AudioContext resume attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  }
  
  console.error('[Mobile Audio] Failed to resume AudioContext after all retries');
  return false;
}

/**
 * Check if media stream tracks are still active
 */
export function areTracksActive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  
  const tracks = stream.getTracks();
  if (tracks.length === 0) return false;
  
  const activeTracks = tracks.filter(track => track.readyState === 'live');
  return activeTracks.length > 0;
}

/**
 * Reinitialize media stream if tracks are inactive (common on mobile after backgrounding)
 */
export async function ensureActiveStream(
  currentStream: MediaStream | null,
  getUserMedia: () => Promise<MediaStream>
): Promise<MediaStream | null> {
  // Check if current stream is still active
  if (currentStream && areTracksActive(currentStream)) {
    return currentStream;
  }
  
  // Stop old tracks if they exist
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  
  // Get new stream
  try {
    const newStream = await getUserMedia();
    console.log('[Mobile Audio] Stream reinitialized - tracks active:', areTracksActive(newStream));
    return newStream;
  } catch (error) {
    console.error('[Mobile Audio] Failed to reinitialize stream:', error);
    return null;
  }
}

/**
 * Handle page visibility changes (app going to background/foreground)
 */
export function setupVisibilityHandlers(
  onVisibilityChange: (isVisible: boolean) => void
): () => void {
  const handleVisibilityChange = () => {
    const isVisible = !document.hidden;
    console.log(`[Mobile Audio] Page visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
    onVisibilityChange(isVisible);
  };
  
  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Also listen for pagehide/pageshow (iOS Safari)
  const handlePageHide = () => {
    console.log('[Mobile Audio] Page hidden');
    onVisibilityChange(false);
  };
  
  const handlePageShow = () => {
    console.log('[Mobile Audio] Page shown');
    onVisibilityChange(true);
  };
  
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('pageshow', handlePageShow);
  };
}

/**
 * Get optimal MediaRecorder options for mobile
 */
export function getMediaRecorderOptions(stream: MediaStream): MediaRecorderOptions {
  const mimeType = getBestAudioFormat();
  const options: MediaRecorderOptions = {};
  
  if (mimeType) {
    options.mimeType = mimeType;
  }
  
  // Use smaller timeslice on mobile to reduce memory usage
  // This helps prevent crashes on long recordings
  if (isMobile()) {
    // On mobile, we'll use timeslice in start() call instead
    // But we can set audioBitsPerSecond for quality control
    options.audioBitsPerSecond = 64000; // Lower bitrate for mobile to reduce memory
  }
  
  return options;
}

