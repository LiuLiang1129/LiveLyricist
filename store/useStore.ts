import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LibraryState, RuntimeState, Song } from '../types';

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      songs: [],
      playlists: [],
      activeSongId: null,
      addSong: (song) => set((state) => ({
        songs: [song, ...state.songs],
        activeSongId: song.id
      })),
      updateSong: (id, updates) => set((state) => ({
        songs: state.songs.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
        )
      })),
      deleteSong: (id) => set((state) => ({
        songs: state.songs.filter((s) => s.id !== id),
        activeSongId: state.activeSongId === id ? null : state.activeSongId
      })),
      moveSong: (id, direction) => set((state) => {
        const index = state.songs.findIndex(s => s.id === id);
        if (index === -1) return state;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= state.songs.length) return state;

        const newSongs = [...state.songs];
        [newSongs[index], newSongs[newIndex]] = [newSongs[newIndex], newSongs[index]];

        return { songs: newSongs };
      }),
      setActiveSong: (id) => set({ activeSongId: id }),

      addPlaylist: (playlist) => set((state) => ({
        playlists: [playlist, ...state.playlists]
      })),
      updatePlaylist: (id, updates) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        )
      })),
      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id)
      })),

      importLibrary: (data) => set((state) => {
        let newSongs: typeof state.songs = [];
        let newPlaylists: typeof state.playlists = [];

        if (Array.isArray(data)) {
          // Legacy format: just an array of songs
          newSongs = data;
        } else {
          // New format: object with songs and playlists
          newSongs = data.songs || [];
          newPlaylists = data.playlists || [];
        }

        return {
          songs: [...state.songs, ...newSongs],
          playlists: [...state.playlists, ...newPlaylists]
        };
      })
    }),
    {
      name: 'livelyricist-library',
    }
  )
);

export const useRuntimeStore = create<RuntimeState>((set) => ({
  currentLineIndex: 0,
  performanceQueue: null,
  setCurrentLineIndex: (index) => set({ currentLineIndex: Math.max(0, index) }),
  setPerformanceQueue: (queue) => set({ performanceQueue: queue }),
  nextLine: (totalLines) => set((state) => ({
    currentLineIndex: totalLines <= 0
      ? 0
      : Math.min(state.currentLineIndex + 1, totalLines - 1)
  })),
  prevLine: () => set((state) => ({
    currentLineIndex: Math.max(state.currentLineIndex - 1, 0)
  })),
}));
