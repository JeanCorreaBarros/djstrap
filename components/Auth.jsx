"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const ico = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  arrow: "M5 12h14m-5-5 5 5-5 5",
};
const I = ({ n }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ico[n]} />
  </svg>
);

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // "#login" (botón Iniciar sesión) abre la pestaña Entrar
  useEffect(() => {
    const sync = () => {
      if (location.hash === "#login") setMode("login");
      else if (location.hash === "#entrar") setMode("register");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user } = mode === "login" ? await api.login(username, password) : await api.register(username, password);
      onAuth(user);
    } catch (x) {
      setError(x.message);
    }
    setBusy(false);
  }

  return (
    <div className="authwrap" id="entrar">
      <span id="login" className="anchor" />
      <form className="authbox" onSubmit={submit}>
        <div className="authhead">
          <span className="authlogo" aria-hidden="true" />
          <b className="authtitle">{mode === "login" ? "Entra a tu cabina" : "Crea tu cuenta gratis"}</b>
        </div>
        <div className="authtabs">
          <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Crear cuenta</button>
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Entrar</button>
        </div>
        <label className="field">
          <I n="user" />
          <input autoComplete="username" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <I n="lock" />
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Contraseña (mínimo 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="go" disabled={busy}>
          <I n="arrow" />
          {busy ? "…" : mode === "login" ? "ENTRAR" : "EMPEZAR A MEZCLAR"}
        </button>
        {error && <p className="error">{error}</p>}
        <small>Tus playlists, listas de mezcla y archivos quedan guardados en tu cuenta.</small>
      </form>
    </div>
  );
}
