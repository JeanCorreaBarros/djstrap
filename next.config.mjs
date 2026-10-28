// DJ_DESKTOP=1 genera un servidor autónomo para la app de escritorio (Electron) en .next-desktop
const desktop = !!process.env.DJ_DESKTOP;

export default desktop ? { output: "standalone", distDir: ".next-desktop" } : {};
