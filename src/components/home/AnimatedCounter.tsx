'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
}

export function AnimatedCounter({ end, duration = 2, suffix = "" }: AnimatedCounterProps) {
  // Null until the count starts, so the served HTML holds the real value exactly once.
  const [count, setCount] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView || reduceMotion) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, reduceMotion, end, duration]);

  return (
    <span ref={ref}>
      {count === null ? (
        `${end}${suffix}`
      ) : (
        <>
          <span className="sr-only">{end}{suffix}</span>
          <span aria-hidden="true">{count}{suffix}</span>
        </>
      )}
    </span>
  );
}
