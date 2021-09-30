//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  CanvasTexture,
  RepeatWrapping,
  NearestFilter,
  NearestMipmapNearestFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  TextureLoader,
  Texture,
  LinearFilter,
  UVMapping,
  WebGLRenderer,
} from "three";

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

let container;

let camera, scene1, scene2, renderer;

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

  scene1 = new Scene();
  scene1.background = new Color(0x000000);
  scene1.fog = new Fog(0x000000, 1500, 4000);

  scene2 = new Scene();
  scene2.background = new Color(0x000000);
  scene2.fog = new Fog(0x000000, 1500, 4000);

  // GROUND

  function mipmap(size, color) {
    const imageCanvas = document.createElement("canvas");
    const context = imageCanvas.getContext("2d");

    imageCanvas.width = imageCanvas.height = size;

    context.fillStyle = "#444";
    context.fillRect(0, 0, size, size);

    context.fillStyle = color;
    context.fillRect(0, 0, size / 2, size / 2);
    context.fillRect(size / 2, size / 2, size / 2, size / 2);
    return imageCanvas;
  }

  const canvas = mipmap(128, "#f00");
  const textureCanvas1 = new CanvasTexture(canvas);
  textureCanvas1.mipmaps[0] = canvas;
  textureCanvas1.mipmaps[1] = mipmap(64, "#0f0");
  textureCanvas1.mipmaps[2] = mipmap(32, "#00f");
  textureCanvas1.mipmaps[3] = mipmap(16, "#400");
  textureCanvas1.mipmaps[4] = mipmap(8, "#040");
  textureCanvas1.mipmaps[5] = mipmap(4, "#004");
  textureCanvas1.mipmaps[6] = mipmap(2, "#044");
  textureCanvas1.mipmaps[7] = mipmap(1, "#404");
  textureCanvas1.repeat.set(1000, 1000);
  textureCanvas1.wrapS = RepeatWrapping;
  textureCanvas1.wrapT = RepeatWrapping;

  const textureCanvas2 = textureCanvas1.clone();
  textureCanvas2.magFilter = NearestFilter;
  textureCanvas2.minFilter = NearestMipmapNearestFilter;

  const materialCanvas1 = new MeshBasicMaterial({ map: textureCanvas1 });
  const materialCanvas2 = new MeshBasicMaterial({
    color: 0xffccaa,
    map: textureCanvas2,
  });

  const geometry = new PlaneGeometry(100, 100);

  const meshCanvas1 = new Mesh(geometry, materialCanvas1);
  meshCanvas1.rotation.x = -Math.PI / 2;
  meshCanvas1.scale.set(1000, 1000, 1000);

  const meshCanvas2 = new Mesh(geometry, materialCanvas2);
  meshCanvas2.rotation.x = -Math.PI / 2;
  meshCanvas2.scale.set(1000, 1000, 1000);

  // PAINTING

  const callbackPainting = function () {
    const image = texturePainting1.image;

    texturePainting2.image = image;
    texturePainting2.needsUpdate = true;

    scene1.add(meshCanvas1);
    scene2.add(meshCanvas2);

    const geometry = new PlaneGeometry(100, 100);
    const mesh1 = new Mesh(geometry, materialPainting1);
    const mesh2 = new Mesh(geometry, materialPainting2);

    addPainting(scene1, mesh1);
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
      meshCanvas1.position.y = meshCanvas2.position.y = floorHeight;
    }
  };

  const texturePainting1 = new TextureLoader().load(
    "textures/758px-Canestra_di_frutta_(Caravaggio).jpg",
    callbackPainting
  );
  const texturePainting2 = new Texture();
  const materialPainting1 = new MeshBasicMaterial({
    color: 0xffffff,
    map: texturePainting1,
  });
  const materialPainting2 = new MeshBasicMaterial({
    color: 0xffccaa,
    map: texturePainting2,
  });

  texturePainting2.minFilter = texturePainting2.magFilter = NearestFilter;
  texturePainting1.minFilter = texturePainting1.magFilter = LinearFilter;
  texturePainting1.mapping = UVMapping;

  renderer = new WebGLRenderer({ antialias: true });
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

  camera.lookAt(scene1.position);

  renderer.clear();
  renderer.setScissorTest(true);

  renderer.setScissor(0, 0, SCREEN_WIDTH / 2 - 2, SCREEN_HEIGHT);
  renderer.render(scene1, camera);

  renderer.setScissor(SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2 - 2, SCREEN_HEIGHT);
  renderer.render(scene2, camera);

  renderer.setScissorTest(false);
}
