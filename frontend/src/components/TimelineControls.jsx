import React from 'react';
import { Scissors, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVideoEditor } from '../context/VideoEditorContext';

const TimelineControls = () => {
  const { 
    trackerRef, formatTime, duration, isProcessing, segments, handleApplyCuts, resultMsg, 
    timelineRef, handleTimelineClick, playheadRef, activeBoxRef, videoFile 
  } = useVideoEditor();

  const isClipping = segments.some(s => s.end === null);
  const hasSegments = segments.length > 0;
  const noVideoLoaded = !videoFile;

  return (
    <div className="p-4 sm:p-6 bg-zinc-900 border-t border-zinc-800 shrink-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Tracker</span>
            <span ref={trackerRef} className="text-sm text-zinc-300 font-mono">
              {formatTime(0)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <button
              disabled={isProcessing || segments.length === 0 || noVideoLoaded}
              onClick={handleApplyCuts}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg transition shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              title={noVideoLoaded && hasSegments ? 'Load a video file first to apply cuts' : ''}
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
              <p className="text-[10px] text-zinc-400 text-right mt-1 max-w-[200px] truncate" title={resultMsg}>
                {resultMsg}
              </p>
            )}
            {noVideoLoaded && hasSegments && (
              <p className="text-[10px] text-amber-400 text-right mt-1 font-medium">
                ⚠ Load a video to enable Apply Cuts
              </p>
            )}
          </div>
        </div>

        <div
          ref={timelineRef}
          className="relative w-full h-14 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 cursor-crosshair"
          onClick={handleTimelineClick}
        >
          {/* Embedded Timeline Ruler */}
          {duration > 0 && [...Array(11)].map((_, i) => {
            const pct = i * 10;
            const time = duration * (i / 10);
            const isFirst = i === 0;
            const isLast = i === 10;
            const showLabel = i % 2 === 0; // Only show text every 20%
            return (
              <div 
                key={`tick-${i}`} 
                className="absolute bottom-0 flex flex-col items-center pointer-events-none opacity-40 z-0" 
                style={{ 
                  left: `${pct}%`, 
                  transform: isFirst ? 'translateX(4px)' : isLast ? 'translateX(calc(-100% - 4px))' : 'translateX(-50%)' 
                }}
              >
                {showLabel && <span className="text-[9px] text-zinc-300 font-mono mb-0.5 select-none">{formatTime(time)}</span>}
                <div className={`w-px ${showLabel ? 'h-2' : 'h-1.5'} bg-zinc-400`} />
              </div>
            );
          })}

          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ left: 0, transform: `translateX(0px)` }}
            title="Playhead"
          >
            <div className="w-3 h-3 bg-red-500 transform -translate-x-1.5 -translate-y-1.5 rounded-full shadow-lg" />
          </div>

          {duration > 0 && segments.map((seg, i) => {
            const startPct = (seg.start / duration) * 100;
            const isCurrent = seg.end === null;
            const endPct = isCurrent ? startPct : (seg.end / duration) * 100;

            return (
              <div
                key={seg.id}
                ref={isCurrent ? activeBoxRef : null}
                data-start={seg.start}
                className={`absolute top-0 bottom-0 flex items-center z-10 transition-colors ${isCurrent ? 'bg-indigo-500/30 border-l-2 border-indigo-400' : 'bg-emerald-500/40 border-l-2 border-r-2 border-emerald-400'}`}
                style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-zinc-500">Click timeline to jump</div>
          
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 shadow-md flex items-center gap-2 ${isClipping ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
            {isClipping ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Recording... Press 'M' to End Clip
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                Press 'M' to Start Clip (-2s buffer)
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineControls;
