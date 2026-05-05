import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';

const VideoEditorContext = createContext();

export const useVideoEditor = () => useContext(VideoEditorContext);

const generateId = () => 'seg_' + Date.now() + Math.random().toString(36).substr(2, 9);

export const VideoEditorProvider = ({ children }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [backendPath, setBackendPath] = useState(() => {
    const saved = localStorage.getItem('editor_backendPath');
    return saved || '../input.mp4';
  });

  const [outputPath, setOutputPath] = useState(() => {
    const saved = localStorage.getItem('editor_outputPath');
    if (saved) return saved;
    const isElectron = window.process && window.process.type === 'renderer' || 
                      (window.require && window.require('electron'));
    if (isElectron) {
      const home = window.process.env.HOME || window.process.env.USERPROFILE;
      if (home) {
        // Use forward slashes for cross-platform compatibility in many libs, 
        // but Electron path join is better. 
        return `${home.replace(/\\/g, '/')}/Downloads/Cricket_Edits`;
      }
    }
    return 'result';
  });

  const videoRef = useRef(null);
  const playheadRef = useRef(null);
  const trackerRef = useRef(null);
  const activeBoxRef = useRef(null);
  const timelineRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('editor_players');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      } catch(e) {}
    }
    return [
      { id: 'player_1', name: 'Player 1' },
      { id: 'player_2', name: 'Player 2' },
    ];
  });

  const [segments, setSegments] = useState(() => {
    const saved = localStorage.getItem('editor_segments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      } catch(e) {}
    }
    return [];
  });

  const [downloadUrls, setDownloadUrls] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [killSwitchError, setKillSwitchError] = useState("");

  useEffect(() => {
    const checkKillSwitch = async () => {
      try {
        const res = await axios.get("https://raw.githubusercontent.com/ShubhamJR8/cricket-content-editor/main/beta-status.json");
        if (res.data && res.data.active === false) {
           setKillSwitchError("This Beta has concluded. Please visit our website to upgrade to the paid version.");
        }
        localStorage.setItem('editor_last_network_check', Date.now().toString());
      } catch (err) {
        // Air gap check
        const lastCheck = localStorage.getItem('editor_last_network_check');
        if (!lastCheck) {
           setKillSwitchError("Internet connection required for initial beta verification.");
        } else {
           const timeSince = Date.now() - parseInt(lastCheck);
           if (timeSince > 3 * 24 * 60 * 60 * 1000 || timeSince < 0) {
              setKillSwitchError("App has been offline for too long. Please connect to the internet to verify beta status.");
           }
        }
      }
    };
    checkKillSwitch();
  }, []);

  useEffect(() => {
    localStorage.setItem('editor_players', JSON.stringify({ timestamp: Date.now(), data: players }));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('editor_segments', JSON.stringify({ timestamp: Date.now(), data: segments }));
  }, [segments]);

  useEffect(() => {
    localStorage.setItem('editor_backendPath', backendPath);
  }, [backendPath]);

  useEffect(() => {
    localStorage.setItem('editor_outputPath', outputPath);
  }, [outputPath]);

  const clearSession = () => {
    if (window.confirm("Are you sure you want to clear all clips and players? This cannot be undone.")) {
      setSegments([]);
      setPlayers([
        { id: 'player_1', name: 'Player 1' },
        { id: 'player_2', name: 'Player 2' },
      ]);
      localStorage.removeItem('editor_segments');
      localStorage.removeItem('editor_players');
    }
  };

  const addPlayer = () => {
    const newId = 'player_' + Date.now();
    setPlayers(prev => [...prev, { id: newId, name: `Player ${prev.length + 1}` }]);
  };

  const updatePlayerName = (id, newName) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const removeSegment = (id) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (num) => num.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !duration) return;
    const current = videoRef.current.currentTime;

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
  };

  const handleLoadedData = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTimeout(handleTimeUpdate, 100);
    }
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

  const jumpTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const dropMarker = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;

    setSegments(prev => {
      const newSegments = [...prev];
      const lastSeg = newSegments[newSegments.length - 1];

      if (!lastSeg || lastSeg.end !== null) {
        const bufferedStart = Math.max(0, current - 2);
        newSegments.push({ id: generateId(), start: bufferedStart, end: null, playerId: null });
      } else {
        const updatedSeg = { ...lastSeg };
        if (current - updatedSeg.start < 1) {
          updatedSeg.end = updatedSeg.start + 1;
        } else {
          updatedSeg.end = current;
        }
        newSegments[newSegments.length - 1] = updatedSeg;
      }
      return newSegments;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;

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
  }, [isPlaying]);

  const handleTimelineClick = (e) => {
    if (!videoRef.current || !duration || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    videoRef.current.currentTime = newTime;
    if (!isPlaying) setTimeout(handleTimeUpdate, 10);
  };

  const handleApplyCuts = async () => {
    let currentSegments = [...segments];
    const lastSeg = currentSegments[currentSegments.length - 1];
    if (lastSeg && lastSeg.end === null && videoRef.current) {
      const current = videoRef.current.currentTime;
      const updatedSeg = { ...lastSeg };
      if (current - updatedSeg.start < 1) {
        updatedSeg.end = updatedSeg.start + 1;
      } else {
        updatedSeg.end = current;
      }
      currentSegments[currentSegments.length - 1] = updatedSeg;
      setSegments(currentSegments);
    }

    const completeSegments = currentSegments.filter(s => s.end !== null);
    if (completeSegments.length === 0) {
      setResultMsg("No complete segments to cut.");
      return;
    }

    const groupsMap = {};
    players.forEach(p => { groupsMap[p.id] = { player: p, segments: [] }; });
    groupsMap['unassigned'] = { player: { id: 'unassigned', name: 'Unassigned Clips' }, segments: [] };

    completeSegments.forEach(seg => {
      const targetId = seg.playerId || 'unassigned';
      if (groupsMap[targetId]) {
        groupsMap[targetId].segments.push({ start: seg.start, end: seg.end });
      }
    });

    const groups = Object.values(groupsMap).filter(g => g.segments.length > 0).map(g => {
      let sorted = [...g.segments].sort((a, b) => a.start - b.start);
      let merged = [];
      for (const seg of sorted) {
        if (merged.length === 0) {
          merged.push(seg);
        } else {
          let last = merged[merged.length - 1];
          if (seg.start <= last.end) {
            last.end = Math.max(last.end, seg.end);
          } else {
            merged.push(seg);
          }
        }
      }

      return {
        playerId: g.player.id,
        playerName: g.player.name,
        segments: merged
      };
    });

    if (groups.length === 0) {
      setResultMsg("No segments assigned to players. Please drag and drop clips to a player bag first.");
      return;
    }

    setIsProcessing(true);
    setResultMsg("Splicing exactly on keyframes per player...");
    setDownloadUrls([]);

    try {
      let machineId = "browser-dev-mode";
      const isElectron = window.process && window.process.type === 'renderer' || 
                        (window.require && window.require('electron'));
      if (isElectron) {
        const { ipcRenderer } = window.require('electron');
        machineId = await ipcRenderer.invoke('get-machine-id');
      }

      const payload = {
        inputFile: backendPath,
        resultDir: outputPath,
        groups: groups
      };

      const config = {
        headers: { 'X-Machine-ID': machineId }
      };

      const res = await axios.post('http://localhost:8080/api/video/slice-multi', payload, config);
      const jobId = res.data.jobId;

      if (!jobId) {
        setResultMsg("Error: Did not receive a valid Job ID from server.");
        setIsProcessing(false);
        return;
      }

      setResultMsg("Processing clips... please wait.");

      const pollStatus = async () => {
        try {
          const statusRes = await axios.get(`http://localhost:8080/api/video/status/${jobId}`);
          const status = statusRes.data;

          if (status.status === 'COMPLETED') {
            setResultMsg("Success: Multiple clips generated.");
            if (status.resultUrls) {
              setDownloadUrls(Object.values(status.resultUrls));
            }
            setIsProcessing(false);
          } else if (status.status === 'ERROR') {
            setResultMsg(`Error processing clips: ${status.message}`);
            setIsProcessing(false);
          } else {
            // PROCESSING
            setTimeout(pollStatus, 3000);
          }
        } catch (err) {
          console.error("Polling error:", err);
          setResultMsg("Error checking job status.");
          setIsProcessing(false);
        }
      };

      pollStatus();

    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setResultMsg(`License Error: ${err.response.data?.error || 'Invalid or Expired License. Please activate.'}`);
      } else {
        const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        setResultMsg(`Error: ${errorMsg}`);
      }
      setIsProcessing(false);
    }
  };

  const handleCopyUnassigned = () => {
    const unassigned = segments.filter(s => !s.playerId && s.end !== null);
    if (unassigned.length === 0) return;
    const text = unassigned.map(s => `${formatTime(s.start)} - ${formatTime(s.end)}`).join('\\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error(err);
      alert("Failed to copy. " + err);
    });
  };

  const handleBagImport = (playerId, text) => {
    const regex = /(?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}/g;
    const matches = text.match(regex);
    if (!matches) {
      alert("No valid timestamps found to import.");
      return;
    }

    const timeToSeconds = (timeStr) => {
      const parts = timeStr.split(':').reverse();
      let secs = 0;
      for (let i = 0; i < parts.length; i++) {
        secs += parseInt(parts[i], 10) * Math.pow(60, i);
      }
      return secs;
    };

    setSegments(prev => {
      let newSegments = [];
      for (let i = 0; i < matches.length; i += 2) {
        const start = timeToSeconds(matches[i]);
        const end = i + 1 < matches.length ? timeToSeconds(matches[i + 1]) : null;
        
        if (end !== null && start < end) {
          const exists = prev.some(s => s.playerId === playerId && s.start === start && s.end === end);
          const newlyAdded = newSegments.some(s => s.start === start && s.end === end);
          if (!exists && !newlyAdded) {
            newSegments.push({ id: generateId(), start, end, playerId });
          }
        }
      }
      return [...prev, ...newSegments];
    });
  };

  const handleImport = () => {
    const regex = /(?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}/g;
    const matches = importText.match(regex);
    if (!matches) {
      alert("No valid timeslots found in the text.");
      return;
    }

    const timeToSeconds = (timeStr) => {
      const parts = timeStr.split(':').reverse();
      let secs = 0;
      for (let i = 0; i < parts.length; i++) {
        secs += parseInt(parts[i], 10) * Math.pow(60, i);
      }
      return secs;
    };

    setSegments(prev => {
      let currentSegments = [...prev];
      if (currentSegments.length > 0 && currentSegments[currentSegments.length - 1].end === null) {
        currentSegments.pop();
      }

      let newSegments = [];
      for (let i = 0; i < matches.length; i += 2) {
        const start = timeToSeconds(matches[i]);
        const end = i + 1 < matches.length ? timeToSeconds(matches[i + 1]) : null;
        
        if (end !== null && start < end) {
          const exists = currentSegments.some(s => s.playerId === null && s.start === start && s.end === end);
          const newlyAdded = newSegments.some(s => s.start === start && s.end === end);
          
          if (!exists && !newlyAdded) {
            newSegments.push({ id: generateId(), start, end, playerId: null });
          }
        }
      }

      const finalSegments = [...currentSegments, ...newSegments];
      finalSegments.sort((a, b) => a.start - b.start);
      return finalSegments;
    });

    setImportText("");
    setShowImport(false);
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destBag = destination.droppableId === 'unassigned' ? null : destination.droppableId;

    setSegments((prev) => {
      const newSegments = [...prev];
      const index = newSegments.findIndex(s => s.id === draggableId);
      if (index !== -1) {
        newSegments[index] = { ...newSegments[index], playerId: destBag };
      }
      return newSegments;
    });
  };

  const selectVideoViaElectron = async () => {
    // Check if we are in Electron
    const isElectron = window.process && window.process.type === 'renderer' || 
                      (window.require && window.require('electron'));
    
    if (isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        const absolutePath = await ipcRenderer.invoke('open-file-dialog');
        if (absolutePath) {
          console.log("Selected absolute path:", absolutePath);
          setBackendPath(absolutePath);
          // We still need to trigger handleFileChange with a blob for preview if we want
          // But for now, setting the backend path is the priority for Point 3.
          // Optional: We could try to fetch the file via file:// protocol if security allows
        }
      } catch (err) {
        console.error("Failed to open Electron file dialog:", err);
      }
    } else {
      // Fallback for browser: trigger the hidden file input
      document.getElementById('hidden-file-input')?.click();
    }
  };

  const selectOutputFolderViaElectron = async () => {
    const isElectron = window.process && window.process.type === 'renderer' || 
                      (window.require && window.require('electron'));
    
    if (isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        const folderPath = await ipcRenderer.invoke('open-directory-dialog');
        if (folderPath) {
          setOutputPath(folderPath);
        }
      } catch (err) {
        console.error("Failed to open Electron directory dialog:", err);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setBackendPath(`/Users/shubhamjunior/Documents/raw_videos/${file.name}`);
    }
  };

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const loadDemoVideo = () => {
    setVideoFile({ name: 'Big Buck Bunny (Demo)' });
    setVideoUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    setBackendPath('../input.mp4');
  };

  const downloadAllFiles = () => {
    downloadUrls.forEach(url => {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        window.open(`http://localhost:8080${url.startsWith('/') ? url : '/' + url}`, '_blank');
      }
    });
  };



  const handleActivateLicense = async () => {
    try {
      let machineId = "browser-dev-mode";
      const isElectron = window.process && window.process.type === 'renderer' || 
                        (window.require && window.require('electron'));
      if (isElectron) {
        const { ipcRenderer } = window.require('electron');
        machineId = await ipcRenderer.invoke('get-machine-id');
      }

      const res = await axios.post('http://localhost:8080/api/license/activate', { machineId });
      alert("Free Beta activated successfully! Expires in 30 days.");
    } catch (err) {
      console.error(err);
      alert("Failed to activate beta: " + (err.response?.data?.error || err.message));
    }
  };

  const value = {
    videoFile, setVideoFile,
    videoUrl, setVideoUrl,
    backendPath, setBackendPath,
    videoRef, playheadRef, trackerRef, activeBoxRef, timelineRef,
    isPlaying, setIsPlaying,
    duration, setDuration,
    players, setPlayers,
    segments, setSegments,
    downloadUrls, setDownloadUrls,
    isProcessing, setIsProcessing,
    resultMsg, setResultMsg,
    showImport, setShowImport,
    importText, setImportText,
    copied, setCopied,
    clearSession, addPlayer, updatePlayerName, removeSegment, formatTime,
    handleTimeUpdate, handleLoadedData, togglePlay, jumpTo, dropMarker,
    handleTimelineClick, handleApplyCuts, handleCopyUnassigned, handleBagImport,
    handleImport, onDragEnd, handleFileChange, selectVideoViaElectron, 
    outputPath, setOutputPath, selectOutputFolderViaElectron,
    loadDemoVideo, downloadAllFiles, handleActivateLicense, killSwitchError
  };

  return (
    <VideoEditorContext.Provider value={value}>
      {children}
    </VideoEditorContext.Provider>
  );
};
