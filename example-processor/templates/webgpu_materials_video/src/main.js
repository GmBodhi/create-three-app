import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

let container;

let camera, scene, renderer;

let video, texture, material, mesh;

let mouseX = 0;
let mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let cube_count;

const meshes = [],
  materials = [],
  xgrid = 20,
  ygrid = 10;

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", function () {
  init();
});

function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 500;

  scene = new Scene();

  const light = new DirectionalLight(0xffffff, 7);
  light.position.set(0.5, 1, 1).normalize();
  scene.add(light);

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  container.appendChild(renderer.domElement);

  video = document.getElementById("video");
  video.play();
  video.addEventListener("play", function () {
    this.currentTime = 3;
  });

  texture = new VideoTexture(video);
  texture.colorSpace = SRGBColorSpace;

  //

  let i, j, ox, oy, geometry;

  const ux = 1 / xgrid;
  const uy = 1 / ygrid;

  const xsize = 480 / xgrid;
  const ysize = 204 / ygrid;

  const parameters = { color: 0xffffff, map: texture };

  cube_count = 0;

  for (i = 0; i < xgrid; i++) {
    for (j = 0; j < ygrid; j++) {
      ox = i;
      oy = j;

      geometry = new BoxGeometry(xsize, ysize, xsize);

      change_uvs(geometry, ux, uy, ox, oy);

      materials[cube_count] = new MeshPhongMaterial(parameters);

      material = materials[cube_count];

      material.hue = i / xgrid;
      material.saturation = 1 - j / ygrid;

      material.color.setHSL(material.hue, material.saturation, 0.5);

      mesh = new Mesh(geometry, material);

      mesh.position.x = (i - xgrid / 2) * xsize;
      mesh.position.y = (j - ygrid / 2) * ysize;
      mesh.position.z = 0;

      mesh.scale.x = mesh.scale.y = mesh.scale.z = 1;

      scene.add(mesh);

      mesh.dx = 0.001 * (0.5 - Math.random());
      mesh.dy = 0.001 * (0.5 - Math.random());

      meshes[cube_count] = mesh;

      cube_count += 1;
    }
  }

  document.addEventListener("mousemove", onDocumentMouseMove);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function change_uvs(geometry, unitx, unity, offsetx, offsety) {
  const uvs = geometry.attributes.uv.array;

  for (let i = 0; i < uvs.length; i += 2) {
    uvs[i] = (uvs[i] + offsetx) * unitx;
    uvs[i + 1] = (uvs[i + 1] + offsety) * unity;
  }
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = (event.clientY - windowHalfY) * 0.3;
}

//

let h,
  counter = 1;

function render() {
  const time = Date.now() * 0.00005;

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  for (let i = 0; i < cube_count; i++) {
    material = materials[i];

    h = ((360 * (material.hue + time)) % 360) / 360;
    material.color.setHSL(h, material.saturation, 0.5);
  }

  if (counter % 1000 > 200) {
    for (let i = 0; i < cube_count; i++) {
      mesh = meshes[i];

      mesh.rotation.x += 10 * mesh.dx;
      mesh.rotation.y += 10 * mesh.dy;

      mesh.position.x -= 150 * mesh.dx;
      mesh.position.y += 150 * mesh.dy;
      mesh.position.z += 300 * mesh.dx;
    }
  }

  if (counter % 1000 === 0) {
    for (let i = 0; i < cube_count; i++) {
      mesh = meshes[i];

      mesh.dx *= -1;
      mesh.dy *= -1;
    }
  }

  counter++;

  renderer.render(scene, camera);
}
