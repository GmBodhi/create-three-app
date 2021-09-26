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
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  ImageLoader,
  RGBAFormat,
  FloatType,
  TorusGeometry,
  UniformsLib,
  ShaderChunk,
  WebGLCubeRenderTarget,
  LinearMipmapLinearFilter,
  CubeCamera,
  PCFSoftShadowMap,
  BasicShadowMap,
  NoToneMapping,
  LinearToneMapping,
  CineonToneMapping,
  CustomToneMapping,
  TetrahedronGeometry,
  PlaneBufferGeometry,
  LoadingManager,
  Layers,
  Matrix3,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

class GIMesh extends Mesh {
  copy(source) {
    super.copy(source);

    this.geometry = source.geometry.clone();

    return this;
  }
}

//

const SimpleGI = function (renderer, scene) {
  const SIZE = 32,
    SIZE2 = SIZE * SIZE;

  const camera = new PerspectiveCamera(90, 1, 0.01, 100);

  scene.updateMatrixWorld(true);

  let clone = scene.clone();
  clone.autoUpdate = false;

  const rt = new WebGLRenderTarget(SIZE, SIZE);

  const normalMatrix = new Matrix3();

  const position = new Vector3();
  const normal = new Vector3();

  let bounces = 0;
  let currentVertex = 0;

  const color = new Float32Array(3);
  const buffer = new Uint8Array(SIZE2 * 4);

  function compute() {
    if (bounces === 3) return;

    const object = scene.children[0]; // torusKnot
    const geometry = object.geometry;

    const attributes = geometry.attributes;
    const positions = attributes.position.array;
    const normals = attributes.normal.array;

    if (attributes.color === undefined) {
      const colors = new Float32Array(positions.length);
      geometry.setAttribute(
        "color",
        new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage)
      );
    }

    const colors = attributes.color.array;

    const startVertex = currentVertex;
    const totalVertex = positions.length / 3;

    for (let i = 0; i < 32; i++) {
      if (currentVertex >= totalVertex) break;

      position.fromArray(positions, currentVertex * 3);
      position.applyMatrix4(object.matrixWorld);

      normal.fromArray(normals, currentVertex * 3);
      normal
        .applyMatrix3(normalMatrix.getNormalMatrix(object.matrixWorld))
        .normalize();

      camera.position.copy(position);
      camera.lookAt(position.add(normal));

      renderer.setRenderTarget(rt);
      renderer.render(clone, camera);

      renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buffer);

      color[0] = 0;
      color[1] = 0;
      color[2] = 0;

      for (let k = 0, kl = buffer.length; k < kl; k += 4) {
        color[0] += buffer[k + 0];
        color[1] += buffer[k + 1];
        color[2] += buffer[k + 2];
      }

      colors[currentVertex * 3 + 0] = color[0] / (SIZE2 * 255);
      colors[currentVertex * 3 + 1] = color[1] / (SIZE2 * 255);
      colors[currentVertex * 3 + 2] = color[2] / (SIZE2 * 255);

      currentVertex++;
    }

    attributes.color.updateRange.offset = startVertex * 3;
    attributes.color.updateRange.count = (currentVertex - startVertex) * 3;
    attributes.color.needsUpdate = true;

    if (currentVertex >= totalVertex) {
      clone = scene.clone();
      clone.autoUpdate = false;

      bounces++;
      currentVertex = 0;
    }

    requestAnimationFrame(compute);
  }

  requestAnimationFrame(compute);
};

//

let camera, scene, renderer;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 4;

  scene = new Scene();

  // torus knot

  const torusGeometry = new TorusKnotGeometry(0.75, 0.3, 128, 32, 1);
  const material = new MeshBasicMaterial({ vertexColors: true });

  const torusKnot = new GIMesh(torusGeometry, material);
  scene.add(torusKnot);

  // room

  const materials = [];

  for (let i = 0; i < 8; i++) {
    materials.push(
      new MeshBasicMaterial({ color: Math.random() * 0xffffff, side: BackSide })
    );
  }

  const boxGeometry = new BoxGeometry(3, 3, 3);

  const box = new Mesh(boxGeometry, materials);
  scene.add(box);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new SimpleGI(renderer, scene);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 10;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
