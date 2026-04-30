import React, { useState } from 'react';
import { FileVideo, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { VideoEditorProvider, useVideoEditor } from '../context/VideoEditorContext';
import VideoPlayer from './VideoPlayer';
import TimelineControls from './TimelineControls';
import WorkspacePanel from './WorkspacePanel';

const VideoEditorLayout = () => {
  const { videoFile, handleFileChange, loadDemoVideo, backendPath, setBackendPath } = useVideoEditor();
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

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-2rem)] min-h-[800px]">
      {/* HEADER */}
      <div className="p-4 bg-zinc-950 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-800 shrink-0">
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
          <span className="text-zinc-500 text-xs text-right leading-tight overflow-hidden">Server Video Path<br />(Absolute Path)</span>
          <div className="relative flex items-center">
            <input
              type="text"
              className={`bg-zinc-800 text-white text-xs px-2 py-1.5 rounded-l border ${pathStatus === 'success' ? 'border-green-500' : pathStatus === 'error' ? 'border-red-500' : 'border-zinc-700'} focus:outline-none focus:border-indigo-500 w-64 md:w-80`}
              value={backendPath}
              onChange={(e) => {
                setBackendPath(e.target.value);
                setPathStatus(null);
              }}
              title="Must match the physical absolute path to the video on the system running Backend Java Server"
            />
            <button
              onClick={verifyPath}
              disabled={isVerifying || !backendPath}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-r border-y border-r border-zinc-700 text-xs font-medium transition flex items-center justify-center min-w-[60px]"
            >
              {isVerifying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : pathStatus === 'success' ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : pathStatus === 'error' ? (
                <XCircle size={14} className="text-red-500" />
              ) : (
                'Verify'
              )}
            </button>
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
