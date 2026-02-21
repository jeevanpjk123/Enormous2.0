// solar_system.js — Enormous2.0
(function() {
  const canvas = document.getElementById('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
 
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
 
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
  camera.position.set(0, 120, 380);
 
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 20;
  controls.maxDistance = 3000;
 
  // === STAR BACKGROUND ===
  const bgStarGeo = new THREE.BufferGeometry();
  const bgStarCount = 8000;
  const bgStarPos = new Float32Array(bgStarCount * 3);
  const bgStarCol = new Float32Array(bgStarCount * 3);
  for (let i = 0; i < bgStarCount; i++) {
    const r = 8000 + Math.random() * 2000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    bgStarPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    bgStarPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    bgStarPos[i*3+2] = r * Math.cos(phi);
    const t = Math.random();
    bgStarCol[i*3] = 0.7 + t * 0.3;
    bgStarCol[i*3+1] = 0.7 + t * 0.3;
    bgStarCol[i*3+2] = 0.8 + t * 0.2;
  }
  bgStarGeo.setAttribute('position', new THREE.BufferAttribute(bgStarPos, 3));
  bgStarGeo.setAttribute('color', new THREE.BufferAttribute(bgStarCol, 3));
  const bgStarMat = new THREE.PointsMaterial({ size: 2, vertexColors: true, sizeAttenuation: false, transparent: true, opacity: 0.85 });
  scene.add(new THREE.Points(bgStarGeo, bgStarMat));
 
  // === SUN ===
  const sunGeo = new THREE.SphereGeometry(25, 64, 64);
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normal;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      uniform float time;
      
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                       mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                       mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      
      void main() {
        vec3 p = normalize(vPos);
        float n = noise(p * 3.0 + time * 0.3) * 0.5
                + noise(p * 7.0 - time * 0.5) * 0.3
                + noise(p * 15.0 + time * 0.2) * 0.2;
        
        vec3 col1 = vec3(1.0, 0.6, 0.1);
        vec3 col2 = vec3(1.0, 0.9, 0.3);
        vec3 col3 = vec3(1.0, 0.3, 0.05);
        
        vec3 color = mix(col1, col2, n);
        color = mix(color, col3, noise(p * 20.0 + time * 0.8) * 0.4);
        
        // Limb darkening
        float limb = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
        color *= 0.6 + 0.4 * abs(limb);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.FrontSide
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sun);
 
  // Sun glow
  const glowGeo = new THREE.SphereGeometry(32, 32, 32);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform float time;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        float pulse = 1.0 + 0.1 * sin(time * 2.0);
        vec3 glowColor = mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.85, 0.2), intensity);
        gl_FragColor = vec4(glowColor, intensity * 0.6 * pulse);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Mesh(glowGeo, glowMat));
 
  // Sun light
  const sunLight = new THREE.PointLight(0xfff5e0, 3, 0, 1.5);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x111133, 0.3));
 
  // === PLANETS DATA ===
  const planetData = [
    { name: 'Mercury', radius: 2.4,   orbit: 55,   speed: 4.15,  color: 0x8a7a6a, tilt: 0.03,  moons: 0 },
    { name: 'Venus',   radius: 4.0,   orbit: 85,   speed: 1.62,  color: 0xe8c08a, tilt: 177.4, moons: 0 },
    { name: 'Earth',   radius: 4.2,   orbit: 120,  speed: 1.00,  color: 0x2a6ab0, tilt: 23.4,  moons: 1 },
    { name: 'Mars',    radius: 3.0,   orbit: 165,  speed: 0.53,  color: 0xc1440e, tilt: 25.2,  moons: 0 },
    { name: 'Jupiter', radius: 14.0,  orbit: 250,  speed: 0.084, color: 0xc88b3a, tilt: 3.1,   moons: 0 },
    { name: 'Saturn',  radius: 12.0,  orbit: 360,  speed: 0.034, color: 0xe4d191, tilt: 26.7,  rings: true, moons: 0 },
    { name: 'Uranus',  radius: 7.5,   orbit: 465,  speed: 0.012, color: 0x7de8e8, tilt: 97.8,  moons: 0 },
    { name: 'Neptune', radius: 7.0,   orbit: 570,  speed: 0.006, color: 0x3f54ba, tilt: 28.3,  moons: 0 },
  ];
 
  const orbitLines = [];
  const planetMeshes = [];
  let showOrbits = true;
 
  // Helper: procedural planet texture
  function createPlanetTexture(baseColor, stripeColor, type) {
    const size = 256;
    const canvas2 = document.createElement('canvas');
    canvas2.width = size; canvas2.height = size;
    const ctx = canvas2.getContext('2d');
 
    if (type === 'earth') {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#1a4a8a');
      grad.addColorStop(0.3, '#2a6ab0');
      grad.addColorStop(0.5, '#1d8c4a');
      grad.addColorStop(0.7, '#3a9a5a');
      grad.addColorStop(1, '#1a4a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      // Continents
      ctx.fillStyle = '#2a7a4a';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const x = Math.random() * size, y = Math.random() * size;
        ctx.ellipse(x, y, 20 + Math.random()*30, 10 + Math.random()*20, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random()*size, Math.random()*size, 15+Math.random()*25, 5+Math.random()*10, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
      }
    } else if (type === 'gas') {
      // Gas giant bands
      const c1 = baseColor, c2 = stripeColor;
      for (let y = 0; y < size; y++) {
        const band = Math.sin(y * 0.2) * 0.5 + 0.5;
        const r = parseInt(c1.slice(1,3), 16) * band + parseInt(c2.slice(1,3), 16) * (1-band);
        const g = parseInt(c1.slice(3,5), 16) * band + parseInt(c2.slice(3,5), 16) * (1-band);
        const b = parseInt(c1.slice(5,7), 16) * band + parseInt(c2.slice(5,7), 16) * (1-band);
        ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
        ctx.fillRect(0, y, size, 1);
      }
      // Noise
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.08})`;
        ctx.fillRect(Math.random()*size, Math.random()*size, 2+Math.random()*8, 1);
      }
    } else if (type === 'rocky') {
      // Rocky surface
      ctx.fillStyle = '#' + baseColor.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        const r = 3 + Math.random() * 12;
        const grad2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad2.addColorStop(0, 'rgba(0,0,0,0.5)');
        grad2.addColorStop(0.5, 'rgba(0,0,0,0.2)');
        grad2.addColorStop(1, 'rgba(255,255,255,0.05)');
        ctx.fillStyle = grad2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      }
      // Surface color variation
      for (let i = 0; i < 200; i++) {
        const bright = Math.random() > 0.5 ? 0.15 : -0.15;
        ctx.fillStyle = bright > 0 ? `rgba(255,255,255,${Math.abs(bright)})` : `rgba(0,0,0,${Math.abs(bright)})`;
        ctx.fillRect(Math.random()*size, Math.random()*size, 4+Math.random()*12, 4+Math.random()*12);
      }
    }
 
    const tex = new THREE.CanvasTexture(canvas2);
    return tex;
  }
 
  planetData.forEach(pd => {
    // Planet mesh
    const geo = new THREE.SphereGeometry(pd.radius, 48, 48);
    let mat;
 
    if (pd.name === 'Earth') {
      mat = new THREE.MeshPhongMaterial({ map: createPlanetTexture(0, 0, 'earth'), shininess: 40 });
    } else if (pd.name === 'Jupiter') {
      mat = new THREE.MeshPhongMaterial({ map: createPlanetTexture('#c88b3a', '#a0622a', 'gas'), shininess: 5 });
    } else if (pd.name === 'Saturn') {
      mat = new THREE.MeshPhongMaterial({ map: createPlanetTexture('#e4d191', '#c8a840', 'gas'), shininess: 5 });
    } else if (pd.name === 'Uranus') {
      mat = new THREE.MeshPhongMaterial({ map: createPlanetTexture('#7de8e8', '#5cc8c8', 'gas'), shininess: 20 });
    } else if (pd.name === 'Neptune') {
      mat = new THREE.MeshPhongMaterial({ map: createPlanetTexture('#3f54ba', '#2a3a9a', 'gas'), shininess: 20 });
    } else {
      mat = new THREE.MeshPhongMaterial({ map: createPlanetTexture(pd.color, 0, 'rocky'), shininess: 10 });
    }
 
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = (pd.tilt * Math.PI) / 180;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
 
    // Saturn rings
    let ringMesh = null;
    if (pd.rings) {
      const ringGeo = new THREE.RingGeometry(pd.radius * 1.3, pd.radius * 2.4, 128);
      const ringCanvas = document.createElement('canvas');
      ringCanvas.width = 256; ringCanvas.height = 1;
      const rCtx = ringCanvas.getContext('2d');
      const rGrad = rCtx.createLinearGradient(0, 0, 256, 0);
      rGrad.addColorStop(0, 'rgba(196,160,100,0)');
      rGrad.addColorStop(0.15, 'rgba(196,160,100,0.7)');
      rGrad.addColorStop(0.4, 'rgba(220,200,140,0.5)');
      rGrad.addColorStop(0.6, 'rgba(196,150,80,0.6)');
      rGrad.addColorStop(0.8, 'rgba(180,140,70,0.4)');
      rGrad.addColorStop(1, 'rgba(180,140,70,0)');
      rCtx.fillStyle = rGrad;
      rCtx.fillRect(0, 0, 256, 1);
      const ringTex = new THREE.CanvasTexture(ringCanvas);
      const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false });
      ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      mesh.add(r
 
