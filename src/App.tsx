import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Game from './pages/Game';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/stickpuzzle" element={<Home />} />
        <Route path="/stickpuzzle/room/:id" element={<Room />} />
        <Route path="/stickpuzzle/game/:id" element={<Game />} /> 
      </Routes>
    </Router>
  );
}

export default App;
