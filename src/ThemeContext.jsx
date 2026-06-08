import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState('nexus');

  const allThemes = [
    // Changed bgMain and bgSurface to pure, deep obsidian grays
    { id: 'nexus', name: 'Nexus Prime', primary: '#d4af37', bgMain: '8, 8, 8', bgSurface: '14, 14, 14' },
    { id: 'void', name: 'Astral Void', primary: '#60a5fa', bgMain: '2, 4, 10', bgSurface: '8, 12, 20' },
    { id: 'abyssal', name: 'Abyssal Depth', primary: '#10b981', bgMain: '1, 6, 4', bgSurface: '4, 11, 8' },
    { id: 'crimson', name: 'Crimson Ash', primary: '#ef4444', bgMain: '10, 2, 2', bgSurface: '18, 4, 4' }
  ];

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, allThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);