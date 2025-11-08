
import React, { useState, useEffect, useCallback } from 'react';
import { getPlacesRecommendations } from '../services/geminiService';
import { UserLocation, PriceRange, CuisineType, Amenity } from '../types';

interface ParsedRecommendation {
  originalIndex: number;
  name: string;
  rating: number | null;
  fullText: string;
}

const MapGroundingApp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recommendationsText, setRecommendationsText] = useState<string>('');
  const [groundingUrls, setGroundingUrls] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New state for advanced filters
  const [priceRange, setPriceRange] = useState<PriceRange>('');
  const [cuisineType, setCuisineType] = useState<CuisineType>('');
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);

  // New state for sorting
  const [sortOrder, setSortOrder] = useState<'default' | 'highest-rated' | 'lowest-rated'>('default');
  const [parsedRecommendations, setParsedRecommendations] = useState<ParsedRecommendation[]>([]);

  const availableCuisines = [
    'Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'American', 'French',
    'Thai', 'Mediterranean', 'Vegan', 'Vegetarian', 'Seafood', 'Café', 'Barbecue'
  ];
  const availableAmenities: Amenity[] = [
    'Wi-Fi', 'Outdoor Seating', 'Pet-Friendly', 'Parking', 'Wheelchair Accessible'
  ];

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

  useEffect(() => {
    // When recommendationsText changes, re-parse and update parsedRecommendations
    if (recommendationsText) {
      const items = recommendationsText.split(/\n\s*\d+\.\s+\*\*(.*?)\*\*(.*?)(\d+\.?\d*)\s*(?:stars|score|\/10)?/gs).filter(Boolean); // Split and filter empty strings
      const newParsed: ParsedRecommendation[] = [];
      let currentItemIndex = 0;

      // Regex to capture the name and rating (handles "X.X stars", "X/10", "Score: Y")
      const itemRegex = /^\s*\d+\.\s+\*\*(.*?)\*\*(?:[^\n]*?(\d+\.?\d*)\s*(?:stars|out of 5|score|\/10))?/i;

      recommendationsText.split('\n').forEach((line, lineIndex) => {
        const match = line.match(itemRegex);
        if (match) {
          const name = match[1]?.trim() || `Recommendation ${newParsed.length + 1}`;
          let rating: number | null = null;

          // Attempt to parse rating from the matched group or the full line
          if (match[2]) {
            rating = parseFloat(match[2]);
          } else {
            // Fallback for more general rating patterns like "4.5/5"
            const generalRatingMatch = line.match(/(\d+\.?\d*)\s*(?:stars|out of 5|score|\/10)/i);
            if (generalRatingMatch && generalRatingMatch[1]) {
              rating = parseFloat(generalRatingMatch[1]);
            }
          }

          newParsed.push({
            originalIndex: currentItemIndex++,
            name,
            rating: rating && rating > 0 && rating <= 10 ? rating : null, // Basic validation for rating range
            fullText: line.trim(),
          });
        } else if (newParsed.length > 0) {
          // If it's a continuation of the previous item, append to its fullText
          newParsed[newParsed.length - 1].fullText += '\n' + line.trim();
        }
      });
      setParsedRecommendations(newParsed);
    } else {
      setParsedRecommendations([]);
    }
  }, [recommendationsText]);


  const handleAmenityChange = (amenity: Amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

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
    setParsedRecommendations([]); // Clear parsed recommendations too

    const fullPrompt = `Based on my current location, find the top 10 most recommended and commented ${searchQuery}. For each, provide its name, a brief summary of why it's popular, and its general type (e.g., 'Italian Restaurant', 'Boutique Hotel'). Present this as a numbered list.`;

    try {
      const result = await getPlacesRecommendations(
        fullPrompt,
        userLocation,
        priceRange,
        cuisineType,
        selectedAmenities
      );
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
    if (!recommendationsText && !loading) {
      return null;
    }

    let recommendationsToRender = [...parsedRecommendations];

    if (sortOrder === 'highest-rated') {
      recommendationsToRender.sort((a, b) => {
        if (a.rating === null && b.rating === null) return 0;
        if (a.rating === null) return 1; // Nulls last
        if (b.rating === null) return -1; // Nulls last
        return b.rating - a.rating; // Highest first
      });
    } else if (sortOrder === 'lowest-rated') {
      recommendationsToRender.sort((a, b) => {
        if (a.rating === null && b.rating === null) return 0;
        if (a.rating === null) return 1; // Nulls last
        if (b.rating === null) return -1; // Nulls last
        return a.rating - b.rating; // Lowest first
      });
    } else {
      // Default order (original parsing order)
      recommendationsToRender.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    // Basic markdown to HTML conversion for strong, emphasis, lists
    const renderMarkdownContent = (markdown: string) => {
      const lines = markdown.split('\n');
      // FIX: Removed explicit JSX.Element[] type annotation; TypeScript can infer this.
      // This often resolves 'Cannot find namespace JSX' errors when tsconfig setup is implicit or tricky.
      const elements = [];
      let inList = false;
      let isOrdered = false;

      lines.forEach((line, idx) => {
        const trimmedLine = line.trim();
        let content = trimmedLine
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');

        if (trimmedLine.match(/^\d+\.\s/)) { // Ordered list item
          if (!inList || !isOrdered) {
            if (inList) elements.push(isOrdered ? <ol key={`list-end-${idx}`} /> : <ul key={`list-end-${idx}`} />);
            elements.push(<ol key={`list-start-${idx}`} className="list-decimal list-inside space-y-1 text-gray-700" />);
            inList = true;
            isOrdered = true;
          }
          elements.push(<li key={idx} dangerouslySetInnerHTML={{ __html: content.substring(content.indexOf('.') + 1).trim() }} />);
        } else if (trimmedLine.match(/^- /)) { // Unordered list item
          if (!inList || isOrdered) {
            if (inList) elements.push(isOrdered ? <ol key={`list-end-${idx}`} /> : <ul key={`list-end-${idx}`} />);
            elements.push(<ul key={`list-start-${idx}`} className="list-disc list-inside space-y-1 text-gray-700" />);
            inList = true;
            isOrdered = false;
          }
          elements.push(<li key={idx} dangerouslySetInnerHTML={{ __html: content.substring(content.indexOf('-') + 1).trim() }} />);
        } else {
          if (inList) { // End current list
            elements.push(isOrdered ? <ol key={`list-end-${idx}`} /> : <ul key={`list-end-${idx}`} />);
            inList = false;
          }
          if (trimmedLine) {
            elements.push(<p key={idx} className="mb-2" dangerouslySetInnerHTML={{ __html: content }} />);
          }
        }
      });
      if (inList) { // Close any open list at the end
        elements.push(isOrdered ? <ol key={`list-final-end`} /> : <ul key={`list-final-end`} />);
      }
      return <>{elements}</>;
    };


    return (
      <div className="mt-6 p-4 bg-blue-50 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold text-blue-800 mb-4">Our Recommendations:</h3>
        {recommendationsToRender.length > 0 ? (
          <div className="space-y-4">
            {recommendationsToRender.map((rec, index) => (
              <div key={rec.originalIndex || index} className="p-3 bg-white border border-blue-200 rounded-md shadow-sm">
                {renderMarkdownContent(rec.fullText)}
                {rec.rating !== null && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Rating:</span> {rec.rating} {rec.rating <= 5 ? 'stars' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recommendations found or could be parsed for sorting.</p>
        )}
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

            {/* Advanced Filters */}
            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-semibold mb-2">Advanced Filters</h3>

              {/* Price Range */}
              <div>
                <label htmlFor="priceRange" className="block text-sm font-medium mb-1">Price Range</label>
                <select
                  id="priceRange"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                  className="w-full p-2 rounded-md border border-indigo-500 bg-indigo-50 text-gray-900"
                >
                  <option value="">Any</option>
                  <option value="$">Low ($)</option>
                  <option value="$$">Medium ($$)</option>
                  <option value="$$$">High ($$$)</option>
                  <option value="$$$$">Very High ($$$$)</option>
                </select>
              </div>

              {/* Cuisine Type */}
              <div>
                <label htmlFor="cuisineType" className="block text-sm font-medium mb-1">Cuisine Type</label>
                <select
                  id="cuisineType"
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  className="w-full p-2 rounded-md border border-indigo-500 bg-indigo-50 text-gray-900"
                >
                  <option value="">Any</option>
                  {availableCuisines.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>{cuisine}</option>
                  ))}
                </select>
              </div>

              {/* Amenities */}
              <div>
                <span className="block text-sm font-medium mb-1">Amenities</span>
                <div className="grid grid-cols-2 gap-2">
                  {availableAmenities.map((amenity) => (
                    <label key={amenity} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => handleAmenityChange(amenity)}
                        className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                      />
                      <span className="ml-2">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort by Rating */}
              <div className="mt-4">
                <label htmlFor="sortOrder" className="block text-sm font-medium mb-1">Sort by</label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="w-full p-2 rounded-md border border-indigo-500 bg-indigo-50 text-gray-900"
                  disabled={parsedRecommendations.length === 0}
                >
                  <option value="default">Default Order</option>
                  <option value="highest-rated">Highest Rated</option>
                  <option value="lowest-rated">Lowest Rated</option>
                </select>
              </div>
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