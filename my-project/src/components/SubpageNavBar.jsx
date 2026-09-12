import {
  ArrowLeft,
  LayoutDashboard,
  Compass,
  Bot,
  Sprout,
  Settings,
  FileText,
} from 'lucide-react';

const PAGE_CONFIG = {
  home: { label: 'Dashboard', icon: LayoutDashboard },
  search: { label: 'Search & Maps', icon: Compass },
  weathergpt: { label: 'WeatherGPT', icon: Bot },
  agriculture: { label: 'Agriculture', icon: Sprout },
  settings: { label: 'Settings', icon: Settings },
};

/**
 * SubpageNavBar
 * 
 * Standard, modern website top navigation bar with dynamic Back button
 * and clickable breadcrumb navigation.
 */
export default function SubpageNavBar({
  currentPage,
  previousPage,
  onNavigateBack,
  onNavigateHome,
}) {
  const current = PAGE_CONFIG[currentPage] || { label: currentPage, icon: FileText };
  const prev = PAGE_CONFIG[previousPage] || PAGE_CONFIG.home;
  const CurrentIcon = current.icon;

  return (
    <header className="subpage-top-nav" role="navigation" aria-label="Page navigation">
      <div className="subpage-nav-inner">
        {/* Dynamic Back Button */}
        <button
          className="subpage-back-button"
          onClick={onNavigateBack}
          title={`Return to ${prev.label}`}
        >
          <ArrowLeft size={16} className="back-arrow-icon" />
          <span className="back-button-text">
            Back to <strong className="back-target-name">{prev.label}</strong>
          </span>
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className="subpage-breadcrumbs" aria-label="Breadcrumb">
          <button
            className="breadcrumb-item breadcrumb-link"
            onClick={onNavigateHome}
            title="Go to Dashboard Home"
          >
            <LayoutDashboard size={14} className="breadcrumb-icon" />
            <span>Dashboard</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item breadcrumb-current" aria-current="page">
            <CurrentIcon size={14} className="breadcrumb-icon" />
            <span>{current.label}</span>
          </span>
        </nav>
      </div>
    </header>
  );
}
