import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildKiranaCounterObjects, KiranaObjects } from './kiranaModels';
import kiranaBgUrl from '../../assets/images/kirana_shop_scene_1792769055403.jpg';

// Pre-allocated math helpers to eliminate GC in render loop (SKILL.md)
const _pointerTarget = new THREE.Vector2(0, 0);
const _pointerCurrent = new THREE.Vector2(0, 0);
const _camBasePos = new THREE.Vector3(0, -0.05, 3.2);
const _camTargetPos = new THREE.Vector3(0, -0.05, 3.2);
const _lookTarget = new THREE.Vector3(0, -0.3, 0);
const _raycaster = new THREE.Raycaster();
const _mouseRayVec = new THREE.Vector2();

interface KiranaSceneProps {
  onHoverObject?: (name: string | null) => void;
  onClickObject?: (name: string) => void;
  selectedQuantity?: string | null;
  isConfirmed?: boolean;
  cameraPreset?: 'counter' | 'scale' | 'ledger' | 'wide';
}

export const KiranaScene: React.FC<KiranaSceneProps> = ({
  onHoverObject,
  onClickObject,
  selectedQuantity = null,
  isConfirmed = false,
  cameraPreset = 'counter',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const kiranaObjectsRef = useRef<KiranaObjects | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Sync scale display readout when quantity or confirmation changes
  useEffect(() => {
    if (kiranaObjectsRef.current) {
      if (isConfirmed && selectedQuantity) {
        kiranaObjectsRef.current.updateScaleWeight(`${selectedQuantity} ✓`);
      } else {
        kiranaObjectsRef.current.updateScaleWeight(
          !selectedQuantity || selectedQuantity === 'Unspecified' ? '0.000 kg' : selectedQuantity
        );
      }
    }
  }, [selectedQuantity, isConfirmed]);

  // Main Three.js lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Software WebGL detector (SKILL.md)
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
      const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
      const param = debugExt ? debugExt.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      debugExt && gl.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      isSoftwareGl = true;
    }

    // 2. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1d1b);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    camera.position.copy(_camBasePos);

    // 3. Renderer configuration
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);
    renderer.domElement.className = 'w-full h-full block';

    // 4. Studio Environment Reflection (RoomEnvironment)
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Graceful fallback for headless or restricted WebGL
    }

    // 5. Authentic Kirana Shop Lighting Rig
    // Warm Tungsten Key light from top-left (mimics shop overhead hanging bulb)
    const keyLight = new THREE.DirectionalLight(0xfff1db, 2.4);
    keyLight.position.set(-2.5, 4.0, 3.0);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Warm shop bulb point light hovering above the counter
    const counterBulb = new THREE.PointLight(0xffd8a8, 3.2, 8);
    counterBulb.position.set(0, 1.8, 1.2);
    scene.add(counterBulb);

    // Soft sky-ground cool fill light (HemisphereLight)
    const hemiLight = new THREE.HemisphereLight(0xffecd2, 0x1f2421, 1.1);
    scene.add(hemiLight);

    // Subtle rim backlight separating foreground products from background
    const rimLight = new THREE.DirectionalLight(0xffc5aa, 1.2);
    rimLight.position.set(2, 1, -2);
    scene.add(rimLight);

    // 6. Layer 1: Background & Middleground Kirana Shop Environment Backdrop
    const textureLoader = new THREE.TextureLoader();
    let bgMesh: THREE.Mesh | null = null;
    let bgMaterial: THREE.MeshBasicMaterial | null = null;

    textureLoader.load(
      kiranaBgUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        // Backdrop plane sized for 16:9 cinematic aspect ratio
        const bgPlaneGeo = new THREE.PlaneGeometry(12.8, 7.2);
        bgMaterial = new THREE.MeshBasicMaterial({
          map: tex,
          toneMapped: true,
        });
        bgMesh = new THREE.Mesh(bgPlaneGeo, bgMaterial);
        bgMesh.position.set(0, 0.45, -4.5);
        scene.add(bgMesh);
      },
      undefined,
      (err) => {
        console.warn('Kirana backdrop image failed to load, using warm shop tone fallback', err);
      }
    );

    // Subtle counter surface ground plane with contact shadows
    const counterTopGeo = new THREE.PlaneGeometry(10, 4);
    const counterTopMat = new THREE.MeshStandardMaterial({
      color: 0x222623,
      roughness: 0.8,
      metalness: 0.1,
    });
    const counterTop = new THREE.Mesh(counterTopGeo, counterTopMat);
    counterTop.rotation.x = -Math.PI / 2;
    counterTop.position.set(0, -1.02, 0.5);
    counterTop.receiveShadow = true;
    scene.add(counterTop);

    // 7. Layer 2 & 3: Procedural 3D Foreground Kirana Counter Objects
    const kiranaObjects = buildKiranaCounterObjects();
    kiranaObjectsRef.current = kiranaObjects;
    scene.add(kiranaObjects.group);

    // 8. Warm atmospheric floating dust/light particles
    const particleCount = isSoftwareGl ? 30 : 90;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffd8a8,
      size: 0.04,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const dustParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(dustParticles);

    // Raycast interactive objects list
    const interactiveObjects = [
      { mesh: kiranaObjects.saltPouch, name: 'टाटा नमक 1kg (Unclear in spoken order)' },
      { mesh: kiranaObjects.sugarPouch, name: 'शुद्ध चीनी 2kg (Confirmed item)' },
      { mesh: kiranaObjects.weighingScale, name: 'डिजिटल तराजू (Digital Kirana Scale)' },
      { mesh: kiranaObjects.ledger, name: 'दुकान बही खाता (Voice Order Ledger)' },
      { mesh: kiranaObjects.spiceJar, name: 'हल्दी मसाला जार (Turmeric Spice Jar)' },
    ];

    // 9. Input & Parallax listeners
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scrollYOffset = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      _pointerTarget.x = (clientX / rect.width) * 2 - 1;
      _pointerTarget.y = -(clientY / rect.height) * 2 + 1;

      // Raycasting for interactive item hover
      _mouseRayVec.x = _pointerTarget.x;
      _mouseRayVec.y = _pointerTarget.y;
      _raycaster.setFromCamera(_mouseRayVec, camera);

      let found = false;
      for (const item of interactiveObjects) {
        const intersects = _raycaster.intersectObjects(item.mesh.children, true);
        if (intersects.length > 0) {
          setHoveredLabel(item.name);
          onHoverObject?.(item.name);
          container.style.cursor = 'pointer';
          found = true;
          break;
        }
      }
      if (!found) {
        setHoveredLabel(null);
        onHoverObject?.(null);
        container.style.cursor = 'default';
      }
    };

    const onClick = () => {
      _raycaster.setFromCamera(_mouseRayVec, camera);
      for (const item of interactiveObjects) {
        const intersects = _raycaster.intersectObjects(item.mesh.children, true);
        if (intersects.length > 0) {
          onClickObject?.(item.name);
          break;
        }
      }
    };

    const onScroll = () => {
      const currentScroll = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(Math.max(currentScroll / (docHeight || 1), 0), 1);
      scrollYOffset = progress;
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // 10. Animation Loop with silky exponential damping (SKILL.md)
    let frameId = 0;
    let clock = new THREE.Clock();

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      if (!prefersReducedMotion) {
        // Smoothly damp pointer coordinates
        _pointerCurrent.x = THREE.MathUtils.damp(_pointerCurrent.x, _pointerTarget.x, 3.5, delta);
        _pointerCurrent.y = THREE.MathUtils.damp(_pointerCurrent.y, _pointerTarget.y, 3.5, delta);

        // Adjust camera target based on scroll position and preset
        let baseCamY = _camBasePos.y;
        let baseCamZ = _camBasePos.z;
        let lookY = _lookTarget.y;

        // Cinematic scroll track: as user scrolls down, camera dollys closer to counter
        // and tilts slightly down toward the weighing scale & ledger
        const scrollDolly = scrollYOffset * 0.8;
        baseCamZ = Math.max(2.4, _camBasePos.z - scrollDolly);
        baseCamY = _camBasePos.y - scrollYOffset * 0.35;
        lookY = _lookTarget.y - scrollYOffset * 0.3;

        // Calculate parallax displacement: foreground moves faster than background
        _camTargetPos.x = _camBasePos.x + _pointerCurrent.x * 0.42;
        _camTargetPos.y = baseCamY + _pointerCurrent.y * 0.24;
        _camTargetPos.z = baseCamZ;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 4.0, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 4.0, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 4.0, delta);

        // Look at counter center with subtle tilt
        const currentLook = new THREE.Vector3(
          _pointerCurrent.x * 0.12,
          lookY + _pointerCurrent.y * 0.08,
          0
        );
        camera.lookAt(currentLook);

        // Stronger independent parallax on foreground items (pouch & weights)
        if (kiranaObjects) {
          kiranaObjects.saltPouch.position.x = -1.15 + _pointerCurrent.x * 0.08;
          kiranaObjects.saltPouch.position.y = -0.75 + _pointerCurrent.y * 0.04;
          kiranaObjects.sugarPouch.position.x = -0.48 + _pointerCurrent.x * 0.06;
          kiranaObjects.sugarPouch.position.y = -0.7 + _pointerCurrent.y * 0.03;
          kiranaObjects.weighingScale.position.x = 0.45 + _pointerCurrent.x * 0.05;
          kiranaObjects.ledger.position.x = 1.3 + _pointerCurrent.x * 0.04;
        }

        // Background plane moves slightly in opposite direction for pronounced optical depth
        if (bgMesh) {
          bgMesh.position.x = -_pointerCurrent.x * 0.15;
          bgMesh.position.y = 0.45 - _pointerCurrent.y * 0.08;
        }

        // Dust particle drift
        const positions = particleGeo.attributes.position;
        const time = clock.getElapsedTime() * 0.2;
        for (let i = 0; i < particleCount; i++) {
          let y = positions.getY(i);
          y += 0.003;
          if (y > 2) y = -2;
          positions.setY(i, y);
          positions.setX(i, positions.getX(i) + Math.sin(time + i) * 0.001);
        }
        positions.needsUpdate = true;
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);

      kiranaObjects.dispose();
      dustParticles.geometry.dispose();
      particleMat.dispose();
      counterTopGeo.dispose();
      counterTopMat.dispose();
      if (bgMesh) {
        bgMesh.geometry.dispose();
        bgMaterial?.dispose();
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[100svh] overflow-hidden select-none">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Subtle Atmospheric Vignette & Contrast Scrim (no card borders) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(26,29,27,0.1) 0%, rgba(25,30,27,0.55) 85%, rgba(25,30,27,0.85) 100%)',
        }}
      />

      {/* Interactive Item Tooltip Badge */}
      {hoveredLabel && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#191E1B]/90 text-[#EEF8CD] text-xs font-medium tracking-wide rounded-full border border-[#FFC5AA]/40 shadow-xl transition-all duration-200">
          <span className="text-[#FF9D9D] mr-2">3D ITEM ·</span>
          {hoveredLabel}
        </div>
      )}

      {/* WebGL Fallback if device has no WebGL context */}
      {!webglSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#191E1B] p-6 text-center text-[#EEF8CD]">
          <div className="max-w-md p-6 bg-[#222623] rounded-xl border border-[#FF9D9D]/30">
            <h3 className="font-jaro text-2xl text-[#FF9D9D] mb-2">BOLPROOF Kirana Scene</h3>
            <p className="text-sm font-poppins text-[#EEF8CD]/80">
              WebGL is currently disabled or unsupported on this device. The order verification engine is fully available below!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
