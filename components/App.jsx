"use client";
import { useState } from "react";
import { api } from "../lib/api";
import Auth from "./Auth";
import DJ from "./DJ";

// initialUser llega del servidor (cookie), así no hay parpadeo y Google ve la landing
export default function App({ initialUser, nav, hero, rest }) {
  const [user, setUser] = useState(initialUser);

  if (!user) {
    return (
      <main className="landing">
        {nav}
        <section className="hero" id="inicio">
          <div className="hero-text">{hero}</div>
          <Auth onAuth={setUser} />
        </section>
        {rest}
      </main>
    );
  }
  return (
    <DJ
      key={user.id}
      user={user}
      onLogout={async () => {
        await api.logout().catch(() => {});
        location.href = "/";
      }}
    />
  );
}
