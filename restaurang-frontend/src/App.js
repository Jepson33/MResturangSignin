import React, { useState, useRef } from "react";
import { GoogleLogin } from "@react-oauth/google";
import "./style.css";

export default function App() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birthday: "",
    email: "",
    consent: false,
  });
  const [responseMsg, setResponseMsg] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const responseRef = useRef(null);

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, phone, birthday, email, consent } = formData;

    if (!name || !phone || !birthday || !email) {
      setResponseMsg("❌ Alla fält måste fyllas i.");
      scrollToResponse();
      return;
    }

    if (!isValidEmail(email)) {
      setResponseMsg("❌ Ogiltig e-postadress.");
      scrollToResponse();
      return;
    }

    if (!consent) {
      setResponseMsg("❌ Du måste godkänna villkoren.");
      scrollToResponse();
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, birthday, email }),
      });

      const json = await res.json();

      if (res.ok) {
        setResponseMsg("✅ Tack för din registrering! Ett bekräftelsemail har skickats.");
        setFormData({ name: "", phone: "", birthday: "", email: "", consent: false });
      } else {
        setResponseMsg(`⚠️ ${json.message || "Något gick fel."}`);
      }
    } catch (error) {
      setResponseMsg("❌ Kunde inte ansluta till servern.");
    } finally {
      scrollToResponse();
    }
  };

  const scrollToResponse = () => {
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleGoogleSuccess = async ({ credential }) => {
    try {
      const res = await fetch("http://localhost:3001/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (res.ok) {
        setGoogleUser(data.user);
        setResponseMsg(`✅ Inloggad som ${data.user.name}`);
      } else {
        setResponseMsg(`❌ ${data.message || "Google-inloggning misslyckades."}`);
      }
    } catch (error) {
      setResponseMsg("❌ Något gick fel vid Google-inloggning.");
    } finally {
      scrollToResponse();
    }
  };

  const handleGoogleError = () => {
    setResponseMsg("❌ Google-inloggning misslyckades.");
    scrollToResponse();
  };

  return (
    <div className="bg-gradient">
      <div className="register-card">
        <div className="logo-circle">
          <span className="logo-text">M</span>
        </div>
        <h2 className="register-title">Registrera dig</h2>
        <p className="register-desc">
          Fyll i dina uppgifter nedan för att få tillgång till erbjudanden & förmåner.
        </p>
        <form onSubmit={handleSubmit} className="register-form">
          <input
            name="name"
            placeholder="Namn"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
            autoComplete="off"
          />
          <input
            name="phone"
            placeholder="Telefonnummer"
            value={formData.phone}
            onChange={handleChange}
            required
            className="input"
            autoComplete="off"
          />
          <input
            name="birthday"
            type="date"
            placeholder="Födelsedatum"
            value={formData.birthday}
            onChange={handleChange}
            required
            className="input"
            autoComplete="off"
            max={new Date().toISOString().split("T")[0]}
          />
          <input
            name="email"
            type="email"
            placeholder="E-post"
            value={formData.email}
            onChange={handleChange}
            required
            className="input"
            autoComplete="off"
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={handleChange}
              required
            />
            Jag godkänner villkoren & GDPR
          </label>

          <button type="submit" className="btn-gradient">
            Skicka
          </button>
        </form>

        <p
          ref={responseRef}
          className={`response-msg ${
            responseMsg.startsWith("✅") ? "success" : responseMsg ? "error" : ""
          }`}
        >
          {responseMsg}
        </p>

        <div className="divider">
          <span>Eller logga in med Google</span>
        </div>
        <div className="google-btn-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            width="100%"
          />
        </div>
      </div>
    </div>
  );
}
