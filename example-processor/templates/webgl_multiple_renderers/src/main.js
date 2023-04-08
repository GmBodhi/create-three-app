import "./style.css"; // For webpack support

import {
  Color,
  PerspectiveCamera,
  Scene,
  DirectionalLight,
  CanvasTexture,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  IcosahedronGeometry,
  BufferAttribute,
  MeshPhongMaterial,
  WebGLRenderer,
  LinearSRGBColorSpace,
  Vector3,
} from "three";

let camera, scene, renderer1, renderer2;

let mesh1, mesh2, mesh3;
const color = new Color();

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    20,
    window.innerWidth / (window.innerHeight / 2),
    1,
    10000
  );

  scene = new Scene();
  scene.background = new Color(0xffffff);

  const light1 = new DirectionalLight(0xffffff);
  light1.position.set(0, 0, 1);
  scene.add(light1);

  const light2 = new DirectionalLight(0xffff00, 0.75);
  light2.position.set(0, 0, -1);
  scene.add(light2);

  // shadow

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );
  gradient.addColorStop(0.1, "rgba(210,210,210,1)");
  gradient.addColorStop(1, "rgba(255,255,255,1)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const shadowTexture = new CanvasTexture(canvas);

  const shadowMaterial = new MeshBasicMaterial({ map: shadowTexture });
  const shadowGeo = new PlaneGeometry(300, 300, 1, 1);

  let shadowMesh;

  shadowMesh = new Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.x = -400;
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.x = 400;
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  const radius = 200;

  const geometry1 = new IcosahedronGeometry(radius, 1);

  const count = geometry1.attributes.position.count;
  geometry1.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(count * 3), 3)
  );

  const geometry2 = geometry1.clone();
  const geometry3 = geometry1.clone();

  const positions1 = geometry1.attributes.position;
  const positions2 = geometry2.attributes.position;
  const positions3 = geometry3.attributes.position;
  const colors1 = geometry1.attributes.color;
  const colors2 = geometry2.attributes.color;
  const colors3 = geometry3.attributes.color;

  for (let i = 0; i < count; i++) {
    color.setHSL((positions1.getY(i) / radius + 1) / 2, 1.0, 0.5);
    colors1.setXYZ(i, color.r, color.g, color.b);

    color.setHSL(0, (positions2.getY(i) / radius + 1) / 2, 0.5);
    colors2.setXYZ(i, color.r, color.g, color.b);

    color.setRGB(1, 0.8 - (positions3.getY(i) / radius + 1) / 2, 0);
    colors3.setXYZ(i, color.r, color.g, color.b);
  }

  const material = new MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    vertexColors: true,
    shininess: 0,
  });

  const wireframeMaterial = new MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
  });

  mesh1 = new Mesh(geometry1, material);
  mesh1.position.x = -400;
  mesh1.rotation.x = -1.87;
  scene.add(mesh1);

  const wireframe1 = new Mesh(geometry1, wireframeMaterial);
  mesh1.add(wireframe1);

  mesh2 = new Mesh(geometry2, material);
  mesh2.position.x = 400;
  scene.add(mesh2);

  const wireframe2 = new Mesh(geometry2, wireframeMaterial);
  mesh2.add(wireframe2);

  mesh3 = new Mesh(geometry3, material);
  scene.add(mesh3);

  const wireframe3 = new Mesh(geometry3, wireframeMaterial);
  mesh3.add(wireframe3);

  //

  renderer1 = new WebGLRenderer({ antialias: true });
  renderer1.setPixelRatio(window.devicePixelRatio);
  renderer1.setSize(window.innerWidth, window.innerHeight / 2);
  renderer1.outputColorSpace = LinearSRGBColorSpace;
  document.body.appendChild(renderer1.domElement);

  renderer2 = new WebGLRenderer();
  renderer2.setPixelRatio(window.devicePixelRatio);
  renderer2.setSize(window.innerWidth, window.innerHeight / 2);
  renderer2.outputColorSpace = LinearSRGBColorSpace;
  document.body.appendChild(renderer2.domElement);
}

function animate() {
  requestAnimationFrame(animate);

  // update scene

  mesh1.rotation.z += Math.PI / 500;
  mesh2.rotation.z += Math.PI / 500;
  mesh3.rotation.z += Math.PI / 500;

  const position = new Vector3();
  const color = new Color();

  let time = performance.now() / 500;

  const positions = mesh3.geometry.attributes.position;
  const colors = mesh3.geometry.attributes.color;

  for (let i = 0, l = positions.count; i < l; i++) {
    position.fromArray(positions.array, i * 3);

    color.setRGB(
      1,
      Math.sin(time + position.x),
      Math.cos(time * 2.123 + position.x)
    );
    colors.setXYZ(i, color.r, color.g, color.b);
  }

  colors.needsUpdate = true;

  //

  time = performance.now() / 2000;

  camera.position.x = Math.sin(time) * 1800;
  camera.position.z = Math.cos(time) * 1800;

  camera.lookAt(scene.position);

  renderer1.render(scene, camera);
  renderer2.render(scene, camera);
}
