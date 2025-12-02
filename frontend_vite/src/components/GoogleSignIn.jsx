// src/components/GoogleSignIn.jsx
import React, { useEffect, useRef } from "react";
import api, { setAuthToken } from "../api";   // <-- FIXED

export default function GoogleSignIn({ onLogin }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google) return;

    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    google.accounts.id.renderButton(buttonRef.current, {
      theme: "filled_blue",
      size: "large",
      shape: "pill",
    });
  }, []);

  async function handleCredentialResponse(response) {
    try {
      const res = await api.post("/auth/login-google", {
        idToken: response.credential,
      });

      const token = res?.data?.token;
      const user = res?.data?.user;

      if (token) {
        setAuthToken(token); 
      }

      if (onLogin) onLogin(user);
    } catch (err) {
      console.error("Login exchange failed", err);
      alert("Google login failed");
    }
  }

  return <div ref={buttonRef}></div>;
}
