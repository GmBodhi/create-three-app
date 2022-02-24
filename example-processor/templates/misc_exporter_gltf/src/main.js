import "./style.css"; // For webpack support

import {
  DataTexture,
  RGBAFormat,
  LinearFilter,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  AxesHelper,
  TextureLoader,
  RepeatWrapping,
  MeshBasicMaterial,
  Mesh,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
  TorusKnotGeometry,
  DoubleSide,
  BoxGeometry,
  Group,
  Line,
  BufferGeometry,
  BufferAttribute,
  LineBasicMaterial,
  LineLoop,
  Points,
  PointsMaterial,
  OrthographicCamera,
  MeshLambertMaterial,
  CircleGeometry,
  RingGeometry,
  Vector2,
  LatheGeometry,
  WebGLRenderer,
} from "three";

import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

function exportGLTF(input) {
  const gltfExporter = new GLTFExporter();

  const options = {
    trs: params.trs,
    onlyVisible: params.onlyVisible,
    truncateDrawRange: params.truncateDrawRange,
    binary: params.binary,
    maxTextureSize: params.maxTextureSize,
  };
  gltfExporter.parse(
    input,
    function (result) {
      if (result instanceof ArrayBuffer) {
        saveArrayBuffer(result, "scene.glb");
      } else {
        const output = JSON.stringify(result, null, 2);
        console.log(output);
        saveString(output, "scene.gltf");
      }
    },
    function (error) {
      console.log("An error happened during parsing", error);
    },
    options
  );
}

const link = document.createElement("a");
link.style.display = "none";
document.body.appendChild(link); // Firefox workaround, see #6594

function save(blob, filename) {
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  // URL.revokeObjectURL( url ); breaks Firefox...
}

function saveString(text, filename) {
  save(new Blob([text], { type: "text/plain" }), filename);
}

function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: "application/octet-stream" }), filename);
}

let container;

let camera, object, object2, material, geometry, scene1, scene2, renderer;
let gridHelper, sphere, waltHead;

const params = {
  trs: false,
  onlyVisible: true,
  truncateDrawRange: true,
  binary: false,
  maxTextureSize: 4096,
  exportScene1: exportScene1,
  exportScenes: exportScenes,
  exportSphere: exportSphere,
  exportHead: exportHead,
  exportObjects: exportObjects,
  exportSceneObject: exportSceneObject,
};

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  // Make linear gradient texture

  const data = new Uint8ClampedArray(100 * 100 * 4);

  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const stride = 4 * (100 * y + x);

      data[stride] = Math.round((255 * y) / 99);
      data[stride + 1] = Math.round(255 - (255 * y) / 99);
      data[stride + 2] = 0;
      data[stride + 3] = 255;
    }
  }

  const gradientTexture = new DataTexture(data, 100, 100, RGBAFormat);
  gradientTexture.minFilter = LinearFilter;
  gradientTexture.magFilter = LinearFilter;
  gradientTexture.needsUpdate = true;

  scene1 = new Scene();
  scene1.name = "Scene1";

  // ---------------------------------------------------------------------
  // Perspective Camera
  // ---------------------------------------------------------------------
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(600, 400, 0);

  camera.name = "PerspectiveCamera";
  scene1.add(camera);

  // ---------------------------------------------------------------------
  // Ambient light
  // ---------------------------------------------------------------------
  const ambientLight = new AmbientLight(0xffffff, 0.2);
  ambientLight.name = "AmbientLight";
  scene1.add(ambientLight);

  // ---------------------------------------------------------------------
  // DirectLight
  // ---------------------------------------------------------------------
  const dirLight = new DirectionalLight(0xffffff, 1);
  dirLight.target.position.set(0, 0, -1);
  dirLight.add(dirLight.target);
  dirLight.lookAt(-1, -1, 0);
  dirLight.name = "DirectionalLight";
  scene1.add(dirLight);

  // ---------------------------------------------------------------------
  // Grid
  // ---------------------------------------------------------------------
  gridHelper = new GridHelper(2000, 20, 0x888888, 0x444444);
  gridHelper.position.y = -50;
  gridHelper.name = "Grid";
  scene1.add(gridHelper);

  // ---------------------------------------------------------------------
  // Axes
  // ---------------------------------------------------------------------
  const axes = new AxesHelper(500);
  axes.name = "AxesHelper";
  scene1.add(axes);

  // ---------------------------------------------------------------------
  // Simple geometry with basic material
  // ---------------------------------------------------------------------
  // Icosahedron
  const mapGrid = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  mapGrid.wrapS = mapGrid.wrapT = RepeatWrapping;
  material = new MeshBasicMaterial({
    color: 0xffffff,
    map: mapGrid,
  });

  object = new Mesh(new IcosahedronGeometry(75, 0), material);
  object.position.set(-200, 0, 200);
  object.name = "Icosahedron";
  scene1.add(object);

  // Octahedron
  material = new MeshBasicMaterial({
    color: 0x0000ff,
    wireframe: true,
  });
  object = new Mesh(new OctahedronGeometry(75, 1), material);
  object.position.set(0, 0, 200);
  object.name = "Octahedron";
  scene1.add(object);

  // Tetrahedron
  material = new MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
  });

  object = new Mesh(new TetrahedronGeometry(75, 0), material);
  object.position.set(200, 0, 200);
  object.name = "Tetrahedron";
  scene1.add(object);

  // ---------------------------------------------------------------------
  // Buffered geometry primitives
  // ---------------------------------------------------------------------
  // Sphere
  material = new MeshStandardMaterial({
    color: 0xffff00,
    metalness: 0.5,
    roughness: 1.0,
    flatShading: true,
  });
  material.map = gradientTexture;
  sphere = new Mesh(new SphereGeometry(70, 10, 10), material);
  sphere.position.set(0, 0, 0);
  sphere.name = "Sphere";
  scene1.add(sphere);

  // Cylinder
  material = new MeshStandardMaterial({
    color: 0xff00ff,
    flatShading: true,
  });
  object = new Mesh(new CylinderGeometry(10, 80, 100), material);
  object.position.set(200, 0, 0);
  object.name = "Cylinder";
  scene1.add(object);

  // TorusKnot
  material = new MeshStandardMaterial({
    color: 0xff0000,
    roughness: 1,
  });
  object = new Mesh(new TorusKnotGeometry(50, 15, 40, 10), material);
  object.position.set(-200, 0, 0);
  object.name = "Cylinder";
  scene1.add(object);

  // ---------------------------------------------------------------------
  // Hierarchy
  // ---------------------------------------------------------------------
  const mapWood = new TextureLoader().load("textures/hardwood2_diffuse.jpg");
  material = new MeshStandardMaterial({ map: mapWood, side: DoubleSide });

  object = new Mesh(new BoxGeometry(40, 100, 100), material);
  object.position.set(-200, 0, 400);
  object.name = "Cube";
  scene1.add(object);

  object2 = new Mesh(new BoxGeometry(40, 40, 40, 2, 2, 2), material);
  object2.position.set(0, 0, 50);
  object2.rotation.set(0, 45, 0);
  object2.name = "SubCube";
  object.add(object2);

  // ---------------------------------------------------------------------
  // Groups
  // ---------------------------------------------------------------------
  const group1 = new Group();
  group1.name = "Group";
  scene1.add(group1);

  const group2 = new Group();
  group2.name = "subGroup";
  group2.position.set(0, 50, 0);
  group1.add(group2);

  object2 = new Mesh(new BoxGeometry(30, 30, 30), material);
  object2.name = "Cube in group";
  object2.position.set(0, 0, 400);
  group2.add(object2);

  // ---------------------------------------------------------------------
  // Line Strip
  // ---------------------------------------------------------------------
  geometry = new BufferGeometry();
  let numPoints = 100;
  let positions = new Float32Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    positions[i * 3] = i;
    positions[i * 3 + 1] = Math.sin(i / 2) * 20;
    positions[i * 3 + 2] = 0;
  }

  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  object = new Line(geometry, new LineBasicMaterial({ color: 0xffff00 }));
  object.position.set(-50, 0, -200);
  scene1.add(object);

  // ---------------------------------------------------------------------
  // Line Loop
  // ---------------------------------------------------------------------
  geometry = new BufferGeometry();
  numPoints = 5;
  const radius = 70;
  positions = new Float32Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    const s = (i * Math.PI * 2) / numPoints;
    positions[i * 3] = radius * Math.sin(s);
    positions[i * 3 + 1] = radius * Math.cos(s);
    positions[i * 3 + 2] = 0;
  }

  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  object = new LineLoop(geometry, new LineBasicMaterial({ color: 0xffff00 }));
  object.position.set(0, 0, -200);

  scene1.add(object);

  // ---------------------------------------------------------------------
  // Buffer geometry truncated (DrawRange)
  // ---------------------------------------------------------------------
  geometry = new BufferGeometry();
  const numElements = 6;
  const outOfRange = 3;

  positions = new Float32Array((numElements + outOfRange) * 3);
  const colors = new Float32Array((numElements + outOfRange) * 3);

  positions.set([0, 0, 0, 0, 80, 0, 80, 0, 0, 80, 0, 0, 0, 80, 0, 80, 80, 0]);

  colors.set([1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1]);

  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setDrawRange(0, numElements);

  object = new Mesh(
    geometry,
    new MeshBasicMaterial({ side: DoubleSide, vertexColors: true })
  );
  object.name = "Custom buffered truncated";
  object.position.set(140, -40, -200);

  scene1.add(object);

  // ---------------------------------------------------------------------
  // Points
  // ---------------------------------------------------------------------
  numPoints = 100;
  const pointsArray = new Float32Array(numPoints * 3);
  for (let i = 0; i < numPoints; i++) {
    pointsArray[3 * i] = -50 + Math.random() * 100;
    pointsArray[3 * i + 1] = Math.random() * 100;
    pointsArray[3 * i + 2] = -50 + Math.random() * 100;
  }

  const pointsGeo = new BufferGeometry();
  pointsGeo.setAttribute("position", new BufferAttribute(pointsArray, 3));

  const pointsMaterial = new PointsMaterial({ color: 0xffff00, size: 5 });
  const pointCloud = new Points(pointsGeo, pointsMaterial);
  pointCloud.name = "Points";
  pointCloud.position.set(-200, 0, -200);
  scene1.add(pointCloud);

  // ---------------------------------------------------------------------
  // Ortho camera
  // ---------------------------------------------------------------------
  const cameraOrtho = new OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    0.1,
    10
  );
  scene1.add(cameraOrtho);
  cameraOrtho.name = "OrthographicCamera";

  material = new MeshLambertMaterial({
    color: 0xffff00,
    side: DoubleSide,
  });

  object = new Mesh(new CircleGeometry(50, 20, 0, Math.PI * 2), material);
  object.position.set(200, 0, -400);
  scene1.add(object);

  object = new Mesh(new RingGeometry(10, 50, 20, 5, 0, Math.PI * 2), material);
  object.position.set(0, 0, -400);
  scene1.add(object);

  object = new Mesh(new CylinderGeometry(25, 75, 100, 40, 5), material);
  object.position.set(-200, 0, -400);
  scene1.add(object);

  //
  const points = [];

  for (let i = 0; i < 50; i++) {
    points.push(
      new Vector2(Math.sin(i * 0.2) * Math.sin(i * 0.1) * 15 + 50, (i - 5) * 2)
    );
  }

  object = new Mesh(new LatheGeometry(points, 20), material);
  object.position.set(200, 0, 400);
  scene1.add(object);

  // ---------------------------------------------------------------------
  // Big red box hidden just for testing `onlyVisible` option
  // ---------------------------------------------------------------------
  material = new MeshBasicMaterial({
    color: 0xff0000,
  });
  object = new Mesh(new BoxGeometry(200, 200, 200), material);
  object.position.set(0, 0, 0);
  object.name = "CubeHidden";
  object.visible = false;
  scene1.add(object);

  // ---------------------------------------------------------------------
  //
  //
  const loader = new OBJLoader();
  loader.load("models/obj/walt/WaltHead.obj", function (obj) {
    waltHead = obj;
    waltHead.scale.multiplyScalar(1.5);
    waltHead.position.set(400, 0, 0);
    scene1.add(waltHead);
  });

  // ---------------------------------------------------------------------
  // 2nd Scene
  // ---------------------------------------------------------------------
  scene2 = new Scene();
  object = new Mesh(new BoxGeometry(100, 100, 100), material);
  object.position.set(0, 0, 0);
  object.name = "Cube2ndScene";
  scene2.name = "Scene2";
  scene2.add(object);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  let h = gui.addFolder("Settings");
  h.add(params, "trs").name("Use TRS");
  h.add(params, "onlyVisible").name("Only Visible Objects");
  h.add(params, "truncateDrawRange").name("Truncate Draw Range");
  h.add(params, "binary").name("Binary (GLB)");
  h.add(params, "maxTextureSize", 2, 8192).name("Max Texture Size").step(1);

  h = gui.addFolder("Export");
  h.add(params, "exportScene1").name("Export Scene 1");
  h.add(params, "exportScenes").name("Export Scene 1 and 2");
  h.add(params, "exportSphere").name("Export Sphere");
  h.add(params, "exportHead").name("Export Head");
  h.add(params, "exportObjects").name("Export Sphere With Grid");
  h.add(params, "exportSceneObject").name("Export Scene 1 and Object");

  gui.open();
}

function exportScene1() {
  exportGLTF(scene1);
}

function exportScenes() {
  exportGLTF([scene1, scene2]);
}

function exportSphere() {
  exportGLTF(sphere);
}

function exportHead() {
  exportGLTF(waltHead);
}

function exportObjects() {
  exportGLTF([sphere, gridHelper]);
}

function exportSceneObject() {
  exportGLTF([scene1, gridHelper]);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  const timer = Date.now() * 0.0001;

  camera.position.x = Math.cos(timer) * 800;
  camera.position.z = Math.sin(timer) * 800;

  camera.lookAt(scene1.position);
  renderer.render(scene1, camera);
}
