import "./style.css"; // For webpack support

import {
  Vector3,
  Scene,
  Color,
  Fog,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  TextureLoader,
  MeshLambertMaterial,
  DoubleSide,
  ParametricBufferGeometry,
  Mesh,
  SphereGeometry,
  RepeatWrapping,
  sRGBEncoding,
  PlaneGeometry,
  BoxGeometry,
  WebGLRenderer,
  SpotLight,
  Plane,
  MeshPhongMaterial,
  TorusKnotGeometry,
  Matrix4,
  Group,
  MeshBasicMaterial,
  HemisphereLight,
  CameraHelper,
  PlaneHelper,
  AlwaysStencilFunc,
  BackSide,
  IncrementWrapStencilOp,
  FrontSide,
  DecrementWrapStencilOp,
  Clock,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShadowMaterial,
  Vector2,
  Euler,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Raycaster,
  MeshNormalMaterial,
  DepthFormat,
  UnsignedShortType,
  DepthStencilFormat,
  UnsignedIntType,
  UnsignedInt248Type,
  WebGLRenderTarget,
  RGBFormat,
  NearestFilter,
  DepthTexture,
  OrthographicCamera,
  ShaderMaterial,
  Float32BufferAttribute,
  BufferAttribute,
  DynamicDrawUsage,
  DataTexture,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  PointLight,
  BufferGeometryLoader,
  Vector4,
  MathUtils,
  GridHelper,
  CatmullRomCurve3,
  FogExp2,
  ClampToEdgeWrapping,
  Cache,
  FontLoader,
  TextGeometry,
  ShapeGeometry,
  Object3D,
  PointLightHelper,
  PolarGridHelper,
  BoxHelper,
  WireframeGeometry,
  LineSegments,
  EdgesGeometry,
  Quaternion,
  InstancedMesh,
  Points,
  PointsMaterial,
  HemisphereLightHelper,
  DirectionalLightHelper,
  AnimationMixer,
  LineDashedMaterial,
  Font,
  IcosahedronGeometry,
  ACESFilmicToneMapping,
  PMREMGenerator,
  Box3,
} from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";

let container, progressBarDiv;

let camera, scene, renderer, controls, gui, guiData;

let model;

const ldrawPath = "models/ldraw/officialLibrary/";

const modelFileList = {
  Car: "models/car.ldr_Packed.mpd",
  "Lunar Vehicle": "models/1621-1-LunarMPVVehicle.mpd_Packed.mpd",
  "Radar Truck": "models/889-1-RadarTruck.mpd_Packed.mpd",
  Trailer: "models/4838-1-MiniVehicles.mpd_Packed.mpd",
  Bulldozer: "models/4915-1-MiniConstruction.mpd_Packed.mpd",
  Helicopter: "models/4918-1-MiniFlyers.mpd_Packed.mpd",
  Plane: "models/5935-1-IslandHopper.mpd_Packed.mpd",
  Lighthouse: "models/30023-1-Lighthouse.ldr_Packed.mpd",
  "X-Wing mini": "models/30051-1-X-wingFighter-Mini.mpd_Packed.mpd",
  "AT-ST mini": "models/30054-1-AT-ST-Mini.mpd_Packed.mpd",
  "AT-AT mini": "models/4489-1-AT-AT-Mini.mpd_Packed.mpd",
  Shuttle: "models/4494-1-Imperial Shuttle-Mini.mpd_Packed.mpd",
  "TIE Interceptor": "models/6965-1-TIEIntercep_4h4MXk5.mpd_Packed.mpd",
  "Star fighter": "models/6966-1-JediStarfighter-Mini.mpd_Packed.mpd",
  "X-Wing": "models/7140-1-X-wingFighter.mpd_Packed.mpd",
  "AT-ST": "models/10174-1-ImperialAT-ST-UCS.mpd_Packed.mpd",
};

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(150, 200, 250);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // scene

  const pmremGenerator = new PMREMGenerator(renderer);

  scene = new Scene();
  scene.background = new Color(0xdeebed);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

  controls = new OrbitControls(camera, renderer.domElement);

  //

  guiData = {
    modelFileName: modelFileList["Car"],
    separateObjects: false,
    displayLines: true,
    conditionalLines: true,
    smoothNormals: true,
    constructionStep: 0,
    noConstructionSteps: "No steps.",
  };

  window.addEventListener("resize", onWindowResize);

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

  reloadObject(true);
}

function updateObjectsVisibility() {
  model.traverse((c) => {
    if (c.isLineSegments) {
      if (c.isConditionalLine) {
        c.visible = guiData.conditionalLines;
      } else {
        c.visible = guiData.displayLines;
      }
    } else if (c.isGroup) {
      // Hide objects with construction step > gui setting
      c.visible = c.userData.constructionStep <= guiData.constructionStep;
    }
  });
}

function reloadObject(resetCamera) {
  if (model) {
    scene.remove(model);
  }

  model = null;

  updateProgressBar(0);
  showProgressBar();

  const lDrawLoader = new LDrawLoader();
  lDrawLoader.separateObjects = guiData.separateObjects;
  lDrawLoader.smoothNormals = guiData.smoothNormals;
  lDrawLoader.setPath(ldrawPath).load(
    guiData.modelFileName,
    function (group2) {
      if (model) {
        scene.remove(model);
      }

      model = group2;

      // Convert from LDraw coordinates: rotate 180 degrees around OX
      model.rotation.x = Math.PI;

      scene.add(model);

      guiData.constructionStep = model.userData.numConstructionSteps - 1;

      updateObjectsVisibility();

      // Adjust camera and light

      const bbox = new Box3().setFromObject(model);
      const size = bbox.getSize(new Vector3());
      const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.5;

      if (resetCamera) {
        controls.target0.copy(bbox.getCenter(new Vector3()));
        controls.position0
          .set(-2.3, 1, 2)
          .multiplyScalar(radius)
          .add(controls.target0);
        controls.reset();
      }

      createGUI();

      hideProgressBar();
    },
    onProgress,
    onError
  );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createGUI() {
  if (gui) {
    gui.destroy();
  }

  gui = new GUI();

  gui
    .add(guiData, "modelFileName", modelFileList)
    .name("Model")
    .onFinishChange(function () {
      reloadObject(true);
    });

  gui
    .add(guiData, "separateObjects")
    .name("Separate Objects")
    .onChange(function () {
      reloadObject(false);
    });

  if (guiData.separateObjects) {
    if (model.userData.numConstructionSteps > 1) {
      gui
        .add(
          guiData,
          "constructionStep",
          0,
          model.userData.numConstructionSteps - 1
        )
        .step(1)
        .name("Construction step")
        .onChange(updateObjectsVisibility);
    } else {
      gui
        .add(guiData, "noConstructionSteps")
        .name("Construction step")
        .onChange(updateObjectsVisibility);
    }
  }

  gui
    .add(guiData, "smoothNormals")
    .name("Smooth Normals")
    .onChange(function changeNormals() {
      reloadObject(false);
    });

  gui
    .add(guiData, "displayLines")
    .name("Display Lines")
    .onChange(updateObjectsVisibility);
  gui
    .add(guiData, "conditionalLines")
    .name("Conditional Lines")
    .onChange(updateObjectsVisibility);
}

//

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  renderer.render(scene, camera);
}

function onProgress(xhr) {
  if (xhr.lengthComputable) {
    updateProgressBar(xhr.loaded / xhr.total);

    console.log(Math.round((xhr.loaded / xhr.total) * 100, 2) + "% downloaded");
  }
}

function onError() {
  const message = "Error loading model";
  progressBarDiv.innerText = message;
  console.log(message);
}

function showProgressBar() {
  document.body.appendChild(progressBarDiv);
}

function hideProgressBar() {
  document.body.removeChild(progressBarDiv);
}

function updateProgressBar(fraction) {
  progressBarDiv.innerText =
    "Loading... " + Math.round(fraction * 100, 2) + "%";
}
