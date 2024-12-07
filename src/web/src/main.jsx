import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { startMockServer } from './mockServer'

// Start the mock server
if (process.env.NODE_ENV === 'development') {
  console.log('Initializing mock server for development...');
  startMockServer();
}

console.log('Mounting React application...');
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
