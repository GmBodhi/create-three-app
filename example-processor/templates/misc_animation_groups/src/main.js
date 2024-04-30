import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  AnimationObjectGroup,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector3,
  Quaternion,
  QuaternionKeyframeTrack,
  ColorKeyframeTrack,
  InterpolateDiscrete,
  NumberKeyframeTrack,
  AnimationClip,
  AnimationMixer,
  WebGLRenderer,
  Clock,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let stats, clock;
let scene, camera, renderer, mixer;

init();

function init() {
  scene = new Scene();

  //

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(50, 50, 100);
  camera.lookAt(scene.position);

  // all objects of this animation group share a common animation state

  const animationGroup = new AnimationObjectGroup();

  //

  const geometry = new BoxGeometry(5, 5, 5);
  const material = new MeshBasicMaterial({ transparent: true });

  //

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const mesh = new Mesh(geometry, material);

      mesh.position.x = 32 - 16 * i;
      mesh.position.y = 0;
      mesh.position.z = 32 - 16 * j;

      scene.add(mesh);
      animationGroup.add(mesh);
    }
  }

  // create some keyframe tracks

  const xAxis = new Vector3(1, 0, 0);
  const qInitial = new Quaternion().setFromAxisAngle(xAxis, 0);
  const qFinal = new Quaternion().setFromAxisAngle(xAxis, Math.PI);
  const quaternionKF = new QuaternionKeyframeTrack(
    ".quaternion",
    [0, 1, 2],
    [
      qInitial.x,
      qInitial.y,
      qInitial.z,
      qInitial.w,
      qFinal.x,
      qFinal.y,
      qFinal.z,
      qFinal.w,
      qInitial.x,
      qInitial.y,
      qInitial.z,
      qInitial.w,
    ]
  );

  const colorKF = new ColorKeyframeTrack(
    ".material.color",
    [0, 1, 2],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    InterpolateDiscrete
  );
  const opacityKF = new NumberKeyframeTrack(
    ".material.opacity",
    [0, 1, 2],
    [1, 0, 1]
  );

  // create clip

  const clip = new AnimationClip("default", 3, [
    quaternionKF,
    colorKF,
    opacityKF,
  ]);

  // apply the animation group to the mixer as the root object

  mixer = new AnimationMixer(animationGroup);

  const clipAction = mixer.clipAction(clip);
  clipAction.play();

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  clock = new Clock();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  renderer.render(scene, camera);

  stats.update();
}
