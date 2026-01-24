import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Plus, X, GripVertical, Trash2, Music } from 'lucide-react';
import { useLibraryStore, useRuntimeStore } from '../store/useStore';
import { Playlist } from '../types';

const PlaylistEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { playlists, songs, updatePlaylist, deletePlaylist } = useLibraryStore();
    const { setPerformanceQueue } = useRuntimeStore();

    const playlist = playlists.find(p => p.id === id);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

    if (!playlist) {
        return <div className="p-8 text-center text-gray-500">Playlist not found</div>;
    }

    const playlistSongs = playlist.songs
        .map(songId => songs.find(s => s.id === songId))
        .filter(Boolean) as typeof songs;

    const availableSongs = songs.filter(s =>
        !playlist.songs.includes(s.id) &&
        (s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.artist.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleAddSong = (songId: string) => {
        updatePlaylist(playlist.id, {
            songs: [...playlist.songs, songId]
        });
    };

    const handleRemoveSong = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const newSongs = [...playlist.songs];
        newSongs.splice(index, 1);
        updatePlaylist(playlist.id, {
            songs: newSongs
        });
    };

    const handleMoveSong = (index: number, direction: 'up' | 'down') => {
        const newSongs = [...playlist.songs];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newSongs.length) {
            [newSongs[index], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[index]];
            updatePlaylist(playlist.id, { songs: newSongs });
        }
    };

    const handlePlay = () => {
        if (playlist.songs.length === 0) return;

        let targetSongId = playlist.songs[0];
        if (selectedSongId && playlist.songs.includes(selectedSongId)) {
            targetSongId = selectedSongId;
        }

        setPerformanceQueue(playlist.songs);
        navigate(`/perform/${targetSongId}`, { state: { returnPath: `/playlist/${playlist.id}` } });
    };

    const handleDelete = () => {
        if (window.confirm('Delete this playlist?')) {
            deletePlaylist(playlist.id);
            navigate('/');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-200">
            {/* Header */}
            <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <input
                            value={playlist.title}
                            onChange={(e) => updatePlaylist(playlist.id, { title: e.target.value })}
                            className="bg-transparent font-bold text-white focus:outline-none border-b border-transparent focus:border-blue-500"
                            placeholder="Playlist Title"
                        />
                        <span className="text-xs text-gray-500">{playlist.songs.length} songs</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                        <Plus size={16} /> Add Songs
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-900/20 text-red-400 rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={handlePlay}
                        disabled={playlist.songs.length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
                    >
                        <Play size={16} /> Play
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-2">
                {playlistSongs.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <Music size={48} className="mx-auto mb-4 opacity-20" />
                        <p>This playlist is empty.</p>
                        <button onClick={() => setIsAddModalOpen(true)} className="text-blue-400 hover:text-blue-300 mt-2">Add songs</button>
                    </div>
                ) : (
                    playlistSongs.map((song, idx) => (
                        <div
                            key={`${song.id}-${idx}`}
                            onClick={() => setSelectedSongId(song.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border group cursor-pointer transition-all ${selectedSongId === song.id
                                    ? 'bg-yellow-900/20 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]'
                                    : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            <span className={`font-mono w-6 text-right text-sm ${selectedSongId === song.id ? 'text-yellow-400' : 'text-gray-600'}`}>{idx + 1}</span>
                            <div className="flex-1">
                                <div className={`font-medium ${selectedSongId === song.id ? 'text-white' : 'text-gray-200'}`}>{song.title}</div>
                                <div className="text-xs text-gray-500">{song.artist}</div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex flex-col mr-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleMoveSong(idx, 'up') }} disabled={idx === 0} className="p-1 hover:text-white text-gray-500 disabled:opacity-20"><ArrowLeft size={12} className="rotate-90" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMoveSong(idx, 'down') }} disabled={idx === playlistSongs.length - 1} className="p-1 hover:text-white text-gray-500 disabled:opacity-20"><ArrowLeft size={12} className="-rotate-90" /></button>
                                </div>
                                <button onClick={(e) => handleRemoveSong(e, idx)} className="p-2 hover:bg-red-900/20 text-gray-500 hover:text-red-400 rounded transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Song Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-[500px] shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="font-bold text-lg">Add Songs</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <div className="p-4">
                            <input
                                className="w-full bg-gray-800 border-none rounded-lg px-4 py-2 focus:ring-1 focus:ring-blue-500"
                                placeholder="Search library..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {availableSongs.length === 0 ? (
                                <p className="text-center text-gray-600 py-8">No matching songs found.</p>
                            ) : (
                                availableSongs.map(song => (
                                    <div key={song.id} className="flex items-center justify-between p-3 hover:bg-gray-800 rounded-lg group">
                                        <div>
                                            <div className="font-medium">{song.title}</div>
                                            <div className="text-xs text-gray-500">{song.artist}</div>
                                        </div>
                                        <button
                                            onClick={() => handleAddSong(song.id)}
                                            className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded text-xs transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaylistEditor;
