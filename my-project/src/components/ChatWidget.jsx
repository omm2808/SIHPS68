import { useState, useRef, useEffect } from 'react';
import { sendChat } from '../api/weatherApi';
import { Bot, User, MapPin, Send, Loader2, XCircle, Radio } from 'lucide-react';

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m WeatherGPT. Ask me about weather in any Indian city — in English or Hindi!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await sendChat(msg);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: res.reply,
        intent: res.intent,
        location: res.location,
        source: res.data_source,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    'Weather in Indore?',
    'Will it rain tomorrow in Mumbai?',
    'दिल्ली में तापमान क्या है?',
    'Any weather alerts for Bhopal?',
    'Crop advice for wheat in Jaipur',
  ];

  return (
    <div className="chat-widget">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role} ${m.error ? 'error' : ''}`}>
            <div className="msg-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {m.role === 'bot' ? <Bot size={18} color="#38bdf8" /> : <User size={18} color="#a78bfa" />}
            </div>
            <div className="msg-body">
              {m.error && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', marginBottom: '4px' }}>
                  <XCircle size={14} />
                </div>
              )}
              <p className="msg-text">{m.text}</p>
              {m.intent && (
                <div className="msg-meta">
                  <span className="meta-badge intent">{m.intent}</span>
                  {m.location && (
                    <span className="meta-badge location" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} /> {m.location}
                    </span>
                  )}
                  {m.source && (
                    <span className={`meta-badge source ${m.source === 'real' ? 'live' : 'demo'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Radio size={10} />
                      {m.source === 'real' ? 'Live' : 'Demo'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg bot">
            <div className="msg-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="#38bdf8" />
            </div>
            <div className="msg-body"><p className="msg-text typing">Thinking<span className="dots">...</span></p></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} className="quick-btn" onClick={() => { setInput(p); }}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="Ask about weather…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
