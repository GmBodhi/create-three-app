import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { BoxLineGeometry } from "three/addons/geometries/BoxLineGeometry.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";
import {
  RollerCoasterGeometry,
  RollerCoasterShadowGeometry,
  RollerCoasterLiftersGeometry,
  TreesGeometry,
  SkyGeometry,
} from "three/addons/misc/RollerCoaster.js";
import { HTMLMesh } from "three/addons/interactive/HTMLMesh.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let room;

let count = 0;
const radius = 0.08;
let normal = new Vector3();
const relativeVelocity = new Vector3();

const clock = new Clock();
const funfairs = [];
const train = new Object3D();
const rcdelta = clock.getDelta() * 0.8; // slow down simulation
const PI2 = Math.PI * 2;
let rccamera = null;
let rcscene = null;

const tempMatrix = new Matrix4();
let raycaster = null;

const curve = (function () {
  const vector = new Vector3();
  const vector2 = new Vector3();

  return {
    getPointAt: function (t) {
      t = t * PI2;

      const x = Math.sin(t * 3) * Math.cos(t * 4) * 50;
      const y = Math.sin(t * 10) * 2 + Math.cos(t * 17) * 2 + 5;
      const z = Math.sin(t) * Math.sin(t * 4) * 50;

      return vector.set(x, y, z).multiplyScalar(2);
    },

    getTangentAt: function (t) {
      const delta = 0.0001;
      const t1 = Math.max(0, t - delta);
      const t2 = Math.min(1, t + delta);

      return vector2
        .copy(this.getPointAt(t2))
        .sub(this.getPointAt(t1))
        .normalize();
    },
  };
})();

let horseCamera = null;
let horseScene = null;
let horseMixer = null;
let horseTheta = 0;
let horseMesh = null;
const horseRadius = 600;

let guiScene = null;
let guiCamera = null;
let guiGroup = null;

let rollercoasterLayer = null;
let horseLayer = null;
let guiLayer = null;

const parameters = {
  radius: 0.6,
  tube: 0.2,
  tubularSegments: 150,
  radialSegments: 20,
  p: 2,
  q: 3,
  thickness: 0.5,
};

init();

function getIntersections(controller) {
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  return raycaster.intersectObjects(scene.children, false);
}

function init() {
  scene = new Scene();
  scene.background = new Color(0x505050);

  raycaster = new Raycaster();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1.6, 3);

  room = new LineSegments(
    new BoxLineGeometry(6, 6, 6, 10, 10, 10),
    new LineBasicMaterial({ color: 0x808080 })
  );
  room.geometry.translate(0, 3, 0);
  scene.add(room);

  scene.add(new HemisphereLight(0x606060, 0x404040));

  const light = new DirectionalLight(0xffffff);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new IcosahedronGeometry(radius, 3);

  for (let i = 0; i < 200; i++) {
    const object = new Mesh(
      geometry,
      new MeshLambertMaterial({ color: Math.random() * 0xffffff })
    );

    object.position.x = Math.random() * 4 - 2;
    object.position.y = Math.random() * 4;
    object.position.z = Math.random() * 4 - 2;

    object.userData.velocity = new Vector3();
    object.userData.velocity.x = Math.random() * 0.01 - 0.005;
    object.userData.velocity.y = Math.random() * 0.01 - 0.005;
    object.userData.velocity.z = Math.random() * 0.01 - 0.005;

    room.add(object);
  }

  //

  renderer = new WebGPURenderer({
    antialias: true,
    forceWebGL: true,
    colorBufferType: UnsignedByteType,
    multiview: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  function onSqueezeStart() {
    this.userData.isSelecting = true;
  }

  function onSqueezeEnd() {
    this.userData.isSelecting = false;
  }

  function onSelectStart(event) {
    const controller = event.target;

    const intersections = getIntersections(controller);
    let hadSelection = false;

    for (let x = 0; x < intersections.length; x++) {
      if (intersections[x].object == horseLayer) {
        horseLayer.visible = false;
        hadSelection = true;
      }

      if (intersections[x].object == rollercoasterLayer) {
        controller.attach(rollercoasterLayer);
        hadSelection = true;
      }

      if (intersections[x].object == guiLayer) {
        const uv = intersections[x].uv;
        guiGroup.children[0].dispatchEvent({
          type: "mousedown",
          data: { x: uv.x, y: 1 - uv.y },
          target: guiGroup,
        });
        hadSelection = true;
      }
    }

    this.userData.isSelecting = hadSelection === false;
  }

  function onSelectEnd() {
    horseLayer.visible = true;
    scene.attach(rollercoasterLayer);
    guiGroup.children[0].dispatchEvent({
      type: "mouseup",
      data: { x: 0, y: 0 },
      target: guiGroup,
    });
    this.userData.isSelecting = false;
  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("squeezestart", onSqueezeStart);
  controller1.addEventListener("squeezeend", onSqueezeEnd);
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
  controller2.addEventListener("squeezestart", onSqueezeStart);
  controller2.addEventListener("squeezeend", onSqueezeEnd);
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

  window.addEventListener("resize", onWindowResize);

  // set up rollercoaster
  rollercoasterLayer = renderer.xr.createCylinderLayer(
    1,
    Math.PI / 2,
    2,
    new Vector3(0, 1.5, -0.5),
    new Quaternion(),
    1500,
    1000,
    renderRollercoaster
  );
  scene.add(rollercoasterLayer);

  rcscene = new Scene();
  rcscene.background = new Color(0xf0f0ff);

  const rclight = new HemisphereLight(0xfff0f0, 0x606066);
  rclight.position.set(1, 1, 1);
  rcscene.add(rclight);

  rcscene.add(train);

  rccamera = new PerspectiveCamera(50, 1, 0.1, 500);
  train.add(rccamera);

  // environment

  let rcgeometry = new PlaneGeometry(500, 500, 15, 15);
  rcgeometry.rotateX(-Math.PI / 2);

  const positions = rcgeometry.attributes.position.array;
  const vertex = new Vector3();

  for (let i = 0; i < positions.length; i += 3) {
    vertex.fromArray(positions, i);

    vertex.x += Math.random() * 10 - 5;
    vertex.z += Math.random() * 10 - 5;

    const distance = vertex.distanceTo(scene.position) / 5 - 25;
    vertex.y = Math.random() * Math.max(0, distance);

    vertex.toArray(positions, i);
  }

  rcgeometry.computeVertexNormals();

  let rcmaterial = new MeshLambertMaterial({
    color: 0x407000,
  });

  let rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcscene.add(rcmesh);

  rcgeometry = new TreesGeometry(rcmesh);
  rcmaterial = new MeshBasicMaterial({
    side: DoubleSide,
    vertexColors: true,
  });
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcscene.add(rcmesh);

  rcgeometry = new SkyGeometry();
  rcmaterial = new MeshBasicMaterial({ color: 0xffffff });
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcscene.add(rcmesh);

  //

  rcgeometry = new RollerCoasterGeometry(curve, 1500);
  rcmaterial = new MeshPhongMaterial({
    vertexColors: true,
  });
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcscene.add(rcmesh);

  rcgeometry = new RollerCoasterLiftersGeometry(curve, 100);
  rcmaterial = new MeshPhongMaterial();
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcmesh.position.y = 0.1;
  rcscene.add(rcmesh);

  rcgeometry = new RollerCoasterShadowGeometry(curve, 500);
  rcmaterial = new MeshBasicMaterial({
    color: 0x305000,
    depthWrite: false,
    transparent: true,
  });
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcmesh.position.y = 0.1;
  rcscene.add(rcmesh);

  //

  rcgeometry = new CylinderGeometry(10, 10, 5, 15);
  rcmaterial = new MeshLambertMaterial({
    color: 0xff8080,
  });
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcmesh.position.set(-80, 10, -70);
  rcmesh.rotation.x = Math.PI / 2;
  rcscene.add(rcmesh);

  funfairs.push(rcmesh);

  rcgeometry = new CylinderGeometry(5, 6, 4, 10);
  rcmaterial = new MeshLambertMaterial({
    color: 0x8080ff,
  });
  rcmesh = new Mesh(rcgeometry, rcmaterial);
  rcmesh.position.set(50, 2, 30);
  rcscene.add(rcmesh);

  funfairs.push(rcmesh);

  // set up horse animation
  horseLayer = renderer.xr.createQuadLayer(
    1,
    1,
    new Vector3(-1.5, 1.5, -1.5),
    new Quaternion(),
    800,
    800,
    renderQuad
  );
  scene.add(horseLayer);

  horseLayer.geometry = new CircleGeometry(0.5, 64);

  horseCamera = new PerspectiveCamera(50, 1, 1, 10000);
  horseCamera.position.y = 300;

  horseScene = new Scene();
  horseScene.background = new Color(0xf0f0f0);

  //

  const light1 = new DirectionalLight(0xefefff, 1.5);
  light1.position.set(1, 1, 1).normalize();
  horseScene.add(light1);

  const light2 = new DirectionalLight(0xffefef, 1.5);
  light2.position.set(-1, -1, -1).normalize();
  horseScene.add(light2);

  const loader = new GLTFLoader();
  loader.load("models/gltf/Horse.glb", function (gltf) {
    horseMesh = gltf.scene.children[0];
    horseMesh.scale.set(1.5, 1.5, 1.5);
    horseScene.add(horseMesh);

    horseMixer = new AnimationMixer(horseMesh);

    horseMixer.clipAction(gltf.animations[0]).setDuration(1).play();
  });

  function onChange() {}

  function onThicknessChange() {}

  // set up ui
  guiScene = new Scene();
  guiScene.background = new Color(0x0);

  guiCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  guiScene.add(guiCamera);

  const gui = new GUI({ width: 300 });
  gui.add(parameters, "radius", 0.0, 1.0).onChange(onChange);
  gui.add(parameters, "tube", 0.0, 1.0).onChange(onChange);
  gui.add(parameters, "tubularSegments", 10, 150, 1).onChange(onChange);
  gui.add(parameters, "radialSegments", 2, 20, 1).onChange(onChange);
  gui.add(parameters, "p", 1, 10, 1).onChange(onChange);
  gui.add(parameters, "q", 0, 10, 1).onChange(onChange);
  gui.add(parameters, "thickness", 0, 1).onChange(onThicknessChange);
  gui.domElement.style.visibility = "hidden";

  guiGroup = new InteractiveGroup();
  guiScene.add(guiGroup);

  const mesh = new HTMLMesh(gui.domElement);
  guiGroup.add(mesh);

  const bbox = new Box3().setFromObject(guiScene);

  guiLayer = renderer.xr.createQuadLayer(
    1.2,
    0.8,
    new Vector3(1.5, 1.5, -1.5),
    new Quaternion(),
    1280,
    800,
    renderGui
  );
  scene.add(guiLayer);

  guiCamera.left = bbox.min.x;
  guiCamera.right = bbox.max.x;
  guiCamera.top = bbox.max.y;
  guiCamera.bottom = bbox.min.y;
  guiCamera.updateProjectionMatrix();
}

function renderGui() {
  renderer.render(guiScene, guiCamera);
}

function renderQuad() {
  horseTheta += 0.1;

  horseCamera.position.x =
    horseRadius * Math.sin(MathUtils.degToRad(horseTheta));
  horseCamera.position.z =
    horseRadius * Math.cos(MathUtils.degToRad(horseTheta));

  horseCamera.lookAt(0, 150, 0);

  if (horseMixer) {
    const time = Date.now();

    horseMixer.update((time - prevTime) * 0.001);

    prevTime = time;
  }

  renderer.render(horseScene, horseCamera);
}

const rcposition = new Vector3();
const tangent = new Vector3();

const lookAt = new Vector3();

let rcvelocity = 0;
let progress = 0;

let prevTime = performance.now();

function renderRollercoaster() {
  const time = performance.now();
  for (let i = 0; i < funfairs.length; i++) {
    funfairs[i].rotation.y = time * 0.0004;
  }

  //

  progress += rcvelocity;
  progress = progress % 1;

  rcposition.copy(curve.getPointAt(progress));
  rcposition.y += 0.3;

  train.position.copy(rcposition);

  tangent.copy(curve.getTangentAt(progress));

  rcvelocity -= tangent.y * 0.0000001 * rcdelta;
  rcvelocity = Math.max(0.00004, Math.min(0.0002, rcvelocity));

  train.lookAt(lookAt.copy(rcposition).sub(tangent));

  //

  renderer.render(rcscene, rccamera);
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

function handleController(controller) {
  if (controller.userData.isSelecting) {
    const object = room.children[count++];

    object.position.copy(controller.position);
    object.userData.velocity.x = (Math.random() - 0.5) * 3;
    object.userData.velocity.y = (Math.random() - 0.5) * 3;
    object.userData.velocity.z = Math.random() - 9;
    object.userData.velocity.applyQuaternion(controller.quaternion);

    if (count === room.children.length) count = 0;
  }

  const intersections = getIntersections(controller);
  for (let x = 0; x < intersections.length; x++) {
    if (intersections[x].object == guiLayer) {
      const uv = intersections[x].uv;
      guiGroup.children[0].dispatchEvent({
        type: "mousemove",
        data: { x: uv.x, y: 1 - uv.y },
        target: guiGroup,
      });
    }
  }
}

//

function render() {
  renderer.xr.renderLayers();

  handleController(controller1);
  handleController(controller2);

  // rotate horse
  horseLayer.rotation.y -= 0.02;

  //
  const delta = clock.getDelta() * 0.8;

  const range = 3 - radius;

  for (let i = 0; i < room.children.length; i++) {
    const object = room.children[i];

    object.position.x += object.userData.velocity.x * delta;
    object.position.y += object.userData.velocity.y * delta;
    object.position.z += object.userData.velocity.z * delta;

    // keep objects inside room

    if (object.position.x < -range || object.position.x > range) {
      object.position.x = MathUtils.clamp(object.position.x, -range, range);
      object.userData.velocity.x = -object.userData.velocity.x;
    }

    if (object.position.y < radius || object.position.y > 6) {
      object.position.y = Math.max(object.position.y, radius);

      object.userData.velocity.x *= 0.98;
      object.userData.velocity.y = -object.userData.velocity.y * 0.8;
      object.userData.velocity.z *= 0.98;
    }

    if (object.position.z < -range || object.position.z > range) {
      object.position.z = MathUtils.clamp(object.position.z, -range, range);
      object.userData.velocity.z = -object.userData.velocity.z;
    }

    for (let j = i + 1; j < room.children.length; j++) {
      const object2 = room.children[j];

      normal.copy(object.position).sub(object2.position);

      const distance = normal.length();

      if (distance < 2 * radius) {
        normal.multiplyScalar(0.5 * distance - radius);

        object.position.sub(normal);
        object2.position.add(normal);

        normal.normalize();

        relativeVelocity
          .copy(object.userData.velocity)
          .sub(object2.userData.velocity);

        normal = normal.multiplyScalar(relativeVelocity.dot(normal));

        object.userData.velocity.sub(normal);
        object2.userData.velocity.add(normal);
      }
    }

    object.userData.velocity.y -= 9.8 * delta;
  }

  renderer.render(scene, camera);
}
