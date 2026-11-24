import * as THREE from 'three';
import * as xb from 'xrblocks';
import type { Incident, Language } from '../types.ts';
import { latLngToScene } from '../twin/CityTwinEngine.ts';

export class XRCityScript extends xb.Script {
  private incidents: Incident[];
  private language: Language;
  private onExitXR: () => void;

  private dioramaGroup = new THREE.Group();
  private floodPlane!: THREE.Mesh;
  private beacons: THREE.Mesh[] = [];
  private statusText!: xb.UIText;
  private floodEnabled = false;
  private elapsed = 0;

  constructor(incidents: Incident[], language: Language, onExitXR: () => void) {
    super();
    this.incidents = incidents;
    this.language = language;
    this.onExitXR = onExitXR;
  }

  init(): void {
    this.add(new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 2.2));
    const dirLight = new THREE.DirectionalLight(0xfff1d6, 2.6);
    dirLight.position.set(1.5, 3.5, 2.0);
    this.add(dirLight);

    // Tabletop Holographic Shymkent Diorama
    this.dioramaGroup.position.set(0, 1.05, -1.05);
    this.dioramaGroup.scale.setScalar(0.015);
    this.dioramaGroup.xb = { manipulation: true };

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(66, 2, 66),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.2 })
    );
    base.position.y = -1;
    this.dioramaGroup.add(base);

    const grid = new THREE.GridHelper(64, 16, 0x00d4e8, 0x1e293b);
    grid.position.y = 0.05;
    this.dioramaGroup.add(grid);

    // Akimat Dome landmark
    const akimat = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.7, 3.6, 18),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 })
    );
    akimat.position.set(12, 1.8, -18);
    this.dioramaGroup.add(akimat);

    // Citadel landmark
    const citadel = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2.4, 4),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.65 })
    );
    citadel.position.set(2, 1.2, 12);
    this.dioramaGroup.add(citadel);

    // Flood simulation plane
    this.floodPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(62, 62),
      new THREE.MeshStandardMaterial({
        color: 0x00d4e8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
      })
    );
    this.floodPlane.rotation.x = -Math.PI / 2;
    this.floodPlane.position.y = 0.6;
    this.floodPlane.visible = false;
    this.dioramaGroup.add(this.floodPlane);

    // Incident beacons
    this.incidents.slice(0, 14).forEach((inc) => {
      const { x, z } = latLngToScene(inc.lat, inc.lng);
      const color =
        inc.severity === 'critical'
          ? 0xef4444
          : inc.severity === 'high'
            ? 0xf97316
            : inc.severity === 'medium'
              ? 0xf59e0b
              : 0x22c55e;
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 3.6, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
      );
      marker.position.set(x * 0.7, 2.1, z * 0.7);
      marker.rotation.x = Math.PI;
      this.dioramaGroup.add(marker);
      this.beacons.push(marker);
    });

    this.add(this.dioramaGroup);

    // Spatial UI Card floating beside the city table
    const titleLabel =
      this.language === 'kk'
        ? 'QalaQauip XR Кеңістік'
        : this.language === 'ru'
          ? 'QalaQauip XR Пространство'
          : 'QalaQauip XR Spatial Twin';

    this.statusText = new xb.UIText({
      text:
        this.language === 'kk'
          ? `Белсенді оқиғалар: ${this.incidents.length}`
          : this.language === 'ru'
            ? `Активных инцидентов: ${this.incidents.length}`
            : `Active incidents: ${this.incidents.length}`,
      style: { fontSize: 18, opacity: 0.85, textAlign: 'center' },
    });

    const card = new xb.UICard({
      size: { width: 0.56, height: 'auto' },
      manipulation: true,
      edge: true,
      style: { flexDirection: 'column', gap: 14, padding: 18 },
      children: [
        new xb.UIExitButton(),
        new xb.UIText({
          text: titleLabel,
          style: { fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
        }),
        this.statusText,
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 10 },
          children: [
            new xb.UIButton({
              label: this.language === 'kk' ? 'Су басу' : this.language === 'ru' ? 'Потоп' : 'Flood Sim',
              icon: 'water_drop',
              style: { flexGrow: 1 },
              onClick: () => {
                this.floodEnabled = !this.floodEnabled;
                this.floodPlane.visible = this.floodEnabled;
                this.statusText.text = this.floodEnabled
                  ? 'Flood Simulation Active'
                  : `Active incidents: ${this.incidents.length}`;
              },
            }),
            new xb.UIButton({
              label: this.language === 'kk' ? '2D Жүйеге қайту' : this.language === 'ru' ? 'Назад в 2D' : 'Exit XR',
              icon: 'close',
              style: { flexGrow: 1 },
              onClick: () => this.onExitXR(),
            }),
          ],
        }),
      ],
    });
    card.position.set(0.58, 1.38, -1.12);
    card.rotation.y = -0.32;
    this.add(card);
  }

  update(): void {
    const dt = xb.getDeltaTime();
    this.elapsed += dt;
    this.dioramaGroup.rotation.y += dt * 0.08;
    for (let i = 0; i < this.beacons.length; i++) {
      this.beacons[i].position.y = 2.1 + Math.sin(this.elapsed * 3 + i) * 0.35;
    }
  }

  dispose(): void {
    this.dioramaGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
