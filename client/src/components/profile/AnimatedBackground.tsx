import { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  type: string;
  theme: string;
  baseColor?: string;
  accentColor?: string;
  contained?: boolean;
}

export const AnimatedBackground = ({ type, theme, baseColor, accentColor, contained = false }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (type !== 'animated' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      if (contained && containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
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
    } else if (theme === 'starfield') {
      const stars: Array<{ x: number; y: number; z: number; size: number }> = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * canvas.width,
          size: Math.random() * 2
        });
      }

      const animate = () => {
        ctx.fillStyle = 'rgba(0, 8, 20, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
          star.z -= 2;
          if (star.z <= 0) {
            star.z = canvas.width;
            star.x = Math.random() * canvas.width;
            star.y = Math.random() * canvas.height;
          }

          const x = (star.x - canvas.width / 2) * (canvas.width / star.z) + canvas.width / 2;
          const y = (star.y - canvas.height / 2) * (canvas.width / star.z) + canvas.height / 2;
          const size = star.size * (canvas.width / star.z);

          ctx.beginPath();
          ctx.fillStyle = '#ffffff';
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'fireflies') {
      const fireflies: Array<{
        x: number;
        y: number;
        dx: number;
        dy: number;
        brightness: number;
        fadeDirection: number;
      }> = [];

      for (let i = 0; i < 30; i++) {
        fireflies.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          dx: (Math.random() - 0.5) * 0.3,
          dy: (Math.random() - 0.5) * 0.3,
          brightness: Math.random(),
          fadeDirection: Math.random() > 0.5 ? 0.01 : -0.01
        });
      }

      const animate = () => {
        ctx.fillStyle = 'rgba(10, 31, 31, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        fireflies.forEach(firefly => {
          firefly.x += firefly.dx;
          firefly.y += firefly.dy;
          firefly.brightness += firefly.fadeDirection;

          if (firefly.brightness >= 1 || firefly.brightness <= 0) {
            firefly.fadeDirection *= -1;
          }

          if (firefly.x < 0) firefly.x = canvas.width;
          if (firefly.x > canvas.width) firefly.x = 0;
          if (firefly.y < 0) firefly.y = canvas.height;
          if (firefly.y > canvas.height) firefly.y = 0;

          const gradient = ctx.createRadialGradient(firefly.x, firefly.y, 0, firefly.x, firefly.y, 20);
          gradient.addColorStop(0, `rgba(255, 255, 100, ${firefly.brightness * 0.8})`);
          gradient.addColorStop(0.5, `rgba(255, 255, 100, ${firefly.brightness * 0.3})`);
          gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');

          ctx.beginPath();
          ctx.arc(firefly.x, firefly.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'digital-rain') {
      const columns = Math.floor(canvas.width / 20);
      const drops: number[] = Array(columns).fill(1);
      const chars = '01アイウエオカキクケコサシスセソタチツテト'.split('');

      const animate = () => {
        ctx.fillStyle = 'rgba(0, 26, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f0';
        ctx.font = '15px monospace';

        for (let i = 0; i < drops.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(char, i * 20, drops[i] * 20);

          if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'neon-pulse') {
      let time = 0;
      const rings: Array<{ radius: number; alpha: number; color: string }> = [];

      const animate = () => {
        ctx.fillStyle = 'rgba(26, 0, 51, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        time += 0.02;

        if (Math.random() < 0.03) {
          const colors = ['#ff00ff', '#00ffff', '#ff0080', '#8000ff'];
          rings.push({
            radius: 0,
            alpha: 1,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }

        rings.forEach((ring, index) => {
          ring.radius += 2;
          ring.alpha -= 0.01;

          if (ring.alpha <= 0) {
            rings.splice(index, 1);
            return;
          }

          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, ring.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${ring.color}${Math.floor(ring.alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 3;
          ctx.stroke();
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'cosmic-dust') {
      const dust: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        trail: Array<{ x: number; y: number }>;
      }> = [];

      for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.2;
        dust.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2 + 0.5,
          trail: []
        });
      }

      const animate = () => {
        ctx.fillStyle = 'rgba(13, 17, 23, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        dust.forEach(particle => {
          const dx = centerX - particle.x;
          const dy = centerY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          particle.vx += (dx / distance) * 0.01;
          particle.vy += (dy / distance) * 0.01;

          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < 0 || particle.x > canvas.width || particle.y < 0 || particle.y > canvas.height) {
            particle.x = Math.random() * canvas.width;
            particle.y = Math.random() * canvas.height;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.5 + 0.2;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.trail = [];
          }

          particle.trail.push({ x: particle.x, y: particle.y });
          if (particle.trail.length > 10) particle.trail.shift();

          particle.trail.forEach((point, i) => {
            const alpha = (i / particle.trail.length) * 0.5;
            ctx.beginPath();
            ctx.arc(point.x, point.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147, 51, 234, ${alpha})`;
            ctx.fill();
          });

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = '#9333ea';
          ctx.fill();
        });

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
  }, [type, theme, baseColor, accentColor, contained]);

  if (type !== 'animated') return null;

  if (contained) {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};
