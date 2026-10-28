import { notFound } from "next/navigation";
import { getMix } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";
import { SITE_URL, SITE_NAME } from "../../../lib/site";
import PublicMix from "../../../components/PublicMix";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const m = await getMix(params.id);
  if (!m) return { title: "Mezcla no encontrada" };
  const description = m.description || `Escucha la mezcla "${m.title}" de ${m.author} en ${SITE_NAME}, la consola DJ online.`;
  return {
    title: `${m.title} — mezcla de ${m.author}`,
    description,
    alternates: { canonical: `/mix/${m.id}` },
    openGraph: { type: "music.song", title: m.title, description, url: `/mix/${m.id}`, audio: `${SITE_URL}/api/mixes/${m.id}/audio` },
  };
}

export default async function MixPage({ params }) {
  const u = await currentUser();
  const m = await getMix(params.id, u?.id);
  if (!m) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: m.title,
    byArtist: { "@type": "Person", name: m.author },
    duration: `PT${Math.floor(m.dur / 60)}M${Math.floor(m.dur % 60)}S`,
    datePublished: new Date(m.created).toISOString(),
    url: `${SITE_URL}/mix/${m.id}`,
    audio: { "@type": "AudioObject", contentUrl: `${SITE_URL}/api/mixes/${m.id}/audio`, encodingFormat: m.mime },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: m.likes },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/ListenAction", userInteractionCount: m.plays },
    ],
  };
  return (
    <main className="pubpage">
      <nav className="pubnav">
        <a href="/" className="publogo">✦ {SITE_NAME}</a>
        <a href="/mezclas">Mezclas</a>
        <a href="/" className="primary">{u ? "Ir a mi cabina" : "Crear cuenta gratis"}</a>
      </nav>
      <section className="page">
        <header className="phead">
          <small>MEZCLA DE LA COMUNIDAD</small>
          <h1 className="pubh1">{m.title}</h1>
          <p>por {m.author}</p>
        </header>
        <PublicMix mix={m} loggedIn={!!u} />
        {!u && <p className="hint">Crea tu cuenta gratis para dar me gusta, comentar, guardar esta mezcla y grabar las tuyas.</p>}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </main>
  );
}
