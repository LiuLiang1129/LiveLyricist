import React from 'react';
import { useLibraryStore, useRuntimeStore } from '../store/useStore';

const Audience: React.FC = () => {
    const { songs } = useLibraryStore();
    const { currentLineIndex, activePerformSongId, blackout } = useRuntimeStore();

    const song = songs.find(s => s.id === activePerformSongId);

    if (!song) {
        return (
            <div className="fixed inset-0 bg-black text-white flex items-center justify-center cursor-none">
                <p className="text-gray-800 text-sm">Livelyricist / No Active Song</p>
            </div>
        );
    }

    const currentLine = song.lines[currentLineIndex];
    let content = null;
    let instruction = null;
    let style = undefined;
    
    if (typeof currentLine === 'string') {
        content = currentLine;
    } else if (currentLine) {
        content = currentLine.content;
        instruction = currentLine.instruction;
        style = currentLine.style;
    }

    // Font size calculation
    const fontSizes = {
        'L': 'text-6xl md:text-7xl',
        'XL': 'text-7xl md:text-8xl',
        'XXL': 'text-8xl md:text-9xl'
    };
    const fontSizeClass = fontSizes[song.settings.fontSize];

    const alignClasses = {
        'left': 'justify-start text-left',
        'center': 'justify-center text-center',
        'right': 'justify-end text-right'
    };
    const currentAlign = song.settings.align || 'center';
    const alignClass = alignClasses[currentAlign];
    const isVertical = song.settings.layout === 'vertical';

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col cursor-none">
            {/* Main Display Area */}
            <div className={`flex-1 grid px-4 md:px-20 w-full h-full relative z-10`} style={{ gridTemplateRows: 'auto 1fr auto' }}>
                {blackout ? (
                    null // completely black
                ) : (
                    <>
                        {/* Top Area: Fixed height anchor */}
                        <div className={`flex flex-col justify-end w-full max-w-5xl place-self-center pb-8 ${isVertical ? 'h-[4rem] md:h-[8rem]' : 'h-[10rem] md:h-[14rem]'}`}>
                        </div>

                        {/* Middle Area: Current Lyric (Aligns top if vertical) */}
                        <div className={`flex w-full max-w-5xl justify-self-center ${isVertical ? 'self-start mt-4 md:mt-8' : 'self-center'} ${alignClass}`}>
                            <h1 
                                className={`font-bold leading-tight select-none tracking-wide transition-all duration-200 ${fontSizeClass}`}
                                style={{ writingMode: song.settings.layout === 'vertical' ? 'vertical-rl' : 'horizontal-tb' }}
                            >
                                {content || <span className="text-black">—</span>}
                            </h1>
                        </div>

                        {/* Bottom Area: Instructions */}
                        <div className={`flex flex-col justify-start w-full max-w-5xl place-self-center pt-8 ${isVertical ? 'h-[12rem] md:h-[16rem]' : 'h-[16rem] md:h-[20rem]'}`}>
                            {instruction && (
                                <div className={`flex w-full ${currentAlign === 'left' ? 'justify-start' : currentAlign === 'right' ? 'justify-end' : 'justify-center'}`}>
                                    <div
                                        className={`text-3xl md:text-5xl font-bold px-6 py-4 rounded-xl animate-in fade-in slide-in-from-bottom-4`}
                                        style={{
                                            color: style?.color || '#a855f7',
                                            backgroundColor: style?.backgroundColor || 'rgba(88, 28, 135, 0.2)',
                                            writingMode: song.settings.layout === 'vertical' ? 'vertical-rl' : 'horizontal-tb'
                                        }}
                                    >
                                        {instruction}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Audience;
