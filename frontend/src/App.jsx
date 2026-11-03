import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';
import Payment from './pages/Payment';
import PaymentResult from './pages/PaymentResult';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

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

        {/* Customer Booking History & Reviews */}
        <Route path="/my-bookings" element={<MyBookings />} />

        {/* Admin Management & Revenue Reporting Console */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
