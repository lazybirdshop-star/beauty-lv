/* Three.js scene for the client's iPhone 16 Pro model.
   The OBJ shipped without its 8K texture set, so every surface is authored here
   from the mesh names Blender left in the file. That is on purpose: flat black
   titanium plus a real environment reflection reads cleaner on ink than a
   half-missing PBR set would, and it keeps the model under a megabyte.

   One scene can hold several devices — the hero uses a single one, the looks
   section fans out three. The parsed model is cached at module level, so the
   second scene costs a clone rather than another download and parse. */
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const INK = 0x0e0e10;
const ACCENT = 0xe2568a;
const PAPER = 0xf5f0ea;

/** The glass has rounded corners; a square plane laid over it shows four sharp
    tabs sticking out past the bezel and the screen reads as a sticker. */
function roundedPlane(w: number, h: number, r: number): BufferGeometry {
  const x = -w / 2;
  const y = -h / 2;
  /* Дуга, а не квадратичная кривая Безье с точкой в самом углу. Такая кривая
     не описывает четверть окружности, а выпирает за неё: в середине угла она
     проходит примерно на 6% радиуса дальше. На стекле это видно буквально —
     по прямым кромкам чёрная рамка ровная, а в углах экран подходит к металлу
     вплотную, потому что угол картинки оказывается площе положенного. */
  const s = new Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, 1.5 * Math.PI, false);

  const g = new ShapeGeometry(s, 16);
  // ShapeGeometry writes UVs in world units; remap them across the bounding box
  // so the screenshot maps to the rectangle rather than to a fraction of it.
  /* `ShapeGeometry` всегда пишет обе выборки; в типе они опциональны, потому
     что индексная подпись `attributes` этого знать не может. */
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  }
  uv.needsUpdate = true;
  return g;
}

let modelPromise: Promise<Group> | null = null;
function loadModel(url: string): Promise<Group> {
  if (!modelPromise) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    modelPromise = new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          gltf.scene.updateMatrixWorld(true);
          resolve(gltf.scene);
        },
        undefined,
        reject,
      );
    });
  }
  return modelPromise;
}

export type DevicePose = {
  /** metres, right of centre */
  x?: number;
  /** metres, above centre */
  y?: number;
  /** metres, toward the reader; negative sits the device further back */
  z?: number;
  /** radians about the vertical axis, on top of the spin */
  yaw?: number;
  scale?: number;
};

export type PhoneScene = {
  /** full turns about the vertical axis, 0..1 = 0..360deg */
  setSpin: (index: number, turns: number) => void;
  /** lean the device carries on top of its idle drift, in radians */
  setTilt: (index: number, x: number, z: number) => void;
  /** which of that device's screens is behind the glass */
  setScreen: (index: number, screen: number) => void;
  setPose: (index: number, pose: DevicePose) => void;
  /** Where a world x lands across the canvas, 0..1 — used to park DOM labels
      under their device instead of guessing percentages. */
  projectX: (worldX: number) => number;
  /** 0 holds everything perfectly still, 1 lets it drift */
  setIdle: (amount: number) => void;
  resize: () => void;
  dispose: () => void;
  ready: Promise<void>;
};

type SceneOptions = {
  /** share of the canvas height a device is framed to fill */
  fill?: number;
};

export function createPhoneScene(
  container: HTMLElement,
  modelUrl: string,
  devices: readonly (readonly string[])[],
  options: SceneOptions = {},
): PhoneScene {
  const FILL = options.fill ?? 0.9;

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearAlpha(0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.01, 100);

  // A generated room is the whole lighting rig: it gives the titanium something
  // to reflect without shipping an HDRI alongside the model.
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  const key = new DirectionalLight(PAPER, 2.1);
  key.position.set(1.6, 2.4, 2.2);
  scene.add(key);

  const fillLight = new DirectionalLight(PAPER, 0.5);
  fillLight.position.set(-2.2, 0.6, 1.4);
  scene.add(fillLight);

  // One accent rim — a graze along the edge, not a wash. At full strength it
  // turns the whole titanium back magenta, and the accent has a job on this page
  // that a pink phone would drown out.
  const rim = new PointLight(ACCENT, 0.45, 4, 2);
  rim.position.set(-1.1, 0.25, -1.2);
  scene.add(rim);

  // Black titanium rather than natural: a silver phone on ink pulls more
  // attention than the accent does, and the accent has to stay the loudest
  // thing on the screen.
  const titanium = new MeshPhysicalMaterial({
    color: new Color(0x4c4c55),
    metalness: 1,
    roughness: 0.36,
    envMapIntensity: 1.1,
  });
  const frame = new MeshPhysicalMaterial({
    color: new Color(0x26262c),
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: 1,
  });
  const lens = new MeshPhysicalMaterial({
    color: new Color(0x08080a),
    metalness: 0.6,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
  });
  const deep = new MeshStandardMaterial({
    color: new Color(INK),
    metalness: 0.4,
    roughness: 0.6,
  });
  const glassBlack = new MeshBasicMaterial({ color: 0x000000 });

  const materialFor = (name: string) => {
    if (/^back-camera-lente/.test(name)) return lens;
    if (/^(back-camera|frontal-camera|auricular|microphones|port-usb)/.test(name)) return deep;
    if (/^(button|screws|edge)/.test(name)) return titanium;
    return frame;
  };

  type Device = {
    root: Group; // pose
    lean: Group; // tilt + idle
    pivot: Group; // spin
    material: MeshBasicMaterial | null;
    textures: Texture[];
    tiltX: number;
    tiltZ: number;
    phase: number;
    geometries: BufferGeometry[];
  };

  const built: Device[] = [];
  let disposed = false;
  let modelHeight = 0.15;

  const textureLoader = new TextureLoader();

  const ready = loadModel(modelUrl).then((template) => {
    if (disposed) return;

    // Measure once on the template; every clone shares the geometry.
    const bounds = new Box3().setFromObject(template);
    const size = bounds.getSize(new Vector3());
    const centre = bounds.getCenter(new Vector3());

    let displayBox: Box3 | null = null;
    template.traverse((node) => {
      if (node instanceof Mesh && node.name === 'display') {
        node.geometry.computeBoundingBox();
        displayBox = node.geometry.boundingBox!.clone().applyMatrix4(node.matrixWorld);
      }
    });

    devices.forEach((screenUrls, i) => {
      const body = cloneSkeleton(template) as Group;
      body.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        // The baked shadow planes belong to the original studio render and read
        // as grey smears against ink.
        if (/^shadow/.test(node.name)) {
          node.visible = false;
          return;
        }
        node.material = node.name === 'display' ? glassBlack : materialFor(node.name);
      });
      body.position.sub(centre);

      const pivot = new Group();
      // The OBJ is authored with the display facing -Z, so spin 0 would show the
      // reader the back of the phone. Half a turn puts the screen front.
      pivot.rotation.y = Math.PI;
      pivot.add(body);

      const lean = new Group();
      lean.add(pivot);

      const root = new Group();
      root.add(lean);
      scene.add(root);

      const device: Device = {
        root,
        lean,
        pivot,
        material: null,
        textures: [],
        tiltX: 0,
        tiltZ: 0,
        phase: i * 1.7,
        geometries: [],
      };

      if (displayBox) {
        const db = displayBox as Box3;
        const dSize = db.getSize(new Vector3());
        const dCentre = db.getCenter(new Vector3()).sub(centre);
        const planeW = dSize.x * 0.972;
        const planeH = dSize.y * 0.986;
        const planeAspect = planeW / planeH;

        screenUrls.forEach((url) => {
          const tex = textureLoader.load(url, (t) => {
            // A screenshot wider than the glass keeps its full width and is
            // pinned to the top, the space below filled by clamping its last
            // row — the page continuing past the fold, which is what it is.
            // A narrower one keeps its height and gives up its margins.
            const img = t.image as { width: number; height: number };
            const imgAspect = img.width / img.height;
            if (imgAspect >= planeAspect) {
              t.repeat.set(1, imgAspect / planeAspect);
              t.offset.set(0, 1 - t.repeat.y);
            } else {
              t.repeat.set(planeAspect / imgAspect, 1);
              t.offset.set((1 - t.repeat.x) / 2, 0);
            }
            t.needsUpdate = true;
            /* Сцена рисует по требованию, а в герое устройство стоит намеренно
               неподвижно — то есть после позы кадров больше не будет. Снимок
               приезжает позже неё, и без этого толчка он остаётся загруженным,
               но так и не попавшим на стекло: телефон стоит с чёрным экраном.
               Гонка решается там, где она есть, а не задержкой на глазок. */
            touch();
          });
          tex.colorSpace = SRGBColorSpace;
          device.textures.push(tex);
        });

        device.material = new MeshBasicMaterial({
          map: device.textures[0] ?? null,
          toneMapped: false,
        });
        // ~14% of the width, which is where Apple puts the display radius.
        const geo = roundedPlane(planeW, planeH, planeW * 0.142);
        device.geometries.push(geo);
        const screen = new Mesh(geo, device.material);
        // The display faces -Z in the source file, so the plane is seated just
        // outside the glass on that side and turned to look the same way.
        screen.position.set(dCentre.x, dCentre.y, db.min.z - centre.z - 0.00004);
        screen.rotation.y = Math.PI;
        pivot.add(screen);
      }

      built.push(device);
    });

    frameCamera(size.y);
    resize();
    touch();
  });

  function frameCamera(height: number) {
    modelHeight = height;
    const fov = (camera.fov * Math.PI) / 180;
    camera.position.set(0, 0, height / FILL / 2 / Math.tan(fov / 2));
    camera.lookAt(0, 0, 0);
  }

  // 1.75 on a 3x phone is 3x the fragments of 1.0 for a device that is a
  // few hundred CSS px tall. 1.5 is the point where the bezel stops shimmering.
  const MAX_DPR = window.innerWidth < 860 ? 1.5 : 1.75;
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Framed on height, so a narrow box crops the sides rather than shrinking
    // the device; the phone stays the same size as the column narrows.
    camera.updateProjectionMatrix();
    frameCamera(modelHeight);
  }

  const ro = new ResizeObserver(() => {
    resize();
    touch();
  });
  ro.observe(container);

  let visible = true;
  const io = new IntersectionObserver(
    (e) => {
      visible = e[0]?.isIntersecting ?? visible;
      // Coming back into view, the last frame drawn may be stale.
      if (visible) touch();
    },
    { threshold: 0 },
  );
  io.observe(container);

  // Idle drift. Three slow sines on unrelated periods, so the object never
  // repeats a pose you can catch — this is what stops a 3D render from reading
  // as a still PNG the moment the reader stops scrolling. Held at zero wherever
  // the device is supposed to be standing still.
  const BOB = 0.005; // metres
  let idle = 0;

  /* The loop used to redraw every frame for the whole life of the page, whether
     or not anything had moved. In the hero the device is deliberately dead
     still (idle 0) and in the looks block it is still until the fan opens, so
     most of those frames were a full re-render of an identical image — two
     WebGL contexts' worth, on a phone. Now a frame is drawn when the drift is
     running or when something has actually been set since the last one. */
  let dirty = true;
  const touch = () => {
    dirty = true;
  };

  let raf = 0;
  const tick = (ms: number) => {
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    if (!dirty && idle <= 0) return;

    const t = ms * 0.001;
    for (const d of built) {
      const p = t + d.phase;
      d.lean.position.y = Math.sin(p * 0.62) * BOB * idle;
      d.lean.rotation.x = d.tiltX + Math.sin(p * 0.31) * 0.015 * idle;
      d.lean.rotation.z = d.tiltZ + Math.sin(p * 0.43) * 0.017 * idle;
    }
    renderer.render(scene, camera);
    dirty = false;
  };
  raf = requestAnimationFrame(tick);

  return {
    setSpin(index, turns) {
      const d = built[index];
      if (!d) return;
      d.pivot.rotation.y = Math.PI + turns * Math.PI * 2;
      touch();
    },
    setTilt(index, x, z) {
      const d = built[index];
      if (!d) return;
      d.tiltX = x;
      d.tiltZ = z;
      touch();
    },
    setScreen(index, screen) {
      const d = built[index];
      const tex = d?.textures[screen];
      if (!d?.material || !tex || d.material.map === tex) return;
      d.material.map = tex;
      d.material.needsUpdate = true;
      touch();
    },
    setPose(index, pose) {
      const d = built[index];
      if (!d) return;
      if (pose.x !== undefined) d.root.position.x = pose.x;
      if (pose.y !== undefined) d.root.position.y = pose.y;
      if (pose.z !== undefined) d.root.position.z = pose.z;
      if (pose.yaw !== undefined) d.root.rotation.y = pose.yaw;
      if (pose.scale !== undefined) d.root.scale.setScalar(pose.scale);
      touch();
    },
    projectX(worldX) {
      const halfView = (modelHeight / FILL / 2) * camera.aspect;
      return halfView > 0 ? 0.5 + worldX / halfView / 2 : 0.5;
    },
    setIdle(amount) {
      idle = amount;
      touch();
    },
    resize() {
      resize();
      touch();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      for (const d of built) {
        d.textures.forEach((t) => t.dispose());
        d.material?.dispose();
        d.geometries.forEach((g) => g.dispose());
      }
      [titanium, frame, lens, deep, glassBlack].forEach((m) => m.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    },
    ready,
  };
}
