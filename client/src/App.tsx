import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SmartRedirect } from './components/SmartRedirect';
import { BeachDetail } from './pages/BeachDetail';
import { Discover } from './pages/Discover';

const Coast = lazy(() => import('./pages/Coast'));

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SmartRedirect />} />
          <Route path="/discover" element={<Discover />} />
          <Route
            path="/coast"
            element={
              <Suspense fallback={<output className="block p-8">Preparing the coast…</output>}>
                <Coast />
              </Suspense>
            }
          />
          <Route path="/beach/:slug" element={<BeachDetail />} />
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
