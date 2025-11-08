import React, { useState, useEffect, useCallback } from 'react';
import { getPlacesRecommendations } from '../services/geminiService';
import { UserLocation } from '../types';

const MapGroundingApp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recommendationsText, setRecommendationsText] = useState<string>('');
  const [groundingUrls, setGroundingUrls] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationPermissionGranted(true);
        },
        (geoError) => {
          console.error("Geolocation error:", geoError);
          setError(`Geolocation failed: ${geoError.message}. Please enable location services.`);
          setLocationPermissionGranted(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLocationPermissionGranted(false);
    }
  }, []);

  useEffect(() => {
    requestGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to get location

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a search query.");
      return;
    }
    if (!userLocation) {
      setError("User location is not available. Please grant geolocation permission.");
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendationsText('');
    setGroundingUrls([]);

    const fullPrompt = `Based on my current location, find the top 10 most recommended and commented ${searchQuery}. For each, provide its name, a brief summary of why it's popular, and its general type (e.g., 'Italian Restaurant', 'Boutique Hotel'). Present this as a numbered list.`;

    try {
      const result = await getPlacesRecommendations(fullPrompt, userLocation);
      setRecommendationsText(result.text);
      setGroundingUrls(result.groundingUrls);
    } catch (err) {
      console.error("Recommendation API error:", err);
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const renderRecommendations = () => {
    if (!recommendationsText) {
      return null;
    }
    // Simple rendering for plain text, assuming the model gives a readable list.
    const paragraphs = recommendationsText.split('\n').filter(p => p.trim() !== '');
    return (
      <div className="mt-6 p-4 bg-blue-50 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold text-blue-800 mb-4">Our Recommendations:</h3>
        <ul className="list-decimal list-inside space-y-2 text-gray-700">
          {paragraphs.map((paragraph, index) => (
            <li key={index} className="leading-relaxed">{paragraph}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderGroundingUrls = () => {
    if (groundingUrls.length === 0) {
      return null;
    }
    return (
      <div className="mt-6 p-4 bg-purple-50 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold text-purple-800 mb-4">Sources:</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          {groundingUrls.map((url, index) => (
            <li key={index}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline break-all">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-white shadow-xl rounded-lg">
      {/* Sidebar for location and input */}
      <aside className="md:w-1/3 p-6 bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex flex-col justify-between rounded-t-lg md:rounded-l-lg md:rounded-tr-none sticky top-0 h-auto md:h-screen overflow-y-auto">
        <div>
          <h1 className="text-3xl font-extrabold mb-4 text-center md:text-left">Local Guide powered by Gemini</h1>
          <p className="text-indigo-200 mb-6 text-center md:text-left">Find the top 10 recommended places near you!</p>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Your Location:</h2>
            {locationPermissionGranted ? (
              userLocation ? (
                <p className="text-green-300">
                  Latitude: {userLocation.latitude.toFixed(4)}, Longitude: {userLocation.longitude.toFixed(4)}
                </p>
              ) : (
                <p className="text-yellow-300">Fetching location...</p>
              )
            ) : (
              <div className="text-red-300">
                <p className="mb-2">Geolocation permission denied or not supported.</p>
                <button
                  onClick={requestGeolocation}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Enable Location
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="searchQuery" className="block text-lg font-medium mb-2">What are you looking for?</label>
              <input
                id="searchQuery"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., 'Italian restaurants', 'boutique hotels', 'parks'"
                className="w-full p-3 rounded-md border border-indigo-500 focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-indigo-50 text-gray-900 placeholder-gray-500"
                disabled={!locationPermissionGranted || !userLocation || loading}
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!locationPermissionGranted || !userLocation || !searchQuery.trim() || loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                'Get Recommendations'
              )}
            </button>
          </form>
        </div>
        <p className="text-sm text-indigo-300 mt-6 text-center">
          Powered by Google Gemini & Google Maps Grounding.
        </p>
      </aside>

      {/* Main content area for results */}
      <main className="md:w-2/3 p-6 flex-grow overflow-y-auto">
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-48">
            <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-3 text-lg text-indigo-700">Finding the best spots for you...</p>
            <p className="text-gray-500 text-sm">This might take a moment as Gemini explores the map data.</p>
          </div>
        )}

        {!loading && !recommendationsText && !error && (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg">Enter a query and click 'Get Recommendations' to begin!</p>
            <p className="text-sm mt-2">Example: "pizza places", "cafes with Wi-Fi", "family-friendly hotels"</p>
          </div>
        )}

        {renderRecommendations()}
        {renderGroundingUrls()}
      </main>
    </div>
  );
};

export default MapGroundingApp;