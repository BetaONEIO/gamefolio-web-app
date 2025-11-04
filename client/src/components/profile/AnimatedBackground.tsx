import { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  type: string;
  theme: string;
  baseColor?: string;
  accentColor?: string;
}

export const AnimatedBackground = ({ type, theme, baseColor, accentColor }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (type !== 'animated' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    let animationFrameId: number;
    const particles: Array<{
      x: number;
      y: number;
      dx: number;
      dy: number;
      radius: number;
      alpha: number;
    }> = [];

    const primaryColor = baseColor || '#0B2232';
    const accent = accentColor || '#4ADE80';

    if (theme === 'particles') {
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          dx: (Math.random() - 0.5) * 0.5,
          dy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.3
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
          particle.x += particle.dx;
          particle.y += particle.dy;

          if (particle.x < 0 || particle.x > canvas.width) particle.dx = -particle.dx;
          if (particle.y < 0 || particle.y > canvas.height) particle.dy = -particle.dy;

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${accent}${Math.floor(particle.alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();
        });

        particles.forEach((p1, i) => {
          particles.slice(i + 1).forEach(p2 => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `${accent}${Math.floor((1 - distance / 100) * 30).toString(16).padStart(2, '0')}`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'waves') {
      let offset = 0;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        offset += 0.01;

        const drawWave = (yOffset: number, amplitude: number, frequency: number, alpha: number) => {
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);

          for (let x = 0; x <= canvas.width; x++) {
            const y = yOffset + Math.sin((x * frequency) + offset) * amplitude;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(canvas.width, canvas.height);
          ctx.closePath();
          ctx.fillStyle = `${accent}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();
        };

        drawWave(canvas.height - 100, 30, 0.01, 0.1);
        drawWave(canvas.height - 150, 40, 0.008, 0.15);
        drawWave(canvas.height - 200, 50, 0.006, 0.1);

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'gradient-shift') {
      let hue = 0;
      const animate = () => {
        hue = (hue + 0.5) % 360;
        
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, `hsl(${hue}, 70%, 50%)`);
        gradient.addColorStop(1, primaryColor);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [type, theme, baseColor, accentColor]);

  if (type !== 'animated') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};
