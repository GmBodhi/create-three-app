import "./style.css"; // For webpack support

import {
  Clock,
  Matrix4,
  Scene,
  Color,
  PerspectiveCamera,
  LineSegments,
  LineBasicMaterial,
  HemisphereLight,
  DirectionalLight,
  BoxGeometry,
  Mesh,
  MeshLambertMaterial,
  Vector3,
  Raycaster,
  WebGLRenderer,
  sRGBEncoding,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  Line,
  RingGeometry,
  MeshBasicMaterial,
  MathUtils,
} from "three";

import { BoxLineGeometry } from "three/addons/geometries/BoxLineGeometry.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const clock = new Clock();

let container;
let camera, scene, raycaster, renderer;

let room;

let controller, controllerGrip;
let INTERSECTED;
const tempMatrix = new Matrix4();

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();
  scene.background = new Color(0x505050);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1.6, 3);
  scene.add(camera);

  room = new LineSegments(
    new BoxLineGeometry(6, 6, 6, 10, 10, 10).translate(0, 3, 0),
    new LineBasicMaterial({ color: 0x808080 })
  );
  scene.add(room);

  scene.add(new HemisphereLight(0x606060, 0x404040));

  const light = new DirectionalLight(0xffffff);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new BoxGeometry(0.15, 0.15, 0.15);

  for (let i = 0; i < 200; i++) {
    const object = new Mesh(
      geometry,
      new MeshLambertMaterial({ color: Math.random() * 0xffffff })
    );

    object.position.x = Math.random() * 4 - 2;
    object.position.y = Math.random() * 4;
    object.position.z = Math.random() * 4 - 2;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    object.userData.velocity = new Vector3();
    object.userData.velocity.x = Math.random() * 0.01 - 0.005;
    object.userData.velocity.y = Math.random() * 0.01 - 0.005;
    object.userData.velocity.z = Math.random() * 0.01 - 0.005;

    room.add(object);
  }

  raycaster = new Raycaster();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //

  function onSelectStart() {
    this.userData.isSelecting = true;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);
  controller.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
  scene.add(controller);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip = renderer.xr.getControllerGrip(0);
  controllerGrip.add(
    controllerModelFactory.createControllerModel(controllerGrip)
  );
  scene.add(controllerGrip);

  window.addEventListener("resize", onWindowResize);

  //

  document.body.appendChild(VRButton.createButton(renderer));
}

function buildController(data) {
  let geometry, material;

  switch (data.targetRayMode) {
    case "tracked-pointer":
      geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        "color",
        new Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );

      material = new LineBasicMaterial({
        vertexColors: true,
        blending: AdditiveBlending,
      });

      return new Line(geometry, material);

    case "gaze":
      geometry = new RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new MeshBasicMaterial({ opacity: 0.5, transparent: true });
      return new Mesh(geometry, material);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta() * 60;

  if (controller.userData.isSelecting === true) {
    const cube = room.children[0];
    room.remove(cube);

    cube.position.copy(controller.position);
    cube.userData.velocity.x = (Math.random() - 0.5) * 0.02 * delta;
    cube.userData.velocity.y = (Math.random() - 0.5) * 0.02 * delta;
    cube.userData.velocity.z = (Math.random() * 0.01 - 0.05) * delta;
    cube.userData.velocity.applyQuaternion(controller.quaternion);
    room.add(cube);
  }

  // find intersections

  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(room.children, false);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].object) {
      if (INTERSECTED)
        INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

      INTERSECTED = intersects[0].object;
      INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
      INTERSECTED.material.emissive.setHex(0xff0000);
    }
  } else {
    if (INTERSECTED)
      INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

    INTERSECTED = undefined;
  }

  // Keep cubes inside room

  for (let i = 0; i < room.children.length; i++) {
    const cube = room.children[i];

    cube.userData.velocity.multiplyScalar(1 - 0.001 * delta);

    cube.position.add(cube.userData.velocity);

    if (cube.position.x < -3 || cube.position.x > 3) {
      cube.position.x = MathUtils.clamp(cube.position.x, -3, 3);
      cube.userData.velocity.x = -cube.userData.velocity.x;
    }

    if (cube.position.y < 0 || cube.position.y > 6) {
      cube.position.y = MathUtils.clamp(cube.position.y, 0, 6);
      cube.userData.velocity.y = -cube.userData.velocity.y;
    }

    if (cube.position.z < -3 || cube.position.z > 3) {
      cube.position.z = MathUtils.clamp(cube.position.z, -3, 3);
      cube.userData.velocity.z = -cube.userData.velocity.z;
    }

    cube.rotation.x += cube.userData.velocity.x * 2 * delta;
    cube.rotation.y += cube.userData.velocity.y * 2 * delta;
    cube.rotation.z += cube.userData.velocity.z * 2 * delta;
  }

  renderer.render(scene, camera);
}
