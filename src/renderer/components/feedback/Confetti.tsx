import React, { useEffect, useState } from 'react';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#818CF8', '#34D399', '#FBBF24', '#FB7185'];
const PARTICLE_COUNT = 40;

interface ConfettiProps {
  active: boolean;
  onDone: () => void;
}

interface Particle {
  id: number;
  left: number;
  color: string;
  delay: number;
  size: number;
}

const Confetti: React.FC<ConfettiProps> = ({ active, onDone }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.8,
      size: 6 + Math.random() * 8,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onDone();
    }, 3500);

    return () => clearTimeout(timer);
  }, [active, onDone]);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
