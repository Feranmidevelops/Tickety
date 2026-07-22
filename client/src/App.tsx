import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { RequireAuth } from './auth/guards';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AcceptInvite } from './pages/AcceptInvite';
import { Queue } from './pages/Queue';
import { MyTickets } from './pages/MyTickets';
import { NewTicket } from './pages/NewTicket';
import { TicketDetail } from './pages/TicketDetail';
import { AdminInvites } from './pages/AdminInvites';
import { Users } from './pages/Users';

/** Sends the signed-in user to the landing page that matches their role. */
function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'Requester' ? '/my-tickets' : '/queue'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<RoleHome />} />
          <Route path="queue" element={
            <RequireAuth roles={['Agent', 'Admin']}><Queue /></RequireAuth>} />
          <Route path="my-tickets" element={<MyTickets />} />
          <Route path="new" element={<NewTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="users" element={
            <RequireAuth roles={['Admin']}><Users /></RequireAuth>} />
          <Route path="admin/invites" element={
            <RequireAuth roles={['Admin']}><AdminInvites /></RequireAuth>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
