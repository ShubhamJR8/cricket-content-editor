import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import { VideoEditorProvider, useVideoEditor } from '../context/VideoEditorContext';
import VideoPlayer from './VideoPlayer';
import TimelineControls from './TimelineControls';
import WorkspacePanel from './WorkspacePanel';

const VideoEditorLayout = () => {
  const { 
    videoFile, 
    handleFileChange, 
    loadDemoVideo, 
    outputPath,
    selectOutputFolderViaElectron
  } = useVideoEditor();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (useVideoEditor().killSwitchError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-2xl max-w-lg text-center shadow-2xl">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Beta Locked</h2>
          <p className="text-zinc-300">{useVideoEditor().killSwitchError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-screen max-h-screen">
      {/* HEADER */}
      <div className="p-4 bg-zinc-950 flex flex-wrap gap-4 items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex flex-wrap gap-2">
          
          <button
            type="button"
            onClick={handleFileChange}
            className="flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-lg shadow-indigo-500/20"
          >
            <FolderOpen size={18} />
            <span>{videoFile ? videoFile.name : 'Select Match'}</span>
          </button>
          
          <button
            type="button"
            onClick={loadDemoVideo}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition text-sm font-medium border border-zinc-700"
          >
            Demo
          </button>

          {useVideoEditor().isBetaExpired ? (
            <button
              type="button"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg transition text-sm font-bold border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              title="Upgrade to Pro version"
            >
              Upgrade to Pro
            </button>
          ) : useVideoEditor().isBetaActive ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 bg-green-600/20 text-green-500 px-4 py-2 rounded-lg transition text-sm font-medium border border-green-600/50 cursor-default"
              title="Beta is currently active"
            >
              <CheckCircle size={16} />
              Beta Active
            </button>
          ) : (
            <button
              type="button"
              onClick={useVideoEditor().handleActivateLicense}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium border ${useVideoEditor().needsActivation ? 'bg-amber-500 text-black animate-pulse border-amber-400' : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border-amber-600/50'}`}
              title="Start your 30-Day Free Beta"
            >
              Start Free Beta
            </button>
          )}
        </div>

        <div className="relative group" ref={settingsRef}>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition text-xs font-medium border border-zinc-700 select-none"
          >
            Advanced Settings
          </button>
          
          {showSettings && (
            <div className="absolute right-0 top-12 z-50 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[300px]">
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Output Folder</span>
                <div className="flex items-center bg-zinc-950 rounded border border-zinc-700 overflow-hidden">
                  <input
                    type="text"
                    readOnly
                    className="bg-transparent text-white text-xs px-2 py-2 w-full focus:outline-none cursor-default"
                    value={outputPath}
                    title={outputPath}
                  />
                  <button
                    onClick={selectOutputFolderViaElectron}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 transition flex items-center justify-center border-l border-zinc-700"
                    title="Change Output Folder"
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN SPLIT WORKSPACE */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Video & Timeline */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col bg-zinc-950 border-r border-zinc-800 shrink-0 relative">
          <VideoPlayer />
          <TimelineControls />
        </div>

        {/* RIGHT COLUMN: Workspace (Bags & Segments) */}
        <WorkspacePanel />
      </div>
    </div>
  );
};

const VideoSlicer = () => {
  return (
    <VideoEditorProvider>
      <VideoEditorLayout />
    </VideoEditorProvider>
  );
};

export default VideoSlicer;
