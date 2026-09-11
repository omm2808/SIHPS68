import ChatWidget from '../components/ChatWidget';

export default function ChatPage() {
  return (
    <div className="page chat-page">
      <div className="chat-page-header">
        <h2>💬 WeatherGPT Chat</h2>
        <p>Ask me anything about weather in India — in English or Hindi!</p>
      </div>
      <ChatWidget />
    </div>
  );
}
