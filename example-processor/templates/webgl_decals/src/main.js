import "./style.css"; // For webpack support

import {
  Vector3,
  Vector2,
  TextureLoader,
  SRGBColorSpace,
  MeshPhongMaterial,
  Euler,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Raycaster,
  Mesh,
  BoxGeometry,
  MeshNormalMaterial,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";

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
decalDiffuse.colorSpace = SRGBColorSpace;
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

init();
animate();

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

  scene.add(new AmbientLight(0x666666));

  const dirLight1 = new DirectionalLight(0xffddcc, 3);
  dirLight1.position.set(1, 0.75, 0.5);
  scene.add(dirLight1);

  const dirLight2 = new DirectionalLight(0xccccff, 3);
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
}

function loadLeePerrySmith() {
  const map = textureLoader.load("models/gltf/LeePerrySmith/Map-COL.jpg");
  map.colorSpace = SRGBColorSpace;
  const specularMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Map-SPEC.jpg"
  );
  const normalMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
  );

  const loader = new GLTFLoader();

  loader.load("models/gltf/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    mesh = gltf.scene.children[0];
    mesh.material = new MeshPhongMaterial({
      specular: 0x111111,
      map: map,
      specularMap: specularMap,
      normalMap: normalMap,
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
  m.renderOrder = decals.length; // give decals a fixed render order

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
