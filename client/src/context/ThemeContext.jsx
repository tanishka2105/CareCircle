import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('carecircle_theme') || 'light' : 'light';
    } catch {
      return 'light';
    }
  });
  const [fontSize, setFontSize] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('carecircle_font_size') || 'normal' : 'normal';
    } catch {
      return 'normal';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-contrast');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'contrast') {
      root.classList.add('theme-contrast');
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('carecircle_theme', theme);
      }
    } catch {}
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-large', 'font-xlarge');

    if (fontSize === 'large') {
      root.classList.add('font-large');
    } else if (fontSize === 'xlarge') {
      root.classList.add('font-xlarge');
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('carecircle_font_size', fontSize);
      }
    } catch {}
  }, [fontSize]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'contrast';
      return 'light';
    });
  };

  const cycleFontSize = () => {
    setFontSize((prev) => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, fontSize, setFontSize, cycleFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
