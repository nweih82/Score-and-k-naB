import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export const ConfettiCelebration: React.FC = () => {
  useEffect(() => {
    // 1. Initial burst from center
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f97316', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
      zIndex: 9999,
    });

    // 2. Side cannons burst sequence
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      // Left cannon
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#f97316', '#f59e0b', '#10b981', '#ec4899'],
        zIndex: 9999,
      });
      // Right cannon
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#3b82f6', '#8b5cf6', '#f97316', '#10b981'],
        zIndex: 9999,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(frame);
    }, 200);

    return () => {
      clearTimeout(timer);
      confetti.reset();
    };
  }, []);

  return null;
};
