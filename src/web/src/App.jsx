import { useState, useEffect, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Login from './pages/Login';
import IPSearch from './pages/IPSearch';
import ASNSearch from './pages/ASNSearch';
import NetworkSearch from './pages/NetworkSearch';
import CitySet from './pages/CitySet';
import Maintenance from './pages/Maintenance';
import Status from './pages/Status';
// 创建主题Context
export const ThemeContext = createContext();

// 定义主题配置
const themeConfigs = {
  black: {
    primary: {
      main: '#212121',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  blue: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  orange: {
    primary: {
      main: '#ff9800',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  green: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#dc004e',
    },
  },
};


// Check if user is authenticated
const isAuthenticated = () => {
  return document.cookie.split('; ').some(row => row.startsWith('cp_token='));
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

function App() {
  const [currentTheme, setCurrentTheme] = useState('black');

  // 创建主题
  const theme = createTheme({
    palette: {
      mode: 'light',
      ...themeConfigs[currentTheme],
    },
  });

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/search" replace />} />
              <Route path="ipsearch" element={<IPSearch />} />
              <Route path="asnsearch" element={<ASNSearch />} />
              <Route path="search" element={<NetworkSearch />} />
              <Route path="cityset" element={<CitySet />} />
              <Route path="status" element={<Status />} />
              <Route path="maintenance" element={<Maintenance />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
