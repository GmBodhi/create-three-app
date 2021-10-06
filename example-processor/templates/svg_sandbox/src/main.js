import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  BufferGeometryLoader,
  Mesh,
  MeshLambertMaterial,
  BoxGeometry,
  MeshBasicMaterial,
  PlaneGeometry,
  DoubleSide,
  CylinderGeometry,
  BufferGeometry,
  Vector3,
  Float32BufferAttribute,
  SpriteMaterial,
  Sprite,
  FileLoader,
  AmbientLight,
  DirectionalLight,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import {
  SVGRenderer,
  SVGObject,
} from "three/examples/jsm/renderers/SVGRenderer.js";

let camera, scene, renderer, stats;

let group;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 500;

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  // QRCODE

  const loader = new BufferGeometryLoader();
  loader.load("models/json/QRCode_buffergeometry.json", function (geometry) {
    mesh = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 2;
    scene.add(mesh);
  });

  // CUBES

  const boxGeometry = new BoxGeometry(100, 100, 100);

  let mesh = new Mesh(
    boxGeometry,
    new MeshBasicMaterial({ color: 0x0000ff, opacity: 0.5, transparent: true })
  );
  mesh.position.x = 500;
  mesh.rotation.x = Math.random();
  mesh.rotation.y = Math.random();
  mesh.scale.x = mesh.scale.y = mesh.scale.z = 2;
  scene.add(mesh);

  mesh = new Mesh(
    boxGeometry,
    new MeshBasicMaterial({ color: Math.random() * 0xffffff })
  );
  mesh.position.x = 500;
  mesh.position.y = 500;
  mesh.rotation.x = Math.random();
  mesh.rotation.y = Math.random();
  mesh.scale.x = mesh.scale.y = mesh.scale.z = 2;
  scene.add(mesh);

  // PLANE

  mesh = new Mesh(
    new PlaneGeometry(100, 100),
    new MeshBasicMaterial({ color: Math.random() * 0xffffff, side: DoubleSide })
  );
  mesh.position.y = -500;
  mesh.scale.x = mesh.scale.y = mesh.scale.z = 2;
  scene.add(mesh);

  // CYLINDER

  mesh = new Mesh(
    new CylinderGeometry(20, 100, 200, 10),
    new MeshBasicMaterial({ color: Math.random() * 0xffffff })
  );
  mesh.position.x = -500;
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.x = mesh.scale.y = mesh.scale.z = 2;
  scene.add(mesh);

  // POLYFIELD

  const geometry = new BufferGeometry();
  const material = new MeshBasicMaterial({
    vertexColors: true,
    side: DoubleSide,
  });

  const v = new Vector3();
  const v0 = new Vector3();
  const v1 = new Vector3();
  const v2 = new Vector3();
  const color = new Color();

  const vertices = [];
  const colors = [];

  for (let i = 0; i < 100; i++) {
    v.set(
      Math.random() * 1000 - 500,
      Math.random() * 1000 - 500,
      Math.random() * 1000 - 500
    );

    v0.set(
      Math.random() * 100 - 50,
      Math.random() * 100 - 50,
      Math.random() * 100 - 50
    );

    v1.set(
      Math.random() * 100 - 50,
      Math.random() * 100 - 50,
      Math.random() * 100 - 50
    );

    v2.set(
      Math.random() * 100 - 50,
      Math.random() * 100 - 50,
      Math.random() * 100 - 50
    );

    v0.add(v);
    v1.add(v);
    v2.add(v);

    color.setHex(Math.random() * 0xffffff);

    // create a single triangle

    vertices.push(v0.x, v0.y, v0.z);
    vertices.push(v1.x, v1.y, v1.z);
    vertices.push(v2.x, v2.y, v2.z);

    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

  group = new Mesh(geometry, material);
  group.scale.set(2, 2, 2);
  scene.add(group);

  // SPRITES

  for (let i = 0; i < 50; i++) {
    const material = new SpriteMaterial({ color: Math.random() * 0xffffff });
    const sprite = new Sprite(material);
    sprite.position.x = Math.random() * 1000 - 500;
    sprite.position.y = Math.random() * 1000 - 500;
    sprite.position.z = Math.random() * 1000 - 500;
    sprite.scale.set(64, 64, 1);
    scene.add(sprite);
  }

  // CUSTOM

  const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  node.setAttribute("stroke", "black");
  node.setAttribute("fill", "red");
  node.setAttribute("r", "40");

  for (let i = 0; i < 50; i++) {
    const object = new SVGObject(node.cloneNode());
    object.position.x = Math.random() * 1000 - 500;
    object.position.y = Math.random() * 1000 - 500;
    object.position.z = Math.random() * 1000 - 500;
    scene.add(object);
  }

  // CUSTOM FROM FILE

  const fileLoader = new FileLoader();
  fileLoader.load("models/svg/hexagon.svg", function (svg) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");

    node.appendChild(doc.documentElement);

    const object = new SVGObject(node);
    object.position.x = 500;
    scene.add(object);
  });

  // LIGHTS

  const ambient = new AmbientLight(0x80ffff);
  scene.add(ambient);

  const directional = new DirectionalLight(0xffff00);
  directional.position.set(-1, 0.5, 0);
  scene.add(directional);

  renderer = new SVGRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setQuality("low");
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
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
  stats.update();
}

function render() {
  const time = Date.now() * 0.0002;

  camera.position.x = Math.sin(time) * 500;
  camera.position.z = Math.cos(time) * 500;
  camera.lookAt(scene.position);

  group.rotation.x += 0.01;

  renderer.render(scene, camera);
}
