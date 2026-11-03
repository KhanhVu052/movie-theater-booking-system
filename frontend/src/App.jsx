import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang chủ GoToro Cinema */}
        <Route path="/" element={<Home />} />

        {/* Trang Đăng nhập & Đăng ký */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Khi bấm vào 1 bộ phim (Sẽ làm trang Chi tiết & Chọn ghế ở bước tiếp theo) */}
        <Route path="/movies/:id" element={<Home />} />

        {/* Đường dẫn không tồn tại tự động về Trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}