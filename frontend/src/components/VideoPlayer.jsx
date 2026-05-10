import React from 'react';
import { Play } from 'lucide-react';
import { useVideoEditor } from '../context/VideoEditorContext';

const VideoPlaceholder = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
    <path d="M15 10l5-4v12l-5-4V10z" />
    <rect x="4" y="6" width="11" height="12" rx="2" ry="2" />
  </svg>
);

const VideoPlayer = () => {
  const { videoUrl, videoRef, handleTimeUpdate, handleLoadedData, togglePlay, isPlaying, setIsPlaying } = useVideoEditor();

  return (
    <div className="flex-1 relative flex items-center justify-center p-4 bg-black">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full max-h-[65vh] object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={handleLoadedData}
          onClick={togglePlay}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <div className="text-zinc-600 flex flex-col items-center">
          <VideoPlaceholder />
          <p className="mt-4 text-sm font-medium">Please load a local video to begin</p>
        </div>
      )}

      {!isPlaying && videoUrl && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm shadow-xl">
            <Play size={48} className="text-white ml-2" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
