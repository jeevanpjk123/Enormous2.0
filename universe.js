// universe.js — Enormous2.0 Universe Page
(function() {
  const canvas = document.getElementById('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 500000);
  camera.position.set(0, 500, 2000);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.03;
  controls.minDistance = 5;
  controls.maxDistance = 200000;
  controls.zoomSpeed = 1.5;

  // === BACKGROUND STARS ===
  const bgCount = 15000;
  const bgGeo = new THREE.BufferGeometry();
  const bgPos = new Float32Array(bgCount * 3);
  const bgCol = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    const r = 80000 + Math.random() * 20000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    bgPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    bgPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    bgPos[i*3+2] = r * Math.cos(phi);
    bgCol[i*3] = 0.6 + Math.random() * 0.4;
    bgCol[i*3+1] = 0.6 + Math.random() * 0.4;
    bgCol[i*3+2] = 0.8 + Math.random() * 0.2;
  }
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
  bgGeo.setAttribute('color', new THREE.BufferAttribute(bgCol, 3));
  scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({
    size: 3, vertexColors: true, sizeAttenuation: false, transparent: true, opacity: 0.7
  })));

  // === GALAXY DATA ===
  const galaxyDefs = [
    { name: 'Vortex Nebulae Cluster',     type: 'spiral',     pos: [0, 0, 0],           scale: 1.0, color1: '#00d4ff', color2: '#7b2fff', arms: 4 },
    { name: 'NGC-Enormous 77',            type: 'elliptical',  pos: [3000, 200, -1000],   scale: 0.7, color1: '#ffd700', color2: '#ff9422' },
    { name: 'Crimson Spiral',             type: 'spiral',     pos: [-2500, -300, 500],   scale: 0.85, color1: '#ff4466', color2: '#ff8844', arms: 2 },
    { name: 'The Azure Web',              type: 'spiral',     pos: [1500, 800, -2000],   scale: 0.6, color1: '#44aaff', color2: '#00d4ff', arms: 3 },
    { name: 'Golden Ellipse Majora',      type: 'elliptical',  pos: [-1800, 600, -3000],  scale: 0.9, color1: '#ffe066', color2: '#c8a840' },
    { name: 'Phantom Irregular IX',       type: 'irregular',  pos: [4000, -500, 1500],   scale: 0.5, color1: '#cc44ff', color2: '#7b2fff' },
    { name: 'Lenticular Crown',           type: 'lenticular', pos: [-3500, 400, -500],   scale: 0.75, color1: '#aaddff', color2: '#6699cc' },
    { name: 'Nebula Strix Prime',         type: 'spiral',     pos: [2000, -1000, 3000],  scale: 0.65, color1: '#ff66aa', color2: '#7b2fff', arms: 5 },
    { name: 'The Obsidian Filament',      type: 'irregular',  pos: [-500, 1500, -4000],  scale: 1.1, color1: '#334499', color2: '#00d4ff' },
    { name: 'Aurelius Drift',             type: 'elliptical',  pos: [5000, 300, -2500],   scale: 0.55, color1: '#ffcc44', color2: '#ff8822' },
    { name: 'Cyan Meridian',              type: 'spiral',     pos: [-4000, -800, -1500], scale: 0.8, color1: '#00ffcc', color2: '#0088ff', arms: 3 },
    { name: 'Deep Scarlet Cluster',       type: 'irregular',  pos: [1200, 2000, 2500],   scale: 0.6, color1: '#ff2244', color2: '#ff6644' },
    { name: 'Pale Lenticular III',        type: 'lenticular', pos: [-2000, -1500, 2000], scale: 0.7, color1: '#ddccff', color2: '#aa88ff' },
    { name: 'Spectra Vortex',             type: 'spiral',     pos: [3500, 1200, 800],    scale: 0.9, color1: '#ff44ff', color2: '#8844ff', arms: 4 },
    { name: 'The Verdant Arm',            type: 'spiral',     pos: [-600, -2000, -2500], scale: 0.7, color1: '#44ff88', color2: '#00aaff', arms: 2 },
    { name: 'Amber Shore',                type: 'elliptical',  pos: [800, 3000, -800],    scale: 0.5, color1: '#ffaa44', color2: '#ff6622' },
    { name: 'Indigo Filament-7',          type: 'irregular',  pos: [-4500, 500, 3500],   scale: 0.85, color1: '#4466ff', color2: '#2233cc' },
    { name: 'Celestia Omega',             type: 'spiral',     pos: [6000, -300, -400],   scale: 1.2, color1: '#ffffff', color2: '#88ccff', arms: 6 },
  ];

  const galaxies = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const galaxyCenters = []; // for raycasting

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    return { r, g, b };
  }

  function createSpiralGalaxy(def) {
    const count = 80000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = hexToRgb(def.color1);
    const c2 = hexToRgb(def.color2);
    const arms = def.arms || 3;
    const radius = 800 * def.scale;
    const spin = 1.5;
    const randomness = 0.3;
    const randomPow = 3;

    for (let i = 0; i < count; i++) {
      const r = Math.random() * radius;
      const arm = (i % arms) / arms * Math.PI * 2;
      const spinAngle = r * spin / radius * Math.PI * 2;
      const angle = arm + spinAngle;

      const rx = Math.pow(Math.random(), randomPow) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
      const ry = Math.pow(Math.random(), randomPow) * (Math.random() < 0.5 ? 1 : -1) * randomness * r * 0.15;
      const rz = Math.pow(Math.random(), randomPow) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

      pos[i*3]   = Math.cos(angle) * r + rx;
      pos[i*3+1] = ry;
      pos[i*3+2] = Math.sin(angle) * r + rz;

      // Mix colors based on distance
      const mix = r / radius;
      const bright = 1 - mix * 0.5;
      col[i*3]   = (c1.r * (1-mix) + c2.r * mix) * bright;
      col[i*3+1] = (c1.g * (1-mix) + c2.g * mix) * bright;
      col[i*3+2] = (c1.b * (1-mix) + c2.b * mix) * bright;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, rotSpeed: { value: 0.00008 + Math.random() * 0.00005 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float rotSpeed;
        void main() {
          vColor = color;
          float angle = atan(position.z, position.x);
          float r = length(vec2(position.x, position.z));
          float newAngle = angle + time * rotSpeed * (800.0 / (r + 50.0));
          vec3 p = vec3(cos(newAngle) * r, position.y, sin(newAngle) * r);
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = max(0.5, 1.5 * (1.0 - r/800.0) + 0.5) * (400.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * 0.9;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return { geo, mat };
  }

  function createEllipticalGalaxy(def) {
    const count = 60000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = hexToRgb(def.color1);
    const c2 = hexToRgb(def.color2);
    const radius = 600 * def.scale;

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.5) * radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      pos[i*3+2] = r * Math.cos(phi);

      const mix = r / radius;
      const bright = 1.2 - mix * 0.6;
      col[i*3]   = (c1.r * (1-mix) + c2.r * mix) * bright;
      col[i*3+1] = (c1.g * (1-mix) + c2.g * mix) * bright;
      col[i*3+2] = (c1.b * (1-mix) + c2.b * mix) * bright;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, rotSpeed: { value: 0.00003 + Math.random() * 0.00002 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float rotSpeed;
        void main() {
          vColor = color;
          float cosA = cos(time * rotSpeed);
          float sinA = sin(time * rotSpeed);
          vec3 p = vec3(position.x * cosA - position.z * sinA, position.y, position.x * sinA + position.z * cosA);
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = max(0.5, 1.2) * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * 0.85;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return { geo, mat };
  }

  function createIrregularGalaxy(def) {
    const count = 50000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = hexToRgb(def.color1);
    const c2 = hexToRgb(def.color2);
    const radius = 500 * def.scale;

    for (let i = 0; i < count; i++) {
      const clump = Math.floor(Math.random() * 4);
      const offX = (clump % 2 - 0.5) * radius * 0.6;
      const offZ = (Math.floor(clump / 2) - 0.5) * radius * 0.6;
      const r = Math.random() * radius * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      pos[i*3]   = offX + r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.3;
      pos[i*3+2] = offZ + r * Math.cos(phi);

      const mix = Math.random();
      col[i*3]   = c1.r * mix + c2.r * (1-mix);
      col[i*3+1] = c1.g * mix + c2.g * (1-mix);
      col[i*3+2] = c1.b * mix + c2.b * (1-mix);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, rotSpeed: { value: 0.00005 + Math.random() * 0.00004 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float rotSpeed;
        void main() {
          vColor = color;
          float cosA = cos(time * rotSpeed);
          float sinA = sin(time * rotSpeed);
          vec3 p = vec3(position.x * cosA - position.z * sinA, position.y, position.x * sinA + position.z * cosA);
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 1.0 * (350.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * 0.8;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return { geo, mat };
  }

  function createLenticularGalaxy(def) {
    const count = 55000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = hexToRgb(def.color1);
    const c2 = hexToRgb(def.color2);
    const radius = 650 * def.scale;

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.3) * radius;
      const theta = Math.random() * Math.PI * 2;
      const thickness = (1 - r/radius) * 0.12 + 0.02;
      pos[i*3]   = Math.cos(theta) * r;
      pos[i*3+1] = (Math.random() - 0.5) * r * thickness;
      pos[i*3+2] = Math.sin(theta) * r;

      const mix = r / radius;
      col[i*3]   = c1.r * (1-mix) + c2.r * mix;
      col[i*3+1] = c1.g * (1-mix) + c2.g * mix;
      col[i*3+2] = c1.b * (1-mix) + c2.b * mix;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, rotSpeed: { value: 0.00004 + Math.random() * 0.00003 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float rotSpeed;
        void main() {
          vColor = color;
          float cosA = cos(time * rotSpeed);
          float sinA = sin(time * rotSpeed);
          vec3 p = vec3(position.x * cosA - position.z * sinA, position.y, position.x * sinA + position.z * cosA);
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 1.2 * (350.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * 0.85;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return { geo, mat };
  }

  // Create all galaxies
  galaxyDefs.forEach(def => {
    let result;
    if (def.type === 'spiral') result = createSpiralGalaxy(def);
    else if (def.type === 'elliptical') result = createEllipticalGalaxy(def);
    else if (def.type === 'irregular') result = createIrregularGalaxy(def);
    else result = createLenticularGalaxy(def);

    const pts = new THREE.Points(result.geo, result.mat);
    pts.position.set(...def.pos);
    pts.rotation.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );
    scene.add(pts);

    // Raycasting sphere (invisible)
    const hitGeo = new THREE.SphereGeometry(600 * def.scale, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(...def.pos);
    hitMesh.userData = { name: def.name, pos: new THREE.Vector3(...def.pos) };
    scene.add(hitMesh);
    galaxyCenters.push(hitMesh);

    galaxies.push({ pts, mat: result.mat, def });
  });

  // === COSMIC WEB FILAMENTS (visible at high zoom-out) ===
  const filaments = [];
  for (let i = 0; i < 30; i++) {
    const start = galaxyDefs[Math.floor(Math.random() * galaxyDefs.length)].pos;
    const end = galaxyDefs[Math.floor(Math.random() * galaxyDefs.length)].pos;
    const points = [];
    const segments = 6;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      points.push(new THREE.Vector3(
        start[0] * (1-t) + end[0] * t + (Math.random()-0.5)*500,
        start[1] * (1-t) + end[1] * t + (Math.random()-0.5)*200,
        start[2] * (1-t) + end[2] * t + (Math.random()-0.5)*500
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.12 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    filaments.push({ line, mat });
  }

  // === ZOOM SYSTEM ===
  const zoomSlider = document.getElementById('zoom-range');
  const zoomHud = document.getElementById('zoom-hud');
  let currentZoom = 1;

  // Camera positions per zoom level
  const ZOOM_1_DIST = 2000;   // inside galaxy
  const ZOOM_100_DIST = 80000; // cosmic scale

  function applyZoom(z) {
    currentZoom = z;
    zoomHud.textContent = `🔭 Zoom: ${Math.round(z)}x`;
    const dist = ZOOM_1_DIST + (ZOOM_100_DIST - ZOOM_1_DIST) * ((z - 1) / 99);

    // Filament visibility (only at high zoom)
    const filamentOpacity = Math.max(0, (z - 40) / 60) * 0.18;
    filaments.forEach(f => f.mat.opacity = filamentOpacity);

    // Smooth camera distance
    const dir = camera.position.clone().normalize();
    const target = dir.multiplyScalar(dist);
    gsap.to(camera.position, { x: target.x || 0, y: target.y || 0, z: dist, duration: 0.5, ease: 'power2.out' });
  }

  zoomSlider.addEventListener('input', () => {
    applyZoom(parseFloat(zoomSlider.value));
  });

  // Sync scroll with zoom
  renderer.domElement.addEventListener('wheel', () => {
    // update slider from camera distance
    const dist = camera.position.length();
    const z = 1 + Math.max(0, Math.min(99, (dist - ZOOM_1_DIST) / (ZOOM_100_DIST - ZOOM_1_DIST) * 99));
    zoomSlider.value = z;
    zoomHud.textContent = `🔭 Zoom: ${Math.round(z)}x`;

    const filamentOpacity = Math.max(0, (z - 40) / 60) * 0.18;
    filaments.forEach(f => f.mat.opacity = filamentOpacity);
  }, { passive: true });

  // === GALAXY TOOLTIP & CLICK ===
  const tooltip = document.getElementById('galaxy-tooltip');
  let hoveredGalaxy = null;

  renderer.domElement.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(galaxyCenters);

    if (intersects.length > 0) {
      const g = intersects[0].object;
      tooltip.textContent = g.userData.name;
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
      hoveredGalaxy = g;
      document.body.style.cursor = 'pointer';
    } else {
      tooltip.classList.remove('visible');
      hoveredGalaxy = null;
      document.body.style.cursor = 'crosshair';
    }
  });

  renderer.domElement.addEventListener('click', () => {
    if (!hoveredGalaxy) return;
    const target = hoveredGalaxy.userData.pos.clone();
    const offset = target.clone().add(new THREE.Vector3(800, 400, 800));

    gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.8, ease: 'power3.inOut' });
    gsap.to(camera.position, { x: offset.x, y: offset.y, z: offset.z, duration: 1.8, ease: 'power3.inOut',
      onComplete: () => {
        zoomSlider.value = 10;
        zoomHud.textContent = '🔭 Zoom: 10x';
      }
    });
  });

  // === ANIMATION ===
  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    frame++;
    const t = frame;

    galaxies.forEach(g => {
      g.mat.uniforms.time.value = t;
    });

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
