import React, { useState, useEffect } from 'react';
import { AspectRatio } from './types';
import { Recorder } from './components/Recorder';
import { AspectRatioSelector } from './components/AspectRatioSelector';

function App() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT_9_16);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStream, setHasStream] = useState(false);

  const handleRecordingComplete = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setRecordedUrl(url);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setRecordedUrl(null); // Clear previous recording
      setIsRecording(true);
    }
  };

  const handleDownload = () => {
    if (recordedUrl) {
      const a = document.createElement('a');
      a.href = recordedUrl;
      a.download = `musecam-${new Date().toISOString()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDiscard = () => {
    setRecordedUrl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex flex-col items-center p-4 md:p-8">
      
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-white font-bold text-lg shadow-md">
                M
            </div>
            <h1 className="text-2xl font-bold text-slate-700 tracking-tight">MuseCam</h1>
        </div>
        
        {!isRecording && (
          <AspectRatioSelector 
            selected={aspectRatio} 
            onChange={setAspectRatio} 
            disabled={isRecording || !!recordedUrl}
          />
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center relative">
        
        <div className="relative w-full h-[65vh] md:h-[75vh] flex justify-center">
            
            {/* Error Toast */}
            {error && (
                <div className="absolute top-0 z-50 bg-red-100 border border-red-200 text-red-600 px-4 py-2 rounded-lg shadow-sm">
                    {error}
                </div>
            )}

            {recordedUrl ? (
                // Preview Mode
                <div className="relative h-full flex flex-col items-center justify-center">
                    <video 
                        src={recordedUrl} 
                        controls 
                        className="max-h-full max-w-full rounded-2xl shadow-xl border-4 border-white bg-black"
                    />
                    <div className="absolute bottom-6 flex gap-4">
                        <button 
                            onClick={handleDiscard}
                            className="bg-white text-slate-600 px-6 py-2.5 rounded-full font-semibold shadow-lg hover:bg-slate-50 transition transform hover:scale-105"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="bg-gradient-to-r from-teal-400 to-emerald-400 text-white px-8 py-2.5 rounded-full font-semibold shadow-lg hover:shadow-emerald-200 transition transform hover:scale-105 flex items-center gap-2"
                        >
                            <span>Download MP4</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-7.5-7.5M12 12.75l7.5-7.5M12 12.75V3" />
                            </svg>
                        </button>
                    </div>
                </div>
            ) : (
                // Recording Mode
                <Recorder 
                    aspectRatio={aspectRatio}
                    isRecording={isRecording}
                    onRecordingComplete={handleRecordingComplete}
                    onStreamReady={() => setHasStream(true)}
                    onError={setError}
                />
            )}
        </div>

      </main>

      {/* Footer / Controls */}
      <footer className="w-full max-w-md mt-6 flex justify-center items-center pb-6">
        {!recordedUrl && (
            <div className="flex items-center gap-6">
                
                <div className={`text-slate-400 text-sm font-medium transition-opacity ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="animate-pulse text-red-500 mr-1">●</span> Recording
                </div>

                <button 
                    onClick={handleToggleRecord}
                    disabled={!hasStream}
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-4 border-white transition-all duration-300
                        ${isRecording 
                            ? 'bg-red-50 text-red-500 hover:bg-red-100 scale-110' 
                            : 'bg-gradient-to-tr from-rose-400 to-orange-400 text-white hover:scale-110 hover:shadow-rose-200'}
                        ${!hasStream ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                    `}
                >
                    {isRecording ? (
                        <div className="w-6 h-6 bg-red-500 rounded-md"></div>
                    ) : (
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                    )}
                </button>

                <div className={`text-slate-400 text-sm font-medium transition-opacity ${isRecording ? 'opacity-0' : 'opacity-100'}`}>
                    Tap to Start
                </div>
            </div>
        )}
      </footer>
    </div>
  );
}

export default App;
