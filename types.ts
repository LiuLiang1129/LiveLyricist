export type FontSize = 'L' | 'XL' | 'XXL';

export interface SongSettings {
  targetLen: number;
  fontSize: FontSize;
  showProgress: boolean;
}

export interface Line {
  content: string;
  instruction?: string;
  style?: {
    color?: string;
    backgroundColor?: string;
  };
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  rawLyrics: string;
  lines: Line[];
  settings: SongSettings;
  updatedAt: number;
}

export interface Playlist {
  id: string;
  title: string;
  songs: string[]; // List of Song IDs
  createdAt: number;
}

export interface LibraryBackup {
  songs: Song[];
  playlists?: Playlist[];
}

export interface LibraryState {
  songs: Song[];
  playlists: Playlist[];
  activeSongId: string | null;
  addSong: (song: Song) => void;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  moveSong: (id: string, direction: 'up' | 'down') => void;
  setActiveSong: (id: string | null) => void;

  // Playlist Actions
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;

  importLibrary: (data: LibraryBackup) => void;
}

// Runtime state for the editor/performance
export interface RuntimeState {
  currentLineIndex: number;
  performanceQueue: string[] | null; // List of song IDs to play in order. If inull, use all songs.
  setCurrentLineIndex: (index: number) => void;
  setPerformanceQueue: (queue: string[] | null) => void;
  nextLine: (totalLines: number) => void;
  prevLine: () => void;
}