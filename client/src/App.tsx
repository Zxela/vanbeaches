import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { BeachDetail } from './pages/BeachDetail';
import { Compare } from './pages/Compare';

const DEFAULT_BEACH = 'kitsilano-beach';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to={`/beach/${DEFAULT_BEACH}`} replace />} />
            <Route path="/beach/:slug" element={<BeachDetail />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
