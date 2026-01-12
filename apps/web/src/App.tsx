import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Navigation } from './components/layout/Navigation';
import { Today } from './pages/Today';
import { Goals } from './pages/Goals';
import { Review } from './pages/Review';
import { Settings } from './pages/Settings';
import { Toast } from './components/ui/Toast';

type Page = 'today' | 'goals' | 'review' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('today');
  const { theme, loadProfile, toast, clearToast } = useStore();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case 'today':
        return <Today />;
      case 'goals':
        return <Goals />;
      case 'review':
        return <Review />;
      case 'settings':
        return <Settings />;
      default:
        return <Today />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="container mx-auto px-4 py-6 max-w-4xl pb-24">
        {renderPage()}
      </main>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={clearToast}
        />
      )}
    </div>
  );
}
