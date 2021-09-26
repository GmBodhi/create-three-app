import "./style.css"; // For webpack support

import {
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Scene,
  Color,
  Fog,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  TextureLoader,
  MeshLambertMaterial,
  DoubleSide,
  ParametricBufferGeometry,
  Mesh,
  SphereGeometry,
  MeshLambertMaterial,
  Mesh,
  RepeatWrapping,
  sRGBEncoding,
  MeshLambertMaterial,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshLambertMaterial,
  Mesh,
  Mesh,
  Mesh,
  BoxGeometry,
  BoxGeometry,
  Mesh,
  Mesh,
  WebGLRenderer,
  sRGBEncoding,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  MeshPhongMaterial,
  DoubleSide,
  TorusKnotGeometry,
  Mesh,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  WebGLRenderer,
  Plane,
  Plane,
  Vector3,
  Vector3,
  Vector3,
  Matrix4,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  MeshPhongMaterial,
  DoubleSide,
  Group,
  BoxGeometry,
  Mesh,
  PlaneGeometry,
  Color,
  Group,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  MeshPhongMaterial,
  WebGLRenderer,
  Matrix4,
  Matrix4,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  CameraHelper,
  Group,
  SphereGeometry,
  MeshLambertMaterial,
  Color,
  DoubleSide,
  Mesh,
  Group,
  PlaneHelper,
  PlaneHelper,
  PlaneHelper,
  Group,
  MeshBasicMaterial,
  AlwaysStencilFunc,
  BackSide,
  IncrementWrapStencilOp,
  IncrementWrapStencilOp,
  IncrementWrapStencilOp,
  Mesh,
  FrontSide,
  DecrementWrapStencilOp,
  DecrementWrapStencilOp,
  DecrementWrapStencilOp,
  Mesh,
  Clock,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  PlaneHelper,
  TorusKnotGeometry,
  Group,
  PlaneGeometry,
  Group,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ReplaceStencilOp,
  ReplaceStencilOp,
  Mesh,
  MeshStandardMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  DoubleSide,
  WebGLRenderer,
  Vector3,
  Vector3,
  Vector2,
  TextureLoader,
  MeshPhongMaterial,
  Vector2,
  Vector3,
  Euler,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  DirectionalLight,
  BufferGeometry,
  Vector3,
  Vector3,
  Line,
  LineBasicMaterial,
  Raycaster,
  Mesh,
  BoxGeometry,
  MeshNormalMaterial,
  MeshPhongMaterial,
  Mesh,
  DepthFormat,
  UnsignedShortType,
  DepthFormat,
  DepthStencilFormat,
  UnsignedShortType,
  UnsignedIntType,
  UnsignedInt248Type,
  WebGLRenderer,
  PerspectiveCamera,
  WebGLRenderTarget,
  RGBFormat,
  NearestFilter,
  NearestFilter,
  DepthStencilFormat,
  DepthTexture,
  OrthographicCamera,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  Scene,
  Scene,
  TorusKnotGeometry,
  MeshBasicMaterial,
  Mesh,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer, controls, stats;
let target;
let postScene, postCamera, postMaterial;
let supportsExtension = true;

const params = {
  format: DepthFormat,
  type: UnsignedShortType,
};

const formats = {
  DepthFormat: DepthFormat,
  DepthStencilFormat: DepthStencilFormat,
};
const types = {
  UnsignedShortType: UnsignedShortType,
  UnsignedIntType: UnsignedIntType,
  UnsignedInt248Type: UnsignedInt248Type,
};

init();
animate();

function init() {
  renderer = new WebGLRenderer();

  if (
    renderer.capabilities.isWebGL2 === false &&
    renderer.extensions.has("WEBGL_depth_texture") === false
  ) {
    supportsExtension = false;
    document.querySelector("#error").style.display = "block";
    return;
  }

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    50
  );
  camera.position.z = 4;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Create a render target with depth texture
  setupRenderTarget();

  // Our scene
  setupScene();

  // Setup post-processing step
  setupPost();

  onWindowResize();
  window.addEventListener("resize", onWindowResize);

  //
  const gui = new GUI({ width: 300 });

  gui.add(params, "format", formats).onChange(setupRenderTarget);
  gui.add(params, "type", types).onChange(setupRenderTarget);
  gui.open();
}

function setupRenderTarget() {
  if (target) target.dispose();

  const format = parseFloat(params.format);
  const type = parseFloat(params.type);

  target = new WebGLRenderTarget(window.innerWidth, window.innerHeight);
  target.texture.format = RGBFormat;
  target.texture.minFilter = NearestFilter;
  target.texture.magFilter = NearestFilter;
  target.texture.generateMipmaps = false;
  target.stencilBuffer = format === DepthStencilFormat ? true : false;
  target.depthBuffer = true;
  target.depthTexture = new DepthTexture();
  target.depthTexture.format = format;
  target.depthTexture.type = type;
}

function setupPost() {
  // Setup post processing stage
  postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postMaterial = new ShaderMaterial({
    vertexShader: document.querySelector("#post-vert").textContent.trim(),
    fragmentShader: document.querySelector("#post-frag").textContent.trim(),
    uniforms: {
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      tDiffuse: { value: null },
      tDepth: { value: null },
    },
  });
  const postPlane = new PlaneGeometry(2, 2);
  const postQuad = new Mesh(postPlane, postMaterial);
  postScene = new Scene();
  postScene.add(postQuad);
}

function setupScene() {
  scene = new Scene();

  const geometry = new TorusKnotGeometry(1, 0.3, 128, 64);
  const material = new MeshBasicMaterial({ color: "blue" });

  const count = 50;
  const scale = 5;

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 2.0 * Math.PI;
    const z = Math.random() * 2.0 - 1.0;
    const zScale = Math.sqrt(1.0 - z * z) * scale;

    const mesh = new Mesh(geometry, material);
    mesh.position.set(Math.cos(r) * zScale, Math.sin(r) * zScale, z * scale);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(mesh);
  }
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const dpr = renderer.getPixelRatio();
  target.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if (!supportsExtension) return;

  requestAnimationFrame(animate);

  // render scene into target
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);

  // render post FX
  postMaterial.uniforms.tDiffuse.value = target.texture;
  postMaterial.uniforms.tDepth.value = target.depthTexture;

  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);

  controls.update(); // required because damping is enabled

  stats.update();
}
