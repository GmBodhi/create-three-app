import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  AgXToneMapping,
  PerspectiveCamera,
  Scene,
  PMREMGenerator,
  EquirectangularReflectionMapping,
  Vector3,
  Vector2,
  DataTexture,
  RGBAFormat,
  FloatType,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  Color,
  NoToneMapping,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { KTX2Exporter } from "three/addons/exporters/KTX2Exporter.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let scene,
  camera,
  renderer,
  exporter,
  mesh,
  controls,
  renderTarget,
  dataTexture;

const params = {
  target: "pmrem",
  export: exportFile,
};

init();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.toneMapping = AgXToneMapping;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(10, 0, 0);

  scene = new Scene();

  exporter = new KTX2Exporter();
  const hdrLoader = new HDRLoader();

  //

  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  hdrLoader.load(
    "textures/equirectangular/venice_sunset_1k.hdr",
    function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      renderTarget = pmremGenerator.fromEquirectangular(texture);
      scene.background = renderTarget.texture;
    }
  );

  createDataTexture();

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.rotateSpeed = -0.25; // negative, to track mouse pointer

  //

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui
    .add(params, "target")
    .options(["pmrem", "data-texture"])
    .onChange(swapScene);
  gui.add(params, "export").name("Export KTX2");
  gui.open();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
}

function createDataTexture() {
  const normal = new Vector3();
  const coord = new Vector2();
  const size = 800,
    radius = 320,
    factor = (Math.PI * 0.5) / radius;
  const data = new Float32Array(4 * size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const idx = i * size * 4 + j * 4;
      coord.set(j, i).subScalar(size / 2);

      if (coord.length() < radius)
        normal.set(
          Math.sin(coord.x * factor),
          Math.sin(coord.y * factor),
          Math.cos(coord.x * factor)
        );
      else normal.set(0, 0, 1);

      data[idx + 0] = 0.5 + 0.5 * normal.x;
      data[idx + 1] = 0.5 + 0.5 * normal.y;
      data[idx + 2] = 0.5 + 0.5 * normal.z;
      data[idx + 3] = 1;
    }
  }

  dataTexture = new DataTexture(data, size, size, RGBAFormat, FloatType);
  dataTexture.needsUpdate = true;

  const material = new MeshBasicMaterial({ map: dataTexture });
  const quad = new PlaneGeometry(50, 50);
  mesh = new Mesh(quad, material);
  mesh.visible = false;

  scene.add(mesh);
}

function swapScene() {
  if (params.target == "pmrem") {
    camera.position.set(10, 0, 0);
    controls.enabled = true;
    scene.background = renderTarget.texture;
    mesh.visible = false;
    renderer.toneMapping = AgXToneMapping;
  } else {
    camera.position.set(0, 0, 70);
    controls.enabled = false;
    scene.background = new Color(0, 0, 0);
    mesh.visible = true;
    renderer.toneMapping = NoToneMapping;
  }
}

async function exportFile() {
  let result;

  if (params.target == "pmrem")
    result = await exporter.parse(renderer, renderTarget);
  else result = await exporter.parse(dataTexture);

  saveArrayBuffer(result, params.target + ".ktx2");
}

function saveArrayBuffer(buffer, filename) {
  const blob = new Blob([buffer], { type: "image/ktx2" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
