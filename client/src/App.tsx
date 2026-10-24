import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './lib/auth';
import { LiveProvider } from './lib/live';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';
import Aggregate from './pages/Aggregate';
import Alerts from './pages/Alerts';
import Heirs from './pages/Heirs';
import Reunite from './pages/Reunite';
import Cases from './pages/Cases';
import CaseView from './pages/CaseView';
import Guide from './pages/Guide';
import ForecastPage from './pages/Forecast';
import Invest from './pages/Invest';
import LifePlan from './pages/LifePlan';
import AvatarPage from './pages/Avatar';
import HeirPortal from './pages/HeirPortal';

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
  );
}
