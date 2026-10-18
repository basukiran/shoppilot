import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  onFinish: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookVisionIntro({ onFinish }: Props) {
  const [leaving, setLeaving] = useState(false);

  const finishRef = useRef<() => void>(() => {});
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const introTimerRef = useRef<number | null>(null);
  const soundStartedRef = useRef(false);

  const playVoice = () => {
    const audio = audioRef.current;
    if (!audio || soundStartedRef.current) return;
    soundStartedRef.current = true;

    audio.play().then(() => {
      if (introTimerRef.current !== null) {
        window.clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }
    }).catch(() => {
      soundStartedRef.current = false;
    });
  };

  const startSound = () => {
    playVoice();
  };

  // ---- Lifecycle ---------------------------------------------------------
  useEffect(() => {
    let finished = false;
    let finishTimer = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      setLeaving(true);
      if (introTimerRef.current !== null) {
        window.clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      finishTimer = window.setTimeout(onFinish, 500);
    };

    finishRef.current = finish;

    introTimerRef.current = window.setTimeout(finish, 5200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finish();
        return;
      }
      if (!(e.target instanceof Element) || !e.target.closest('.bv2-controls')) startSound();
    };

    const handlePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.bv2-controls')) startSound();
    };

    skipButtonRef.current?.focus();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointer);
    // Try autoplay where the browser permits it. Browsers that block it will
    // fall back to the first user interaction handled above.
    playVoice();

    return () => {
      if (introTimerRef.current !== null) window.clearTimeout(introTimerRef.current);
      window.clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish]);

  // ---- Render ------------------------------------------------------------
  return (
    <div
      className={`bv2-intro${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Jnana Nidhi opening animation"
      aria-live="polite"
    >
      <audio
        ref={audioRef}
        src="/audio/bookvision-opening.mpeg"
        preload="auto"
        onEnded={() => {
          finishRef.current();
        }}
      />
      {/* ── Controls ── */}
      <div className="bv2-controls" aria-hidden="false">
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
          <img src="/bookvision-logo.webp" alt="Jnana Nidhi Hubballi logo" className="bv2-brand-logo" />
          <span className="bv2-wordmark">Jnana Nidhi</span>
          <span className="bv2-tagline">A little more wonder, every day.</span>
        </div>

      </div>
    </div>
  );
}
