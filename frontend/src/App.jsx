import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';
import Payment from './pages/Payment';
import PaymentResult from './pages/PaymentResult';

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

        {/* Seat Selection & 10-Minute Hold */}
        <Route path="/booking/:showtimeId" element={<SeatSelection />} />

        {/* Payment Checkout & VNPAY Integration */}
        <Route path="/payment/:bookingId" element={<Payment />} />

        {/* Payment Confirmation & Digital E-Ticket */}
        <Route path="/payment/result" element={<PaymentResult />} />
        <Route path="/payment/vnpay-return" element={<PaymentResult />} />

        {/* Fallback wildcard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
