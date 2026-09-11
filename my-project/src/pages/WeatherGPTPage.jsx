import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChat } from '../api/weatherApi';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🌴' },
  { code: 'te', label: 'తెలుగు', flag: '🌿' },
  { code: 'mr', label: 'मराठी', flag: '🏛️' },
  { code: 'bn', label: 'বাংলা', flag: '🐯' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🦅' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🦁' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🌾' },
  { code: 'ml', label: 'മലയാളം', flag: '🌴' },
  { code: 'or', label: 'ଓଡ଼ିଆ', flag: '🐘' },
  { code: 'ur', label: 'اردو', flag: '🌙' },
];

const QUICK_PROMPTS = {
  en: ['Current weather in Delhi?', 'Will it rain tomorrow?', 'Best crops for this season?', 'Weather alerts for Mumbai?', '7-day forecast Bangalore'],
  hi: ['दिल्ली में मौसम कैसा है?', 'क्या कल बारिश होगी?', 'इस मौसम में कौन सी फसल बोएं?', 'मुंबई में मौसम अलर्ट?'],
  ta: ['சென்னையில் வானிலை எப்படி?', 'நாளை மழை பெய்யுமா?', 'இந்த பருவத்திற்கான பயிர்கள்?'],
  te: ['హైదరాబాద్‌లో వాతావరణం?', 'రేపు వర్షం పడుతుందా?', 'ఈ సీజన్‌లో ఉత్తమ పంటలు?'],
  mr: ['मुंबईत हवामान कसे आहे?', 'उद्या पाऊस पडेल का?', 'या हंगामातील पिके?'],
  bn: ['কলকাতায় আবহাওয়া কেমন?', 'আগামীকাল বৃষ্টি হবে কি?', 'এই মরসুমের ফসল?'],
};

export default function WeatherGPTPage() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: '🌤️ Namaste! I\'m WeatherGPT — your multilingual weather AI assistant.\n\nAsk me anything about live weather, forecasts, or agricultural crop advice in your preferred regional language!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Web Speech API speech recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = e => {
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
      en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
      mr: 'mr-IN', bn: 'bn-IN', kn: 'kn-IN', gu: 'gu-IN',
      pa: 'pa-IN', ml: 'ml-IN', or: 'or-IN', ur: 'ur-PK',
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

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await sendChat(msg, language);
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: res.reply,
          intent: res.intent,
          location: res.location,
          source: res.data_source,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: `❌ ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, language]);

  const activeLang = LANGUAGES.find(l => l.code === language);
  const quickPrompts = QUICK_PROMPTS[language] || QUICK_PROMPTS.en;

  return (
    <div className="page gpt-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">🤖</span> WeatherGPT
          </h1>
          <p className="page-subtitle">AI-powered multilingual weather & crop assistant</p>
        </div>
        <div className="lang-badge">
          <span className="lang-badge-flag">{activeLang?.flag}</span>
          <span className="lang-badge-label">{activeLang?.label}</span>
        </div>
      </div>

      <div className="gpt-layout">
        {/* Language Picker Sidebar */}
        <div className="lang-panel">
          <div className="lang-panel-title">🌐 Select Language</div>
          <div className="lang-list">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                className={`lang-btn ${language === lang.code ? 'active' : ''}`}
                onClick={() => setLanguage(lang.code)}
              >
                <span className="lang-flag">{lang.flag}</span>
                <span className="lang-name">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="gpt-chat-area">
          <div className="chat-messages gpt-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role} ${m.error ? 'error' : ''}`}>
                <div className="msg-avatar">{m.role === 'bot' ? '🤖' : '👤'}</div>
                <div className="msg-body">
                  <p className="msg-text" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
                  {m.intent && (
                    <div className="msg-meta">
                      <span className="meta-badge intent">{m.intent}</span>
                      {m.location && <span className="meta-badge location">📍 {m.location}</span>}
                      {m.source && (
                        <span className={`meta-badge source ${m.source === 'real' ? 'live' : 'demo'}`}>
                          {m.source === 'real' ? '🟢 Live Data' : '🟡 Demo Mode'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

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

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="quick-prompts-wrapper">
              <div className="quick-prompts-title">💡 Suggested Questions</div>
              <div className="quick-prompts-list">
                {quickPrompts.map((p, i) => (
                  <button key={i} className="quick-prompt-chip" onClick={() => setInput(p)}>
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
              title={recognition ? (isListening ? 'Stop listening' : 'Voice Input') : 'Voice not supported'}
              disabled={!recognition}
            >
              {isListening ? '🔴' : '🎙️'}
            </button>
            <input
              ref={inputRef}
              type="text"
              className="gpt-text-input"
              placeholder={`Ask in ${activeLang?.label || 'your language'}…`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button className="gpt-send-btn" onClick={send} disabled={loading || !input.trim()}>
              {loading ? '⏳' : '➤'}
            </button>
          </div>

          {isListening && (
            <div className="voice-indicator">
              <div className="voice-wave"><span/><span/><span/><span/><span/></div>
              <span>Listening in {activeLang?.label}… Speak now</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
