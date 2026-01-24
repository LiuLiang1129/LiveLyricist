import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLibraryStore, useRuntimeStore } from '../store/useStore';

const Performance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { songs } = useLibraryStore();
    const { currentLineIndex, nextLine, prevLine, setCurrentLineIndex, performanceQueue } = useRuntimeStore();
    const [showUI, setShowUI] = useState(true);
    const [blackout, setBlackout] = useState(false);

    const activeCollection = performanceQueue ? performanceQueue.map(id => songs.find(s => s.id === id)!) : songs;
    const songIndex = activeCollection.findIndex(s => s?.id === id);
    const song = activeCollection[songIndex];

    const nextSong = activeCollection[songIndex + 1];
    const prevSong = activeCollection[songIndex - 1];

    // Keyboard controls
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!song) return;

        // Next Line / Next Song
        if (e.code === 'Space' || e.key === 'ArrowRight') {
            e.preventDefault();

            // If at end of song
            if (currentLineIndex >= song.lines.length - 1) {
                if (nextSong) {
                    // Move to next song
                    setCurrentLineIndex(0);
                    navigate(`/perform/${nextSong.id}`);
                } else {
                    // End of setlist - do nothing or blackout?
                    // Just stay on last line for now.
                }
            } else {
                nextLine(song.lines.length);
            }
        }
        // Prev Line / Prev Song
        else if (e.key === 'ArrowLeft') {
            e.preventDefault();

            // If at start of song
            if (currentLineIndex <= 0) {
                if (prevSong) {
                    // Move to previous song, LAST line (for continuity)
                    setCurrentLineIndex(prevSong.lines.length - 1);
                    navigate(`/perform/${prevSong.id}`);
                }
            } else {
                prevLine();
            }
        }
        else if (e.key === 'Home') {
            e.preventDefault();
            setCurrentLineIndex(0);
        }
        else if (e.key === 'End') {
            e.preventDefault();
            setCurrentLineIndex(song.lines.length - 1);
        }

        // UI Toggles
        // UI Toggles
        else if (e.key === 'Escape') {
            e.preventDefault();
            const returnPath = location.state?.returnPath;
            if (returnPath) {
                // Keep the state for next time? No, we are leaving.
                navigate(returnPath);
            } else {
                navigate(`/edit/${song.id}`);
            }
        }
        else if (e.key === 'b') {
            // Toggle Blackout screen
            setBlackout(prev => !prev);
        }
        else if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
            e.preventDefault();
            setShowUI(prev => !prev);
        }
    }, [song, nextSong, prevSong, currentLineIndex, nextLine, prevLine, setCurrentLineIndex, navigate, location]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!song) return null;

    const currentLine = song.lines[currentLineIndex] || "";
    const isLastLine = currentLineIndex === song.lines.length - 1;

    // Font size calculation
    const fontSizes = {
        'L': 'text-6xl md:text-7xl',
        'XL': 'text-7xl md:text-8xl',
        'XXL': 'text-8xl md:text-9xl'
    };
    const fontSizeClass = fontSizes[song.settings.fontSize];

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col cursor-none">
            {/* UI Overlay (Hidden by default or toggled) */}
            <div className={`absolute top-0 left-0 w-full p-6 flex justify-between items-start transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'} z-20`}>
                <div className="flex flex-col">
                    <h2 className="text-gray-500 font-bold text-lg flex items-center gap-2">
                        {songIndex + 1}. {song.title}
                        {blackout && <span className="text-red-500 text-xs px-2 py-0.5 border border-red-500 rounded uppercase">Blackout</span>}
                    </h2>
                    <p className="text-gray-600 text-sm">Line {currentLineIndex + 1} / {song.lines.length}</p>
                </div>
                <div className="flex gap-2">
                    <button className="text-gray-600 p-2 rounded border border-gray-800 text-xs">Space / → Next</button>
                    <button
                        onClick={() => {
                            const returnPath = location.state?.returnPath;
                            if (returnPath) {
                                navigate(returnPath);
                            } else {
                                navigate(`/edit/${song.id}`);
                            }
                        }}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={32} />
                    </button>
                </div>
            </div>

            {/* Next Song Indicator (Bottom Right) */}
            {isLastLine && nextSong && !blackout && (
                <div className="absolute bottom-10 right-10 text-right opacity-50 animate-pulse transition-all duration-500">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Next Song</div>
                    <div className="text-xl font-bold text-blue-400 flex items-center justify-end gap-2">
                        {nextSong.title} <ChevronRight size={20} />
                    </div>
                </div>
            )}

            {/* Prev Song Indicator (Bottom Left - subtle) */}
            {currentLineIndex === 0 && prevSong && showUI && (
                <div className="absolute bottom-10 left-10 text-left opacity-30 hover:opacity-100 transition-opacity">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Previous</div>
                    <div className="text-sm font-bold text-gray-400 flex items-center gap-1">
                        <ChevronLeft size={14} /> {prevSong.title}
                    </div>
                </div>
            )}

            {/* Main Display Area */}
            <div className="flex-1 flex items-center justify-center px-4 md:px-20 text-center w-full h-full relative z-10">
                {blackout ? (
                    <div className="w-4 h-4 rounded-full bg-red-900/20" title="Blackout Active"></div>
                ) : (
                    <h1 className={`font-bold leading-tight select-none tracking-wide transition-all duration-200 ${fontSizeClass}`}>
                        {currentLine || <span className="text-gray-900">—</span>}
                    </h1>
                )}
            </div>

            {/* Safe Area Bottom Marker (Subtle) */}
            {showUI && song.settings.showProgress && (
                <div className="absolute bottom-0 left-0 h-1 bg-gray-900 w-full z-20">
                    <div
                        className="h-full bg-blue-900 transition-all duration-300 ease-out"
                        style={{ width: `${((currentLineIndex + 1) / song.lines.length) * 100}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default Performance;