import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AspectRatio, ASPECT_RATIO_CONFIGS, VideoConfig } from '../types';
import { useGeminiInterviewer } from '../hooks/useGeminiInterviewer';

interface RecorderProps {
  aspectRatio: AspectRatio;
  isRecording: boolean;
  onRecordingComplete: (blob: Blob) => void;
  onStreamReady: (stream: MediaStream) => void;
  onError: (msg: string) => void;
}

export const Recorder: React.FC<RecorderProps> = ({ 
  aspectRatio, 
  isRecording, 
  onRecordingComplete, 
  onStreamReady,
  onError 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationFrameRef = useRef<number>();
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Gemini Hook
  const { currentQuestion, setCurrentQuestion, isConnected } = useGeminiInterviewer({ 
    isActive: isRecording, 
    audioStream: stream 
  });

  // 1. Initialize Camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user"
          },
          audio: true
        });
        
        setStream(mediaStream);
        onStreamReady(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } catch (err) {
        onError("Could not access camera or microphone. Please allow permissions.");
        console.error(err);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Canvas Drawing Loop (Crop & Render)
  const draw = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const config: VideoConfig = ASPECT_RATIO_CONFIGS[aspectRatio];
    
    // Set canvas internal resolution
    if (canvas.width !== config.width || canvas.height !== config.height) {
        canvas.width = config.width;
        canvas.height = config.height;
    }

    // Calculate Crop (Center crop)
    // Source dimensions
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const vRatio = vw / vh;
    const cRatio = config.width / config.height;
    
    let sx, sy, sWidth, sHeight;

    if (vRatio > cRatio) {
        // Video is wider than canvas -> crop width
        sHeight = vh;
        sWidth = vh * cRatio;
        sy = 0;
        sx = (vw - sWidth) / 2;
    } else {
        // Video is taller than canvas -> crop height
        sWidth = vw;
        sHeight = vw / cRatio;
        sx = 0;
        sy = (vh - sHeight) / 2;
    }

    // Draw video frame
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, config.width, config.height);

    // Apply soft filter (optional, macaron vibe)
    // ctx.fillStyle = 'rgba(255, 230, 240, 0.05)'; // subtle rose tint
    // ctx.fillRect(0,0, config.width, config.height);

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [aspectRatio]);

  useEffect(() => {
    if (stream) {
       animationFrameRef.current = requestAnimationFrame(draw);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [draw, stream]);

  // 3. Handle Recording Logic
  useEffect(() => {
    if (isRecording) {
        // Start Recording
        if (!canvasRef.current) return;
        
        const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
        // Add audio track from original stream
        if (stream) {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                canvasStream.addTrack(audioTracks[0]);
            }
        }

        const recorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
            onRecordingComplete(blob);
            setCurrentQuestion(""); // Clear question on stop
        };

        recorder.start();

    } else {
        // Stop Recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }
  }, [isRecording, stream, onRecordingComplete, setCurrentQuestion]);

  // Handle manual clearing of questions (if we wanted to close it via UI)
  const handleCloseQuestion = () => setCurrentQuestion("");

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-50 rounded-3xl shadow-inner border-4 border-white">
        {/* Hidden Source Video */}
        <video 
            ref={videoRef} 
            className="absolute opacity-0 pointer-events-none" 
            playsInline 
            muted // Mute local playback to avoid feedback
        />

        {/* The Output Canvas */}
        <canvas 
            ref={canvasRef}
            className="block max-w-full max-h-full object-contain rounded-xl shadow-lg transition-all duration-500 ease-in-out"
            style={{
                aspectRatio: `${ASPECT_RATIO_CONFIGS[aspectRatio].width} / ${ASPECT_RATIO_CONFIGS[aspectRatio].height}`
            }}
        />

        {/* AI Overlay Layer */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-20 px-6">
             {/* Connection Status Indicator */}
             <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
                 {isConnected ? 'AI Listening' : 'AI Connecting...'}
             </div>

             {/* Question Bubble */}
             <div 
               className={`
                  transition-all duration-700 ease-out transform origin-bottom
                  ${currentQuestion ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}
                  bg-white/90 backdrop-blur-lg border border-white/50
                  p-6 rounded-2xl shadow-xl max-w-md text-center
               `}
             >
                <p className="text-xl md:text-2xl font-bold text-slate-700 leading-tight">
                   {currentQuestion}
                </p>
                <div className="mt-2 flex justify-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                  <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
             </div>
          </div>
        )}

        {!stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 animate-pulse">
                <span>Loading Camera...</span>
            </div>
        )}
    </div>
  );
};
