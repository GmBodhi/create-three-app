import "./style.css"; // For webpack support

import {
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Scene,
  Color,
  Fog,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  TextureLoader,
  MeshLambertMaterial,
  DoubleSide,
  ParametricBufferGeometry,
  Mesh,
  SphereGeometry,
  MeshLambertMaterial,
  Mesh,
  RepeatWrapping,
  sRGBEncoding,
  MeshLambertMaterial,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshLambertMaterial,
  Mesh,
  Mesh,
  Mesh,
  BoxGeometry,
  BoxGeometry,
  Mesh,
  Mesh,
  WebGLRenderer,
  sRGBEncoding,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  MeshPhongMaterial,
  DoubleSide,
  TorusKnotGeometry,
  Mesh,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  WebGLRenderer,
  Plane,
  Plane,
  Vector3,
  Vector3,
  Vector3,
  Matrix4,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  MeshPhongMaterial,
  DoubleSide,
  Group,
  BoxGeometry,
  Mesh,
  PlaneGeometry,
  Color,
  Group,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  MeshPhongMaterial,
  WebGLRenderer,
  Matrix4,
  Matrix4,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  CameraHelper,
  Group,
  SphereGeometry,
  MeshLambertMaterial,
  Color,
  DoubleSide,
  Mesh,
  Group,
  PlaneHelper,
  PlaneHelper,
  PlaneHelper,
  Group,
  MeshBasicMaterial,
  AlwaysStencilFunc,
  BackSide,
  IncrementWrapStencilOp,
  IncrementWrapStencilOp,
  IncrementWrapStencilOp,
  Mesh,
  FrontSide,
  DecrementWrapStencilOp,
  DecrementWrapStencilOp,
  DecrementWrapStencilOp,
  Mesh,
  Clock,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  PlaneHelper,
  TorusKnotGeometry,
  Group,
  PlaneGeometry,
  Group,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ReplaceStencilOp,
  ReplaceStencilOp,
  Mesh,
  MeshStandardMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  DoubleSide,
  WebGLRenderer,
  Vector3,
  Vector3,
  Vector2,
  TextureLoader,
  MeshPhongMaterial,
  Vector2,
  Vector3,
  Euler,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  DirectionalLight,
  BufferGeometry,
  Vector3,
  Vector3,
  Line,
  LineBasicMaterial,
  Raycaster,
  Mesh,
  BoxGeometry,
  MeshNormalMaterial,
  MeshPhongMaterial,
  Mesh,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

const container = document.getElementById("container");

let renderer, scene, camera, stats;
let mesh;
let raycaster;
let line;

const intersection = {
  intersects: false,
  point: new Vector3(),
  normal: new Vector3(),
};
const mouse = new Vector2();
const intersects = [];

const textureLoader = new TextureLoader();
const decalDiffuse = textureLoader.load("textures/decal/decal-diffuse.png");
const decalNormal = textureLoader.load("textures/decal/decal-normal.jpg");

const decalMaterial = new MeshPhongMaterial({
  specular: 0x444444,
  map: decalDiffuse,
  normalMap: decalNormal,
  normalScale: new Vector2(1, 1),
  shininess: 30,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  wireframe: false,
});

const decals = [];
let mouseHelper;
const position = new Vector3();
const orientation = new Euler();
const size = new Vector3(10, 10, 10);

const params = {
  minScale: 10,
  maxScale: 20,
  rotate: true,
  clear: function () {
    removeDecals();
  },
};

window.addEventListener("load", init);

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  scene = new Scene();

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 120;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 50;
  controls.maxDistance = 200;

  scene.add(new AmbientLight(0x443333));

  const dirLight1 = new DirectionalLight(0xffddcc, 1);
  dirLight1.position.set(1, 0.75, 0.5);
  scene.add(dirLight1);

  const dirLight2 = new DirectionalLight(0xccccff, 1);
  dirLight2.position.set(-1, 0.75, -0.5);
  scene.add(dirLight2);

  const geometry = new BufferGeometry();
  geometry.setFromPoints([new Vector3(), new Vector3()]);

  line = new Line(geometry, new LineBasicMaterial());
  scene.add(line);

  loadLeePerrySmith();

  raycaster = new Raycaster();

  mouseHelper = new Mesh(new BoxGeometry(1, 1, 10), new MeshNormalMaterial());
  mouseHelper.visible = false;
  scene.add(mouseHelper);

  window.addEventListener("resize", onWindowResize);

  let moved = false;

  controls.addEventListener("change", function () {
    moved = true;
  });

  window.addEventListener("pointerdown", function () {
    moved = false;
  });

  window.addEventListener("pointerup", function (event) {
    if (moved === false) {
      checkIntersection(event.clientX, event.clientY);

      if (intersection.intersects) shoot();
    }
  });

  window.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    if (event.isPrimary) {
      checkIntersection(event.clientX, event.clientY);
    }
  }

  function checkIntersection(x, y) {
    if (mesh === undefined) return;

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.intersectObject(mesh, false, intersects);

    if (intersects.length > 0) {
      const p = intersects[0].point;
      mouseHelper.position.copy(p);
      intersection.point.copy(p);

      const n = intersects[0].face.normal.clone();
      n.transformDirection(mesh.matrixWorld);
      n.multiplyScalar(10);
      n.add(intersects[0].point);

      intersection.normal.copy(intersects[0].face.normal);
      mouseHelper.lookAt(n);

      const positions = line.geometry.attributes.position;
      positions.setXYZ(0, p.x, p.y, p.z);
      positions.setXYZ(1, n.x, n.y, n.z);
      positions.needsUpdate = true;

      intersection.intersects = true;

      intersects.length = 0;
    } else {
      intersection.intersects = false;
    }
  }

  const gui = new GUI();

  gui.add(params, "minScale", 1, 30);
  gui.add(params, "maxScale", 1, 30);
  gui.add(params, "rotate");
  gui.add(params, "clear");
  gui.open();

  onWindowResize();
  animate();
}

function loadLeePerrySmith() {
  const loader = new GLTFLoader();

  loader.load("models/gltf/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    mesh = gltf.scene.children[0];
    mesh.material = new MeshPhongMaterial({
      specular: 0x111111,
      map: textureLoader.load("models/gltf/LeePerrySmith/Map-COL.jpg"),
      specularMap: textureLoader.load("models/gltf/LeePerrySmith/Map-SPEC.jpg"),
      normalMap: textureLoader.load(
        "models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
      ),
      shininess: 25,
    });

    scene.add(mesh);
    mesh.scale.set(10, 10, 10);
  });
}

function shoot() {
  position.copy(intersection.point);
  orientation.copy(mouseHelper.rotation);

  if (params.rotate) orientation.z = Math.random() * 2 * Math.PI;

  const scale =
    params.minScale + Math.random() * (params.maxScale - params.minScale);
  size.set(scale, scale, scale);

  const material = decalMaterial.clone();
  material.color.setHex(Math.random() * 0xffffff);

  const m = new Mesh(
    new DecalGeometry(mesh, position, orientation, size),
    material
  );

  decals.push(m);
  scene.add(m);
}

function removeDecals() {
  decals.forEach(function (d) {
    scene.remove(d);
  });

  decals.length = 0;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);

  stats.update();
}
