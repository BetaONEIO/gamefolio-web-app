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
    } else if (theme === 'snake') {
      const snake: Array<{ x: number; y: number; hue: number }> = [];
      const gridSize = 20;
      let direction = { x: 1, y: 0 };
      let nextDirection = { x: 1, y: 0 };
      let hue = 0;
      let frame = 0;
      
      const startX = Math.floor(canvas.width / gridSize / 2);
      const startY = Math.floor(canvas.height / gridSize / 2);
      
      for (let i = 0; i < 20; i++) {
        snake.push({ x: startX - i, y: startY, hue: (hue - i * 10) % 360 });
      }

      const animate = () => {
        ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        frame++;
        if (frame % 5 === 0) {
          direction = nextDirection;
          const head = snake[0];
          const newHead = {
            x: head.x + direction.x,
            y: head.y + direction.y,
            hue: hue % 360
          };

          const cols = Math.floor(canvas.width / gridSize);
          const rows = Math.floor(canvas.height / gridSize);
          
          if (newHead.x < 0) newHead.x = cols - 1;
          if (newHead.x >= cols) newHead.x = 0;
          if (newHead.y < 0) newHead.y = rows - 1;
          if (newHead.y >= rows) newHead.y = 0;

          snake.unshift(newHead);
          snake.pop();

          hue += 2;

          if (Math.random() < 0.1) {
            const directions = [
              { x: 1, y: 0 },
              { x: -1, y: 0 },
              { x: 0, y: 1 },
              { x: 0, y: -1 }
            ];
            nextDirection = directions[Math.floor(Math.random() * directions.length)];
          }
        }

        snake.forEach((segment, i) => {
          const alpha = 1 - (i / snake.length) * 0.5;
          ctx.fillStyle = `hsla(${segment.hue}, 70%, 50%, ${alpha})`;
          ctx.fillRect(
            segment.x * gridSize,
            segment.y * gridSize,
            gridSize - 2,
            gridSize - 2
          );
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'color-panels') {
      const gridSize = 60;
      const cols = Math.ceil(canvas.width / gridSize);
      const rows = Math.ceil(canvas.height / gridSize);
      const panels: Array<{ row: number; col: number; hue: number; targetHue: number; transitioning: boolean }> = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const hue = Math.random() * 360;
          panels.push({
            row,
            col,
            hue,
            targetHue: hue,
            transitioning: false
          });
        }
      }

      let lastUpdate = Date.now();

      const animate = () => {
        const now = Date.now();

        if (now - lastUpdate > 100) {
          const randomPanel = panels[Math.floor(Math.random() * panels.length)];
          if (!randomPanel.transitioning) {
            randomPanel.targetHue = Math.random() * 360;
            randomPanel.transitioning = true;
          }
          lastUpdate = now;
        }

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        panels.forEach(panel => {
          if (panel.transitioning) {
            const diff = panel.targetHue - panel.hue;
            const shortestDiff = ((diff + 180) % 360) - 180;
            panel.hue += shortestDiff * 0.1;

            if (Math.abs(panel.hue - panel.targetHue) < 1) {
              panel.hue = panel.targetHue;
              panel.transitioning = false;
            }
          }

          const x = panel.col * gridSize;
          const y = panel.row * gridSize;

          ctx.fillStyle = `hsl(${panel.hue}, 70%, 40%)`;
          ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);

          const gradient = ctx.createRadialGradient(
            x + gridSize / 2,
            y + gridSize / 2,
            0,
            x + gridSize / 2,
            y + gridSize / 2,
            gridSize / 2
          );
          gradient.addColorStop(0, `hsla(${panel.hue}, 70%, 60%, 0.3)`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
        });

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'pacman') {
      const gridSize = 20;
      const dots: Array<{ x: number; y: number; eaten: boolean }> = [];
      const cols = Math.floor(canvas.width / gridSize);
      const rows = Math.floor(canvas.height / gridSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() > 0.3) {
            dots.push({ x: col * gridSize + gridSize / 2, y: row * gridSize + gridSize / 2, eaten: false });
          }
        }
      }

      let pacman = { x: gridSize * 5, y: gridSize * 5, direction: 1, mouthOpen: 0 };
      let targetX = canvas.width / 2;
      let targetY = canvas.height / 2;

      const animate = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        dots.forEach(dot => {
          if (!dot.eaten) {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FFB8AE';
            ctx.fill();

            const dist = Math.sqrt((pacman.x - dot.x) ** 2 + (pacman.y - dot.y) ** 2);
            if (dist < 15) dot.eaten = true;
          }
        });

        const dx = targetX - pacman.x;
        const dy = targetY - pacman.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20 || Math.random() < 0.01) {
          targetX = Math.random() * canvas.width;
          targetY = Math.random() * canvas.height;
        }

        pacman.x += (dx / distance) * 2;
        pacman.y += (dy / distance) * 2;
        pacman.direction = Math.atan2(dy, dx);
        pacman.mouthOpen = (pacman.mouthOpen + 0.1) % (Math.PI * 2);

        ctx.save();
        ctx.translate(pacman.x, pacman.y);
        ctx.rotate(pacman.direction);
        ctx.beginPath();
        const mouthAngle = 0.3 + Math.abs(Math.sin(pacman.mouthOpen)) * 0.3;
        ctx.arc(0, 0, 15, mouthAngle, Math.PI * 2 - mouthAngle);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#FFFF00';
        ctx.fill();
        ctx.restore();

        if (dots.every(dot => dot.eaten)) {
          dots.forEach(dot => dot.eaten = false);
        }

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'tetris') {
      const blockSize = 30;
      const cols = Math.floor(canvas.width / blockSize);
      const rows = Math.floor(canvas.height / blockSize);
      
      const shapes = [
        { blocks: [[0,0], [0,1], [0,2], [0,3]], color: '#00F0F0' }, // I
        { blocks: [[0,0], [0,1], [1,0], [1,1]], color: '#F0F000' }, // O
        { blocks: [[0,1], [1,0], [1,1], [1,2]], color: '#F000F0' }, // T
        { blocks: [[0,1], [0,2], [1,0], [1,1]], color: '#00F000' }, // S
        { blocks: [[0,0], [0,1], [1,1], [1,2]], color: '#F00000' }, // Z
        { blocks: [[0,0], [1,0], [1,1], [1,2]], color: '#0000F0' }, // J
        { blocks: [[0,2], [1,0], [1,1], [1,2]], color: '#F0A000' }, // L
      ];
      
      const grid: Array<Array<string | null>> = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
          grid[r][c] = null;
        }
      }

      let currentPiece: { col: number; row: number; shape: {blocks: number[][], color: string} } | null = null;
      let frame = 0;
      let clearingRows: number[] = [];
      let clearFrame = 0;

      const spawnPiece = () => {
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const col = Math.floor(Math.random() * (cols - 4)) + 1;
        currentPiece = {
          col,
          row: 0,
          shape
        };
      };

      const canPlacePiece = (piece: typeof currentPiece): boolean => {
        if (!piece) return false;
        
        for (const [dr, dc] of piece.shape.blocks) {
          const r = piece.row + dr;
          const c = piece.col + dc;
          
          if (r >= rows || c < 0 || c >= cols) return false;
          if (r >= 0 && grid[r][c] !== null) return false;
        }
        return true;
      };

      const placePiece = (piece: typeof currentPiece) => {
        if (!piece) return;
        
        for (const [dr, dc] of piece.shape.blocks) {
          const r = piece.row + dr;
          const c = piece.col + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
            grid[r][c] = piece.shape.color;
          }
        }
      };

      const checkCompleteRows = () => {
        const completeRows: number[] = [];
        for (let r = 0; r < rows; r++) {
          if (grid[r].every(cell => cell !== null)) {
            completeRows.push(r);
          }
        }
        return completeRows;
      };

      const clearRows = (rowsToClear: number[]) => {
        rowsToClear.sort((a, b) => b - a);
        rowsToClear.forEach(r => {
          grid.splice(r, 1);
          grid.unshift(Array(cols).fill(null));
        });
      };

      const resetBoard = () => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            grid[r][c] = null;
          }
        }
      };

      spawnPiece();

      const animate = () => {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (clearingRows.length > 0) {
          clearFrame++;
          if (clearFrame > 20) {
            clearRows(clearingRows);
            clearingRows = [];
            clearFrame = 0;
          }
        } else {
          frame++;
          
          if (currentPiece && frame % 10 === 0) {
            const testPiece = { ...currentPiece, row: currentPiece.row + 1 };
            
            if (!canPlacePiece(testPiece)) {
              placePiece(currentPiece);
              
              const completeRows = checkCompleteRows();
              if (completeRows.length > 0) {
                clearingRows = completeRows;
              }
              
              currentPiece = null;
              
              setTimeout(() => {
                spawnPiece();
                if (currentPiece && !canPlacePiece(currentPiece)) {
                  resetBoard();
                  spawnPiece();
                }
              }, 100);
            } else {
              currentPiece.row++;
            }
          }
        }

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
              const isClearing = clearingRows.includes(r);
              const baseAlpha = isClearing ? Math.sin(clearFrame * 0.3) * 0.15 + 0.15 : 0.25;
              
              ctx.fillStyle = grid[r][c]!;
              ctx.globalAlpha = baseAlpha;
              ctx.fillRect(c * blockSize + 2, r * blockSize + 2, blockSize - 4, blockSize - 4);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.lineWidth = 2;
              ctx.strokeRect(c * blockSize + 2, r * blockSize + 2, blockSize - 4, blockSize - 4);
              ctx.globalAlpha = 1;
            }
          }
        }

        if (currentPiece) {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = currentPiece.shape.color;
          for (const [dr, dc] of currentPiece.shape.blocks) {
            const r = currentPiece.row + dr;
            const c = currentPiece.col + dc;
            if (r >= 0) {
              ctx.fillRect(
                c * blockSize + 2,
                r * blockSize + 2,
                blockSize - 4,
                blockSize - 4
              );
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.lineWidth = 2;
              ctx.strokeRect(
                c * blockSize + 2,
                r * blockSize + 2,
                blockSize - 4,
                blockSize - 4
              );
            }
          }
          ctx.globalAlpha = 1;
        }

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'space-invaders') {
      const aliens: Array<{ x: number; y: number; frame: number }> = [];
      const bullets: Array<{ x: number; y: number }> = [];
      const rows = 3;
      const cols = 8;
      const spacing = 60;
      let direction = 1;
      let moveDown = false;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          aliens.push({
            x: col * spacing + 100,
            y: row * spacing + 50,
            frame: 0
          });
        }
      }

      const drawAlien = (x: number, y: number, frame: number) => {
        ctx.fillStyle = '#00FF00';
        const f = Math.floor(frame) % 2;
        
        if (f === 0) {
          ctx.fillRect(x + 4, y, 16, 8);
          ctx.fillRect(x, y + 8, 24, 8);
          ctx.fillRect(x + 4, y + 16, 4, 4);
          ctx.fillRect(x + 16, y + 16, 4, 4);
        } else {
          ctx.fillRect(x + 4, y, 16, 8);
          ctx.fillRect(x, y + 8, 24, 8);
          ctx.fillRect(x, y + 16, 4, 4);
          ctx.fillRect(x + 20, y + 16, 4, 4);
        }
      };

      let lastShot = 0;
      const animate = () => {
        ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        aliens.forEach((alien, i) => {
          alien.frame += 0.05;
          alien.x += direction * 0.5;
          
          if (moveDown) {
            alien.y += 20;
          }

          drawAlien(alien.x, alien.y, alien.frame);

          if (Date.now() - lastShot > 2000 && Math.random() < 0.001) {
            bullets.push({ x: alien.x + 12, y: alien.y + 20 });
            lastShot = Date.now();
          }
        });

        if (aliens.length > 0) {
          const leftmost = Math.min(...aliens.map(a => a.x));
          const rightmost = Math.max(...aliens.map(a => a.x));

          if (leftmost < 10 || rightmost > canvas.width - 40) {
            direction *= -1;
            moveDown = true;
          } else {
            moveDown = false;
          }
        }

        bullets.forEach((bullet, i) => {
          bullet.y += 3;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(bullet.x, bullet.y, 2, 8);

          if (bullet.y > canvas.height) {
            bullets.splice(i, 1);
          }
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    } else if (theme === 'pong') {
      const paddleWidth = 10;
      const paddleHeight = 80;
      const ballSize = 10;

      let ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        dx: 3,
        dy: 2
      };

      let leftPaddle = { y: canvas.height / 2 - paddleHeight / 2 };
      let rightPaddle = { y: canvas.height / 2 - paddleHeight / 2 };

      const animate = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.y <= 0 || ball.y >= canvas.height - ballSize) {
          ball.dy *= -1;
        }

        if (ball.x <= paddleWidth + 20) {
          if (ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + paddleHeight) {
            ball.dx *= -1;
            ball.x = paddleWidth + 20;
          }
        }

        if (ball.x >= canvas.width - paddleWidth - 20 - ballSize) {
          if (ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + paddleHeight) {
            ball.dx *= -1;
            ball.x = canvas.width - paddleWidth - 20 - ballSize;
          }
        }

        if (ball.x < 0 || ball.x > canvas.width) {
          ball.x = canvas.width / 2;
          ball.y = canvas.height / 2;
          ball.dx = (Math.random() > 0.5 ? 1 : -1) * 3;
          ball.dy = (Math.random() - 0.5) * 4;
        }

        leftPaddle.y += (ball.y - leftPaddle.y - paddleHeight / 2) * 0.1;
        rightPaddle.y += (ball.y - rightPaddle.y - paddleHeight / 2) * 0.1;

        leftPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, leftPaddle.y));
        rightPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, rightPaddle.y));

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(20, leftPaddle.y, paddleWidth, paddleHeight);
        ctx.fillRect(canvas.width - 20 - paddleWidth, rightPaddle.y, paddleWidth, paddleHeight);
        ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

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
