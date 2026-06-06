// Zenith Theme Manager — include on every page
(function() {
  const STORAGE_KEY = 'zenith-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(btn => {
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    });
  }

  function toggleTheme() {
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply on load immediately to avoid flash
  applyTheme(getTheme());

  // Export globally
  window.zenithTheme = { toggle: toggleTheme, get: getTheme, apply: applyTheme };

  // Auto-wire any .theme-toggle button
  document.addEventListener('DOMContentLoaded', function() {
    applyTheme(getTheme());
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  });
})();
