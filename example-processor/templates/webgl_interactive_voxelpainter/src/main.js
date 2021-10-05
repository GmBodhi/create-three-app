//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  MeshLambertMaterial,
  TextureLoader,
  GridHelper,
  Raycaster,
  Vector2,
  PlaneGeometry,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
} from "three";

let camera, scene, renderer;
let plane;
let pointer,
  raycaster,
  isShiftDown = false;

let rollOverMesh, rollOverMaterial;
let cubeGeo, cubeMaterial;

const objects = [];

init();
render();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(500, 800, 1300);
  camera.lookAt(0, 0, 0);

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  // roll-over helpers

  const rollOverGeo = new BoxGeometry(50, 50, 50);
  rollOverMaterial = new MeshBasicMaterial({
    color: 0xff0000,
    opacity: 0.5,
    transparent: true,
  });
  rollOverMesh = new Mesh(rollOverGeo, rollOverMaterial);
  scene.add(rollOverMesh);

  // cubes

  cubeGeo = new BoxGeometry(50, 50, 50);
  cubeMaterial = new MeshLambertMaterial({
    color: 0xfeb74c,
    map: new TextureLoader().load("textures/square-outline-textured.png"),
  });

  // grid

  const gridHelper = new GridHelper(1000, 20);
  scene.add(gridHelper);

  //

  raycaster = new Raycaster();
  pointer = new Vector2();

  const geometry = new PlaneGeometry(1000, 1000);
  geometry.rotateX(-Math.PI / 2);

  plane = new Mesh(geometry, new MeshBasicMaterial({ visible: false }));
  scene.add(plane);

  objects.push(plane);

  // lights

  const ambientLight = new AmbientLight(0x606060);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onDocumentKeyDown);
  document.addEventListener("keyup", onDocumentKeyUp);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function onPointerMove(event) {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(objects, false);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
    rollOverMesh.position
      .divideScalar(50)
      .floor()
      .multiplyScalar(50)
      .addScalar(25);
  }

  render();
}

function onPointerDown(event) {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(objects, false);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    // delete cube

    if (isShiftDown) {
      if (intersect.object !== plane) {
        scene.remove(intersect.object);

        objects.splice(objects.indexOf(intersect.object), 1);
      }

      // create cube
    } else {
      const voxel = new Mesh(cubeGeo, cubeMaterial);
      voxel.position.copy(intersect.point).add(intersect.face.normal);
      voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
      scene.add(voxel);

      objects.push(voxel);
    }

    render();
  }
}

function onDocumentKeyDown(event) {
  switch (event.keyCode) {
    case 16:
      isShiftDown = true;
      break;
  }
}

function onDocumentKeyUp(event) {
  switch (event.keyCode) {
    case 16:
      isShiftDown = false;
      break;
  }
}

function render() {
  renderer.render(scene, camera);
}
