/**
 * ttsEngine.js
 * ------------
 * Resilient Multilingual Speech Engine supporting all Indian regional languages:
 * English, Hindi, Odia, Bengali, Tamil, Telugu, Marathi, Gujarati,
 * Kannada, Punjabi, Malayalam, Urdu, and more.
 *
 * Architecture:
 * 1. Primary: High-fidelity streaming audio from WeatherGPT backend (/api/tts).
 *    Guarantees clear, natural human speech in all Indian regional languages
 *    regardless of the user's OS or browser TTS voice packs.
 * 2. Secondary Fallback: Browser Web Speech API (SpeechSynthesisUtterance)
 *    with dynamic voice discovery and locale mapping.
 */

import { getTtsAudioUrl } from '../api/weatherApi';

// Track current active audio playback & speech instances
let currentAudio = null;
let currentUtterance = null;
let isCurrentlySpeaking = false;
let activeCallbacks = { onStart: null, onEnd: null, onError: null };

// Voice speed multiplier mapping
export const VOICE_SPEEDS = {
  slow: 0.85,
  normal: 1.0,
  fast: 1.25,
};

// BCP-47 Locale Map for Speech Recognition (STT) and Web Speech API
export const REGIONAL_LANG_SPEECH_MAP = {
  en: { bcp47: 'en-IN', fallbacks: ['en-US', 'en-GB'], label: 'English' },
  hi: { bcp47: 'hi-IN', fallbacks: ['hi'], label: 'Hindi' },
  or: { bcp47: 'or-IN', fallbacks: ['hi-IN', 'bn-IN'], label: 'Odia' },
  bn: { bcp47: 'bn-IN', fallbacks: ['bn-BD', 'hi-IN'], label: 'Bengali' },
  ta: { bcp47: 'ta-IN', fallbacks: ['ta-LK', 'ta'], label: 'Tamil' },
  te: { bcp47: 'te-IN', fallbacks: ['te'], label: 'Telugu' },
  mr: { bcp47: 'mr-IN', fallbacks: ['hi-IN', 'mr'], label: 'Marathi' },
  gu: { bcp47: 'gu-IN', fallbacks: ['hi-IN', 'gu'], label: 'Gujarati' },
  kn: { bcp47: 'kn-IN', fallbacks: ['kn'], label: 'Kannada' },
  pa: { bcp47: 'pa-IN', fallbacks: ['hi-IN', 'pa'], label: 'Punjabi' },
  ml: { bcp47: 'ml-IN', fallbacks: ['ml'], label: 'Malayalam' },
  ur: { bcp47: 'ur-PK', fallbacks: ['ur-IN', 'ur', 'hi-IN'], label: 'Urdu' },
};

/**
 * Clean markdown, emojis, symbols, and units for speech
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[*#_~`>]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/(\d+)\s*°\s*C\b/gi, '$1 degrees Celsius')
    .replace(/(\d+)\s*°\s*F\b/gi, '$1 degrees Fahrenheit')
    .replace(/°/g, ' degrees ')
    .replace(/km\/h/gi, 'kilometers per hour')
    .replace(/hPa/gi, 'hectopascals')
    .replace(/%/g, ' percent')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F680}-\u{1F6FF}\u{FE00}-\u{FE0F}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stop any current audio or speech synthesis immediately
 */
export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch (e) {
      console.warn('Error stopping audio element:', e);
    }
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Error cancelling speechSynthesis:', e);
    }
    currentUtterance = null;
  }

  if (isCurrentlySpeaking) {
    isCurrentlySpeaking = false;
    if (activeCallbacks.onEnd) {
      activeCallbacks.onEnd();
    }
  }

  activeCallbacks = { onStart: null, onEnd: null, onError: null };
}

/**
 * Web Speech API Fallback Player
 */
function speakWithWebSpeech(cleanText, langCode, speedRate, { onStart, onEnd, onError }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError(new Error('SpeechSynthesis not supported'));
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langConfig = REGIONAL_LANG_SPEECH_MAP[langCode] || REGIONAL_LANG_SPEECH_MAP.en;
    utterance.lang = langConfig.bcp47;
    utterance.rate = speedRate || 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      // Find matching voice by target BCP-47 tag, prefix, or language label
      const targetTags = [langConfig.bcp47, ...(langConfig.fallbacks || []), langCode];
      let matchedVoice = null;

      for (const tag of targetTags) {
        matchedVoice = voices.find(
          (v) =>
            v.lang.toLowerCase() === tag.toLowerCase() ||
            v.lang.toLowerCase().startsWith(tag.toLowerCase()) ||
            v.name.toLowerCase().includes(tag.toLowerCase()) ||
            v.name.toLowerCase().includes(langConfig.label.toLowerCase())
        );
        if (matchedVoice) break;
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onstart = () => {
      isCurrentlySpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      isCurrentlySpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      isCurrentlySpeaking = false;
      if (onError) onError(err);
      if (onEnd) onEnd();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Web Speech API execution error:', err);
    if (onError) onError(err);
  }
}

/**
 * Main Universal Speak Function
 * Plays via high-clarity streaming audio API with Web Speech fallback
 */
export function speakText(
  text,
  langCode = 'en',
  options = {}
) {
  const { onStart, onEnd, onError, speed = 'normal' } = options;

  // Stop any active audio/speech first
  stopSpeaking();

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    if (onEnd) onEnd();
    return;
  }

  const speedMultiplier = typeof speed === 'number' ? speed : VOICE_SPEEDS[speed] || 1.0;
  activeCallbacks = { onStart, onEnd, onError };

  try {
    // Generate Backend Audio URL
    const audioUrl = getTtsAudioUrl(clean, langCode);
    const audio = new Audio(audioUrl);
    audio.playbackRate = speedMultiplier;
    currentAudio = audio;

    let started = false;

    audio.onplay = () => {
      started = true;
      isCurrentlySpeaking = true;
      if (onStart) onStart();
    };

    audio.onended = () => {
      isCurrentlySpeaking = false;
      currentAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      console.warn('Backend TTS Audio stream failed, falling back to Web Speech API:', e);
      currentAudio = null;
      // Graceful fallback to client-side Web Speech API
      speakWithWebSpeech(clean, langCode, speedMultiplier, { onStart, onEnd, onError });
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay restrictions or network failure fallback
        console.warn('Audio play() rejected, falling back to Web Speech API:', err.message);
        if (!started) {
          speakWithWebSpeech(clean, langCode, speedMultiplier, { onStart, onEnd, onError });
        }
      });
    }
  } catch (err) {
    console.warn('TTS initiation error, using fallback:', err);
    speakWithWebSpeech(clean, langCode, speedMultiplier, { onStart, onEnd, onError });
  }
}

/**
 * Check if speech is currently active
 */
export function getIsSpeaking() {
  return isCurrentlySpeaking;
}
