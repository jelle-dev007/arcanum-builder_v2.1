import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState('nexus');

  const allThemes = [
    // NEXUS PRIME — Burnished gold on void obsidian. The default.
    {
      id: 'nexus',
      name: 'Nexus Prime',
      primary: '#c9a84c',
      bgMain: '5, 5, 8',
      bgSurface: '11, 11, 16'
    },
    // ASTRAL VOID — Cold starlight blue on deep cosmic black.
    {
      id: 'void',
      name: 'Astral Void',
      primary: '#7eb8d4',
      bgMain: '3, 5, 12',
      bgSurface: '7, 10, 22'
    },
    // ABYSSAL DEPTH — Bioluminescent teal on sunken-sea black.
    {
      id: 'abyssal',
      name: 'Abyssal Depth',
      primary: '#4ecdc4',
      bgMain: '2, 8, 8',
      bgSurface: '4, 14, 14'
    },
    // CRIMSON ASH — Smoldering ember red on scorched obsidian.
    {
      id: 'crimson',
      name: 'Crimson Ash',
      primary: '#c96b5a',
      bgMain: '10, 3, 3',
      bgSurface: '18, 5, 5'
    },
    // LUNAR VEIL — Pearl moonlight on deep moonless sky.
    {
      id: 'lunar',
      name: 'Lunar Veil',
      primary: '#d0ccc6',
      bgMain: '4, 4, 7',
      bgSurface: '9, 9, 15'
    }
  ];

  return (
      <ThemeContext.Provider value={{ themeId, setThemeId, allThemes }}>
        {children}
      </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);