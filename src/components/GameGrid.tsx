import { SelectedTile, Tile } from '../types/game';
import { Sparkles } from 'lucide-react';
import { useState, useRef } from 'react';
import { audioManager } from '../utils/audioManager';
import { useSettings } from '../contexts/SettingsContext';

interface GameGridProps {
  grid: Tile[][];
  selectedTiles: SelectedTile[];
  onTileSelect: (tile: Tile) => void;
  onDragComplete?: () => void;
  gameOver: boolean;
}

export function GameGrid({ grid, selectedTiles, onTileSelect, onDragComplete, gameOver }: GameGridProps) {
  const { inputMode } = useSettings();
  const [isDragging, setIsDragging] = useState(false);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const isSelected = (row: number, col: number) => {
    return selectedTiles.some(t => t.row === row && t.col === col);
  };

  const getSelectionIndex = (row: number, col: number) => {
    return selectedTiles.findIndex(t => t.row === row && t.col === col);
  };

  const handleDragEnd = (pointerId?: number) => {
    if (pointerId !== undefined && activePointerId !== null && pointerId !== activePointerId) {
      return;
    }

    if (isDragging && inputMode === 'drag' && selectedTiles.length >= 3) {
      setIsDragging(false);
      setActivePointerId(null);
      onDragComplete?.();
    } else {
      setIsDragging(false);
      setActivePointerId(null);
    }
  };

  const getMultiplierColor = (multiplier: string | null) => {
    switch (multiplier) {
      case 'DL': return 'bg-blue-500';
      case 'TL': return 'bg-blue-700';
      case 'DW': return 'bg-pink-500';
      case 'TW': return 'bg-pink-700';
      default: return 'bg-gradient-to-br from-purple-800 to-purple-900';
    }
  };

  const getMultiplierText = (multiplier: string | null) => {
    return multiplier || '';
  };

  return (
    <div
      className="inline-block bg-purple-950/50 p-4 rounded-2xl shadow-2xl border-4 border-purple-700/50 relative"
      onPointerLeave={() => handleDragEnd()}
      onPointerUp={(event) => handleDragEnd(event.pointerId)}
      onPointerCancel={() => handleDragEnd()}
      ref={gridRef}
    >
      <div className="grid gap-2 relative" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 8}, minmax(0, 1fr))` }}>
        {/* SVG paths for visual connections */}
        {selectedTiles.length > 1 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', zIndex: 10 }}
          >
            {selectedTiles.slice(0, -1).map((tile, idx) => {
              const nextTile = selectedTiles[idx + 1];
              const currentKey = `${tile.row}-${tile.col}`;
              const nextKey = `${nextTile.row}-${nextTile.col}`;
              const currentEl = tileRefs.current.get(currentKey);
              const nextEl = tileRefs.current.get(nextKey);

              if (currentEl && nextEl) {
                const currentRect = currentEl.getBoundingClientRect();
                const nextRect = nextEl.getBoundingClientRect();
                const gridRect = gridRef.current?.getBoundingClientRect();

                if (gridRect) {
                  const x1 = currentRect.left + currentRect.width / 2 - gridRect.left;
                  const y1 = currentRect.top + currentRect.height / 2 - gridRect.top;
                  const x2 = nextRect.left + nextRect.width / 2 - gridRect.left;
                  const y2 = nextRect.top + nextRect.height / 2 - gridRect.top;

                  return (
                    <line
                      key={`${currentKey}-${nextKey}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgb(244, 114, 182)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="drop-shadow-lg animate-pulse"
                    />
                  );
                }
              }
              return null;
            })}
          </svg>
        )}

        {grid.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            const selected = isSelected(rowIndex, colIndex);
            const selectionIdx = getSelectionIndex(rowIndex, colIndex);
            const multiplierColor = getMultiplierColor(tile.multiplier);
            const tileKey = `${rowIndex}-${colIndex}`;

            return (
              <button
                key={tileKey}
                ref={(el) => {
                  if (el) {
                    tileRefs.current.set(tileKey, el);
                  } else {
                    tileRefs.current.delete(tileKey);
                  }
                }}
                onPointerDown={(e) => {
                  if (!gameOver) {
                    if (inputMode === 'drag') {
                      e.preventDefault(); // Prevent text selection during drag
                      setActivePointerId(e.pointerId);
                      setIsDragging(true);
                      onTileSelect(tile);
                      audioManager.playLetterClick(selectedTiles.length);
                    }
                  }
                }}
                onPointerEnter={(e) => {
                  if (
                    inputMode === 'drag' &&
                    isDragging &&
                    !gameOver &&
                    (activePointerId === null || activePointerId === e.pointerId)
                  ) {
                    onTileSelect(tile);
                    audioManager.playLetterClick(selectedTiles.length);
                  }
                }}
                onPointerUp={(event) => handleDragEnd(event.pointerId)}
                onClick={(e) => {
                  if (inputMode === 'click' && !gameOver) {
                    // In click mode, handle click normally
                    onTileSelect(tile);
                    audioManager.playLetterClick(selectedTiles.length);
                  } else if (inputMode === 'drag') {
                    // Prevent click handler in drag mode to avoid double-selection
                    e.preventDefault();
                  }
                }}
                disabled={gameOver}
                className={`
                  relative w-16 h-16 rounded-xl font-bold text-2xl
                  transition-all duration-150 transform
                  ${selected
                    ? 'scale-110 ring-4 ring-pink-400 shadow-2xl shadow-pink-400/70 animate-pulse z-20'
                    : 'hover:scale-105 hover:shadow-lg'
                  }
                  ${multiplierColor}
                  ${gameOver ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-125 active:shadow-2xl active:shadow-yellow-400/80'}
                  text-white shadow-md
                `}
              >
                {tile.isGem && (
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-pulse" />
                  </div>
                )}

                {tile.multiplier && (
                  <span className="absolute top-1 left-1 text-[10px] font-semibold opacity-80">
                    {getMultiplierText(tile.multiplier)}
                  </span>
                )}

                <span className="relative z-10">{tile.letter}</span>

                {selected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center text-purple-900 text-xs font-bold shadow-lg">
                    {selectionIdx + 1}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
