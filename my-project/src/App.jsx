import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SubpageNavBar from './components/SubpageNavBar';
import WeatherBackground from './components/WeatherBackground';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import WeatherGPTPage from './pages/WeatherGPTPage';
import AgriculturePage from './pages/AgriculturePage';
import SettingsPage from './pages/SettingsPage';
import { useLiquidGlassPointer } from './hooks/useLiquidGlassPointer';
import './App.css';

import { SettingsProvider } from './context/SettingsContext';
import { WeatherProvider } from './context/WeatherContext';

function App() {
  // Activate dynamic cursor specular light following effect across all liquid glass blocks
  useLiquidGlassPointer();

  const [page, setPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['search', 'weathergpt', 'agriculture', 'settings'].includes(hash) ? hash : 'home';
  });
  const [history, setHistory] = useState(['home']);

  // Sync with browser native Back / Forward history
  useEffect(() => {
    const onPopState = (e) => {
      const target = e.state?.page || window.location.hash.replace('#', '') || 'home';
      setPage(target);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (targetPage) => {
    if (targetPage === page) return;
    window.history.pushState({ page: targetPage }, '', targetPage === 'home' ? ' ' : `#${targetPage}`);
    setHistory((prev) => {
      const next = [...prev, targetPage];
      return next.slice(-20);
    });
    setPage(targetPage);
  };

  const navigateBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop(); // Remove current page
      const prev = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setPage(prev);
      window.history.pushState({ page: prev }, '', prev === 'home' ? ' ' : `#${prev}`);
    } else if (page !== 'home') {
      setPage('home');
      setHistory(['home']);
      window.history.pushState({ page: 'home' }, '', ' ');
    }
  };

  const previousPage = history.length > 1 ? history[history.length - 2] : (page !== 'home' ? 'home' : null);

  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <HomePage
            onNavigateSearch={() => navigateTo('search')}
            onNavigateSettings={() => navigateTo('settings')}
          />
        );
      case 'search':
        return <SearchPage onNavigateBack={navigateBack} />;
      case 'weathergpt':
        return <WeatherGPTPage onNavigateBack={navigateBack} />;
      case 'agriculture':
        return <AgriculturePage onNavigateBack={navigateBack} />;
      case 'settings':
        return <SettingsPage onNavigateDashboard={() => navigateTo('home')} />;
      default:
        return (
          <HomePage
            onNavigateSearch={() => navigateTo('search')}
            onNavigateSettings={() => navigateTo('settings')}
          />
        );
    }
  };

  return (
    <SettingsProvider>
      <WeatherProvider>
        <div className="app-shell">
          <WeatherBackground />
          <Sidebar
            activePage={page}
            onNavigate={navigateTo}
          />
          <main className="app-content">
            {page !== 'home' && (
              <SubpageNavBar
                currentPage={page}
                previousPage={previousPage}
                onNavigateBack={navigateBack}
                onNavigateHome={() => navigateTo('home')}
              />
            )}
            {renderPage()}
          </main>
        </div>
      </WeatherProvider>
    </SettingsProvider>
  );
}

export default App;
