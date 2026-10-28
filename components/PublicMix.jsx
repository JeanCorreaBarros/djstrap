"use client";
import { useState } from "react";
import { MixCard } from "./Community";

// Tarjeta interactiva en las páginas públicas (/mix/[id] y /mezclas)
export default function PublicMix({ mix, loggedIn }) {
  const [m, setM] = useState(mix);
  return <MixCard mix={m} onChange={setM} loggedIn={loggedIn} />;
}
