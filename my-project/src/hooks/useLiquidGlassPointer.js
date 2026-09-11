import { useEffect } from 'react';

/**
 * useLiquidGlassPointer
 * 
 * High-performance global cursor light tracker for Liquid Glass elements.
 * Calculates dynamic (x, y) coordinates on hovered glass blocks and capsules,
 * driving fluid specular light refractions that follow the mouse in real time.
 * Strictly excludes map components.
 */
export function useLiquidGlassPointer() {
  useEffect(() => {
    let activeElements = new Set();
    let rafId = null;
    let lastEvent = null;

    const GLASS_SELECTOR = [
      '.dash-card:not(.map-view-card)',
      '.liquid-glass-card',
      '.weather-card',
      '.summary-box',
      '.hourly-section',
      '.forecast-section',
      '.gpt-chat-full-container',
      '.season-card',
      '.crop-category-card',
      '.agri-panel',
      '.settings-card',
      '.stat-card',
      '.climate-trends',
      '.chat-widget',
      '.topbar-search-box',
      '.topbar-settings-pill',
      '.pop-city-row',
      '.forecast-row-item',
      '.current-stats-bar',
      '.hourly-item',
      '.forecast-day',
      '.msg-body',
      '.crop-btn',
      '.setting-choice-btn',
      '.advisory-item',
      '.search-bar-box',
      '.popular-chip',
      '.alerts-modal-dropdown',
      '.alert-panel-card',
      '.risk-alert-toast',
      '.pro-alert-card',
      '.subpage-top-nav',
      '.subpage-back-button',
      '.view-dash-btn',
      '.quick-prompt-chip',
      '.gpt-lang-trigger-btn',
      '.gpt-tts-toggle-btn',
      '.crop-tag',
      '.about-badge',
    ].join(', ');

    const updatePointer = () => {
      if (!lastEvent) return;
      const { clientX, clientY } = lastEvent;

      // Find elements under cursor
      const hoveredElements = new Set();
      const target = document.elementFromPoint(clientX, clientY);

      if (target) {
        // Check if inside map view (strictly excluded)
        if (target.closest('.map-view-card') || target.closest('.map-card') || target.closest('.leaflet-container')) {
          // Clear active elements if over map
          activeElements.forEach((el) => {
            el.style.setProperty('--mouse-active', '0');
          });
          activeElements.clear();
          return;
        }

        // Search upward for any glass elements
        let current = target;
        while (current && current !== document.body) {
          if (current.matches && current.matches(GLASS_SELECTOR)) {
            hoveredElements.add(current);
          }
          current = current.parentElement;
        }
      }

      // Update active state and position for currently hovered glass blocks
      hoveredElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
        el.style.setProperty('--mouse-ratio-x', `${(x / Math.max(rect.width, 1)).toFixed(3)}`);
        el.style.setProperty('--mouse-ratio-y', `${(y / Math.max(rect.height, 1)).toFixed(3)}`);
        el.style.setProperty('--mouse-active', '1');
      });

      // Deactivate elements no longer hovered
      activeElements.forEach((el) => {
        if (!hoveredElements.has(el)) {
          el.style.setProperty('--mouse-active', '0');
        }
      });

      activeElements = hoveredElements;
    };

    const onPointerMove = (e) => {
      lastEvent = e;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          updatePointer();
          rafId = null;
        });
      }
    };

    const onPointerLeave = () => {
      activeElements.forEach((el) => {
        el.style.setProperty('--mouse-active', '0');
      });
      activeElements.clear();
      lastEvent = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      if (rafId) cancelAnimationFrame(rafId);
      activeElements.forEach((el) => {
        el.style.setProperty('--mouse-active', '0');
      });
      activeElements.clear();
    };
  }, []);
}
