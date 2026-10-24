import * as THREE from 'three';
import {
  createSaltTexture,
  createSugarTexture,
  createScaleDisplayTexture,
  createLedgerTexture,
} from './textures';

/**
 * Procedural 3D Kirana Store Models
 * Constructed as 3-12 part THREE.Group assemblies with physically calibrated PBR materials.
 */

export interface KiranaObjects {
  group: THREE.Group;
  saltPouch: THREE.Group;
  sugarPouch: THREE.Group;
  weighingScale: THREE.Group;
  ledger: THREE.Group;
  brassWeight1: THREE.Group;
  brassWeight2: THREE.Group;
  spiceJar: THREE.Group;
  scaleDisplayMaterial: THREE.MeshBasicMaterial;
  updateScaleWeight: (weight: string) => void;
  dispose: () => void;
}

export function buildKiranaCounterObjects(): KiranaObjects {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'KiranaCounterObjects';

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  // ==========================================
  // 1. SALT PACKET (टाटा नमक - 1kg Pouch)
  // ==========================================
  const saltGroup = new THREE.Group();
  saltGroup.name = 'SaltPouch';
  saltGroup.position.set(-1.15, -0.75, 0.45);
  saltGroup.rotation.y = 0.25;

  const saltTex = createSaltTexture();
  disposables.push(saltTex);

  // Main pillow pouch body
  const pouchGeo = new THREE.BoxGeometry(0.48, 0.68, 0.18, 6, 8, 4);
  // Bulge the pouch vertices slightly for realistic grocery packet puff
  const pos = pouchGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const factor = Math.cos((y / 0.34) * (Math.PI / 2.3));
    pos.setZ(i, z * (1 + factor * 0.45));
  }
  pouchGeo.computeVertexNormals();
  disposables.push(pouchGeo);

  const pouchMat = new THREE.MeshStandardMaterial({
    map: saltTex,
    roughness: 0.35,
    metalness: 0.05,
  });
  disposables.push(pouchMat);

  const pouchMesh = new THREE.Mesh(pouchGeo, pouchMat);
  pouchMesh.castShadow = true;
  pouchMesh.receiveShadow = true;
  saltGroup.add(pouchMesh);

  // Top heat seal crimp
  const crimpGeo = new THREE.BoxGeometry(0.5, 0.05, 0.02);
  const crimpMat = new THREE.MeshStandardMaterial({
    color: 0xff9d9d, // Brand Coral
    roughness: 0.5,
  });
  disposables.push(crimpGeo, crimpMat);
  const topCrimp = new THREE.Mesh(crimpGeo, crimpMat);
  topCrimp.position.y = 0.365;
  saltGroup.add(topCrimp);

  // Bottom seal crimp
  const botCrimp = new THREE.Mesh(crimpGeo, crimpMat);
  botCrimp.position.y = -0.365;
  saltGroup.add(botCrimp);

  rootGroup.add(saltGroup);

  // ==========================================
  // 2. SUGAR PACKET (शुद्ध चीनी - 2kg Pouch)
  // ==========================================
  const sugarGroup = new THREE.Group();
  sugarGroup.name = 'SugarPouch';
  sugarGroup.position.set(-0.48, -0.70, 0.6);
  sugarGroup.rotation.y = -0.15;

  const sugarTex = createSugarTexture();
  disposables.push(sugarTex);

  const sugarPouchGeo = new THREE.BoxGeometry(0.55, 0.78, 0.22, 6, 8, 4);
  const sPos = sugarPouchGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const y = sPos.getY(i);
    const z = sPos.getZ(i);
    const factor = Math.cos((y / 0.39) * (Math.PI / 2.3));
    sPos.setZ(i, z * (1 + factor * 0.4));
  }
  sugarPouchGeo.computeVertexNormals();
  disposables.push(sugarPouchGeo);

  const sugarMat = new THREE.MeshStandardMaterial({
    map: sugarTex,
    roughness: 0.3,
    metalness: 0.05,
  });
  disposables.push(sugarMat);

  const sugarMesh = new THREE.Mesh(sugarPouchGeo, sugarMat);
  sugarMesh.castShadow = true;
  sugarMesh.receiveShadow = true;
  sugarGroup.add(sugarMesh);

  // Sugar top seal crimp in Peach #FFC5AA
  const sugarCrimpMat = new THREE.MeshStandardMaterial({
    color: 0xffc5aa,
    roughness: 0.4,
  });
  const sugarCrimpGeo = new THREE.BoxGeometry(0.57, 0.05, 0.03);
  disposables.push(sugarCrimpGeo, sugarCrimpMat);
  const sugarTopCrimp = new THREE.Mesh(sugarCrimpGeo, sugarCrimpMat);
  sugarTopCrimp.position.y = 0.415;
  sugarGroup.add(sugarTopCrimp);

  rootGroup.add(sugarGroup);

  // ==========================================
  // 3. DIGITAL WEIGHING SCALE (किराना तराजू)
  // ==========================================
  const scaleGroup = new THREE.Group();
  scaleGroup.name = 'WeighingScale';
  scaleGroup.position.set(0.45, -0.9, 0.35);
  scaleGroup.rotation.y = -0.22;

  // Scale Base chassis
  const baseGeo = new THREE.BoxGeometry(0.85, 0.16, 0.75);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x222a25,
    roughness: 0.4,
    metalness: 0.2,
  });
  disposables.push(baseGeo, baseMat);
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  baseMesh.position.y = 0.08;
  scaleGroup.add(baseMesh);

  // Stainless Steel Platter on top
  const platterGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 32);
  const platterMat = new THREE.MeshStandardMaterial({
    color: 0xd8dedb,
    metalness: 0.9,
    roughness: 0.18,
  });
  disposables.push(platterGeo, platterMat);
  const platterMesh = new THREE.Mesh(platterGeo, platterMat);
  platterMesh.position.y = 0.17;
  platterMesh.castShadow = true;
  platterMesh.receiveShadow = true;
  scaleGroup.add(platterMesh);

  // Front slanted display bezel
  const displayBezelGeo = new THREE.BoxGeometry(0.38, 0.11, 0.05);
  const displayBezelMat = new THREE.MeshStandardMaterial({
    color: 0x111613,
    roughness: 0.3,
  });
  disposables.push(displayBezelGeo, displayBezelMat);
  const bezelMesh = new THREE.Mesh(displayBezelGeo, displayBezelMat);
  bezelMesh.position.set(0, 0.08, 0.38);
  bezelMesh.rotation.x = -0.3;
  scaleGroup.add(bezelMesh);

  // Digital LED readout plane
  let currentDisplayTex = createScaleDisplayTexture('1.000 kg');
  disposables.push(currentDisplayTex);
  const displayPlaneGeo = new THREE.PlaneGeometry(0.34, 0.085);
  disposables.push(displayPlaneGeo);
  const scaleDisplayMaterial = new THREE.MeshBasicMaterial({
    map: currentDisplayTex,
  });
  disposables.push(scaleDisplayMaterial);
  const displayMesh = new THREE.Mesh(displayPlaneGeo, scaleDisplayMaterial);
  displayMesh.position.set(0, 0.08, 0.407);
  displayMesh.rotation.x = -0.3;
  scaleGroup.add(displayMesh);

  // Function to update weight readout dynamically
  const updateScaleWeight = (weight: string) => {
    const newTex = createScaleDisplayTexture(weight);
    scaleDisplayMaterial.map?.dispose();
    scaleDisplayMaterial.map = newTex;
    scaleDisplayMaterial.needsUpdate = true;
    disposables.push(newTex);
  };

  // Rubber feet
  const footGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0b, roughness: 0.9 });
  disposables.push(footGeo, footMat);
  const footOffsets = [
    [-0.36, -0.3],
    [0.36, -0.3],
    [-0.36, 0.3],
    [0.36, 0.3],
  ];
  footOffsets.forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(fx, 0.02, fz);
    scaleGroup.add(foot);
  });

  rootGroup.add(scaleGroup);

  // ==========================================
  // 4. TRADITIONAL RED LEDGER (खाता बही)
  // ==========================================
  const ledgerGroup = new THREE.Group();
  ledgerGroup.name = 'RedLedger';
  ledgerGroup.position.set(1.3, -0.92, 0.25);
  ledgerGroup.rotation.y = -0.4;
  ledgerGroup.rotation.x = 0.08;

  // Red cloth binding outer cover
  const coverGeo = new THREE.BoxGeometry(0.72, 0.05, 0.52);
  const coverMat = new THREE.MeshStandardMaterial({
    color: 0x9e2a2b, // Traditional Bahi-khata deep red cloth
    roughness: 0.7,
    metalness: 0.05,
  });
  disposables.push(coverGeo, coverMat);
  const coverMesh = new THREE.Mesh(coverGeo, coverMat);
  coverMesh.castShadow = true;
  coverMesh.receiveShadow = true;
  ledgerGroup.add(coverMesh);

  // Open pages with procedural ruled Hindi ledger texture
  const ledgerTex = createLedgerTexture();
  disposables.push(ledgerTex);
  const pagesGeo = new THREE.PlaneGeometry(0.68, 0.48);
  disposables.push(pagesGeo);
  const pagesMat = new THREE.MeshStandardMaterial({
    map: ledgerTex,
    roughness: 0.85,
    metalness: 0.0,
  });
  disposables.push(pagesMat);
  const pagesMesh = new THREE.Mesh(pagesGeo, pagesMat);
  pagesMesh.rotation.x = -Math.PI / 2;
  pagesMesh.position.y = 0.026;
  pagesMesh.receiveShadow = true;
  ledgerGroup.add(pagesMesh);

  // Ballpoint pen resting on ledger
  const penGroup = new THREE.Group();
  const penBodyGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.38, 16);
  const penBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // Classic Reynolds blue pen
    roughness: 0.3,
    metalness: 0.1,
  });
  const penCapGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.1, 16);
  const penCapMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
  });
  const penTipGeo = new THREE.ConeGeometry(0.012, 0.03, 16);
  const penTipMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Brass ballpoint tip
    metalness: 0.9,
    roughness: 0.2,
  });
  disposables.push(penBodyGeo, penBodyMat, penCapGeo, penCapMat, penTipGeo, penTipMat);

  const penBody = new THREE.Mesh(penBodyGeo, penBodyMat);
  penGroup.add(penBody);

  const penCap = new THREE.Mesh(penCapGeo, penCapMat);
  penCap.position.y = 0.15;
  penGroup.add(penCap);

  const penTip = new THREE.Mesh(penTipGeo, penTipMat);
  penTip.position.y = -0.20;
  penTip.rotation.x = Math.PI;
  penGroup.add(penTip);

  penGroup.position.set(0.12, 0.04, 0.05);
  penGroup.rotation.z = Math.PI / 2.8;
  penGroup.rotation.y = 0.15;
  ledgerGroup.add(penGroup);

  rootGroup.add(ledgerGroup);

  // ==========================================
  // 5. BRASS WEIGHTS (भारतीय किराना बाँट - 1kg & 500g)
  // ==========================================
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Polished aged brass
    metalness: 0.92,
    roughness: 0.24,
  });
  disposables.push(brassMat);

  // 1kg Hexagonal weight
  const weight1KgGroup = new THREE.Group();
  weight1KgGroup.position.set(-0.05, -0.95, 0.55);
  const w1Geo = new THREE.CylinderGeometry(0.11, 0.12, 0.12, 8); // Hexagonal profile
  const w1KnobGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.06, 16);
  disposables.push(w1Geo, w1KnobGeo);
  const w1Mesh = new THREE.Mesh(w1Geo, brassMat);
  w1Mesh.castShadow = true;
  w1Mesh.position.y = 0.06;
  weight1KgGroup.add(w1Mesh);
  const w1Knob = new THREE.Mesh(w1KnobGeo, brassMat);
  w1Knob.position.y = 0.15;
  weight1KgGroup.add(w1Knob);
  rootGroup.add(weight1KgGroup);

  // 500g Smaller hexagonal weight
  const weight500gGroup = new THREE.Group();
  weight500gGroup.position.set(0.12, -0.96, 0.6);
  const w2Geo = new THREE.CylinderGeometry(0.08, 0.09, 0.09, 8);
  const w2KnobGeo = new THREE.CylinderGeometry(0.026, 0.022, 0.05, 16);
  disposables.push(w2Geo, w2KnobGeo);
  const w2Mesh = new THREE.Mesh(w2Geo, brassMat);
  w2Mesh.castShadow = true;
  w2Mesh.position.y = 0.045;
  weight500gGroup.add(w2Mesh);
  const w2Knob = new THREE.Mesh(w2KnobGeo, brassMat);
  w2Knob.position.y = 0.115;
  weight500gGroup.add(w2Knob);
  rootGroup.add(weight500gGroup);

  // ==========================================
  // 6. SPICE JAR (मसाला जार)
  // ==========================================
  const jarGroup = new THREE.Group();
  jarGroup.name = 'SpiceJar';
  jarGroup.position.set(-1.65, -0.72, 0.3);

  // Glass jar outer cylinder
  const jarGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.52, 24);
  const jarMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.85,
    opacity: 1,
    transparent: true,
    roughness: 0.1,
    ior: 1.5,
    thickness: 0.2,
  });
  disposables.push(jarGeo, jarMat);
  const jarMesh = new THREE.Mesh(jarGeo, jarMat);
  jarMesh.castShadow = true;
  jarGroup.add(jarMesh);

  // Spice interior contents (Vibrant Turmeric / Haldi gold powder)
  const spiceGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.38, 20);
  const spiceMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Warm turmeric gold
    roughness: 0.9,
  });
  disposables.push(spiceGeo, spiceMat);
  const spiceMesh = new THREE.Mesh(spiceGeo, spiceMat);
  spiceMesh.position.y = -0.06;
  jarGroup.add(spiceMesh);

  // Metal twist lid
  const lidGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 24);
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0xc4cac6,
    metalness: 0.8,
    roughness: 0.3,
  });
  disposables.push(lidGeo, lidMat);
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.position.y = 0.285;
  jarGroup.add(lidMesh);

  rootGroup.add(jarGroup);

  // Dispose helper
  const dispose = () => {
    disposables.forEach((item) => item.dispose());
  };

  return {
    group: rootGroup,
    saltPouch: saltGroup,
    sugarPouch: sugarGroup,
    weighingScale: scaleGroup,
    ledger: ledgerGroup,
    brassWeight1: weight1KgGroup,
    brassWeight2: weight500gGroup,
    spiceJar: jarGroup,
    scaleDisplayMaterial,
    updateScaleWeight,
    dispose,
  };
}
