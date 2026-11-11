/**
 * Theme Manager - Dark/Light Mode Toggle
 */

// Check for saved theme preference or default to 'dark' mode
const savedTheme = localStorage.getItem('theme');
const currentTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';

// Try to apply immediately (body may or may not exist yet)
applyTheme(currentTheme);

// On DOMContentLoaded: ensure theme is applied and UI is synced
document.addEventListener('DOMContentLoaded', () => {
    // Remove the early-load helper class
    document.documentElement.classList.remove('dark-mode-loading');

    // Re-apply theme now that body definitely exists
    applyTheme(currentTheme);
    updateThemeUI(currentTheme);

    // Persist default if missing
    if (!savedTheme) {
        localStorage.setItem('theme', currentTheme);
    }
});

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';

    applyTheme(newTheme);
    updateThemeUI(newTheme);

    // Save preference
    localStorage.setItem('theme', newTheme);
}

/**
 * Apply theme to body
 */
function applyTheme(theme) {
    const body = document.body;
    if (!body) return;

    if (theme === 'dark') {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

/**
 * Update theme toggle UI (checkbox and labels)
 */
function updateThemeUI(theme) {
    const checkbox = document.getElementById('theme-toggle');
    const lightLabel = document.getElementById('light-label');
    const darkLabel = document.getElementById('dark-label');

    if (theme === 'dark') {
        if (checkbox) checkbox.checked = true;
        if (lightLabel) lightLabel.classList.remove('active');
        if (darkLabel) darkLabel.classList.add('active');
    } else {
        if (checkbox) checkbox.checked = false;
        if (lightLabel) lightLabel.classList.add('active');
        if (darkLabel) darkLabel.classList.remove('active');
    }
}

// Export functions
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.updateThemeUI = updateThemeUI;
