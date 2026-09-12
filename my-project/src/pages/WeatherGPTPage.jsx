import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChat } from '../api/weatherApi';
import { useSettings } from '../context/SettingsContext';
import {
  speakText as ttsSpeak,
  stopSpeaking as ttsStop,
  REGIONAL_LANG_SPEECH_MAP,
} from '../utils/ttsEngine';
import {
  Bot,
  User,
  Volume2,
  VolumeX,
  Globe,
  ChevronDown,
  Check,
  Radio,
  Square,
  MapPin,
  Lightbulb,
  Mic,
  MicOff,
  Send,
  Loader2,
  XCircle,
  Languages,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
];

const QUICK_PROMPTS = {
  en: ['Current weather in Delhi?', 'Will it rain tomorrow in Puri?', 'Best crops for this season?', 'Weather alerts for Mumbai?', '7-day forecast Bangalore'],
  hi: ['दिल्ली में मौसम कैसा है?', 'क्या पुरी में कल बारिश होगी?', 'इस मौसम में कौन सी फसल बोएं?', 'मुंबई में मौसम अलर्ट?'],
  or: ['ପୁରୀ ରେ ପାଗ କେମିତି ଅଛି?', 'କଟକ ରେ ଆଜି ବର୍ଷା ହେବ କି?', 'ଏହି ଋତୁରେ କେଉଁ ଫସଲ ଚାଷ କରିବା?', 'ଭୁବନେଶ୍ୱର ପାଗ ସତର୍କତା?'],
  bn: ['কলকাতায় আবহাওয়া কেমন?', 'আগামীকাল বৃষ্টি হবে কি?', 'এই মরসুমে কোন ফসল ভালো?', 'মুম্বাইয়ের আবহাওয়া কেমন?'],
  ta: ['சென்னையில் வானிலை எப்படி?', 'நாளை மழை பெய்யுமா?', 'இந்த பருவத்திற்கான சிறந்த பயிர்கள்?', 'வானிலை எச்சரிக்கைகள்?'],
  te: ['హైదరాబాద్‌లో వాతావరణం ఎలా ఉంది?', 'రేపు వర్షం పడుతుందా?', 'ఈ సీజన్‌లో ఉత్తమ పంటలు ఏవి?'],
  mr: ['मुंबईत हवामान कसे आहे?', 'उद्या पाऊस पडेल का?', 'या हंगामातील पिके कोणती?'],
  gu: ['અમદાવાદમાં हवाમાન કેવું છે?', 'કાલે વરસાદ પડશે?', 'આ સિઝનમાં કયા પાક વાવવા?'],
  kn: ['ಬೆಂಗಳೂರಿನಲ್ಲಿ ಹವಾಮಾನ ಹೇಗಿದೆ?', 'ನಾಳೆ ಮಳೆ ಬರುತ್ತದೆಯೇ?', 'ಈ ಋತುವಿನ ಅತ್ಯುತ್ತಮ ಬೆಳೆಗಳು?'],
  pa: ['ਲੁਧਿਆਣਾ ਵਿੱਚ ਮੌਸਮ ਕਿਵੇਂ ਹੈ?', 'ਕੀ ਕੱਲ੍ਹ ਮੀਂਹ ਪਵੇਗਾ?', 'ਇਸ ਸੀਜ਼ਨ ਦੀਆਂ ਵਧੀਆ ਫ਼ਸਲਾਂ?'],
  ml: ['കൊച്ചിയിലെ കാലാവസ്ഥ എങ്ങനെയുണ്ട്?', 'നാളെ മഴ പെയ്യുമോ?', 'ഈ സീസണിലെ മികച്ച വിളകൾ?'],
  ur: ['دہلی میں موسم کیسا ہے؟', 'کیا کل بارش ہوگی؟', 'اس موسم کے لیے بہترین فصلیں؟'],
};

export default function WeatherGPTPage() {
  const { voiceSpeed } = useSettings();
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Namaste! I\'m WeatherGPT — your multilingual AI weather assistant.\n\nAsk me anything about live weather, forecasts, or agricultural crop advice in your preferred regional language!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [autoTts, setAutoTts] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Stop any speaking on unmount
  useEffect(() => {
    return () => {
      ttsStop();
    };
  }, []);

  // Initialize Web Speech API speech recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  // Update language for speech recognition
  useEffect(() => {
    if (!recognition) return;
    const langConfig = REGIONAL_LANG_SPEECH_MAP[language] || REGIONAL_LANG_SPEECH_MAP.en;
    recognition.lang = langConfig.bcp47;
  }, [language, recognition]);

  const toggleVoice = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Text to Speech Function using universal TTS Engine
  const speakText = useCallback((text, langCode = language, msgIndex = null) => {
    ttsSpeak(text, langCode, {
      speed: voiceSpeed || 'normal',
      onStart: () => {
        setIsSpeaking(true);
        setSpeakingMsgIndex(msgIndex);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setSpeakingMsgIndex(null);
      },
      onError: (err) => {
        console.warn('TTS speech execution error:', err);
        setIsSpeaking(false);
        setSpeakingMsgIndex(null);
      },
    });
  }, [language, voiceSpeed]);

  const stopSpeaking = useCallback(() => {
    ttsStop();
    setIsSpeaking(false);
    setSpeakingMsgIndex(null);
  }, []);

  const changeLanguage = useCallback((code) => {
    stopSpeaking();
    setLanguage(code);
    setIsDropdownOpen(false);
  }, [stopSpeaking]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await sendChat(msg, language);
      const newBotMsg = {
        role: 'bot',
        text: res.reply,
        intent: res.intent,
        location: res.location,
        source: res.data_source,
      };
      setMessages((prev) => [...prev, newBotMsg]);

      // Automatically speak the AI response when autoTts is enabled
      if (autoTts) {
        speakText(res.reply, language, null);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, language, autoTts, speakText]);

  const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const quickPrompts = QUICK_PROMPTS[language] || QUICK_PROMPTS.en;

  return (
    <div className="page gpt-page">
      {/* Top Header & Option Selector Bar */}
      <div className="gpt-header-container">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="page-title-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <Bot size={26} color="#38bdf8" />
              </span>
              <span>WeatherGPT</span>
            </h1>
            <p className="page-subtitle">
              Multilingual real-time weather & crop advisory assistant
            </p>
          </div>

          <div className="gpt-header-actions">
            {/* TTS Auto-Voice Toggle Button */}
            <button
              className={`gpt-tts-toggle-btn ${autoTts ? 'active' : ''}`}
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAutoTts(!autoTts);
              }}
              title="Toggle automatic AI voice response"
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="gpt-tts-icon" style={{ display: 'flex', alignItems: 'center' }}>
                {autoTts ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </span>
              <span className="gpt-tts-label">Voice: {autoTts ? 'ON' : 'OFF'}</span>
            </button>

            {/* Option Selector Dropdown Structure */}
            <div className="gpt-lang-select-wrapper" ref={dropdownRef}>
              <span className="gpt-lang-select-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Globe size={14} /> Language:
              </span>

              {/* Custom Select Trigger Button */}
              <button
                className={`gpt-lang-trigger-btn ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Languages size={15} color="#38bdf8" />
                <span className="gpt-lang-text">
                  <strong>{activeLang.native}</strong> ({activeLang.label})
                </span>
                <ChevronDown size={14} className="gpt-lang-arrow" />
              </button>

              {/* Native Select fallback for accessibility */}
              <select
                className="gpt-native-select"
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                aria-label="Language selector options"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.native} — {lang.label}
                  </option>
                ))}
              </select>

              {/* Glassmorphic Dropdown Menu Grid */}
              {isDropdownOpen && (
                <div className="gpt-lang-dropdown-menu">
                  <div className="gpt-lang-dropdown-header">
                    <span>Available Languages</span>
                    <span className="gpt-lang-badge-real" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Radio size={10} color="#10b981" /> Live Data Grounded
                    </span>
                  </div>
                  <div className="gpt-lang-options-grid">
                    {LANGUAGES.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          className={`gpt-lang-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => changeLanguage(lang.code)}
                        >
                          <Languages size={16} color={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.6)'} />
                          <div className="gpt-opt-info">
                            <span className="gpt-opt-native">{lang.native}</span>
                            <span className="gpt-opt-label">{lang.label}</span>
                          </div>
                          {isSelected && <Check size={14} className="gpt-opt-check" color="#38bdf8" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Width Chat Container */}
      <div className="gpt-chat-full-container">
        <div className="chat-messages gpt-messages">
          {messages.map((m, i) => {
            const isLive = Boolean(
              m.source &&
                !String(m.source).toLowerCase().includes('mock') &&
                !String(m.source).toLowerCase().includes('demo')
            );
            const isThisSpeaking = isSpeaking && (speakingMsgIndex === i || (speakingMsgIndex === null && i === messages.length - 1 && m.role === 'bot'));

            return (
              <div
                key={i}
                className={`chat-msg ${m.role} ${m.error ? 'error' : ''} ${isThisSpeaking ? 'msg-speaking' : ''}`}
              >
                <div className="msg-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.role === 'bot' ? <Bot size={18} color="#38bdf8" /> : <User size={18} color="#a78bfa" />}
                </div>
                <div className="msg-body">
                  <div className="msg-header-row">
                    {m.error && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', marginRight: '6px' }}>
                        <XCircle size={14} />
                      </span>
                    )}
                    <p className="msg-text" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </p>
                    {m.role === 'bot' && !m.error && (
                      <button
                        className={`msg-speaker-btn ${isThisSpeaking ? 'speaking' : ''}`}
                        onClick={() => {
                          if (isThisSpeaking) {
                            stopSpeaking();
                          } else {
                            speakText(m.text, language, i);
                          }
                        }}
                        title={isThisSpeaking ? 'Stop voice' : 'Listen to response'}
                        type="button"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isThisSpeaking ? <Square size={13} /> : <Volume2 size={13} />}
                      </button>
                    )}
                  </div>

                  {(m.intent || m.location || m.source || isThisSpeaking) && (
                    <div className="msg-meta">
                      {m.intent && <span className="meta-badge intent">{m.intent}</span>}
                      {m.location && (
                        <span className="meta-badge location" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {m.location}
                        </span>
                      )}
                      {m.source && (
                        <span
                          className={`meta-badge source ${isLive ? 'live' : 'demo'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Radio size={10} />
                          {isLive ? 'Live Data' : 'Demo Mode'}
                        </span>
                      )}
                      {isThisSpeaking && (
                        <span className="meta-badge speaking-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Volume2 size={11} className="animate-pulse" /> Speaking…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="chat-msg bot">
              <div className="msg-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="#38bdf8" />
              </div>
              <div className="msg-body">
                <div className="typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Floating Speaking Bar if speech is active */}
        {isSpeaking && (
          <div className="gpt-speaking-bar">
            <div className="gpt-speaking-wave">
              <span /><span /><span /><span /><span />
            </div>
            <span className="gpt-speaking-text">AI is reading response in {activeLang.native}…</span>
            <button
              className="gpt-speaking-stop-btn"
              onClick={stopSpeaking}
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Square size={13} />
              <span>Stop Voice</span>
            </button>
          </div>
        )}

        {/* Quick Prompts Suggestions */}
        {messages.length <= 2 && (
          <div className="quick-prompts-wrapper">
            <div className="quick-prompts-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={16} color="#fbbf24" />
              <span>Suggested Questions in {activeLang.native}</span>
            </div>
            <div className="quick-prompts-list">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  className="quick-prompt-chip"
                  onClick={() => setInput(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="gpt-input-bar">
          <button
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoice}
            title={
              recognition
                ? isListening
                  ? 'Stop listening'
                  : `Voice Input (${activeLang.native})`
                : 'Voice not supported'
            }
            disabled={!recognition}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isListening ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} />}
          </button>
          <input
            ref={inputRef}
            type="text"
            className="gpt-text-input"
            placeholder={`Ask in ${activeLang.native} (${activeLang.label})…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button
            className="gpt-send-btn"
            onClick={send}
            disabled={loading || !input.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        {isListening && (
          <div className="voice-indicator">
            <div className="voice-wave">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <span>Listening in {activeLang.native} ({activeLang.label})… Speak now</span>
          </div>
        )}
      </div>
    </div>
  );
}
