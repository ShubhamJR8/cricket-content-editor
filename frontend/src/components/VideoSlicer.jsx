import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, Check, X, FileVideo } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const VideoSlicer = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [backendPath, setBackendPath] = useState('../input.mp4');
  
  const videoRef = useRef(null);
  const playheadRef = useRef(null);
  const trackerRef = useRef(null);
  const activeBoxRef = useRef(null);
  const timelineRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Array of { start: number, end: number | null }
  const [segments, setSegments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setBackendPath(`/Users/shubhamjunior/Documents/raw_videos/${file.name}`);
    }
  };

  const loadDemoVideo = () => {
    setVideoFile({ name: 'Big Buck Bunny (Demo)' });
    setVideoUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    setBackendPath('../input.mp4');
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleImport = () => {
    // Match any time format like 01:33, 1:33, or 01:05:33
    const regex = /(?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}/g;
    const matches = importText.match(regex);
    if (!matches) {
       alert("No valid timeslots found in the text.");
       return;
    }

    let newSegments = [...segments];
    // Clear the active open segment if user was creating one
    if (newSegments.length > 0 && newSegments[newSegments.length - 1].end === null) {
      newSegments.pop();
    }

    const timeToSeconds = (timeStr) => {
      const parts = timeStr.split(':').reverse();
      let secs = 0;
      for (let i = 0; i < parts.length; i++) {
        secs += parseInt(parts[i], 10) * Math.pow(60, i);
      }
      return secs;
    };

    for (let i = 0; i < matches.length; i += 2) {
      const start = timeToSeconds(matches[i]);
      // If there's an odd number of timestamps, the last one becomes an open segment
      const end = i + 1 < matches.length ? timeToSeconds(matches[i + 1]) : null;
      newSegments.push({ start, end });
    }

    // Sort chronologically just in case they were pasted out of order
    newSegments.sort((a, b) => a.start - b.start);
    setSegments(newSegments);
    setImportText("");
    setShowImport(false);
  };

  // GPU Accelerated 60fps native tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current || !duration) return;
    const current = videoRef.current.currentTime;
    
    // Natively update DOM elements
    if (timelineRef.current) {
        const timelineWidth = timelineRef.current.offsetWidth;
        const currentPx = (current / duration) * timelineWidth;
        if (playheadRef.current) {
            playheadRef.current.style.transform = `translateX(${currentPx}px)`;
        }
    }
    
    if (trackerRef.current) {
        trackerRef.current.innerText = `${formatTime(current)} / ${formatTime(duration)}`;
    }
    
    if (activeBoxRef.current && activeBoxRef.current.dataset.start) {
        const start = parseFloat(activeBoxRef.current.dataset.start);
        const startPct = (start / duration) * 100;
        const endPct = (current / duration) * 100;
        activeBoxRef.current.style.width = `${Math.max(0, endPct - startPct)}%`;
    }

    // Instant Preview Logic:
    // If we have completed segments, and playhead is NOT inside any keep segment, skip to the next keep segment.
    // For MVP, this might be tricky if we're constantly skipping while dragging, so let's check only if it's playing.
    if (isPlaying && segments.length > 0) {
      let isInsideKeep = false;
      let nextKeepStart = null;
      
      const current = videoRef.current.currentTime;
      
      for (const seg of segments) {
        if (seg.end !== null) {
          if (current >= seg.start && current < seg.end) {
            isInsideKeep = true;
            break;
          }
          if (seg.start > current) {
            if (nextKeepStart === null || seg.start < nextKeepStart) {
              nextKeepStart = seg.start;
            }
          }
        } else {
          // Open segment, we are "keeping" from here onwards for now
          if (current >= seg.start) {
            isInsideKeep = true;
            break;
          }
        }
      }

      // If we are definitely outside all keep zones and there's a next zone, jump to it
      // if (!isInsideKeep && nextKeepStart !== null) {
      //   videoRef.current.currentTime = nextKeepStart;
      // }
      // NOTE: This can be a bit jarring without a toggle, so keeping it simple for the MVP core.
    }
  };

  const handleLoadedData = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Wait for duration state to propagate, then snap UI
      setTimeout(handleTimeUpdate, 100);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName.toLowerCase() === 'input') return;

      if (e.key.toLowerCase() === 'm') {
        dropMarker();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowLeft') {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          if (!isPlaying) setTimeout(handleTimeUpdate, 10);
        }
      }
      if (e.key === 'ArrowRight') {
        if (videoRef.current) {
          videoRef.current.currentTime += 10;
          if (!isPlaying) setTimeout(handleTimeUpdate, 10);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]); // Removed currentTime and segments to prevent constant re-attachment. Functions below will read from fresh ref or prev state.

  const dropMarker = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    
    setSegments(prev => {
      const newSegments = [...prev];
      const lastSeg = newSegments[newSegments.length - 1];
      
      if (!lastSeg || lastSeg.end !== null) {
        // Need a new start marker
        // "Vibe Buffer": automatically shift start back by 2 seconds
        const bufferedStart = Math.max(0, current - 2);
        newSegments.push({ start: bufferedStart, end: null });
      } else {
        // Complete the current marker
        const updatedSeg = { ...lastSeg };
        if (current <= updatedSeg.start) {
            updatedSeg.end = updatedSeg.start + 1; // 1 sec fallback
        } else {
            updatedSeg.end = current;
        }
        newSegments[newSegments.length - 1] = updatedSeg;
      }
      return newSegments;
    });
  };

  const removeSegment = (idx) => {
    setSegments(prev => prev.filter((_, i) => i !== idx));
  };

  // Slicing logic
  const handleApplyCuts = async () => {
    // Filter out incomplete
    const completeSegments = segments.filter(s => s.end !== null);
    if (completeSegments.length === 0) {
      setResultMsg("No complete segments to cut.");
      return;
    }

    setIsProcessing(true);
    setResultMsg("Slicing exactly on keyframes (-c copy) on backend...");

    try {
      const payload = {
        inputFile: backendPath,
        outputFile: `output_${Date.now()}.mp4`,
        segments: completeSegments
      };

      const res = await axios.post('http://localhost:8080/api/video/slice', payload);
      setResultMsg(`Success: ${res.data}`);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message;
      setResultMsg(`Error: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const jumpTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleTimelineClick = (e) => {
    if (!videoRef.current || !duration || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    videoRef.current.currentTime = newTime;
    if (!isPlaying) setTimeout(handleTimeUpdate, 10);
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (num) => num.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Settings Bar */}
      <div className="p-4 bg-zinc-950 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-800">
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition">
            <FileVideo size={18} />
            <span className="text-sm font-medium">{videoFile ? videoFile.name : 'Load Local Video'}</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
          <button 
            type="button" 
            onClick={loadDemoVideo} 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            Load Demo Video
          </button>
        </div>
        
        <div className="flex items-center gap-2">
           <span className="text-zinc-500 text-xs text-right leading-tight overflow-hidden">Server Video Path<br/>(Absolute Path)</span>
           <input 
             type="text" 
             className="bg-zinc-800 text-white text-xs px-2 py-1.5 rounded border border-zinc-700 focus:outline-none focus:border-red-500 w-64 md:w-80"
             value={backendPath}
             onChange={(e) => setBackendPath(e.target.value)}
             title="Must accurately match the physical absolute path to the video on the system running Backend Java Server"
           />
        </div>
      </div>

      {/* Video Player */}
      <div className="relative w-full max-h-[55vh] aspect-video bg-black flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={handleLoadedData}
            onClick={togglePlay}
          />
        ) : (
          <div className="text-zinc-600 flex flex-col items-center">
            <VideoPlaceholder />
            <p className="mt-4 text-sm font-medium">Please load a local video to begin</p>
          </div>
        )}

        {/* Play Overlay */}
        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm shadow-xl">
               <Play size={48} className="text-white ml-2" />
             </div>
          </div>
        )}
      </div>

      {/* Controller & Timeline Area */}
      <div className="p-6 bg-zinc-900">
         {/* Timeline & Actions Area */}
         <div className="flex flex-col md:flex-row gap-6 items-center">
             {/* Timeline */}
             <div 
               ref={timelineRef}
               className="relative flex-1 w-full h-16 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 cursor-crosshair"
               onClick={handleTimelineClick}
             >
                {/* Playhead */}
                <div 
                   ref={playheadRef}
                   className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                   style={{ left: 0, transform: `translateX(0px)` }}
                   title="Playhead"
                >
                   <div className="w-3 h-3 bg-red-500 transform -translate-x-1.5 -translate-y-1.5 rounded-full shadow-lg" />
                </div>

                {/* Segments (Keep Zones) */}
                {duration > 0 && segments.map((seg, i) => {
                  const startPct = (seg.start / duration) * 100;
                  const isCurrent = seg.end === null;
                  
                  // For completed segments, render width normally. For active, bootstrap width to 0 and let DOM driver handle it.
                  const endPct = isCurrent ? startPct : (seg.end / duration) * 100;
                  
                  return (
                    <div 
                      key={i} 
                      ref={isCurrent ? activeBoxRef : null}
                      data-start={seg.start}
                      className={`absolute top-0 bottom-0 flex items-center z-10 transition-colors ${isCurrent ? 'bg-indigo-500/30 border-l-2 border-indigo-400' : 'bg-emerald-500/40 border-l-2 border-r-2 border-emerald-400'}`}
                      style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                    >
                      <div className="text-[10px] uppercase font-bold tracking-widest text-white/50 w-full text-center truncate">Keep</div>
                    </div>
                  );
                })}
             </div>

             {/* Actions */}
             <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                <div className="flex justify-between items-center px-1 mb-1">
                  <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Tracker</span>
                  <span ref={trackerRef} className="text-sm text-zinc-300 font-mono">
                    {formatTime(0)} / {formatTime(duration)}
                  </span>
                </div>
                <button 
                  disabled={isProcessing || segments.length === 0}
                  onClick={handleApplyCuts}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                  {isProcessing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Check size={20} />
                    </motion.div>
                  ) : (
                    <Scissors size={20} />
                  )}
                  {isProcessing ? 'Splicing...' : 'Apply Cuts'}
                </button>
                {resultMsg && (
                  <p className="text-xs text-zinc-400 text-center mt-1 w-full truncate" title={resultMsg}>
                    {resultMsg}
                  </p>
                )}
             </div>
         </div>

         {/* Segments List Panel */}
         <div className="mt-8">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">Keep Segments</h3>
               {duration > 0 && (
                 <button 
                    onClick={() => setShowImport(!showImport)} 
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 px-3 py-1.5 rounded transition"
                 >
                   Bulk Import
                 </button>
               )}
            </div>

            {showImport && (
               <div className="mb-4 bg-zinc-800/80 p-4 rounded-lg border border-zinc-700 shadow-inner">
                 <p className="text-xs text-zinc-400 mb-2">Paste raw text containing any timestamps (e.g., <span className="font-mono text-zinc-300">01:33</span>). Pairs will be automatically linked together!</p>
                 <textarea 
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="► 01:33\n■ 01:39\n\n► 01:52\n■ 01:57"
                    className="w-full h-28 bg-zinc-950 text-zinc-300 p-3 rounded border border-zinc-700 text-sm font-mono mb-3 focus:outline-none focus:border-indigo-500 transition resize-y"
                 />
                 <button onClick={handleImport} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm text-white font-bold transition shadow-lg">Parse & Apply Segments</button>
               </div>
            )}

            <div className="space-y-3">
               {segments.length === 0 ? (
                 <p className="text-zinc-600 text-sm">No cut markers placed. Press 'M' to start a keep zone.</p>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                   {segments.map((seg, i) => (
                     <div key={i} className="bg-zinc-800 rounded px-3 py-2 flex items-center justify-between text-sm border border-zinc-700">
                       <div className="flex flex-col gap-1">
                         <span className="text-emerald-400 font-mono cursor-pointer hover:underline" onClick={() => jumpTo(seg.start)} title="Jump to start">
                            ► {formatTime(seg.start)}
                         </span>
                         <span className="text-rose-400 font-mono">
                            ■ {seg.end !== null ? formatTime(seg.end) : 'Pending...'}
                         </span>
                       </div>
                       <button onClick={() => removeSegment(i)} className="text-zinc-500 hover:text-white p-2">
                         <X size={16} />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

const VideoPlaceholder = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
    <path d="M15 10l5-4v12l-5-4V10z" />
    <rect x="4" y="6" width="11" height="12" rx="2" ry="2" />
  </svg>
)

export default VideoSlicer;
