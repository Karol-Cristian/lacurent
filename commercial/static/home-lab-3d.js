import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const HOUSE_MODEL_URL = "https://cdn.3dassets.dev/assets/24766/v1/model.glb";
const HOUSE_MODEL_SOURCE = "https://3dassets.dev/assets/voxel-city-districts-split-level-home-688923df";

const PARTS = {
  wall: { label: "Fațadă", editor: "envelope", measure: "wall", color: 0x3f745c },
  roof: { label: "Pod / acoperiș", editor: "envelope", measure: "roof", color: 0x3f745c },
  windows: { label: "Ferestre", editor: "envelope", measure: "windows", color: 0x41697a },
  floor: { label: "Pardoseală", editor: "envelope", measure: "floor", color: 0x3f745c },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function triggerExistingControl(selector) {
  const el = document.querySelector(selector);
  if (el instanceof HTMLElement) el.click();
}

class HomeLabHouse3D {
  constructor(mount) {
    this.mount = mount;
    this.mode = mount.dataset.hln3dStage || "home";
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.modelRoot = null;
    this.modelBox = new THREE.Box3();
    this.modelSize = new THREE.Vector3();
    this.modelCenter = new THREE.Vector3();
    this.hitZones = [];
    this.selectedPart = null;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.renovationLayer = new THREE.Group();
    this.clock = new THREE.Clock();
    this.autoRotateAllowed = true;
    this.destroyed = false;
    this.resizeObserver = null;
    this.dragged = false;
    this.pointerDown = null;
  }

  async init() {
    if (!this.mount || !window.WebGL2RenderingContext) {
      this.fail("WebGL indisponibil");
      return;
    }

    this.mount.classList.add("is-loading");
    this.mount.innerHTML = `
      <div class="hln-3d-loading" data-hln-3d-loading>
        <span class="hln-3d-spinner" aria-hidden="true"></span>
        <span>Pregătim modelul casei…</span>
      </div>
      <div class="hln-3d-toolbar" aria-label="Control model 3D">
        <button type="button" data-hln-3d-reset aria-label="Resetează vederea">Reset</button>
        <button type="button" data-hln-3d-explode aria-label="Arată stratul tehnic">Straturi</button>
      </div>
      <div class="hln-3d-hint">trage pentru rotire · pinch / scroll pentru zoom</div>
      <canvas class="hln-3d-canvas" aria-label="Model 3D interactiv al casei"></canvas>
    `;

    const canvas = this.mount.querySelector("canvas");
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      this.fail("Renderer 3D indisponibil");
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
    this.camera.position.set(9.5, 6.2, 10.5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 18;
    this.controls.minPolarAngle = Math.PI * 0.16;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.32;

    this.addLighting();
    this.addGround();

    try {
      await this.loadModel();
      this.addHitZones();
      this.addRenovationLayer();
      this.bindEvents();
      this.resize();
      this.mount.classList.remove("is-loading");
      this.mount.classList.add("is-ready");
      this.mount.closest(".hln-house-visual")?.classList.add("hln-house-visual-3d-ready");
      this.animate();
    } catch (error) {
      console.error("[Home Lab 3D] model load failed", error);
      this.fail("Modelul 3D nu a putut fi încărcat");
    }
  }

  addLighting() {
    const hemi = new THREE.HemisphereLight(0xfffcf4, 0x8d9691, 2.4);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff5e8, 4.2);
    key.position.set(7, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.0006;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd4e3e8, 1.35);
    fill.position.set(-7, 5, -5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xdde9df, 0.9);
    rim.position.set(-2, 4, 8);
    this.scene.add(rim);
  }

  addGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9.5, 80),
      new THREE.MeshStandardMaterial({
        color: 0xe9e5dc,
        roughness: 1,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.035;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(6.2, 9.2, 80),
      new THREE.MeshBasicMaterial({
        color: 0xdedbd2,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.028;
    this.scene.add(ring);
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(HOUSE_MODEL_URL);
    this.modelRoot = gltf.scene;
    this.modelRoot.name = "LaCurentHouse";

    this.modelRoot.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const tuned = materials.map((source) => {
        const mat = source.clone();
        if ("roughness" in mat) mat.roughness = Math.max(0.58, mat.roughness ?? 0.75);
        if ("metalness" in mat) mat.metalness = Math.min(0.08, mat.metalness ?? 0);
        if (mat.color) {
          const hsl = {};
          mat.color.getHSL(hsl);
          mat.color.setHSL(hsl.h, clamp(hsl.s * 0.62, 0, 1), clamp(hsl.l * 1.04, 0, 0.92));
        }
        return mat;
      });
      obj.material = Array.isArray(obj.material) ? tuned : tuned[0];
    });

    this.modelBox.setFromObject(this.modelRoot);
    this.modelBox.getSize(this.modelSize);
    this.modelBox.getCenter(this.modelCenter);

    const maxDim = Math.max(this.modelSize.x, this.modelSize.y, this.modelSize.z);
    const desired = this.mode === "home" ? 7.4 : 8.1;
    const scale = desired / maxDim;
    this.modelRoot.scale.setScalar(scale);

    this.modelBox.setFromObject(this.modelRoot);
    this.modelBox.getCenter(this.modelCenter);
    this.modelRoot.position.sub(this.modelCenter);

    this.modelBox.setFromObject(this.modelRoot);
    const minY = this.modelBox.min.y;
    this.modelRoot.position.y -= minY;

    this.modelRoot.rotation.y = -0.35;
    this.scene.add(this.modelRoot);

    this.modelBox.setFromObject(this.modelRoot);
    this.modelBox.getSize(this.modelSize);
    this.modelBox.getCenter(this.modelCenter);

    const target = new THREE.Vector3(0, this.modelSize.y * 0.42, 0);
    this.controls.target.copy(target);
    const distance = Math.max(this.modelSize.x, this.modelSize.z) * (this.mode === "home" ? 1.75 : 1.58);
    this.camera.position.set(distance * 0.78, distance * 0.52, distance);
    this.controls.update();
  }

  makeHitBox(part, size, position) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.part = part;
    mesh.renderOrder = 20;
    this.scene.add(mesh);
    this.hitZones.push(mesh);
    return mesh;
  }

  addHitZones() {
    const s = this.modelSize;
    const c = this.modelCenter.clone();
    c.set(0, s.y * 0.5, 0);

    this.makeHitBox(
      "wall",
      new THREE.Vector3(s.x * 0.96, s.y * 0.63, Math.max(0.32, s.z * 0.10)),
      new THREE.Vector3(0, s.y * 0.38, s.z * 0.47)
    );

    this.makeHitBox(
      "roof",
      new THREE.Vector3(s.x * 0.98, s.y * 0.28, s.z * 0.92),
      new THREE.Vector3(0, s.y * 0.82, 0)
    );

    this.makeHitBox(
      "windows",
      new THREE.Vector3(s.x * 0.72, s.y * 0.34, Math.max(0.34, s.z * 0.11)),
      new THREE.Vector3(0, s.y * 0.42, s.z * 0.50)
    );

    this.makeHitBox(
      "floor",
      new THREE.Vector3(s.x * 0.94, Math.max(0.24, s.y * 0.10), s.z * 0.88),
      new THREE.Vector3(0, s.y * 0.08, 0)
    );
  }

  addRenovationLayer() {
    this.renovationLayer.visible = false;
    this.scene.add(this.renovationLayer);
  }

  rebuildRenovationLayer(part) {
    this.renovationLayer.clear();
    if (!part || !PARTS[part]) {
      this.renovationLayer.visible = false;
      return;
    }

    const s = this.modelSize;
    const color = PARTS[part].color;
    const material = new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.34,
      roughness: 0.72,
      metalness: 0,
      transmission: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    let mesh;
    if (part === "wall") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.x * 0.98, s.y * 0.64, Math.max(0.09, s.z * 0.022)),
        material
      );
      mesh.position.set(0, s.y * 0.38, s.z * 0.526);
    } else if (part === "roof") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.x * 0.98, Math.max(0.10, s.y * 0.025), s.z * 0.94),
        material
      );
      mesh.position.set(0, s.y * 0.93, 0);
    } else if (part === "windows") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.x * 0.72, s.y * 0.36, Math.max(0.10, s.z * 0.024)),
        material
      );
      mesh.position.set(0, s.y * 0.42, s.z * 0.535);
    } else {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.x * 0.96, Math.max(0.10, s.y * 0.024), s.z * 0.90),
        material
      );
      mesh.position.set(0, s.y * 0.105, 0);
    }

    mesh.renderOrder = 10;
    this.renovationLayer.add(mesh);
    this.renovationLayer.visible = true;
    this.pulse(mesh);
  }

  pulse(mesh) {
    const start = performance.now();
    const duration = 360;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const k = 1 + Math.sin(p * Math.PI) * 0.028;
      mesh.scale.setScalar(k);
      if (p < 1) requestAnimationFrame(tick);
      else mesh.scale.setScalar(1);
    };
    requestAnimationFrame(tick);
  }

  bindEvents() {
    const canvas = this.renderer.domElement;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);

    this.controls.addEventListener("start", () => {
      this.controls.autoRotate = false;
      this.autoRotateAllowed = false;
    });
    this.controls.addEventListener("end", () => {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = window.setTimeout(() => {
        this.autoRotateAllowed = true;
        this.controls.autoRotate = true;
      }, 4500);
    });

    canvas.addEventListener("pointerdown", (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY };
      this.dragged = false;
    });

    canvas.addEventListener("pointermove", (event) => {
      if (this.pointerDown) {
        const dx = event.clientX - this.pointerDown.x;
        const dy = event.clientY - this.pointerDown.y;
        if (Math.hypot(dx, dy) > 6) this.dragged = true;
      }
      this.pick(event, true);
    });

    canvas.addEventListener("pointerup", (event) => {
      if (!this.dragged) this.pick(event, false);
      this.pointerDown = null;
    });

    canvas.addEventListener("pointerleave", () => {
      canvas.style.cursor = "grab";
      this.pointerDown = null;
    });

    this.mount.querySelector("[data-hln-3d-reset]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.resetCamera();
    });

    this.mount.querySelector("[data-hln-3d-explode]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const button = event.currentTarget;
      button.classList.toggle("is-active");
      this.mount.classList.toggle("is-exploded", button.classList.contains("is-active"));
      if (this.selectedPart) this.focusPart(this.selectedPart, button.classList.contains("is-active"));
    });

    document.querySelectorAll("[data-hln-measure]").forEach((button) => {
      button.addEventListener("click", () => {
        const part = button.dataset.hlnMeasure;
        if (PARTS[part]) this.selectPart(part, false);
      });
    });
  }

  pick(event, hoverOnly) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObjects(this.hitZones, false)[0];
    this.renderer.domElement.style.cursor = hit ? "pointer" : "grab";
    if (hoverOnly || !hit) return;

    const part = hit.object.userData.part;
    this.selectPart(part, true);
  }

  selectPart(part, dispatch) {
    if (!PARTS[part]) return;
    this.selectedPart = part;
    this.mount.dataset.hln3dSelected = part;
    this.rebuildRenovationLayer(part);
    this.focusPart(part, false);

    if (!dispatch) return;

    if (this.mode === "site") {
      triggerExistingControl(`[data-hln-measure="${PARTS[part].measure}"]`);
    } else {
      triggerExistingControl(`[data-hln-editor-open="${PARTS[part].editor}"]`);
    }
  }

  focusPart(part, exploded) {
    const s = this.modelSize;
    const targets = {
      wall: {
        target: new THREE.Vector3(0, s.y * 0.42, s.z * 0.22),
        pos: new THREE.Vector3(s.x * 0.92, s.y * 0.68, s.z * 1.42),
      },
      roof: {
        target: new THREE.Vector3(0, s.y * 0.73, 0),
        pos: new THREE.Vector3(s.x * 0.9, s.y * 1.25, s.z * 1.18),
      },
      windows: {
        target: new THREE.Vector3(0, s.y * 0.42, s.z * 0.28),
        pos: new THREE.Vector3(s.x * 0.66, s.y * 0.55, s.z * 1.18),
      },
      floor: {
        target: new THREE.Vector3(0, s.y * 0.18, 0),
        pos: new THREE.Vector3(s.x * 1.0, s.y * 0.52, s.z * 1.25),
      },
    };

    const preset = targets[part];
    if (!preset) return;
    const pos = preset.pos.clone();
    if (exploded) pos.multiplyScalar(1.08);
    this.animateCamera(pos, preset.target);
  }

  animateCamera(endPosition, endTarget) {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const start = performance.now();
    const duration = 520;
    this.controls.autoRotate = false;

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      this.camera.position.lerpVectors(startPosition, endPosition, e);
      this.controls.target.lerpVectors(startTarget, endTarget, e);
      this.controls.update();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  resetCamera() {
    const s = this.modelSize;
    const distance = Math.max(s.x, s.z) * (this.mode === "home" ? 1.75 : 1.58);
    this.selectedPart = null;
    this.renovationLayer.visible = false;
    this.animateCamera(
      new THREE.Vector3(distance * 0.78, distance * 0.52, distance),
      new THREE.Vector3(0, s.y * 0.42, 0)
    );
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    if (this.destroyed) return;
    const dt = Math.min(0.033, this.clock.getDelta());
    if (this.controls) {
      if (this.autoRotateAllowed) this.controls.autoRotate = true;
      this.controls.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.animate());
  }

  fail(message) {
    this.mount.classList.remove("is-loading");
    this.mount.classList.add("is-fallback");
    this.mount.innerHTML = `
      <div class="hln-3d-fallback-note" role="status">
        <span>Vizualizare 3D indisponibilă</span>
        <small>${message}. Poți continua folosind modelul schematic.</small>
      </div>
    `;
  }
}

async function boot() {
  const mounts = [...document.querySelectorAll("[data-hln-3d-stage]")];
  if (!mounts.length) return;

  const scenes = mounts.map((mount) => new HomeLabHouse3D(mount));
  window.__homeLab3D = scenes;

  for (const scene of scenes) {
    try {
      await scene.init();
    } catch (error) {
      console.error("[Home Lab 3D] init failed", error);
      scene.fail("Inițializare eșuată");
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

export { HomeLabHouse3D, HOUSE_MODEL_URL, HOUSE_MODEL_SOURCE };
