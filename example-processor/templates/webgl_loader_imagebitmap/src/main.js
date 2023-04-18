import "./style.css"; // For webpack support

import {
  ImageBitmapLoader,
  CanvasTexture,
  SRGBColorSpace,
  MeshBasicMaterial,
  ImageLoader,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  Group,
  GridHelper,
  WebGLRenderer,
} from "three";

let camera, scene, renderer;
let group, cubes;

init();
animate();

function addImageBitmap() {
  new ImageBitmapLoader().load(
    "textures/planets/earth_atmos_2048.jpg?" + performance.now(),
    function (imageBitmap) {
      const texture = new CanvasTexture(imageBitmap);
      texture.colorSpace = SRGBColorSpace;
      const material = new MeshBasicMaterial({ map: texture });

      /* ImageBitmap should be disposed when done with it
						   Can't be done until it's actually uploaded to WebGLTexture */

      // imageBitmap.close();

      addCube(material);
    },
    function (p) {
      console.log(p);
    },
    function (e) {
      console.log(e);
    }
  );
}

function addImage() {
  new ImageLoader()
    .setCrossOrigin("*")
    .load(
      "textures/planets/earth_atmos_2048.jpg?" + performance.now(),
      function (image) {
        const texture = new CanvasTexture(image);
        texture.colorSpace = SRGBColorSpace;
        const material = new MeshBasicMaterial({
          color: 0xff8888,
          map: texture,
        });
        addCube(material);
      }
    );
}

const geometry = new BoxGeometry(1, 1, 1);

function addCube(material) {
  const cube = new Mesh(geometry, material);
  cube.position.set(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  cube.rotation.set(
    Math.random() * 2 * Math.PI,
    Math.random() * 2 * Math.PI,
    Math.random() * 2 * Math.PI
  );
  cubes.add(cube);
}

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  // CAMERA

  camera = new PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    1500
  );
  camera.position.set(0, 4, 7);
  camera.lookAt(0, 0, 0);

  // SCENE

  scene = new Scene();

  //

  group = new Group();
  scene.add(group);

  group.add(new GridHelper(4, 12, 0x888888, 0x444444));

  cubes = new Group();
  group.add(cubes);

  // RENDERER

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // TESTS

  setTimeout(addImage, 300);
  setTimeout(addImage, 600);
  setTimeout(addImage, 900);
  setTimeout(addImageBitmap, 1300);
  setTimeout(addImageBitmap, 1600);
  setTimeout(addImageBitmap, 1900);

  // EVENTS

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  group.rotation.y = performance.now() / 3000;

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}
