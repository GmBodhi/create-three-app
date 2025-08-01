import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  Fn,
  length,
  fract,
  vec4,
  positionWorld,
  smoothstep,
  max,
  abs,
  float,
  fwidth,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { MaterialXLoader } from "three/addons/loaders/MaterialXLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const SAMPLE_PATH =
  "https://raw.githubusercontent.com/materialx/MaterialX/main/resources/Materials/Examples/StandardSurface/";
const LOCAL_SAMPLE_PATH = "materialx/";
const samples = [
  "standard_surface_brass_tiled.mtlx",
  "standard_surface_brick_procedural.mtlx",
  "standard_surface_carpaint.mtlx",
  //'standard_surface_chess_set.mtlx',
  "standard_surface_chrome.mtlx",
  "standard_surface_copper.mtlx",
  //'standard_surface_default.mtlx',
  //'standard_surface_glass.mtlx',
  //'standard_surface_glass_tinted.mtlx',
  "standard_surface_gold.mtlx",
  //'standard_surface_greysphere.mtlx',
  //'standard_surface_greysphere_calibration.mtlx',
  "standard_surface_jade.mtlx",
  //'standard_surface_look_brass_tiled.mtlx',
  //'standard_surface_look_wood_tiled.mtlx',
  "standard_surface_marble_solid.mtlx",
  "standard_surface_metal_brushed.mtlx",
  "standard_surface_plastic.mtlx",
  //'standard_surface_thin_film.mtlx',
  "standard_surface_velvet.mtlx",
  "standard_surface_wood_tiled.mtlx",
];

const localSamples = [
  "heightnormal.mtlx",
  "conditional_if_float.mtlx",
  "image_transform.mtlx",
  "color3_vec3_cm_test.mtlx",
  "rotate2d_test.mtlx",
  "rotate3d_test.mtlx",
  "heighttonormal_normal_input.mtlx",
  "roughness_test.mtlx",
  "opacity_test.mtlx",
  "opacity_only_test.mtlx",
  "specular_test.mtlx",
  "ior_test.mtlx",
  "combined_test.mtlx",
  "texture_opacity_test.mtlx",
  "transmission_test.mtlx",
  "transmission_only_test.mtlx",
  "transmission_rough.mtlx",
  "thin_film_rainbow_test.mtlx",
  "thin_film_ior_clamp_test.mtlx",
  "sheen_test.mtlx",
];

let camera, scene, renderer;
let controls, prefab;
const models = [];

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = LinearToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.setAnimationLoop(render);
  container.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    200
  );
  camera.position.set(10, 10, 20);

  scene = new Scene();
  scene.background = new Color(0xffffff);

  // Ground plane

  const material = new MeshBasicNodeMaterial();

  const gridXZ = Fn(
    ([
      gridSize = float(1.0),
      dotWidth = float(0.1),
      lineWidth = float(0.02),
    ]) => {
      const coord = positionWorld.xz.div(gridSize);
      const grid = fract(coord);

      // Screen-space derivative for automatic antialiasing
      const fw = fwidth(coord);
      const smoothing = max(fw.x, fw.y).mul(0.5);

      // Create squares at cell centers
      const squareDist = max(abs(grid.x.sub(0.5)), abs(grid.y.sub(0.5)));
      const dots = smoothstep(
        dotWidth.add(smoothing),
        dotWidth.sub(smoothing),
        squareDist
      );

      // Create grid lines
      const lineX = smoothstep(
        lineWidth.add(smoothing),
        lineWidth.sub(smoothing),
        abs(grid.x.sub(0.5))
      );
      const lineZ = smoothstep(
        lineWidth.add(smoothing),
        lineWidth.sub(smoothing),
        abs(grid.y.sub(0.5))
      );
      const lines = max(lineX, lineZ);

      return max(dots, lines);
    }
  );

  const radialGradient = Fn(([radius = float(10.0), falloff = float(1.0)]) => {
    return smoothstep(radius, radius.sub(falloff), length(positionWorld));
  });

  // Create grid pattern
  const gridPattern = gridXZ(1.0, 0.03, 0.005);
  const baseColor = vec4(1.0, 1.0, 1.0, 0.0);
  const gridColor = vec4(0.5, 0.5, 0.5, 1.0);

  // Mix base color with grid lines
  material.colorNode = gridPattern
    .mix(baseColor, gridColor)
    .mul(radialGradient(30.0, 20.0));
  material.transparent = true;

  const plane = new Mesh(new CircleGeometry(40), material);
  plane.rotation.x = -Math.PI / 2;
  plane.renderOrder = -1;
  scene.add(plane);

  //

  controls = new OrbitControls(camera);
  controls.connect(renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 40;

  //

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("san_giuseppe_bridge_2k.hdr", async (texture) => {
      texture.mapping = EquirectangularReflectionMapping;

      scene.environment = texture;

      prefab = (
        await new GLTFLoader().loadAsync(
          "three/examples/models/gltf/ShaderBall.glb"
        )
      ).scene;

      for (const sample of samples) {
        await addSample(sample, SAMPLE_PATH);
      }

      for (const sample of localSamples) {
        await addSample(sample, LOCAL_SAMPLE_PATH);
      }

      addGUI();
    });

  window.addEventListener("resize", onWindowResize);
}

function updateModelsAlign() {
  const COLUMN_COUNT = 6;
  const DIST_X = 3;
  const DIST_Z = 3;

  const lineCount = Math.floor(models.length / COLUMN_COUNT) - 1.5;

  const offsetX = DIST_X * (COLUMN_COUNT - 1) * -0.5;
  const offsetZ = DIST_Z * lineCount * 0.5;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];

    model.position.x = (i % COLUMN_COUNT) * DIST_X + offsetX;
    model.position.z = Math.floor(i / COLUMN_COUNT) * -DIST_Z + offsetZ;
  }
}

async function addSample(sample, path) {
  const model = prefab.clone();

  models.push(model);

  scene.add(model);

  updateModelsAlign();

  //

  const material = await new MaterialXLoader()
    .setPath(path)
    .loadAsync(sample)
    .then(({ materials }) => Object.values(materials).pop());

  const calibrationMesh = model.getObjectByName("Calibration_Mesh");
  calibrationMesh.material = material;

  const previewMesh = model.getObjectByName("Preview_Mesh");
  previewMesh.material = material;

  if (material.transparent) {
    calibrationMesh.renderOrder = 1;
    previewMesh.renderOrder = 2;
  }
}

function addGUI() {
  const gui = new GUI();

  const API = {
    showCalibrationMesh: true,
    showPreviewMesh: true,
  };

  const folder = gui.addFolder("SHOW");

  folder
    .add(API, "showCalibrationMesh")
    .name("Calibration Mesh")
    .onChange(function (value) {
      setVisibility("Calibration_Mesh", value);
    });

  folder
    .add(API, "showPreviewMesh")
    .name("Preview Mesh")
    .onChange(function (value) {
      setVisibility("Preview_Mesh", value);
    });
}

function setVisibility(name, visible) {
  scene.traverse(function (node) {
    if (node.isMesh) {
      if (node.name == name) node.visible = visible;
    }
  });
}

//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  controls.update();
  renderer.render(scene, camera);
}
