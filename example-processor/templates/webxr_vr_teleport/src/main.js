import "./style.css"; // For webpack support

import {
  Matrix4,
  Scene,
  Color,
  PerspectiveCamera,
  LineSegments,
  LineBasicMaterial,
  HemisphereLight,
  DirectionalLight,
  Mesh,
  CircleGeometry,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  WebGLRenderer,
  sRGBEncoding,
  Quaternion,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  Line,
  RingGeometry,
} from "three";

import { BoxLineGeometry } from "three/addons/geometries/BoxLineGeometry.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let camera, scene, raycaster, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let room, marker, floor, baseReferenceSpace;

let INTERSECTION;
const tempMatrix = new Matrix4();

init();
animate();

function init() {
  scene = new Scene();
  scene.background = new Color(0x505050);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1, 3);

  room = new LineSegments(
    new BoxLineGeometry(6, 6, 6, 10, 10, 10).translate(0, 3, 0),
    new LineBasicMaterial({ color: 0x808080 })
  );
  scene.add(room);

  scene.add(new HemisphereLight(0x606060, 0x404040));

  const light = new DirectionalLight(0xffffff);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  marker = new Mesh(
    new CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x808080 })
  );
  scene.add(marker);

  floor = new Mesh(
    new PlaneGeometry(4.8, 4.8, 2, 2).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.25 })
  );
  scene.add(floor);

  raycaster = new Raycaster();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;

  renderer.xr.addEventListener(
    "sessionstart",
    () => (baseReferenceSpace = renderer.xr.getReferenceSpace())
  );
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  function onSelectStart() {
    this.userData.isSelecting = true;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;

    if (INTERSECTION) {
      const offsetPosition = {
        x: -INTERSECTION.x,
        y: -INTERSECTION.y,
        z: -INTERSECTION.z,
        w: 1,
      };
      const offsetRotation = new Quaternion();
      const transform = new XRRigidTransform(offsetPosition, offsetRotation);
      const teleportSpaceOffset =
        baseReferenceSpace.getOffsetReferenceSpace(transform);

      renderer.xr.setReferenceSpace(teleportSpaceOffset);
    }
  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller1.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller2.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
  scene.add(controller2);

  // The XRControllerModelFactory will automatically fetch controller models
  // that match what the user is holding as closely as possible. The models
  // should be attached to the object returned from getControllerGrip in
  // order to match the orientation of the held device.

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  //

  window.addEventListener("resize", onWindowResize, false);
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
  INTERSECTION = undefined;

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}
