import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { ImageDataPart } from '../types';

const ImageAnalysisApp: React.FC = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<ImageDataPart | null>(null);
  const [prompt, setPrompt] = useState<string>('What do you see in this image?');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (e.g., PNG, JPEG).');
        setImagePreview(null);
        setBase64Image(null);
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        // Extract base64 data and mime type
        const [mimeTypePart, dataPart] = base64String.split(';base64,');
        const mimeType = mimeTypePart.replace('data:', '');
        setBase64Image({
          inlineData: {
            mimeType: mimeType,
            data: dataPart,
          },
        });
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setBase64Image(null);
    }
  };

  const handleAnalyzeImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!base64Image) {
      setError('Please upload an image first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt for the image analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult('');

    try {
      const result = await analyzeImage(base64Image, prompt);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Image analysis error:', err);
      setError((err as Error).message || 'An unexpected error occurred during image analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (e.g., PNG, JPEG).');
        setImagePreview(null);
        setBase64Image(null);
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        const [mimeTypePart, dataPart] = base64String.split(';base64,');
        const mimeType = mimeTypePart.replace('data:', '');
        setBase64Image({
          inlineData: {
            mimeType: mimeType,
            data: dataPart,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to render markdown-like text
  const renderMarkdown = (markdown: string) => {
    const html = markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .split('\n').map((p, idx) => p.trim() && <p key={idx} className="mb-2">{p}</p>); // Paragraphs
    return <div className="space-y-2">{html}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 rounded-lg shadow-xl">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Image Analysis with Gemini</h2>
      <p className="text-gray-600 mb-6 text-center">Upload an image and ask Gemini to analyze or describe it.</p>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 flex-grow">
        {/* Image Upload and Preview */}
        <div className="md:w-1/2 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>
          {!imagePreview ? (
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm">Drag and drop an image here, or</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />
              <button
                onClick={() => { setImagePreview(null); setBase64Image(null); setAnalysisResult(''); }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                title="Remove image"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </>
          )}
        </div>

        {/* Prompt and Analysis Result */}
        <div className="md:w-1/2 flex flex-col">
          <form onSubmit={handleAnalyzeImage} className="space-y-4 mb-6">
            <div>
              <label htmlFor="imagePrompt" className="block text-lg font-medium text-gray-700 mb-2">Your Prompt:</label>
              <textarea
                id="imagePrompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g., 'Describe the main subject', 'What is the setting?', 'Identify objects'"
                className="w-full p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-900 resize-none"
                disabled={loading}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!base64Image || !prompt.trim() || loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze Image'
              )}
            </button>
          </form>

          {analysisResult && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg shadow-inner flex-grow overflow-y-auto">
              <h3 className="text-xl font-semibold text-blue-800 mb-4">Gemini's Analysis:</h3>
              <div className="text-gray-700 leading-relaxed">
                {renderMarkdown(analysisResult)}
              </div>
            </div>
          )}
          {!loading && !analysisResult && (
             <div className="mt-4 p-4 text-center text-gray-500 flex-grow flex items-center justify-center">
                <p>Upload an image and ask a question to see the analysis here.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysisApp;