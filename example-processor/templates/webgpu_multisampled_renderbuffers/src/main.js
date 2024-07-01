import "./style.css"; // For webpack support

import {
  Vector2,
  Matrix4,
  Vector3,
  PerspectiveCamera,
  Scene,
  Color,
  BoxGeometry,
  MeshPhongNodeMaterial,
  InstancedMesh,
  WebGPURenderer,
  RenderTarget,
  MeshBasicNodeMaterial,
  QuadMesh,
} from "three";
import { texture } from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;
const mouse = new Vector2();

let quadMesh, renderTarget;

let box, box2;

const dpr = 1;

const params = {
  animated: true,
  samples: 4,
};

const mat4 = new Matrix4();

const count = 50;
const fullRadius = 20; // Radius of the sphere
const halfRadius = 10; // Radius of the sphere
const positions = new Array(count).fill().map((_, i) => {
  const radius = i % 2 === 0 ? fullRadius : halfRadius;

  const phi = Math.acos(2 * Math.random() - 1) - Math.PI / 2; // phi: latitude, range -π/2 to π/2
  const theta = 2 * Math.PI * Math.random(); // theta: longitude, range 0 to 2π

  return new Vector3(
    radius * Math.cos(phi) * Math.cos(theta), // x
    radius * Math.sin(phi), // y
    radius * Math.cos(phi) * Math.sin(theta) // z
  );
});

initGUI();
init();

function initGUI() {
  const gui = new GUI();
  gui.add(params, "samples", 0, 4).step(1);
  gui.add(params, "animated", true);
}

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.z = 3;

  scene = new Scene();
  scene.background = new Color(0x111111);

  // textured mesh

  const geometryBox = new BoxGeometry(7, 7, 7, 12, 12, 12);
  const materialBox = new MeshPhongNodeMaterial();
  const materialBoxInner = new MeshPhongNodeMaterial({ color: 0xff0000 });

  materialBox.wireframe = true;

  //

  box = new InstancedMesh(geometryBox, materialBox, count);
  box2 = new InstancedMesh(geometryBox, materialBoxInner, count);

  for (let i = 0; i < count; i++) {
    box.setMatrixAt(i, mat4.identity().setPosition(positions[i]));
    box2.setMatrixAt(i, mat4.multiplyScalar(0.996).setPosition(positions[i]));
  }

  scene.add(box, box2);

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  renderTarget = new RenderTarget(
    window.innerWidth * dpr,
    window.innerHeight * dpr,
    {
      samples: params.samples,
      depthBuffer: true,
    }
  );

  window.addEventListener("mousemove", onWindowMouseMove);
  window.addEventListener("resize", onWindowResize);

  // FX

  // modulate the final color based on the mouse position

  const materialFX = new MeshBasicNodeMaterial();
  materialFX.colorNode = texture(renderTarget.texture).rgb;

  quadMesh = new QuadMesh(materialFX);
}

function onWindowMouseMove(e) {
  mouse.x = e.offsetX / window.innerWidth;
  mouse.y = e.offsetY / window.innerHeight;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

function animate() {
  if (params.animated) {
    box.rotation.x += 0.001;
    box.rotation.y += 0.002;
    box2.rotation.x += 0.001;
    box2.rotation.y += 0.002;
  }

  renderTarget.samples = params.samples;

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  renderer.setRenderTarget(null);
  quadMesh.render(renderer);
}
