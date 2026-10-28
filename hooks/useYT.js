"use client";
import { useEffect, useRef, useState, useCallback } from "react";

let apiPromise;
function loadAPI() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev && prev();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

// Reproductor de YouTube montado dentro de containerRef
export function useYT(containerRef, onEnded) {
  const player = useRef(null);
  const pending = useRef(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let dead = false;
    let inner = null;
    loadAPI().then((YT) => {
      if (dead || !containerRef.current) return;
      inner = document.createElement("div");
      containerRef.current.appendChild(inner);
      player.current = new YT.Player(inner, {
        width: "100%",
        height: "100%",
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            setReady(true);
            if (pending.current) {
              const { id, autoplay } = pending.current;
              pending.current = null;
              autoplay ? player.current.loadVideoById(id) : player.current.cueVideoById(id);
            }
          },
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.ENDED) endedRef.current && endedRef.current();
          },
        },
      });
    });
    const t = setInterval(() => {
      const p = player.current;
      if (p && p.getCurrentTime) {
        setTime(p.getCurrentTime() || 0);
        setDuration(p.getDuration() || 0);
      }
    }, 200);
    return () => {
      dead = true;
      clearInterval(t);
      try { player.current && player.current.destroy(); } catch {}
      player.current = null;
      if (inner && inner.parentNode) inner.parentNode.removeChild(inner);
    };
  }, [containerRef]);

  const load = useCallback((id, autoplay = true) => {
    const p = player.current;
    if (!p || !p.loadVideoById) {
      pending.current = { id, autoplay };
      return;
    }
    autoplay ? p.loadVideoById(id) : p.cueVideoById(id);
  }, []);
  const play = useCallback(() => player.current?.playVideo?.(), []);
  const pause = useCallback(() => player.current?.pauseVideo?.(), []);
  const stop = useCallback(() => player.current?.stopVideo?.(), []);
  const seek = useCallback((s) => player.current?.seekTo?.(s, true), []);
  const setVolume = useCallback((v) => player.current?.setVolume?.(Math.round(v)), []);
  const setRate = useCallback((r) => player.current?.setPlaybackRate?.(r), []);

  return { ready, playing, time, duration, load, play, pause, stop, seek, setVolume, setRate };
}
