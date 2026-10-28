// Física pura do skate (sem Three.js): segue o relevo da pista (bowl, mini-rampa e quarter pipes),
// com gravidade puxando ladeira abaixo, impulso do aluno e salto (ollie) para vencer o "lip" das bordas.
// Mesma matemática do gerador Blender (tools/build_skatepark.py), para o relevo bater com o visual.
const G = 18, LIP = .18;           // gravidade do salto; altura de degrau que só se vence saltando
const ACCEL = 7, BRAKE = 11, DRAG = .55, MAX_SPEED = 13, TURN = 2.6;

/** Transição de um quarto de círculo: 0 em u=0 até h em u=w=√(r²-(r-h)²); h constante depois. */
function riser(u, r, h) {
  if (u <= 0) return 0;
  const w = Math.sqrt(Math.max(0, r * r - (r - h) * (r - h)));
  if (u >= w) return h;
  return r - Math.sqrt(Math.max(0, r * r - u * u));
}

/** Altura (relativa ao chão) do bowl afundado no ponto local (lx,lz); null se estiver fora dele. */
function bowlHeight(lx, lz) {
  const A = 5.2, Bh = 3.0, R = 1.35, PIT = 1.7, FLOOR = -PIT, BX = -11.0, BZ = -13.0;
  const dx = lx - BX, dz = lz - BZ;
  const theta = Math.atan2(dz, dx), c = Math.cos(theta), s = Math.sin(theta), n = 4;
  const rBase = Math.pow(Math.pow(Math.abs(c) / A, n) + Math.pow(Math.abs(s) / Bh, n), -1 / n);
  const off = Math.hypot(dx, dz) - rBase;
  if (off > R + .35) return null;
  if (off <= 0) return FLOOR;
  if (off < R) return FLOOR + riser(off, R, R);
  return 0; // já passou o lip: chão normal
}

/** Mini-rampa em U, centrada em (6, -18), comprida no eixo x, 7 m de largura em z. */
function miniHeight(lx, lz) {
  const H = 1.5, RM = 2.2, PLAT = 1.8, FLAT = 3.2, HALF_W = 3.5;
  if (Math.abs(lz + 18) > HALF_W) return null;
  const w = Math.sqrt(Math.max(0, RM * RM - (RM - H) * (RM - H))), length = 2 * (PLAT + w) + FLAT, u = lx - 6.0;
  if (u < 0 || u > length) return null;
  if (u <= PLAT) return H;
  if (u <= PLAT + w) return H - riser(PLAT + w - u, RM, H);
  if (u >= length - PLAT) return H;
  if (u >= length - PLAT - w) return H - riser(u - (length - PLAT - w), RM, H);
  return 0;
}

/** Quarter pipe único, subindo para -x a partir de x=-17.5, 4 m de largura em z. */
function quarterHeight(lx, lz, zc) {
  const RQ = 1.6, HQ = 1.2, HALF_W = 2.0;
  if (Math.abs(lz - zc) > HALF_W) return null;
  const u = -17.5 - lx;
  if (u < 0) return null;
  const w = Math.sqrt(Math.max(0, RQ * RQ - (RQ - HQ) * (RQ - HQ)));
  if (u > w + .9) return null;
  return riser(Math.min(u, w), RQ, HQ);
}

/** Spine: duas transições costas-com-costas, centro em (19.5, 16.5), 3,4 m de largura em z. */
function spineHeight(lx, lz) {
  const SPX = 19.5, SPZ = 16.5, SPR = 1.4, SPH = 1.0, HALF_W = 1.7;
  if (Math.abs(lz - SPZ) > HALF_W) return null;
  return riser(Math.abs(lx - SPX), SPR, SPH);
}

/** Altura do terreno (relativa ao chão, metros) no ponto local do skatepark (lx,lz). */
export function terrainHeight(lx, lz) {
  const b = bowlHeight(lx, lz); if (b !== null) return b;
  const m = miniHeight(lx, lz); if (m !== null) return m;
  for (const zc of [5, 12]) { const q = quarterHeight(lx, lz, zc); if (q !== null) return q; }
  const sp = spineHeight(lx, lz); if (sp !== null) return sp;
  return 0;
}

const EPS = .25;
function slope(lx, lz) {
  return {
    sx: (terrainHeight(lx + EPS, lz) - terrainHeight(lx - EPS, lz)) / (2 * EPS),
    sz: (terrainHeight(lx, lz + EPS) - terrainHeight(lx, lz - EPS)) / (2 * EPS),
  };
}

/** Skatista livre: posição local (lx,lz), altura, velocidade horizontal e estado de salto. */
export function createSkateRide(start = { x: 0, z: 0 }) {
  let x = start.x, z = start.z, yaw = 0, speed = 0, airborne = false, vy = 0, airH = 0, height = terrainHeight(x, z), onLip = false;
  function update(dt, input = {}) {
    const { forward = 0, turn = 0, jump = false } = input;
    yaw += turn * TURN * dt;
    if (forward > 0) speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
    else if (forward < 0) speed = Math.max(-MAX_SPEED * .5, speed - BRAKE * dt);
    else speed *= Math.max(0, 1 - DRAG * dt);
    if (!airborne) {
      const { sx, sz } = slope(x, z), downhill = sx * Math.sin(yaw) + sz * Math.cos(yaw);
      speed = Math.max(-MAX_SPEED * .5, Math.min(MAX_SPEED, speed - downhill * G * .09));
    }
    const dx = Math.sin(yaw) * speed * dt, dz = Math.cos(yaw) * speed * dt;
    const nx = x + dx, nz = z + dz, curH = terrainHeight(x, z), nextH = terrainHeight(nx, nz);
    onLip = !airborne && nextH - curH > LIP;
    if (onLip && !jump) { speed *= .25; }
    else { x = nx; z = nz; }
    if (!airborne && jump) { airborne = true; vy = 6.4; airH = 0; }
    if (airborne) {
      vy -= G * dt; airH += vy * dt;
      if (airH <= 0) { airborne = false; airH = 0; vy = 0; }
    }
    height = terrainHeight(x, z) + (airborne ? airH : 0);
    return { x, z, yaw, height, speed, airborne, onLip };
  }
  return { update, get state() { return { x, z, yaw, height, speed, airborne, onLip }; } };
}

export { terrainHeight as _terrainHeight };
