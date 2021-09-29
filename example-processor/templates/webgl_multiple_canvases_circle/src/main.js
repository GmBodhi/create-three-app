import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Camera,
  MathUtils,
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

function View(canvas, rotateY) {
  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;

  const context = canvas.getContext("2d");

  const camera = new PerspectiveCamera(
    20,
    canvas.clientWidth / canvas.clientHeight,
    1,
    20000
  );
  camera.rotation.y = rotateY;

  // Think of the virtual camera as a post with 5 cameras on it (even though those cameras happen to live in difference scenes)
  // You need to move the post (ie, the virtualCamera) to move all 5 cameras together.

  const virtualCamera = new Camera();
  virtualCamera.add(camera);

  this.render = function () {
    virtualCamera.position.x = -mouseX * 4;
    virtualCamera.position.y = -mouseY * 4;
    virtualCamera.position.z = 1800;

    virtualCamera.lookAt(scene.position);
    virtualCamera.updateMatrixWorld(true);

    renderer.render(scene, camera);

    context.drawImage(renderer.domElement, 0, 0);
  };
}

function init() {
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");
  const canvas3 = document.getElementById("canvas3");
  const canvas4 = document.getElementById("canvas4");
  const canvas5 = document.getElementById("canvas5");

  const fudge = 0.45; // I don't know why this is needed :-(
  const rot = 30 * MathUtils.DEG2RAD;

  views.push(new View(canvas1, rot * -2 * fudge));
  views.push(new View(canvas2, rot * -1 * fudge));
  views.push(new View(canvas3, rot * 0 * fudge));
  views.push(new View(canvas4, rot * 1 * fudge));
  views.push(new View(canvas5, rot * 2 * fudge));

  //

  scene = new Scene();
  scene.background = new Color(0xffffff);

  const light = new DirectionalLight(0xffffff);
  light.position.set(0, 0, 1).normalize();
  scene.add(light);

  const noof_balls = 51;

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

  for (let i = 0; i < noof_balls; i++) {
    // create shadows

    const shadowMesh = new Mesh(shadowGeo, shadowMaterial);
    shadowMesh.position.x = (-(noof_balls - 1) / 2) * 400 + i * 400;
    shadowMesh.position.y = -250;
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);
  }

  const radius = 200;

  const geometry1 = new IcosahedronGeometry(radius, 1);

  const count = geometry1.attributes.position.count;
  geometry1.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(count * 3), 3)
  );

  const color = new Color();
  const positions = geometry1.attributes.position;
  const colors = geometry1.attributes.color;

  for (let i = 0; i < count; i++) {
    color.setHSL((positions.getY(i) / radius + 1) / 2, 1.0, 0.5);

    colors.setXYZ(i, color.r, color.g, color.b);
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

  for (let i = 0; i < noof_balls; i++) {
    // create balls

    const mesh = new Mesh(geometry1, material);
    const wireframe = new Mesh(geometry1, wireframeMaterial);
    mesh.add(wireframe);

    mesh.position.x = (-(noof_balls - 1) / 2) * 400 + i * 400;
    mesh.rotation.x = i * 0.5;
    scene.add(mesh);
  }

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(200, 300);

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
