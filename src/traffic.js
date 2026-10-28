import * as T from 'three';
// Seis rotas, usando pares de eixos da malha viária (ROAD_AXES): quadrado interno e externo (cada um
// nos dois sentidos) e dois retângulos "mistos" que cobrem outras partes do mapa — para não ficar só
// em dois laços concêntricos. Metade das rotas anda no sentido horário, metade no anti-horário.
const AXES = [-100, -48, 48, 100];
const LANE = 2.3, CAR_LENGTH = 3.3;
const axisIndex = v => AXES.indexOf(v);

/** Retângulo entre xLo/xHi e zLo/zHi, com uma rota por fora (reverse=false, horário) ou por dentro
 * (reverse=true, anti-horário — a faixa certa (mão direita) fica do lado oposto quando se inverte o
 * sentido das curvas). Devolve a curva e, para cada canto, o par de eixos reais que ele representa
 * (para o sinal de trânsito ser o mesmo não importa qual rota passa por aquele cruzamento).
 */
function makeRoute(xLo, xHi, zLo, zHi, reverse = false) {
 const cx = (xLo + xHi) / 2, cz = (zLo + zHi) / 2, sign = reverse ? -1 : 1;
 let corners = [[xLo, zLo], [xHi, zLo], [xHi, zHi], [xLo, zHi]];
 if (reverse) corners = [corners[0], corners[3], corners[2], corners[1]];
 const offset = ([x, z]) => new T.Vector3(x + Math.sign(x - cx || 1) * LANE * sign, 0, z + Math.sign(z - cz || 1) * LANE * sign);
 const points = corners.map(offset), path = new T.CurvePath(), r = 5;
 for (let i = 0; i < 4; i++) {
  const a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4], d = b.clone().sub(a).normalize(), next = c.clone().sub(b).normalize();
  path.add(new T.LineCurve3(a.clone().addScaledVector(d, r), b.clone().addScaledVector(d, -r)));
  path.add(new T.QuadraticBezierCurve3(b.clone().addScaledVector(d, -r), b, b.clone().addScaledVector(next, r)));
 }
 const intersections = corners.map(([x, z]) => axisIndex(x) + ',' + axisIndex(z));
 return {path, intersections};
}
const ROUTES = [
 makeRoute(-48, 48, -48, 48, false), // quadrado interno, horário
 makeRoute(-48, 48, -48, 48, true), // quadrado interno, anti-horário
 makeRoute(-100, 100, -100, 100, false), // quadrado externo, horário
 makeRoute(-100, 100, -100, 100, true), // quadrado externo, anti-horário
 makeRoute(-100, 48, -100, 48, false), // retângulo a sudoeste, horário
 makeRoute(-48, 100, -48, 100, true), // retângulo a nordeste, anti-horário
];
// Sinal de trânsito: cada cruzamento real (16 ao todo, nos mesmos pontos dos postes decorativos de
// city-world.js) entra num grupo em xadrez — metade abre enquanto a outra fecha, trocando com o
// tempo. Funciona igual para qualquer rota que passe por ali, então nunca fica contraditório.
const LIGHT_PERIOD = 12, LIGHT_STOP = 6.5;
const group = key => {const [i, j] = key.split(',').map(Number); return (i + j) % 2;};
const lightRed = (key, time) => (group(key) === 0) === ((time % LIGHT_PERIOD) < LIGHT_PERIOD / 2);

function buildSignals(scene) {
 const group3d = new T.Group(); group3d.name = 'Semáforos'; group3d.userData.noCameraCollision = true; scene.add(group3d);
 const lamps = [];
 for (let i = 0; i < AXES.length; i++) for (let j = 0; j < AXES.length; j++) {
  const x = AXES[i] + 6, z = AXES[j] + 6;
  const lamp = new T.Mesh(new T.SphereGeometry(.22, 10, 8), new T.MeshStandardMaterial({color: '#2fa36b', emissive: '#2fa36b', emissiveIntensity: 1.1}));
  lamp.position.set(x, 3.3, z); group3d.add(lamp);
  lamps.push({lamp, key: i + ',' + j});
 }
 return {update(time) {for (const {lamp, key} of lamps) {const red = lightRed(key, time); lamp.material.color.set(red ? '#e2574c' : '#2fa36b'); lamp.material.emissive.set(red ? '#e2574c' : '#2fa36b');}}};
}

// A rotação da rota usa yaw=atan2(-tangente.x,-tangente.z): sem nenhuma rotação própria, o modelo
// precisa estar de frente para -Z. As rodas do pacote de carros se chamam "wheel_front_*"/
// "wheel_rear_*", então a frente de verdade é descoberta por elas em vez de um ângulo fixo — um
// ângulo fixo (90°) foi o que fazia os carros andarem de lado, pois somava com o yaw da rota.
function alignForward(model) {
 let front = null, rear = null;
 model.traverse(o => {if (!front && /wheel_front/.test(o.name)) front = o; if (!rear && /wheel_rear/.test(o.name)) rear = o;});
 if (!front || !rear) return false;
 const dx = front.position.x - rear.position.x, dz = front.position.z - rear.position.z;
 model.rotation.y = Math.atan2(-dx, -dz);
 return true;
}
// Escala (se length>0), centraliza em x/z e apoia no chão (min.y=0) — depois de girar, então a
// caixa usada para centralizar já reflete a frente correta.
function fitVehicle(original, length) {
 original.updateMatrixWorld(true);
 const box = new T.Box3().setFromObject(original), size = box.getSize(new T.Vector3());
 if (length) original.scale.multiplyScalar(length / Math.max(size.x, size.z));
 original.updateMatrixWorld(true);
 const fitted = new T.Box3().setFromObject(original), center = fitted.getCenter(new T.Vector3());
 original.position.set(-center.x, -fitted.min.y, -center.z);
 original.traverse(o => {if (o.isMesh) o.castShadow = true;});
}
// Cada entrada é {bus, routeIndex, count}: quantos veículos daquele tipo começam espalhados por igual
// naquela rota. Carros em 4 das 6 rotas (metade horária, metade anti-horária); ônibus nas duas rotas
// do laço externo (nos dois sentidos), como uma linha circular de verdade.
const PLAN = [
 {bus: false, route: 0, count: 3}, {bus: false, route: 1, count: 3},
 {bus: false, route: 4, count: 4}, {bus: false, route: 5, count: 3},
 {bus: true, route: 2, count: 3}, {bus: true, route: 3, count: 2},
];
export async function createTraffic({scene, loader}) {
 const [file, busFile] = await Promise.all([loader.loadAsync('/models/vila-pack.glb'), loader.loadAsync('/models/props/onibus.glb')]);
 const group = new T.Group(); group.name = 'Trânsito'; group.userData.noCameraCollision = true; scene.add(group);
 const signals = buildSignals(scene);
 const vehicles = []; let serial = 0;
 for (const {bus, route: routeIdx, count} of PLAN) {
  const {path: route, intersections} = ROUTES[routeIdx], length = route.getLength();
  for (let slot = 0; slot < count; slot++, serial++) {
   const original = bus ? busFile.scene.clone(true) : file.scene.getObjectByName('M_' + ['car_hatchback', 'car_sedan', 'car_taxi', 'car_stationwagon'][serial % 4]).clone(true);
   if (!bus) alignForward(original); // o ônibus já foi modelado de frente para -Z (ver tools/build_city_props.py).
   fitVehicle(original, bus ? 0 : CAR_LENGTH);
   const root = new T.Group(); root.add(original); group.add(root);
   vehicles.push({root, bus, route, intersections, length, distance: length * slot / count, speed: bus ? 7 : 9 + serial % 3, wait: 0, lastStop: -1});
  }
 }
 let time = 0;
 return {
  group, update(dt, player, paused = false) {
  if (paused) return; time += dt; signals.update(time);
  for (const v of vehicles) {
   const t = (v.distance % v.length) / v.length, p = v.route.getPointAt(t), tangent = v.route.getTangentAt(t), dx = player.x - p.x, dz = player.z - p.z;
   const pedestrian = Math.abs(dx * tangent.z - dz * tangent.x) < 2.1 && dx * tangent.x + dz * tangent.z > 0 && dx * tangent.x + dz * tangent.z < 7;
   const leader = vehicles.some(o => o !== v && o.route === v.route && (o.distance - v.distance + v.length) % v.length < (v.bus ? 11 : 6));
   const corner = Math.floor(t * 4), distToCorner = (1 - (t * 4 - corner)) / 4 * v.length, nextCorner = (corner + 1) % 4;
   const redLight = distToCorner < LIGHT_STOP && lightRed(v.intersections[nextCorner], time);
   const lap = Math.floor(v.distance / v.length), stopId = lap * 4 + corner;
   if (v.bus && Math.abs(p.z + 100 + LANE) < 1 && Math.abs(p.x - 14) < 1 && v.lastStop !== stopId) {v.wait = 3; v.lastStop = stopId;}
   v.wait = Math.max(0, v.wait - dt); v.stoppedAtLight = redLight && !pedestrian && !leader && v.wait === 0;
   if (!pedestrian && !leader && !redLight && v.wait === 0) v.distance += v.speed * dt;
   v.root.position.set(p.x, .12, p.z); v.root.rotation.y = Math.atan2(-tangent.x, -tangent.z);
  }
 }, snapshot() {return vehicles.map(v => ({bus: v.bus, x: v.root.position.x, z: v.root.position.z, distance: v.distance, waiting: v.wait > 0, stoppedAtLight: !!v.stoppedAtLight}));}};
}
