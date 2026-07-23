import { useEffect, useState } from 'react';

export default function ScoreGauge({ score = 0, size = 120 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeWidth = size < 60 ? 4 : size < 90 ? 6 : 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = score >= 90 ? '#10B981' : score >= 75 ? '#3B82F6' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';

  const scoreFontSize = size < 50 ? size * 0.22 : size < 80 ? size * 0.24 : size * 0.22;
  const labelFontSize = size < 50 ? size * 0.14 : size * 0.10;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="font-bold" style={{ color, fontSize: scoreFontSize }}>{Math.round(animatedScore)}</span>
        <span className="text-muted-foreground" style={{ fontSize: labelFontSize }}>/ 100</span>
      </div>
    </div>
  );
}