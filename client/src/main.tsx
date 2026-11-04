import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { SplashProvider } from './lib/splash';
import './index.css';

// Register PWA service worker for offline resilience (future.md §4.2)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SplashProvider>
          <App />
        </SplashProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
