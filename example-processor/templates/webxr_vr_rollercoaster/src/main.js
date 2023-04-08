import "./style.css"; // For webpack support

import {
  ColorManagement,
  WebGLRenderer,
  Scene,
  Color,
  HemisphereLight,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Vector3,
  MeshLambertMaterial,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  MeshPhongMaterial,
  CylinderGeometry,
} from "three";

import {
  RollerCoasterGeometry,
  RollerCoasterShadowGeometry,
  RollerCoasterLiftersGeometry,
  TreesGeometry,
  SkyGeometry,
} from "three/addons/misc/RollerCoaster.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

ColorManagement.enabled = true;

let mesh, material, geometry;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local");
document.body.appendChild(renderer.domElement);

document.body.appendChild(VRButton.createButton(renderer));

//

const scene = new Scene();
scene.background = new Color(0xf0f0ff);

const light = new HemisphereLight(0xfff0f0, 0x606066);
light.position.set(1, 1, 1);
scene.add(light);

const train = new Object3D();
scene.add(train);

const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
train.add(camera);

// environment

geometry = new PlaneGeometry(500, 500, 15, 15);
geometry.rotateX(-Math.PI / 2);

const positions = geometry.attributes.position.array;
const vertex = new Vector3();

for (let i = 0; i < positions.length; i += 3) {
  vertex.fromArray(positions, i);

  vertex.x += Math.random() * 10 - 5;
  vertex.z += Math.random() * 10 - 5;

  const distance = vertex.distanceTo(scene.position) / 5 - 25;
  vertex.y = Math.random() * Math.max(0, distance);

  vertex.toArray(positions, i);
}

geometry.computeVertexNormals();

material = new MeshLambertMaterial({
  color: 0x407000,
});

mesh = new Mesh(geometry, material);
scene.add(mesh);

geometry = new TreesGeometry(mesh);
material = new MeshBasicMaterial({
  side: DoubleSide,
  vertexColors: true,
});
mesh = new Mesh(geometry, material);
scene.add(mesh);

geometry = new SkyGeometry();
material = new MeshBasicMaterial({ color: 0xffffff });
mesh = new Mesh(geometry, material);
scene.add(mesh);

//

const PI2 = Math.PI * 2;

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

geometry = new RollerCoasterGeometry(curve, 1500);
material = new MeshPhongMaterial({
  vertexColors: true,
});
mesh = new Mesh(geometry, material);
scene.add(mesh);

geometry = new RollerCoasterLiftersGeometry(curve, 100);
material = new MeshPhongMaterial();
mesh = new Mesh(geometry, material);
mesh.position.y = 0.1;
scene.add(mesh);

geometry = new RollerCoasterShadowGeometry(curve, 500);
material = new MeshBasicMaterial({
  color: 0x305000,
  depthWrite: false,
  transparent: true,
});
mesh = new Mesh(geometry, material);
mesh.position.y = 0.1;
scene.add(mesh);

const funfairs = [];

//

geometry = new CylinderGeometry(10, 10, 5, 15);
material = new MeshLambertMaterial({
  color: 0xff8080,
});
mesh = new Mesh(geometry, material);
mesh.position.set(-80, 10, -70);
mesh.rotation.x = Math.PI / 2;
scene.add(mesh);

funfairs.push(mesh);

geometry = new CylinderGeometry(5, 6, 4, 10);
material = new MeshLambertMaterial({
  color: 0x8080ff,
});
mesh = new Mesh(geometry, material);
mesh.position.set(50, 2, 30);
scene.add(mesh);

funfairs.push(mesh);

//

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

const position = new Vector3();
const tangent = new Vector3();

const lookAt = new Vector3();

let velocity = 0;
let progress = 0;

let prevTime = performance.now();

function render() {
  const time = performance.now();
  const delta = time - prevTime;

  for (let i = 0; i < funfairs.length; i++) {
    funfairs[i].rotation.y = time * 0.0004;
  }

  //

  progress += velocity;
  progress = progress % 1;

  position.copy(curve.getPointAt(progress));
  position.y += 0.3;

  train.position.copy(position);

  tangent.copy(curve.getTangentAt(progress));

  velocity -= tangent.y * 0.0000001 * delta;
  velocity = Math.max(0.00004, Math.min(0.0002, velocity));

  train.lookAt(lookAt.copy(position).sub(tangent));

  //

  renderer.render(scene, camera);

  prevTime = time;
}

renderer.setAnimationLoop(render);
