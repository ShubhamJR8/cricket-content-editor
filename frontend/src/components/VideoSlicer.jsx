import React, { useState } from 'react';
import { FileVideo, CheckCircle, XCircle, Loader2, FolderOpen } from 'lucide-react';
import { VideoEditorProvider, useVideoEditor } from '../context/VideoEditorContext';
import VideoPlayer from './VideoPlayer';
import TimelineControls from './TimelineControls';
import WorkspacePanel from './WorkspacePanel';

const VideoEditorLayout = () => {
  const { 
    videoFile, 
    handleFileChange, 
    loadDemoVideo, 
    backendPath, 
    setBackendPath,
    selectVideoViaElectron,
    outputPath,
    selectOutputFolderViaElectron
  } = useVideoEditor();
  const [isVerifying, setIsVerifying] = useState(false);
  const [pathStatus, setPathStatus] = useState(null);

  const verifyPath = async () => {
    if (!backendPath) return;
    setIsVerifying(true);
    setPathStatus(null);
    try {
      const response = await fetch('http://localhost:8080/api/video/verify-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: backendPath }),
      });
      const data = await response.json();
      setPathStatus(data.exists ? 'success' : 'error');
    } catch (error) {
      console.error("Error verifying path:", error);
      setPathStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

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
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-2rem)] min-h-[800px]">
      {/* HEADER */}
      <div className="p-4 bg-zinc-950 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectVideoViaElectron}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-lg shadow-indigo-500/20"
          >
            <FolderOpen size={18} />
            <span>Select Match</span>
          </button>
          
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition border border-zinc-700">
            <FileVideo size={18} />
            <span className="text-sm font-medium">{videoFile ? videoFile.name : 'Preview Video'}</span>
            <input type="file" id="hidden-file-input" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
          
          <button
            type="button"
            onClick={loadDemoVideo}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition text-sm font-medium border border-zinc-700"
          >
            Demo
          </button>

          <button
            type="button"
            onClick={useVideoEditor().handleActivateLicense}
            className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 px-4 py-2 rounded-lg transition text-sm font-medium border border-amber-600/50"
            title="Start your 30-Day Free Beta"
          >
            Start Free Beta
          </button>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px] text-right leading-tight">Server Video Path<br />(Absolute Path)</span>
            <div className="relative flex items-center">
              <input
                type="text"
                className={`bg-zinc-800 text-white text-xs px-2 py-1.5 rounded-l border ${pathStatus === 'success' ? 'border-green-500' : pathStatus === 'error' ? 'border-red-500' : 'border-zinc-700'} focus:outline-none focus:border-indigo-500 w-48 md:w-64`}
                value={backendPath}
                onChange={(e) => {
                  setBackendPath(e.target.value);
                  setPathStatus(null);
                }}
                title="Absolute path to the video"
              />
              <button
                onClick={verifyPath}
                disabled={isVerifying || !backendPath}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-r border-y border-r border-zinc-700 text-xs font-medium transition flex items-center justify-center"
              >
                {isVerifying ? <Loader2 size={12} className="animate-spin" /> : 'Verify'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px] text-right">Output Folder</span>
            <div className="flex items-center bg-zinc-800 rounded border border-zinc-700 overflow-hidden">
              <input
                type="text"
                readOnly
                className="bg-transparent text-white text-[11px] px-2 py-1 w-48 md:w-64 focus:outline-none cursor-default"
                value={outputPath}
                title={outputPath}
              />
              <button
                onClick={selectOutputFolderViaElectron}
                className="bg-zinc-700 hover:bg-zinc-600 text-white p-1.5 transition flex items-center justify-center border-l border-zinc-600"
                title="Change Output Folder"
              >
                <FolderOpen size={14} />
              </button>
            </div>
          </div>
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
