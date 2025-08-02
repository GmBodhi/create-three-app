import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  mix,
  vec2,
  step,
  texture,
  uv,
  screenUV,
  normalWorld,
  output,
  mrt,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, torus;
let postProcessing, renderTarget;

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

  renderTarget.textures[0].name = "output";
  renderTarget.textures[1].name = "normal";

  // Scene

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

  const torusMaterial = new NodeMaterial();
  torusMaterial.colorNode = texture(diffuse, uv().mul(vec2(10, 4)));

  torus = new Mesh(new TorusKnotGeometry(1, 0.3, 128, 32), torusMaterial);
  scene.add(torus);

  // MRT

  renderer.setMRT(
    mrt({
      output: output,
      normal: normalWorld,
    })
  );

  // Post Processing

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = mix(
    texture(renderTarget.textures[0]),
    texture(renderTarget.textures[1]),
    step(0.5, screenUV.x)
  );

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

function render(time) {
  torus.rotation.y = (time / 1000) * 0.4;

  // render scene into target
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // render post FX
  renderer.setRenderTarget(null);
  postProcessing.render();
}
