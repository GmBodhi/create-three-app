import "./style.css"; // For webpack support

import {
  ColorManagement,
  Vector2,
  Color,
  PerspectiveCamera,
  OrthographicCamera,
  Scene,
  BufferGeometry,
  Float32BufferAttribute,
  BufferAttribute,
  DynamicDrawUsage,
  LineBasicMaterial,
  Line,
  FramebufferTexture,
  RGBAFormat,
  NearestFilter,
  SpriteMaterial,
  Sprite,
  WebGLRenderer,
  LinearSRGBColorSpace,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as GeometryUtils from "three/addons/utils/GeometryUtils.js";

ColorManagement.enabled = false; // TODO: Confirm correct color management.

let camera, scene, renderer;
let line, sprite, texture;

let cameraOrtho, sceneOrtho;

let offset = 0;

const dpr = window.devicePixelRatio;

const textureSize = 128 * dpr;
const vector = new Vector2();
const color = new Color();

init();
animate();

function init() {
  //

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.z = 20;

  cameraOrtho = new OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    1,
    10
  );
  cameraOrtho.position.z = 10;

  scene = new Scene();
  sceneOrtho = new Scene();

  //

  const points = GeometryUtils.gosper(8);

  const geometry = new BufferGeometry();
  const positionAttribute = new Float32BufferAttribute(points, 3);
  geometry.setAttribute("position", positionAttribute);
  geometry.center();

  const colorAttribute = new BufferAttribute(
    new Float32Array(positionAttribute.array.length),
    3
  );
  colorAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute("color", colorAttribute);

  const material = new LineBasicMaterial({ vertexColors: true });

  line = new Line(geometry, material);
  line.scale.setScalar(0.05);
  scene.add(line);

  //

  texture = new FramebufferTexture(textureSize, textureSize, RGBAFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;

  //

  const spriteMaterial = new SpriteMaterial({ map: texture });
  sprite = new Sprite(spriteMaterial);
  sprite.scale.set(textureSize, textureSize, 1);
  sceneOrtho.add(sprite);

  updateSpritePosition();

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);

  //

  const selection = document.getElementById("selection");
  const controls = new OrbitControls(camera, selection);
  controls.enablePan = false;

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  cameraOrtho.left = -width / 2;
  cameraOrtho.right = width / 2;
  cameraOrtho.top = height / 2;
  cameraOrtho.bottom = -height / 2;
  cameraOrtho.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  updateSpritePosition();
}

function updateSpritePosition() {
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;

  const halfImageWidth = textureSize / 2;
  const halfImageHeight = textureSize / 2;

  sprite.position.set(
    -halfWidth + halfImageWidth,
    halfHeight - halfImageHeight,
    1
  );
}

function animate() {
  requestAnimationFrame(animate);

  const colorAttribute = line.geometry.getAttribute("color");
  updateColors(colorAttribute);

  // scene rendering

  renderer.clear();
  renderer.render(scene, camera);

  // calculate start position for copying data

  vector.x = (window.innerWidth * dpr) / 2 - textureSize / 2;
  vector.y = (window.innerHeight * dpr) / 2 - textureSize / 2;

  renderer.copyFramebufferToTexture(vector, texture);

  renderer.clearDepth();
  renderer.render(sceneOrtho, cameraOrtho);
}

function updateColors(colorAttribute) {
  const l = colorAttribute.count;

  for (let i = 0; i < l; i++) {
    const h = ((offset + i) % l) / l;

    color.setHSL(h, 1, 0.5);
    colorAttribute.setX(i, color.r);
    colorAttribute.setY(i, color.g);
    colorAttribute.setZ(i, color.b);
  }

  colorAttribute.needsUpdate = true;

  offset -= 25;
}
