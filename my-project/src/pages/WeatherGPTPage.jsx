import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChat } from '../api/weatherApi';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🐘' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🐯' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🌴' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🌿' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🏛️' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🦁' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🦅' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🌾' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', flag: '🌴' },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🌙' },
];

const QUICK_PROMPTS = {
  en: ['Current weather in Delhi?', 'Will it rain tomorrow in Puri?', 'Best crops for this season?', 'Weather alerts for Mumbai?', '7-day forecast Bangalore'],
  hi: ['दिल्ली में मौसम कैसा है?', 'क्या पुरी में कल बारिश होगी?', 'इस मौसम में कौन सी फसल बोएं?', 'मुंबई में मौसम अलर्ट?'],
  or: ['ପୁରୀ ରେ ପାଗ କେମିତି ଅଛି?', 'କଟକ ରେ ଆଜି ବର୍ଷା ହେବ କି?', 'ଏହି ଋତୁରେ କେଉଁ ଫସଲ ଚାଷ କରିବା?', 'ଭୁବନେଶ୍ୱର ପାଗ ସତର୍କତା?'],
  bn: ['কলকাতায় আবহাওয়া কেমন?', 'আগামীকাল বৃষ্টি হবে কি?', 'এই মরসুমে কোন ফসল ভালো?', 'মুম্বাইয়ের আবহাওয়া কেমন?'],
  ta: ['சென்னையில் வானிலை எப்படி?', 'நாளை மழை பெய்யுமா?', 'இந்த பருவத்திற்கான சிறந்த பயிர்கள்?', 'வானிலை எச்சரிக்கைகள்?'],
  te: ['హైదరాబాద్‌లో వాతావరణం ఎలా ఉంది?', 'రేపు వర్షం పడుతుందా?', 'ఈ సీజన్‌లో ఉత్తమ పంటలు ఏవి?'],
  mr: ['मुंबईत हवामान कसे आहे?', 'उद्या पाऊस पडेल का?', 'या हंगामातील पिके कोणती?'],
  gu: ['અમદાવાદમાં હવામાન કેવું છે?', 'કાલે વરસાદ પડશે?', 'આ સિઝનમાં કયા પાક વાવવા?'],
  kn: ['ಬೆಂಗಳೂರಿನಲ್ಲಿ ಹವಾಮಾನ ಹೇಗಿದೆ?', 'ನಾಳೆ ಮಳೆ ಬರುತ್ತದೆಯೇ?', 'ಈ ಋತುವಿನ ಅತ್ಯುತ್ತಮ ಬೆಳೆಗಳು?'],
  pa: ['ਲੁਧਿਆਣਾ ਵਿੱਚ ਮੌਸਮ ਕਿਵੇਂ ਹੈ?', 'ਕੀ ਕੱਲ੍ਹ ਮੀਂਹ ਪਵੇਗਾ?', 'ਇਸ ਸੀਜ਼ਨ ਦੀਆਂ ਵਧੀਆ ਫ਼ਸਲਾਂ?'],
  ml: ['കൊച്ചിയിലെ കാലാവസ്ഥ എങ്ങനെയുണ്ട്?', 'நாളെ മഴ പെയ്യുമോ?', 'ഈ സീസണിലെ മികച്ച വിളകൾ?'],
  ur: ['دہلی میں موسم کیسا ہے؟', 'کیا کل بارش ہوگی؟', 'اس موسم کے لیے بہترین فصلیں؟'],
};

function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[*#_~`>]/g, '')
    .replace(/(\d+)\s*°\s*C\b/gi, '$1 degrees Celsius')
    .replace(/(\d+)\s*°\s*F\b/gi, '$1 degrees Fahrenheit')
    .replace(/°/g, ' degrees ')
    .replace(/km\/h/gi, 'kilometers per hour')
    .replace(/hPa/gi, 'hectopascals')
    .replace(/%/g, ' percent')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F680}-\u{1F6FF}]/gu, '')
    .trim();
}

export default function WeatherGPTPage() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: '🌤️ Namaste! I\'m WeatherGPT — your multilingual AI weather assistant.\n\nAsk me anything about live weather, forecasts, or agricultural crop advice in your preferred regional language!',
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

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      kn: 'kn-IN',
      gu: 'gu-IN',
      pa: 'pa-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      ur: 'ur-PK',
    };
    recognition.lang = langMap[language] || 'en-IN';
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

  // Text to Speech Function
  const speakText = useCallback((text, langCode = language, msgIndex = null) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);

    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      kn: 'kn-IN',
      gu: 'gu-IN',
      pa: 'pa-IN',
      ml: 'ml-IN',
      or: 'hi-IN',
      ur: 'ur-PK',
    };

    const targetLang = langMap[langCode] || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) =>
        v.lang === targetLang ||
        v.lang.startsWith(langCode) ||
        v.lang.toLowerCase().includes(langCode)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMsgIndex(msgIndex);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMsgIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMsgIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [language]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMsgIndex(null);
  };

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
      if (autoTts && 'speechSynthesis' in window) {
        speakText(res.reply, language);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `❌ ${err.message}`, error: true },
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
            <h1 className="page-title">
              <span className="page-title-icon">🤖</span> WeatherGPT
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
            >
              <span className="gpt-tts-icon">{autoTts ? '🔊' : '🔈'}</span>
              <span className="gpt-tts-label">Voice: {autoTts ? 'ON' : 'OFF'}</span>
            </button>

            {/* Option Selector Dropdown Structure */}
            <div className="gpt-lang-select-wrapper" ref={dropdownRef}>
              <span className="gpt-lang-select-label">🌐 Language:</span>

              {/* Custom Select Trigger Button */}
              <button
                className={`gpt-lang-trigger-btn ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <span className="gpt-lang-flag">{activeLang.flag}</span>
                <span className="gpt-lang-text">
                  <strong>{activeLang.native}</strong> ({activeLang.label})
                </span>
                <span className="gpt-lang-arrow">▾</span>
              </button>

              {/* Native Select fallback for accessibility */}
              <select
                className="gpt-native-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Language selector options"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.native} — {lang.label}
                  </option>
                ))}
              </select>

              {/* Glassmorphic Dropdown Menu Grid */}
              {isDropdownOpen && (
                <div className="gpt-lang-dropdown-menu">
                  <div className="gpt-lang-dropdown-header">
                    <span>Available Languages</span>
                    <span className="gpt-lang-badge-real">🟢 Live Data Grounded</span>
                  </div>
                  <div className="gpt-lang-options-grid">
                    {LANGUAGES.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          className={`gpt-lang-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <span className="gpt-opt-flag">{lang.flag}</span>
                          <div className="gpt-opt-info">
                            <span className="gpt-opt-native">{lang.native}</span>
                            <span className="gpt-opt-label">{lang.label}</span>
                          </div>
                          {isSelected && <span className="gpt-opt-check">✓</span>}
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
                <div className="msg-avatar">{m.role === 'bot' ? '🤖' : '👤'}</div>
                <div className="msg-body">
                  <div className="msg-header-row">
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
                      >
                        {isThisSpeaking ? '⏹️' : '🔊'}
                      </button>
                    )}
                  </div>

                  {(m.intent || m.location || m.source || isThisSpeaking) && (
                    <div className="msg-meta">
                      {m.intent && <span className="meta-badge intent">{m.intent}</span>}
                      {m.location && (
                        <span className="meta-badge location">
                          📍 {m.location}
                        </span>
                      )}
                      {m.source && (
                        <span
                          className={`meta-badge source ${isLive ? 'live' : 'demo'}`}
                        >
                          {isLive ? '🟢 Live Data' : '🟡 Demo Mode'}
                        </span>
                      )}
                      {isThisSpeaking && (
                        <span className="meta-badge speaking-indicator">
                          🔊 Speaking…
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
              <div className="msg-avatar">🤖</div>
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
            >
              ⏹️ Stop Voice
            </button>
          </div>
        )}

        {/* Quick Prompts Suggestions */}
        {messages.length <= 2 && (
          <div className="quick-prompts-wrapper">
            <div className="quick-prompts-title">💡 Suggested Questions in {activeLang.native}</div>
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
          >
            {isListening ? '🔴' : '🎙️'}
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
          >
            {loading ? '⏳' : '➤'}
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
