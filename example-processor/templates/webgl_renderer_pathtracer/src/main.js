import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  WebGLRenderer,
  ACESFilmicToneMapping,
  Scene,
  MeshPhysicalMaterial,
  Box3,
  Vector3,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  DoubleSide,
  NoToneMapping,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  LinearFilter,
  RepeatWrapping,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawUtils } from "three/addons/utils/LDrawUtils.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import {
  WebGLPathTracer,
  BlurredEnvMapGenerator,
  GradientEquirectTexture,
} from "three-gpu-pathtracer";

let progressBarDiv, samplesEl;
let camera, scene, renderer, controls, gui;
let pathTracer, floor, gradientMap;

const params = {
  enable: true,
  toneMapping: true,
  pause: false,
  tiles: 3,
  transparentBackground: false,
  resolutionScale: 1,
  download: () => {
    const link = document.createElement("a");
    link.download = "pathtraced-render.png";
    link.href = renderer.domElement
      .toDataURL()
      .replace("image/png", "image/octet-stream");
    link.click();
  },
  roughness: 0.15,
  metalness: 0.9,
};

init();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(150, 200, 250);

  // initialize the renderer
  renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  gradientMap = new GradientEquirectTexture();
  gradientMap.topColor.set(0xeeeeee);
  gradientMap.bottomColor.set(0xeaeaea);
  gradientMap.update();

  // initialize the pathtracer
  pathTracer = new WebGLPathTracer(renderer);
  pathTracer.filterGlossyFactor = 1;
  pathTracer.minSamples = 3;
  pathTracer.renderScale = params.resolutionScale;
  pathTracer.tiles.set(params.tiles, params.tiles);

  // scene
  scene = new Scene();
  scene.background = gradientMap;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", () => {
    pathTracer.updateCamera();
  });

  window.addEventListener("resize", onWindowResize);
  onWindowResize();

  progressBarDiv = document.createElement("div");
  progressBarDiv.innerText = "Loading...";
  progressBarDiv.style.fontSize = "3em";
  progressBarDiv.style.color = "#888";
  progressBarDiv.style.display = "block";
  progressBarDiv.style.position = "absolute";
  progressBarDiv.style.top = "50%";
  progressBarDiv.style.width = "100%";
  progressBarDiv.style.textAlign = "center";

  // load materials and then the model
  createGUI();

  loadModel();
}

async function loadModel() {
  progressBarDiv.innerText = "Loading...";

  let model = null;
  let environment = null;

  updateProgressBar(0);
  showProgressBar();

  // only smooth when not rendering with flat colors to improve processing time
  const ldrawPromise = new LDrawLoader()
    .setConditionalLineMaterial(LDrawConditionalLineMaterial)
    .setPath("models/ldraw/officialLibrary/")
    .loadAsync("models/7140-1-X-wingFighter.mpd_Packed.mpd", onProgress)
    .then(function (legoGroup) {
      // Convert from LDraw coordinates: rotate 180 degrees around OX
      legoGroup = LDrawUtils.mergeObject(legoGroup);
      legoGroup.rotation.x = Math.PI;
      legoGroup.updateMatrixWorld();
      model = legoGroup;

      legoGroup.traverse((c) => {
        // hide the line segments
        if (c.isLineSegments) {
          c.visible = false;
        }

        // adjust the materials to use transmission, be a bit shinier
        if (c.material) {
          c.material.roughness *= 0.25;

          if (c.material.opacity < 1.0) {
            const oldMaterial = c.material;
            const newMaterial = new MeshPhysicalMaterial();

            newMaterial.opacity = 1.0;
            newMaterial.transmission = 1.0;
            newMaterial.thickness = 1.0;
            newMaterial.ior = 1.4;
            newMaterial.roughness = oldMaterial.roughness;
            newMaterial.metalness = 0.0;

            const hsl = {};
            oldMaterial.color.getHSL(hsl);
            hsl.l = Math.max(hsl.l, 0.35);
            newMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);

            c.material = newMaterial;
          }
        }
      });
    })
    .catch(onError);

  const envMapPromise = new HDRLoader()
    .setPath("textures/equirectangular/")
    .loadAsync("royal_esplanade_1k.hdr")
    .then((tex) => {
      const envMapGenerator = new BlurredEnvMapGenerator(renderer);
      const blurredEnvMap = envMapGenerator.generate(tex, 0);

      environment = blurredEnvMap;
    })
    .catch(onError);

  await Promise.all([envMapPromise, ldrawPromise]);

  hideProgressBar();
  document.body.classList.add("checkerboard");

  // set environment map
  scene.environment = environment;

  // Adjust camera
  const bbox = new Box3().setFromObject(model);
  const size = bbox.getSize(new Vector3());
  const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.4;

  controls.target0.copy(bbox.getCenter(new Vector3()));
  controls.position0
    .set(2.3, 1, 2)
    .multiplyScalar(radius)
    .add(controls.target0);
  controls.reset();

  // add the model
  scene.add(model);

  // add floor
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
  floor.scale.setScalar(2500);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = bbox.min.y;
  scene.add(floor);

  // reset the progress bar to display bvh generation
  progressBarDiv.innerText = "Generating BVH...";
  updateProgressBar(0);

  pathTracer.setScene(scene, camera);

  renderer.setAnimationLoop(animate);
}

function onWindowResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio;

  renderer.setSize(w, h);
  renderer.setPixelRatio(dpr);

  const aspect = w / h;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  pathTracer.updateCamera();
}

function createGUI() {
  if (gui) {
    gui.destroy();
  }

  gui = new GUI();
  gui.add(params, "enable");
  gui.add(params, "pause");
  gui.add(params, "toneMapping");
  gui.add(params, "transparentBackground").onChange((v) => {
    scene.background = v ? null : gradientMap;
    pathTracer.updateEnvironment();
  });
  gui.add(params, "resolutionScale", 0.1, 1.0, 0.1).onChange((v) => {
    pathTracer.renderScale = v;
    pathTracer.reset();
  });
  gui.add(params, "tiles", 1, 6, 1).onChange((v) => {
    pathTracer.tiles.set(v, v);
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
  gui.add(params, "download").name("download image");

  const renderFolder = gui.addFolder("Render");

  samplesEl = document.createElement("div");
  samplesEl.classList.add("gui-render");
  samplesEl.innerText = "samples: 0";

  renderFolder.$children.appendChild(samplesEl);
  renderFolder.open();
}

//

function animate() {
  renderer.toneMapping = params.toneMapping
    ? ACESFilmicToneMapping
    : NoToneMapping;

  const samples = Math.floor(pathTracer.samples);
  samplesEl.innerText = `samples: ${samples}`;

  pathTracer.enablePathTracing = params.enable;
  pathTracer.pausePathTracing = params.pause;
  pathTracer.renderSample();

  samplesEl.innerText = `samples: ${Math.floor(pathTracer.samples)}`;
}

function onProgress(xhr) {
  if (xhr.lengthComputable) {
    updateProgressBar(xhr.loaded / xhr.total);

    console.log(Math.round((xhr.loaded / xhr.total) * 100) + "% downloaded");
  }
}

function onError(error) {
  const message = "Error loading model";
  progressBarDiv.innerText = message;
  console.log(message);
  console.error(error);
}

function showProgressBar() {
  document.body.appendChild(progressBarDiv);
}

function hideProgressBar() {
  document.body.removeChild(progressBarDiv);
}

function updateProgressBar(fraction) {
  progressBarDiv.innerText = "Loading... " + Math.round(fraction * 100) + "%";
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
