import { useEffect } from "react";

export default function GoogleOneTapLogin({ onLogin }) {
  useEffect(() => {
    // Make sure window.google exists
    const loadOneTap = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, // must start with NEXT_PUBLIC
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        window.google.accounts.id.prompt(); // show the One Tap popup
      };
    };

    loadOneTap();
  }, []);

  const handleCredentialResponse = async (response) => {
    // response.credential is the ID token
    const res = await fetch("http://localhost:3001/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    const data = await res.json();
    if (data.accessToken) {
      console.log("Login successful:", data.user);
      onLogin(data); // send accessToken + user info to app state
    } else {
      console.error("Login failed:", data);
    }
  };

  return null;
}
