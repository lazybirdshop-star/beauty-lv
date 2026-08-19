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
  BufferGeometry,
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
  type Material,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { optimizedSrc } from '../lib/image';
import { takeModelBuffer } from '../lib/model-preload';
import { yieldToMain } from '../lib/yield-to-main';

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

    const settle = (gltf: { scene: Group }): Group => {
      gltf.scene.updateMatrixWorld(true);
      return gltf.scene;
    };

    /* Байты чаще всего уже привезены в простое (lib/model-preload.ts) —
       тогда остаётся только разбор, без похода в сеть. Если нет или если
       предзагрузка не удалась, загрузчик идёт за файлом сам. */
    const prefetched = takeModelBuffer(url);
    modelPromise = (
      prefetched
        ? prefetched.then(
            (bytes) =>
              new Promise<Group>((resolve, reject) => {
                loader.parse(bytes, '', (gltf) => resolve(settle(gltf)), reject);
              }),
          )
        : Promise.reject(new Error('no prefetch'))
    ).catch(
      () =>
        new Promise<Group>((resolve, reject) => {
          loader.load(url, (gltf) => resolve(settle(gltf)), undefined, reject);
        }),
    );
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

/* Плотность кадра — та же, что у экрана, вплоть до трёхкратного.

   Полтора пикселя на трёхкратном телефоне означали ровно половину разрешения
   экрана: снимок на стекле замыливался вдвое ещё до всякой фильтрации. Двойки
   тоже не хватило — рядом с постером первого экрана, который браузер рисует в
   полном разрешении устройства, живая сцена читалась как потеря чёткости в
   момент подмены.

   Платится это не площадью, а сглаживанием: на плотности 2.5 и выше своих проб
   у кадра уже больше, чем пикселей на экране, и мультисэмпловый буфер там
   лишний. Телефон на тройке без MSAA считает 1.6 Мп — меньше, чем один кадр
   1080p, и вчетверо меньше проб, чем двойка с MSAA. Ниже 2.5 сглаживание
   остаётся: без него светлая кромка титана идёт по скруглению лесенкой. */
const MAX_DPR = 3;
/** Выше этой плотности мультисэмплинг уже нечего сглаживать. */
const MSAA_UNTIL_DPR = 2.5;

/** Доля высоты устройства, которую занимает стекло. */
const GLASS_OF_DEVICE = 0.92;
/** Отношение сторон стекла: 72 мм на 156 мм корпуса iPhone 16 Pro. */
const GLASS_ASPECT = 0.462;

/**
 * Корпус, собранный по одной сетке на материал.
 *
 * В файле модели корпус разложен на 82 отдельные сетки — кнопки, винты,
 * кромки, стёкла объективов. Рисовались они тоже по отдельности: 82 вызова
 * отрисовки на кадр ради пяти материалов. Здесь они склеиваются по материалу
 * в пять сеток; геометрия та же самая, картинка та же самая, а вызовов
 * отрисовки на кадр остаётся пять.
 *
 * Матрица каждой сетки при склейке впекается в вершины — корпус статичен,
 * ничего из его частей не двигается отдельно, так что терять нечего.
 *
 * @returns null, если склеить нечем — тогда зовущий берёт исходное дерево.
 */
function mergedBody(
  template: Group,
  materialFor: (name: string) => Material,
  glass: Material,
): { body: Group; geometries: BufferGeometry[] } | null {
  const buckets = new Map<Material, BufferGeometry[]>();

  template.updateMatrixWorld(true);
  template.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    /* The baked shadow planes belong to the original studio render and read
       as grey smears against ink. */
    if (/^shadow/.test(node.name)) return;

    const geometry = node.geometry as BufferGeometry;
    /* Склеивать можно только однородное: индексированное с индексированным и
       с одним набором выборок. Ни один материал корпуса не берёт текстуру,
       поэтому от вершины нужны только место и нормаль. */
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    if (!geometry.index || !position || !normal) return;

    const target = node.name === 'display' ? glass : materialFor(node.name);
    const trimmed = new BufferGeometry();
    trimmed.setIndex(geometry.index.clone());
    trimmed.setAttribute('position', position.clone());
    trimmed.setAttribute('normal', normal.clone());
    trimmed.applyMatrix4(node.matrixWorld);

    const bucket = buckets.get(target);
    if (bucket) bucket.push(trimmed);
    else buckets.set(target, [trimmed]);
  });

  if (!buckets.size) return null;

  const body = new Group();
  const geometries: BufferGeometry[] = [];
  for (const [material, parts] of buckets) {
    const merged = parts.length === 1 ? parts[0]! : mergeGeometries(parts, false);
    if (parts.length > 1) parts.forEach((part) => part.dispose());
    if (!merged) continue;
    geometries.push(merged);
    body.add(new Mesh(merged, material));
  }
  return body.children.length ? { body, geometries } : null;
}

export function createPhoneScene(
  container: HTMLElement,
  modelUrl: string,
  devices: readonly (readonly string[])[],
  options: SceneOptions = {},
): PhoneScene {
  const FILL = options.fill ?? 0.9;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: dpr < MSAA_UNTIL_DPR,
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

  /* A generated room is the whole lighting rig: it gives the titanium something
     to reflect without shipping an HDRI alongside the model.

     Строится не здесь, а внутри `ready`, между двумя уступками управления:
     пре-фильтрация окружения — это своя сборка шейдеров и несколько проходов
     рендера, и вместе с разбором модели они складывались в одну задачу,
     которая держала главный поток целую секунду. */
  const pmrem = new PMREMGenerator(renderer);
  let envRT: ReturnType<PMREMGenerator['fromScene']> | null = null;

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
  /** Склеенные сетки корпуса: общие на сцену, освобождаются вместе с ней. */
  let bodyGeometries: BufferGeometry[] = [];

  /* The loop used to redraw every frame for the whole life of the page, whether
     or not anything had moved. In the hero the device is deliberately dead
     still (idle 0) and in the looks block it is still until the fan opens, so
     most of those frames were a full re-render of an identical image — two
     WebGL contexts' worth, on a phone. Now a frame is drawn when the drift is
     running or when something has actually been set since the last one.

     Объявлено до сборки сцены, а не рядом с циклом: сборка стала асинхронной
     и толкает кадр из каждого своего этапа. */
  let dirty = true;
  const touch = () => {
    dirty = true;
  };

  const textureLoader = new TextureLoader();

  /* Сколько пикселей ширины нужно снимку на стекле.

     Именно здесь жило замыливание. Снимок 900×2065 ложился на стекло высотой
     около 1300 пикселей кадра — то есть уменьшался в полтора раза, а значит
     выбирался не нулевой уровень мип-карты, а середина между нулевым и
     первым: две трети веса доставались картинке половинного разрешения.
     Никакая анизотропия этого не лечит — уменьшение здесь равномерное по
     обеим осям, а она работает только на скосе.

     Лечится тем, что текстура запрашивается ровно того размера, в котором её
     будут показывать: тексель к пикселю один к одному, уровень мип-карты
     нулевой, буквы на стекле — как в исходном снимке. Побочно это ещё и
     вчетверо меньше байтов, потому что оптимизатор отдаёт AVIF/WebP.

     Мип-карты при этом остаются: на половине оборота стекло уходит в профиль
     и уменьшение становится сильным и неравномерным — там их и анизотропию
     видно как отсутствие ряби. */
  const glassWidthPx = () => {
    const h = container.clientHeight;
    if (!h) return 640;
    return Math.ceil(h * dpr * FILL * GLASS_OF_DEVICE * GLASS_ASPECT);
  };
  const screenWidth = glassWidthPx();
  /* Больше 8 не даёт ничего видимого и не везде поддержано. */
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const ready = (async () => {
    const template = await loadModel(modelUrl);
    if (disposed) return;

    /* Разбор модели закончен — отдать кадр браузеру, прежде чем строить
       окружение и устройства. */
    await yieldToMain();
    if (disposed) return;

    envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    await yieldToMain();
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

    await yieldToMain();
    if (disposed) return;

    /* Один корпус на сцену: устройства делят его сетки и материалы, каждому
       достаётся только своё дерево узлов. */
    const merged = mergedBody(template, materialFor, glassBlack);
    bodyGeometries = merged?.geometries ?? [];

    for (const [i, screenUrls] of devices.entries()) {
      /* По устройству за задачу: в блоке обликов их три, и клонирование
         с обходом дерева материалов на каждом — не то, что стоит делать
         подряд, не давая браузеру вставить слово. */
      if (i > 0) {
        await yieldToMain();
        if (disposed) return;
      }

      /* `clone()` группы из пяти сеток: геометрия и материалы передаются по
         ссылке, копируются только узлы. Если склеить не удалось — исходное
         дерево модели, каждой сетке свой материал, как было. */
      const body = merged ? merged.body.clone() : (template.clone() as Group);
      if (!merged) {
        body.traverse((node) => {
          if (!(node instanceof Mesh)) return;
          // The baked shadow planes belong to the original studio render and
          // read as grey smears against ink.
          if (/^shadow/.test(node.name)) {
            node.visible = false;
            return;
          }
          node.material = node.name === 'display' ? glassBlack : materialFor(node.name);
        });
      }
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
          const tex = textureLoader.load(optimizedSrc(url, screenWidth, 82), (t) => {
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
          tex.anisotropy = anisotropy;
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
    }

    frameCamera(size.y);
    resize();

    /* Сборка и линковка шейдеров — последнее, что осталось тяжёлого, и по
       умолчанию она случилась бы внутри первого же `render()`, то есть опять
       одним куском в главном потоке. `compileAsync` отдаёт её драйверу и
       ждёт готовности через KHR_parallel_shader_compile. */
    await renderer.compileAsync(scene, camera);
    if (disposed) return;

    touch();
  })();

  function frameCamera(height: number) {
    modelHeight = height;
    const fov = (camera.fov * Math.PI) / 180;
    camera.position.set(0, 0, height / FILL / 2 / Math.tan(fov / 2));
    camera.lookAt(0, 0, 0);
  }

  let sizedTo = '';
  /** @returns было ли что менять — по нему решается, нужен ли новый кадр. */
  function resize(): boolean {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return false;
    /* ResizeObserver срабатывает и от смены раскладки соседей, и от
       закреплений ScrollTrigger; пересобирать буфер под тот же самый размер
       незачем — это ещё один лишний кадр. */
    const size = `${w}x${h}`;
    if (size === sizedTo) return false;
    sizedTo = size;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Framed on height, so a narrow box crops the sides rather than shrinking
    // the device; the phone stays the same size as the column narrows.
    camera.updateProjectionMatrix();
    frameCamera(modelHeight);
    return true;
  }

  const ro = new ResizeObserver(() => {
    if (resize()) touch();
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

  /* Ниже разрешающей способности кадра: 1e-5 радиана на устройстве высотой
     в тысячу пикселей — это тысячные доли пикселя. */
  const SAME = 1e-5;
  const unchanged = (a: number, b: number) => Math.abs(a - b) < SAME;

  return {
    /* Сеттеры идемпотентны, и это не украшение.

       Прежде каждый из них объявлял кадр грязным независимо от того, изменил
       он что-нибудь или нет. ScrollTrigger пересчитывает свои триггеры на
       загрузке шрифтов, на каждой доехавшей картинке и на любом изменении
       размера, и каждый такой пересчёт вызывал `onRefresh` → `apply()` →
       четыре сеттера подряд с теми же самыми значениями — то есть полную
       перерисовку сцены ради того же самого изображения. За загрузку
       страницы так набиралось около десятка лишних кадров.

       На машине с видеокартой это незаметно, а вот там, где WebGL считается
       на процессоре — а именно так устроены серверы, на которых меряют
       производительность, — каждый лишний кадр стоит больше сотни
       миллисекунд блокировки главного потока. */
    setSpin(index, turns) {
      const d = built[index];
      if (!d) return;
      const next = Math.PI + turns * Math.PI * 2;
      if (unchanged(d.pivot.rotation.y, next)) return;
      d.pivot.rotation.y = next;
      touch();
    },
    setTilt(index, x, z) {
      const d = built[index];
      if (!d) return;
      if (unchanged(d.tiltX, x) && unchanged(d.tiltZ, z)) return;
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
      let moved = false;
      const put = (was: number, next: number | undefined, set: (v: number) => void) => {
        if (next === undefined || unchanged(was, next)) return;
        set(next);
        moved = true;
      };
      put(d.root.position.x, pose.x, (v) => (d.root.position.x = v));
      put(d.root.position.y, pose.y, (v) => (d.root.position.y = v));
      put(d.root.position.z, pose.z, (v) => (d.root.position.z = v));
      put(d.root.rotation.y, pose.yaw, (v) => (d.root.rotation.y = v));
      put(d.root.scale.x, pose.scale, (v) => d.root.scale.setScalar(v));
      if (moved) touch();
    },
    projectX(worldX) {
      const halfView = (modelHeight / FILL / 2) * camera.aspect;
      return halfView > 0 ? 0.5 + worldX / halfView / 2 : 0.5;
    },
    setIdle(amount) {
      if (unchanged(idle, amount)) return;
      idle = amount;
      touch();
    },
    resize() {
      if (resize()) touch();
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
      bodyGeometries.forEach((g) => g.dispose());
      bodyGeometries = [];
      [titanium, frame, lens, deep, glassBlack].forEach((m) => m.dispose());
      envRT?.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    },
    ready,
  };
}
