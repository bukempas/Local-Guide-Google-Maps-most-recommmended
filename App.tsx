import React, { useState } from 'react';
import MapGroundingApp from './components/MapGroundingApp';
import LiveChatApp from './components/LiveChatApp';
import ImageAnalysisApp from './components/ImageAnalysisApp';
import GeneralTextChatApp from './components/GeneralTextChatApp';
import ComplexQueryApp from './components/ComplexQueryApp';

type AppMode = 'maps' | 'live-chat' | 'image-analysis' | 'general-chat' | 'complex-query';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('maps');

  const getModeTitle = (mode: AppMode) => {
    switch (mode) {
      case 'maps': return 'Local Guide (Maps)';
      case 'live-chat': return 'Live Chat (Audio)';
      case 'image-analysis': return 'Image Analysis';
      case 'general-chat': return 'General Chat (Text)';
      case 'complex-query': return 'Complex Query (Pro)';
      default: return '';
    }
  };

  const renderActiveComponent = () => {
    switch (activeMode) {
      case 'maps':
        return <MapGroundingApp />;
      case 'live-chat':
        return <LiveChatApp />;
      case 'image-analysis':
        return <ImageAnalysisApp />;
      case 'general-chat':
        return <GeneralTextChatApp />;
      case 'complex-query':
        return <ComplexQueryApp />;
      default:
        return <MapGroundingApp />;
    }
  };

  return (
    <div className="App flex flex-col w-full max-w-6xl bg-white rounded-lg shadow-xl overflow-hidden min-h-[90vh]">
      {/* Top Navigation */}
      <nav className="bg-gray-800 p-4 shadow-md">
        <div className="flex justify-center flex-wrap gap-2 md:gap-4">
          <button
            onClick={() => setActiveMode('maps')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeMode === 'maps'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Local Guide
          </button>
          <button
            onClick={() => setActiveMode('live-chat')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeMode === 'live-chat'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Live Chat
          </button>
          <button
            onClick={() => setActiveMode('image-analysis')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeMode === 'image-analysis'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Image Analysis
          </button>
          <button
            onClick={() => setActiveMode('general-chat')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeMode === 'general-chat'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            General Chat
          </button>
          <button
            onClick={() => setActiveMode('complex-query')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeMode === 'complex-query'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Complex Query
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-6 overflow-hidden">
        {renderActiveComponent()}
      </main>
    </div>
  );
};

export default App;