import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  BoxGeometry,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  TextureLoader,
  Points,
  WebGLRenderer,
  Raycaster,
  Vector2,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

let renderer, scene, camera, stats;

let particles;

const PARTICLE_SIZE = 20;

let raycaster, intersects;
let pointer, INTERSECTED;

init();
animate();

function init() {
  const container = document.getElementById("container");

  scene = new Scene();

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 250;

  //

  let boxGeometry = new BoxGeometry(200, 200, 200, 16, 16, 16);

  // if normal and uv attributes are not removed, mergeVertices() can't consolidate indentical vertices with different normal/uv data

  boxGeometry.deleteAttribute("normal");
  boxGeometry.deleteAttribute("uv");

  boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

  //

  const positionAttribute = boxGeometry.getAttribute("position");

  const colors = [];
  const sizes = [];

  const color = new Color();

  for (let i = 0, l = positionAttribute.count; i < l; i++) {
    color.setHSL(0.01 + 0.1 * (i / l), 1.0, 0.5);
    color.toArray(colors, i * 3);

    sizes[i] = PARTICLE_SIZE * 0.5;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("customColor", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("size", new Float32BufferAttribute(sizes, 1));

  //

  const material = new ShaderMaterial({
    uniforms: {
      color: { value: new Color(0xffffff) },
      pointTexture: {
        value: new TextureLoader().load("textures/sprites/disc.png"),
      },
      alphaTest: { value: 0.9 },
    },
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,
  });

  //

  particles = new Points(geometry, material);
  scene.add(particles);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  raycaster = new Raycaster();
  pointer = new Vector2();

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("pointermove", onPointerMove);
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  particles.rotation.x += 0.0005;
  particles.rotation.y += 0.001;

  const geometry = particles.geometry;
  const attributes = geometry.attributes;

  raycaster.setFromCamera(pointer, camera);

  intersects = raycaster.intersectObject(particles);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].index) {
      attributes.size.array[INTERSECTED] = PARTICLE_SIZE;

      INTERSECTED = intersects[0].index;

      attributes.size.array[INTERSECTED] = PARTICLE_SIZE * 1.25;
      attributes.size.needsUpdate = true;
    }
  } else if (INTERSECTED !== null) {
    attributes.size.array[INTERSECTED] = PARTICLE_SIZE;
    attributes.size.needsUpdate = true;
    INTERSECTED = null;
  }

  renderer.render(scene, camera);
}
