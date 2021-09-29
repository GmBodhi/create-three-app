import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  Scene,
  PerspectiveCamera,
  PlaneBufferGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
} from "three";

import { BasisTextureLoader } from "three/examples/jsm/loaders/BasisTextureLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;
let mesh;

init();
render();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 1);
  camera.lookAt(scene.position);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);

  const geometry = flipY(new PlaneBufferGeometry());
  const material = new MeshBasicMaterial({ side: DoubleSide });

  mesh = new Mesh(geometry, material);

  scene.add(mesh);

  const loader = new BasisTextureLoader();
  loader.setTranscoderPath("js/libs/basis/");
  loader.detectSupport(renderer);
  loader.load(
    "textures/compressed/canestra_di_frutta_caravaggio.basis",
    function (texture) {
      texture.encoding = sRGBEncoding;
      material.map = texture;
      material.needsUpdate = true;

      render();
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}

/** Correct UVs to be compatible with `flipY=false` textures. */
function flipY(geometry) {
  const uv = geometry.attributes.uv;

  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, 1 - uv.getY(i));
  }

  return geometry;
}
