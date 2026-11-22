'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'chunk-reload-at';
const RETRY_WINDOW_MS = 10_000;

function isChunkLoadError(reason) {
  const text = `${reason?.name ?? ''} ${reason?.message ?? reason ?? ''}`;
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk/i.test(text);
}

/**
 * A tab left open across a rebuild or deploy requests script chunks that no longer exist.
 * Reload once to pick up the current build; the timestamp guard prevents a reload loop.
 */
const ChunkReloadGuard = () => {
  useEffect(() => {
    const recover = (reason) => {
      if (!isChunkLoadError(reason)) return;
      const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - lastReload < RETRY_WINDOW_MS) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    };
    const onError = (event) => recover(event.error ?? event.message);
    const onRejection = (event) => recover(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
};

export default ChunkReloadGuard;
