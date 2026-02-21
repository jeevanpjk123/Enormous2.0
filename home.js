// home.js — Enormous2.0 Home Page
(function() {
  const canvas = document.getElementById('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
 
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 5;
 
  // === STAR FIELD ===
  const starCount = 12000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
 
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 2000;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 2000;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 2000;
 
    const t = Math.random();
    if (t < 0.6) {
      // white-blue
      starColors[i*3] = 0.8 + Math.random()*0.2;
      starColors[i*3+1] = 0.8 + Math.random()*0.2;
      starColors[i*3+2] = 1.0;
    } else if (t < 0.8) {
      // gold
      starColors[i*3] = 1.0;
      starColors[i*3+1] = 0.85 + Math.random()*0.15;
      starColors[i*3+2] = 0.3 + Math.random()*0.3;
    } else {
      // purple-blue
      starColors[i*3] = 0.4 + Math.random()*0.3;
      starColors[i*3+1] = 0.4 + Math.random()*0.4;
      starColors[i*3+2] = 1.0;
    }
    starSizes[i] = Math.random() * 2.5 + 0.5;
  }
 
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
 
  const starMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float time;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 1.0 + 0.3 * sin(time * 3.0 + position.x * 10.0 + position.y * 7.0);
        gl_PointSize = size * twinkle * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
 
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
 
  // === NEBULA CLOUDS ===
  function createNebula(color1, color2, x, y, z, scale) {
    const geo = new THREE.BufferGeometry();
    const count = 4000;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
 
    for (let i = 0; i < count; i++) {
      const r = Math.random() * scale;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      pos[i*3] = x + r * Math.sin(phi) * Math.cos(theta) * (1 + Math.random()*0.5);
      pos[i*3+1] = y + r * Math.sin(phi) * Math.sin(theta) * 0.4;
      pos[i*3+2] = z + r * Math.cos(phi);
 
      const mix = Math.random();
      cols[i*3] = c1.r * mix + c2.r * (1-mix);
      cols[i*3+1] = c1.g * mix + c2.g * (1-mix);
      cols[i*3+2] = c1.b * mix + c2.b * (1-mix);
    }
 
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
 
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, offset: { value: Math.random() * 100 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float offset;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.x += sin(time * 0.1 + offset + pos.y * 0.05) * 8.0;
          pos.y += cos(time * 0.08 + offset + pos.x * 0.03) * 5.0;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 80.0 / -mvPos.z;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * 0.18;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
 
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return { pts, mat };
  }
 
  const nebulas = [
    createNebula('#7b2fff', '#00d4ff', -200, 80, -400, 150),
    createNebula('#ff4466', '#7b2fff', 300, -50, -600, 180),
    createNebula('#00d4ff', '#4488ff', 100, 200, -500, 120),
    createNebula('#ffd700', '#ff6622', -300, -150, -700, 200),
  ];
 
  // === SHOOTING STARS ===
  const shootingStars = [];
 
  function createShootingStar() {
    const geo = new THREE.BufferGeometry();
    const length = 60 + Math.random() * 80;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.8,
      0
    ).normalize();
 
    const startX = (Math.random() - 0.5) * 1200;
    const startY = (Math.random() - 0.5) * 600;
    const startZ = -50 - Math.random() * 100;
 
    const positions = new Float32Array([
      startX, startY, startZ,
      startX + dir.x * length, startY + dir.y * length, startZ
    ]);
    const colors = new Float32Array([
      1, 1, 1,
      0, 0, 0
    ]);
 
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
 
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
 
    const speed = 8 + Math.random() * 10;
    const ss = { line, dir, speed, life: 0, maxLife: 60 + Math.random() * 40 };
    shootingStars.push(ss);
  }
 
  let shootingTimer = 0;
 
  // === CAMERA DRIFT ===
  let driftX = 0, driftY = 0;
  let targetDriftX = 0, targetDriftY = 0;
 
  document.addEventListener('mousemove', (e) => {
    targetDriftX = (e.clientX / window.innerWidth - 0.5) * 0.8;
    targetDriftY = (e.clientY / window.innerHeight - 0.5) * 0.4;
  });
 
  // === ANIMATION ===
  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    frame++;
    const t = frame * 0.01;
 
    starMat.uniforms.time.value = t;
    nebulas.forEach(n => { n.mat.uniforms.time.value = t; });
 
    // Slow rotation of star field
    stars.rotation.y = t * 0.005;
    stars.rotation.x = t * 0.002;
 
    // Camera drift
    driftX += (targetDriftX - driftX) * 0.02;
    driftY += (targetDriftY - driftY) * 0.02;
    camera.position.x = driftX * 2;
    camera.position.y = -driftY * 1.5;
    camera.lookAt(scene.position);
 
    // Shooting stars
    shootingTimer++;
    if (shootingTimer > 90 + Math.random() * 120) {
      createShootingStar();
      shootingTimer = 0;
    }
 
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.life++;
      const posAttr = ss.line.geometry.attributes.position;
      posAttr.array[0] += ss.dir.x * ss.speed;
      posAttr.array[1] += ss.dir.y * ss.speed;
      posAttr.array[3] += ss.dir.x * ss.speed;
      posAttr.array[4] += ss.dir.y * ss.speed;
      posAttr.needsUpdate = true;
      const fadeProgress = ss.life / ss.maxLife;
      ss.line.material.opacity = fadeProgress < 0.5 ? fadeProgress * 2 * 0.8 : (1 - fadeProgress) * 2 * 0.8;
 
      if (ss.life >= ss.maxLife) {
        scene.remove(ss.line);
        shootingStars.splice(i, 1);
      }
    }
 
    renderer.render(scene, camera);
  }
 
  animate();
 
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
 
