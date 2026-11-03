import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* GoToro Cinema Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Authentication Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Movie Detail Page */}
        <Route path="/movies/:id" element={<MovieDetail />} />

        {/* Seat Selection & Booking */}
        <Route path="/booking/:showtimeId" element={<SeatSelection />} />

        {/* Fallback wildcard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
