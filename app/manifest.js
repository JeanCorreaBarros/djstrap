export default function manifest() {
  return {
    name: "DJ Strap — DJ online",
    short_name: "DJ Strap",
    description: "Mezcla música en tu navegador: 2 decks, efectos, playlists y comunidad de mezclas.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e0b0a",
    theme_color: "#0e0b0a",
    lang: "es",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
