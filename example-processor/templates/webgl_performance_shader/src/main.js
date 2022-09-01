//Shaders

import fragmentShader_ from "./shaders/fragmentShader.glsl";
import vertexShader_ from "./shaders/vertexShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  TextureLoader,
  Vector3,
  Vector2,
  RepeatWrapping,
  WebGLRenderer,
  MathUtils,
  Matrix4,
  Frustum,
  ShaderMaterial,
  Mesh,
  TorusGeometry,
} from "three";
import Stats from "three/addons/libs/stats.module.js";

let camera, renderer, clock, scene;

let uniforms, stats;
const materials = [];

init();
animate();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.z = 7;

  scene = new Scene();

  clock = new Clock();

  const textureLoader = new TextureLoader();

  uniforms = {
    fogDensity: { value: 0.001 },
    fogColor: { value: new Vector3(0, 0, 0) },
    time: { value: 1.0 },
    uvScale: { value: new Vector2(3.0, 1.0) },
    texture1: { value: textureLoader.load("textures/lava/cloud.png") },
    texture2: { value: textureLoader.load("textures/lava/lavatile.jpg") },
  };

  uniforms["texture1"].value.wrapS = uniforms["texture1"].value.wrapT =
    RepeatWrapping;
  uniforms["texture2"].value.wrapS = uniforms["texture2"].value.wrapT =
    RepeatWrapping;

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  onWindowResize();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  addMeshes();
}

function removeAllMeshes() {
  for (var i = scene.children.length - 1; i >= 0; i--) {
    const obj = scene.children[i];
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
}

function addMeshes() {
  removeAllMeshes();
  //reset pseudorandom number
  MathUtils.seededRandom(1);

  const projScreenMatrix = new Matrix4();
  const frustum = new Frustum();
  camera.updateMatrixWorld();
  projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(projScreenMatrix);

  const size = 0.65;
  let meshesCount = 0;
  while (meshesCount < 2500) {
    const material = new ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader_,
      fragmentShader: fragmentShader_,
    });

    const mesh = new Mesh(new TorusGeometry(size, 0.3, 30, 30), material);

    mesh.position.x = MathUtils.seededRandom() * 20 - 10;
    mesh.position.y = MathUtils.seededRandom() * 20 - 10;
    mesh.position.z = MathUtils.seededRandom() * 20 - 10;
    mesh.rotation.x = MathUtils.seededRandom() * 2 * Math.PI;
    mesh.rotation.y = MathUtils.seededRandom() * 2 * Math.PI;
    mesh.scale.x =
      mesh.scale.y =
      mesh.scale.z =
        MathUtils.seededRandom() * 0.2 + 0.1;

    mesh.updateMatrixWorld();

    if (frustum.intersectsObject(mesh)) {
      // mesh.rotation.x = 0.3;
      materials.push(material);
      scene.add(mesh);
      meshesCount++;
    }
  }
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  materials.forEach((material) => {
    material.needsUpdate = true;
  });

  const delta = 5 * clock.getDelta();
  uniforms["time"].value += 0.2 * delta;

  renderer.render(scene, camera);
}
