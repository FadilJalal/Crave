import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import "./i18n.mjs";
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import StoreContextProvider from './Context/StoreContext';
import { ThemeProvider } from './Context/ThemeContext';

// NEW
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { GoogleOAuthProvider } from '@react-oauth/google';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StoreContextProvider>
      <ThemeProvider>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <Elements stripe={stripePromise}>
            <App />
          </Elements>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </StoreContextProvider>
  </BrowserRouter>,
);