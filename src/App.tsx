import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TimelinePage } from './pages/TimelinePage';
import { CalendarPage } from './pages/CalendarPage';
import { GalleryPage } from './pages/GalleryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { TagFilterPage } from './pages/TagFilterPage';
import { EditorPage } from './pages/EditorPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

import { SecurityProvider } from './contexts/SecurityContext'; // Context provider
import { AppLock } from './components/AppLock'; // Lock screen component

function App() {
  return (
    <SecurityProvider>
      <AppLock />
      <Layout>
        <Routes>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/tag/:tag" element={<TagFilterPage />} />
          <Route path="/editor/new" element={<EditorPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </SecurityProvider>
  );
}

export default App
