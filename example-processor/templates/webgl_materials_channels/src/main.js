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
  LOD,
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor,
  SrcAlphaSaturateFactor,
  CustomBlending,
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
  MeshDepthMaterial,
  BasicDepthPacking,
  RGBADepthPacking,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let stats;

let camera, scene, renderer;

const params = {
  material: "normal",
  camera: "perspective",
  side: "double",
};

const sides = {
  front: FrontSide,
  back: BackSide,
  double: DoubleSide,
};

let cameraOrtho, cameraPerspective;
let controlsOrtho, controlsPerspective;

let mesh,
  materialStandard,
  materialDepthBasic,
  materialDepthRGBA,
  materialNormal;

const SCALE = 2.436143; // from original model
const BIAS = -0.428408; // from original model

init();
animate();
initGui();

// Init gui
function initGui() {
  const gui = new GUI();
  gui.add(params, "material", [
    "standard",
    "normal",
    "depthBasic",
    "depthRGBA",
  ]);
  gui.add(params, "camera", ["perspective", "ortho"]);
  gui.add(params, "side", ["front", "back", "double"]);
}

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  scene = new Scene();

  const aspect = window.innerWidth / window.innerHeight;
  cameraPerspective = new PerspectiveCamera(45, aspect, 500, 3000);
  cameraPerspective.position.z = 1500;
  scene.add(cameraPerspective);

  const height = 500;
  cameraOrtho = new OrthographicCamera(
    -height * aspect,
    height * aspect,
    height,
    -height,
    1000,
    2500
  );
  cameraOrtho.position.z = 1500;
  scene.add(cameraOrtho);

  camera = cameraPerspective;

  controlsPerspective = new OrbitControls(
    cameraPerspective,
    renderer.domElement
  );
  controlsPerspective.minDistance = 1000;
  controlsPerspective.maxDistance = 2400;
  controlsPerspective.enablePan = false;
  controlsPerspective.enableDamping = true;

  controlsOrtho = new OrbitControls(cameraOrtho, renderer.domElement);
  controlsOrtho.minZoom = 0.5;
  controlsOrtho.maxZoom = 1.5;
  controlsOrtho.enablePan = false;
  controlsOrtho.enableDamping = true;

  // lights

  const ambientLight = new AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xff0000, 0.5);
  pointLight.position.z = 2500;
  scene.add(pointLight);

  const pointLight2 = new PointLight(0xff6666, 1);
  camera.add(pointLight2);

  const pointLight3 = new PointLight(0x0000ff, 0.5);
  pointLight3.position.x = -1000;
  pointLight3.position.z = 1000;
  scene.add(pointLight3);

  // textures

  const textureLoader = new TextureLoader();
  const normalMap = textureLoader.load("models/obj/ninja/normal.png");
  const aoMap = textureLoader.load("models/obj/ninja/ao.jpg");
  const displacementMap = textureLoader.load(
    "models/obj/ninja/displacement.jpg"
  );

  // material

  materialStandard = new MeshStandardMaterial({
    color: 0xffffff,

    metalness: 0.5,
    roughness: 0.6,

    displacementMap: displacementMap,
    displacementScale: SCALE,
    displacementBias: BIAS,

    aoMap: aoMap,

    normalMap: normalMap,
    normalScale: new Vector2(1, -1),

    //flatShading: true,

    side: DoubleSide,
  });

  materialDepthBasic = new MeshDepthMaterial({
    depthPacking: BasicDepthPacking,

    displacementMap: displacementMap,
    displacementScale: SCALE,
    displacementBias: BIAS,

    side: DoubleSide,
  });

  materialDepthRGBA = new MeshDepthMaterial({
    depthPacking: RGBADepthPacking,

    displacementMap: displacementMap,
    displacementScale: SCALE,
    displacementBias: BIAS,

    side: DoubleSide,
  });

  materialNormal = new MeshNormalMaterial({
    displacementMap: displacementMap,
    displacementScale: SCALE,
    displacementBias: BIAS,

    normalMap: normalMap,
    normalScale: new Vector2(1, -1),

    //flatShading: true,

    side: DoubleSide,
  });

  //

  const loader = new OBJLoader();
  loader.load("models/obj/ninja/ninjaHead_Low.obj", function (group) {
    const geometry = group.children[0].geometry;
    geometry.attributes.uv2 = geometry.attributes.uv;
    geometry.center();

    mesh = new Mesh(geometry, materialNormal);
    mesh.scale.multiplyScalar(25);
    scene.add(mesh);
  });

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = window.innerWidth / window.innerHeight;

  camera.aspect = aspect;

  camera.left = -height * aspect;
  camera.right = height * aspect;
  camera.top = height;
  camera.bottom = -height;

  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

//

function animate() {
  requestAnimationFrame(animate);

  stats.begin();
  render();
  stats.end();
}

function render() {
  if (mesh) {
    let material = mesh.material;

    switch (params.material) {
      case "standard":
        material = materialStandard;
        break;
      case "depthBasic":
        material = materialDepthBasic;
        break;
      case "depthRGBA":
        material = materialDepthRGBA;
        break;
      case "normal":
        material = materialNormal;
        break;
    }

    if (sides[params.side] !== material.side) {
      switch (params.side) {
        case "front":
          material.side = FrontSide;
          break;
        case "back":
          material.side = BackSide;
          break;
        case "double":
          material.side = DoubleSide;
          break;
      }

      material.needsUpdate = true;
    }

    mesh.material = material;
  }

  switch (params.camera) {
    case "perspective":
      camera = cameraPerspective;
      break;
    case "ortho":
      camera = cameraOrtho;
      break;
  }

  controlsPerspective.update();
  controlsOrtho.update(); // must update both controls for damping to complete

  renderer.render(scene, camera);
}
