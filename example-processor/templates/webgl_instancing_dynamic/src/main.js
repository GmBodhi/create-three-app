import "./style.css"; // For webpack support

import {
  Object3D,
  Color,
  Vector3,
  WebGLRenderer,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Timer,
  TextureLoader,
  SRGBColorSpace,
  BoxGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  DynamicDrawUsage,
} from "three";

import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import TWEEN from "three/addons/libs/tween.module.js";

let camera, scene, renderer, timer, mesh;

const amount = 100;

const count = Math.pow(amount, 2);
const dummy = new Object3D();

const seeds = [];
const baseColors = [];

const color = new Color();
const colors = [new Color(0x00ffff), new Color(0xffff00), new Color(0xff00ff)];
const animation = { t: 0 };
let currentColorIndex = 0;
let nextColorIndex = 1;

const maxDistance = 75;
const cameraTarget = new Vector3();

init();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = NeutralToneMapping;
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  const pmremGenerator = new PMREMGenerator(renderer);

  scene = new Scene();
  scene.background = new Color(0xadd8e6);
  scene.environment = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;

  timer = new Timer();
  timer.connect(document);

  const loader = new TextureLoader();
  const texture = loader.load("textures/edge3.jpg");
  texture.colorSpace = SRGBColorSpace;

  const geometry = new BoxGeometry();
  const material = new MeshStandardMaterial({ map: texture });

  mesh = new InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage); // will be updated every frame
  scene.add(mesh);

  let i = 0;
  const offset = (amount - 1) / 2;

  for (let x = 0; x < amount; x++) {
    for (let z = 0; z < amount; z++) {
      dummy.position.set(offset - x, 0, offset - z);
      dummy.scale.set(1, 2, 1);

      dummy.updateMatrix();

      color.setHSL(1, 0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5);
      baseColors.push(color.getHex());

      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.multiply(colors[0]));

      i++;

      seeds.push(Math.random());
    }
  }

  //

  window.addEventListener("resize", onWindowResize);

  setInterval(startTween, 3000);
}

function startTween() {
  // tween for animating color transition

  new TWEEN.Tween(animation)
    .to(
      {
        t: 1,
      },
      2000
    )
    .easing(TWEEN.Easing.Sinusoidal.In)
    .onComplete(() => {
      animation.t = 0;

      currentColorIndex = nextColorIndex;
      nextColorIndex++;

      if (nextColorIndex >= colors.length) nextColorIndex = 0;
    })
    .start();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  timer.update();

  const time = timer.getElapsed();

  TWEEN.update();

  // animate camera

  camera.position.x = Math.sin(time / 4) * 10;
  camera.position.z = Math.cos(time / 4) * 10;
  camera.position.y = 8 + Math.cos(time / 2) * 2;

  cameraTarget.x = Math.sin(time / 4) * -8;
  cameraTarget.z = Math.cos(time / 2) * -8;

  camera.lookAt(cameraTarget);

  camera.up.x = Math.sin(time / 400);

  // animate instance positions and colors

  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

    dummy.position.y = Math.abs(Math.sin((time + seeds[i]) * 2 + seeds[i]));

    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);

    // colors

    if (animation.t > 0) {
      const currentColor = colors[currentColorIndex];
      const nextColor = colors[nextColorIndex];

      const f = dummy.position.length() / maxDistance;

      if (f <= animation.t) {
        color.set(baseColors[i]).multiply(nextColor);
      } else {
        color.set(baseColors[i]).multiply(currentColor);
      }

      mesh.setColorAt(i, color);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (animation.t > 0) mesh.instanceColor.needsUpdate = true;

  mesh.computeBoundingSphere();

  renderer.render(scene, camera);
}
