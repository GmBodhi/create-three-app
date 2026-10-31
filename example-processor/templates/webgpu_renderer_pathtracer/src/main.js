import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { Inspector } from "three/addons/inspector/Inspector.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { WebGPUPathTracer } from "three-gpu-pathtracer/webgpu";

// "rotation" turns the model about Y, "lift" raises it off the floor by a fraction of its
// height, "distance" scales how far back the camera starts
const MODELS = {
  "Steampunk Camera": { url: "models/gltf/steampunk_camera.glb" },
  "Iridescent Dish With Olives": {
    url: "models/gltf/IridescentDishWithOlives.glb",
    rotation: Math.PI / 3,
    distance: 0.7,
  },
  "Anisotropy Barn Lamp": {
    url: "models/gltf/AnisotropyBarnLamp.glb",
    lift: 0.05,
  },
  "Venice Mask": { url: "models/gltf/venice_mask.glb" },
  "Damaged Helmet": {
    url: "models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf",
  },
};

let camera, scene, renderer, controls, gui;
let pathTracer, floor, model;

const params = {
  enable: true,
  model: "Steampunk Camera",
  resolutionScale: 1,
  roughness: 0.2,
  metalness: 0.2,
  samples: 0,
};

init();

async function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  pathTracer = new WebGPUPathTracer(renderer);
  pathTracer.filterGlossyFactor = 1;
  pathTracer.minSamples = 3;
  pathTracer.maxSamples = 32;
  pathTracer.renderScale = params.resolutionScale;

  scene = new Scene();
  scene.background = new Color(0xeeeeee);

  // a floor that fades out toward the edges
  floor = new Mesh(
    new PlaneGeometry(),
    new MeshStandardMaterial({
      side: DoubleSide,
      roughness: params.roughness,
      metalness: params.metalness,
      map: generateRadialFloorTexture(1024),
      transparent: true,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", () => {
    pathTracer.updateCamera();
  });

  window.addEventListener("resize", onWindowResize);
  onWindowResize();

  createGUI();

  const envMap = await new HDRLoader()
    .setPath("textures/equirectangular/")
    .loadAsync("blouberg_sunrise_2_1k.hdr");
  envMap.mapping = EquirectangularReflectionMapping;
  scene.environment = envMap;

  await loadModel();

  renderer.setAnimationLoop(animate);
}

async function loadModel() {
  const { url, rotation = 0, lift = 0, distance = 1 } = MODELS[params.model];
  const gltf = await new GLTFLoader()
    .setDRACOLoader(new DRACOLoader())
    .loadAsync(url);

  if (model) {
    scene.remove(model);
  }

  model = gltf.scene;
  model.rotation.y = rotation;
  model.updateMatrixWorld();
  scene.add(model);

  // place the floor under the model, then raise the model if asked
  const bbox = new Box3().setFromObject(model);
  const size = bbox.getSize(new Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.6;

  floor.scale.setScalar(radius * 8);
  floor.position.y = bbox.min.y;

  model.position.y = lift * size.y;
  model.updateMatrixWorld();

  // frame the model
  controls.target0.copy(bbox.getCenter(new Vector3()));
  controls.target0.y += model.position.y;
  controls.position0
    .set(2.3, 1, 2)
    .multiplyScalar(radius * distance)
    .add(controls.target0);
  controls.reset();

  pathTracer.setScene(scene, camera);
}

function onWindowResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  pathTracer.updateCamera();
}

function createGUI() {
  gui = renderer.inspector.createParameters("Settings");
  gui.add(params, "model", Object.keys(MODELS)).onChange(loadModel);
  gui.add(params, "enable");
  gui.add(params, "resolutionScale", 0.1, 1.0, 0.1).onChange((v) => {
    pathTracer.renderScale = v;
    pathTracer.reset();
  });
  gui
    .add(params, "roughness", 0, 1)
    .name("floor roughness")
    .onChange((v) => {
      floor.material.roughness = v;
      pathTracer.updateMaterials();
    });
  gui
    .add(params, "metalness", 0, 1)
    .name("floor metalness")
    .onChange((v) => {
      floor.material.metalness = v;
      pathTracer.updateMaterials();
    });

  const renderFolder = gui.addFolder("Render");
  const samplesUIValue = renderFolder.addString(params, "samples").listen();
  samplesUIValue.input.disabled = true;
}

//

function animate() {
  if (params.enable) {
    pathTracer.renderSample();

    pathTracer.getSampleCountsAsync().then((counts) => {
      params.samples = Math.floor(counts.avg);
    });
  } else {
    renderer.render(scene, camera);
  }
}

function generateRadialFloorTexture(dim) {
  const data = new Uint8Array(dim * dim * 4);

  for (let x = 0; x < dim; x++) {
    for (let y = 0; y < dim; y++) {
      const xNorm = x / (dim - 1);
      const yNorm = y / (dim - 1);

      const xCent = 2.0 * (xNorm - 0.5);
      const yCent = 2.0 * (yNorm - 0.5);
      let a = Math.max(
        Math.min(1.0 - Math.sqrt(xCent ** 2 + yCent ** 2), 1.0),
        0.0
      );
      a = a ** 1.5;
      a = a * 1.5;
      a = Math.min(a, 1.0);

      const i = y * dim + x;
      data[i * 4 + 0] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = a * 255;
    }
  }

  const tex = new DataTexture(data, dim, dim);
  tex.format = RGBAFormat;
  tex.type = UnsignedByteType;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
