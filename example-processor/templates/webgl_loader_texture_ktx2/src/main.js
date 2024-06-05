import "./style.css"; // For webpack support

import {
  RGBAFormat,
  RGBA_BPTC_Format,
  RGBA_ASTC_4x4_Format,
  RGB_S3TC_DXT1_Format,
  RGBA_S3TC_DXT5_Format,
  RGB_PVRTC_4BPPV1_Format,
  RGBA_PVRTC_4BPPV1_Format,
  RGB_ETC1_Format,
  RGB_ETC2_Format,
  RGBA_ETC2_EAC_Format,
  UnsignedByteType,
  ByteType,
  ShortType,
  UnsignedShortType,
  IntType,
  UnsignedIntType,
  FloatType,
  HalfFloatType,
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  PlaneGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
  NearestMipmapNearestFilter,
} from "three";

import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls, loader, material;

const SAMPLES = {
  "BasisU ETC1S": "2d_etc1s.ktx2",
  "BasisU UASTC": "2d_uastc.ktx2",
  "RGBA8 sRGB": "2d_rgba8.ktx2",
  "RGBA8 Linear": "2d_rgba8_linear.ktx2",
  // 'RGBA8 Display P3': '2d_rgba8_displayp3.ktx2',
  "RGBA16 Linear": "2d_rgba16_linear.ktx2",
  "RGBA32 Linear": "2d_rgba32_linear.ktx2",
  "ASTC 6x6 (mobile)": "2d_astc_6x6.ktx2",
};

const FORMAT_LABELS = {
  [RGBAFormat]: "RGBA",
  [RGBA_BPTC_Format]: "RGBA_BPTC",
  [RGBA_ASTC_4x4_Format]: "RGBA_ASTC_4x4",
  [RGB_S3TC_DXT1_Format]: "RGB_S3TC_DXT1",
  [RGBA_S3TC_DXT5_Format]: "RGBA_S3TC_DXT5",
  [RGB_PVRTC_4BPPV1_Format]: "RGB_PVRTC_4BPPV1",
  [RGBA_PVRTC_4BPPV1_Format]: "RGBA_PVRTC_4BPPV1",
  [RGB_ETC1_Format]: "RGB_ETC1",
  [RGB_ETC2_Format]: "RGB_ETC2",
  [RGBA_ETC2_EAC_Format]: "RGB_ETC2_EAC",
};

const TYPE_LABELS = {
  [UnsignedByteType]: "UnsignedByteType",
  [ByteType]: "ByteType",
  [ShortType]: "ShortType",
  [UnsignedShortType]: "UnsignedShortType",
  [IntType]: "IntType",
  [UnsignedIntType]: "UnsignedIntType",
  [FloatType]: "FloatType",
  [HalfFloatType]: "HalfFloatType",
};

const params = {
  sample: Object.values(SAMPLES)[0],
};

init();

async function init() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  scene = new Scene();
  scene.background = new Color(0x202020);

  camera = new PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(0, 0, 2.5);
  camera.lookAt(scene.position);
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);

  // PlaneGeometry UVs assume flipY=true, which compressed textures don't support.
  const geometry = flipY(new PlaneGeometry());
  material = new MeshBasicMaterial({
    color: 0xffffff,
    side: DoubleSide,
    transparent: true,
  });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  loader = new KTX2Loader()
    .setTranscoderPath("jsm/libs/basis/")
    .detectSupport(renderer);

  const gui = new GUI();

  gui.add(params, "sample", SAMPLES).onChange(loadTexture);

  await loadTexture(params.sample);

  renderer.setAnimationLoop(animate);
}

function animate() {
  controls.update();

  renderer.render(scene, camera);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

async function loadTexture(path) {
  try {
    const texture = await loader.loadAsync(
      `three/examples/textures/compressed/${path}`
    );
    texture.minFilter = NearestMipmapNearestFilter;

    material.map = texture;
    material.needsUpdate = true;

    console.info(`format: ${FORMAT_LABELS[texture.format]}`);
    console.info(`type: ${TYPE_LABELS[texture.type]}`);
    console.info(`colorSpace: ${texture.colorSpace}`);
  } catch (e) {
    console.error(e);
  }

  // NOTE: Call `loader.dispose()` when finished loading textures.
}

/** Correct UVs to be compatible with `flipY=false` textures. */
function flipY(geometry) {
  const uv = geometry.attributes.uv;

  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, 1 - uv.getY(i));
  }

  return geometry;
}
