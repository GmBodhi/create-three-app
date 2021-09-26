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
} from "three";

import { OBB } from "three/examples/jsm/math/OBB.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import Stats from "three/examples/jsm/libs/stats.module.js";

let camera, scene, renderer, clock, controls, stats, raycaster, hitbox;

const objects = [],
  mouse = new Vector2();

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 75);

  scene = new Scene();
  scene.background = new Color(0xffffff);

  clock = new Clock();

  raycaster = new Raycaster();

  const hemiLight = new HemisphereLight(0xffffff, 0x222222, 1.5);
  hemiLight.position.set(1, 1, 1);
  scene.add(hemiLight);

  const size = new Vector3(10, 5, 6);
  const geometry = new BoxGeometry(size.x, size.y, size.z);

  // setup OBB on geometry level (doing this manually for now)

  geometry.userData.obb = new OBB();
  geometry.userData.obb.halfSize.copy(size).multiplyScalar(0.5);

  for (let i = 0; i < 100; i++) {
    const object = new Mesh(
      geometry,
      new MeshLambertMaterial({ color: 0x00ff00 })
    );
    object.matrixAutoUpdate = false;

    object.position.x = Math.random() * 80 - 40;
    object.position.y = Math.random() * 80 - 40;
    object.position.z = Math.random() * 80 - 40;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    scene.add(object);

    // bounding volume on object level (this will reflect the current world transform)

    object.userData.obb = new OBB();

    objects.push(object);
  }

  //

  hitbox = new Mesh(
    geometry,
    new MeshBasicMaterial({ color: 0x000000, wireframe: true })
  );

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);

  document.addEventListener("click", onClick);
}

function onClick(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersectionPoint = new Vector3();
  const intersections = [];

  for (let i = 0, il = objects.length; i < il; i++) {
    const object = objects[i];
    const obb = object.userData.obb;

    const ray = raycaster.ray;

    if (obb.intersectRay(ray, intersectionPoint) !== null) {
      const distance = ray.origin.distanceTo(intersectionPoint);
      intersections.push({ distance: distance, object: object });
    }
  }

  if (intersections.length > 0) {
    // determine closest intersection and highlight the respective 3D object

    intersections.sort(sortIntersections);

    intersections[0].object.add(hitbox);
  } else {
    const parent = hitbox.parent;

    if (parent) parent.remove(hitbox);
  }
}

function sortIntersections(a, b) {
  return a.distance - b.distance;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // transform cubes

  const delta = clock.getDelta();

  for (let i = 0, il = objects.length; i < il; i++) {
    const object = objects[i];

    object.rotation.x += delta * Math.PI * 0.2;
    object.rotation.y += delta * Math.PI * 0.1;

    object.updateMatrix();
    object.updateMatrixWorld();

    // update OBB

    object.userData.obb.copy(object.geometry.userData.obb);
    object.userData.obb.applyMatrix4(object.matrixWorld);

    // reset

    object.material.color.setHex(0x00ff00);
  }

  // collision detection

  for (let i = 0, il = objects.length; i < il; i++) {
    const object = objects[i];
    const obb = object.userData.obb;

    for (let j = i + 1, jl = objects.length; j < jl; j++) {
      const objectToTest = objects[j];
      const obbToTest = objectToTest.userData.obb;

      // now perform intersection test

      if (obb.intersectsOBB(obbToTest) === true) {
        object.material.color.setHex(0xff0000);
        objectToTest.material.color.setHex(0xff0000);
      }
    }
  }

  renderer.render(scene, camera);

  stats.update();
}
