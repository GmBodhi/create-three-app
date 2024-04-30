import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  AxesHelper,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  VectorKeyframeTrack,
  QuaternionKeyframeTrack,
  Vector3,
  Quaternion,
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
  camera.position.set(25, 25, 50);
  camera.lookAt(scene.position);

  //

  const axesHelper = new AxesHelper(10);
  scene.add(axesHelper);

  //

  const geometry = new BoxGeometry(5, 5, 5);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
  });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // create a keyframe track (i.e. a timed sequence of keyframes) for each animated property
  // Note: the keyframe track type should correspond to the type of the property being animated

  // POSITION
  const positionKF = new VectorKeyframeTrack(
    ".position",
    [0, 1, 2],
    [0, 0, 0, 30, 0, 0, 0, 0, 0]
  );

  // SCALE
  const scaleKF = new VectorKeyframeTrack(
    ".scale",
    [0, 1, 2],
    [1, 1, 1, 2, 2, 2, 1, 1, 1]
  );

  // ROTATION
  // Rotation should be performed using quaternions, using a QuaternionKeyframeTrack
  // Interpolating Euler angles (.rotation property) can be problematic and is currently not supported

  // set up rotation about x axis
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

  // COLOR
  const colorKF = new ColorKeyframeTrack(
    ".material.color",
    [0, 1, 2],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    InterpolateDiscrete
  );

  // OPACITY
  const opacityKF = new NumberKeyframeTrack(
    ".material.opacity",
    [0, 1, 2],
    [1, 0, 1]
  );

  // create an animation sequence with the tracks
  // If a negative time value is passed, the duration will be calculated from the times of the passed tracks array
  const clip = new AnimationClip("Action", 3, [
    scaleKF,
    positionKF,
    quaternionKF,
    colorKF,
    opacityKF,
  ]);

  // setup the AnimationMixer
  mixer = new AnimationMixer(mesh);

  // create a ClipAction and set it to play
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
