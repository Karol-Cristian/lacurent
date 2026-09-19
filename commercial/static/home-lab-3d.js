import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const HOUSE_MODELS = {
  current: {
    label: "English cottage",
    url: "https://cdn.3dassets.dev/assets/32485/v1/model.glb",
    source: "https://3dassets.dev/assets/witch-cottage-and-apothecary-hedge-witch-25562947-starter-scene",
  },
  final: {
    label: "Baseline 3D",
    url: "https://cdn.jsdelivr.net/gh/Koushik6692/3d-portfolio@main/public/house-transformed.glb",
    source: "https://sketchfab.com/3d-models/final-house-20ea8edb2b7043b1a98a0b6ae18684bb",
  },
  dower: {
    label: "Heritage House",
    url: "https://cdn.jsdelivr.net/gh/Dhruvisgoat/deploy3dgamebuild@main/models/house-transformed.glb",
    source: "https://sketchfab.com/3d-models/preceptory-and-dower-house-game-asset-50d31c70e44b4000b17d81ff0fbcdf98",
  },
};

const HOUSE_VARIANT = new URLSearchParams(window.location.search).get("house") || "final";
const HOUSE_MODEL = HOUSE_MODELS[HOUSE_VARIANT] || HOUSE_MODELS.current;
const HOUSE_MODEL_URL = HOUSE_MODEL.url;
const HOUSE_MODEL_SOURCE = HOUSE_MODEL.source;

const PARTS = {
  wall: { label: "Fațadă", editor: "envelope", measure: "wall", color: 0x3f745c, field: "#hlnHomeWallIns" },
  roof: { label: "Pod / acoperiș", editor: "envelope", measure: "roof", color: 0x3f745c, field: "#hlnHomeRoofIns" },
  windows: { label: "Ferestre", editor: "envelope", measure: "windows", color: 0x41697a, field: "#hlnHomeWindows" },
  floor: { label: "Pardoseală", editor: "envelope", measure: "floor", color: 0x3f745c, field: "#hlnHomeFloorIns" },
};

const DEFAULT_FINAL_HOUSE_CONFIG = {
  version: 1,
  model: "final",
  coordinate_space: "normalized_model_bounds",
  parts: {
    wall: {
      label: "Fațadă",
      anchor: [0.00, 0.43, 0.49],
      hitbox: { position: [0.00, 0.38, 0.47], size: [0.96, 0.63, 0.10] },
      camera: { position: [0.92, 0.68, 1.42], target: [0.00, 0.42, 0.22] },
    },
    windows: {
      label: "Ferestre",
      anchor: [0.21, 0.43, 0.505],
      hitbox: { position: [0.00, 0.42, 0.50], size: [0.72, 0.34, 0.11] },
      camera: { position: [0.66, 0.55, 1.18], target: [0.00, 0.42, 0.28] },
    },
    roof: {
      label: "Acoperiș",
      anchor: [-0.08, 0.79, 0.22],
      hitbox: { position: [0.00, 0.82, 0.00], size: [0.98, 0.28, 0.92] },
      camera: { position: [0.90, 1.25, 1.18], target: [0.00, 0.73, 0.00] },
    },
    floor: {
      label: "Pardoseală",
      anchor: [0.00, 0.10, 0.05],
      hitbox: { position: [0.00, 0.08, 0.00], size: [0.94, 0.10, 0.88] },
      camera: { position: [1.00, 0.52, 1.25], target: [0.00, 0.18, 0.00] },
    },
  },
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
    this.semanticMeshes = [];
    this.gardenRoot = new THREE.Group();
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
    this.isMobile = window.matchMedia?.("(max-width: 760px)").matches ?? false;
    this.environmentTarget = null;
    this.microTexture = null;
    this.hotspotAnchors = new Map();
    this.hotspotElements = new Map();
    this.hotspotRoot = null;
    this.authorMode = new URLSearchParams(window.location.search).get("author3d") === "1";
    this.debugHitZones = new URLSearchParams(window.location.search).get("hotspotDebug") === "1";
    this.semanticConfig = JSON.parse(JSON.stringify(DEFAULT_FINAL_HOUSE_CONFIG));
    this.baseSemanticConfig = JSON.parse(JSON.stringify(DEFAULT_FINAL_HOUSE_CONFIG));
    this.authorStorageKey = "lacurent.final-house.semantic.v1";
    this.authorPart = "wall";
    this.authorPanel = null;
    this.authorStatusTimer = null;
    this.authorDraggingPart = null;
    this.inspectableMeshes = [];
    this.experimentLayers = new Map();
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
      <div class="hln-3d-hotspots" data-hln-3d-hotspots aria-label="Elemente selectabile ale casei"></div>
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

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.7 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.addEnvironment();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
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
      await this.loadSemanticConfig();
      await this.loadModel();
      this.createExperimentLayers();
      this.addHitZones();
      this.addRenovationLayer();
      this.createSemanticHotspots();
      this.createAuthorPanel();
      this.bindEvents();
      this.resize();
      this.mount.classList.remove("is-loading");
      this.mount.classList.add("is-ready");
      const visual = this.mount.closest(".hln-house-visual");
      visual?.classList.add("hln-house-visual-3d-ready");
      visual?.closest(".hln-house-board")?.classList.add("hln-house-board-3d-ready");
      this.createModelSwitcher();
      this.animate();
    } catch (error) {
      console.error("[Home Lab 3D] model load failed", error);
      this.fail("Modelul 3D nu a putut fi încărcat");
    }
  }

  addEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environmentScene = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(environmentScene, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    if ("environmentIntensity" in this.scene) this.scene.environmentIntensity = 0.72;
    environmentScene.dispose();
    pmrem.dispose();
  }

  addLighting() {
    const hemi = new THREE.HemisphereLight(0xfffbef, 0x6c756f, 0.72);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff1dd, 2.55);
    key.position.set(7.5, 10.5, 8.5);
    key.castShadow = true;
    const shadowSize = this.isMobile ? 1024 : 2048;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xcbdde5, 0.42);
    fill.position.set(-7, 4.5, -5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xe3eadf, 0.28);
    rim.position.set(-3, 4, 8);
    this.scene.add(rim);
  }

  createContactShadowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 120);
    gradient.addColorStop(0, "rgba(35,42,38,.34)");
    gradient.addColorStop(0.35, "rgba(35,42,38,.20)");
    gradient.addColorStop(0.72, "rgba(35,42,38,.065)");
    gradient.addColorStop(1, "rgba(35,42,38,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  getMicroTexture() {
    if (this.microTexture) return this.microTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const i = (y * canvas.width + x) * 4;
        const wave = Math.sin(x * 0.41) * 5 + Math.sin(y * 0.29) * 4 + Math.sin((x + y) * 0.13) * 3;
        const grain = ((x * 17 + y * 31 + x * y * 7) % 23) - 11;
        const value = Math.round(clamp(128 + wave + grain * 0.72, 92, 164));
        image.data[i] = value;
        image.data[i + 1] = value;
        image.data[i + 2] = value;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.needsUpdate = true;
    this.microTexture = texture;
    return texture;
  }

  addGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(10.8, 96),
      new THREE.MeshStandardMaterial({
        color: 0xe7e4dc,
        roughness: 0.98,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const lawn = new THREE.Mesh(
      new THREE.CircleGeometry(8.6, 96),
      new THREE.MeshStandardMaterial({
        color: 0xbecab5,
        roughness: 1,
        metalness: 0,
      })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -0.036;
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 6.8),
      new THREE.MeshBasicMaterial({
        map: this.createContactShadowTexture(),
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        toneMapped: false,
      })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -0.018;
    contact.renderOrder = 2;
    this.scene.add(contact);
  }

  classifyPart(name) {
    const n = String(name || "").toLowerCase();
    if (/roof|thatch|ridge|rafter|attic|gable/.test(n)) return "roof";
    if (/window|glass|sash|bay.?window/.test(n)) return "windows";
    if (/floor|flagstone|slab|foundation|plinth|basement.?floor/.test(n)) return "floor";
    if (/wall|cob|plaster|timber.?frame|facade|façade|exterior/.test(n)) return "wall";
    return null;
  }

  shouldHideModelObject(name) {
    const n = String(name || "").toLowerCase();
    return /investigation.?van|\bvan\b|emf|spirit.?box|thermometer|flashlight|motion.?sensor|sound.?sensor|point.?projector|parabolic|laptop|monitor.?rack|tripod|head.?camera|evidence|tarot|crucifix|incense|rag.?doll|porcelain.?doll|salt.?pile|ghost.?writing|mausoleum|grave.?marker|cable.?reel|cauldron|apothecary|mortar|pestle|still|bottle|flask|loom|spinning.?wheel|rocking.?chair|armchair|stool|dresser|rug|tea.?set|crate|writing.?desk|herb.?press|scales/.test(n);
  }

  tuneClassicMaterial(obj, source) {
    const mat = source.clone();
    const key = `${obj.name || ""} ${source?.name || ""}`.toLowerCase();

    if ("roughness" in mat) mat.roughness = clamp(mat.roughness ?? 0.72, 0.46, 0.96);
    if ("metalness" in mat) mat.metalness = clamp(mat.metalness ?? 0, 0, 0.12);
    if ("envMapIntensity" in mat) mat.envMapIntensity = 0.68;

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap].forEach((texture) => {
      if (!texture) return;
      texture.anisotropy = maxAnisotropy;
      if (texture === mat.map) texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });

    const hasAuthoredTexture = Boolean(mat.map);
    const micro = this.getMicroTexture();

    if (!hasAuthoredTexture && /roof|thatch|shingle|slate/.test(key) && mat.color) {
      mat.color.setHex(/thatch/.test(key) ? 0x75664c : 0x44494b);
      if ("roughness" in mat) mat.roughness = 0.9;
      if ("bumpMap" in mat) {
        mat.bumpMap = micro;
        mat.bumpScale = 0.045;
      }
    } else if (!hasAuthoredTexture && /door/.test(key) && mat.color) {
      mat.color.setHex(0x18382f);
      if ("roughness" in mat) mat.roughness = 0.68;
      if ("bumpMap" in mat) {
        mat.bumpMap = micro;
        mat.bumpScale = 0.018;
      }
    } else if (!hasAuthoredTexture && /window|sash|frame|trim|cornice|mould|porch|column/.test(key) && mat.color && !/glass/.test(key)) {
      mat.color.setHex(0xe5dfd2);
      if ("roughness" in mat) mat.roughness = 0.64;
    } else if (/glass/.test(key) && mat.color) {
      mat.color.setHex(0x9fb7be);
      mat.transparent = true;
      mat.opacity = Math.min(mat.opacity ?? 1, 0.64);
      mat.depthWrite = false;
      if ("roughness" in mat) mat.roughness = 0.12;
      if ("metalness" in mat) mat.metalness = 0;
      if ("envMapIntensity" in mat) mat.envMapIntensity = 1.05;
    } else if (!hasAuthoredTexture && /wall|cob|plaster|facade|exterior/.test(key) && mat.color) {
      mat.color.setHex(0xc8baa5);
      if ("roughness" in mat) mat.roughness = 0.92;
      if ("bumpMap" in mat) {
        mat.bumpMap = micro;
        mat.bumpScale = 0.026;
      }
    } else if (!hasAuthoredTexture && /timber|beam|oak|wood/.test(key) && mat.color) {
      mat.color.setHex(0x554233);
      if ("roughness" in mat) mat.roughness = 0.84;
      if ("bumpMap" in mat) {
        mat.bumpMap = micro;
        mat.bumpScale = 0.02;
      }
    } else if (!hasAuthoredTexture && /stone|foundation|plinth|step|kerb|curb/.test(key) && mat.color) {
      mat.color.setHex(0x9d978c);
      if ("roughness" in mat) mat.roughness = 0.96;
      if ("bumpMap" in mat) {
        mat.bumpMap = micro;
        mat.bumpScale = 0.032;
      }
    } else if (mat.color) {
      const hsl = {};
      mat.color.getHSL(hsl);
      mat.color.setHSL(hsl.h, clamp(hsl.s * 0.76, 0, 1), clamp(hsl.l * 0.985, 0.05, 0.9));
    }

    mat.needsUpdate = true;
    return mat;
  }

  async loadModel() {
    const loader = new GLTFLoader();
    let dracoLoader = null;

    if (HOUSE_VARIANT !== "current") {
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      dracoLoader.setDecoderConfig({ type: "wasm" });
      loader.setDRACOLoader(dracoLoader);
    }

    let gltf;
    try {
      gltf = await loader.loadAsync(HOUSE_MODEL_URL);
    } finally {
      dracoLoader?.dispose();
    }
    this.modelRoot = gltf.scene;
    this.modelRoot.name = `LaCurentHouse_${HOUSE_VARIANT}`;

    const toRemove = [];
    this.modelRoot.traverse((obj) => {
      if (obj !== this.modelRoot && this.shouldHideModelObject(obj.name)) {
        toRemove.push(obj);
        return;
      }
      if (!obj.isMesh) return;

      if (HOUSE_VARIANT === "final") {
        obj.userData.authorMeshIndex = this.inspectableMeshes.length;
        this.inspectableMeshes.push(obj);
      }

      obj.castShadow = true;
      obj.receiveShadow = true;

      const semantic = this.classifyPart(obj.name);
      if (semantic) {
        obj.userData.part = semantic;
        this.semanticMeshes.push(obj);
      }

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const tuned = materials.map((source) => this.tuneClassicMaterial(obj, source));
      obj.material = Array.isArray(obj.material) ? tuned : tuned[0];
    });

    toRemove.forEach((obj) => obj.parent?.remove(obj));

    this.modelBox.setFromObject(this.modelRoot);
    this.modelBox.getSize(this.modelSize);
    this.modelBox.getCenter(this.modelCenter);

    const maxDim = Math.max(this.modelSize.x, this.modelSize.y, this.modelSize.z);
    const desired = this.mode === "home" ? 7.55 : 8.25;
    const scale = desired / Math.max(maxDim, 0.001);
    this.modelRoot.scale.setScalar(scale);

    this.modelBox.setFromObject(this.modelRoot);
    this.modelBox.getCenter(this.modelCenter);
    this.modelRoot.position.sub(this.modelCenter);

    this.modelBox.setFromObject(this.modelRoot);
    const minY = this.modelBox.min.y;
    this.modelRoot.position.y -= minY;

    this.modelRoot.rotation.y = -0.26;
    this.scene.add(this.modelRoot);

    this.modelBox.setFromObject(this.modelRoot);
    this.modelBox.getSize(this.modelSize);
    this.modelBox.getCenter(this.modelCenter);

    const target = new THREE.Vector3(0, this.modelSize.y * 0.43, 0);
    this.controls.target.copy(target);
    let distance = Math.max(this.modelSize.x, this.modelSize.z) * (this.mode === "home" ? 1.72 : 1.58);
    if (this.authorMode && this.isMobile && HOUSE_VARIANT === "final") distance *= 1.34;
    this.camera.position.set(distance * 0.76, distance * 0.48, distance);
    this.controls.update();

    const warmLeft = new THREE.PointLight(0xffc98f, 0.34, Math.max(this.modelSize.x, this.modelSize.z) * 1.0, 2);
    warmLeft.position.set(-this.modelSize.x * 0.22, this.modelSize.y * 0.34, this.modelSize.z * 0.54);
    this.scene.add(warmLeft);

    const warmRight = warmLeft.clone();
    warmRight.position.x = this.modelSize.x * 0.22;
    this.scene.add(warmRight);
  }

  localLength(worldLength) {
    const scale = Math.abs(this.modelRoot?.scale?.x || 1);
    return worldLength / Math.max(scale, 0.0001);
  }

  localPointFromNormalized(values) {
    const world = this.normalizedToWorld(values);
    this.modelRoot.updateMatrixWorld(true);
    return this.modelRoot.worldToLocal(world.clone());
  }

  createPanelUnit(widthWorld, depthWorld, type = "pv") {
    const width = this.localLength(widthWorld);
    const depth = this.localLength(depthWorld);
    const thickness = this.localLength(Math.max(0.025, this.modelSize.y * 0.006));

    const unit = new THREE.Group();

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: type === "pv" ? 0x30383b : 0x7d6048,
      roughness: 0.38,
      metalness: 0.42,
    });
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: type === "pv" ? 0x163445 : 0x24474d,
      roughness: type === "pv" ? 0.24 : 0.34,
      metalness: type === "pv" ? 0.16 : 0.08,
      clearcoat: 0.34,
      clearcoatRoughness: 0.22,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      frameMaterial
    );
    body.castShadow = true;
    body.receiveShadow = true;
    unit.add(body);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.91, depth * 0.91),
      faceMaterial
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = thickness * 0.56;
    face.renderOrder = 4;
    unit.add(face);

    if (type === "pv") {
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x90a8b1,
        transparent: true,
        opacity: 0.36,
      });
      for (let i = 1; i < 4; i += 1) {
        const x = -width * 0.455 + (width * 0.91 * i) / 4;
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, thickness * 0.58, -depth * 0.455),
          new THREE.Vector3(x, thickness * 0.58, depth * 0.455),
        ]);
        unit.add(new THREE.Line(geometry, lineMaterial));
      }
      for (let i = 1; i < 6; i += 1) {
        const z = -depth * 0.455 + (depth * 0.91 * i) / 6;
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-width * 0.455, thickness * 0.58, z),
          new THREE.Vector3(width * 0.455, thickness * 0.58, z),
        ]);
        unit.add(new THREE.Line(geometry, lineMaterial));
      }
    } else {
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x9a6c45,
        roughness: 0.42,
        metalness: 0.34,
      });
      for (let i = -2; i <= 2; i += 1) {
        const tube = new THREE.Mesh(
          new THREE.CylinderGeometry(this.localLength(0.012), this.localLength(0.012), depth * 0.78, 8),
          tubeMaterial
        );
        tube.rotation.x = Math.PI / 2;
        tube.position.set((width * 0.68 * i) / 5, thickness * 0.62, 0);
        unit.add(tube);
      }
    }

    return unit;
  }

  mountLayerOnRoof(group, anchor, fallbackSlope = 0.60) {
    const baseMesh = this.inspectableMeshes[0];
    if (!baseMesh) {
      group.position.copy(this.localPointFromNormalized(anchor));
      group.rotation.x = fallbackSlope;
      return false;
    }

    this.modelRoot.updateMatrixWorld(true);

    const x = this.modelCenter.x + this.modelSize.x * anchor[0];
    const z = this.modelCenter.z + this.modelSize.z * anchor[2];
    const origin = new THREE.Vector3(
      x,
      this.modelBox.max.y + this.modelSize.y * 0.45,
      z
    );

    const ray = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, -1, 0),
      0,
      this.modelSize.y * 2.2
    );
    const hit = ray.intersectObject(baseMesh, true)[0];

    if (!hit?.face) {
      group.position.copy(this.localPointFromNormalized(anchor));
      group.rotation.x = fallbackSlope;
      return false;
    }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    if (worldNormal.y < 0) worldNormal.negate();

    const worldQuaternion = new THREE.Quaternion();
    this.modelRoot.getWorldQuaternion(worldQuaternion);
    const localNormal = worldNormal
      .clone()
      .applyQuaternion(worldQuaternion.clone().invert())
      .normalize();

    const localPoint = this.modelRoot.worldToLocal(hit.point.clone());
    const clearance = this.localLength(Math.max(0.018, this.modelSize.y * 0.003));

    group.position.copy(localPoint).addScaledVector(localNormal, clearance);
    group.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      localNormal
    );
    group.userData.roofMount = {
      anchor: [...anchor],
      worldNormal: worldNormal.toArray(),
    };
    return true;
  }

  createRoofArray({ key, type, cols, rows, anchor, panelWidth, panelDepth, slope = 0.60 }) {
    const group = new THREE.Group();
    group.name = `LaCurentLayer_${key}`;

    const gapX = this.localLength(this.modelSize.x * 0.012);
    const gapZ = this.localLength(this.modelSize.z * 0.014);
    const panelWidthLocal = this.localLength(panelWidth);
    const panelDepthLocal = this.localLength(panelDepth);
    const totalWidth = cols * panelWidthLocal + (cols - 1) * gapX;
    const totalDepth = rows * panelDepthLocal + (rows - 1) * gapZ;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const panel = this.createPanelUnit(panelWidth, panelDepth, type);
        panel.position.set(
          -totalWidth / 2 + panelWidthLocal / 2 + col * (panelWidthLocal + gapX),
          0,
          -totalDepth / 2 + panelDepthLocal / 2 + row * (panelDepthLocal + gapZ)
        );
        group.add(panel);
      }
    }

    this.mountLayerOnRoof(group, anchor, slope);
    group.visible = false;
    this.modelRoot.add(group);
    this.experimentLayers.set(key, group);
    return group;
  }

  createHeatPumpLayer() {
    const group = new THREE.Group();
    group.name = "LaCurentLayer_heatPump";
    group.position.copy(this.localPointFromNormalized([0.54, 0.11, 0.30]));

    const w = this.localLength(this.modelSize.x * 0.14);
    const h = this.localLength(this.modelSize.y * 0.20);
    const d = this.localLength(this.modelSize.z * 0.12);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: 0xe5e5df,
        roughness: 0.62,
        metalness: 0.08,
      })
    );
    body.position.y = h * 0.52;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const grille = new THREE.Mesh(
      new THREE.CircleGeometry(Math.min(w, h) * 0.28, 32),
      new THREE.MeshStandardMaterial({
        color: 0x4d5553,
        roughness: 0.78,
        metalness: 0.24,
      })
    );
    grille.position.set(0, h * 0.55, d * 0.505);
    group.add(grille);

    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(Math.min(w, h) * 0.055, 24),
      new THREE.MeshStandardMaterial({
        color: 0x242b29,
        roughness: 0.68,
        metalness: 0.12,
      })
    );
    hub.position.set(0, h * 0.55, d * 0.51);
    group.add(hub);

    const footMaterial = new THREE.MeshStandardMaterial({
      color: 0x676d69,
      roughness: 0.82,
      metalness: 0.16,
    });
    [-1, 1].forEach((side) => {
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, h * 0.08, d * 0.55),
        footMaterial
      );
      foot.position.set(side * w * 0.27, h * 0.04, 0);
      group.add(foot);
    });

    group.visible = false;
    this.modelRoot.add(group);
    this.experimentLayers.set("heatPump", group);
  }

  createExperimentLayers() {
    if (HOUSE_VARIANT !== "final" || !this.modelRoot) return;

    const s = this.modelSize;
    this.createRoofArray({
      key: "pv",
      type: "pv",
      cols: 2,
      rows: 2,
      anchor: [0.31, 0.70, 0.29],
      panelWidth: s.x * 0.092,
      panelDepth: s.z * 0.16,
      slope: 0.60,
    });

    this.createRoofArray({
      key: "solarThermal",
      type: "thermal",
      cols: 2,
      rows: 1,
      anchor: [-0.30, 0.72, 0.25],
      panelWidth: s.x * 0.105,
      panelDepth: s.z * 0.19,
      slope: 0.60,
    });

    this.createHeatPumpLayer();
  }

  renderExperimentLayers() {
    if (!this.authorPanel) return;
    const root = this.authorPanel.querySelector("[data-author-layer-buttons]");
    if (!root) return;

    const labels = {
      pv: "PV",
      solarThermal: "Solar termic",
      heatPump: "Pompă căldură",
    };

    root.innerHTML = "";
    this.experimentLayers.forEach((layer, key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.authorLayer = key;
      button.className = layer.visible ? "is-on" : "";
      button.setAttribute("aria-pressed", layer.visible ? "true" : "false");
      button.textContent = labels[key] || key;
      root.appendChild(button);
    });
  }

  cloneSemanticConfig(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async loadSemanticConfig() {
    if (HOUSE_VARIANT !== "final") return;

    let config = this.cloneSemanticConfig(DEFAULT_FINAL_HOUSE_CONFIG);
    try {
      const response = await fetch("/static/final-house-semantic.json?v=1");
      if (response.ok) {
        const loaded = await response.json();
        if (loaded?.model === "final" && loaded?.parts) config = loaded;
      }
    } catch (error) {
      console.warn("[Home Lab 3D] semantic config fallback", error);
    }

    this.baseSemanticConfig = this.cloneSemanticConfig(config);
    this.semanticConfig = this.cloneSemanticConfig(config);

    if (!this.authorMode) return;
    try {
      const saved = JSON.parse(localStorage.getItem(this.authorStorageKey) || "null");
      if (saved?.model === "final" && saved?.parts) {
        this.semanticConfig = saved;
      }
    } catch (_) {}
  }

  normalizedToWorld(values) {
    const [nx, ny, nz] = values;
    return new THREE.Vector3(
      this.modelCenter.x + this.modelSize.x * nx,
      this.modelBox.min.y + this.modelSize.y * ny,
      this.modelCenter.z + this.modelSize.z * nz
    );
  }

  worldToNormalized(point) {
    return [
      (point.x - this.modelCenter.x) / Math.max(this.modelSize.x, 0.001),
      (point.y - this.modelBox.min.y) / Math.max(this.modelSize.y, 0.001),
      (point.z - this.modelCenter.z) / Math.max(this.modelSize.z, 0.001),
    ];
  }

  normalizedSize(values) {
    const [nx, ny, nz] = values;
    return new THREE.Vector3(
      Math.max(0.04, this.modelSize.x * nx),
      Math.max(0.04, this.modelSize.y * ny),
      Math.max(0.04, this.modelSize.z * nz)
    );
  }

  refreshHotspotAnchor(part) {
    const config = this.semanticConfig?.parts?.[part];
    if (!config?.anchor) return;
    this.hotspotAnchors.set(part, this.normalizedToWorld(config.anchor));
  }

  createSemanticHotspots() {
    if (HOUSE_VARIANT !== "final") return;

    this.hotspotRoot = this.mount.querySelector("[data-hln-3d-hotspots]");
    if (!this.hotspotRoot) return;

    this.hotspotRoot.innerHTML = "";
    this.hotspotAnchors.clear();
    this.hotspotElements.clear();

    const normalParts = new Set(["wall", "windows", "roof"]);

    Object.entries(this.semanticConfig.parts || {}).forEach(([part, config]) => {
      if (!this.authorMode && !normalParts.has(part)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "hln-3d-hotspot";
      button.dataset.hln3dHotspot = part;
      button.setAttribute("aria-label", config.label || PARTS[part]?.label || part);
      button.innerHTML = `
        <span class="hln-3d-hotspot-dot" aria-hidden="true"></span>
        <span class="hln-3d-hotspot-label">${config.label || PARTS[part]?.label || part}</span>
      `;

      if (this.authorMode) {
        button.classList.add("is-authoring");
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.authorPart = part;
          this.authorDraggingPart = part;
          this.controls.enabled = false;
          button.setPointerCapture?.(event.pointerId);
          this.selectPart(part, false);
          this.renderAuthorPanel();
        });
        button.addEventListener("pointermove", (event) => {
          if (this.authorDraggingPart !== part) return;
          event.preventDefault();
          this.dragHotspotToPointer(event, part);
        });
        const finishDrag = (event) => {
          if (this.authorDraggingPart !== part) return;
          button.releasePointerCapture?.(event.pointerId);
          this.authorDraggingPart = null;
          this.controls.enabled = true;
          this.persistAuthorConfig();
          this.setAuthorStatus("Hotspot salvat local");
        };
        button.addEventListener("pointerup", finishDrag);
        button.addEventListener("pointercancel", finishDrag);
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.authorPart = part;
          this.selectPart(part, false);
          this.renderAuthorPanel();
        });
      } else {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.selectPart(part, true);
        });
      }

      this.hotspotRoot.appendChild(button);
      this.hotspotElements.set(part, button);
      this.refreshHotspotAnchor(part);
    });

    this.updateHotspotPositions();
  }

  dragHotspotToPointer(event, part) {
    if (!this.modelRoot || !this.renderer || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObject(this.modelRoot, true).find((entry) => entry.object?.isMesh);
    if (!hit) return;

    const next = this.worldToNormalized(hit.point);
    next[0] = clamp(next[0], -0.65, 0.65);
    next[1] = clamp(next[1], 0, 1.05);
    next[2] = clamp(next[2], -0.65, 0.65);
    this.semanticConfig.parts[part].anchor = next.map((value) => Number(value.toFixed(4)));
    this.refreshHotspotAnchor(part);
    this.renderAuthorControls();
  }

  updateHotspotPositions() {
    if (!this.hotspotRoot || !this.camera || !this.hotspotAnchors.size) return;

    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    this.hotspotAnchors.forEach((anchor, part) => {
      const button = this.hotspotElements.get(part);
      if (!button) return;

      const towardAnchor = anchor.clone().sub(this.camera.position);
      const isInFront = cameraDirection.dot(towardAnchor) > 0;
      const projected = anchor.clone().project(this.camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      const visible =
        isInFront &&
        projected.z > -1 &&
        projected.z < 1 &&
        x > -24 && x < width + 24 &&
        y > -24 && y < height + 24;

      button.hidden = !visible;
      if (!visible) return;
      button.style.transform = `translate3d(${x - 22}px, ${y - 22}px, 0)`;
    });
  }

  setHotspotSelection(part) {
    this.hotspotElements.forEach((button, key) => {
      button.classList.toggle("is-selected", key === part);
    });
  }

  focusEditorField(part) {
    const selector = PARTS[part]?.field;
    if (!selector) return;
    window.setTimeout(() => {
      const field = document.querySelector(selector);
      if (!(field instanceof HTMLElement)) return;
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
    }, 80);
  }

  persistAuthorConfig() {
    if (!this.authorMode) return;
    try {
      localStorage.setItem(this.authorStorageKey, JSON.stringify(this.semanticConfig));
    } catch (_) {}
  }

  setAuthorStatus(message) {
    if (!this.authorPanel) return;
    const status = this.authorPanel.querySelector("[data-author-status]");
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(this.authorStatusTimer);
    this.authorStatusTimer = window.setTimeout(() => {
      status.textContent = "Modificările sunt păstrate local";
    }, 1800);
  }

  createAuthorPanel() {
    if (!this.authorMode || HOUSE_VARIANT !== "final" || this.mode !== "home") return;

    this.autoRotateAllowed = false;
    this.controls.autoRotate = false;
    this.mount.classList.add("is-authoring");
    this.mount.closest(".hln-house-visual")?.classList.add("is-authoring-3d");

    const panel = document.createElement("aside");
    panel.className = "hln-3d-author-panel";
    if (this.isMobile) panel.classList.add("is-collapsed");
    panel.innerHTML = `
      <header>
        <div><strong>3D Authoring</strong><small>Final House semantic map</small></div>
        <button type="button" class="hln-3d-author-toggle" data-author-toggle aria-expanded="${this.isMobile ? "false" : "true"}">${this.isMobile ? "Reglaje" : "Restrânge"}</button>
      </header>
      <section class="hln-3d-mesh-inspector" data-author-mesh-inspector>
        <div class="hln-3d-mesh-inspector-head">
          <strong>Mesh-uri model</strong>
          <button type="button" data-author-mesh-all>Toate ON</button>
        </div>
        <div class="hln-3d-mesh-buttons" data-author-mesh-buttons></div>
        <small data-author-mesh-name>Atinge M1–M5 și spune-mi ce dispare.</small>
      </section>
      <section class="hln-3d-layer-inspector">
        <div class="hln-3d-mesh-inspector-head">
          <strong>Layere experiment</strong>
          <button type="button" data-author-layer-all-off>Toate OFF</button>
        </div>
        <div class="hln-3d-layer-buttons" data-author-layer-buttons></div>
        <small>Obiecte 3D atașate de Final House.</small>
      </section>
      <span class="hln-3d-author-status" data-author-status>Modificările sunt păstrate local</span>
      <div class="hln-3d-author-parts" data-author-parts></div>
      <div class="hln-3d-author-controls" data-author-controls></div>
      <div class="hln-3d-author-actions">
        <button type="button" data-author-action="camera">Salvează camera</button>
        <button type="button" data-author-action="preview">Preview focus</button>
        <button type="button" data-author-action="copy">Copy config</button>
        <button type="button" data-author-action="reset">Reset local</button>
      </div>
      <p>Trage hotspot-ul direct pe suprafața casei. Pentru hit-box folosește sliderele.</p>
    `;
    this.mount.appendChild(panel);
    this.authorPanel = panel;
    this.renderMeshInspector();
    this.renderExperimentLayers();

    const partsRoot = panel.querySelector("[data-author-parts]");
    Object.entries(this.semanticConfig.parts || {}).forEach(([part, config]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.authorPart = part;
      button.textContent = config.label || PARTS[part]?.label || part;
      button.addEventListener("click", () => {
        this.authorPart = part;
        this.selectPart(part, false);
        this.renderAuthorPanel();
      });
      partsRoot.appendChild(button);
    });

    panel.addEventListener("input", (event) => {
      const input = event.target.closest("[data-author-path]");
      if (!input) return;
      this.updateAuthorValue(input.dataset.authorPath, Number(input.value));
    });

    panel.addEventListener("click", async (event) => {
      const layerButton = event.target.closest("[data-author-layer]");
      if (layerButton) {
        const key = layerButton.dataset.authorLayer;
        const layer = this.experimentLayers.get(key);
        if (layer) {
          layer.visible = !layer.visible;
          this.renderExperimentLayers();
          this.setAuthorStatus(`${layerButton.textContent} ${layer.visible ? "ON" : "OFF"}`);
        }
        return;
      }

      if (event.target.closest("[data-author-layer-all-off]")) {
        this.experimentLayers.forEach((layer) => { layer.visible = false; });
        this.renderExperimentLayers();
        this.setAuthorStatus("Layere experiment oprite");
        return;
      }

      const meshButton = event.target.closest("[data-author-mesh]");
      if (meshButton) {
        const index = Number(meshButton.dataset.authorMesh);
        const mesh = this.inspectableMeshes[index];
        if (mesh) {
          mesh.visible = !mesh.visible;
          this.renderMeshInspector(index);
          this.setAuthorStatus(`M${index + 1} ${mesh.visible ? "vizibil" : "ascuns"}`);
        }
        return;
      }

      if (event.target.closest("[data-author-mesh-all]")) {
        this.inspectableMeshes.forEach((mesh) => { mesh.visible = true; });
        this.renderMeshInspector();
        this.setAuthorStatus("Toate mesh-urile sunt vizibile");
        return;
      }

      const toggle = event.target.closest("[data-author-toggle]");
      if (toggle) {
        const collapsed = panel.classList.toggle("is-collapsed");
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        toggle.textContent = collapsed ? "Reglaje" : "Închide";
        return;
      }

      const action = event.target.closest("[data-author-action]")?.dataset.authorAction;
      if (!action) return;

      if (action === "camera") {
        const part = this.semanticConfig.parts[this.authorPart];
        if (!part) return;
        part.camera = {
          position: this.worldToNormalized(this.camera.position).map((v) => Number(v.toFixed(4))),
          target: this.worldToNormalized(this.controls.target).map((v) => Number(v.toFixed(4))),
        };
        this.persistAuthorConfig();
        this.setAuthorStatus("Camera salvată");
      } else if (action === "preview") {
        this.focusPart(this.authorPart, false);
      } else if (action === "copy") {
        const payload = JSON.stringify(this.semanticConfig, null, 2);
        try {
          await navigator.clipboard.writeText(payload);
          this.setAuthorStatus("Config copiat");
        } catch (_) {
          window.prompt("Copiază configurația:", payload);
        }
      } else if (action === "reset") {
        try { localStorage.removeItem(this.authorStorageKey); } catch (_) {}
        this.semanticConfig = this.cloneSemanticConfig(this.baseSemanticConfig);
        this.rebuildHitZones();
        this.createSemanticHotspots();
        this.authorPart = "wall";
        this.renderAuthorPanel();
        this.setAuthorStatus("Config local resetat");
      }
    });

    this.selectPart(this.authorPart, false);
    this.renderAuthorPanel();
  }

  renderMeshInspector(selectedIndex = null) {
    if (!this.authorPanel) return;
    const root = this.authorPanel.querySelector("[data-author-mesh-buttons]");
    const name = this.authorPanel.querySelector("[data-author-mesh-name]");
    if (!root || !name) return;

    root.innerHTML = "";
    this.inspectableMeshes.forEach((mesh, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.authorMesh = String(index);
      button.className = mesh.visible ? "" : "is-off";
      button.setAttribute("aria-pressed", mesh.visible ? "true" : "false");
      button.textContent = `M${index + 1}`;
      root.appendChild(button);
    });

    if (selectedIndex == null) {
      name.textContent = `${this.inspectableMeshes.length} mesh-uri · dezactivează-le pe rând`;
      return;
    }

    const mesh = this.inspectableMeshes[selectedIndex];
    if (!mesh) return;
    const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .map((material) => material?.name)
      .filter(Boolean)
      .join(" · ");
    name.textContent = `M${selectedIndex + 1} · ${mesh.name || "(fără nume)"}${materials ? " · " + materials : ""}`;
  }

  renderAuthorPanel() {
    if (!this.authorPanel) return;
    this.authorPanel.querySelectorAll("[data-author-part]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.authorPart === this.authorPart);
    });
    this.renderAuthorControls();
  }

  renderAuthorControls() {
    if (!this.authorPanel) return;
    const part = this.semanticConfig.parts?.[this.authorPart];
    const root = this.authorPanel.querySelector("[data-author-controls]");
    if (!part || !root) return;

    const axes = ["X", "Y", "Z"];
    const rows = [];
    const pushGroup = (title, key, values, min, max, step) => {
      rows.push(`<section><h4>${title}</h4>`);
      values.forEach((value, index) => {
        rows.push(`
          <label>
            <span>${axes[index]} <output>${Number(value).toFixed(3)}</output></span>
            <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-author-path="${key}.${index}">
          </label>
        `);
      });
      rows.push("</section>");
    };

    pushGroup("Hotspot", "anchor", part.anchor, -0.65, 1.45, 0.005);
    pushGroup("Hit-box · poziție", "hitpos", part.hitbox.position, -0.65, 1.05, 0.005);
    pushGroup("Hit-box · mărime", "hitsize", part.hitbox.size, 0.02, 1.50, 0.005);
    root.innerHTML = rows.join("");
  }

  updateAuthorValue(path, value) {
    const part = this.semanticConfig.parts?.[this.authorPart];
    if (!part) return;
    const [kind, rawIndex] = path.split(".");
    const index = Number(rawIndex);

    if (kind === "anchor") {
      part.anchor[index] = value;
      this.refreshHotspotAnchor(this.authorPart);
    } else if (kind === "hitpos") {
      part.hitbox.position[index] = value;
      this.rebuildHitZones();
    } else if (kind === "hitsize") {
      part.hitbox.size[index] = Math.max(0.02, value);
      this.rebuildHitZones();
    }

    this.persistAuthorConfig();
    const input = this.authorPanel?.querySelector(`[data-author-path="${path}"]`);
    const output = input?.closest("label")?.querySelector("output");
    if (output) output.textContent = Number(value).toFixed(3);
  }

  createModelSwitcher() {
    if (new URLSearchParams(window.location.search).get("houseTest") !== "1") return;

    const switcher = document.createElement("div");
    switcher.className = "hln-3d-variant-switcher";
    switcher.setAttribute("aria-label", "Modele casă");

    Object.entries(HOUSE_MODELS).forEach(([key, model]) => {
      const link = document.createElement("a");
      const url = new URL(window.location.href);
      url.searchParams.set("houseTest", "1");
      url.searchParams.set("house", key);
      link.href = url.toString();
      link.textContent = model.label;
      link.className = key === HOUSE_VARIANT ? "is-active" : "";
      switcher.appendChild(link);
    });

    this.mount.appendChild(switcher);
  }

  addEnglishGarden() {
    const s = this.modelSize;
    const garden = this.gardenRoot;
    garden.clear();

    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x5f765f, roughness: 1 });
    const hedgeMat2 = new THREE.MeshStandardMaterial({ color: 0x73866f, roughness: 1 });
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0xd1c6b2, roughness: 1 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xaaa394, roughness: 1 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e5b4b, roughness: 1 });

    const path = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(1.15, s.x * 0.18), 0.045, Math.max(2.8, s.z * 0.72)),
      gravelMat
    );
    path.position.set(0, 0.006, s.z * 0.61);
    path.receiveShadow = true;
    garden.add(path);

    const sidePath = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(2.6, s.x * 0.48), 0.038, Math.max(0.9, s.z * 0.15)),
      gravelMat
    );
    sidePath.position.set(s.x * 0.22, 0.004, s.z * 0.35);
    sidePath.receiveShadow = true;
    garden.add(sidePath);

    const makeHedge = (x, z, w, d, h, material = hedgeMat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), material);
      mesh.position.set(x, h * 0.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      garden.add(mesh);
      return mesh;
    };

    makeHedge(-s.x * 0.55, s.z * 0.30, Math.max(0.34, s.x * 0.08), Math.max(1.8, s.z * 0.72), 0.52);
    makeHedge(s.x * 0.55, s.z * 0.30, Math.max(0.34, s.x * 0.08), Math.max(1.8, s.z * 0.72), 0.52);

    const frontGap = Math.max(1.55, s.x * 0.28);
    const frontHedgeWidth = Math.max(1.2, (s.x - frontGap) * 0.5);
    makeHedge(-(frontGap + frontHedgeWidth) * 0.5, s.z * 0.78, frontHedgeWidth, 0.34, 0.46, hedgeMat2);
    makeHedge((frontGap + frontHedgeWidth) * 0.5, s.z * 0.78, frontHedgeWidth, 0.34, 0.46, hedgeMat2);

    const shrubGeometry = new THREE.IcosahedronGeometry(0.36, 2);
    [
      [-s.x * 0.33, s.z * 0.44, 1.0],
      [ s.x * 0.34, s.z * 0.43, 0.9],
      [-s.x * 0.40, s.z * 0.60, 0.75],
      [ s.x * 0.41, s.z * 0.60, 0.78],
    ].forEach(([x, z, k], idx) => {
      const shrub = new THREE.Mesh(shrubGeometry, idx % 2 ? hedgeMat2 : hedgeMat);
      shrub.scale.setScalar(k);
      shrub.position.set(x, 0.28 * k, z);
      shrub.castShadow = true;
      garden.add(shrub);
    });

    const makeTopiary = (x, z) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.56, 10), trunkMat);
      trunk.position.set(x, 0.28, z);
      trunk.castShadow = true;
      garden.add(trunk);

      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), hedgeMat2);
      crown.position.set(x, 0.70, z);
      crown.castShadow = true;
      garden.add(crown);
    };
    makeTopiary(-s.x * 0.16, s.z * 0.50);
    makeTopiary(s.x * 0.16, s.z * 0.50);

    const postGeometry = new THREE.BoxGeometry(0.24, 0.82, 0.24);
    [-frontGap * 0.54, frontGap * 0.54].forEach((x) => {
      const post = new THREE.Mesh(postGeometry, stoneMat);
      post.position.set(x, 0.41, s.z * 0.80);
      post.castShadow = true;
      garden.add(post);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.11, 0.31), stoneMat);
      cap.position.set(x, 0.87, s.z * 0.80);
      cap.castShadow = true;
      garden.add(cap);
    });

    this.scene.add(garden);
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
    mesh.userData.hitZone = true;
    mesh.renderOrder = 20;
    if (this.debugHitZones) {
      mesh.material.opacity = 0.16;
      mesh.material.wireframe = true;
      mesh.material.depthTest = false;
      mesh.material.color.setHex(PARTS[part]?.color || 0x8b8f8c);
    }
    this.scene.add(mesh);
    this.hitZones.push(mesh);
    return mesh;
  }

  rebuildHitZones() {
    this.hitZones.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });
    this.hitZones = [];
    this.addHitZones();
  }

  addHitZones() {
    const s = this.modelSize;

    if (HOUSE_VARIANT === "final" && this.semanticConfig?.parts) {
      Object.entries(this.semanticConfig.parts).forEach(([part, config]) => {
        if (!config?.hitbox) return;
        this.makeHitBox(
          part,
          this.normalizedSize(config.hitbox.size),
          this.normalizedToWorld(config.hitbox.position)
        );
      });
      return;
    }

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
      if (this.authorMode) return;
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

    const semanticHit = this.semanticMeshes.length ? this.raycaster.intersectObjects(this.semanticMeshes, true)[0] : null;
    const hit = semanticHit || this.raycaster.intersectObjects(this.hitZones, false)[0];
    this.renderer.domElement.style.cursor = hit ? "pointer" : "grab";
    if (hoverOnly || !hit) return;

    const part = hit.object.userData.part;
    if (this.authorMode) this.authorPart = part;
    this.selectPart(part, !this.authorMode);
    if (this.authorMode) this.renderAuthorPanel();
  }

  selectPart(part, dispatch) {
    if (!PARTS[part]) return;
    this.selectedPart = part;
    this.mount.dataset.hln3dSelected = part;
    this.setHotspotSelection(part);
    if (this.authorMode) {
      this.renovationLayer.visible = false;
    } else {
      this.rebuildRenovationLayer(part);
      this.focusPart(part, false);
    }
    this.autoRotateAllowed = false;
    this.controls.autoRotate = false;

    if (!dispatch) return;

    if (this.mode === "site") {
      triggerExistingControl(`[data-hln-measure="${PARTS[part].measure}"]`);
    } else {
      triggerExistingControl(`[data-hln-editor-open="${PARTS[part].editor}"]`);
      this.focusEditorField(part);
    }
  }

  focusPart(part, exploded) {
    if (HOUSE_VARIANT === "final") {
      const preset = this.semanticConfig?.parts?.[part]?.camera;
      if (preset?.position && preset?.target) {
        const pos = this.normalizedToWorld(preset.position);
        const target = this.normalizedToWorld(preset.target);
        if (exploded) {
          const offset = pos.clone().sub(target).multiplyScalar(1.08);
          pos.copy(target).add(offset);
        }
        this.animateCamera(pos, target);
        return;
      }
    }

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
    this.setHotspotSelection(null);
    this.renovationLayer.visible = false;
    this.autoRotateAllowed = !this.authorMode;
    this.controls.autoRotate = !this.authorMode;
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
      if (this.autoRotateAllowed && !this.authorMode) this.controls.autoRotate = true;
      this.controls.update(dt);
    }
    this.updateHotspotPositions();
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

export { HomeLabHouse3D, HOUSE_MODELS, HOUSE_MODEL_URL, HOUSE_MODEL_SOURCE };
