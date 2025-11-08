
import { GoogleGenAI, GenerateContentResponse, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from "@google/genai";
import { UserLocation, GroundingChunk, ImageDataPart } from "../types";

export interface RecommendationResult {
  text: string;
  groundingUrls: string[];
}

// Utility functions for audio encoding/decoding (required for Live API)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Gets recommendations using Google Maps or Google Search grounding based on the prompt.
 * Incorporates advanced filters for location-based searches.
 */
export async function getPlacesRecommendations(
  prompt: string,
  userLocation: UserLocation,
  priceRange: string = '',
  cuisineType: string = '',
  amenities: string[] = [],
): Promise<RecommendationResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let modelPrompt = prompt;
  let tools: any[] = [];
  let toolConfig: any = {};

  // Construct a more specific prompt with filters
  if (priceRange) {
    modelPrompt += ` With a price range of ${priceRange}.`;
  }
  if (cuisineType) {
    modelPrompt += ` Specializing in ${cuisineType} cuisine.`;
  }
  if (amenities.length > 0) {
    modelPrompt += ` Offering amenities like: ${amenities.join(', ')}.`;
  }

  // Add request for rating to the prompt
  modelPrompt += ` If available, include its average star rating or a popularity score (e.g., '4.5 stars' or 'Score: 8/10').`;


  // Simple heuristic to decide between Maps and Search
  const isLocationQuery = /(restaurant|hotel|place|cafe|park|bar|store)s? near me|in my area|around me|in \w+/i.test(modelPrompt);

  if (isLocationQuery) {
    tools.push({ googleMaps: {} });
    toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      },
    };
  } else {
    // Default to Google Search for general information queries
    tools.push({ googleSearch: {} });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using flash for general text tasks with grounding
      contents: modelPrompt,
      config: {
        tools: tools,
        toolConfig: toolConfig,
      },
    });

    const text = response.text;

    // FIX: The `groundingChunks` type from `@google/genai` is compatible after modifying local `GroundingChunk` interface.
    // Ensure the local `GroundingChunk` interface is aligned with the actual structure from `@google/genai`.
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
            // FIX: Changed from `snippet.uri` to `snippet.link` to match the updated GroundingChunk interface in types.ts.
            if (snippet.link) {
              groundingUrls.push(snippet.link);
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
        throw new Error("API call failed, please check your query or API key status. " + error.message);
      }
    }
    throw new Error("Failed to get recommendations: " + (error as Error).message);
  }
}

/**
 * Connects to the Gemini Live API for real-time audio conversation.
 */
export async function connectLiveSession(
  onMessage: (message: LiveServerMessage) => Promise<void>,
  onError: (e: ErrorEvent) => void,
  onClose: (e: CloseEvent) => void,
  systemInstruction?: string,
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // FIX: Removed `|| window.webkitAudioContext` as it's deprecated and unnecessary in modern browsers.
  const inputAudioContext = new window.AudioContext({ sampleRate: 16000 });
  // FIX: Removed `|| window.webkitAudioContext` as it's deprecated and unnecessary in modern browsers.
  const outputAudioContext = new window.AudioContext({ sampleRate: 24000 });
  const outputNode = outputAudioContext.createGain();
  outputNode.connect(outputAudioContext.destination);

  let nextStartTime = 0;
  const sources = new Set<AudioBufferSourceNode>();
  let mediaStream: MediaStream | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error("Error accessing microphone:", err);
    throw new Error("Microphone access denied or not available. " + (err as Error).message);
  }

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => {
        console.debug('Live session opened');
        mediaStreamSource = inputAudioContext.createMediaStreamSource(mediaStream!);
        scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
          });
        };
        mediaStreamSource.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        // Handle audio output
        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64EncodedAudioString) {
          nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
          try {
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              outputAudioContext,
              24000,
              1,
            );
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => {
              sources.delete(source);
            });
            source.start(nextStartTime);
            nextStartTime = nextStartTime + audioBuffer.duration;
            sources.add(source);
          } catch (audioError) {
            console.error("Error decoding or playing audio:", audioError);
          }
        }

        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
          for (const source of sources.values()) {
            source.stop();
            sources.delete(source);
          }
          nextStartTime = 0;
        }

        await onMessage(message); // Pass message to UI component for transcription, etc.
      },
      onerror: (e: ErrorEvent) => {
        console.error('Live session error:', e);
        onError(e);
      },
      onclose: (e: CloseEvent) => {
        console.debug('Live session closed');
        // Stop all audio playback
        for (const source of sources.values()) {
          source.stop();
          sources.delete(source);
        }
        nextStartTime = 0;

        // Disconnect audio nodes and stop microphone track
        if (scriptProcessor) {
          scriptProcessor.disconnect();
          scriptProcessor.onaudioprocess = null;
        }
        if (mediaStreamSource) {
          mediaStreamSource.disconnect();
        }
        mediaStream?.getTracks().forEach(track => track.stop());

        onClose(e);
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: systemInstruction || 'You are a friendly and helpful assistant.',
      outputAudioTranscription: {}, // Enable transcription for model output audio.
      inputAudioTranscription: {}, // Enable transcription for user input audio.
    },
  });

  return sessionPromise;
}

/**
 * Sends a general text message to Gemini for low-latency responses.
 */
export async function sendGeneralChatMessage(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite", // Low-latency model
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error sending general chat message:", error);
    throw new Error("Failed to get response: " + (error as Error).message);
  }
}

/**
 * Analyzes an uploaded image with an optional text prompt.
 */
export async function analyzeImage(imagePart: ImageDataPart, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const contents: any[] = [{ text: prompt }, imagePart];
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Image understanding model
      contents: { parts: contents },
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image: " + (error as Error).message);
  }
}

/**
 * Sends a complex query to Gemini with thinking mode enabled.
 */
export async function sendComplexQuery(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro", // Model for complex reasoning
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for 2.5 Pro
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error sending complex query:", error);
    throw new Error("Failed to process complex query: " + (error as Error).message);
  }
}