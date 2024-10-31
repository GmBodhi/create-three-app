import "./style.css"; // For webpack support

import {
  RectAreaLightNode,
  Scene,
  PerspectiveCamera,
  WebGLCubeRenderTarget,
  HalfFloatType,
  LinearMipmapLinearFilter,
  LinearFilter,
  CubeReflectionMapping,
  CubeCamera,
  TextureLoader,
  RepeatWrapping,
  MeshStandardNodeMaterial,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
  RectAreaLight,
  WebGPURenderer,
} from "three";
import {
  bumpMap,
  float,
  getParallaxCorrectNormal,
  pmremTexture,
  reflectVector,
  texture,
  uniform,
  vec3,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { RectAreaLightTexturesLib } from "three/addons/lights/RectAreaLightTexturesLib.js";

let camera, scene, renderer;

let controls, cubeCamera;

let groundPlane, wallMat;

init();

function init() {
  RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

  // scene

  scene = new Scene();

  // camera

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 200, -200);

  // cube camera for environment map

  const renderTarget = new WebGLCubeRenderTarget(512);
  renderTarget.texture.type = HalfFloatType;
  renderTarget.texture.minFilter = LinearMipmapLinearFilter;
  renderTarget.texture.magFilter = LinearFilter;
  renderTarget.texture.generateMipmaps = true;
  renderTarget.texture.mapping = CubeReflectionMapping;

  cubeCamera = new CubeCamera(1, 1000, renderTarget);
  cubeCamera.position.set(0, -100, 0);

  // ground floor ( with box projected environment mapping )

  const loader = new TextureLoader();
  const rMap = loader.load("textures/lava/lavatile.jpg");
  rMap.wrapS = RepeatWrapping;
  rMap.wrapT = RepeatWrapping;
  rMap.repeat.set(2, 1);

  const roughnessUniform = uniform(0.25);

  const defaultMat = new MeshStandardNodeMaterial();
  defaultMat.envNode = pmremTexture(renderTarget.texture);
  defaultMat.roughnessNode = texture(rMap).mul(roughnessUniform);
  defaultMat.metalnessNode = float(1);

  const boxProjectedMat = new MeshStandardNodeMaterial();
  boxProjectedMat.envNode = pmremTexture(
    renderTarget.texture,
    getParallaxCorrectNormal(
      reflectVector,
      vec3(200, 100, 100),
      vec3(0, -50, 0)
    )
  );
  boxProjectedMat.roughnessNode = texture(rMap).mul(roughnessUniform);
  boxProjectedMat.metalnessNode = float(1);

  groundPlane = new Mesh(new PlaneGeometry(200, 100, 100), boxProjectedMat);
  groundPlane.rotateX(-Math.PI / 2);
  groundPlane.position.set(0, -49, 0);
  scene.add(groundPlane);

  // walls

  const diffuseTex = loader.load("textures/brick_diffuse.jpg");
  diffuseTex.colorSpace = SRGBColorSpace;
  const bumpTex = loader.load("textures/brick_bump.jpg");

  wallMat = new MeshStandardNodeMaterial();

  wallMat.colorNode = texture(diffuseTex);
  wallMat.normalNode = bumpMap(texture(bumpTex), float(5));

  const planeGeo = new PlaneGeometry(100, 100);

  const planeBack1 = new Mesh(planeGeo, wallMat);
  planeBack1.position.z = -50;
  planeBack1.position.x = -50;
  scene.add(planeBack1);

  const planeBack2 = new Mesh(planeGeo, wallMat);
  planeBack2.position.z = -50;
  planeBack2.position.x = 50;
  scene.add(planeBack2);

  const planeFront1 = new Mesh(planeGeo, wallMat);
  planeFront1.position.z = 50;
  planeFront1.position.x = -50;
  planeFront1.rotateY(Math.PI);
  scene.add(planeFront1);

  const planeFront2 = new Mesh(planeGeo, wallMat);
  planeFront2.position.z = 50;
  planeFront2.position.x = 50;
  planeFront2.rotateY(Math.PI);
  scene.add(planeFront2);

  const planeRight = new Mesh(planeGeo, wallMat);
  planeRight.position.x = 100;
  planeRight.rotateY(-Math.PI / 2);
  scene.add(planeRight);

  const planeLeft = new Mesh(planeGeo, wallMat);
  planeLeft.position.x = -100;
  planeLeft.rotateY(Math.PI / 2);
  scene.add(planeLeft);

  // area lights

  const width = 50;
  const height = 50;
  const intensity = 5;

  const blueRectLight = new RectAreaLight(0x9aaeff, intensity, width, height);
  blueRectLight.position.set(-99, 5, 0);
  blueRectLight.lookAt(0, 5, 0);
  scene.add(blueRectLight);

  const blueRectLightHelper = new RectAreaLightHelper(blueRectLight, 0xffffff);
  blueRectLight.add(blueRectLightHelper);

  const redRectLight = new RectAreaLight(0xf3aaaa, intensity, width, height);
  redRectLight.position.set(99, 5, 0);
  redRectLight.lookAt(0, 5, 0);
  scene.add(redRectLight);

  const redRectLightHelper = new RectAreaLightHelper(redRectLight, 0xffffff);
  redRectLight.add(redRectLightHelper);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -10, 0);
  controls.maxDistance = 400;
  controls.minDistance = 10;
  controls.update();

  // gui

  const gui = new GUI();
  const params = {
    "box projected": true,
  };
  gui.add(params, "box projected").onChange((value) => {
    groundPlane.material = value ? boxProjectedMat : defaultMat;
  });
  gui.add(roughnessUniform, "value", 0, 1).name("roughness");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCubeMap() {
  groundPlane.visible = false;

  cubeCamera.position.copy(groundPlane.position);

  cubeCamera.update(renderer, scene);

  groundPlane.visible = true;
}

function animate() {
  updateCubeMap();

  renderer.render(scene, camera);
}
