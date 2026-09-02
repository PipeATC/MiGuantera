import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Fuente auto-hospedada (offline-first): el primer render no depende de la red
// ni de Google Fonts. Solo los pesos que usa la app.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './index.css';

// basename permite que la app funcione bajo un subpath (p. ej. GitHub Pages
// en /MiGuantera/). Vite expone la base en import.meta.env.BASE_URL.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
