import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  className?: string;
  showCursor?: boolean;
  instant?: boolean;
}

export function TypewriterText({
  text,
  speedMs = 10,
  className = '',
  showCursor = false,
  instant = false,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState(instant ? text : '');
  const [done, setDone] = useState(instant);

  useEffect(() => {
    if (instant) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);
    let idx = 0;
    const step = text.length > 26 ? 3 : 2;

    const timer = window.setInterval(() => {
      idx += step;
      if (idx >= text.length) {
        setDisplayed(text);
        setDone(true);
        window.clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, idx));
      }
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [text, speedMs, instant]);

  return (
    <span className={className} aria-label={text}>
      <span>{displayed}</span>
      {showCursor && (
        <span
          aria-hidden="true"
          className={`terminal-cursor ml-1 ${done ? 'opacity-90' : 'opacity-100'}`}
        />
      )}
    </span>
  );
}
