import "./style.css"; // For webpack support

import {
  ColorManagement,
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  CanvasTexture,
  RepeatWrapping,
  NearestFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  TextureLoader,
  Texture,
  LinearFilter,
  UVMapping,
  WebGLRenderer,
  LinearSRGBColorSpace,
} from "three";

ColorManagement.enabled = false; // TODO: Confirm correct color management.

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

let container;

let camera, scene, scene2, renderer;

let mouseX = 0,
  mouseY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(35, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 5000);
  camera.position.z = 1500;

  scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new Fog(0x000000, 1500, 4000);

  scene2 = new Scene();
  scene2.background = new Color(0x000000);
  scene2.fog = new Fog(0x000000, 1500, 4000);

  // GROUND

  const imageCanvas = document.createElement("canvas");
  const context = imageCanvas.getContext("2d");

  imageCanvas.width = imageCanvas.height = 128;

  context.fillStyle = "#444";
  context.fillRect(0, 0, 128, 128);

  context.fillStyle = "#fff";
  context.fillRect(0, 0, 64, 64);
  context.fillRect(64, 64, 64, 64);

  const textureCanvas = new CanvasTexture(imageCanvas);
  textureCanvas.repeat.set(1000, 1000);
  textureCanvas.wrapS = RepeatWrapping;
  textureCanvas.wrapT = RepeatWrapping;

  const textureCanvas2 = textureCanvas.clone();
  textureCanvas2.magFilter = NearestFilter;
  textureCanvas2.minFilter = NearestFilter;

  const materialCanvas = new MeshBasicMaterial({ map: textureCanvas });
  const materialCanvas2 = new MeshBasicMaterial({
    color: 0xffccaa,
    map: textureCanvas2,
  });

  const geometry = new PlaneGeometry(100, 100);

  const meshCanvas = new Mesh(geometry, materialCanvas);
  meshCanvas.rotation.x = -Math.PI / 2;
  meshCanvas.scale.set(1000, 1000, 1000);

  const meshCanvas2 = new Mesh(geometry, materialCanvas2);
  meshCanvas2.rotation.x = -Math.PI / 2;
  meshCanvas2.scale.set(1000, 1000, 1000);

  // PAINTING

  const callbackPainting = function () {
    const image = texturePainting.image;

    texturePainting2.image = image;
    texturePainting2.needsUpdate = true;

    scene.add(meshCanvas);
    scene2.add(meshCanvas2);

    const geometry = new PlaneGeometry(100, 100);
    const mesh = new Mesh(geometry, materialPainting);
    const mesh2 = new Mesh(geometry, materialPainting2);

    addPainting(scene, mesh);
    addPainting(scene2, mesh2);

    function addPainting(zscene, zmesh) {
      zmesh.scale.x = image.width / 100;
      zmesh.scale.y = image.height / 100;

      zscene.add(zmesh);

      const meshFrame = new Mesh(
        geometry,
        new MeshBasicMaterial({ color: 0x000000 })
      );
      meshFrame.position.z = -10.0;
      meshFrame.scale.x = (1.1 * image.width) / 100;
      meshFrame.scale.y = (1.1 * image.height) / 100;
      zscene.add(meshFrame);

      const meshShadow = new Mesh(
        geometry,
        new MeshBasicMaterial({
          color: 0x000000,
          opacity: 0.75,
          transparent: true,
        })
      );
      meshShadow.position.y = (-1.1 * image.height) / 2;
      meshShadow.position.z = (-1.1 * image.height) / 2;
      meshShadow.rotation.x = -Math.PI / 2;
      meshShadow.scale.x = (1.1 * image.width) / 100;
      meshShadow.scale.y = (1.1 * image.height) / 100;
      zscene.add(meshShadow);

      const floorHeight = (-1.117 * image.height) / 2;
      meshCanvas.position.y = meshCanvas2.position.y = floorHeight;
    }
  };

  const texturePainting = new TextureLoader().load(
    "textures/758px-Canestra_di_frutta_(Caravaggio).jpg",
    callbackPainting
  );
  const texturePainting2 = new Texture();
  const materialPainting = new MeshBasicMaterial({
    color: 0xffffff,
    map: texturePainting,
  });
  const materialPainting2 = new MeshBasicMaterial({
    color: 0xffccaa,
    map: texturePainting2,
  });

  texturePainting2.minFilter = texturePainting2.magFilter = NearestFilter;
  texturePainting.minFilter = texturePainting.magFilter = LinearFilter;
  texturePainting.mapping = UVMapping;

  renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.autoClear = false;

  renderer.domElement.style.position = "relative";
  container.appendChild(renderer.domElement);

  document.addEventListener("mousemove", onDocumentMouseMove);
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-(mouseY - 200) - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  renderer.clear();
  renderer.setScissorTest(true);

  renderer.setScissor(0, 0, SCREEN_WIDTH / 2 - 2, SCREEN_HEIGHT);
  renderer.render(scene, camera);

  renderer.setScissor(SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2 - 2, SCREEN_HEIGHT);
  renderer.render(scene2, camera);

  renderer.setScissorTest(false);
}
