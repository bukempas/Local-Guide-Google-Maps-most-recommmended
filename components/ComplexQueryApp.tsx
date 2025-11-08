import React, { useState } from 'react';
import { sendComplexQuery } from '../services/geminiService';

const ComplexQueryApp: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter your complex query.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult('');

    try {
      const response = await sendComplexQuery(query);
      setResult(response);
    } catch (err) {
      console.error('Complex query error:', err);
      setError((err as Error).message || 'An unexpected error occurred during complex query processing.');
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
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Complex Query with Gemini Pro</h2>
      <p className="text-gray-600 mb-6 text-center">
        Ask detailed questions for in-depth analysis. This mode uses Gemini Pro with enhanced thinking capabilities.
      </p>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label htmlFor="complexQuery" className="block text-lg font-medium text-gray-700 mb-2">Your Complex Question:</label>
          <textarea
            id="complexQuery"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={8}
            placeholder="e.g., 'Compare and contrast the economic impacts of AI on the healthcare and education sectors over the next decade, considering ethical implications and potential policy responses.'"
            className="w-full p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-purple-300 focus:border-transparent text-gray-900 resize-none"
            disabled={loading}
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Thinking...
            </>
          ) : (
            'Get Detailed Answer'
          )}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg shadow-inner flex-grow overflow-y-auto">
          <h3 className="text-xl font-semibold text-purple-800 mb-4">Gemini's Answer:</h3>
          <div className="text-gray-700 leading-relaxed">
            {renderMarkdown(result)}
          </div>
        </div>
      )}
      {!loading && !result && (
        <div className="mt-4 p-4 text-center text-gray-500 flex-grow flex items-center justify-center">
            <p>Enter a complex query above to get a detailed response.</p>
        </div>
      )}
    </div>
  );
};

export default ComplexQueryApp;