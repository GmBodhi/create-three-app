import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  Scene,
  Color,
  PerspectiveCamera,
  PlaneGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
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
} from "three";

import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.outputEncoding = sRGBEncoding;
document.body.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(0x202020);

const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
camera.position.set(2, 1.5, 1);
camera.lookAt(scene.position);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;

// PlaneGeometry UVs assume flipY=true, which compressed textures don't support.
const geometry = flipY(new PlaneGeometry());
const material = new MeshBasicMaterial({
  color: 0xffffff,
  side: DoubleSide,
});
const mesh = new Mesh(geometry, material);
scene.add(mesh);

const formatStrings = {
  [RGBAFormat]: "RGBA32",
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

// Samples: sample_etc1s.ktx2, sample_uastc.ktx2, sample_uastc_zstd.ktx2
const loader = new KTX2Loader()
  .setTranscoderPath("js/libs/basis/")
  .detectSupport(renderer);

animate();

try {
  const texture = await loader.loadAsync(
    "three/examples/textures/compressed/sample_uastc_zstd.ktx2"
  );

  console.info(`transcoded to ${formatStrings[texture.format]}`);

  material.map = texture;
  material.transparent = true;

  material.needsUpdate = true;
} catch (e) {
  console.error(e);
} finally {
  loader.dispose();
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/** Correct UVs to be compatible with `flipY=false` textures. */
function flipY(geometry) {
  const uv = geometry.attributes.uv;

  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, 1 - uv.getY(i));
  }

  return geometry;
}
