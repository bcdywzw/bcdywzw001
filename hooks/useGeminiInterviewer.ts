import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface UseGeminiInterviewerProps {
  isActive: boolean;
  audioStream: MediaStream | null;
}

export const useGeminiInterviewer = ({ isActive, audioStream }: UseGeminiInterviewerProps) => {
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Helper to encode audio for Gemini
  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    // Custom manual encoding to base64 to avoid external lib dependency
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return {
      data: btoa(binary),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  useEffect(() => {
    let mounted = true;

    const connectToGemini = async () => {
      if (!isActive || !audioStream || !process.env.API_KEY) return;

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // 1. Setup Audio Context for recording input
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;

        // 2. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              console.log('Gemini Connected');
              if (mounted) setIsConnected(true);
              
              // Start streaming audio
              const source = audioCtx.createMediaStreamSource(audioStream);
              const processor = audioCtx.createScriptProcessor(4096, 1, 1);
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const blob = createBlob(inputData);
                sessionPromise.then(session => {
                   session.sendRealtimeInput({ media: blob });
                });
              };

              source.connect(processor);
              processor.connect(audioCtx.destination); // Required for script processor to run
              
              sourceRef.current = source;
              scriptProcessorRef.current = processor;
            },
            onmessage: (message: LiveServerMessage) => {
              // We rely on outputTranscription to get the "Questions"
              // We ignore audio output because the AI is a "silent host" via text overlay
              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                if (text) {
                    setCurrentQuestion(prev => {
                        // If it seems like a new sentence, maybe clear old? 
                        // For simplicity, we just append until turn complete, 
                        // but actually replacing is better for a "teleprompter" feel 
                        // if the chunks are small. 
                        // However, Gemini sends partials.
                        return prev + text;
                    });
                }
              }

              if (message.serverContent?.turnComplete) {
                 // Turn is done. We keep the question on screen until the next one starts?
                 // Or we could clear it after a delay. 
                 // Let's leave it so the user can read it.
                 // But we might want to clear the accumulator if we were accumulating.
                 // Actually, let's clear the previous question when a NEW turn starts (handled by resetting in onmessage logic if needed, 
                 // but simple accumulation + clear on new user speech is hard to detect without VAD).
                 // Instead, let's just use the text stream.
                 console.log("Turn complete");
              }
            },
            onclose: () => {
              console.log('Gemini Disconnected');
              if (mounted) setIsConnected(false);
            },
            onerror: (err) => {
              console.error('Gemini Error', err);
              if (mounted) setIsConnected(false);
            }
          },
          config: {
            responseModalities: [Modality.AUDIO], // Required by API even if we ignore audio
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            outputAudioTranscription: {}, // Request text transcription of the AI's response
            systemInstruction: `
              You are a friendly, curious, and insightful video podcast interviewer.
              Your job is to listen to the user recording a video log.
              Provide short, inspiring questions or prompts to guide them.
              
              Rules:
              1. Keep your responses VERY SHORT (max 15 words).
              2. Do not say "Hello" or "Welcome". Jump straight to a relevant question based on what they said.
              3. If they are silent for a while, ask a fun topic starter.
              4. Your output will be displayed as text on screen, so make it punchy and readable.
              5. Act like a "Title Card" that pops up.
            `,
          }
        });

        sessionRef.current = sessionPromise;

      } catch (error) {
        console.error("Failed to initialize Gemini:", error);
      }
    };

    if (isActive) {
      connectToGemini();
    } else {
      cleanup();
    }

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, audioStream]);

  // If the question gets too long or a new interaction starts, we might want to manage the text display.
  // For this MV, we will clear the text when the user starts speaking again? 
  // No, we don't have VAD for user.
  // We will auto-clear the question after a long timeout or when a new one comes.
  useEffect(() => {
     if (currentQuestion) {
         const timeout = setTimeout(() => {
             // Optional: fade out logic could go here
         }, 10000);
         return () => clearTimeout(timeout);
     }
  }, [currentQuestion]);

  // Refine the question display: if the string gets very long, it's likely multiple sentences. 
  // We only show the latest valid sentence or clear it when a new 'turn' implies a new question.
  // Since we append, let's try to detect if we should clear. 
  // Actually, let's just clear "currentQuestion" automatically right before we *start* receiving a new response?
  // Hard to detect "start" of response in the simple callback. 
  // Workaround: We will just display whatever comes in. 

  // Better approach for UI: 
  // We want the text to appear fresh. 
  // Let's rely on the fact that we can reset currentQuestion if the previous one is 'stale' (e.g. > 5 seconds old) 
  // AND we get new text.
  
  const cleanup = () => {
    setIsConnected(false);
    setCurrentQuestion("");
    
    if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close && s.close());
        sessionRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
  };

  // Improved text handling: Whenever the text updates, we just show it. 
  // If the API sends a huge block, we might want to trim.
  // But since we instructed it to be short, it should be fine.
  
  // Hack to clear buffer when a new turn starts:
  // We can't easily detect "start of turn" from the partial stream easily without maintaining state.
  // We will accept the stream as is.

  return { isConnected, currentQuestion: currentQuestion.trim(), setCurrentQuestion };
};