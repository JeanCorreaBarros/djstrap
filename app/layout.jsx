import { Playfair_Display, Sora } from "next/font/google";
import "./globals.css";
import "./landing.css";
import "./spotify.css";
import "./extras.css";
import "./profile.css";
import "./admin.css";
import "./mobile.css";
import { SITE_URL, SITE_NAME } from "../lib/site";

const display = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-display" });
const head = Sora({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-head" });

const description =
  "DJ online gratis: mezcla música en tu navegador con 2 decks, crossfader, EQ, efectos, loops y scratch. Busca canciones de YouTube, arma playlists para cada ocasión, graba y comparte tus mezclas. Funciona en PC, tablet y celular.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — DJ online gratis: mezcla música en tu navegador`, template: `%s | ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: [
    "DJ Strap", "DJStrap",
    "DJ online", "DJ online gratis", "mezclar música online", "mezclador DJ", "controlador DJ", "app de DJ",
    "DJ en el navegador", "consola DJ virtual", "mezclas de DJ", "DJ para celular", "DJ para tablet", "DJ para PC",
    "mezclar canciones de YouTube", "playlists para fiestas", "música para bodas", "grabar mezcla DJ",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — DJ online gratis`,
    description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — DJ online gratis`, description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0e0b0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${head.variable}`}>
      <body>{children}</body>
    </html>
  );
}
