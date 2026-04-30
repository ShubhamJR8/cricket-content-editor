import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Clipboard } from 'lucide-react';
import TimestampChip from './TimestampChip';

const PlayerBag = ({ player, segments, onRemoveSegment, onJump, formatTime, onNameChange, onImport }) => {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onImport(player.id, text);
        return;
      }
    } catch (err) {
      console.log('Clipboard read failed', err);
    }
    const val = prompt('Paste timestamps here:');
    if (val) {
      onImport(player.id, val);
    }
  };

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-inner shrink-0 w-64">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-zinc-800 border-b border-zinc-700 group">
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
          {player.name ? player.name.charAt(0) : '?'}
        </div>
        <div className="flex flex-col flex-1">
          <input 
            type="text"
            className="text-sm font-bold text-white bg-transparent outline-none hover:bg-zinc-700 focus:bg-zinc-700 focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 transition w-full"
            value={player.name}
            onChange={(e) => onNameChange && onNameChange(player.id, e.target.value)}
            placeholder="Player Name"
          />
          <span className="text-xs text-zinc-400">{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
        </div>
        <button 
          onClick={handlePaste}
          className="text-zinc-500 hover:text-white transition p-1 bg-zinc-700/50 hover:bg-zinc-600 rounded opacity-0 group-hover:opacity-100"
          title="Paste copied timestamps"
        >
          <Clipboard size={14} />
        </button>
      </div>

      {/* Drop Zone */}
      <Droppable droppableId={player.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 min-h-[140px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-500/10' : 'bg-transparent'
            } flex flex-col gap-2`}
          >
             {segments.length === 0 ? (
               <div className="m-auto text-zinc-600 text-xs text-center border-2 border-dashed border-zinc-700 rounded-lg p-4 w-full">
                 Drop clips here
               </div>
             ) : (
               segments.map((seg, i) => (
                 <TimestampChip 
                   key={seg.id} 
                   segment={seg} 
                   index={i} 
                   onRemove={() => onRemoveSegment(seg.id)}
                   onJump={onJump}
                   formatTime={formatTime}
                 />
               ))
             )}
             {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default PlayerBag;
