// Iconos de línea para el menú lateral
const P = {
  deck: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2",
  library: "M5 4v16M9 4v16M14 4l5 16",
  playlist: "M4 6h12M4 11h12M4 16h7m6-5v8m0 0a2 2 0 1 1-2-2h2",
  auto: "M4 7h11l-3-3m3 3-3 3M20 17H9l3 3m-3-3 3-3",
  rec: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
  community: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6m2 9a6 6 0 0 0-3-5.2",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  keys: "M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8",
  desktop: "M3 5h18v11H3zM8 20h8M12 16v4",
  full: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  menu: "M4 7h16M4 12h16M4 17h16",
  admin: "M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6zM9 12l2 2 4-4",
  collapse: "M15 6l-6 6 6 6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
