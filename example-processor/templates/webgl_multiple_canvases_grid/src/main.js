import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
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
} from "three";

const views = [];

let scene, renderer;

let mouseX = 0,
  mouseY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

init();
animate();

//

function View(
  canvas,
  fullWidth,
  fullHeight,
  viewX,
  viewY,
  viewWidth,
  viewHeight
) {
  canvas.width = viewWidth * window.devicePixelRatio;
  canvas.height = viewHeight * window.devicePixelRatio;

  const context = canvas.getContext("2d");

  const camera = new PerspectiveCamera(20, viewWidth / viewHeight, 1, 10000);
  camera.setViewOffset(
    fullWidth,
    fullHeight,
    viewX,
    viewY,
    viewWidth,
    viewHeight
  );
  camera.position.z = 1800;

  this.render = function () {
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);

    context.drawImage(renderer.domElement, 0, 0);
  };
}

//

function init() {
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");
  const canvas3 = document.getElementById("canvas3");
  const canvas4 = document.getElementById("canvas4");

  const w = 300,
    h = 200;

  const fullWidth = w * 2;
  const fullHeight = h * 2;

  views.push(new View(canvas1, fullWidth, fullHeight, w * 0, h * 0, w, h));
  views.push(new View(canvas2, fullWidth, fullHeight, w * 1, h * 0, w, h));
  views.push(new View(canvas3, fullWidth, fullHeight, w * 0, h * 1, w, h));
  views.push(new View(canvas4, fullWidth, fullHeight, w * 1, h * 1, w, h));

  //

  scene = new Scene();
  scene.background = new Color(0xffffff);

  const light = new DirectionalLight(0xffffff);
  light.position.set(0, 0, 1).normalize();
  scene.add(light);

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

  const color = new Color();
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

  let mesh = new Mesh(geometry1, material);
  let wireframe = new Mesh(geometry1, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = -400;
  mesh.rotation.x = -1.87;
  scene.add(mesh);

  mesh = new Mesh(geometry2, material);
  wireframe = new Mesh(geometry2, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = 400;
  scene.add(mesh);

  mesh = new Mesh(geometry3, material);
  wireframe = new Mesh(geometry3, wireframeMaterial);
  mesh.add(wireframe);
  scene.add(mesh);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(300, 200);

  document.addEventListener("mousemove", onDocumentMouseMove);
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

function animate() {
  for (let i = 0; i < views.length; ++i) {
    views[i].render();
  }

  requestAnimationFrame(animate);
}
