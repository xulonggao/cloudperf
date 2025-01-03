import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Login from './pages/Login';
import IPSearch from './pages/IPSearch';
import ASNSearch from './pages/ASNSearch';
import NetworkSearch from './pages/NetworkSearch';
import CitySet from './pages/CitySet';
import { startMockServer } from './mockServer';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Check if user is authenticated
const isAuthenticated = () => {
  return document.cookie.split('; ').some(row => row.startsWith('token='));
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    // Start mock server
    startMockServer();
  }, []);

  return (
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
