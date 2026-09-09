/**
 * Hero animation — the hierarchy, on a sphere.
 *
 * This is deliberately abstract. It shows what GRID *does* — take a place on
 * Earth and resolve it down through a hierarchy until a single address falls
 * out — without depicting any real location or implying we have mapped one.
 * A pre-launch page should not put fictional places in front of people who
 * will later be shown real ones.
 *
 * A region on the globe is outlined, subdivides, one child is chosen, and it
 * repeats. Then it releases and picks somewhere else.
 */
import * as THREE from './vendor/three.module.js';

const R = 1;                       // globe radius
const LEVELS = ['MACRO', 'MESO', 'MICRO'];
const DWELL = 1700;                // ms per level
const RELEASE = 2100;              // ms holding the finished address — this is
                                   // the payoff, so it holds longer than a step

const stage = document.getElementById('stage');
const label = document.getElementById('hero-label');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const css = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
};

/** lat/lon in degrees → a point on the sphere. */
function onSphere(lat, lon, r = R) {
  const p = (90 - lat) * Math.PI / 180;
  const t = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(p) * Math.cos(t),
    r * Math.cos(p),
    r * Math.sin(p) * Math.sin(t),
  );
}

/** A lat/lon rectangle drawn as a closed loop that follows the surface. */
function cellOutline(cell, colour, width = 1, lift = 1.004) {
  const { lat0, lat1, lon0, lon1 } = cell;
  const pts = [];
  const STEP = 10;
  for (let i = 0; i <= STEP; i++) pts.push(onSphere(lat0, lon0 + (lon1 - lon0) * i / STEP, lift));
  for (let i = 0; i <= STEP; i++) pts.push(onSphere(lat0 + (lat1 - lat0) * i / STEP, lon1, lift));
  for (let i = 0; i <= STEP; i++) pts.push(onSphere(lat1, lon1 - (lon1 - lon0) * i / STEP, lift));
  for (let i = 0; i <= STEP; i++) pts.push(onSphere(lat1 - (lat1 - lat0) * i / STEP, lon0, lift));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g, new THREE.LineBasicMaterial({
    color: colour, transparent: true, opacity: 0.9, linewidth: width,
  }));
}

const quarters = ({ lat0, lat1, lon0, lon1 }) => {
  const mLat = (lat0 + lat1) / 2, mLon = (lon0 + lon1) / 2;
  return [
    { lat0, lat1: mLat, lon0, lon1: mLon },
    { lat0, lat1: mLat, lon0: mLon, lon1 },
    { lat0: mLat, lat1, lon0, lon1: mLon },
    { lat0: mLat, lat1, lon0: mLon, lon1 },
  ];
};

/** Points scattered evenly over the sphere — the globe itself. */
function globePoints(n, colour) {
  const pos = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    pos[i * 3] = Math.cos(th) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(th) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    color: colour, size: 0.0105, sizeAttenuation: true, transparent: true, opacity: 0.8,
  }));
}

/** Faint lat/lon graticule, so the sphere reads as a globe and not a ball. */
function graticule(colour) {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.34 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 5) pts.push(onSphere(lat, lon, 1.001));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = [];
    for (let lat = -85; lat <= 85; lat += 5) pts.push(onSphere(lat, lon, 1.001));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  return group;
}

/**
 * Atmospheric limb: a shell rendered back-faces-only with a rim falloff, so
 * the sphere has a defined edge. Without it the point cloud just dissolves
 * into the background and the globe reads as a smudge.
 */
function limb(colour) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(colour) } },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vN;
      varying vec3 vP;
      uniform vec3 uColor;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vN), normalize(-vP)));
        float a = pow(rim, 3.2) * 0.85;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 48), mat);
}

/** A filled patch on the sphere, for the cell currently selected. */
function cellFill(cell, colour, opacity = 0.20) {
  const { lat0, lat1, lon0, lon1 } = cell;
  const N = 8;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const v = onSphere(lat0 + (lat1 - lat0) * i / N, lon0 + (lon1 - lon0) * j / N, 1.002);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = i * (N + 1) + j;
      idx.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: colour, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false,
  }));
}

function boot() {
  if (!stage) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return;                                    // painted fallback stands
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // Close and low: the sphere fills the frame and bleeds off it, so it reads
  // as the subject of the page rather than an ornament parked in a corner.
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.34, 2.85);
  camera.lookAt(0, -0.02, 0);

  const world = new THREE.Group();
  scene.add(world);

  let dim = css('--globe-dim', '#4b6570');
  let hot = css('--globe-hot', '#e8763f');
  let mid = css('--globe-mid', '#4fb3bf');

  world.add(globePoints(5200, dim));
  world.add(graticule(dim));
  world.add(limb(mid));

  // the globe sits right of centre so the headline has clear ground
  world.position.x = 0.52;

  const cells = new THREE.Group();
  world.add(cells);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  // ---- the drill-down sequence ------------------------------------------
  let cell = null;
  let depth = 0;
  let nextAt = 0;
  let code = [];

  const randomRegion = () => {
    // land-ish latitudes, so the sequence tends to happen where people are
    const lat0 = -28 + Math.random() * 52;
    const lon0 = -180 + Math.random() * 360;
    return { lat0, lat1: lat0 + 34, lon0, lon1: lon0 + 34 };
  };

  const codeFor = (i) => String.fromCharCode(65 + Math.floor(Math.random() * 26))
    + (10 + Math.floor(Math.random() * 89));

  function reset(now) {
    cells.clear();
    cell = randomRegion();
    depth = 0;
    code = [codeFor(0)];
    cells.add(cellFill(cell, hot, 0.14));
    cells.add(cellOutline(cell, hot, 2));
    // face the chosen region towards the camera
    const c = onSphere((cell.lat0 + cell.lat1) / 2, (cell.lon0 + cell.lon1) / 2);
    // The sphere is offset right of centre, so facing the camera squarely puts
    // the region on the limb. Bias it back towards the visible face.
    targetYaw = Math.atan2(c.x, c.z) + 0.62;
    nextAt = now + DWELL;
    paint();
  }

  function descend(now) {
    const kids = quarters(cell);
    const pick = kids[Math.floor(Math.random() * 4)];
    for (const k of kids) {
      if (k !== pick) cells.add(cellOutline(k, mid, 1));
    }
    cell = pick;
    depth += 1;
    code.push(codeFor(depth));
    cells.add(cellFill(cell, hot, depth >= LEVELS.length - 1 ? 0.5 : 0.2));
    cells.add(cellOutline(cell, hot, 2));
    nextAt = now + (depth >= LEVELS.length - 1 ? RELEASE : DWELL);
    paint();
  }

  function paint() {
    if (!label) return;
    label.innerHTML =
      `<span class="lvl">${LEVELS[Math.min(depth, LEVELS.length - 1)]}</span>` +
      `<span class="code">${code.join('·')}</span>`;
  }

  let targetYaw = 0;
  let yaw = 0;

  if (still) {
    reset(0);
    descend(0);
    descend(0);
    yaw = targetYaw;
    world.rotation.y = -yaw;
    renderer.render(scene, camera);
    return;
  }

  renderer.setAnimationLoop((now) => {
    if (!cell || now > nextAt) {
      if (!cell || depth >= LEVELS.length - 1) reset(now);
      else descend(now);
    }
    // ease towards the active region, with a slow drift underneath
    yaw += (targetYaw - yaw) * 0.025;
    world.rotation.y = -yaw + now * 0.00003;
    world.rotation.x = 0.30;
    renderer.render(scene, camera);
  });
}

boot();
