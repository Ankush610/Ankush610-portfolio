/* =================================================================
   rain.js — Matrix code rain (blue themed)
================================================================= */

(function () {
  const canvas = document.getElementById('rain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const FONT_SIZE = 14;
  const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>{}[]|/\\;:'.split('');

  let cols = 0;
  let drops = [];
  let enabled = true;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / FONT_SIZE);
    while (drops.length < cols) drops.push({
      y:       Math.random() * -canvas.height / FONT_SIZE,
      speed:   0.3 + Math.random() * 0.7,
      length:  15 + Math.floor(Math.random() * 25),
      opacity: 0.5 + Math.random() * 0.5,
    });
    drops.length = cols;
  }

  function init() {
    drops = [];
    cols = Math.floor(canvas.width / FONT_SIZE);
    for (let i = 0; i < cols; i++) {
      drops.push({
        y:       Math.random() * -canvas.height / FONT_SIZE,
        speed:   0.3 + Math.random() * 0.7,
        length:  15 + Math.floor(Math.random() * 25),
        opacity: 0.5 + Math.random() * 0.5,
      });
    }
  }

  function draw() {
    if (!enabled) { requestAnimationFrame(draw); return; }

    // semi-transparent overlay for trail fade effect
    ctx.fillStyle = 'rgba(6, 6, 18, 0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${FONT_SIZE}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const x = i * FONT_SIZE;

      for (let j = 0; j < d.length; j++) {
        const charY = (d.y - j) * FONT_SIZE;
        if (charY < 0 || charY > canvas.height) continue;

        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];

        if (j === 0) {
          // bright white-blue head
          ctx.fillStyle = `rgba(180, 230, 255, ${d.opacity})`;
        } else {
          // blue body fading to tail
          const fade = (1 - j / d.length) * d.opacity;
          const green = Math.floor(fade * 180);
          const blue  = Math.floor(180 + (1 - j / d.length) * 75);
          ctx.fillStyle = `rgba(0, ${green}, ${blue}, ${fade * 0.9})`;
        }

        ctx.fillText(ch, x, charY);
      }

      d.y += d.speed;

      if (d.y * FONT_SIZE > canvas.height + d.length * FONT_SIZE) {
        d.y      = Math.random() * -20;
        d.speed  = 0.3 + Math.random() * 0.7;
        d.length = 15 + Math.floor(Math.random() * 25);
        d.opacity = 0.5 + Math.random() * 0.5;
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  init();
  draw();

  window.addEventListener('resize', () => { resize(); });

  // expose toggle
  window.toggleRain = function (on) {
    enabled = on;
    canvas.style.display = on ? '' : 'none';
  };
})();
