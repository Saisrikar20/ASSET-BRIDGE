import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './lib/auth';
import { LiveProvider } from './lib/live';
import Layout from './components/Layout';
import { ToastProvider } from './components/ui';

// Eager load Landing for instant First Contentful Paint
import Landing from './pages/Landing';

// Route-level code-splitting for optimal resource utilization & sub-second initial load
const AuthPage = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Verify = lazy(() => import('./pages/Verify'));
const Aggregate = lazy(() => import('./pages/Aggregate'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Heirs = lazy(() => import('./pages/Heirs'));
const Reunite = lazy(() => import('./pages/Reunite'));
const Cases = lazy(() => import('./pages/Cases'));
const CaseView = lazy(() => import('./pages/CaseView'));
const Guide = lazy(() => import('./pages/Guide'));
const ForecastPage = lazy(() => import('./pages/Forecast'));
const Invest = lazy(() => import('./pages/Invest'));
const LifePlan = lazy(() => import('./pages/LifePlan'));
const AvatarPage = lazy(() => import('./pages/Avatar'));
const HeirPortal = lazy(() => import('./pages/HeirPortal'));

function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="h-7 w-7 animate-spin text-brand-700" />
    </div>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <LiveProvider>
      <Layout />
    </LiveProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/heir" element={<HeirPortal />} />
          <Route path="/heir/:caseId" element={<HeirPortal />} />
          <Route path="/app" element={<Protected />}>
            <Route index element={<Dashboard />} />
            <Route path="verify" element={<Verify />} />
            <Route path="aggregate" element={<Aggregate />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="invest" element={<Invest />} />
            <Route path="plan" element={<LifePlan />} />
            <Route path="avatar" element={<AvatarPage />} />
            <Route path="heirs" element={<Heirs />} />
            <Route path="reunite" element={<Reunite />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/:id" element={<CaseView />} />
            <Route path="guide" element={<Guide />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
