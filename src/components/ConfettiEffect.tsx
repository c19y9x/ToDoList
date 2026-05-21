import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function ConfettiEffect() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const duration = 1500;
    const end = Date.now() + duration;

    // Gold color palette
    const colors = ["#FFD700", "#FFC125", "#FFB90F", "#E8B800", "#F0C040"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        startVelocity: 45,
        gravity: 0.8,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        startVelocity: 45,
        gravity: 0.8,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Big burst
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors,
        startVelocity: 60,
        gravity: 0.7,
        decay: 0.9,
      });
    }, 100);

    return () => {
      fired.current = false;
    };
  }, []);

  return null;
}
