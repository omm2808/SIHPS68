const PAGE_CONFIG = {
  home: { label: 'Dashboard', icon: '⊞' },
  search: { label: 'Search & Maps', icon: '🗺️' },
  weathergpt: { label: 'WeatherGPT', icon: '🤖' },
  agriculture: { label: 'Agriculture', icon: '🌾' },
  settings: { label: 'Settings', icon: '⚙️' },
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
  const current = PAGE_CONFIG[currentPage] || { label: currentPage, icon: '📄' };
  const prev = PAGE_CONFIG[previousPage] || PAGE_CONFIG.home;

  return (
    <header className="subpage-top-nav" role="navigation" aria-label="Page navigation">
      <div className="subpage-nav-inner">
        {/* Dynamic Back Button */}
        <button
          className="subpage-back-button"
          onClick={onNavigateBack}
          title={`Return to ${prev.label}`}
        >
          <span className="back-arrow-icon">←</span>
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
            <span className="breadcrumb-icon">⊞</span>
            <span>Dashboard</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item breadcrumb-current" aria-current="page">
            <span className="breadcrumb-icon">{current.icon}</span>
            <span>{current.label}</span>
          </span>
        </nav>
      </div>
    </header>
  );
}
