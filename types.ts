
export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        // FIX: Changed 'uri' to 'link' to match the @google/genai library's GroundingChunkMapsPlaceAnswerSourcesReviewSnippet type.
        link: string;
        // FIX: Added optional 'text' property for review snippet content, as it's typically present.
        text?: string;
      }[];
    };
  };
  web?: {
    uri: string;
    title: string;
  };
}

export interface ImageDataPart {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded string
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type PriceRange = '$' | '$$' | '$$$' | '$$$$' | '';
export type CuisineType = string; // Could be a predefined list or free-form text
export type Amenity = 'Wi-Fi' | 'Outdoor Seating' | 'Pet-Friendly' | 'Parking' | 'Wheelchair Accessible';