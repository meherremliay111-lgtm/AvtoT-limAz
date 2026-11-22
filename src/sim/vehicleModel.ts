import * as THREE from 'three';

export interface BmwM5Rig {
  group: THREE.Group;
  bodyTiltGroup: THREE.Group;
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  wheelRolls: THREE.Object3D[];
  steeringWheel: THREE.Group;
  headlightSpots: THREE.SpotLight[];
  headlightMeshes: THREE.Mesh[];
  brakeLightMeshes: THREE.Mesh[];
  reverseLightMeshes: THREE.Mesh[];
  leftIndicatorMeshes: THREE.Mesh[];
  rightIndicatorMeshes: THREE.Mesh[];
  speedNeedle: THREE.Mesh;
  rpmNeedle: THREE.Mesh;
  wiperLeft: THREE.Group;
  wiperRight: THREE.Group;
  trainingRoofSign: THREE.Group;
  paintMaterial: THREE.MeshPhysicalMaterial;
}

function createPlateTexture(plateText: string, isPolice = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isPolice ? '#F8FAFC' : '#FFFFFF';
  ctx.fillRect(0, 0, 256, 64);

  // Left blue AZ strip
  ctx.fillStyle = '#0284C7';
  ctx.fillRect(0, 0, 38, 64);

  // Tiny AZ flag bars + text
  ctx.fillStyle = '#00B5E2';
  ctx.fillRect(6, 8, 26, 5);
  ctx.fillStyle = '#EF3340';
  ctx.fillRect(6, 13, 26, 5);
  ctx.fillStyle = '#509E2F';
  ctx.fillRect(6, 18, 26, 5);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AZ', 19, 50);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plateText, 147, 34);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWheelAssembly(radius = 0.35, width = 0.26): { pivot: THREE.Group; rollGroup: THREE.Group } {
  const pivot = new THREE.Group();
  const rollGroup = new THREE.Group();

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.85,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.9,
  });
  const darkRimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.85,
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.4,
  });

  // Tire cylinder
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  rollGroup.add(tire);

  // Inner barrel
  const barrelGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width * 0.92, 20);
  barrelGeo.rotateZ(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, darkRimMat);
  rollGroup.add(barrel);

  // 5-twin-spoke M alloy face
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const spokeGeo = new THREE.BoxGeometry(width * 0.14, radius * 1.24, 0.04);
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = angle;
    spoke.position.x = width * 0.39 * (width > 0 ? 1 : -1);
    // Keep spokes centered along X on both sides
    spoke.position.x = 0;
    rollGroup.add(spoke);
  }

  const hubGeo = new THREE.CylinderGeometry(0.075, 0.075, width * 0.98, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, rimMat);
  rollGroup.add(hub);

  // Brake caliper (does not spin, attached to pivot)
  const caliperGeo = new THREE.BoxGeometry(0.12, 0.16, 0.11);
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(0, 0.08, -radius * 0.35);
  pivot.add(caliper);

  pivot.add(rollGroup);
  return { pivot, rollGroup };
}

export function buildBmwM5(colorHex: string, showTrainingSign: boolean): BmwM5Rig {
  const group = new THREE.Group();
  const bodyTiltGroup = new THREE.Group();
  group.add(bodyTiltGroup);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    metalness: 0.65,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.38,
    metalness: 0.55,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e242c,
    roughness: 0.28,
    metalness: 0.45,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.15,
  });

  // 1. Lower chassis & sculpted side skirts (BMW M5 proportions ~4.96m long x 1.90m wide)
  const lowerBodyGeo = new THREE.BoxGeometry(1.88, 0.54, 4.86);
  const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMat);
  lowerBody.position.set(0, 0.56, 0);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  bodyTiltGroup.add(lowerBody);

  // Front sculpted M-Sport bumper & splitter (+Z is forward? Let's make -Z forward in Three.js standard! Wait: let's define local forward = +Z or -Z cleanly. Let's make -Z forward so camera behind is +Z!)
  // Let's standardize: LOCAL -Z IS FORWARD! +Z IS REAR! -X IS LEFT, +X IS RIGHT!
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.32, 0.32), paintMat);
  frontBumper.position.set(0, 0.41, -2.38);
  frontBumper.castShadow = true;
  bodyTiltGroup.add(frontBumper);

  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.38), carbonMat);
  frontSplitter.position.set(0, 0.24, -2.42);
  bodyTiltGroup.add(frontSplitter);

  // Lower air intake grille
  const airIntake = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.16, 0.08), trimMat);
  airIntake.position.set(0, 0.34, -2.53);
  bodyTiltGroup.add(airIntake);

  // BMW Signature Double Kidney Grille (at -Z front)
  for (const side of [-1, 1]) {
    const kidneyFrame = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.06), trimMat);
    kidneyFrame.position.set(side * 0.21, 0.57, -2.47);
    bodyTiltGroup.add(kidneyFrame);

    const kidneyInner = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.18, 0.07), carbonMat);
    kidneyInner.position.set(side * 0.21, 0.57, -2.48);
    bodyTiltGroup.add(kidneyInner);
  }

  // Hood with M5 power bulge
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 1.56), paintMat);
  hood.position.set(0, 0.84, -1.62);
  hood.rotation.x = 0.06;
  hood.castShadow = true;
  bodyTiltGroup.add(hood);

  const powerDome = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 1.2), paintMat);
  powerDome.position.set(0, 0.89, -1.55);
  powerDome.rotation.x = 0.06;
  bodyTiltGroup.add(powerDome);

  // Cabin roof & pillars (hollow inside for First-Person cockpit view!)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.85), carbonMat);
  roof.position.set(0, 1.38, 0.18);
  roof.castShadow = true;
  bodyTiltGroup.add(roof);

  // A-pillars, B-pillars, C-pillars
  for (const side of [-1, 1]) {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.09), trimMat);
    aPillar.position.set(side * 0.74, 1.12, -0.78);
    aPillar.rotation.x = -0.58;
    bodyTiltGroup.add(aPillar);

    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.11), trimMat);
    bPillar.position.set(side * 0.76, 1.12, 0.12);
    bodyTiltGroup.add(bPillar);

    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.58, 0.24), paintMat);
    cPillar.position.set(side * 0.75, 1.12, 1.08);
    cPillar.rotation.x = 0.56;
    bodyTiltGroup.add(cPillar);

    // Side mirrors
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.07), trimMat);
    mirrorArm.position.set(side * 0.94, 0.93, -0.58);
    bodyTiltGroup.add(mirrorArm);

    const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.14), paintMat);
    mirrorCap.position.set(side * 1.03, 0.95, -0.56);
    bodyTiltGroup.add(mirrorCap);

    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.085),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.05 })
    );
    mirrorGlass.position.set(side * 1.03, 0.95, -0.485);
    bodyTiltGroup.add(mirrorGlass);
  }

  // Windshield & rear glass
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.82), glassMat);
  windshield.position.set(0, 1.14, -0.78);
  windshield.rotation.x = -0.96;
  bodyTiltGroup.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.76), glassMat);
  rearGlass.position.set(0, 1.14, 1.16);
  rearGlass.rotation.x = 1.02;
  bodyTiltGroup.add(rearGlass);

  // Trunk & M5 Carbon Lip Spoiler
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 0.85), paintMat);
  trunk.position.set(0, 0.86, 1.98);
  trunk.castShadow = true;
  bodyTiltGroup.add(trunk);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.05, 0.12), carbonMat);
  spoiler.position.set(0, 0.95, 2.38);
  bodyTiltGroup.add(spoiler);

  // Rear diffuser & Quad M exhaust pipes
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 0.16), carbonMat);
  diffuser.position.set(0, 0.28, 2.41);
  bodyTiltGroup.add(diffuser);

  for (const offset of [-0.62, -0.46, 0.46, 0.62]) {
    const tipGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.14, 12);
    tipGeo.rotateX(Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, chromeMat);
    tip.position.set(offset, 0.25, 2.48);
    bodyTiltGroup.add(tip);
  }

  // Azerbaijan License Plates (front & rear: 90-MB-202)
  const plateTex = createPlateTexture('90-MB-202');
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4 });
  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), plateMat);
  frontPlate.position.set(0, 0.36, -2.55);
  frontPlate.rotation.y = Math.PI;
  bodyTiltGroup.add(frontPlate);

  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), plateMat);
  rearPlate.position.set(0, 0.56, 2.445);
  bodyTiltGroup.add(rearPlate);

  // Headlights (LED Angel-eye style) & SpotLights
  const headlightMeshes: THREE.Mesh[] = [];
  const headlightSpots: THREE.SpotLight[] = [];
  const leftIndicatorMeshes: THREE.Mesh[] = [];
  const rightIndicatorMeshes: THREE.Mesh[] = [];

  for (const side of [-1, 1]) {
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: new THREE.Color(0xbae6fd),
      emissiveIntensity: 0.4,
      roughness: 0.1,
    });
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.08), hlMat);
    hl.position.set(side * 0.66, 0.61, -2.44);
    bodyTiltGroup.add(hl);
    headlightMeshes.push(hl);

    // SpotLight pointing forward (-Z)
    const spot = new THREE.SpotLight(0xf0f9ff, 0, 75, Math.PI / 5, 0.45, 1.4);
    spot.position.set(side * 0.66, 0.64, -2.45);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(side * 0.5, 0.1, -26);
    bodyTiltGroup.add(targetObj);
    spot.target = targetObj;
    bodyTiltGroup.add(spot);
    headlightSpots.push(spot);

    // Front Turn Signal
    const indMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const frontInd = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.09), indMat);
    frontInd.position.set(side * 0.8, 0.56, -2.43);
    bodyTiltGroup.add(frontInd);
    if (side < 0) leftIndicatorMeshes.push(frontInd);
    else rightIndicatorMeshes.push(frontInd);

    // Rear Turn Signal
    const rearInd = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.07), indMat.clone());
    rearInd.position.set(side * 0.72, 0.66, 2.44);
    bodyTiltGroup.add(rearInd);
    if (side < 0) leftIndicatorMeshes.push(rearInd);
    else rightIndicatorMeshes.push(rearInd);
  }

  // Brake / Taillights (L-shaped crimson LED)
  const brakeLightMeshes: THREE.Mesh[] = [];
  const reverseLightMeshes: THREE.Mesh[] = [];

  for (const side of [-1, 1]) {
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: 0.45,
      roughness: 0.15,
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.07), tailMat);
    tail.position.set(side * 0.66, 0.72, 2.44);
    bodyTiltGroup.add(tail);
    brakeLightMeshes.push(tail);

    const revMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0,
      roughness: 0.15,
    });
    const rev = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.07), revMat);
    rev.position.set(side * 0.42, 0.72, 2.44);
    bodyTiltGroup.add(rev);
    reverseLightMeshes.push(rev);
  }

  // Interior Cockpit (Dashboard, Gauges, M5 Steering Wheel) — visible in First Person!
  const dashBase = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.28, 0.52), trimMat);
  dashBase.position.set(0, 0.78, -0.82);
  bodyTiltGroup.add(dashBase);

  const instrumentHood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.22), carbonMat);
  instrumentHood.position.set(-0.36, 0.94, -0.78);
  bodyTiltGroup.add(instrumentHood);

  // Speed & RPM gauge discs + animated needles
  const gaugeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const speedGauge = new THREE.Mesh(new THREE.CircleGeometry(0.065, 20), gaugeMat);
  speedGauge.position.set(-0.44, 0.94, -0.668);
  bodyTiltGroup.add(speedGauge);

  const rpmGauge = new THREE.Mesh(new THREE.CircleGeometry(0.065, 20), gaugeMat);
  rpmGauge.position.set(-0.28, 0.94, -0.668);
  bodyTiltGroup.add(rpmGauge);

  const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const speedNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.005), needleMat);
  speedNeedle.position.set(-0.44, 0.94, -0.664);
  bodyTiltGroup.add(speedNeedle);

  const rpmNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.005), needleMat);
  rpmNeedle.position.set(-0.28, 0.94, -0.664);
  bodyTiltGroup.add(rpmNeedle);

  // Rearview center mirror (inside cabin)
  const centerMirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.03), trimMat);
  centerMirror.position.set(0, 1.26, -0.52);
  bodyTiltGroup.add(centerMirror);

  // M5 Steering Wheel (Left-hand drive, X = -0.36)
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.36, 0.88, -0.54);
  steeringWheel.rotation.x = -0.32;

  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 10, 28), carbonMat);
  steeringWheel.add(wheelRim);

  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), trimMat);
  wheelHub.rotation.x = Math.PI / 2;
  steeringWheel.add(wheelHub);

  // Red M1 / M2 thumb accent + 3 spokes
  const spokeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.018), chromeMat);
  spokeLeft.position.x = -0.07;
  steeringWheel.add(spokeLeft);

  const spokeRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.018), chromeMat);
  spokeRight.position.x = 0.07;
  steeringWheel.add(spokeRight);

  const spokeBottom = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.018), chromeMat);
  spokeBottom.position.y = -0.07;
  steeringWheel.add(spokeBottom);

  const topStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.045, 0.046),
    new THREE.MeshStandardMaterial({ color: 0xdc2626 })
  );
  topStripe.position.y = 0.165;
  steeringWheel.add(topStripe);

  bodyTiltGroup.add(steeringWheel);

  // Windshield Wipers
  const wiperLeft = new THREE.Group();
  wiperLeft.position.set(-0.42, 0.91, -1.03);
  const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.02), trimMat);
  bladeL.position.set(0.26, 0, 0);
  wiperLeft.add(bladeL);
  bodyTiltGroup.add(wiperLeft);

  const wiperRight = new THREE.Group();
  wiperRight.position.set(0.08, 0.91, -1.03);
  const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.02, 0.02), trimMat);
  bladeR.position.set(0.24, 0, 0);
  wiperRight.add(bladeR);
  bodyTiltGroup.add(wiperRight);

  // Optional "TƏLİM" Roof Sign (PDF səh. 30, 58)
  const trainingRoofSign = new THREE.Group();
  trainingRoofSign.position.set(0, 1.48, 0.05);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 96;
  const sctx = signCanvas.getContext('2d')!;
  sctx.fillStyle = '#FFFFFF';
  sctx.fillRect(0, 0, 256, 96);
  sctx.strokeStyle = '#DC2626';
  sctx.lineWidth = 10;
  sctx.strokeRect(5, 5, 246, 86);
  sctx.fillStyle = '#0F172A';
  sctx.font = 'bold 46px sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('TƏLİM', 128, 48);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const roofBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.18, 0.16),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 })
  );
  trainingRoofSign.add(roofBox);
  trainingRoofSign.visible = showTrainingSign;
  bodyTiltGroup.add(trainingRoofSign);

  // 4 Wheels (Front Z = -1.48, Rear Z = +1.48, X = ±0.88)
  const fl = createWheelAssembly();
  fl.pivot.position.set(-0.88, 0.35, -1.48);
  group.add(fl.pivot);

  const fr = createWheelAssembly();
  fr.pivot.position.set(0.88, 0.35, -1.48);
  group.add(fr.pivot);

  const rl = createWheelAssembly();
  rl.pivot.position.set(-0.88, 0.35, 1.48);
  group.add(rl.pivot);

  const rr = createWheelAssembly();
  rr.pivot.position.set(0.88, 0.35, 1.48);
  group.add(rr.pivot);

  return {
    group,
    bodyTiltGroup,
    frontLeftPivot: fl.pivot,
    frontRightPivot: fr.pivot,
    wheelRolls: [fl.rollGroup, fr.rollGroup, rl.rollGroup, rr.rollGroup],
    steeringWheel,
    headlightSpots,
    headlightMeshes,
    brakeLightMeshes,
    reverseLightMeshes,
    leftIndicatorMeshes,
    rightIndicatorMeshes,
    speedNeedle,
    rpmNeedle,
    wiperLeft,
    wiperRight,
    trainingRoofSign,
    paintMaterial: paintMat,
  };
}

export type TrafficVehicleKind = 'sedan' | 'bus' | 'truck' | 'police';

export interface TrafficMeshRig {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  leftInd?: THREE.Mesh;
  rightInd?: THREE.Mesh;
}

export function buildTrafficVehicle(kind: TrafficVehicleKind, colorHex = '#64748B'): TrafficMeshRig {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.5 });

  const addWheel = (x: number, y: number, z: number, r = 0.34) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.24, 16), wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wg.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.58, r * 0.58, 0.25, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);
    group.add(wg);
    wheels.push(wg);
  };

  if (kind === 'bus') {
    // Baku-style Red/White City Bus (PDF p. 10, 37)
    const busRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.2 });
    const busWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.38, 2.35, 8.8), busRed);
    body.position.set(0, 1.56, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofBand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 8.82), busWhite);
    roofBand.position.set(0, 2.58, 0);
    group.add(roofBand);

    const windows = new THREE.Mesh(new THREE.BoxGeometry(2.41, 0.85, 8.1), glassMat);
    windows.position.set(0, 1.92, -0.05);
    group.add(windows);

    addWheel(-1.12, 0.46, -2.7, 0.46);
    addWheel(1.12, 0.46, -2.7, 0.46);
    addWheel(-1.12, 0.46, 2.6, 0.46);
    addWheel(1.12, 0.46, 2.6, 0.46);
    return { group, wheels };
  }

  if (kind === 'truck') {
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.3 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 6.8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    chassis.position.set(0, 0.56, 0);
    group.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.85, 1.9), cabMat);
    cab.position.set(0, 1.55, -2.35);
    cab.castShadow = true;
    group.add(cab);

    const cabWin = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.65, 1.2), glassMat);
    cabWin.position.set(0, 1.88, -2.6);
    group.add(cabWin);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.15, 4.7), cargoMat);
    cargo.position.set(0, 1.8, 1.05);
    cargo.castShadow = true;
    group.add(cargo);

    addWheel(-1.08, 0.45, -2.3, 0.45);
    addWheel(1.08, 0.45, -2.3, 0.45);
    addWheel(-1.08, 0.45, 2.1, 0.45);
    addWheel(1.08, 0.45, 2.1, 0.45);
    return { group, wheels };
  }

  // Sedan or DYP Police Patrol (PDF p. 6, 36)
  const isPolice = kind === 'police';
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isPolice ? '#f8fafc' : colorHex),
    metalness: 0.45,
    roughness: 0.28,
    clearcoat: 0.8,
  });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.54, 4.5), bodyMat);
  lower.position.set(0, 0.54, 0);
  lower.castShadow = true;
  lower.receiveShadow = true;
  group.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.56, 2.2), bodyMat);
  cabin.position.set(0, 1.06, 0.12);
  cabin.castShadow = true;
  group.add(cabin);

  const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 2.02), glassMat);
  win.position.set(0, 1.07, 0.12);
  group.add(win);

  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.6 });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.06), hlMat);
    hl.position.set(s * 0.62, 0.58, -2.25);
    group.add(hl);
  }

  addWheel(-0.84, 0.34, -1.38);
  addWheel(0.84, 0.34, -1.38);
  addWheel(-0.84, 0.34, 1.38);
  addWheel(0.84, 0.34, 1.38);

  if (isPolice) {
    // DYP Blue side stripes & YPX Roof Lightbar (PDF p. 6, 16)
    const blueStripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.18, 3.1), blueStripeMat);
    stripeL.position.set(0, 0.56, 0);
    group.add(stripeL);

    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.07, 0.24), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    barBase.position.set(0, 1.38, 0.05);
    group.add(barBase);

    const sirenRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.1, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.2 })
    );
    sirenRed.position.set(-0.32, 1.43, 0.05);
    group.add(sirenRed);

    const sirenBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.1, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.2 })
    );
    sirenBlue.position.set(0.32, 1.43, 0.05);
    group.add(sirenBlue);

    return { group, wheels, sirenRed, sirenBlue };
  }

  return { group, wheels };
}

export interface PedestrianRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
}

export function buildPedestrian(jacketColor = '#334155'): PedestrianRig {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(jacketColor), roughness: 0.75 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), jacketMat);
  torso.position.set(0, 1.12, 0);
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), skinMat);
  head.position.set(0, 1.58, 0);
  head.castShadow = true;
  group.add(head);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.76, 0.18), pantsMat);
  leftLeg.position.set(-0.11, 0.42, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.76, 0.18), pantsMat);
  rightLeg.position.set(0.11, 0.42, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 0.14), jacketMat);
  leftArm.position.set(-0.29, 1.12, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 0.14), jacketMat);
  rightArm.position.set(0.29, 1.12, 0);
  group.add(rightArm);

  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function buildCyclist(): { group: THREE.Group; frontWheel: THREE.Mesh; rearWheel: THREE.Mesh } {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

  const wheelGeo = new THREE.TorusGeometry(0.32, 0.035, 8, 20);
  wheelGeo.rotateY(Math.PI / 2);

  const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
  frontWheel.position.set(0, 0.34, -0.58);
  group.add(frontWheel);

  const rearWheel = new THREE.Mesh(wheelGeo, tireMat);
  rearWheel.position.set(0, 0.34, 0.58);
  group.add(rearWheel);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 1.12), frameMat);
  frame.position.set(0, 0.58, 0);
  group.add(frame);

  // Rider with safety helmet (PDF p. 26)
  const rider = buildPedestrian('#0ea5e9');
  rider.group.position.set(0, 0.32, 0.06);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
  );
  helmet.position.set(0, 1.62, 0);
  rider.group.add(helmet);
  group.add(rider.group);

  return { group, frontWheel, rearWheel };
}

export interface RegulatorRig {
  group: THREE.Group;
  rightArmPivot: THREE.Group;
  leftArmPivot: THREE.Group;
}

export function buildRegulatorOfficer(): RegulatorRig {
  const group = new THREE.Group();
  const uniformMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x4d7c0f,
    emissiveIntensity: 0.25,
    roughness: 0.45,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 });

  // Pedestal/platform visibility disk
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.85, 0.1, 20),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
  );
  base.position.y = 0.05;
  group.add(base);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.82, 0.22), uniformMat);
  legs.position.y = 0.51;
  legs.castShadow = true;
  group.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.64, 0.26), vestMat);
  torso.position.y = 1.24;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), skinMat);
  head.position.y = 1.72;
  group.add(head);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.1, 14), uniformMat);
  cap.position.y = 1.85;
  group.add(cap);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.3, 1.48, 0);
  const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.13), uniformMat);
  lArm.position.y = -0.25;
  leftArmPivot.add(lArm);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.3, 1.48, 0);
  const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.13), uniformMat);
  rArm.position.y = -0.25;
  rightArmPivot.add(rArm);

  // Glowing DYP Jezl baton (PDF p. 49)
  const baton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.48, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xef4444,
      emissiveIntensity: 0.7,
    })
  );
  baton.position.set(0, -0.68, 0);
  rightArmPivot.add(baton);
  group.add(rightArmPivot);

  return { group, rightArmPivot, leftArmPivot };
}
