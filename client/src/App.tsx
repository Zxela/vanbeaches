import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { BeachDetail } from './pages/BeachDetail';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/beach/:slug" element={<BeachDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
