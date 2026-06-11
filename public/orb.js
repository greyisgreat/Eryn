// ═══════════════════════════════════════════════════════
// ERYN ORB — Particle system v3.0 (Jarvis-style)
// Exports: initOrb(canvas), setOrbState(state)
// States: 'idle' | 'listening' | 'thinking' | 'speaking'
// ═══════════════════════════════════════════════════════

window.ErynnOrb = (function () {

  const PARTICLE_COUNT = 4500;
  const RING_COUNT     = 180;
  const TEAL   = new THREE.Color(0x2DD4A8);
  const PURPLE = new THREE.Color(0x806bff);
  const WHITE  = new THREE.Color(0xffffff);
  const BLUE   = new THREE.Color(0x00d4ff);

  let renderer, scene, camera;
  let particles, positions, colors, sizes;
  let orbState = 'idle';
  let voiceLevel = 0, targetVoiceLevel = 0;
  let time = 0;

  // Per-particle spherical data
  let baseRadii, azimuth, polar, phase, speed, layer;

  // Ring objects for Jarvis arcs
  let rings = [];

  function initOrb(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0e);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 5.5;

    buildStarfield();
    buildNebulas();
    buildParticleOrb();
    buildJarvisRings();
    buildCoreGlow();

    window.addEventListener('resize', onResize);
    requestAnimationFrame(animate);
  }

  // ── Dense twinkling starfield ──
  function buildStarfield() {
    const count = 3000;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const sz    = new Float32Array(count);
    const col   = new Float32Array(count * 3);
    const tints = [
      [1,1,1], [0.7,0.9,1], [1,0.85,0.7], [0.6,1,0.9]
    ];
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 80;
      pos[i*3+1] = (Math.random() - 0.5) * 80;
      pos[i*3+2] = (Math.random() - 0.5) * 40 - 8;
      sz[i] = Math.random() * 2.8 + 0.5;
      const t = tints[Math.floor(Math.random()*tints.length)];
      col[i*3]=t[0]; col[i*3+1]=t[1]; col[i*3+2]=t[2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      vertexColors: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        uniform float uTime;
        varying float vA;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vA = 0.3 + 0.7 * abs(sin(uTime * 0.5 + position.x * 0.4 + position.y * 0.3));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (350.0 / -mv.z) * vA;
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = (1.0 - d * 1.8) * vA * 0.8;
          gl_FragColor = vec4(vColor, a);
        }`
    });
    const stars = new THREE.Points(geo, mat);
    stars.userData.mat = mat;
    scene.add(stars);
    scene.userData.stars = stars;
  }

  // ── Atmospheric nebulas ──
  function buildNebulas() {
    const specs = [
      [0x0d3d2e, 0.22, -3.5, 1.5, -5, 10, 8],
      [0x2a0d5a, 0.18,  2.5,-1.5, -6,  9, 7],
      [0x0a1a4a, 0.16,  0.5, 0.5, -7, 12,10],
      [0x2DD4A8, 0.07,  0,   0,   -3,  6, 5],
      [0x4433aa, 0.09, -1,  -2,   -4,  7, 6],
    ];
    scene.userData.nebulas = specs.map(([col, op, x, y, z, sx, sy]) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uColor:   { value: new THREE.Color(col) },
          uOpacity: { value: op },
          uTime:    { value: 0 },
          uSeed:    { value: Math.random() * 10 }
        },
        vertexShader:   `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uOpacity, uTime, uSeed;
          varying vec2 vUv;
          float noise(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          void main() {
            float d = length(vUv - 0.5);
            float n = sin(vUv.x*6.0+uTime*0.15+uSeed)*cos(vUv.y*5.0+uTime*0.12)*0.1;
            float a = (1.0 - smoothstep(0.0, 0.52, d+n)) * uOpacity;
            gl_FragColor = vec4(uColor, a);
          }`
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    });
  }

  // ── Main particle orb — much bigger and denser ──
  function buildParticleOrb() {
    const geo = new THREE.BufferGeometry();
    positions = new Float32Array(PARTICLE_COUNT * 3);
    colors    = new Float32Array(PARTICLE_COUNT * 3);
    sizes     = new Float32Array(PARTICLE_COUNT);

    baseRadii = new Float32Array(PARTICLE_COUNT);
    azimuth   = new Float32Array(PARTICLE_COUNT);
    polar     = new Float32Array(PARTICLE_COUNT);
    phase     = new Float32Array(PARTICLE_COUNT);
    speed     = new Float32Array(PARTICLE_COUNT);
    layer     = new Uint8Array(PARTICLE_COUNT); // 0=shell, 1=inner, 2=streak

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const l = i < PARTICLE_COUNT * 0.65 ? 0 : i < PARTICLE_COUNT * 0.85 ? 1 : 2;
      layer[i] = l;

      let r;
      if (l === 0)      r = 1.1 + Math.random() * 0.45; // outer shell
      else if (l === 1) r = 0.45 + Math.random() * 0.55; // inner volume
      else              r = 0.9  + Math.random() * 0.8;  // streak particles

      const az = Math.random() * Math.PI * 2;
      const pl = Math.acos(2 * Math.random() - 1);
      baseRadii[i] = r;
      azimuth[i]   = az;
      polar[i]     = pl;
      phase[i]     = Math.random() * Math.PI * 2;
      speed[i]     = 0.15 + Math.random() * 0.7;

      positions[i*3]   = r * Math.sin(pl) * Math.cos(az);
      positions[i*3+1] = r * Math.cos(pl);
      positions[i*3+2] = r * Math.sin(pl) * Math.sin(az);

      colors[i*3] = TEAL.r; colors[i*3+1] = TEAL.g; colors[i*3+2] = TEAL.b;

      // Bigger sizes — more visible!
      if (l === 0) sizes[i] = 3.5 + Math.random() * 4.5;
      else if (l === 1) sizes[i] = 2.0 + Math.random() * 3.0;
      else sizes[i] = 1.5 + Math.random() * 2.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uVoice: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        uniform float uTime, uVoice;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + uVoice * 0.55 * sin(uTime * 10.0 + position.x * 5.0 + position.y * 3.0);
          gl_PointSize = size * pulse * (420.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          // Soft glowing disc — brighter center
          float a = pow(1.0 - d * 1.85, 1.4) * 0.95;
          gl_FragColor = vec4(vColor, a);
        }`
    });

    particles = new THREE.Points(geo, mat);
    scene.add(particles);
    scene.userData.particleMat = mat;
    scene.userData.particles   = particles;
  }

  // ── Jarvis-style rotating arc rings ──
  function buildJarvisRings() {
    rings = [];

    const ringDefs = [
      // [radius, tiltX, tiltY, tiltZ, speed, segments, gap%, color, linewidth]
      { r:1.55, tx:0.4,  ty:0.1, tz:0.0, spd:0.18,  seg:RING_COUNT, gap:0.08, col:0x2DD4A8, lw:1.2 },
      { r:1.72, tx:1.1,  ty:0.3, tz:0.5, spd:-0.12, seg:RING_COUNT, gap:0.15, col:0x2DD4A8, lw:0.9 },
      { r:1.45, tx:0.2,  ty:1.2, tz:0.8, spd:0.22,  seg:RING_COUNT, gap:0.22, col:0x00d4ff, lw:0.8 },
      { r:1.88, tx:0.8,  ty:0.5, tz:1.5, spd:-0.09, seg:RING_COUNT, gap:0.35, col:0x806bff, lw:0.7 },
      { r:1.3,  tx:1.5,  ty:0.9, tz:0.3, spd:0.28,  seg:RING_COUNT, gap:0.45, col:0x2DD4A8, lw:0.6 },
      { r:2.05, tx:0.6,  ty:1.4, tz:1.0, spd:-0.07, seg:RING_COUNT, gap:0.55, col:0x00d4ff, lw:0.5 },
    ];

    ringDefs.forEach(def => {
      const pts = [];
      const gapStart = Math.random() * Math.PI * 2;
      const gapEnd   = gapStart + def.gap * Math.PI * 2;

      for (let i = 0; i <= def.seg; i++) {
        const angle = (i / def.seg) * Math.PI * 2;
        // Skip the gap
        let inGap = false;
        if (gapEnd < Math.PI * 2) {
          inGap = angle > gapStart && angle < gapEnd;
        } else {
          inGap = angle > gapStart || angle < (gapEnd - Math.PI * 2);
        }
        if (inGap) continue;
        pts.push(new THREE.Vector3(
          Math.cos(angle) * def.r,
          Math.sin(angle) * def.r,
          0
        ));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: def.col,
        transparent: true,
        opacity: 0.55,
        linewidth: def.lw,
      });

      const ring = new THREE.LineLoop(geo, mat);
      ring.rotation.x = def.tx;
      ring.rotation.y = def.ty;
      ring.rotation.z = def.tz;
      ring.userData.spd = def.spd;
      ring.userData.baseOpacity = mat.opacity;

      scene.add(ring);
      rings.push(ring);
    });

    scene.userData.rings = rings;
  }

  // ── Central core glow ──
  function buildCoreGlow() {
    const glowSpec = [
      [2.4, 0.18, 0x2DD4A8],
      [1.7, 0.30, 0x2DD4A8],
      [1.1, 0.50, 0x5fffd4],
      [0.6, 0.70, 0xffffff],
    ];
    scene.userData.glows = glowSpec.map(([r, op, col]) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.BackSide,
        uniforms: {
          uColor:   { value: new THREE.Color(col) },
          uOpacity: { value: op },
          uTime:    { value: 0 },
          uVoice:   { value: 0 },
        },
        vertexShader:   `varying vec3 vN; void main() { vN = normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uOpacity, uTime, uVoice;
          varying vec3 vN;
          void main() {
            float f = pow(max(dot(vN,vec3(0,0,1)),0.0),1.3);
            float p = 0.75 + 0.25*sin(uTime*1.8) + uVoice*0.45;
            gl_FragColor = vec4(uColor, f*uOpacity*p);
          }`
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 32), mat);
      scene.add(mesh);
      return mesh;
    });
  }

  // ── Animate ──
  function animate(t) {
    requestAnimationFrame(animate);
    time = t * 0.001;

    voiceLevel += (targetVoiceLevel - voiceLevel) * 0.08;

    // Stars
    if (scene.userData.stars)
      scene.userData.stars.userData.mat.uniforms.uTime.value = time;

    // Nebulas
    if (scene.userData.nebulas) {
      scene.userData.nebulas.forEach((n, i) => {
        n.material.uniforms.uTime.value = time;
        n.position.x += Math.sin(time * 0.04 + i) * 0.0006;
        n.position.y += Math.cos(time * 0.03 + i * 1.5) * 0.0006;
      });
    }

    // Particles
    updateParticles();

    // Jarvis rings
    updateRings();

    // Glows
    if (scene.userData.glows) {
      scene.userData.glows.forEach(g => {
        g.material.uniforms.uTime.value  = time;
        g.material.uniforms.uVoice.value = voiceLevel;
      });
    }

    // Slight camera float
    camera.position.x = Math.sin(time * 0.08) * 0.12;
    camera.position.y = Math.cos(time * 0.06) * 0.06;
    camera.lookAt(0, 0, 0);

    // Offset for right panel
    const offsetX = -(380 / window.innerWidth) * camera.position.z * Math.tan(THREE.MathUtils.degToRad(27.5));
    if (particles) {
      particles.position.x = offsetX;
      scene.userData.glows?.forEach(g => g.position.x = offsetX);
      rings.forEach(r => r.position.x = offsetX);
    }

    renderer.render(scene, camera);
  }

  function updateRings() {
    const stateMultiplier = {
      idle: 1.0, listening: 1.6, thinking: 2.2, speaking: 1.8
    }[orbState] || 1.0;

    rings.forEach((ring, i) => {
      ring.rotation.z += ring.userData.spd * 0.016 * stateMultiplier;

      // Pulse opacity
      const base = ring.userData.baseOpacity;
      let targetOp;
      if (orbState === 'idle')      targetOp = base * (0.6 + 0.15 * Math.sin(time * 0.8 + i));
      else if (orbState === 'listening') targetOp = base * (1.1 + 0.2 * Math.sin(time * 2 + i));
      else if (orbState === 'thinking') targetOp = base * (0.8 + 0.5 * Math.abs(Math.sin(time * 3 + i * 0.7)));
      else if (orbState === 'speaking') targetOp = base * (1.2 + voiceLevel * 0.7 * Math.abs(Math.sin(time * 8 + i)));
      else targetOp = base;

      ring.material.opacity += (targetOp - ring.material.opacity) * 0.06;

      // Color shift
      if (orbState === 'thinking') {
        ring.material.color.lerp(new THREE.Color(0x806bff), 0.04);
      } else if (orbState === 'listening') {
        ring.material.color.lerp(new THREE.Color(0x2DD4A8), 0.04);
      } else {
        ring.material.color.lerp(new THREE.Color(0x2DD4A8), 0.02);
      }
    });
  }

  function updateParticles() {
    if (!particles) return;
    const mat = scene.userData.particleMat;
    mat.uniforms.uTime.value  = time;
    mat.uniforms.uVoice.value = voiceLevel;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ph = phase[i] + time * speed[i];
      const l  = layer[i];

      let targetR = baseRadii[i];
      let wobble  = 0;
      let colorMix = 0; // 0=teal, 0.5=blue, 1=purple

      if (orbState === 'idle') {
        if (l === 0) {
          targetR = baseRadii[i] * (1.0 + 0.035 * Math.sin(ph * 0.4));
          wobble  = 0.012 * Math.sin(ph + i * 0.003);
        } else if (l === 1) {
          targetR = baseRadii[i] * (0.9 + 0.06 * Math.sin(ph * 0.6));
          wobble  = 0.018 * Math.cos(ph);
        } else {
          targetR = baseRadii[i] * (1.0 + 0.08 * Math.sin(ph * 0.3));
          wobble  = 0.005;
        }

      } else if (orbState === 'listening') {
        // Pull tight, bright teal, fast shimmer on surface
        targetR = baseRadii[i] * (l === 0 ? 0.78 : 0.65) * (1.0 + 0.07 * Math.sin(ph * 2.5));
        wobble  = 0.03 * Math.sin(ph * 2.0);
        colorMix = 0.1;

      } else if (orbState === 'thinking') {
        // Spiral vortex — azimuth accelerates
        azimuth[i] += (l === 2 ? 0.018 : 0.009) * speed[i];
        targetR = baseRadii[i] * (l === 1 ? 0.7 : 0.9) * (1.0 + 0.1 * Math.sin(ph * 4.0));
        wobble  = 0.025;
        colorMix = 0.92;  // deep purple

      } else if (orbState === 'speaking') {
        // Explosive outward bursts with voice
        const burst = 1.0 + voiceLevel * 0.8 * Math.abs(Math.sin(time * 12.0 + phase[i] * 4.0));
        targetR = baseRadii[i] * burst * (l === 2 ? 1.3 : 1.0) * (1.0 + 0.15 * Math.sin(ph * 5.0));
        wobble  = 0.06 * Math.sin(ph * 3.0);
        colorMix = voiceLevel * 0.35;
      }

      const r  = targetR;
      const az = azimuth[i] + wobble;
      const pl = polar[i]   + wobble * 0.55;

      positions[i*3]   = r * Math.sin(pl) * Math.cos(az);
      positions[i*3+1] = r * Math.cos(pl);
      positions[i*3+2] = r * Math.sin(pl) * Math.sin(az);

      // Color
      let col;
      if (colorMix < 0.5) {
        col = TEAL.clone().lerp(BLUE, colorMix * 0.5);
      } else {
        col = BLUE.clone().lerp(PURPLE, (colorMix - 0.5) * 2);
      }

      // Brightness/emissive boost
      if (orbState === 'speaking') {
        const boost = 1.0 + voiceLevel * 0.7;
        col.r = Math.min(1, col.r * boost);
        col.g = Math.min(1, col.g * boost);
        col.b = Math.min(1, col.b * boost);
      }
      if (orbState === 'thinking') {
        col.r = Math.min(1, col.r + 0.15 * Math.sin(time * 4 + phase[i]));
      }

      colors[i*3]   = col.r;
      colors[i*3+1] = col.g;
      colors[i*3+2] = col.b;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate    = true;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function setOrbState(state, level = 0) {
    orbState         = state;
    targetVoiceLevel = level;
  }

  return { initOrb, setOrbState };
})();
