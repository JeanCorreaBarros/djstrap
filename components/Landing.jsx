// Página pública (renderizada en el servidor) para Google y visitantes nuevos
import { SITE_URL, SITE_NAME } from "../lib/site";

const P = {
  decks: "M7 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM7 11.5h.01M17 11.5h.01",
  xf: "M12 3v18M5 9h14M8 15h8M9 7h6v4H9z",
  eq: "M4 10v4M7 7v10M10 4v16M13 8v8M16 6v12M19 10v4",
  auto: "M4 7h11l-3-3m3 3-3 3M20 17H9l3 3m-3-3 3-3",
  pl: "M5 6h10M5 10h10M5 14h6m6-8v9.5m0 0a2.5 2.5 0 1 1-2.5-2.5H17",
  com: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6m2 9a6 6 0 0 0-3-5.2",
  cloud: "M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  note: "M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2",
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  lib: "M5 4v16M9 4v16M14 4l5 16",
  play: "M8 5v14l11-7z",
  win: "M3 5.5 10.5 4.5v7H3zM12 4.2 21 3v8.5h-9zM3 12.5h7.5v7L3 18.5zM12 12.5h9V21l-9-1.2z",
  apple: "M16.5 12.6c0-2.3 1.9-3.4 2-3.5a4.3 4.3 0 0 0-3.4-1.8c-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8A4.5 4.5 0 0 0 5 9.6c-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.7 2.3 2.9 2.3s1.6-.8 3-.8 1.8.8 3 .7 2-1.1 2.8-2.2a9.6 9.6 0 0 0 1.2-2.6 3.9 3.9 0 0 1-2.6-3.5ZM14.3 5.8A4 4 0 0 0 15.2 3a4.1 4.1 0 0 0-2.7 1.4 3.8 3.8 0 0 0-1 2.7 3.4 3.4 0 0 0 2.8-1.3Z",
  android: "M7 10h10v7a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1zM7 9a5 5 0 0 1 10 0zM9.5 6.5h.01M14.5 6.5h.01M8 4l1.2 2M16 4l-1.2 2M4.5 10v5M19.5 10v5M10 18v3M14 18v3",
};
export const Ico = ({ n, s = 22, fill }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={P[n]} />
  </svg>
);

// Logo: barras de onda con degradado
export function Logo({ size = 28 }) {
  const bars = [6, 12, 18, 24, 16, 22, 10, 14, 6];
  return (
    <svg width={size} height={size} viewBox="0 0 36 28" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" x2="1">
          <stop offset="0" stopColor="#ff7a3d" />
          <stop offset="1" stopColor="#ff2d8a" />
        </linearGradient>
      </defs>
      {bars.map((h, i) => (
        <rect key={i} x={i * 4} y={(28 - h) / 2} width="2.4" height={h} rx="1.2" fill="url(#lg)" />
      ))}
    </svg>
  );
}

const G = ({ children }) => <span className="grad">{children}</span>;

export function LandingNav() {
  return (
    <header className="lnav">
      <a className="llogo" href="/">
        <Logo />
        <b>DJ STRAP</b>
      </a>
      <nav>
        <a href="#inicio" className="on">Inicio</a>
        <a href="#features">Funciones</a>
        <a href="#playlists">Playlists</a>
        <a href="#comunidad">Comunidad</a>
      </nav>
      <a className="lbtn ghost" href="#login">
        <Ico n="user" s={17} /> Iniciar sesión
      </a>
    </header>
  );
}

const HERO_ICONS = [
  ["decks", "2 decks"],
  ["xf", "Crossfader"],
  ["eq", "EQ y efectos"],
  ["auto", "Auto-Mix"],
  ["pl", "Playlists"],
  ["com", "Comunidad"],
];

export function LandingHero() {
  return (
    <>
      <div className="hero-art" aria-hidden="true">
        <div className="glow g1" />
        <div className="glow g2" />
        <svg className="turntable" viewBox="0 0 600 600">
          <defs>
            <radialGradient id="vin" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#1a0f14" />
              <stop offset="1" stopColor="#07060a" />
            </radialGradient>
            <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff7a3d" />
              <stop offset="0.5" stopColor="#ff2d8a" />
              <stop offset="1" stopColor="#7a2bff" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="290" fill="#0c0a10" stroke="#241a22" strokeWidth="6" />
          <circle cx="300" cy="300" r="262" fill="url(#vin)" />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx="300" cy="300" r={120 + i * 10} fill="none" stroke="#ffffff" strokeOpacity="0.04" />
          ))}
          <circle cx="300" cy="300" r="276" fill="none" stroke="url(#rim)" strokeWidth="5" strokeDasharray="520 1200" strokeLinecap="round" className="rim" />
          <circle cx="300" cy="300" r="96" fill="#140c12" stroke="url(#rim)" strokeWidth="3" />
          <circle cx="300" cy="300" r="60" fill="url(#rim)" opacity="0.85" />
          <circle cx="300" cy="300" r="8" fill="#0c0a10" />
        </svg>
      </div>
      <span className="badge">✦ DJ ONLINE GRATIS</span>
      <h1>
        Mezcla música <G>como un DJ,</G> directo en tu navegador
      </h1>
      <p>
        {SITE_NAME} es una consola DJ online con 2 decks, efectos, loops y scratch. Busca canciones, arma playlists para{" "}
        <b>cada ocasión</b>, graba tus mezclas y compártelas con la comunidad. En PC, tablet y celular.
      </p>
      <ul className="hero-icons">
        {HERO_ICONS.map(([n, l]) => (
          <li key={n}>
            <span><Ico n={n} /></span>
            {l}
          </li>
        ))}
      </ul>
    </>
  );
}

const FEATURES = [
  ["decks", "2 Decks", "Mezcla como un profesional con 2 decks virtuales: jog con scratch, tempo, SYNC, hot cues y loops."],
  ["xf", "Crossfader", "Transiciones suaves o cortes precisos entre tus pistas, con curva ajustable."],
  ["eq", "EQ y Efectos", "EQ de 3 bandas, filtros, echo, reverb, flanger y trans sincronizados al BPM."],
  ["auto", "Auto-Mix", "La app mezcla sola: carga la siguiente canción y hace la transición por ti."],
  ["pl", "Playlists", "Organiza playlists con nombre para fiestas, bodas, cumpleaños o gym."],
  ["com", "Comunidad", "Publica tus mezclas grabadas, recibe me gusta y comentarios de otros DJs."],
  ["cloud", "En la nube", "Tus playlists, listas e historial guardados en tu cuenta, en todos tus dispositivos."],
];

const MOCK_TRACKS = [
  ["Noche de fiesta", "Mix reggaetón", "3:24"],
  ["Atardecer", "Deep house", "4:12"],
  ["Ritmo latino", "Salsa clásica", "3:56"],
  ["Pista principal", "Electrónica", "3:20"],
  ["Último baile", "Pop", "4:05"],
];

export function LandingRest({ mixes = [], stats = { users: 0, mixes: 0, playlists: 0 } }) {
  const authors = [...new Set(mixes.map((m) => m.author))].slice(0, 4);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Windows, Android, iOS, macOS, Linux",
      inLanguage: "es",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: "Consola DJ online gratis para mezclar música en el navegador.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <>
      {/* ---------- funciones ---------- */}
      <section className="lsec" id="features">
        <div className="sec-head center">
          <span className="kick line">FUNCIONES</span>
          <h2>Todo lo que necesitas para <G>ser DJ</G></h2>
          <p>Herramientas profesionales, sin complicaciones. Crea, mezcla y comparte tu música desde cualquier lugar.</p>
        </div>
        <div className="fgrid">
          {FEATURES.map(([n, t, d]) => (
            <a key={t} className="fcard" href="#entrar">
              <span className="ficon"><Ico n={n} s={24} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
              <i className="farrow"><Ico n="arrow" s={16} /></i>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- playlists ---------- */}
      <section className="lband" id="playlists">
        <div className="lsec split">
          <div className="split-text">
            <span className="kick">PLAYLISTS</span>
            <h2>Explora, mezcla, <G>crea</G></h2>
            <p>Busca canciones de todos los géneros, crea tus playlists para cada ocasión y encuentra la banda sonora perfecta para cada momento.</p>
            <a className="lbtn" href="#entrar">EXPLORAR PLAYLISTS <Ico n="arrow" s={16} /></a>
          </div>
          <div className="mock" aria-hidden="true">
            <aside>
              {[["home", "Inicio"], ["search", "Explorar"], ["pl", "Playlists"], ["heart", "Favoritos"], ["lib", "Mi biblioteca"]].map(([n, l], i) => (
                <span key={l} className={i === 2 ? "on" : ""}><Ico n={n} s={13} /> {l}</span>
              ))}
            </aside>
            <div className="mock-main">
              <div className="mock-search"><Ico n="search" s={12} /> Buscar canciones, artistas, géneros…</div>
              <div className="mock-row head"><span /><span>Título</span><span>Estilo</span><span>Dur.</span></div>
              {MOCK_TRACKS.map(([t, a, d], i) => (
                <div key={t} className="mock-row">
                  <span className="mplay"><Ico n="play" s={9} fill /></span>
                  <span><i className={`mthumb t${i}`} />{t}</span>
                  <span>{a}</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <span className="mock-note"><Ico n="note" s={22} /></span>
          </div>
        </div>
      </section>

      {/* ---------- comunidad ---------- */}
      <section className="lcom" id="comunidad">
        <div className="lcom-art" aria-hidden="true">
          <svg viewBox="0 0 520 300" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="sl1" cx="30%" cy="20%" r="60%"><stop offset="0" stopColor="#ff6a3d" stopOpacity="0.9" /><stop offset="1" stopColor="#ff6a3d" stopOpacity="0" /></radialGradient>
              <radialGradient id="sl2" cx="75%" cy="15%" r="55%"><stop offset="0" stopColor="#8b3dff" stopOpacity="0.9" /><stop offset="1" stopColor="#8b3dff" stopOpacity="0" /></radialGradient>
              <radialGradient id="sl3" cx="50%" cy="60%" r="45%"><stop offset="0" stopColor="#ff2d8a" stopOpacity="0.6" /><stop offset="1" stopColor="#ff2d8a" stopOpacity="0" /></radialGradient>
            </defs>
            <rect width="520" height="300" fill="#0a0710" />
            <rect width="520" height="300" fill="url(#sl1)" />
            <rect width="520" height="300" fill="url(#sl2)" />
            <rect width="520" height="300" fill="url(#sl3)" />
            {[60, 140, 380, 460].map((x, i) => (
              <path key={x} d={`M${x} 0 L${x - 60 + i * 30} 300 L${x + 40 + i * 10} 300 Z`} fill="#fff" opacity="0.04" />
            ))}
            {/* DJ con audífonos */}
            <path d="M226 108a36 38 0 0 1 72 0" fill="none" stroke="#050308" strokeWidth="8" strokeLinecap="round" />
            <circle cx="262" cy="104" r="30" fill="#050308" />
            <rect x="222" y="98" width="12" height="26" rx="5" fill="#050308" />
            <rect x="290" y="98" width="12" height="26" rx="5" fill="#050308" />
            <path d="M185 300c4-70 34-150 77-150s73 80 77 150Z" fill="#050308" />
            <rect x="150" y="206" width="224" height="26" rx="6" fill="#120a14" stroke="#ff2d8a" strokeOpacity="0.5" />
            {/* público */}
            {Array.from({ length: 13 }, (_, i) => {
              const x = 10 + i * 40;
              const h = 30 + ((i * 37) % 40);
              return (
                <g key={i} fill="#030205">
                  <circle cx={x + 14} cy={300 - h - 10} r="13" />
                  <rect x={x} y={300 - h} width="28" height={h} rx="10" />
                  {i % 3 === 0 && <rect x={x + 22} y={300 - h - 56} width="6" height="50" rx="3" transform={`rotate(12 ${x + 25} ${300 - h})`} />}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="lcom-text">
          <span className="kick line-r">COMUNIDAD</span>
          <h2>Comparte tu <G>pasión</G></h2>
          <p>Conecta con otros DJs, publica tus mezclas, descubre nuevos talentos y haz crecer tu música en la comunidad {SITE_NAME}.</p>
          <a className="lbtn" href="#entrar">ÚNETE A LA COMUNIDAD <Ico n="arrow" s={16} /></a>
        </div>
        <div className="lcom-stats">
          <div className="avatars">
            {(authors.length ? authors : ["D", "J", "S"]).map((a, i) => (
              <i key={i} className={`av a${i}`}>{a.slice(0, 1).toUpperCase()}</i>
            ))}
            <i className="av wave"><Logo size={22} /></i>
          </div>
          {stats.users > 0 ? (
            <>
              <b>{stats.users.toLocaleString("es")}</b>
              <small>{stats.users === 1 ? "DJ en la comunidad" : "DJs en la comunidad"}</small>
              <small>{stats.mixes} mezclas · {stats.playlists} playlists</small>
            </>
          ) : (
            <>
              <b>¡Sé el primero!</b>
              <small>La comunidad está empezando</small>
            </>
          )}
        </div>
      </section>

      {/* ---------- dispositivos ---------- */}
      <section className="lsec split devices">
        <div className="split-text">
          <span className="kick">EN TODOS TUS DISPOSITIVOS</span>
          <h2>Lleva tu música a <G>todas partes</G></h2>
          <p>{SITE_NAME} funciona en cualquier dispositivo. Mezcla desde tu PC, tablet o celular, donde quieras y cuando quieras. En Windows también puedes instalar la app de escritorio.</p>
          <ul className="platforms">
            <li><Ico n="win" s={20} fill /> Windows</li>
            <li><Ico n="apple" s={20} fill /> Mac</li>
            <li><Ico n="apple" s={20} fill /> iOS</li>
            <li><Ico n="android" s={20} /> Android</li>
          </ul>
        </div>
        <div className="devs" aria-hidden="true">
          <div className="dev laptop">
            <div className="scr"><MiniDJ /></div>
            <div className="base" />
          </div>
          <div className="dev tablet"><div className="scr"><MiniDJ compact /></div></div>
          <div className="dev phone"><div className="scr"><MiniDJ phone /></div></div>
        </div>
      </section>

      {/* ---------- mezclas reales de la comunidad ---------- */}
      {mixes.length > 0 && (
        <section className="lsec">
          <div className="sec-head">
            <span className="kick">LO ÚLTIMO DE LA COMUNIDAD</span>
            <h2>Mezclas que están sonando</h2>
          </div>
          <div className="tgrid">
            {mixes.slice(0, 3).map((m) => (
              <a key={m.id} className="tcard" href={`/mix/${m.id}`}>
                <i className="av a1">{m.author.slice(0, 1).toUpperCase()}</i>
                <div>
                  <p>“{m.title}”</p>
                  <b>{m.author}</b>
                  <small>♥ {m.likes} · 💬 {m.commentCount} · ▶ {m.plays}</small>
                </div>
              </a>
            ))}
          </div>
          <a className="lmore" href="/mezclas">Ver todas las mezclas →</a>
        </section>
      )}

      {/* ---------- preguntas frecuentes ---------- */}
      <section className="lsec">
        <div className="sec-head">
          <span className="kick">PREGUNTAS FRECUENTES</span>
          <h2>Lo que la gente pregunta</h2>
        </div>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- llamado final ---------- */}
      <section className="lcta">
        <Logo size={30} />
        <h2>¿Listo para mezclar?</h2>
        <p>Únete a {SITE_NAME} y empieza a crear tus propias mezclas hoy mismo.</p>
        <a className="lbtn" href="#entrar">CREAR CUENTA GRATIS <Ico n="arrow" s={16} /></a>
      </section>

      <footer className="lfoot">
        <a className="llogo" href="/"><Logo /> <b>DJ STRAP</b></a>
        <nav>
          <a href="#inicio">Inicio</a>
          <a href="#features">Funciones</a>
          <a href="#playlists">Playlists</a>
          <a href="/mezclas">Mezclas</a>
        </nav>
        <small>© {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.</small>
      </footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}

// Mini consola dibujada para las pantallas de los dispositivos
function MiniDJ({ compact, phone }) {
  const bars = Array.from({ length: phone ? 14 : compact ? 22 : 34 }, (_, i) => 20 + ((i * 53) % 70));
  return (
    <div className={`mdj ${phone ? "ph" : compact ? "tb" : ""}`}>
      <div className="mwave">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      <div className="mdecks">
        <span className="mj" />
        {!phone && <span className="mmix"><i /><i /><i /></span>}
        <span className="mj b" />
      </div>
      <div className="mlist">{Array.from({ length: phone ? 4 : 3 }, (_, i) => <i key={i} />)}</div>
    </div>
  );
}

const FAQ = [
  ["¿DJ Strap es gratis?", "Sí. Creas tu cuenta y mezclas gratis desde el navegador, sin instalar nada."],
  ["¿Puedo usarlo en el celular o la tablet?", "Sí. La interfaz se adapta a pantallas táctiles, con una barra inferior para el crossfader y el play de cada deck. Puedes instalarla como app desde el navegador."],
  ["¿Puedo mezclar canciones de YouTube?", "Sí, puedes buscar y reproducir canciones de YouTube en cada deck con volumen, tempo, cues y crossfader. Para EQ, efectos, loops y scratch usa tus archivos de audio."],
  ["¿Cómo comparto mis mezclas?", "Graba tu sesión en “Grabar mezcla”, publícala con un título y comparte el enlace. Otros DJs pueden escucharla, comentarla, darle me gusta y guardarla."],
  ["¿Hay versión para PC?", "Sí, hay una app de escritorio para Windows que se instala con un solo archivo."],
];
