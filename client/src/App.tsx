import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SmartRedirect } from './components/SmartRedirect';
import { BeachDetail } from './pages/BeachDetail';
import { Discover } from './pages/Discover';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SmartRedirect />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/beach/:slug" element={<BeachDetail />} />
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
