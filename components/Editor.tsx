import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Wand2, Loader2, Check, Settings, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useLibraryStore, useRuntimeStore } from '../store/useStore';
import { splitLyrics } from '../services/splitter';
import { Song, FontSize } from '../types';

const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { songs, updateSong } = useLibraryStore();
    const { setCurrentLineIndex, setPerformanceQueue } = useRuntimeStore();

    const song = songs.find(s => s.id === id);
    const [localSong, setLocalSong] = useState<Song | null>(null);
    const [activeLineIdx, setActiveLineIdx] = useState(0);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Ref for the list of input elements to manage focus
    const lineInputsRef = useRef<(HTMLTextAreaElement | null)[]>([]);
    const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const linesContainerRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    // Initialize local state
    useEffect(() => {
        if (song) {
            setLocalSong(prev => {
                if (!prev || prev.id !== song.id) {
                    const deepCopy = JSON.parse(JSON.stringify(song));
                    if (deepCopy.settings.showProgress === undefined) deepCopy.settings.showProgress = true;
                    return deepCopy;
                }
                return prev;
            });
        } else {
            navigate('/');
        }
    }, [song, navigate]);

    // Autosave hook
    useEffect(() => {
        if (!localSong || !id) return;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        setSaveStatus('saving');

        const timeout = setTimeout(() => {
            updateSong(id, {
                title: localSong.title,
                artist: localSong.artist,
                rawLyrics: localSong.rawLyrics,
                lines: localSong.lines,
                settings: localSong.settings
            });
            setSaveStatus('saved');
        }, 1000);

        return () => clearTimeout(timeout);
    }, [localSong, id, updateSong]);

    // Focus and Scroll Management
    useEffect(() => {
        // Capture current scroll position of raw lyrics to prevent unwanted scrolling
        const currentScrollTop = rawTextareaRef.current?.scrollTop;

        // Use requestAnimationFrame to ensure layout is ready and to override any browser default scroll behavior
        requestAnimationFrame(() => {
            // Handle Split Lines (Right Column) Focus & Scroll only.
            const activeInput = lineInputsRef.current[activeLineIdx];
            if (activeInput && linesContainerRef.current) {
                // Determine if we should prevent default scroll. 
                // We do want to prevent the BROWSER from scrolling the PARENT (body), 
                // but we will handle the container scroll manually.
                activeInput.focus({ preventScroll: true });

                const container = linesContainerRef.current;
                const rowElement = activeInput.closest('.group');

                if (rowElement && rowElement instanceof HTMLElement) {
                    const rowRect = rowElement.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const currentScroll = container.scrollTop;

                    // Calculate target position to center the element
                    const relativeTop = rowRect.top - containerRect.top;
                    const targetScroll = currentScroll + relativeTop - (containerRect.height / 2) + (rowRect.height / 2);

                    container.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }

            // Explicitly restore Raw Lyrics scroll position if it was affected
            if (rawTextareaRef.current && currentScrollTop !== undefined) {
                rawTextareaRef.current.scrollTop = currentScrollTop;
                if (backdropRef.current) {
                    backdropRef.current.scrollTop = currentScrollTop;
                }
            }
        });

    }, [activeLineIdx]);

    // Sync scroll between textarea and backdrop
    const handleRawScroll = () => {
        if (rawTextareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = rawTextareaRef.current.scrollTop;
        }
    };

    // Calculate highlight segments for raw lyrics
    const highlightSegments = useMemo(() => {
        if (!localSong) return [];
        const raw = localSong.rawLyrics;
        const lines = localSong.lines;

        let searchCursor = 0;
        let start = -1;
        let end = -1;

        for (let i = 0; i <= activeLineIdx; i++) {
            const line = lines[i];
            if (!line) continue;

            const idx = raw.indexOf(line, searchCursor);
            if (idx !== -1) {
                if (i === activeLineIdx) {
                    start = idx;
                    end = idx + line.length;
                    break;
                }
                searchCursor = idx + line.length;
            }
        }

        if (start !== -1 && end !== -1) {
            return [
                { text: raw.substring(0, start), highlight: false },
                { text: raw.substring(start, end), highlight: true },
                { text: raw.substring(end), highlight: false }
            ];
        }

        return [{ text: raw, highlight: false }];
    }, [localSong?.rawLyrics, localSong?.lines, activeLineIdx]);


    if (!localSong) return null;

    const handleAutoSplit = () => {
        if (localSong.lines.length > 0) {
            if (!window.confirm("Overwrite existing lines?")) return;
        }
        const newLines = splitLyrics(localSong.rawLyrics, localSong.settings.targetLen);
        setLocalSong({ ...localSong, lines: newLines });
        setActiveLineIdx(0);
    };

    const updateLine = (idx: number, text: string) => {
        const newLines = [...localSong.lines];
        newLines[idx] = text;
        setLocalSong({ ...localSong, lines: newLines });
    };

    const handleLineKeyDown = (e: React.KeyboardEvent, idx: number) => {
        // Navigation
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (idx > 0) {
                    const newLines = [...localSong.lines];
                    [newLines[idx], newLines[idx - 1]] = [newLines[idx - 1], newLines[idx]];
                    setLocalSong({ ...localSong, lines: newLines });
                    setActiveLineIdx(idx - 1);
                }
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (idx < localSong.lines.length - 1) {
                    const newLines = [...localSong.lines];
                    [newLines[idx], newLines[idx + 1]] = [newLines[idx + 1], newLines[idx]];
                    setLocalSong({ ...localSong, lines: newLines });
                    setActiveLineIdx(idx + 1);
                }
                return;
            }
            if (e.key === 'p') {
                e.preventDefault();
                handleGoToPerform();
                return;
            }
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveLineIdx(Math.max(0, idx - 1));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveLineIdx(Math.min(localSong.lines.length - 1, idx + 1));
        }

        // Split / New Line
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = e.currentTarget as HTMLTextAreaElement;
            const cursorPosition = input.selectionStart;
            const currentText = localSong.lines[idx];

            const textBefore = currentText.slice(0, cursorPosition);
            const textAfter = currentText.slice(cursorPosition);

            const newLines = [...localSong.lines];

            newLines[idx] = textBefore;
            newLines.splice(idx + 1, 0, textAfter);

            setLocalSong({ ...localSong, lines: newLines });
            setActiveLineIdx(idx + 1);
        }

        // Merge
        if (e.key === 'Backspace') {
            const input = e.currentTarget as HTMLTextAreaElement;
            if (input.selectionStart === 0 && input.selectionEnd === 0 && idx > 0) {
                e.preventDefault();
                const currentText = localSong.lines[idx];
                const prevText = localSong.lines[idx - 1];

                const newLines = [...localSong.lines];
                newLines.splice(idx, 1);
                newLines[idx - 1] = prevText + currentText;

                setLocalSong({ ...localSong, lines: newLines });
                setActiveLineIdx(idx - 1);
            }
        }
    };

    const handleGoToPerform = () => {
        updateSong(song!.id, localSong);
        setCurrentLineIndex(activeLineIdx);
        setPerformanceQueue(null); // Clear playlist context when playing from Editor
        navigate(`/perform/${song!.id}`);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-200">
            {/* Toolbar */}
            <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <input
                            value={localSong.title}
                            onChange={(e) => setLocalSong({ ...localSong, title: e.target.value })}
                            className="bg-transparent font-bold text-white focus:outline-none border-b border-transparent focus:border-blue-500"
                            placeholder="Song Title"
                        />
                        <input
                            value={localSong.artist}
                            onChange={(e) => setLocalSong({ ...localSong, artist: e.target.value })}
                            className="bg-transparent text-xs text-gray-500 focus:outline-none"
                            placeholder="Artist"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-4 text-xs font-medium min-w-[80px] justify-end">
                        {saveStatus === 'saving' ? (
                            <div className="flex items-center gap-1.5 text-blue-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span>Saving...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-gray-600">
                                <Check size={14} />
                                <span>Saved</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center bg-gray-800 rounded-md px-2 py-1 mr-4">
                        <span className="text-xs text-gray-400 mr-2">Line Length:</span>
                        <button
                            onClick={() => setLocalSong(s => s && ({ ...s, settings: { ...s.settings, targetLen: Math.max(5, s.settings.targetLen - 1) } }))}
                            className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
                        >-</button>
                        <span className="w-8 text-center text-sm font-mono">{localSong.settings.targetLen}</span>
                        <button
                            onClick={() => setLocalSong(s => s && ({ ...s, settings: { ...s.settings, targetLen: s.settings.targetLen + 1 } }))}
                            className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
                        >+</button>
                    </div>
                    <div className="flex items-center bg-gray-800 rounded-md px-2 py-1 mr-2">
                        <span className="text-xs text-gray-400 mr-2">Font:</span>
                        {(['L', 'XL', 'XXL'] as FontSize[]).map(size => (
                            <button
                                key={size}
                                onClick={() => setLocalSong({ ...localSong, settings: { ...localSong.settings, fontSize: size } })}
                                className={`text-xs px-2 py-1 rounded ${localSong.settings.fontSize === size ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg mr-2 transition-colors"
                        title="Song Settings"
                    >
                        <Settings size={20} />
                    </button>

                    <button
                        onClick={handleAutoSplit}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded-lg text-sm transition-colors"
                    >
                        <Wand2 size={16} /> Auto Split
                    </button>
                    <button
                        onClick={handleGoToPerform}
                        className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white hover:bg-green-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
                    >
                        <Play size={16} /> Perform
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-2 overflow-hidden">
                {/* Left: Raw */}
                <div className="flex flex-col border-r border-gray-800 bg-gray-900/50 min-h-0">
                    <div className="px-4 py-2 bg-gray-900 text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Lyrics</div>
                    <div className="relative flex-1 min-h-0">
                        {/* Backdrop for highlighting */}
                        <div
                            ref={backdropRef}
                            className="absolute inset-0 p-6 whitespace-pre-wrap break-words font-sans text-base leading-relaxed text-transparent overflow-y-auto select-none pointer-events-none z-0 backdrop-scroll"
                            aria-hidden="true"
                        >
                            <style>{`
                        .backdrop-scroll::-webkit-scrollbar {
                            width: 8px;
                            background: transparent;
                        }
                        .backdrop-scroll::-webkit-scrollbar-thumb {
                            background: transparent;
                        }
                        .backdrop-scroll::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .backdrop-scroll {
                            scrollbar-color: transparent transparent;
                        }
                    `}</style>
                            {highlightSegments.map((seg, i) => (
                                <span
                                    key={i}
                                    className={`${seg.highlight ? "bg-yellow-400/50 text-transparent rounded px-1 -mx-1" : ""}`}
                                >
                                    {seg.text}
                                </span>
                            ))}
                        </div>

                        {/* Actual Editor */}
                        <textarea
                            ref={rawTextareaRef}
                            className="absolute inset-0 w-full h-full p-6 bg-transparent resize-none focus:outline-none text-gray-300 font-sans text-base leading-relaxed whitespace-pre-wrap break-words custom-scrollbar overflow-y-auto z-10"
                            placeholder="Paste full lyrics here..."
                            value={localSong.rawLyrics}
                            onChange={(e) => setLocalSong({ ...localSong, rawLyrics: e.target.value })}
                            onScroll={handleRawScroll}
                        />
                    </div>
                </div>

                {/* Right: Lines */}
                <div className="flex flex-col bg-gray-950 min-h-0">
                    <div className="px-4 py-2 bg-gray-900 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                        <span>Split Lines ({localSong.lines.length})</span>
                        <span className="text-gray-600 normal-case font-normal">Enter to split • Backspace to merge</span>
                    </div>
                    <div ref={linesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar pb-20">
                        {localSong.lines.map((line, idx) => (
                            <div
                                key={idx}
                                className={`group relative flex items-start gap-3 p-3 rounded-lg border transition-all ${idx === activeLineIdx
                                    ? 'bg-yellow-900/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                    }`}
                                onClick={() => setActiveLineIdx(idx)}
                            >
                                <span className="text-xs text-gray-600 font-mono mt-1 w-6 text-right select-none">{idx + 1}</span>
                                <textarea
                                    ref={el => lineInputsRef.current[idx] = el}
                                    value={line}
                                    onChange={(e) => updateLine(idx, e.target.value)}
                                    onKeyDown={(e) => handleLineKeyDown(e, idx)}
                                    rows={1}
                                    className="flex-1 bg-transparent resize-none overflow-hidden focus:outline-none text-lg text-gray-200"
                                    style={{ minHeight: '1.75rem', height: 'auto' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${target.scrollHeight}px`;
                                    }}
                                />
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                    <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); handleLineKeyDown({ key: 'ArrowUp', metaKey: true, preventDefault: () => { } } as any, idx) }} className="p-1 hover:bg-gray-700 rounded text-gray-500"><ChevronUp size={14} /></button>
                                    <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); handleLineKeyDown({ key: 'ArrowDown', metaKey: true, preventDefault: () => { } } as any, idx) }} className="p-1 hover:bg-gray-700 rounded text-gray-500"><ChevronDown size={14} /></button>
                                </div>
                            </div>
                        ))}

                        {localSong.lines.length === 0 && (
                            <div className="text-center text-gray-600 mt-20">
                                <p>No lines yet.</p>
                                <p className="text-sm">Click "Auto Split" or type manually.</p>
                                <button
                                    onClick={() => setLocalSong({ ...localSong, lines: [""] })}
                                    className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                                >Add First Line</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Song Settings</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-gray-200">Show Progress Bar</span>
                                    <span className="text-xs text-gray-500">Display progress at bottom of screen</span>
                                </div>
                                <button
                                    onClick={() => setLocalSong(s => s ? ({ ...s, settings: { ...s.settings, showProgress: !s.settings.showProgress } }) : null)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${localSong.settings.showProgress ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSong.settings.showProgress ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <p className="text-center text-xs text-gray-600 pt-2">
                                More settings coming soon...
                            </p>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Editor;