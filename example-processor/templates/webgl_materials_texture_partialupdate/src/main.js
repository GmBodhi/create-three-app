import "./style.css"; // For webpack support

import {
  Vector2,
  Color,
  PerspectiveCamera,
  Scene,
  Clock,
  TextureLoader,
  LinearFilter,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  DataTexture,
  WebGLRenderer,
  MathUtils,
} from "three";

let camera, scene, renderer, clock, dataTexture, diffuseMap;

let last = 0;
const position = new Vector2();
const color = new Color();

init();

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.z = 2;

  scene = new Scene();

  clock = new Clock();

  const loader = new TextureLoader();
  diffuseMap = loader.load(
    "textures/floors/FloorsCheckerboard_S_Diffuse.jpg",
    animate
  );
  diffuseMap.minFilter = LinearFilter;
  diffuseMap.generateMipmaps = false;

  const geometry = new PlaneGeometry(2, 2);
  const material = new MeshBasicMaterial({ map: diffuseMap });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  const width = 32;
  const height = 32;

  const data = new Uint8Array(width * height * 4);
  dataTexture = new DataTexture(data, width, height);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  if (elapsedTime - last > 0.1) {
    last = elapsedTime;

    position.x = 32 * MathUtils.randInt(1, 16) - 32;
    position.y = 32 * MathUtils.randInt(1, 16) - 32;

    // generate new color data

    updateDataTexture(dataTexture);

    // perform copy from src to dest texture to a random position

    renderer.copyTextureToTexture(position, dataTexture, diffuseMap);
  }

  renderer.render(scene, camera);
}

function updateDataTexture(texture) {
  const size = texture.image.width * texture.image.height;
  const data = texture.image.data;

  // generate a random color and update texture data

  color.setHex(Math.random() * 0xffffff);

  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);

  for (let i = 0; i < size; i++) {
    const stride = i * 4;

    data[stride] = r;
    data[stride + 1] = g;
    data[stride + 2] = b;
    data[stride + 3] = 1;
  }
}
