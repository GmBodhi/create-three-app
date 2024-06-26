import "./style.css"; // For webpack support

import {
  NodeMaterial,
  WebGPURenderer,
  RenderTarget,
  NearestFilter,
  DataTexture,
  UnsignedByteType,
  RGBAFormat,
  MeshBasicNodeMaterial,
  Scene,
  Color,
  PerspectiveCamera,
  TextureLoader,
  SRGBColorSpace,
  RepeatWrapping,
  Mesh,
  TorusKnotGeometry,
  QuadMesh,
} from "three";
import {
  mix,
  modelNormalMatrix,
  normalGeometry,
  normalize,
  outputStruct,
  step,
  texture,
  uniform,
  uv,
  varying,
  vec2,
  vec4,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, torus;
let quadMesh,
  renderTarget,
  readbackTarget,
  material,
  readbackMaterial,
  pixelBuffer,
  pixelBufferTexture;

const gui = new GUI();

const options = {
  selection: "mrt",
};

gui.add(options, "selection", ["mrt", "diffuse", "normal"]);

class WriteGBufferMaterial extends NodeMaterial {
  constructor(diffuseTexture) {
    super();

    this.lights = false;
    this.fog = false;
    this.colorSpaced = false;

    this.diffuseTexture = diffuseTexture;

    const vUv = varying(uv());

    const transformedNormal = modelNormalMatrix.mul(normalGeometry);
    const vNormal = varying(normalize(transformedNormal));

    const repeat = uniform(vec2(5, 0.5));

    const gColor = texture(this.diffuseTexture, vUv.mul(repeat));
    const gNormal = vec4(normalize(vNormal), 1.0);

    this.fragmentNode = outputStruct(gColor, gNormal);
  }
}

class ReadGBufferMaterial extends NodeMaterial {
  constructor(tDiffuse, tNormal) {
    super();

    this.lights = false;
    this.fog = false;

    const vUv = varying(uv());

    const diffuse = texture(tDiffuse, vUv);
    const normal = texture(tNormal, vUv);

    this.fragmentNode = mix(diffuse, normal, step(0.5, vUv.x));
  }
}

init();

function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  document.body.appendChild(renderer.domElement);

  // Create a multi render target with Float buffers

  renderTarget = new RenderTarget(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio,
    { count: 2, minFilter: NearestFilter, magFilter: NearestFilter }
  );

  // Name our G-Buffer attachments for debugging

  renderTarget.textures[0].name = "diffuse";
  renderTarget.textures[1].name = "normal";

  // Init readback render target, readback data texture, readback material
  // Be careful with the size! 512 is already big. Reading data back from the GPU is computationally intensive

  const size = 512;

  readbackTarget = new RenderTarget(size, size, { count: 2 });

  pixelBuffer = new Uint8Array(size ** 2 * 4).fill(0);
  pixelBufferTexture = new DataTexture(pixelBuffer, size, size);
  pixelBufferTexture.type = UnsignedByteType;
  pixelBufferTexture.format = RGBAFormat;

  readbackMaterial = new MeshBasicNodeMaterial();
  readbackMaterial.colorNode = texture(pixelBufferTexture);

  // Scene setup

  scene = new Scene();
  scene.background = new Color(0x222222);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.z = 4;

  const loader = new TextureLoader();

  const diffuse = loader.load("textures/hardwood2_diffuse.jpg");
  diffuse.colorSpace = SRGBColorSpace;
  diffuse.wrapS = RepeatWrapping;
  diffuse.wrapT = RepeatWrapping;

  torus = new Mesh(
    new TorusKnotGeometry(1, 0.3, 128, 32),
    new WriteGBufferMaterial(diffuse)
  );

  scene.add(torus);

  material = new ReadGBufferMaterial(
    renderTarget.textures[0],
    renderTarget.textures[1]
  );
  quadMesh = new QuadMesh(material);

  // Controls

  new OrbitControls(camera, renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  const dpr = renderer.getPixelRatio();
  renderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

async function render(time) {
  const selection = options.selection;

  torus.rotation.y = (time / 1000) * 0.4;

  // render scene into target
  renderer.setRenderTarget(selection === "mrt" ? renderTarget : readbackTarget);
  renderer.render(scene, camera);

  // render post FX
  renderer.setRenderTarget(null);

  if (selection === "mrt") {
    quadMesh.material = material;
  } else {
    quadMesh.material = readbackMaterial;

    await readback();
  }

  quadMesh.render(renderer);
}

async function readback() {
  const width = readbackTarget.width;
  const height = readbackTarget.height;

  const selection = options.selection;

  if (selection === "diffuse") {
    pixelBuffer = await renderer.readRenderTargetPixelsAsync(
      readbackTarget,
      0,
      0,
      width,
      height,
      0
    ); // zero is optional

    pixelBufferTexture.image.data = pixelBuffer;
    pixelBufferTexture.needsUpdate = true;
  } else if (selection === "normal") {
    pixelBuffer = await renderer.readRenderTargetPixelsAsync(
      readbackTarget,
      0,
      0,
      width,
      height,
      1
    );

    pixelBufferTexture.image.data = pixelBuffer;
    pixelBufferTexture.needsUpdate = true;
  }
}
