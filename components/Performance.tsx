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

    const [mode, setMode] = useState<'audience' | 'artist'>('audience');

    const queuedSongs = performanceQueue
        ? performanceQueue.map(id => songs.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s))
        : null;
    const activeCollection = queuedSongs && queuedSongs.length > 0 ? queuedSongs : songs;
    const songIndex = activeCollection.findIndex(s => s?.id === id);
    const song = activeCollection[songIndex];

    const nextSong = activeCollection[songIndex + 1];
    const prevSong = activeCollection[songIndex - 1];

    // Helper to handle legacy string lines vs new Line objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getLineData = useCallback((idx: number) => {
        if (!song) return null;
        const line = song.lines[idx];
        if (!line) return null;
        if (typeof line === 'string') return { content: line, instruction: '' };
        return line;
    }, [song]);

    // Keyboard controls
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!song) return;

        const totalLines = song.lines.length;

        // Next Line / Next Song
        if (e.code === 'Space' || e.key === 'ArrowRight') {
            e.preventDefault();

            if (totalLines === 0) return;

            // If at end of song
            if (currentLineIndex >= totalLines - 1) {
                if (nextSong) {
                    // Move to next song
                    setCurrentLineIndex(0);
                    navigate(`/perform/${nextSong.id}`);
                }
            } else {
                nextLine(totalLines);
            }
        }
        // Prev Line / Prev Song
        else if (e.key === 'ArrowLeft') {
            e.preventDefault();

            if (totalLines === 0) return;

            // If at start of song
            if (currentLineIndex <= 0) {
                if (prevSong) {
                    // Move to previous song, LAST line (for continuity)
                    setCurrentLineIndex(Math.max(prevSong.lines.length - 1, 0));
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
            setCurrentLineIndex(Math.max(song.lines.length - 1, 0));
        }

        // UI Toggles
        else if (e.key === 'Escape') {
            e.preventDefault();
            const returnPath = location.state?.returnPath;
            if (returnPath) {
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
        else if (e.key === 'm') {
            e.preventDefault();
            setMode(prev => prev === 'audience' ? 'artist' : 'audience');
        }
    }, [song, nextSong, prevSong, currentLineIndex, nextLine, prevLine, setCurrentLineIndex, navigate, location]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!song) return null;

    const currentLineData = getLineData(currentLineIndex);
    const isLastLine = song.lines.length > 0 && currentLineIndex === song.lines.length - 1;
    const progressPercent = song.lines.length > 0
        ? ((currentLineIndex + 1) / song.lines.length) * 100
        : 0;

    // Font size calculation
    const fontSizes = {
        'L': 'text-6xl md:text-7xl',
        'XL': 'text-7xl md:text-8xl',
        'XXL': 'text-8xl md:text-9xl'
    };
    const fontSizeClass = fontSizes[song.settings.fontSize];

    return (
        <div className={`fixed inset-0 bg-black text-white flex flex-col ${mode === 'audience' ? 'cursor-none' : ''}`}>
            {/* UI Overlay (Hidden by default or toggled) */}
            <div className={`absolute top-0 left-0 w-full p-6 flex justify-between items-start transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'} z-20`}>
                <div className="flex flex-col">
                    <h2 className="text-gray-500 font-bold text-lg flex items-center gap-2">
                        {songIndex + 1}. {song.title}
                        {blackout && <span className="text-red-500 text-xs px-2 py-0.5 border border-red-500 rounded uppercase">Blackout</span>}
                        <span className={`text-xs px-2 py-0.5 border rounded uppercase ${mode === 'artist' ? 'border-purple-500 text-purple-500' : 'border-gray-700 text-gray-700'}`}>
                            {mode === 'audience' ? 'Audience' : 'Artist'}
                        </span>
                    </h2>
                    <p className="text-gray-600 text-sm">Line {currentLineIndex + 1} / {song.lines.length}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setMode(prev => prev === 'audience' ? 'artist' : 'audience')} className="text-gray-600 hover:text-white px-2 rounded border border-gray-800 text-xs uppercase font-bold transition-colors">
                        {mode === 'audience' ? 'Switch to Artist' : 'Switch to Audience'}
                    </button>
                    <button className="text-gray-600 p-2 rounded border border-gray-800 text-xs hidden md:block">Space / → Next</button>
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
                    mode === 'audience' ? (
                        <h1 className={`font-bold leading-tight select-none tracking-wide transition-all duration-200 ${fontSizeClass}`}>
                            {currentLineData?.content || <span className="text-gray-900">—</span>}
                        </h1>
                    ) : (
                        // Artist Mode View
                        <div className="flex flex-col gap-6 max-w-5xl w-full">
                            {/* Instruction (Top, Prominent) */}
                            {currentLineData?.instruction && (
                                <div
                                    className="text-3xl md:text-5xl font-bold px-6 py-4 rounded-xl mx-auto mb-4 animate-in fade-in slide-in-from-top-4"
                                    style={{
                                        color: currentLineData.style?.color || '#a855f7',
                                        backgroundColor: currentLineData.style?.backgroundColor || 'rgba(88, 28, 135, 0.2)'
                                    }}
                                >
                                    {currentLineData.instruction}
                                </div>
                            )}

                            {/* Current Line */}
                            <h1 className={`font-bold leading-tight ${fontSizeClass} transition-all duration-200`}>
                                {currentLineData?.content || <span className="text-gray-800">—</span>}
                            </h1>

                            {/* Upcoming Lines */}
                            <div className="flex flex-col gap-4 mt-8 w-full border-t border-gray-800 pt-8">
                                {getLineData(currentLineIndex + 1) && (
                                    <div className="text-4xl md:text-6xl font-bold text-gray-300 transition-all duration-300">
                                        {getLineData(currentLineIndex + 1)?.content}
                                    </div>
                                )}
                                {getLineData(currentLineIndex + 2) && (
                                    <div className="text-2xl md:text-4xl font-medium text-gray-500 transition-all duration-300">
                                        {getLineData(currentLineIndex + 2)?.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Safe Area Bottom Marker (Subtle) */}
            {showUI && song.settings.showProgress && (
                <div className="absolute bottom-0 left-0 h-1 bg-gray-900 w-full z-20">
                    <div
                        className="h-full bg-blue-900 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default Performance;
