// ═══════════════════════════════════════════════════════
// ERYN ORB — Particle system v2.0
// Exports: initOrb(canvas), setOrbState(state)
// States: 'idle' | 'listening' | 'thinking' | 'speaking'
// ═══════════════════════════════════════════════════════

window.ErynnOrb = (function () {

  const PARTICLE_COUNT = 2200;
  const TEAL = new THREE.Color(0x2DD4A8);
  const PURPLE = new THREE.Color(0x806bff);
  const WHITE = new THREE.Color(0xffffff);

  let renderer, scene, camera;
  let particles, positions, velocities, origins, sizes, colors;
  let orbState = 'idle';
  let voiceLevel = 0, targetVoiceLevel = 0;
  let time = 0;
  let animFrame;

  // Per-particle data
  let baseRadii, azimuth, polar, phase, speed;

  function initOrb(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0E0F13);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    buildStarfield();
    buildNebulas();
    buildParticleOrb();
    buildGlows();

    window.addEventListener('resize', onResize);
    requestAnimationFrame(animate);
  }

  // ── Starfield ──
  function buildStarfield() {
    const count = 1600;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const sz    = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 60;
      pos[i*3+1] = (Math.random() - 0.5) * 60;
      pos[i*3+2] = (Math.random() - 0.5) * 30 - 5;
      sz[i]      = Math.random() * 2 + 0.4;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sz,  1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vA;
        void main() {
          vA = 0.4 + 0.6 * abs(sin(uTime * 0.7 + position.x * 0.3 + position.y * 0.2));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (280.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, (1.0 - d * 2.0) * vA * 0.65);
        }`
    });
    const stars = new THREE.Points(geo, mat);
    stars.userData.mat = mat;
    scene.add(stars);
    scene.userData.stars = stars;
  }

  // ── Nebulas ──
  function buildNebulas() {
    const specs = [
      [0x1a6655, 0.16, -3, 1.5, -3, 8, 6],
      [0x4a1a7a, 0.13, 2, -1, -4, 7, 5],
      [0x1a2a6a, 0.11, 0, 0, -5, 10, 8],
      [0x2DD4A8, 0.055, 0, 0, -2, 5, 4],
    ];
    scene.userData.nebulas = specs.map(([col, op, x, y, z, sx, sy]) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uColor:   { value: new THREE.Color(col) },
          uOpacity: { value: op },
          uTime:    { value: 0 },
          uId:      { value: Math.random() * 10 }
        },
        vertexShader:   `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uOpacity, uTime, uId;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5);
            float n = sin(vUv.x*8.0+uTime*0.2+uId)*cos(vUv.y*6.0+uTime*0.15)*0.08;
            float a = (1.0 - smoothstep(0.0, 0.55, d+n)) * uOpacity;
            gl_FragColor = vec4(uColor, a);
          }`
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    });
  }

  // ── Particle Orb ──
  function buildParticleOrb() {
    const geo = new THREE.BufferGeometry();
    positions = new Float32Array(PARTICLE_COUNT * 3);
    colors    = new Float32Array(PARTICLE_COUNT * 3);
    sizes     = new Float32Array(PARTICLE_COUNT);

    // Per-particle spherical coords
    baseRadii = new Float32Array(PARTICLE_COUNT);
    azimuth   = new Float32Array(PARTICLE_COUNT);
    polar     = new Float32Array(PARTICLE_COUNT);
    phase     = new Float32Array(PARTICLE_COUNT);
    speed     = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute on sphere shell with some depth variance
      const r  = 0.75 + Math.random() * 0.55;
      const az = Math.random() * Math.PI * 2;
      const pl = Math.acos(2 * Math.random() - 1);
      baseRadii[i] = r;
      azimuth[i]   = az;
      polar[i]     = pl;
      phase[i]     = Math.random() * Math.PI * 2;
      speed[i]     = 0.2 + Math.random() * 0.6;

      // Initial position
      positions[i*3]   = r * Math.sin(pl) * Math.cos(az);
      positions[i*3+1] = r * Math.cos(pl);
      positions[i*3+2] = r * Math.sin(pl) * Math.sin(az);

      // Initial color — teal base
      colors[i*3]   = TEAL.r;
      colors[i*3+1] = TEAL.g;
      colors[i*3+2] = TEAL.b;

      sizes[i] = 1.5 + Math.random() * 2.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      uniforms: {
        uTime:    { value: 0 },
        uVoice:   { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        uniform float uTime, uVoice;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + uVoice * 0.4 * sin(uTime * 8.0 + position.x * 4.0);
          gl_PointSize = size * pulse * (320.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
          vDist = length(position);
        }`,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = (1.0 - d * 2.0) * 0.85;
          gl_FragColor = vec4(vColor, a);
        }`
    });

    particles = new THREE.Points(geo, mat);
    scene.add(particles);
    scene.userData.particles = particles;
    scene.userData.particleMat = mat;
  }

  // ── Glow spheres ──
  function buildGlows() {
    const glowSpec = [
      [2.2, 0.22, 0x2DD4A8],
      [1.5, 0.38, 0x2DD4A8],
      [1.1, 0.55, 0x5fffd4],
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
            float f = pow(dot(vN,vec3(0,0,1)),1.5);
            float p = 0.8 + 0.2*sin(uTime*1.2) + uVoice*0.3;
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
    animFrame = requestAnimationFrame(animate);
    time = t * 0.001;

    // Lerp voice level
    voiceLevel += (targetVoiceLevel - voiceLevel) * 0.07;

    // Update stars
    if (scene.userData.stars)
      scene.userData.stars.userData.mat.uniforms.uTime.value = time;

    // Update nebulas
    if (scene.userData.nebulas) {
      scene.userData.nebulas.forEach((n, i) => {
        n.material.uniforms.uTime.value = time;
        n.position.x += Math.sin(time * 0.05 + i) * 0.0008;
        n.position.y += Math.cos(time * 0.04 + i * 1.3) * 0.0008;
      });
    }

    // Update particle orb
    updateParticles();

    // Update glows
    if (scene.userData.glows) {
      scene.userData.glows.forEach(g => {
        g.material.uniforms.uTime.value  = time;
        g.material.uniforms.uVoice.value = voiceLevel;
      });
    }

    // Offset orb center to account for right panel
    const offsetX = -(380 / window.innerWidth) * camera.position.z * Math.tan(THREE.MathUtils.degToRad(30));
    if (particles) {
      particles.position.x = offsetX;
      scene.userData.glows?.forEach(g => g.position.x = offsetX);
    }

    renderer.render(scene, camera);
  }

  function updateParticles() {
    if (!particles) return;

    const mat = scene.userData.particleMat;
    mat.uniforms.uTime.value  = time;
    mat.uniforms.uVoice.value = voiceLevel;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ph = phase[i] + time * speed[i];

      let targetR = baseRadii[i];
      let wobble  = 0;
      let colorMix = 0; // 0=teal, 1=purple, 2=white

      if (orbState === 'idle') {
        // Gentle slow drift, slight breathing
        targetR = baseRadii[i] * (1.0 + 0.04 * Math.sin(ph * 0.5));
        wobble  = 0.015 * Math.sin(ph + i * 0.01);

      } else if (orbState === 'listening') {
        // Pull inward, tight formation, fast shimmer
        targetR = baseRadii[i] * 0.72 * (1.0 + 0.06 * Math.sin(ph * 2.0));
        wobble  = 0.03 * Math.sin(ph * 1.5);
        colorMix = 0.2;

      } else if (orbState === 'thinking') {
        // Vortex — particles spiral on azimuth
        azimuth[i] += 0.008 * speed[i];
        targetR = baseRadii[i] * 0.85 * (1.0 + 0.08 * Math.sin(ph * 3.0));
        wobble  = 0.02;
        colorMix = 0.85; // mostly purple

      } else if (orbState === 'speaking') {
        // Expand and pulse outward rhythmically
        const burst = 1.0 + voiceLevel * 0.6 * Math.abs(Math.sin(time * 9.0 + phase[i] * 3.0));
        targetR = baseRadii[i] * burst * (1.0 + 0.12 * Math.sin(ph * 4.0));
        wobble  = 0.05 * Math.sin(ph * 2.0);
        colorMix = voiceLevel * 0.3;
      }

      const r  = targetR;
      const az = azimuth[i] + wobble;
      const pl = polar[i]   + wobble * 0.5;

      positions[i*3]   = r * Math.sin(pl) * Math.cos(az);
      positions[i*3+1] = r * Math.cos(pl);
      positions[i*3+2] = r * Math.sin(pl) * Math.sin(az);

      // Color
      let col;
      if (colorMix < 0.5) {
        col = TEAL.clone().lerp(WHITE, colorMix * 0.4);
      } else {
        col = TEAL.clone().lerp(PURPLE, (colorMix - 0.5) * 2);
      }

      // Brightness boost when speaking
      if (orbState === 'speaking') {
        const boost = 1.0 + voiceLevel * 0.5;
        col.r = Math.min(1, col.r * boost);
        col.g = Math.min(1, col.g * boost);
        col.b = Math.min(1, col.b * boost);
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

  // ── Public API ──
  function setOrbState(state, level = 0) {
    orbState         = state;
    targetVoiceLevel = level;
  }

  return { initOrb, setOrbState };
})();
