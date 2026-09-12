import ChatWidget from '../components/ChatWidget';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="page chat-page">
      <div className="chat-page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={24} color="#38bdf8" /> WeatherGPT Chat
        </h2>
        <p>Ask me anything about weather in India — in English or Hindi!</p>
      </div>
      <ChatWidget />
    </div>
  );
}
