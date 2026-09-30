import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  onFinish: () => void;
}

// ---------------------------------------------------------------------------
// Sound helpers — ambient nature audio via Web Audio API.
// Autoplay is blocked by browsers until the user has interacted with the page.
// We attempt to start on first user interaction (pointer/key), never force it.
// ---------------------------------------------------------------------------

function createAmbientSound(ctx: AudioContext): () => void {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.4);
  master.connect(ctx.destination);

  const nodes: AudioNode[] = [];

  // Soft wind — filtered white noise
  const bufferSize = ctx.sampleRate * 3;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.35;
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 420;
  lowpass.Q.value = 0.6;
  noiseSource.connect(lowpass);
  lowpass.connect(master);
  noiseSource.start();
  nodes.push(noiseSource);

  // Page-turn whoosh — short swept bandpass at t=0.7s
  const whoosh = ctx.createOscillator();
  whoosh.type = 'sine';
  whoosh.frequency.setValueAtTime(220, ctx.currentTime + 0.7);
  whoosh.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.35);
  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0, ctx.currentTime + 0.7);
  whooshGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.85);
  whooshGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
  whoosh.connect(whooshGain);
  whooshGain.connect(master);
  whoosh.start(ctx.currentTime + 0.7);
  whoosh.stop(ctx.currentTime + 1.5);
  nodes.push(whoosh);

  // Soft bird chirp — two sine tones at t=1.8s
  [1800, 2200].forEach((freq, i) => {
    const bird = ctx.createOscillator();
    bird.type = 'sine';
    bird.frequency.value = freq;
    const bGain = ctx.createGain();
    const t = ctx.currentTime + 1.8 + i * 0.18;
    bGain.gain.setValueAtTime(0, t);
    bGain.gain.linearRampToValueAtTime(0.07, t + 0.06);
    bGain.gain.linearRampToValueAtTime(0, t + 0.22);
    bird.connect(bGain);
    bGain.connect(master);
    bird.start(t);
    bird.stop(t + 0.3);
    nodes.push(bird);
  });

  return () => {
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    nodes.forEach((n) => {
      try { (n as OscillatorNode | AudioBufferSourceNode).stop(ctx.currentTime + 0.6); } catch { /* already stopped */ }
    });
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookVisionIntro({ onFinish }: Props) {
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [soundReady, setSoundReady] = useState(false);

  const finishRef = useRef<() => void>(() => {});
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopSoundRef = useRef<(() => void) | null>(null);
  const soundStartedRef = useRef(false);

  // ---- Sound: start on first interaction (pointer or key) ----------------
  const startSound = () => {
    if (soundStartedRef.current || muted) return;
    soundStartedRef.current = true;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          stopSoundRef.current = createAmbientSound(ctx);
          setSoundReady(true);
        });
      } else {
        stopSoundRef.current = createAmbientSound(ctx);
        setSoundReady(true);
      }
    } catch {
      // Web Audio not available — silent fallback, site still works
    }
  };

  // ---- Lifecycle ---------------------------------------------------------
  useEffect(() => {
    let finished = false;
    let finishTimer = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      setLeaving(true);
      stopSoundRef.current?.();
      audioCtxRef.current?.close();
      finishTimer = window.setTimeout(onFinish, 500);
    };

    finishRef.current = finish;

    // Auto-advance after full cinematic sequence (~5 s)
    const introTimer = window.setTimeout(finish, 5200);

    const handleKeyDown = (e: KeyboardEvent) => {
      startSound();
      if (e.key === 'Escape') finish();
    };

    const handlePointer = () => startSound();

    skipButtonRef.current?.focus();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointer, { once: true });

    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish]);

  // ---- Mute toggle -------------------------------------------------------
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) {
        stopSoundRef.current?.();
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        stopSoundRef.current = null;
        soundStartedRef.current = false;
        setSoundReady(false);
      }
      return next;
    });
  };

  // ---- Render ------------------------------------------------------------
  return (
    <div
      className={`bv2-intro${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="BookVision opening animation"
      aria-live="polite"
    >
      {/* ── Controls ── */}
      <div className="bv2-controls" aria-hidden="false">
        <button
          type="button"
          onClick={toggleMute}
          className="bv2-btn-icon"
          aria-label={muted ? 'Unmute intro sound' : 'Mute intro sound'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted || !soundReady
            ? <VolumeX size={14} strokeWidth={1.8} />
            : <Volume2 size={14} strokeWidth={1.8} />}
        </button>

        <button
          ref={skipButtonRef}
          type="button"
          onClick={() => finishRef.current()}
          className="bv2-btn-skip"
        >
          Skip <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* ── Stage ── */}
      <div className="bv2-stage">

        {/* ── Atmosphere ── */}
        <div className="bv2-atmosphere" aria-hidden="true">
          {/* Radial glow behind the book */}
          <div className="bv2-glow bv2-glow--floor" />
          <div className="bv2-glow bv2-glow--halo" />

          {/* Floating dust motes */}
          {[1,2,3,4,5,6,7,8].map((n) => (
            <span key={n} className={`bv2-mote bv2-mote--${n}`} />
          ))}

          {/* Petals */}
          {[1,2,3,4,5].map((n) => (
            <span key={n} className={`bv2-petal bv2-petal--${n}`} aria-hidden="true">🌸</span>
          ))}

          {/* Butterflies */}
          {[1,2,3].map((n) => (
            <span key={n} className={`bv2-butterfly bv2-butterfly--${n}`} aria-hidden="true">🦋</span>
          ))}

          {/* Birds (distant, subtle) */}
          {[1,2].map((n) => (
            <span key={n} className={`bv2-bird bv2-bird--${n}`} aria-hidden="true">🕊</span>
          ))}
        </div>

        {/* ── Book scene ── */}
        <div className="bv2-scene" aria-hidden="true">
          {/* Warm light beneath the open book */}
          <div className="bv2-light" />

          {/* The book */}
          <div className="bv2-book">
            {/* Back cover (static base) */}
            <div className="bv2-back" />

            {/* Inner spread (pages) */}
            <div className="bv2-spread">
              <div className="bv2-page bv2-page--left">
                <div className="bv2-page-lines" />
              </div>
              <div className="bv2-page bv2-page--right">
                <div className="bv2-page-lines bv2-page-lines--right" />
              </div>
            </div>

            {/* Turning page */}
            <div className="bv2-turn" />

            {/* Front cover (opens) */}
            <div className="bv2-cover">
              <div className="bv2-cover-frame" />
              <span className="bv2-cover-monogram">B</span>
              <span className="bv2-cover-tagline">BOOKS · IDEAS · WONDER</span>
            </div>
          </div>
        </div>

        {/* ── Branding ── */}
        <div className="bv2-brand">
          <span className="bv2-wordmark">BookVision</span>
          <span className="bv2-tagline">A little more wonder, every day.</span>
        </div>

      </div>
    </div>
  );
}
