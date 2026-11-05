import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
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
import { isProtectedPath } from './utils/navigation';

// axiosClient clears the token and fires `auth:unauthorized` on a 401. On pages that need a
// signed-in user, send the visitor to the login page and bring them back afterwards.
function AuthWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleUnauthorized = () => {
      if (!isProtectedPath(location.pathname)) return;
      const back = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?redirect=${back}`, { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate, location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthWatcher />
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
    </ToastProvider>
  );
}
