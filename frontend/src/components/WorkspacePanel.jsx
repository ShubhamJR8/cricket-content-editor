import React from 'react';
import { Download, Trash2, Check, Copy } from 'lucide-react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import PlayerBag from './PlayerBag';
import TimestampChip from './TimestampChip';
import { useVideoEditor } from '../context/VideoEditorContext';

const WorkspacePanel = () => {
  const { 
    downloadUrls, duration, showImport, setShowImport, clearSession,
    importText, setImportText, handleImport, onDragEnd, players, segments,
    removeSegment, jumpTo, formatTime, updatePlayerName, handleBagImport,
    addPlayer, handleCopyUnassigned, copied, openOutputFolder, removePlayer, videoFile
  } = useVideoEditor();

  const noVideoLoaded = !videoFile;
  const hasSavedSession = segments.length > 0;

  return (
    <div className="flex-1 bg-zinc-900 flex flex-col overflow-hidden relative">
      {/* Top Sticky Header */}
      <div className="p-6 border-b border-zinc-800 shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="text-zinc-300 font-bold uppercase tracking-wider text-sm">Workspace</h3>
          <div className="flex gap-2">
            {downloadUrls.length > 0 && (
              <button
                onClick={openOutputFolder}
                className="flex items-center gap-1 text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded transition shadow-lg"
              >
                <Download size={14} /> Open Output Folder
              </button>
            )}
            {duration > 0 && (
              <button
                onClick={() => setShowImport(!showImport)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 px-3 py-1.5 rounded transition"
              >
                Bulk Import
              </button>
            )}
            <button
              onClick={clearSession}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 px-3 py-1.5 rounded transition ml-2"
              title="Clear all players and clips"
            >
              <Trash2 size={14} /> Clear Session
            </button>
          </div>
        </div>

        {showImport && (
          <div className="mt-4 bg-zinc-800/80 p-4 rounded-lg border border-zinc-700 shadow-inner">
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
      </div>

      {/* Resume Session Banner */}
      {noVideoLoaded && hasSavedSession && (
        <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-3">
          <p className="text-xs text-amber-300">
            <span className="font-bold">Previous session detected.</span> Load your match video to continue where you left off, or clear the session to start fresh.
          </p>
          <button
            onClick={clearSession}
            className="shrink-0 text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded transition border border-amber-500/30"
          >
            Clear
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Scrollable Player Bags Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-zinc-900/50">
          <h4 className="text-xs text-zinc-500 mb-4 uppercase tracking-widest font-bold">Player Bags</h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 items-start">
            {players.map(p => (
              <PlayerBag
                key={p.id}
                player={p}
                segments={segments.filter(s => s.playerId === p.id)}
                onRemoveSegment={removeSegment}
                onJump={jumpTo}
                formatTime={formatTime}
                onNameChange={updatePlayerName}
                onImport={handleBagImport}
                onRemovePlayer={removePlayer}
              />
            ))}

            {/* Add Player Box */}
            <div
              onClick={addPlayer}
              className="flex flex-col bg-zinc-900/40 border-2 border-zinc-800 border-dashed hover:border-zinc-600 rounded-xl overflow-hidden items-center justify-center p-6 cursor-pointer transition text-zinc-500 hover:text-zinc-300 group min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center mb-2 transition">
                <span className="text-xl leading-none font-light mb-1">+</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider mt-1">Add Player</span>
            </div>
          </div>
        </div>

        {/* Fixed Unassigned Clips (Anchored to Bottom) */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm text-zinc-400 uppercase tracking-widest font-bold">Unassigned Clips</h4>
            <button 
              onClick={handleCopyUnassigned}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
              title="Copy all complete unassigned clips"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? <span className="text-emerald-500">Copied!</span> : <span>Copy All</span>}
            </button>
          </div>
          <div className="max-h-[30vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pr-2">
            <Droppable droppableId="unassigned" direction="horizontal">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-wrap gap-3 min-h-[64px] rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-800/80' : 'bg-zinc-900/40 border border-zinc-800/50'
                    }`}
                >
                  {segments.filter(s => !s.playerId).length === 0 ? (
                    <div className="w-full text-zinc-500 text-xs text-center p-4">
                      Newly clipped segments appear here.
                    </div>
                  ) : (
                    segments.filter(s => !s.playerId).map((seg, i) => (
                      <TimestampChip
                        key={seg.id}
                        segment={seg}
                        index={i}
                        onRemove={() => removeSegment(seg.id)}
                        onJump={jumpTo}
                        formatTime={formatTime}
                      />
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default WorkspacePanel;
