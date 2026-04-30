import React from 'react';
import { X } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';

const TimestampChip = ({ segment, index, onRemove, onJump, formatTime }) => {
  return (
    <Draggable draggableId={segment.id} index={index} isDragDisabled={segment.end === null}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-zinc-800 rounded px-3 py-2 flex items-center justify-between text-sm border ${
            snapshot.isDragging ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02] z-50' : 'border-zinc-700'
          } ${segment.end === null ? 'opacity-50' : 'cursor-grab active:cursor-grabbing hover:border-zinc-600'} transition-all`}
        >
          <div className="flex flex-col gap-1 pointer-events-none">
            <span 
              className="text-emerald-400 font-mono" 
              onClick={(e) => { e.stopPropagation(); onJump(segment.start); }} 
              title="Jump to start"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
               ► {formatTime(segment.start)}
            </span>
            <span className="text-rose-400 font-mono">
               ■ {segment.end !== null ? formatTime(segment.end) : 'Pending...'}
            </span>
          </div>
          <button 
             onClick={(e) => { e.stopPropagation(); onRemove(); }} 
             className="text-zinc-500 hover:text-white p-2"
             style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Draggable>
  );
};

export default TimestampChip;
