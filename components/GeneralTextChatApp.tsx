import React, { useState, useRef, useEffect } from 'react';
import { sendGeneralChatMessage } from '../services/geminiService';
import { ChatMessage } from '../types';

const GeneralTextChatApp: React.FC = () => {
  const [inputMessage, setInputMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const modelResponseText = await sendGeneralChatMessage(userMessage.text);
      const modelMessage: ChatMessage = {
        id: Date.now().toString() + '-model',
        sender: 'model',
        text: modelResponseText,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, modelMessage]);
    } catch (err) {
      console.error('General chat error:', err);
      setError((err as Error).message || 'An unexpected error occurred during chat.');
      setChatHistory((prev) => [
        ...prev,
        { id: Date.now().toString() + '-error', sender: 'model', text: `Error: ${(err as Error).message}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (markdown: string) => {
    const html = markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .split('\n').map((p, idx) => p.trim() && <p key={idx} className="mb-2">{p}</p>); // Paragraphs
    return <div className="space-y-2">{html}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 rounded-lg shadow-xl">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">General Chat with Gemini Flash Lite</h2>
      <p className="text-gray-600 mb-6 text-center">Ask quick questions and get low-latency responses.</p>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <div ref={chatHistoryRef} className="flex-grow overflow-y-auto p-4 border border-gray-200 rounded-lg bg-white mb-6 space-y-4 shadow-inner">
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            Start a conversation!
          </div>
        )}
        {chatHistory.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {renderMarkdown(message.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-100 text-gray-600 animate-pulse">
              Typing...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-3">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-900"
          disabled={loading}
        />
        <button
          type="submit"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !inputMessage.trim()}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
};

export default GeneralTextChatApp;