import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Travel from './pages/Travel.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import Assistant from './pages/Assistant.jsx';
import NotFound from './pages/NotFound.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Apply from './pages/Apply.jsx';
import Documents from './pages/Documents.jsx';
import { GuestRoute, ProtectedRoute } from './auth/RouteGuards.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/travel" element={<Travel />} />
        <Route path="/apply" element={<ProtectedRoute><Apply /></ProtectedRoute>} />
        <Route path="/applications/:id/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        {/* Navigation placeholders: these features do not exist yet. */}
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/contact" element={<ComingSoon page="contact" />} />
        {/* Stage 3: authentication */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
