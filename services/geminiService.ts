import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserLocation, GroundingChunk } from "../types";

export interface RecommendationResult {
  text: string;
  groundingUrls: string[];
}

export async function getPlacesRecommendations(
  prompt: string,
  userLocation: UserLocation,
): Promise<RecommendationResult> {
  // Always create a new GoogleGenAI instance right before making an API call
  // to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using flash for general text tasks with grounding
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          },
        },
      },
    });

    const text = response.text;

    const groundingChunks: GroundingChunk[] | undefined =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    const groundingUrls: string[] = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.maps?.uri) {
          groundingUrls.push(chunk.maps.uri);
        }
        if (chunk.maps?.placeAnswerSources?.reviewSnippets) {
          chunk.maps.placeAnswerSources.reviewSnippets.forEach((snippet) => {
            if (snippet.uri) {
              groundingUrls.push(snippet.uri);
            }
          });
        }
        if (chunk.web?.uri) {
          groundingUrls.push(chunk.web.uri);
        }
      }
    }

    return { text, groundingUrls };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes("Requested entity was not found.")) {
            // This specific error might indicate a problem with the API key in some contexts,
            // though for Maps grounding, it's more likely a bad query.
            // For now, we'll just re-throw. If this were Veo, we'd prompt for key selection.
            throw new Error("API call failed, please check your query or API key status. " + error.message);
        }
    }
    throw new Error("Failed to get recommendations: " + (error as Error).message);
  }
}
