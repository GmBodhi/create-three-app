import "./style.css"; // For webpack support

import {
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
  RepeatWrapping,
  sRGBEncoding,
  PlaneGeometry,
  BoxGeometry,
  WebGLRenderer,
  SpotLight,
  Plane,
  MeshPhongMaterial,
  TorusKnotGeometry,
  Matrix4,
  Group,
  MeshBasicMaterial,
  HemisphereLight,
  CameraHelper,
  PlaneHelper,
  AlwaysStencilFunc,
  BackSide,
  IncrementWrapStencilOp,
  FrontSide,
  DecrementWrapStencilOp,
  Clock,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShadowMaterial,
  Vector2,
  Euler,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Raycaster,
  MeshNormalMaterial,
  DepthFormat,
  UnsignedShortType,
  DepthStencilFormat,
  UnsignedIntType,
  UnsignedInt248Type,
  WebGLRenderTarget,
  RGBFormat,
  NearestFilter,
  DepthTexture,
  OrthographicCamera,
  ShaderMaterial,
  Float32BufferAttribute,
  BufferAttribute,
  DynamicDrawUsage,
  DataTexture,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  PointLight,
  BufferGeometryLoader,
  Vector4,
  MathUtils,
  GridHelper,
  CatmullRomCurve3,
  FogExp2,
  ClampToEdgeWrapping,
  Cache,
  FontLoader,
  TextGeometry,
  ShapeGeometry,
  Object3D,
  PointLightHelper,
  PolarGridHelper,
  BoxHelper,
  WireframeGeometry,
  LineSegments,
  EdgesGeometry,
  Quaternion,
  InstancedMesh,
  Points,
  PointsMaterial,
  HemisphereLightHelper,
  DirectionalLightHelper,
  AnimationMixer,
  LineDashedMaterial,
  Font,
  IcosahedronGeometry,
  ACESFilmicToneMapping,
  PMREMGenerator,
  Box3,
  LOD,
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor,
  SrcAlphaSaturateFactor,
  CustomBlending,
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
  MeshDepthMaterial,
  BasicDepthPacking,
  RGBADepthPacking,
  CubeTextureLoader,
  LinearMipMapLinearFilter,
  LinearFilter,
  DefaultLoadingManager,
  UnsignedByteType,
  RGBM16Encoding,
  ObjectLoader,
  MeshPhysicalMaterial,
  EquirectangularReflectionMapping,
  ReinhardToneMapping,
  Texture,
  UVMapping,
  NearestMipmapNearestFilter,
  UniformsUtils,
  Spherical,
  ConeGeometry,
} from "three";

let camera, scene, renderer, mesh, target;

const spherical = new Spherical();
const rotationMatrix = new Matrix4();
const targetQuaternion = new Quaternion();
const clock = new Clock();
const speed = 2;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.z = 5;

  scene = new Scene();

  const geometry = new ConeGeometry(0.1, 0.5, 8);
  geometry.rotateX(Math.PI * 0.5);
  const material = new MeshNormalMaterial();

  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  const targetGeometry = new SphereGeometry(0.05);
  const targetMaterial = new MeshBasicMaterial({ color: 0xff0000 });
  target = new Mesh(targetGeometry, targetMaterial);
  scene.add(target);

  //

  const sphereGeometry = new SphereGeometry(2, 32, 32);
  const sphereMaterial = new MeshBasicMaterial({
    color: 0xcccccc,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const sphere = new Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);

  //

  generateTarget();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (!mesh.quaternion.equals(targetQuaternion)) {
    const step = speed * delta;
    mesh.quaternion.rotateTowards(targetQuaternion, step);
  }

  renderer.render(scene, camera);
}

function generateTarget() {
  // generate a random point on a sphere

  spherical.theta = Math.random() * Math.PI * 2;
  spherical.phi = Math.acos(2 * Math.random() - 1);
  spherical.radius = 2;

  target.position.setFromSpherical(spherical);

  // compute target rotation

  rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
  targetQuaternion.setFromRotationMatrix(rotationMatrix);

  setTimeout(generateTarget, 2000);
}
