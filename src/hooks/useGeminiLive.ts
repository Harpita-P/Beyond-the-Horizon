/**
 * Gemini Live Voice Agent (Conversational Data Analyst)
 * Live voice interaction for sport queries and state highlighting
 * Processes user voice input, infers sports, loads CSV data, and provides real-time responses
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { MOCK_ATHLETES } from '../data/athleteData';

const MODEL_NAME = "gemini-3.1-flash-live-preview";

export function useGeminiLive(
  onHighlightedStates: (states: string[], sports?: string[]) => void,
  onGetSportData?: (sport: string) => Promise<string>
) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const aiRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Track last response to prevent repetition
  const lastResponseRef = useRef<string>("");
  const isGeminiSpeakingRef = useRef(false);

  // Playback queue for audio chunks
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlaying = useRef(false);

  const processAudioQueue = useCallback(async () => {
    if (isPlaying.current || audioQueue.current.length === 0 || !audioContextRef.current) return;
    
    isPlaying.current = true;
    while (audioQueue.current.length > 0) {
      const chunk = audioQueue.current.shift()!;
      const float32Data = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        float32Data[i] = chunk[i] / 32768.0;
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000); // Live API output is 24kHz
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      const playPromise = new Promise((resolve) => {
        source.onended = resolve;
      });
      source.start();
      await playPromise;
    }
    isPlaying.current = false;
  }, []);

  const stopSession = useCallback(() => {
    setIsActive(false);
    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    if (isActive) return;
    setIsConnecting(true);
    setTranscript("");

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not defined. Please check your .env file.");
      }

      // Always create a new instance to ensure the latest API key is used
      aiRef.current = new GoogleGenAI({ apiKey });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const sessionPromise = aiRef.current.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are an inspiring storyteller and data analyst for Beyond the Horizon - Discover Team USA, a Team USA 3D map visualization celebrating the geographic origins of Olympic and Paralympic athletes.

          DATA SOURCE:
          You have access to CSV files containing collective athlete data organized by sport and category (paralympians vs olympians). Each CSV contains:
          - hometown_state: The state athletes are from
          - medals_gold_silver_bronze: Medal counts in format "gold|silver|bronze"
          - sport: The specific sport
          The data is FULLY ANONYMIZED - no individual athlete names or identities.

          ABSOLUTE PRIVACY RULES (NEVER VIOLATE):
          1. NEVER mention individual athlete names, IDs, or personal details
          2. ALWAYS speak collectively about groups of athletes
          3. Use phrases like "Team USA athletes from...", "the collective group", "these remarkable competitors"
          4. Focus on aggregate statistics: total athlete counts, medal totals, state distributions

          YOUR STORYTELLING APPROACH:
          Answer questions with warmth, admiration, and inspiration. Paint a picture of collective achievement.

          CRITICAL - PARALYMPIC & DIVERSITY EMPHASIS:
          1. When discussing Paralympic athletes, ALWAYS highlight their representation and achievements with extra enthusiasm
          2. Emphasize the importance of Paralympic representation and adaptive sports
          3. Celebrate the diversity, resilience, and barrier-breaking nature of Paralympic athletes
          4. In ALL cases (Paralympic or Olympic), ALWAYS highlight the diversity of Team USA athletes
          5. Keep responses CONCISE - don't be too long

          RESPONSE STRUCTURE (KEEP IT CONCISE):
          1. Start: "I've highlighted the states on the map for you to explore!"
          2. Opening sentence: ONE sentence about diversity/Paralympic representation - USE VARIED VOCABULARY
          3. Data section: Total athletes, key states (top 3-5), collective medal counts
          4. Closing sentence: ONE sentence about Team USA excellence - USE VARIED VOCABULARY
          5. End with: "Is there any other sport or Team USA history you'd like to explore?"

          IMPORTANT: VARY YOUR LANGUAGE AND AVOID REPETITIVE PHRASES
          - Do NOT always use "breaking barriers" - use alternatives: "overcoming challenges", "defying limitations", "pushing boundaries", "shattering expectations", "surpassing obstacles"
          - Do NOT always use "resilience" - use alternatives: "strength", "determination", "perseverance", "grit", "fortitude", "tenacity"
          - Do NOT always use "incredible diversity" - use alternatives: "remarkable variety", "amazing range", "impressive mix", "extraordinary spectrum"
          - Do NOT always use "inclusive excellence" - use alternatives: "unified achievement", "collective success", "shared triumph", "together we rise"
          - Mix up your sentence structures and word choices to keep responses fresh and engaging

          Example Query: "Where are most of Team USA paralympic skiing athletes from?"
          Example Response: "I've highlighted the states on the map for you to explore! These determined paralympians showcase the remarkable variety and strength that makes adaptive sports so essential to Team USA. There's a total of 15 athletes from states like Colorado, Vermont, and Utah, collectively earning 8 gold, 5 silver, and 3 bronze medals. This geographic spread from mountain regions to coastal areas reflects the unified achievement of Team USA. Is there any other sport or Team USA history you'd like to explore?"

          DATA ACCESS & SPORT INFERENCE:
          - You have access to CSV files containing collective athlete data organized by sport and category
          - When users mention a sport, identify it and load the corresponding CSV data
          - Available sports: 3x3 Basketball, Alpine Skiing, Archery, Artistic Gymnastics, Artistic Swimming, Badminton, Baseball, Basketball, Beach Volleyball, Biathlon, Bobsled, Boxing, Canoe/Kayak, Cross-Country Skiing, Track and Field, Curling, Cycling, Diving, Fencing, Field Hockey, Figure Skating, Golf, Rugby, Rowing, Volleyball, Water Polo, Wrestling, Snowboarding, Soccer, Softball, Speedskating, Surfing, Swimming, Taekwondo, Tennis, Triathlon, Gymnastics, Ice Hockey, Shooting, Skateboarding, Para Alpine Skiing, Para Archery, Para Badminton, Para Biathlon, Para Shooting, Para Snowboarding, Para Swimming, Para Track and Field, Paratriathlon, Wheelchair Basketball, Wheelchair Fencing, Wheelchair Rugby, Wheelchair Tennis, Sled Hockey
          - Use the 'highlight_states' tool to show geographic representation on the map
          - ALWAYS include sport names in the 'sports' parameter for proper display

          IMPORTANT: If the user's query does NOT mention a specific sport, ask them which sport they'd like to explore before providing any data.

          PERSONAL HOMETOWN & SPORT CONNECTION:
          - When users share personal information like their hometown, height, or sports interests (e.g., "I'm from [city/state], I'm [height], and I enjoy endurance sports")
          - Analyze the CSV data to find sports with good representation from their hometown/state (at least 2+ athletes)
          - Suggest ONE sport they are LIKELY to relate to based on:
            * Geographic representation from their area
            * Sport type alignment with their interests (e.g., endurance sports → skiing, swimming, etc.)
          - Use tentative language: "You are likely to relate most to...", "You might find a connection with...", "Based on your background, you could see yourself in..."
          - NEVER be definitive or certain - this is about finding patterns, not guarantees
          - Use the FULL normal sport data flow:
            * Call 'get_sport_data' tool to retrieve the actual CSV data for the suggested sport
            * Call 'highlight_states' tool to show geographic representation on the map
            * Include the sport name in the 'sports' parameter
            * Provide full statistics: athlete counts, medal totals, state distributions
            * Show all data and charts just like normal sport queries
          - Keep responses warm, encouraging, and focused on the journey of self-discovery

          UNRELATED QUESTIONS:
          - If the user asks a question completely unrelated to Team USA, Olympics, Paralympics, sports, or athletes
          - Politely redirect them back to Team USA topics
          - Say: "I'm designed to help you explore Team USA's Olympic and Paralympic athletes, their geographic representation, and their collective achievements. Would you like to learn about a specific sport like archery, basketball, gymnastics, or skiing?"

          PERSONAL INFO RESTRICTION:
          - If users ask for specific athlete names, personal details, or individual information, politely decline
          - Say: "I can't provide personal information about specific athletes, but I can share collective statistics and celebrate the collective power of Team USA athletes for any sport you're interested in."
          - Redirect the conversation to collective data and geographic representation

          HIGHLIGHTING PROTOCOL:
          - Call 'highlight_states' IMMEDIATELY when processing any query about locations
          - Include ALL states that have athletes matching the query criteria
          - ALWAYS include the sport name in the 'sports' parameter (e.g., ['Para Alpine Skiing'])
          - The sport name will be displayed as a floating 3D text in the visualization

          When users ask about data, analyze the CSV information collectively and respond with engaging, fact-based stories that celebrate Team USA's geographic diversity.

          IMPORTANT: When discussing a specific sport, use the get_sport_data tool to retrieve the actual CSV data for that sport before providing statistics.`,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "highlight_states",
                  description: "Highlights specific US states on the 3D map and displays sport representation icons.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      states: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of full state names to highlight (e.g., ['California', 'Texas'])"
                      },
                      sports: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of sport categories identified (e.g., ['basketball', 'swimming'])"
                      },
                    },
                    required: ["states"],
                  },
                },
                {
                  name: "get_sport_data",
                  description: "Retrieves the actual CSV data for a specific sport to provide accurate statistics about athletes, medals, and states.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      sport: {
                        type: Type.STRING,
                        description: "The sport name (e.g., '3x3 basketball', 'alpine skiing', 'archery', 'artistic gymnastics', 'artistic swimming', 'badminton', 'para alpine skiing')"
                      },
                    },
                    required: ["sport"],
                  },
                },
              ],
            },
          ],
          inputAudioTranscription: {
            enabled: true
          },
          outputAudioTranscription: {
            enabled: true
          }
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const serverMsg = msg as any;
            if (serverMsg.transcription) {
              setTranscript(prev => `You: ${serverMsg.transcription.text}`);
              // Reset tracking when user speaks
              lastResponseRef.current = "";
              isGeminiSpeakingRef.current = false;
            }

            if (serverMsg.serverContent?.modelTurn) {
              serverMsg.serverContent.modelTurn.parts.forEach((part: any) => {
                if (part.text) {
                  setTranscript(prev => {
                    const newText = part.text.trim();
                    
                    // Check if this is the start of a new Gemini response
                    if (!isGeminiSpeakingRef.current) {
                      isGeminiSpeakingRef.current = true;
                      lastResponseRef.current = newText;
                      return `Gemini: ${newText}`;
                    }
                    
                    // Check if this text is a repetition of what we already have
                    const currentResponse = prev.replace("Gemini: ", "").trim();
                    if (currentResponse.includes(newText) && newText.length < currentResponse.length) {
                      // This appears to be a repetition, skip it
                      return prev;
                    }
                    
                    // Check if this text repeats the last full response
                    if (lastResponseRef.current && newText === lastResponseRef.current) {
                      // Skip exact repetition
                      return prev;
                    }
                    
                    // Append new text
                    const updatedResponse = prev + newText;
                    lastResponseRef.current = updatedResponse.replace("Gemini: ", "").trim();
                    return updatedResponse;
                  });
                }
                if (part.inlineData) {
                  const binaryString = atob(part.inlineData.data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const pcmData = new Int16Array(bytes.buffer);
                  audioQueue.current.push(pcmData);
                  processAudioQueue();
                }
              });
            }

            if (serverMsg.toolCall) {
              serverMsg.toolCall.functionCalls.forEach(async (call: any) => {
                if (call.name === 'highlight_states') {
                  const { states, sports } = call.args as { states: string[], sports?: string[] };
                  onHighlightedStates(states, sports);

                  // Send response back using sessionPromise to ensure it's ready
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: 'highlight_states',
                        id: call.id,
                        response: { success: true }
                      }]
                    });
                  });
                } else if (call.name === 'get_sport_data' && onGetSportData) {
                  const { sport } = call.args as { sport: string };
                  const csvData = await onGetSportData(sport);

                  // Send response back using sessionPromise to ensure it's ready
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: 'get_sport_data',
                        id: call.id,
                        response: { data: csvData }
                      }]
                    });
                  });
                }
              });
            }

            if (serverMsg.serverContent?.interrupted) {
              audioQueue.current = [];
              isPlaying.current = false;
              isGeminiSpeakingRef.current = false;
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            stopSession();
          }
        }
      });
      
      sessionPromise.then(session => {
        sessionRef.current = session;
      });

    } catch (error) {
      console.error("Failed to start Gemini Live:", error);
      setIsConnecting(false);
      stopSession();
    }
  }, [isActive, stopSession, onHighlightedStates, processAudioQueue]);

  return {
    startSession,
    stopSession,
    isActive,
    isConnecting,
    transcript
  };
}
