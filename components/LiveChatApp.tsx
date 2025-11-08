import React, { useState, useRef, useEffect } from 'react';
import { connectLiveSession } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';
import { ChatMessage } from '../types';

const LiveChatApp: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInputTranscription, setCurrentInputTranscription] = useState<string>('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Store session promise and session object to manage connection
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any | null>(null);

  const systemInstruction = "You are a friendly and helpful assistant, ready to chat.";

  useEffect(() => {
    // Scroll to bottom of chat history on new messages
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory, currentInputTranscription, currentOutputTranscription]);

  const handleStartConversation = async () => {
    setIsConnecting(true);
    setError(null);
    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    setChatHistory([]); // Clear history for a new conversation

    try {
      const sessionCallbacks = {
        onMessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            setCurrentOutputTranscription((prev) => prev + text);
          } else if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            setCurrentInputTranscription((prev) => prev + text);
          }

          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription.trim()) {
              setChatHistory((prev) => [
                ...prev,
                { id: Date.now().toString() + '-user', sender: 'user', text: currentInputTranscription, timestamp: new Date() },
              ]);
            }
            if (currentOutputTranscription.trim()) {
              setChatHistory((prev) => [
                ...prev,
                { id: Date.now().toString() + '-model', sender: 'model', text: currentOutputTranscription, timestamp: new Date() },
              ]);
            }
            setCurrentInputTranscription('');
            setCurrentOutputTranscription('');
          }
        },
        onError: (e: ErrorEvent) => {
          console.error('Live API Error:', e);
          setError(`Live chat error: ${e.message}. Please try again.`);
          setIsConnecting(false);
          setIsRecording(false);
        },
        onClose: (e: CloseEvent) => {
          console.log('Live API connection closed:', e);
          setIsConnecting(false);
          setIsRecording(false);
          setError(e.code !== 1000 ? `Live chat disconnected: ${e.reason || 'Unknown error'}` : null);
          sessionRef.current = null;
          sessionPromiseRef.current = null;
        },
      };
      sessionPromiseRef.current = connectLiveSession(
        sessionCallbacks.onMessage,
        sessionCallbacks.onError,
        sessionCallbacks.onClose,
        systemInstruction,
      );
      sessionRef.current = await sessionPromiseRef.current; // Resolve the promise
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start live session:", err);
      setError((err as Error).message || "Could not start live session. Check microphone permissions.");
      setIsConnecting(false);
      setIsRecording(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStopConversation = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    setIsRecording(false);
    sessionRef.current = null;
    sessionPromiseRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 rounded-lg shadow-xl">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Live Chat with Gemini</h2>
      <p className="text-gray-600 mb-6 text-center">Have a real-time voice conversation with our AI assistant.</p>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Chat history display */}
      <div ref={chatHistoryRef} className="flex-grow overflow-y-auto p-4 border border-gray-200 rounded-lg bg-white mb-6 space-y-4 shadow-inner">
        {chatHistory.length === 0 && !isRecording && (
          <div className="text-center text-gray-400 py-10">
            Click "Start Conversation" to begin.
            <br />
            {systemInstruction}
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
              {message.text}
            </div>
          </div>
        ))}
        {currentInputTranscription && (
          <div className="flex justify-end">
            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-indigo-200 text-indigo-900 animate-pulse-fade">
              {currentInputTranscription}
              <span className="ml-1 text-xs opacity-75"> (You)</span>
            </div>
          </div>
        )}
        {currentOutputTranscription && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-blue-100 text-blue-900 animate-pulse-fade">
              {currentOutputTranscription}
              <span className="ml-1 text-xs opacity-75"> (Gemini)</span>
            </div>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="flex justify-center space-x-4">
        {!isRecording ? (
          <button
            onClick={handleStartConversation}
            className="flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                Start Conversation
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStopConversation}
            className="flex items-center px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full shadow-lg transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1zm3 0a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
            Stop Conversation
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveChatApp;