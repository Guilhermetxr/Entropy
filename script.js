const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const heroArt = document.querySelector('.hero-art');
const artStage = document.querySelector('.art-stage');
const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (heroArt && artStage && canTilt) {
  const maxTilt = 7;
  heroArt.addEventListener('mousemove', (event) => {
    const bounds = heroArt.getBoundingClientRect();
    const relX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const relY = (event.clientY - bounds.top) / bounds.height - 0.5;
    artStage.style.setProperty('--tilt-x', (relX * maxTilt * 2).toFixed(2));
    artStage.style.setProperty('--tilt-y', (relY * -maxTilt * 2).toFixed(2));
  });
  heroArt.addEventListener('mouseleave', () => {
    artStage.style.setProperty('--tilt-x', 0);
    artStage.style.setProperty('--tilt-y', 0);
  });
}

// Hero 3D: singularidade -> big bang -> caos -> ordem local (vortice ENTROPY) -> caos -> colapso -> repete
function initEntropy() {
  const art = document.querySelector('.hero-art');
  const canvas = art?.querySelector('.entropy-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const phaseLabel = art.querySelector('[data-phase]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = '17, 17, 15';
  const PAPER = '242, 239, 233';
  const INK_RGB = [17, 17, 15], PAPER_RGB = [242, 239, 233];
  // paleta do vortice: dourados/ambar + azul-marinho sobre fundo escuro
  const VORTEX = [[242, 178, 62], [224, 122, 31], [255, 214, 140], [46, 84, 140], [30, 56, 98]];
  const ARMS = 5;
  const PHASES = [
    { name: 'bang', duration: 1700, label: 't = 0 / SINGULARIDADE' },
    { name: 'chaos', duration: 4200, label: 'ΔS > 0 / CAOS' },
    { name: 'form', duration: 4200, label: 'ORDEM LOCAL / FORMA' },
    { name: 'chaos', duration: 3800, label: 'ΔS > 0 / CAOS' },
    { name: 'collapse', duration: 1500, label: 'COLAPSO' },
  ];
  // camadas de profundidade, do fundo para a frente
  const LAYERS = [
    { alpha: 0.28, width: 0.7 },
    { alpha: 0.5, width: 1.1 },
    { alpha: 0.78, width: 1.5 },
    { alpha: 1, width: 2.1 },
  ];

  let w = 0, h = 0, scale = 1;
  let focal = 1, boxX = 1, boxY = 1, boxZ = 1, cube = 1, vortexR = 1;
  let particles = [];
  let vortexMix = 0;
  let phaseIndex = 0, phaseStart = 0, lastTime = 0;
  let running = false, visible = false, frame = 0;
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false };
  const cam = { yaw: 0, pitch: 0, cy: 1, sy: 0, cp: 1, sp: 0 };
  const out = { x: 0, y: 0, s: 1, z: 0 };

  function setCamera(yaw, pitch) {
    cam.yaw = yaw;
    cam.pitch = pitch;
    cam.cy = Math.cos(yaw); cam.sy = Math.sin(yaw);
    cam.cp = Math.cos(pitch); cam.sp = Math.sin(pitch);
  }

  // mundo -> tela (rotacao da camera + perspectiva)
  function project(x, y, z) {
    const x1 = x * cam.cy + z * cam.sy;
    const z1 = -x * cam.sy + z * cam.cy;
    const y2 = y * cam.cp - z1 * cam.sp;
    const z2 = y * cam.sp + z1 * cam.cp;
    const s = focal / Math.max(focal + z2, focal * 0.2);
    out.x = w / 2 + x1 * s;
    out.y = h / 2 + y2 * s;
    out.s = s;
    out.z = z2;
    return out;
  }

  function makeParticle() {
    return {
      x: (Math.random() * 2 - 1) * boxX, y: (Math.random() * 2 - 1) * boxY, z: (Math.random() * 2 - 1) * boxZ,
      vx: 0, vy: 0, vz: 0,
      delay: Math.random() * 1100,
      jx: (Math.random() - 0.5) * 2, jy: (Math.random() - 0.5) * 2,
      // espessura do disco do vortice
      jz: Math.random() * 2 - 1,
      light: Math.random() < 0.12,
      px: -1e4, py: -1e4,
      ...vortexSlot(),
    };
  }

  // posicao de cada particula no vortice: bracos espirais + estilhacos soltos na borda
  function vortexSlot() {
    const debris = Math.random() < 0.14;
    const arm = Math.floor(Math.random() * ARMS);
    const vr = debris ? 0.75 + Math.random() * 0.5 : 0.1 + 0.9 * Math.pow(Math.random(), 0.85);
    const va = debris
      ? Math.random() * Math.PI * 2
      : (arm * Math.PI * 2) / ARMS - vr * 3.6 + (Math.random() - 0.5) * (0.5 + vr * 0.4);
    const roll = Math.random();
    let hue;
    if (!debris && arm % 2) hue = roll < 0.65 ? (roll < 0.35 ? 3 : 4) : roll < 0.85 ? 0 : 1;
    else hue = roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2;
    return { vr, va, hue, shard: Math.random() < (debris ? 0.6 : 0.28) };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    scale = Math.min(w, h) / 480;
    focal = Math.min(w, h) * 1.25;
    boxX = w * 0.46; boxY = h * 0.46; boxZ = Math.min(w, h) * 0.42;
    cube = Math.min(w, h) * 0.3;
    vortexR = Math.min(w, h) * 0.4;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(1300, (w * h) / 170));
    while (particles.length < count) particles.push(makeParticle());
    particles.length = count;
    if (reduceMotion) drawStatic();
  }

  // alvo girando: o centro gira um pouco mais rapido e afunda como um funil
  function targetFor(i, time) {
    const p = particles[i];
    const rn = Math.min(p.vr, 1);
    const a = p.va + time * (0.00045 + 0.0004 * (1 - rn));
    const r = p.vr * vortexR;
    return {
      x: Math.cos(a) * r + p.jx,
      y: Math.sin(a) * r + p.jy,
      z: (1 - rn) ** 2 * vortexR * 0.55 + p.jz * 6 * scale,
    };
  }

  function enterPhase(index, now) {
    phaseIndex = index % PHASES.length;
    phaseStart = now;
    const phase = PHASES[phaseIndex];
    if (phaseLabel) phaseLabel.textContent = phase.label;
    if (phase.name === 'bang') {
      particles.forEach((p) => {
        // direcao uniforme na esfera: a explosao acontece em todas as direcoes, inclusive na profundidade
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const speed = (0.4 + Math.random() ** 2 * 15) * scale;
        p.x = (Math.random() - 0.5) * 2;
        p.y = (Math.random() - 0.5) * 2;
        p.z = (Math.random() - 0.5) * 2;
        p.vx = r * Math.cos(theta) * speed;
        p.vy = r * Math.sin(theta) * speed;
        p.vz = u * speed;
      });
    } else if (phase.name === 'chaos' && index > 1) {
      // saindo da forma: um empurrao aleatorio devolve tudo ao caos
      particles.forEach((p) => {
        p.vx += (Math.random() - 0.5) * 7 * scale;
        p.vy += (Math.random() - 0.5) * 7 * scale;
        p.vz += (Math.random() - 0.5) * 7 * scale;
      });
    }
  }

  function wrap(v, limit) {
    if (v < -limit) return limit;
    if (v > limit) return -limit;
    return v;
  }

  function update(now, f) {
    const phase = PHASES[phaseIndex];
    const elapsed = now - phaseStart;
    const flow = 0.05 * scale * f;
    const jitter = 0.08 * scale;
    const t1 = now * 0.0007, t2 = now * 0.00053, t3 = now * 0.00041;
    particles.forEach((p, i) => {
      let drag = 0.97;
      const inForm = phase.name === 'form' && elapsed > p.delay;
      if (inForm) {
        const t = targetFor(i, now);
        p.vx += (t.x - p.x) * 0.02 * f + (Math.random() - 0.5) * 0.12;
        p.vy += (t.y - p.y) * 0.02 * f + (Math.random() - 0.5) * 0.12;
        p.vz += (t.z - p.z) * 0.02 * f + (Math.random() - 0.5) * 0.12;
        drag = 0.84;
      } else if (phase.name === 'collapse') {
        // espiral em torno do eixo vertical ate a singularidade
        const k = 0.0016 + (elapsed / phase.duration) * 0.01;
        p.vx += (-p.x * k - p.z * 0.005) * f;
        p.vy += -p.y * k * f;
        p.vz += (-p.z * k + p.x * 0.005) * f;
        drag = 0.9;
      } else {
        const x = p.x * 0.014, y = p.y * 0.014, z = p.z * 0.014;
        p.vx += (Math.sin(y + t1) + Math.cos(z * 1.3 - t2)) * flow;
        p.vy += (Math.sin(z + t3) + Math.cos(x * 1.3 + t1)) * flow;
        p.vz += (Math.sin(x - t2) + Math.cos(y * 1.3 + t3)) * flow;
        p.vx += (Math.random() - 0.5) * jitter;
        p.vy += (Math.random() - 0.5) * jitter;
        p.vz += (Math.random() - 0.5) * jitter;
        if (phase.name === 'bang') drag = 0.955;
      }
      if (pointer.active) {
        const dx = p.px - pointer.x, dy = p.py - pointer.y;
        const d2 = dx * dx + dy * dy;
        const r = 95 * scale;
        if (d2 < r * r && d2 > 0.01) {
          // empurrao no plano da tela, convertido de volta para o espaco do mundo
          const d = Math.sqrt(d2);
          const push = (1 - d / r) * 1.8 * f;
          const ex = (dx / d) * push, ey = (dy / d) * push;
          const z1 = -ey * cam.sp;
          p.vx += ex * cam.cy - z1 * cam.sy;
          p.vy += ey * cam.cp;
          p.vz += ex * cam.sy + z1 * cam.cy;
        }
      }
      const damp = Math.pow(drag, f);
      p.vx *= damp; p.vy *= damp; p.vz *= damp;
      p.x += p.vx * f; p.y += p.vy * f; p.z += p.vz * f;
      if (phase.name === 'chaos' || (phase.name === 'form' && !inForm)) {
        p.x = wrap(p.x, boxX); p.y = wrap(p.y, boxY); p.z = wrap(p.z, boxZ);
      }
    });
  }

  function updateCamera(now, f) {
    const targetYaw = Math.sin(now * 0.00025) * 0.7 * (1 - vortexMix * 0.5) + pointer.nx * 0.5;
    const targetPitch = Math.sin(now * 0.00017) * 0.22 - 0.1 - pointer.ny * 0.35;
    const ease = 1 - Math.pow(0.95, f);
    setCamera(cam.yaw + (targetYaw - cam.yaw) * ease, cam.pitch + (targetPitch - cam.pitch) * ease);
  }

  function drawCube() {
    const c = cube;
    const corners = [];
    for (let i = 0; i < 8; i++) {
      const pr = project(i & 1 ? c : -c, i & 2 ? c : -c, i & 4 ? c : -c);
      corners.push([pr.x, pr.y]);
    }
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      for (const bit of [1, 2, 4]) {
        if (!(i & bit)) {
          ctx.moveTo(corners[i][0], corners[i][1]);
          ctx.lineTo(corners[i | bit][0], corners[i | bit][1]);
        }
      }
    }
    ctx.strokeStyle = `rgba(${INK}, ${0.14 * (1 - vortexMix)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function mixColor(from, to) {
    return from.map((c, k) => Math.round(c + (to[k] - c) * vortexMix)).join(', ');
  }

  function drawParticles() {
    // cores por grupo: tinta/papel no caos, dourado/azul no vortice
    const colors = [
      ...VORTEX.map((c) => mixColor(INK_RGB, c)),
      ...VORTEX.map((c) => mixColor(PAPER_RGB, c)),
    ];
    const paths = LAYERS.map(() => colors.map(() => new Path2D()));
    const zRange = boxZ * 2;
    const tailK = 2.4 + vortexMix * 7;
    const shards = vortexMix > 0.35;
    particles.forEach((p) => {
      const tailX = p.x - p.vx * tailK, tailY = p.y - p.vy * tailK, tailZ = p.z - p.vz * tailK;
      const head = project(p.x, p.y, p.z);
      const hx = head.x, hy = head.y, s = head.s, z = head.z;
      p.px = hx; p.py = hy;
      if (hx < -40 || hx > w + 40 || hy < -40 || hy > h + 40) return;
      const layer = LAYERS.length - 1 - Math.max(0, Math.min(LAYERS.length - 1, Math.floor(((z + boxZ) / zRange) * LAYERS.length)));
      const path = paths[layer][p.hue + (p.light ? VORTEX.length : 0)];
      const tail = project(tailX, tailY, tailZ);
      const dx = hx - tail.x, dy = hy - tail.y;
      if (shards && p.shard) {
        // estilhaco: cunha triangular apontando na direcao do movimento
        const speed = Math.hypot(dx, dy);
        const ux = speed > 0.5 ? dx / speed : -Math.sin(p.va);
        const uy = speed > 0.5 ? dy / speed : Math.cos(p.va);
        const len = Math.max(speed, 5 * s);
        const half = len * (0.25 + Math.abs(p.jx) * 0.2);
        // base levemente torta para cada estilhaco ter um formato diferente
        const bx = hx - ux * len * (1 + p.jy * 0.3), by = hy - uy * len * (1 + p.jy * 0.3);
        path.moveTo(hx, hy);
        path.lineTo(bx - uy * half, by + ux * half);
        path.lineTo(bx + uy * half * 0.6, by - ux * half * 0.6);
        path.closePath();
      } else if (Math.abs(dx) + Math.abs(dy) < 1.2 * s) {
        const size = 1.6 * s;
        path.rect(hx - size / 2, hy - size / 2, size, size);
      } else {
        path.moveTo(tail.x, tail.y);
        path.lineTo(hx, hy);
      }
    });
    const widthK = 1 + vortexMix * 0.9;
    paths.forEach((group, i) => {
      const { alpha, width } = LAYERS[i];
      ctx.lineWidth = width * widthK;
      group.forEach((path, c) => {
        ctx.fillStyle = ctx.strokeStyle = `rgba(${colors[c]}, ${alpha})`;
        ctx.fill(path);
        ctx.stroke(path);
      });
    });
  }

  // fundo escuro com brilho quente no centro, so enquanto o vortice existe
  function drawBackdrop() {
    if (vortexMix < 0.01) return;
    ctx.fillStyle = `rgba(14, 13, 12, ${vortexMix})`;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, vortexR * 1.3);
    glow.addColorStop(0, `rgba(255, 150, 50, ${0.16 * vortexMix})`);
    glow.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const phase = PHASES[phaseIndex];
    const elapsed = now - phaseStart;
    drawBackdrop();
    drawCube();
    if (phase.name === 'bang' && elapsed < 900) {
      const k = elapsed / 900;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 8 + k * Math.max(w, h) * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${INK}, ${(1 - k) * 0.55})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (phase.name === 'collapse') {
      const k = elapsed / phase.duration;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 2 + k * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${INK})`;
      ctx.fill();
    }
    drawParticles();
  }

  function drawStatic() {
    setCamera(0.25, -0.15);
    setVortexMix(1);
    particles.forEach((p, i) => {
      if (i % 10 < 7) {
        const t = targetFor(i, 0);
        p.x = t.x; p.y = t.y; p.z = t.z;
      }
      p.vx = 0; p.vy = 0; p.vz = 0;
    });
    if (phaseLabel) phaseLabel.textContent = 'ORDEM LOCAL / FORMA';
    ctx.clearRect(0, 0, w, h);
    drawBackdrop();
    drawCube();
    drawParticles();
  }

  function setVortexMix(value) {
    vortexMix = value;
    art.classList.toggle('is-vortex', value > 0.5);
  }

  function tick(now) {
    if (!running) return;
    const f = Math.min((now - lastTime) / 16.67, 3);
    lastTime = now;
    if (now - phaseStart > PHASES[phaseIndex].duration) enterPhase(phaseIndex + 1, now);
    const mixTarget = PHASES[phaseIndex].name === 'form' ? 1 : 0;
    setVortexMix(vortexMix + (mixTarget - vortexMix) * (1 - Math.pow(0.96, f)));
    updateCamera(now, f);
    update(now, f);
    draw(now);
    frame = requestAnimationFrame(tick);
  }

  function setRunning(shouldRun) {
    if (shouldRun === running || reduceMotion) return;
    running = shouldRun;
    if (running) {
      lastTime = performance.now();
      // primeira vez: comeca no big bang; ao voltar, desloca o relogio para nao pular etapas
      if (!setRunning.pausedAt) enterPhase(0, lastTime);
      else phaseStart += lastTime - setRunning.pausedAt;
      frame = requestAnimationFrame(tick);
    } else {
      setRunning.pausedAt = performance.now();
      cancelAnimationFrame(frame);
    }
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  if (reduceMotion) return;

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(visible && !document.hidden);
  }).observe(art);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  art.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * w;
    pointer.y = ((event.clientY - rect.top) / rect.height) * h;
    pointer.nx = pointer.x / w - 0.5;
    pointer.ny = pointer.y / h - 0.5;
    pointer.active = true;
  });
  art.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.nx = 0;
    pointer.ny = 0;
  });
}

initEntropy();

const WHATSAPP_NUMBER = '5598984853656';

function setServiceItemState(item, open) {
  const toggle = item.querySelector('.service-toggle');
  const panel = item.querySelector('.service-form');
  item.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  panel.setAttribute('aria-hidden', String(!open));
  panel.toggleAttribute('inert', !open);
}

document.querySelectorAll('.service-item').forEach((item) => {
  const toggle = item.querySelector('.service-toggle');
  toggle?.addEventListener('click', () => {
    const willOpen = !item.classList.contains('open');
    document.querySelectorAll('.service-item.open').forEach((openItem) => {
      if (openItem !== item) setServiceItemState(openItem, false);
    });
    setServiceItemState(item, willOpen);
    if (willOpen) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
});

function buildWhatsAppMessage(form, serviceName) {
  const lines = [`Ola! Tenho interesse em *${serviceName}* e quero passar mais detalhes:`, ''];
  form.querySelectorAll('.field').forEach((field) => {
    const label = field.querySelector('.field-label')?.textContent.trim();
    if (!label) return;
    let answer = '';
    const select = field.querySelector('select');
    const textarea = field.querySelector('textarea');
    const textInput = field.querySelector('input[type="text"]');
    const checked = field.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
    if (select) answer = select.value;
    else if (textarea) answer = textarea.value.trim();
    else if (textInput) answer = textInput.value.trim();
    else if (checked.length) answer = Array.from(checked).map((input) => input.value).join(', ');
    if (answer) lines.push(`• ${label}: ${answer}`);
  });
  return lines.join('\n');
}

document.querySelectorAll('.service-form form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const serviceName = form.dataset.serviceName;
    const message = buildWhatsAppMessage(form, serviceName);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  });
});

const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => revealObserver.observe(item));
