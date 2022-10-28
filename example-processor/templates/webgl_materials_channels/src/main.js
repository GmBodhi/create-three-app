import "./style.css"; // For webpack support

import {
  FrontSide,
  BackSide,
  DoubleSide,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  OrthographicCamera,
  AmbientLight,
  PointLight,
  TextureLoader,
  MeshStandardMaterial,
  Vector2,
  MeshDepthMaterial,
  BasicDepthPacking,
  RGBADepthPacking,
  MeshNormalMaterial,
  ShaderMaterial,
  UniformsUtils,
  Mesh,
  Matrix4,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VelocityShader } from "three/addons/shaders/VelocityShader.js";

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
  materialNormal,
  materialVelocity;

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
    "velocity",
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

  materialVelocity = new ShaderMaterial({
    uniforms: UniformsUtils.clone(VelocityShader.uniforms),
    vertexShader: VelocityShader.vertexShader,
    fragmentShader: VelocityShader.fragmentShader,
    side: DoubleSide,
  });
  materialVelocity.uniforms.displacementMap.value = displacementMap;
  materialVelocity.uniforms.displacementScale.value = SCALE;
  materialVelocity.uniforms.displacementBias.value = BIAS;
  materialVelocity.extensions.derivatives = true;

  //

  const loader = new OBJLoader();
  loader.load("models/obj/ninja/ninjaHead_Low.obj", function (group) {
    const geometry = group.children[0].geometry;
    geometry.attributes.uv2 = geometry.attributes.uv;
    geometry.center();

    mesh = new Mesh(geometry, materialNormal);
    mesh.scale.multiplyScalar(25);
    mesh.userData.matrixWorldPrevious = new Matrix4(); // for velocity
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
      case "velocity":
        material = materialVelocity;
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

  // remember camera projection changes

  materialVelocity.uniforms.previousProjectionViewMatrix.value.copy(
    materialVelocity.uniforms.currentProjectionViewMatrix.value
  );
  materialVelocity.uniforms.currentProjectionViewMatrix.value.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );

  if (mesh && mesh.userData.matrixWorldPrevious) {
    materialVelocity.uniforms.modelMatrixPrev.value.copy(
      mesh.userData.matrixWorldPrevious
    );
  }

  renderer.render(scene, camera);

  scene.traverse(function (object) {
    if (object.isMesh) {
      object.userData.matrixWorldPrevious.copy(object.matrixWorld);
    }
  });
}
