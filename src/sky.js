import * as T from 'three';
// Céu dinâmico, no horário real de Brasília (America/Sao_Paulo, sem precisar saber o fuso do
// jogador): posição do sol e da lua, cor do céu/neblina ao longo do dia, e um campo de estrelas que
// aparece à noite. O sol e a lua são discos simples (MeshBasicMaterial, sem neblina) presos à volta
// do aluno, numa esfera grande, então sempre parecem estar "no céu" de qualquer ponto da cidade.
const RADIUS = 700;

function brasiliaHour() {
 const fmt = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
 const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
 return (+p.hour) + (+p.minute) / 60 + (+p.second) / 3600;
}

// Estações pelo calendário do hemisfério sul (Brasília): verão começa perto do ano-novo, não de julho.
export const SEASON_NAMES = ['Verão', 'Outono', 'Inverno', 'Primavera'];
function brasiliaDate() {
 const fmt = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit'});
 const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
 return +p.month * 100 + +p.day;
}
function seasonFor(monthDay) {
 if (monthDay >= 1221 || monthDay < 321) return 0; // Verão
 if (monthDay < 621) return 1; // Outono
 if (monthDay < 923) return 2; // Inverno
 return 3; // Primavera
}
// Tons de dia por estação: verão dourado/verde forte, outono alaranjado, inverno pálido/azulado,
// primavera viçosa — aplicados ao chão do hemisfério e como um leve tingimento do céu/neblina (o
// ciclo dia/noite continua mandando na cor; a estação só dá um sotaque).
const SEASON_GROUND = ['#6f8a4e', '#9c6a3c', '#6e7568', '#5fab5a'].map(c => new T.Color(c));
const SEASON_HEMI = [0xfff6e0, 0xffe9c2, 0xeaf0fb, 0xfbf6ff].map(c => new T.Color(c));
const SEASON_ACCENT = ['#ffcf7a', '#d98a3d', '#bcd3e8', '#ffd7ea'];
export const SEASON_LEAF = ['#467750', '#b5652c', '#5f6f5a', '#5fae5a'];
export const SEASON_LEAF2 = ['#5a9159', '#d98a3d', '#78867c', '#78cf78'];

function lerpColor(a, b, t) {
 return new T.Color(a).lerp(new T.Color(b), T.MathUtils.clamp(t, 0, 1));
}

/** Céu por altura do sol (elevation, -1..1): madrugada/noite, nascer/pôr, dia. */
function skyColor(elevation) {
 if (elevation > .2) return lerpColor('#b9d9e8', '#d9cdef', T.MathUtils.clamp((elevation - .2) / .3, 0, 1));
 if (elevation > -.15) return lerpColor('#2d2a52', '#f3a35c', T.MathUtils.clamp((elevation + .15) / .35, 0, 1));
 return lerpColor('#05050f', '#2d2a52', T.MathUtils.clamp((elevation + .4) / .25, 0, 1));
}

function starField() {
 const n = 1400, pos = new Float32Array(n * 3);
 for (let i = 0; i < n; i++) {
  const u = Math.random(), v = Math.random(), theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1);
  const r = RADIUS * .97;
  pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * .6 + r * .1; // mantém as estrelas na metade de cima
  pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
 }
 const geo = new T.BufferGeometry();
 geo.setAttribute('position', new T.BufferAttribute(pos, 3));
 const mat = new T.PointsMaterial({color: '#ffffff', size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false});
 const points = new T.Points(geo, mat);
 points.frustumCulled = false;
 return points;
}

function disc(color, size, emissive) {
 const mesh = new T.Mesh(new T.CircleGeometry(size, 24), new T.MeshBasicMaterial({color, transparent: true, fog: false, depthWrite: false}));
 mesh.frustumCulled = false;
 if (emissive) mesh.renderOrder = 10;
 return mesh;
}

export function createSky({scene, sun, hemisphere}) {
 const stars = starField();
 const sunDisc = disc('#fff3c4', 26), moonDisc = disc('#e6ecf5', 18);
 scene.add(stars, sunDisc, moonDisc);
 const sunBaseIntensity = sun.intensity, hemiBaseIntensity = hemisphere.intensity;
 const nightHemi = new T.Color(0x24345c), nightGround = new T.Color(0x11182c);
 let hour = brasiliaHour(), season = seasonFor(brasiliaDate()), seasonOverride = null, lastSync = 0, override = null;
 function update(dt, player) {
  if (override !== null) hour = override;
  else {
   lastSync += dt;
   if (lastSync > 5) {lastSync = 0; hour = brasiliaHour(); if (seasonOverride === null) season = seasonFor(brasiliaDate());} else hour = (hour + dt / 3600) % 24;
  }
  if (seasonOverride !== null) season = seasonOverride;
  const theta = ((hour - 6) / 24) * Math.PI * 2;
  const sunDir = new T.Vector3(Math.cos(theta), Math.sin(theta), .42).normalize();
  const moonDir = sunDir.clone().multiplyScalar(-1);
  const elevation = sunDir.y, night = T.MathUtils.clamp(-elevation / .4, 0, 1);
  // Sol/lua visíveis: discos longe do aluno na direção certa; o DirectionalLight segue o aluno
  // (para a sombra ficar sempre perto), mas na mesma direção do sol de verdade.
  sunDisc.position.copy(player).addScaledVector(sunDir, RADIUS);
  sunDisc.lookAt(player);
  moonDisc.position.copy(player).addScaledVector(moonDir, RADIUS);
  moonDisc.lookAt(player);
  sunDisc.visible = sunDir.y > -.08;
  moonDisc.visible = moonDir.y > -.08;
  sun.position.copy(player).addScaledVector(sunDir, 40);
  sun.target.position.copy(player);
  sun.intensity = sunBaseIntensity * T.MathUtils.clamp(elevation / .3 + .15, .04, 1);
  sun.color.set(elevation < .15 ? lerpColor('#ffd9a0', '#ffffff', T.MathUtils.clamp(elevation / .15, 0, 1)) : '#ffffff');
  hemisphere.intensity = T.MathUtils.lerp(hemiBaseIntensity * .22, hemiBaseIntensity, 1 - night);
  hemisphere.color.copy(nightHemi).lerp(SEASON_HEMI[season], 1 - night);
  hemisphere.groundColor.copy(nightGround).lerp(SEASON_GROUND[season], 1 - night);
  const sky = skyColor(elevation).lerp(new T.Color(SEASON_ACCENT[season]), .14 * (1 - night));
  scene.background = sky;
  if (scene.fog) scene.fog.color.copy(sky);
  stars.material.opacity = night * .9;
  stars.position.copy(player);
 }
 update(0, new T.Vector3());
 return {update, get hour() {return hour;}, setHourOverride(h) {override = h;},
  get season() {return season;}, get seasonName() {return SEASON_NAMES[season];}, setSeasonOverride(s) {seasonOverride = s; if (s !== null) season = s;}};
}
