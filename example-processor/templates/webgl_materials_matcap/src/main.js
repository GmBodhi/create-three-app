import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  ACESFilmicToneMapping,
  sRGBEncoding,
  Scene,
  PerspectiveCamera,
  LoadingManager,
  TextureLoader,
  MeshMatcapMaterial,
  Color,
  Texture,
  HalfFloatType,
  DataTexture,
  LinearEncoding,
  LinearFilter,
} from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

let mesh, renderer, scene, camera;

const API = {
  color: 0xffffff, // sRGB
  exposure: 1.0,
};

init();

function init() {
  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // tone mapping
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = API.exposure;

  renderer.outputEncoding = sRGBEncoding;

  // scene
  scene = new Scene();

  // camera
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.set(0, 0, 13);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.enableZoom = false;
  controls.enablePan = false;

  // manager
  const manager = new LoadingManager(render);

  // matcap
  const loaderEXR = new EXRLoader(manager);
  const matcap = loaderEXR.load("textures/matcaps/040full.exr");

  // normalmap
  const loader = new TextureLoader(manager);

  const normalmap = loader.load(
    "models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
  );

  // model
  new GLTFLoader(manager).load(
    "models/gltf/LeePerrySmith/LeePerrySmith.glb",
    function (gltf) {
      mesh = gltf.scene.children[0];
      mesh.position.y = -0.25;

      mesh.material = new MeshMatcapMaterial({
        color: new Color().setHex(API.color).convertSRGBToLinear(),
        matcap: matcap,
        normalMap: normalmap,
      });

      scene.add(mesh);
    }
  );

  // gui
  const gui = new GUI();

  gui
    .addColor(API, "color")
    .listen()
    .onChange(function () {
      mesh.material.color.set(API.color).convertSRGBToLinear();
      render();
    });

  gui.add(API, "exposure", 0, 2).onChange(function () {
    renderer.toneMappingExposure = API.exposure;
    render();
  });

  gui.domElement.style.webkitUserSelect = "none";

  // drag 'n drop
  initDragAndDrop();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  render();
}

function render() {
  renderer.render(scene, camera);
}

//
// drag and drop anywhere in document
//

function updateMatcap(texture) {
  if (mesh.material.matcap) {
    mesh.material.matcap.dispose();
  }

  mesh.material.matcap = texture;

  texture.needsUpdate = true;

  mesh.material.needsUpdate = true; // because the encoding can change

  render();
}

function handleJPG(event) {
  // PNG, too

  function imgCallback(event) {
    const texture = new Texture(event.target);

    texture.encoding = sRGBEncoding;

    updateMatcap(texture);
  }

  const img = new Image();

  img.onload = imgCallback;

  img.src = event.target.result;
}

function handleEXR(event) {
  const contents = event.target.result;

  const loader = new EXRLoader();

  loader.setDataType(HalfFloatType);

  const texData = loader.parse(contents);

  const texture = new DataTexture();

  texture.image.width = texData.width;
  texture.image.height = texData.height;
  texture.image.data = texData.data;

  texture.format = texData.format;
  texture.type = texData.type;
  texture.encoding = LinearEncoding;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;

  updateMatcap(texture);
}

function loadFile(file) {
  const filename = file.name;
  const extension = filename.split(".").pop().toLowerCase();

  if (extension === "exr") {
    const reader = new FileReader();

    reader.addEventListener("load", function (event) {
      handleEXR(event);
    });

    reader.readAsArrayBuffer(file);
  } else {
    // 'jpg', 'png'

    const reader = new FileReader();

    reader.addEventListener("load", function (event) {
      handleJPG(event);
    });

    reader.readAsDataURL(file);
  }
}

function initDragAndDrop() {
  document.addEventListener("dragover", function (event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  document.addEventListener("drop", function (event) {
    event.preventDefault();

    loadFile(event.dataTransfer.files[0]);
  });
}
