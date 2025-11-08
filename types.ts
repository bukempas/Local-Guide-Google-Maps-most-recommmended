export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface GroundingChunk {
  maps?: {
    // FIX: Made 'uri' optional to match the @google/genai library's GroundingChunkMaps type.
    uri?: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        uri: string;
      }[];
    };
  };
  web?: {
    uri: string;
    title: string;
  };
}