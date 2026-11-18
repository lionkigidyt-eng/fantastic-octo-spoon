import { useEffect, useState } from 'react';

interface ProcessedSprite {
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

const spriteCache = new Map<string, ProcessedSprite>();
const pendingPromises = new Map<string, Promise<ProcessedSprite | null>>();

/**
 * Removes outer white background via BFS flood-fill from image borders
 * so interior white silk robes and fox fur stay 100% opaque.
 */
export function loadTransparentSprite(src: string): Promise<ProcessedSprite | null> {
  if (spriteCache.has(src)) {
    return Promise.resolve(spriteCache.get(src)!);
  }
  if (pendingPromises.has(src)) {
    return pendingPromises.get(src)!;
  }

  const promise = new Promise<ProcessedSprite | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Downscale max dimension slightly for super fast flood-fill & crisp 2D canvas draw
        const maxDim = 768;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isNearWhite = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const a = data[p + 3];
          if (a < 20) return true;
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          return minC >= 228 && maxC - minC <= 24;
        };

        const enqueue = (x: number, y: number) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return;
          const idx = y * w + x;
          if (visited[idx]) return;
          if (!isNearWhite(idx)) return;
          visited[idx] = 1;
          queue[tail++] = idx;
        };

        // Seed all 4 borders
        for (let x = 0; x < w; x++) {
          enqueue(x, 0);
          enqueue(x, h - 1);
        }
        for (let y = 1; y < h - 1; y++) {
          enqueue(0, y);
          enqueue(w - 1, y);
        }

        while (head < tail) {
          const idx = queue[head++];
          const p = idx * 4;
          data[p + 3] = 0; // transparent

          const x = idx % w;
          const y = (idx - x) / w;
          if (x > 0) enqueue(x - 1, y);
          if (x < w - 1) enqueue(x + 1, y);
          if (y > 0) enqueue(x, y - 1);
          if (y < h - 1) enqueue(x, y + 1);
        }

        // Soft 1px anti-alias feather on pixels adjacent to removed background
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (visited[idx]) continue;
            const hasEmptyNeighbor =
              visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w];
            if (hasEmptyNeighbor) {
              const p = idx * 4;
              const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
              if (lum > 200) {
                data[p + 3] = Math.round(data[p + 3] * 0.45);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const result: ProcessedSprite = {
          canvas: off,
          dataUrl: off.toDataURL('image/png'),
        };
        spriteCache.set(src, result);
        resolve(result);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  pendingPromises.set(src, promise);
  return promise;
}

export function useTransparentSprite(src: string): string {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => spriteCache.get(src)?.dataUrl || src);

  useEffect(() => {
    let active = true;
    if (spriteCache.has(src)) {
      setResolvedUrl(spriteCache.get(src)!.dataUrl);
      return;
    }
    loadTransparentSprite(src).then((res) => {
      if (active && res) {
        setResolvedUrl(res.dataUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [src]);

  return resolvedUrl;
}
