import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Game from './pages/Game';
import { routes } from './routes';

function App() {
  return (
    <Router>
      <Routes>
        <Route path={routes.home()} element={<Home />} />
        <Route path={`${routes.home()}/rooms/:roomID`} element={<Room />} />
        <Route path={`${routes.home()}/game/:roomID`} element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;
