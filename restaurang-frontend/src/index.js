import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Google Client ID från Google Cloud Console
const GOOGLE_CLIENT_ID = '309760125022-jdghu85trs3l9jsfi4tulcae8rb0u0cc.apps.googleusercontent.com';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
