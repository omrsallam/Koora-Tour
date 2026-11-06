import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore, dashboardPath } from './store/store';
import Layout from './components/Layout';
import Home from './pages/Home';
import Matches, { MatchDetail } from './pages/Matches';
import Standings, { Stats } from './pages/Standings';
import Teams, { TeamDetail, PlayerProfile } from './pages/Teams';
import Highlights from './pages/Highlights';
import News, { Article } from './pages/News';
import Venues from './pages/Venues';
import Login, { MyKoora } from './pages/Login';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import { CaptainDashboard, PlayerDashboard } from './pages/dashboards/TeamDashboards';
import { Empty } from './components/ui';

function DashboardRedirect() {
  const { user } = useStore();
  return <Navigate to={dashboardPath(user)} replace />;
}

export default function App() {
  return (
    <StoreProvider>
      {/* Hash routing lets the site run on any static host (GitHub Pages, Netlify, S3) with no server rewrites. */}
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="matches" element={<Matches />} />
            <Route path="matches/:id" element={<MatchDetail />} />
            <Route path="standings" element={<Standings />} />
            <Route path="stats" element={<Stats />} />
            <Route path="teams" element={<Teams />} />
            <Route path="teams/:id" element={<TeamDetail />} />
            <Route path="players/:id" element={<PlayerProfile />} />
            <Route path="highlights" element={<Highlights />} />
            <Route path="news" element={<News />} />
            <Route path="news/:id" element={<Article />} />
            <Route path="venues" element={<Venues />} />
            <Route path="login" element={<Login />} />
            <Route path="my-koora" element={<MyKoora />} />
            <Route path="dashboard" element={<DashboardRedirect />} />
            <Route path="dashboard/admin" element={<AdminDashboard />} />
            <Route path="dashboard/staff" element={<StaffDashboard />} />
            <Route path="dashboard/captain" element={<CaptainDashboard />} />
            <Route path="dashboard/player" element={<PlayerDashboard />} />
            <Route path="*" element={<section className="section"><div className="container"><Empty>Page not found.</Empty></div></section>} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
