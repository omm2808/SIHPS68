import { useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import WeatherGPTPage from './pages/WeatherGPTPage';
import AgriculturePage from './pages/AgriculturePage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  const [page, setPage] = useState('home');

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage onNavigateSearch={() => setPage('search')} />;
      case 'search':
        return <SearchPage />;
      case 'weathergpt':
        return <WeatherGPTPage />;
      case 'agriculture':
        return <AgriculturePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage onNavigateSearch={() => setPage('search')} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="app-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
