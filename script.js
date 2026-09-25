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

// Hero 3D: a marca ENTROPY se dissolve em particulas com o scroll, que seguem soltas pela tela no ciclo
// caos -> ordem local (vortice) -> caos -> colapso -> singularidade/big bang -> caos -> ...
function initEntropy() {
  const canvas = document.querySelector('.entropy-canvas');
  const art = document.querySelector('.hero-art');
  const hero = document.querySelector('.hero');
  const intro = document.querySelector('.intro');
  const brand = intro?.querySelector('.intro-brand');
  if (!canvas || !art || !hero || !intro || !brand) return;
  const ctx = canvas.getContext('2d');
  const phaseLabel = art.querySelector('[data-phase]');
  const introHint = intro.querySelector('.scroll-note');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // preto e branco: particulas claras sobre o fundo preto, com cinzas para dar profundidade
  const FG = '244, 244, 242';
  const FG_RGB = [244, 244, 242], GRAY_RGB = [130, 130, 128];
  const VORTEX = [[255, 255, 255], [196, 196, 194], [232, 232, 230], [112, 112, 110], [72, 72, 70]];
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
  let glyph = [];
  // dissolve: 0 = marca inteira, 1 = marca toda virou particula; sceneK suaviza a entrada da cena 3D
  let vortexMix = 0, dissolve = 0, sceneK = 0, attachK = 0;
  let phaseIndex = 1, phaseStart = 0, lastTime = 0;
  let running = false, frame = 0;
  const visibleSections = new Set();
  const center = { x: 0, y: 0 };
  const brandPos = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false };
  const cam = { yaw: 0, pitch: 0, cy: 1, sy: 0, cp: 1, sp: 0 };
  const out = { x: 0, y: 0, s: 1, z: 0 };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const smoothstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function setCamera(yaw, pitch) {
    cam.yaw = yaw;
    cam.pitch = pitch;
    cam.cy = Math.cos(yaw); cam.sy = Math.sin(yaw);
    cam.cp = Math.cos(pitch); cam.sp = Math.sin(pitch);
  }

  // mundo (relativo ao centro da cena) -> tela (rotacao da camera + perspectiva)
  function project(x, y, z) {
    const x1 = x * cam.cy + z * cam.sy;
    const z1 = -x * cam.sy + z * cam.cy;
    const y2 = y * cam.cp - z1 * cam.sp;
    const z2 = y * cam.sp + z1 * cam.cp;
    const s = focal / Math.max(focal + z2, focal * 0.2);
    out.x = center.x + x1 * s;
    out.y = center.y + y2 * s;
    out.s = s;
    out.z = z2;
    return out;
  }

  // onde a cena esta na tela: no meio da intro enquanto a marca se desfaz, depois presa ao hero
  function readLayout() {
    const introRect = intro.getBoundingClientRect();
    dissolve = clamp(-introRect.top / Math.max(1, introRect.height - h), 0, 1);
    const artRect = art.getBoundingClientRect();
    const ax = artRect.left + artRect.width / 2;
    const ay = artRect.top + artRect.height / 2;
    // a nuvem espera no meio da tela ate a area do hero chegar la, e dai em diante rola junto com ela
    attachK = smoothstep(0, 1, (h - ay) / (h / 2));
    sceneK = Math.min(smoothstep(0.45, 1, dissolve), attachK);
    center.x = w / 2 + (ax - w / 2) * attachK;
    center.y = Math.min(ay, h / 2);
    const brandRect = brand.getBoundingClientRect();
    brandPos.x = brandRect.left;
    brandPos.y = brandRect.top;
    // a mascara acompanha a varredura das particulas, da esquerda para a direita
    brand.style.setProperty('--cut', `${(((dissolve - 0.1) / 0.6) * 100).toFixed(1)}%`);
    brand.style.opacity = dissolve > 0.8 ? '0' : '';
    if (introHint) introHint.style.opacity = String(clamp(1 - dissolve * 5, 0, 1));
    const heroBottom = hero.getBoundingClientRect().bottom;
    canvas.style.opacity = String(clamp(heroBottom / (h * 0.5), 0, 1));
  }

  // amostra a marca (logo + nome) e da a cada particula um ponto de partida nela
  function buildGlyph() {
    const rect = brand.getBoundingClientRect();
    const bw = Math.ceil(rect.width), bh = Math.ceil(rect.height);
    if (!bw || !bh) return;
    const off = document.createElement('canvas');
    off.width = bw;
    off.height = bh;
    const o = off.getContext('2d');
    const logo = brand.querySelector('.intro-logo');
    if (logo?.complete && logo.naturalWidth) {
      const r = logo.getBoundingClientRect();
      o.drawImage(logo, r.left - rect.left, r.top - rect.top, r.width, r.height);
    }
    const name = brand.querySelector('.intro-name');
    if (name) {
      const style = getComputedStyle(name);
      const r = name.getBoundingClientRect();
      o.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if ('letterSpacing' in o) o.letterSpacing = style.letterSpacing;
      o.fillStyle = `rgb(${FG})`;
      o.textBaseline = 'middle';
      o.fillText(name.textContent.trim(), r.left - rect.left, r.top - rect.top + r.height / 2);
    }
    const data = o.getImageData(0, 0, bw, bh).data;
    const points = [];
    for (let y = 0; y < bh; y += 2) {
      for (let x = 0; x < bw; x += 2) {
        const i = (y * bw + x) * 4;
        if (data[i + 3] > 140) points.push({ x, y, accent: Math.random() < 0.12, nx: x / bw });
      }
    }
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }
    glyph = points;
    particles.forEach(assignGlyph);
  }

  function assignGlyph(p, i) {
    if (!glyph.length) return;
    const g = glyph[i % glyph.length];
    const extra = i >= glyph.length;
    p.gx = g.x + (extra ? Math.random() * 2 - 1 : 0);
    p.gy = g.y + (extra ? Math.random() * 2 - 1 : 0);
    p.accent = g.accent;
    p.thr = 0.04 + g.nx * 0.6 + Math.random() * 0.12;
    if (dissolve < p.thr) {
      p.settled = true;
      p.x = brandPos.x + p.gx - center.x;
      p.y = brandPos.y + p.gy - center.y;
      p.z = 0;
    }
  }

  function makeParticle() {
    return {
      x: (Math.random() * 2 - 1) * boxX, y: (Math.random() * 2 - 1) * boxY, z: (Math.random() * 2 - 1) * boxZ,
      vx: 0, vy: 0, vz: 0,
      delay: Math.random() * 1100,
      jx: (Math.random() - 0.5) * 2, jy: (Math.random() - 0.5) * 2,
      // espessura do disco do vortice
      jz: Math.random() * 2 - 1,
      accent: Math.random() < 0.12,
      gx: 0, gy: 0, thr: 0, settled: false,
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    if (!w || !h) return;
    const artSize = Math.min(art.clientWidth, art.clientHeight) || Math.min(w, h) * 0.6;
    scale = artSize / 480;
    focal = artSize * 1.25;
    // o caos se espalha bem alem da area do hero
    boxX = Math.min(w * 0.48, art.clientWidth * 1.1);
    boxY = Math.min(h * 0.45, art.clientHeight * 0.85);
    boxZ = artSize * 0.5;
    cube = artSize * 0.3;
    vortexR = artSize * 0.48;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(clamp((w * h) / 800, 500, 1500));
    while (particles.length < count) particles.push(makeParticle());
    particles.length = count;
    readLayout();
    buildGlyph();
    if (reduceMotion) placeStatic();
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

  function update(now, f) {
    const phase = PHASES[phaseIndex];
    const elapsed = now - phaseStart;
    const flow = 0.05 * scale * f;
    const jitter = 0.08 * scale;
    const t1 = now * 0.0007, t2 = now * 0.00053, t3 = now * 0.00041;
    particles.forEach((p, i) => {
      // ainda faz parte da marca: volta (ou fica) no seu ponto do logo/nome
      if (glyph.length && dissolve < p.thr) {
        const tx = brandPos.x + p.gx - center.x, ty = brandPos.y + p.gy - center.y;
        if (p.settled) {
          p.x = tx; p.y = ty; p.z = 0;
          p.vx = 0; p.vy = 0; p.vz = 0;
          return;
        }
        p.vx = (p.vx + (tx - p.x) * 0.08 * f) * Math.pow(0.75, f);
        p.vy = (p.vy + (ty - p.y) * 0.08 * f) * Math.pow(0.75, f);
        p.vz = (p.vz - p.z * 0.08 * f) * Math.pow(0.75, f);
        p.x += p.vx * f; p.y += p.vy * f; p.z += p.vz * f;
        if (Math.abs(tx - p.x) + Math.abs(ty - p.y) + Math.abs(p.z) < 2) p.settled = true;
        return;
      }
      if (p.settled) {
        // acabou de se soltar da marca: sai como poeira levada pelo vento
        p.settled = false;
        p.vx = (1 + Math.random() * 3) * scale;
        p.vy = (Math.random() - 0.6) * 2 * scale;
        p.vz = (Math.random() - 0.5) * 3 * scale;
      }
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
      if (phase.name === 'chaos' || (phase.name === 'form' && !inForm)) {
        // sem parede: fora do elipsoide, uma forca suave traz a particula de volta
        const q = (p.x / boxX) ** 2 + (p.y / boxY) ** 2 + (p.z / boxZ) ** 2;
        if (q > 1) {
          const pull = Math.min(q - 1, 3) * 0.004 * f;
          p.vx -= p.x * pull; p.vy -= p.y * pull; p.vz -= p.z * pull;
        }
      }
      const damp = Math.pow(drag, f);
      p.vx *= damp; p.vy *= damp; p.vz *= damp;
      p.x += p.vx * f; p.y += p.vy * f; p.z += p.vz * f;
    });
  }

  function updateCamera(now, f) {
    // enquanto a marca se desfaz a camera fica de frente, para as particulas nascerem em cima das letras
    const targetYaw = (Math.sin(now * 0.00025) * 0.7 * (1 - vortexMix * 0.5) + pointer.nx * 0.5) * sceneK;
    const targetPitch = (Math.sin(now * 0.00017) * 0.22 - 0.1 - pointer.ny * 0.35) * sceneK;
    const ease = 1 - Math.pow(0.95, f);
    setCamera(cam.yaw + (targetYaw - cam.yaw) * ease, cam.pitch + (targetPitch - cam.pitch) * ease);
  }

  function drawCube() {
    const alpha = 0.14 * (1 - vortexMix) * sceneK;
    if (alpha < 0.005) return;
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
    ctx.strokeStyle = `rgba(${FG}, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function mixColor(from, to) {
    return from.map((c, k) => Math.round(c + (to[k] - c) * vortexMix)).join(', ');
  }

  function drawParticles() {
    // cores por grupo: branco/cinza no caos, escala de cinzas no vortice
    const colors = [
      ...VORTEX.map((c) => mixColor(FG_RGB, c)),
      ...VORTEX.map((c) => mixColor(GRAY_RGB, c)),
    ];
    const paths = LAYERS.map(() => colors.map(() => new Path2D()));
    const zRange = boxZ * 2;
    const tailK = 2.4 + vortexMix * 7;
    const shards = vortexMix > 0.35;
    particles.forEach((p) => {
      if (p.settled) {
        p.px = -1e4;
        return;
      }
      const tailX = p.x - p.vx * tailK, tailY = p.y - p.vy * tailK, tailZ = p.z - p.vz * tailK;
      const head = project(p.x, p.y, p.z);
      const hx = head.x, hy = head.y, s = head.s, z = head.z;
      p.px = hx; p.py = hy;
      if (hx < -40 || hx > w + 40 || hy < -40 || hy > h + 40) return;
      const layer = LAYERS.length - 1 - Math.max(0, Math.min(LAYERS.length - 1, Math.floor(((z + boxZ) / zRange) * LAYERS.length)));
      const path = paths[layer][p.hue + (p.accent ? VORTEX.length : 0)];
      const tail = project(tailX, tailY, tailZ);
      const dx = hx - tail.x, dy = hy - tail.y;
      if (shards && p.shard) {
        // estilhaco: cunha triangular apontando na direcao do movimento
        const speed = Math.hypot(dx, dy);
        const ux = speed > 0.5 ? dx / speed : -Math.sin(p.va);
        const uy = speed > 0.5 ? dy / speed : Math.cos(p.va);
        const len = Math.min(Math.max(speed, 5 * s), 16 * s);
        const half = len * (0.1 + Math.abs(p.jx) * 0.16);
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

  // halo claro e discreto atras do vortice
  function drawBackdrop() {
    if (vortexMix < 0.01) return;
    const r = vortexR * 1.4;
    const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, r);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.07 * vortexMix})`);
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(center.x - r, center.y - r, r * 2, r * 2);
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
      ctx.arc(center.x, center.y, 8 + k * Math.max(w, h) * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${FG}, ${(1 - k) * 0.55})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (phase.name === 'collapse') {
      const k = elapsed / phase.duration;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 2 + k * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${FG})`;
      ctx.fill();
    }
    drawParticles();
  }

  // movimento reduzido: sem dissolver a marca, o vortice aparece parado no hero
  function placeStatic() {
    setCamera(0.25, -0.15);
    vortexMix = 1;
    particles.forEach((p, i) => {
      p.settled = false;
      p.thr = 0;
      if (i % 10 < 7) {
        const t = targetFor(i, 0);
        p.x = t.x; p.y = t.y; p.z = t.z;
      }
      p.vx = 0; p.vy = 0; p.vz = 0;
    });
    if (phaseLabel) phaseLabel.textContent = 'ORDEM LOCAL / FORMA';
    drawStatic();
  }

  function drawStatic() {
    readLayout();
    const artRect = art.getBoundingClientRect();
    center.x = artRect.left + artRect.width / 2;
    center.y = artRect.top + artRect.height / 2;
    brand.style.opacity = '';
    brand.style.setProperty('--cut', '-20%');
    sceneK = 1;
    ctx.clearRect(0, 0, w, h);
    drawBackdrop();
    drawParticles();
  }

  function tick(now) {
    if (!running) return;
    const f = Math.min((now - lastTime) / 16.67, 3);
    lastTime = now;
    readLayout();
    if (dissolve < 0.98 || attachK < 0.9) {
      // o ciclo so comeca quando a marca terminou de se desfazer e o hero chegou; ate la, caos livre
      if (phaseIndex !== 1) enterPhase(1, now);
      phaseStart = now;
    } else if (now - phaseStart > PHASES[phaseIndex].duration) {
      enterPhase(phaseIndex + 1, now);
    }
    const mixTarget = PHASES[phaseIndex].name === 'form' ? 1 : 0;
    vortexMix += (mixTarget - vortexMix) * (1 - Math.pow(0.96, f));
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
      if (!setRunning.pausedAt) enterPhase(1, lastTime);
      else phaseStart += lastTime - setRunning.pausedAt;
      frame = requestAnimationFrame(tick);
    } else {
      setRunning.pausedAt = performance.now();
      cancelAnimationFrame(frame);
      canvas.style.opacity = '0';
    }
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  const rebuild = () => { readLayout(); buildGlyph(); };
  document.fonts?.ready.then(rebuild);
  brand.querySelector('.intro-logo')?.addEventListener('load', rebuild);

  if (reduceMotion) {
    window.addEventListener('scroll', drawStatic, { passive: true });
    return;
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleSections.add(entry.target);
      else visibleSections.delete(entry.target);
    });
    setRunning(visibleSections.size > 0 && !document.hidden);
  });
  sectionObserver.observe(intro);
  sectionObserver.observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(visibleSections.size > 0 && !document.hidden));

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.nx = (pointer.x - center.x) / w;
    pointer.ny = (pointer.y - center.y) / h;
    pointer.active = event.pointerType === 'mouse';
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
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
