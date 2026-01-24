import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, Search, Play, Download, Upload, ChevronUp, ChevronDown, ListMusic, Music } from 'lucide-react';
import { useLibraryStore } from '../store/useStore';
import { Playlist, Song } from '../types';

const Library: React.FC = () => {
  const navigate = useNavigate();
  const { songs, playlists, addSong, addPlaylist, deleteSong, deletePlaylist, setActiveSong, moveSong, importLibrary } = useLibraryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createNewSong = () => {
    const newSong: Song = {
      id: crypto.randomUUID(),
      title: 'New Song',
      artist: '',
      rawLyrics: '',
      lines: [],
      settings: { targetLen: 14, fontSize: 'XL', showProgress: true },
      updatedAt: Date.now(),
    };
    addSong(newSong);
    // Navigate immediately to edit
    navigate(`/edit/${newSong.id}`);
  };

  const createNewPlaylist = () => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      title: 'New Playlist',
      songs: [],
      createdAt: Date.now()
    };
    addPlaylist(newPlaylist);
    navigate(`/playlist/${newPlaylist.id}`);
  };

  const handleDuplicate = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    const newSong = {
      ...song,
      id: crypto.randomUUID(),
      title: `${song.title} (Copy)`,
      updatedAt: Date.now(),
    };
    addSong(newSong);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this song?')) {
      deleteSong(id);
    }
  };

  const handleExport = () => {
    const backupData = {
      songs,
      playlists
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "library_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
          // Legacy format: Array of Songs
          const validSongs: Song[] = parsed
            .filter((s: any) => s.title !== undefined)
            .map((s: any) => ({
              ...s,
              id: crypto.randomUUID(),
              updatedAt: Date.now()
            }));

          if (validSongs.length > 0) {
            importLibrary({ songs: validSongs });
            alert(`Successfully imported ${validSongs.length} songs.`);
          } else {
            alert("No valid songs found in file.");
          }
        } else if (parsed && typeof parsed === 'object') {
          // New Format: { songs: [], playlists: [] }
          const rawSongs = Array.isArray(parsed.songs) ? parsed.songs : [];
          const rawPlaylists = Array.isArray(parsed.playlists) ? parsed.playlists : [];

          // Map old Song IDs to new Song IDs to update playlists references
          const idMap: Record<string, string> = {};

          const validSongs: Song[] = rawSongs
            .filter((s: any) => s.title !== undefined)
            .map((s: any) => {
              const newId = crypto.randomUUID();
              if (s.id) idMap[s.id] = newId;
              return {
                ...s,
                id: newId,
                updatedAt: Date.now()
              };
            });

          const validPlaylists: Playlist[] = rawPlaylists
            .filter((p: any) => p.title !== undefined)
            .map((p: any) => ({
              ...p,
              id: crypto.randomUUID(),
              // Update song references in playlist
              songs: Array.isArray(p.songs) ? p.songs.map((oldId: string) => idMap[oldId]).filter(Boolean) : [],
              createdAt: Date.now()
            }));

          if (validSongs.length > 0 || validPlaylists.length > 0) {
            importLibrary({ songs: validSongs, playlists: validPlaylists });
            alert(`Imported ${validSongs.length} songs and ${validPlaylists.length} playlists.`);
          } else {
            alert("No valid content found.");
          }
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Please check if it is a valid JSON file.");
      } finally {
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleMove = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    moveSong(id, direction);
  };

  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100 p-6 overflow-hidden">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          LiveLyricist
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
          >
            <Upload size={16} /> Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
          >
            <Download size={16} /> Export
          </button>
          {activeTab === 'songs' ? (
            <button
              onClick={createNewSong}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium"
            >
              <Plus size={18} /> New Song
            </button>
          ) : (
            <button
              onClick={createNewPlaylist}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors font-medium"
            >
              <Plus size={18} /> New Playlist
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('songs')}
          className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors relative ${activeTab === 'songs' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Music size={18} /> Songs
          {activeTab === 'songs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors relative ${activeTab === 'playlists' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <ListMusic size={18} /> Playlists
          {activeTab === 'playlists' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-400 rounded-t-full" />}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search songs or artists..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {activeTab === 'songs' ? (
          filteredSongs.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p>No songs found. Create one to get started!</p>
            </div>
          ) : (
            filteredSongs.map((song, index) => (
              <div
                key={song.id}
                onClick={() => {
                  setActiveSong(song.id);
                  navigate(`/edit/${song.id}`);
                }}
                className="group flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-gray-600 rounded-xl cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleMove(e, song.id, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={(e) => handleMove(e, song.id, 'down')}
                      disabled={index === filteredSongs.length - 1}
                      className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-gray-100">{song.title || 'Untitled'}</span>
                    <span className="text-sm text-gray-400">{song.artist || 'Unknown Artist'} • {song.lines.length} lines</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSong(song.id);
                      navigate(`/perform/${song.id}`);
                    }}
                    className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg"
                    title="Performance Mode"
                  >
                    <Play size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(e, song)}
                    className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg"
                    title="Duplicate"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, song.id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          // Playlists List
          playlists.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p>No playlists yet.</p>
            </div>
          ) : (
            playlists.map(playlist => (
              <div
                key={playlist.id}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                className="group flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-purple-600/50 rounded-xl cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-900/20 text-purple-400 rounded-lg">
                    <ListMusic size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-gray-100">{playlist.title}</span>
                    <span className="text-sm text-gray-400">{playlist.songs.length} songs</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete playlist?')) deletePlaylist(playlist.id);
                  }}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default Library;