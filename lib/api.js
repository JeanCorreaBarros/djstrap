async function call(url, { method = "GET", body } = {}) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Error del servidor");
  return d;
}

export const api = {
  me: () => call("/api/auth/me"),
  login: (username, password) => call("/api/auth/login", { method: "POST", body: { username, password } }),
  register: (username, password) => call("/api/auth/register", { method: "POST", body: { username, password } }),
  logout: () => call("/api/auth/logout", { method: "POST" }),
  playlists: () => call("/api/playlists"),
  createPlaylist: (data) => call("/api/playlists", { method: "POST", body: data }),
  updatePlaylist: (id, data) => call(`/api/playlists/${id}`, { method: "PATCH", body: data }),
  deletePlaylist: (id) => call(`/api/playlists/${id}`, { method: "DELETE" }),
  profile: () => call("/api/profile"),
  updateProfile: (data) => call("/api/profile", { method: "PATCH", body: data }),
  setAvatar: (image) => call("/api/profile/avatar", { method: "POST", body: { image } }),
  changePassword: (current, next) => call("/api/profile/password", { method: "POST", body: { current, next } }),
  deleteAccount: (password) => call("/api/profile", { method: "DELETE", body: { password } }),
  setCover: (id, image) => call(`/api/playlists/${id}/cover`, { method: "POST", body: { image } }),
  state: () => call("/api/state"),
  saveState: (s) => call("/api/state", { method: "PUT", body: s }),
  mixes: (params) => call(`/api/mixes?${new URLSearchParams(params)}`),
  mixAction: (id, action, extra = {}) => call(`/api/mixes/${id}`, { method: "POST", body: { action, ...extra } }),
  deleteMix: (id) => call(`/api/mixes/${id}`, { method: "DELETE" }),
  async publishMix(blob, { title, description, occasion, dur, name }) {
    const f = new FormData();
    f.append("file", blob, name || "mezcla.webm");
    f.append("title", title);
    f.append("description", description || "");
    f.append("occasion", occasion || "otra");
    f.append("dur", String(dur || 0));
    const r = await fetch("/api/mixes", { method: "POST", body: f });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "No se pudo publicar");
    return d.mix;
  },
};

// Recorta la imagen elegida a un cuadrado de 500 px y la comprime (JPG) antes de subirla
export function imageToCover(file, size = 500) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("Elige una imagen (JPG, PNG o WebP)"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

// Quita el archivo binario antes de enviar una pista al servidor
export const strip = ({ file, ...t }) => t;
