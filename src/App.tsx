import { useCallback, useEffect, useRef, useState } from 'react';
import { getProvider, runTryOn, type Provider, type TryOnOutput } from './tryon';

type Category = 'upper_body' | 'lower_body' | 'full_body' | 'shoes' | 'auto';

// Assets live under the deploy base (root in dev, /tryon-studio/ on Pages).
const asset = (p: string) => `${import.meta.env.BASE_URL}assets/${p}`;

// Sample person photos (included so anyone can try instantly)
const HUMAN_EXAMPLES = Array.from({ length: 12 }, (_, i) => ({
  name: `${String(i).padStart(3, '0')}${i === 4 || i === 8 || i === 9 ? '.jpg' : '.png'}`,
  src: asset(`samples/human/${String(i).padStart(3, '0')}${i === 4 || i === 8 || i === 9 ? '.jpg' : '.png'}`),
}));

// Sample garment photos (included so anyone can try instantly)
const CLOTH_EXAMPLES = [
  { name: '00_upper.jpg', src: asset('samples/cloth/00_upper.jpg'), cat: 'upper_body' as Category },
  { name: '01_upper.jpg', src: asset('samples/cloth/01_upper.jpg'), cat: 'upper_body' as Category },
  { name: '02_upper.png', src: asset('samples/cloth/02_upper.png'), cat: 'upper_body' as Category },
  { name: '03_upper.jpg', src: asset('samples/cloth/03_upper.jpg'), cat: 'upper_body' as Category },
  { name: '04_dress.png', src: asset('samples/cloth/04_dress.png'), cat: 'full_body' as Category },
  { name: '05_dress.jpg', src: asset('samples/cloth/05_dress.jpg'), cat: 'full_body' as Category },
  { name: '06_upper.png', src: asset('samples/cloth/06_upper.png'), cat: 'upper_body' as Category },
  { name: '07_upper.png', src: asset('samples/cloth/07_upper.png'), cat: 'upper_body' as Category },
  { name: '08_upper.png', src: asset('samples/cloth/08_upper.png'), cat: 'upper_body' as Category },
  { name: '09_upper.png', src: asset('samples/cloth/09_upper.png'), cat: 'upper_body' as Category },
  { name: '10_dress.png', src: asset('samples/cloth/10_dress.png'), cat: 'full_body' as Category },
  { name: '11_upper.png', src: asset('samples/cloth/11_upper.png'), cat: 'upper_body' as Category },
];

// Showcase pairs — person + garment → result examples
const SHOWCASE = [
  { model: asset('samples/examples/model1.png'), garm: asset('samples/examples/garment1.png'), result: asset('samples/examples/result1.png') },
  { model: asset('samples/examples/model2.png'), garm: asset('samples/examples/garment2.png'), result: asset('samples/examples/result2.png') },
  { model: asset('samples/examples/model3.png'), garm: asset('samples/examples/garment3.png'), result: asset('samples/examples/result3.png') },
];

const MAX_SEED = 999999;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read image'));
    r.readAsDataURL(file);
  });
}

export default function App() {
  const provider: Provider = getProvider();

  const [person, setPerson] = useState<{ file?: File; url: string } | null>(null);
  const [garment, setGarment] = useState<{ file?: File; url: string; label: string } | null>(null);
  const [category, setCategory] = useState<Category>('upper_body');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnOutput | null>(null);
  const [seed, setSeed] = useState<number>(0);
  const [randomizeSeed, setRandomizeSeed] = useState(true);
  const [seedUsed, setSeedUsed] = useState<number | null>(null);
  const [response, setResponse] = useState<string>('');
  const personInputRef = useRef<HTMLInputElement>(null);
  const garmInputRef = useRef<HTMLInputElement>(null);

  // never persist anything
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPersonFile = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setPerson({ file: f, url: await readFile(f) });
  };

  const onGarmentFile = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setGarment({ file: f, url: await readFile(f), label: f.name });
  };

  const run = useCallback(async () => {
    if (!person || !garment || busy) return;
    setBusy(true);
    setError(null);
    setResponse('Running…');
    const useSeed = randomizeSeed ? Math.floor(Math.random() * MAX_SEED) : seed;
    try {
      const out = await runTryOn({
        humanImg: person.file ?? person.url,
        garmImg: garment.file ?? garment.url,
        category,
        seed: useSeed,
      });
      setResult(out);
      setSeedUsed(useSeed);
      setResponse(out.provider === 'youcam' ? 'Success' : 'Demo result');
    } catch (e) {
      setResponse('Error');
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [person, garment, category, seed, randomizeSeed, busy]);

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = 'tryon-result.png';
    a.click();
  };

  const share = async () => {
    if (!result) return;
    try {
      const blob = await (await fetch(result.url)).blob();
      const file = new File([blob], 'tryon.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My TryOn Studio look' });
      } else {
        download();
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="page">
      {/* ---------- Title (as in the Kolors space) ---------- */}
      <header className="title-band">
        <h1 className="main-title">VirtuFit — AI Virtual Try-On</h1>
        <div className="badges">
          <span className="badge">✨ VirtuFit · YouCam cloth-v3 AI</span>
          <span className="badge badge-green">🔒 nothing stored — results download-only</span>
        </div>
        <p className="disclaimer">
          <strong>VirtuFit</strong> — upload a person photo and a garment photo, press Run, and get a
          realistic AI try-on result in seconds. Your images are processed on the fly and
          never saved anywhere.
        </p>
        {provider === 'mock' && (
          <div className="notice">
            <strong>Demo mode</strong> — no API key configured, so a sample result replays the flow.
            Add <code>VITE_YOUCAM_KEY</code> to run the real model.
          </div>
        )}
      </header>

      {/* ---------- Step labels row ---------- */}
      <div className="steps-row">
        <div className="step-label">Step 1. Upload a person image ⬇️</div>
        <div className="step-label">Step 2. Upload a garment image ⬇️</div>
        <div className="step-label">Step 3. Press “Run” to get try-on results</div>
      </div>

      {/* ---------- Main 3-column row ---------- */}
      <div className="main-row">
        {/* LEFT: person */}
        <div className="col">
          <div className="img-frame">
            {person ? (
              <img src={person.url} alt="Person" className="frame-img" />
            ) : (
              <div className="frame-empty">Person image</div>
            )}
            <button className="upload-btn" onClick={() => personInputRef.current?.click()}>
              ⬆ Click to Upload
            </button>
            <input ref={personInputRef} type="file" accept="image/*" hidden onChange={(e) => onPersonFile(e.target.files?.[0])} />
          </div>
          <div className="examples-title">Examples</div>
          <div className="example-grid">
            {HUMAN_EXAMPLES.map((h) => (
              <button
                key={h.name}
                className="thumb pressable"
                title={h.name}
                onClick={() => { setPerson({ url: h.src }); setError(null); }}
              >
                <img src={h.src} alt={h.name} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* MIDDLE: garment */}
        <div className="col">
          <div className="img-frame">
            {garment ? (
              <img src={garment.url} alt="Garment" className="frame-img" />
            ) : (
              <div className="frame-empty">Garment image</div>
            )}
            <button className="upload-btn" onClick={() => garmInputRef.current?.click()}>
              ⬆ Click to Upload
            </button>
            <input ref={garmInputRef} type="file" accept="image/*" hidden onChange={(e) => onGarmentFile(e.target.files?.[0])} />
          </div>
          <div className="examples-title">Examples</div>
          <div className="example-grid">
            {CLOTH_EXAMPLES.map((c) => (
              <button
                key={c.name}
                className="thumb pressable"
                title={c.name}
                onClick={() => { setGarment({ url: c.src, label: c.name }); setCategory(c.cat); setError(null); }}
              >
                <img src={c.src} alt={c.name} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: result + controls */}
        <div className="col">
          <div className="img-frame result-frame">
            {result ? (
              <img src={result.url} alt="Result" className="frame-img" />
            ) : (
              <div className="frame-empty">Result</div>
            )}
            {result && (
              <span className="result-badge">
                {result.provider === 'youcam' ? '✨ YouCam AI' : '🎬 Demo'}
              </span>
            )}
          </div>

          <div className="control-block">
            <label className="ctl-label" htmlFor="seed">Seed</label>
            <input
              id="seed"
              type="range"
              min={0}
              max={MAX_SEED}
              step={1}
              value={seed}
              onChange={(e) => { setSeed(Number(e.target.value)); setRandomizeSeed(false); }}
              className="seed-slider"
            />
            <div className="seed-value">{seed}</div>
            <label className="check">
              <input type="checkbox" checked={randomizeSeed} onChange={(e) => setRandomizeSeed(e.target.checked)} />
              Random seed
            </label>
          </div>

          <div className="outputs">
            <div className="out-row">
              <span className="out-label">Seed used</span>
              <span className="out-value">{seedUsed ?? '—'}</span>
            </div>
            <div className="out-row">
              <span className="out-label">Response</span>
              <span className={`out-value ${response === 'Error' ? 'err' : ''}`}>{response || '—'}</span>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button className="run-btn pressable" disabled={busy || !person || !garment} onClick={() => run()}>
            {busy ? <><span className="spinner" /> Running…</> : '▶ Run'}
          </button>

          {result && (
            <div className="result-actions">
              <button className="act-btn primary pressable" onClick={download}>⬇ Download result</button>
              <button className="act-btn pressable" onClick={share}>📤 Share</button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Showcase pairs ---------- */}
      <div className="showcase">
        <div className="showcase-title">Virtual try-on examples in pairs of person and garment images</div>
        <div className="pairs">
          {SHOWCASE.map((p, i) => (
            <div className="pair" key={i}>
              <div className="pair-col">
                <img src={p.model} alt={`model ${i + 1}`} loading="lazy" />
                <span>person</span>
              </div>
              <div className="pair-col">
                <img src={p.garm} alt={`garment ${i + 1}`} loading="lazy" />
                <span>garment</span>
              </div>
              <div className="pair-col">
                <img src={p.result} alt={`result ${i + 1}`} loading="lazy" />
                <span>result</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="footer">
        VirtuFit · AI virtual try-on · developed by our team · powered by YouCam cloth-v3 · nothing stored 🔒
      </footer>
    </div>
  );
}
