// ---------------------------------------------------------------------------
// VirtuFit — virtual try-on provider adapter.
// Frontend-only, zero backend, nothing stored.
//
//   youcam : YouCam API cloth-v3 virtual try-on, called DIRECTLY from the
//            browser (YouCam's API is CORS-enabled). Uses VITE_YOUCAM_KEY.
//            ~2 units per success. Verified live 11 Aug 2026.
//   mock   : no key → a built-in sample result replays the full flow.
//
// Everything is held in-memory (blob URLs) and discarded when the tab closes.
// ---------------------------------------------------------------------------

export type Provider = 'youcam' | 'mock';

export const YOUNCAM_BASE = 'https://yce-api-01.makeupar.com';

export type GarmentCategory = 'upper_body' | 'lower_body' | 'full_body' | 'shoes' | 'auto';

export interface TryOnInput {
  humanImg: File | string;
  garmImg: File | string;
  category: GarmentCategory;
  seed?: number;
}

export interface TryOnOutput {
  url: string;
  width?: number;
  height?: number;
  provider: Provider;
  tookMs: number;
}

export function getProvider(): Provider {
  return import.meta.env.VITE_YOUCAM_KEY?.trim() ? 'youcam' : 'mock';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function toBlob(input: File | string): Promise<{ blob: Blob; name: string; type: string }> {
  if (input instanceof File) {
    return { blob: input, name: input.name || 'img.jpg', type: input.type || 'image/jpeg' };
  }
  const res = await fetch(input);
  if (!res.ok) throw new Error('Could not load image');
  const blob = await res.blob();
  return { blob, name: 'img.jpg', type: blob.type || 'image/jpeg' };
}

// ---------------------------------------------------------------------------
// YouCam provider (browser-direct, CORS-enabled)
// ---------------------------------------------------------------------------

async function youcamUpload(key: string, input: File | string, slug: string): Promise<string> {
  const { blob, name, type } = await toBlob(input);

  // 1) request an upload slot
  const slotRes = await fetch(`${YOUNCAM_BASE}/s2s/v2.0/file/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: [{ content_type: type, file_name: name, file_size: blob.size }],
    }),
  });
  const slotJson = await slotRes.json();
  const file = slotJson?.data?.files?.[0];
  if (!file) throw new Error(`YouCam upload slot failed: ${JSON.stringify(slotJson).slice(0, 200)}`);

  // 2) PUT the bytes to the presigned URL
  const up = file.requests[0];
  const put = await fetch(up.url, { method: up.method || 'PUT', headers: up.headers, body: blob });
  if (!put.ok) throw new Error('YouCam upload failed');

  return file.file_id;
}

async function youcamPoll(key: string, slug: string, taskId: string, timeoutMs = 180_000): Promise<unknown> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${YOUNCAM_BASE}/s2s/v2.0/task/${slug}/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = await res.json();
    const d = json?.data ?? json;
    const status = d?.task_status ?? d?.status;
    if (status === 'success') return json;
    if (status === 'error') {
      throw new Error(`YouCam task failed: ${JSON.stringify(d).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('YouCam task timed out');
}

async function runYoucam(input: TryOnInput): Promise<TryOnOutput> {
  const key = (import.meta.env.VITE_YOUCAM_KEY as string).trim();
  const start = performance.now();

  const personId = await youcamUpload(key, input.humanImg, 'cloth-v3');
  const garmId = await youcamUpload(key, input.garmImg, 'cloth-v3');

  const taskRes = await fetch(`${YOUNCAM_BASE}/s2s/v2.0/task/cloth-v3`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      src_file_id: personId,
      ref_file_id: garmId,
      garment_category: input.category,
    }),
  });
  const taskJson = await taskRes.json();
  const taskId = taskJson?.data?.task_id ?? taskJson?.task_id;
  if (!taskId) throw new Error(`YouCam task create failed: ${JSON.stringify(taskJson).slice(0, 300)}`);

  const result = await youcamPoll(key, 'cloth-v3', taskId);
  const url = (result as { data?: { results?: { url?: string } } })?.data?.results?.url;
  if (!url) throw new Error('No result image returned');

  const blobRes = await fetch(url);
  const blob = await blobRes.blob();
  return {
    url: URL.createObjectURL(blob),
    provider: 'youcam',
    tookMs: Math.round(performance.now() - start),
  };
}

// ---------------------------------------------------------------------------
// Mock provider (no key)
// ---------------------------------------------------------------------------

async function runMock(): Promise<TryOnOutput> {
  const start = performance.now();
  await new Promise((r) => setTimeout(r, 900));
  const res = await fetch(`${import.meta.env.BASE_URL}assets/result-sample.jpg`);
  const blob = await res.blob();
  return {
    url: URL.createObjectURL(blob),
    provider: 'mock',
    tookMs: Math.round(performance.now() - start),
  };
}

export async function runTryOn(input: TryOnInput): Promise<TryOnOutput> {
  switch (getProvider()) {
    case 'youcam':
      return runYoucam(input);
    default:
      return runMock();
  }
}
