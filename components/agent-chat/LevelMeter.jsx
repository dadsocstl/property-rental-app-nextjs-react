'use client';

import { useEffect, useRef } from 'react';

const BAR_COUNT = 5;

export default function LevelMeter({ getLevel, active }) {
  const barsRef = useRef([]);

  useEffect(() => {
    let frame;
    const tick = () => {
      let level = 0;
      if (active) {
        try {
          level = Math.min(1, Math.pow(getLevel() || 0, 0.5) * 2.5);
        } catch {
          level = 0;
        }
      }
      barsRef.current.forEach((bar, index) => {
        if (!bar) return;
        const weight = 1 - Math.abs(index - (BAR_COUNT - 1) / 2) * 0.22;
        bar.style.transform = `scaleY(${Math.max(0.15, level * weight)})`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getLevel, active]);

  return (
    <div className='flex h-6 items-center gap-0.5' aria-hidden='true'>
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <span
          key={index}
          ref={(node) => {
            barsRef.current[index] = node;
          }}
          className='h-6 w-1 origin-center rounded-full bg-primary transition-transform duration-75'
          style={{ transform: 'scaleY(0.15)' }}
        />
      ))}
    </div>
  );
}
