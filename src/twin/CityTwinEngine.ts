import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Incident, SeverityLevel } from '../types.ts';

export type TwinSimulationMode = 'none' | 'flood' | 'closure' | 'congestion' | 'outage';

const CENTER_LAT = 42.3417;
const CENTER_LNG = 69.5901;

export function latLngToScene(lat: number, lng: number): { x: number; z: number } {
  // Shymkent local tangent plane projection (~111km/deg lat, ~82km/deg lng)
  const x = (lng - CENTER_LNG) * 950;
  const z = -(lat - CENTER_LAT) * 1250;
  return {
    x: Math.max(-42, Math.min(42, x)),
    z: Math.max(-42, Math.min(42, z)),
  };
}

function createRoadGridTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0e1722';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle city parcel grid
  ctx.strokeStyle = 'rgba(0, 212, 232, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Major arterial roads
  ctx.fillStyle = '#1b2634';
  ctx.fillRect(238, 0, 36, 512);
  ctx.fillRect(0, 238, 512, 36);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

function buildWaterTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#0c4a6e');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0e7490');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.24)';
  ctx.lineWidth = 2;
  for (let y = 16; y < 256; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y - 6, 192, y + 6, 256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

const SEVERITY_HEX: Record<SeverityLevel, number> = {
  low: 0x22c55e,
  medium: 0xf59e0b,
  high: 0xf97316,
  critical: 0xef4444,
};

export class CityTwinEngine {
  private container: HTMLElement;
  private onSelectIncident?: (incidentId: string) => void;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;

  private roadTex: THREE.CanvasTexture;
  private waterTex: THREE.CanvasTexture;
  private floodMesh: THREE.Mesh;
  private closureGroup: THREE.Group;
  private outageRing: THREE.Mesh;
  private beaconsGroup: THREE.Group;
  private vehiclesMesh: THREE.InstancedMesh;
  private streetLampBulbs: THREE.InstancedMesh;
  private vehicleOffsets: { lane: number; pos: number; speed: number; axis: 'x' | 'z' }[] = [];

  private simMode: TwinSimulationMode = 'none';
  private beaconObjects: { mesh: THREE.Group; baseScale: number; phase: number; incidentId: string }[] = [];
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private _dummyMat = new THREE.Matrix4();
  private _dummyPos = new THREE.Vector3();
  private _dummyQuat = new THREE.Quaternion();
  private _dummyScale = new THREE.Vector3(1, 1, 1);

  private isSoftwareGl = false;
  private rafId: number | null = null;
  private disposed = false;
  private prevTime = performance.now();
  private elapsed = 0;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, onSelectIncident?: (incidentId: string) => void) {
    this.container = container;
    this.onSelectIncident = onSelectIncident;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const gl = this.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    this.isSoftwareGl = /SwiftShader|llvmpipe|Microsoft Basic Render Driver/i.test(rendererStr);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080d14);
    this.scene.fog = new THREE.FogExp2(0x080d14, 0.0085);

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 260);
    this.camera.position.set(34, 26, 38);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 95;
    this.controls.target.set(0, 1.5, 0);

    // Environment reflections
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = this.pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();

    // Lighting rig: warm key sun + cool sky fill
    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.7);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
    sun.position.set(28, 42, 22);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 110;
    const d = 46;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.roadTex = createRoadGridTexture(maxAniso);
    this.waterTex = buildWaterTexture(maxAniso);

    this.buildTerrainAndDistricts();
    this.buildLandmarks();
    const { vehiclesMesh, streetLampBulbs } = this.buildCityFabric();
    this.vehiclesMesh = vehiclesMesh;
    this.streetLampBulbs = streetLampBulbs;

    // Simulation layers
    this.floodMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(96, 96),
      new THREE.MeshStandardMaterial({
        map: this.waterTex,
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.48,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    this.floodMesh.rotation.x = -Math.PI / 2;
    this.floodMesh.position.y = -0.3;
    this.floodMesh.visible = false;
    this.scene.add(this.floodMesh);

    this.closureGroup = this.buildRoadClosureCones();
    this.closureGroup.visible = false;
    this.scene.add(this.closureGroup);

    this.outageRing = new THREE.Mesh(
      new THREE.RingGeometry(4.5, 11.5, 48),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    this.outageRing.rotation.x = -Math.PI / 2;
    this.outageRing.position.set(14, 0.15, -16);
    this.outageRing.visible = false;
    this.scene.add(this.outageRing);

    this.beaconsGroup = new THREE.Group();
    this.scene.add(this.beaconsGroup);

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  private buildTerrainAndDistricts(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(96, 96),
      new THREE.MeshStandardMaterial({
        map: this.roadTex,
        roughness: 0.85,
        metalness: 0.1,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Badam River channel along southern Shymkent
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(96, 6.2),
      new THREE.MeshStandardMaterial({
        map: this.waterTex,
        color: 0x0284c7,
        roughness: 0.18,
        metalness: 0.4,
      })
    );
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -0.14;
    river.position.set(0, 0.04, 24);
    this.scene.add(river);
  }

  private buildLandmarks(): void {
    // 1. Shymkent Old Citadel Mound & Towers (Al-Farabi)
    const citadel = new THREE.Group();
    citadel.position.set(2, 0, 12);
    const hill = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 5.6, 1.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
    );
    hill.position.y = 0.9;
    hill.castShadow = true;
    hill.receiveShadow = true;
    citadel.add(hill);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 3.4), wallMat);
    keep.position.y = 2.7;
    keep.castShadow = true;
    citadel.add(keep);

    for (const [tx, tz] of [
      [-1.7, -1.7],
      [1.7, -1.7],
      [-1.7, 1.7],
      [1.7, 1.7],
    ]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.8, 10), wallMat);
      tower.position.set(tx, 3.1, tz);
      tower.castShadow = true;
      citadel.add(tower);
    }
    this.scene.add(citadel);

    // 2. Akimat Dome Complex (Karatau / Nursat)
    const akimat = new THREE.Group();
    akimat.position.set(12, 0, -18);
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.6, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    podium.position.y = 0.3;
    akimat.add(podium);

    const hall = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.8, 3.4, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.2 })
    );
    hall.position.y = 2.3;
    hall.castShadow = true;
    akimat.add(hall);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x00d4e8, roughness: 0.25, metalness: 0.7 })
    );
    dome.position.y = 4.0;
    akimat.add(dome);
    this.scene.add(akimat);

    // 3. Independence Monument Obelisk
    const monument = new THREE.Group();
    monument.position.set(-4, 0, 8);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.1, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    base.position.y = 0.35;
    monument.add(base);
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.45, 6.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.3 })
    );
    spire.position.y = 3.7;
    monument.add(spire);
    const crown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 })
    );
    crown.position.y = 7.0;
    monument.add(crown);
    this.scene.add(monument);

    // 4. Badam River Arched Bridge
    const bridge = new THREE.Group();
    bridge.position.set(16, 0.2, 21.8);
    bridge.rotation.y = 0.12;
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.4, 9.2),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65 })
    );
    deck.position.y = 0.65;
    bridge.add(deck);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.18, 8, 28, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x00d4e8, metalness: 0.7, roughness: 0.3 })
    );
    arch.rotation.y = Math.PI / 2;
    arch.position.y = 0.7;
    bridge.add(arch);
    this.scene.add(bridge);
  }

  private buildCityFabric(): {
    vehiclesMesh: THREE.InstancedMesh;
    streetLampBulbs: THREE.InstancedMesh;
  } {
    // Instanced urban buildings (avoiding road corridors & river)
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x1e2b3a, roughness: 0.62, metalness: 0.28 });
    const bCount = 130;
    const buildings = new THREE.InstancedMesh(bGeo, bMat, bCount);
    buildings.castShadow = true;
    buildings.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const toneColor = new THREE.Color();
    let idx = 0;
    for (let i = 0; i < bCount * 2 && idx < bCount; i++) {
      const gx = ((i * 73) % 74) - 37;
      const gz = ((i * 47) % 62) - 34;
      if (Math.abs(gx) < 3.5 || Math.abs(gz) < 3.5 || gz > 18) continue;
      if (Math.hypot(gx - 12, gz + 18) < 7 || Math.hypot(gx - 2, gz - 12) < 7) continue;

      const w = 1.6 + ((i * 13) % 24) / 10;
      const d = 1.6 + ((i * 19) % 24) / 10;
      const h = 1.8 + ((i * 29) % 75) / 10;
      dummy.position.set(gx, h / 2, gz);
      dummy.scale.set(w, h, d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      buildings.setMatrixAt(idx, dummy.matrix);

      const shade = 0.14 + ((i * 11) % 12) * 0.015;
      toneColor.setRGB(shade, shade + 0.05, shade + 0.12);
      buildings.setColorAt(idx, toneColor);
      idx++;
    }
    buildings.count = idx;
    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
    this.scene.add(buildings);

    // Instanced trees along parks & riverbanks
    const treeCount = 60;
    const foliage = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.65, 1.9, 7),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 }),
      treeCount
    );
    for (let i = 0; i < treeCount; i++) {
      const x = ((i * 37) % 76) - 38;
      const z = i < 30 ? 18 + (i % 4) : ((i * 23) % 44) - 24;
      if (Math.abs(x) < 2.8) continue;
      dummy.position.set(x, 1.05, z);
      dummy.scale.setScalar(0.8 + (i % 5) * 0.12);
      dummy.updateMatrix();
      foliage.setMatrixAt(i, dummy.matrix);
    }
    foliage.instanceMatrix.needsUpdate = true;
    this.scene.add(foliage);

    // Streetlamp bulbs along main avenues
    const lampCount = 28;
    const streetLampBulbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfde68a }),
      lampCount
    );
    let li = 0;
    for (let p = -36; p <= 36 && li < lampCount; p += 12) {
      dummy.position.set(2.4, 2.4, p);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      streetLampBulbs.setMatrixAt(li++, dummy.matrix);
      if (li < lampCount) {
        dummy.position.set(p, 2.4, 2.4);
        dummy.updateMatrix();
        streetLampBulbs.setMatrixAt(li++, dummy.matrix);
      }
    }
    streetLampBulbs.count = li;
    streetLampBulbs.instanceMatrix.needsUpdate = true;
    this.scene.add(streetLampBulbs);

    // Moving traffic vehicles (InstancedMesh)
    const vCount = 24;
    const vehiclesMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.7, 0.42, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.4 }),
      vCount
    );
    for (let i = 0; i < vCount; i++) {
      const axis = i % 2 === 0 ? 'z' : 'x';
      const lane = i % 4 < 2 ? 1.1 : -1.1;
      const dir = lane > 0 ? 1 : -1;
      this.vehicleOffsets.push({
        axis,
        lane,
        pos: ((i * 11) % 80) - 40,
        speed: dir * (3.5 + (i % 4) * 1.1),
      });
    }
    this.scene.add(vehiclesMesh);

    return { vehiclesMesh, streetLampBulbs };
  }

  private buildRoadClosureCones(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, 0, -4);
    const coneGeo = new THREE.ConeGeometry(0.4, 1.1, 10);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    for (let i = -2; i <= 2; i++) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(i * 0.9, 0.55, 0);
      group.add(cone);
    }
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.3, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    bar.position.y = 0.9;
    group.add(bar);
    return group;
  }

  public syncIncidents(incidents: Incident[]): void {
    while (this.beaconsGroup.children.length > 0) {
      const child = this.beaconsGroup.children[0];
      this.beaconsGroup.remove(child);
    }
    this.beaconObjects = [];

    incidents.slice(0, 30).forEach((inc, idx) => {
      const { x, z } = latLngToScene(inc.lat, inc.lng);
      const color = SEVERITY_HEX[inc.severity];
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.userData.incidentId = inc.id;

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.35, 4.2, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
      );
      pillar.position.y = 2.1;
      pillar.userData.incidentId = inc.id;
      group.add(pillar);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 16, 16),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.85,
          roughness: 0.2,
        })
      );
      orb.position.y = 4.6;
      orb.userData.incidentId = inc.id;
      group.add(orb);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.35, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.12;
      group.add(ring);

      this.beaconsGroup.add(group);
      this.beaconObjects.push({
        mesh: group,
        baseScale: inc.severity === 'critical' ? 1.25 : 1,
        phase: idx * 0.7,
        incidentId: inc.id,
      });
    });
  }

  public setSimulationMode(mode: TwinSimulationMode): void {
    this.simMode = mode;
    this.floodMesh.visible = mode === 'flood';
    this.closureGroup.visible = mode === 'closure';
    this.outageRing.visible = mode === 'outage';

    const lampMat = this.streetLampBulbs.material as THREE.MeshBasicMaterial;
    lampMat.color.setHex(mode === 'outage' ? 0x334155 : 0xfde68a);
  }

  public resetCamera(): void {
    this.camera.position.set(34, 26, 38);
    this.controls.target.set(0, 1.5, 0);
    this.controls.update();
  }

  private handlePointerDown = (ev: PointerEvent): void => {
    if (!this.onSelectIncident) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.beaconsGroup.children, true);
    if (hits.length > 0) {
      const incidentId = hits[0].object.userData.incidentId as string | undefined;
      if (incidentId) this.onSelectIncident(incidentId);
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;
    this.elapsed += dt;

    this.controls.update();

    // Scroll water UVs
    this.waterTex.offset.x += dt * 0.04;

    if (this.simMode === 'flood') {
      const targetY = 0.85 + Math.sin(this.elapsed * 1.4) * 0.14;
      this.floodMesh.position.y = THREE.MathUtils.damp(this.floodMesh.position.y, targetY, 4, dt);
    }

    // Update moving vehicles
    const speedMult = this.simMode === 'congestion' || this.simMode === 'closure' ? 0.18 : 1;
    for (let i = 0; i < this.vehicleOffsets.length; i++) {
      const v = this.vehicleOffsets[i];
      v.pos += v.speed * speedMult * dt;
      if (v.pos > 42) v.pos = -42;
      if (v.pos < -42) v.pos = 42;

      if (v.axis === 'z') {
        this._dummyPos.set(v.lane, 0.25, v.pos);
        this._dummyQuat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, 0);
      } else {
        this._dummyPos.set(v.pos, 0.25, v.lane);
        this._dummyQuat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2);
      }
      this._dummyMat.compose(this._dummyPos, this._dummyQuat, this._dummyScale);
      this.vehiclesMesh.setMatrixAt(i, this._dummyMat);
    }
    this.vehiclesMesh.instanceMatrix.needsUpdate = true;

    // Pulse incident beacons
    for (let i = 0; i < this.beaconObjects.length; i++) {
      const b = this.beaconObjects[i];
      const pulse = 1 + Math.sin(this.elapsed * 3.2 + b.phase) * 0.12;
      b.mesh.scale.setScalar(b.baseScale * pulse);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.controls.dispose();
    this.roadTex.dispose();
    this.waterTex.dispose();
    this.envRT.dispose();
    this.pmremGenerator.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
