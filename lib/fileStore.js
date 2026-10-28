// Los archivos de audio locales se guardan en IndexedDB del navegador, separados por usuario
let dbp;
function open() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open("djweb", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

export async function putFile(uid, fileId, blob) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(blob, `${uid}:${fileId}`);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getFile(uid, fileId) {
  const db = await open();
  return new Promise((res, rej) => {
    const r = db.transaction("files").objectStore("files").get(`${uid}:${fileId}`);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}
