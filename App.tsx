import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Library from './components/Library';
import Editor from './components/Editor';
import Performance from './components/Performance';
import PlaylistEditor from './components/PlaylistEditor';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/edit/:id" element={<Editor />} />
        <Route path="/playlist/:id" element={<PlaylistEditor />} />
        <Route path="/perform/:id" element={<Performance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;