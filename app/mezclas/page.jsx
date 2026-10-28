import { listMixes } from "../../lib/db";
import { currentUser } from "../../lib/auth";
import { SITE_NAME } from "../../lib/site";
import PublicMix from "../../components/PublicMix";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mezclas de DJ de la comunidad",
  description: `Escucha mezclas de DJ hechas por la comunidad de ${SITE_NAME}: reggaetón, electrónica, salsa, bodas, fiestas y más. Dales me gusta, comenta y guárdalas.`,
  alternates: { canonical: "/mezclas" },
};

export default async function Mezclas() {
  const u = await currentUser();
  const mixes = await listMixes({ viewer: u?.id, sort: "recent", limit: 100 });
  return (
    <main className="pubpage">
      <nav className="pubnav">
        <a href="/" className="publogo">✦ {SITE_NAME}</a>
        <a href="/" className="primary">{u ? "Ir a mi cabina" : "Crear cuenta gratis"}</a>
      </nav>
      <section className="page">
        <header className="phead">
          <small>COMUNIDAD</small>
          <h1 className="pubh1">Mezclas de DJ</h1>
          <p>Sesiones grabadas y publicadas por los DJs de {SITE_NAME}.</p>
        </header>
        {mixes.length === 0 ? (
          <p className="hint">Todavía no hay mezclas publicadas. ¡Sé el primero!</p>
        ) : (
          <div className="mixes">
            {mixes.map((m) => (
              <PublicMix key={m.id} mix={m} loggedIn={!!u} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
