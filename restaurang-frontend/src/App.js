import React, { useState, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birthday: '',
    email: '',
    consent: false,
  });
  const [responseMsg, setResponseMsg] = useState('');
  const [googleUser, setGoogleUser] = useState(null);
  const responseRef = useRef(null);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, phone, birthday, email, consent } = formData;

    if (!name || !phone || !birthday || !email) {
      setResponseMsg('❌ Alla fält måste fyllas i.');
      scrollToResponse();
      return;
    }

    if (!isValidEmail(email)) {
      setResponseMsg('❌ Ogiltig e-postadress.');
      scrollToResponse();
      return;
    }

    if (!consent) {
      setResponseMsg('❌ Du måste godkänna villkoren.');
      scrollToResponse();
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, birthday, email }),
      });

      const json = await res.json();

      if (res.ok) {
        setResponseMsg('✅ Tack för din registrering! Ett bekräftelsemail har skickats.');
        setFormData({ name: '', phone: '', birthday: '', email: '', consent: false });
      } else {
        setResponseMsg(`⚠️ ${json.message || 'Något gick fel.'}`);
      }
    } catch (error) {
      console.error('❌ Fetch-fel:', error);
      setResponseMsg('❌ Kunde inte ansluta till servern.');
    } finally {
      scrollToResponse();
    }
  };

  const scrollToResponse = () => {
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleGoogleSuccess = async ({ credential }) => {
    try {
      const res = await fetch('http://localhost:3001/api/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (res.ok) {
        setGoogleUser(data.user);
        setResponseMsg(`✅ Inloggad som ${data.user.name}`);
      } else {
        setResponseMsg(`❌ ${data.message || 'Google-inloggning misslyckades.'}`);
      }
    } catch (error) {
      console.error('❌ Google login error:', error);
      setResponseMsg('❌ Något gick fel vid Google-inloggning.');
    } finally {
      scrollToResponse();
    }
  };

  const handleGoogleError = () => {
    console.error('❌ Google-inloggning misslyckades');
    setResponseMsg('❌ Google-inloggning misslyckades.');
    scrollToResponse();
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>Registrera dig</h2>

      {googleUser && (
        <p style={{ backgroundColor: '#e0ffe0', padding: '0.5rem', borderRadius: '4px' }}>
          Inloggad som <strong>{googleUser.name}</strong> ({googleUser.email})
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Namn"
          value={formData.name}
          onChange={handleChange}
          required
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <input
          name="phone"
          placeholder="Telefonnummer"
          value={formData.phone}
          onChange={handleChange}
          required
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <input
          name="birthday"
          placeholder="Födelsedatum (ÅÅÅÅ-MM-DD)"
          value={formData.birthday}
          onChange={handleChange}
          required
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <input
          name="email"
          type="email"
          placeholder="E-post"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />

        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            name="consent"
            checked={formData.consent}
            onChange={handleChange}
            required
          />{' '}
          Jag godkänner villkoren & GDPR
        </label>

        <button type="submit" style={{ width: '100%' }}>Skicka</button>
      </form>

      <p
        ref={responseRef}
        style={{
          color: responseMsg.startsWith('✅') ? 'green' : 'red',
          marginTop: '1rem',
          minHeight: '1.5rem'
        }}
      >
        {responseMsg}
      </p>

      <hr style={{ margin: '2rem 0' }} />

      <h3>Eller logga in med Google</h3>
      <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} width="100%" />
    </div>
  );
}

export default App;
