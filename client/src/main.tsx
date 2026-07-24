import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/tokens.css';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { PresenceProvider } from './realtime/PresenceContext';
import { NotificationsProvider } from './realtime/NotificationsContext';
import { ToastProvider } from './components/Toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PresenceProvider>
          <ToastProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </ToastProvider>
        </PresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
