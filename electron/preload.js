const { contextBridge } = require("electron");

// La web detecta que corre dentro de la app de escritorio
contextBridge.exposeInMainWorld("djDesktop", { isDesktop: true, platform: process.platform });
