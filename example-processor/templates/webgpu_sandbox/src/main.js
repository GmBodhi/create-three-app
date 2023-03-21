import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  TextureLoader,
  RepeatWrapping,
  BoxGeometry,
  Mesh,
  SphereGeometry,
  PlaneGeometry,
  Vector3,
  BufferGeometry,
  Points,
  Line,
  DataTexture,
  RGBAFormat,
} from "three";
import {
  timerLocal,
  vec2,
  uv,
  texture,
  mix,
  checker,
  normalLocal,
  positionLocal,
  color,
  oscSine,
  attribute,
  MeshBasicNodeMaterial,
  PointsNodeMaterial,
  LineBasicNodeMaterial,
} from "three/nodes";

import { DDSLoader } from "three/addons/loaders/DDSLoader.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;

let box;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x222222);

  // textures

  const textureLoader = new TextureLoader();
  const uvTexture = textureLoader.load(
    "three/examples/textures/uv_grid_opengl.jpg"
  );
  uvTexture.wrapS = RepeatWrapping;
  uvTexture.wrapT = RepeatWrapping;
  uvTexture.name = "uv_grid";

  const textureDisplace = textureLoader.load(
    "three/examples/textures/transition/transition1.png"
  );
  textureDisplace.wrapS = RepeatWrapping;
  textureDisplace.wrapT = RepeatWrapping;

  // compressed texture

  const ddsLoader = new DDSLoader();
  const dxt5Texture = ddsLoader.load(
    "three/examples/textures/compressed/explosion_dxt5_mip.dds"
  );

  // box mesh

  const geometryBox = new BoxGeometry();
  const materialBox = new MeshBasicNodeMaterial();

  // birection speed
  const timerScaleNode = timerLocal().mul(vec2(-0.5, 0.1));
  const animateUV = uv().add(timerScaleNode);

  const textureNode = texture(uvTexture, animateUV);

  materialBox.colorNode = mix(textureNode, checker(animateUV), 0.5);

  // test uv 2
  //geometryBox.setAttribute( 'uv2', geometryBox.getAttribute( 'uv' ) );
  //materialBox.colorNode = texture( uvTexture, uv( 1 ) );

  box = new Mesh(geometryBox, materialBox);
  box.position.set(0, 1, 0);
  scene.add(box);

  // displace example

  const geometrySphere = new SphereGeometry(0.5, 64, 64);
  const materialSphere = new MeshBasicNodeMaterial();

  const displaceY = texture(textureDisplace).x.mul(0.25);

  const displace = normalLocal.mul(displaceY);

  materialSphere.colorNode = displaceY;
  materialSphere.positionNode = positionLocal.add(displace);

  const sphere = new Mesh(geometrySphere, materialSphere);
  sphere.position.set(-2, -1, 0);
  scene.add(sphere);

  // data texture

  const geometryPlane = new PlaneGeometry();
  const materialPlane = new MeshBasicNodeMaterial();
  materialPlane.colorNode = texture(createDataTexture()).add(color(0x0000ff));
  materialPlane.opacityNode = texture(dxt5Texture).a;
  materialPlane.transparent = true;

  const plane = new Mesh(geometryPlane, materialPlane);
  plane.position.set(0, -1, 0);
  scene.add(plane);

  // compressed texture

  const materialCompressed = new MeshBasicNodeMaterial();
  materialCompressed.colorNode = texture(dxt5Texture);
  materialCompressed.emissiveNode = oscSine().mix(
    color(0x663300),
    color(0x0000ff)
  );
  materialCompressed.alphaTestNode = oscSine();
  materialCompressed.transparent = true;

  const boxCompressed = new Mesh(geometryBox, materialCompressed);
  boxCompressed.position.set(-2, 1, 0);
  scene.add(boxCompressed);

  // points

  const points = [];

  for (let i = 0; i < 1000; i++) {
    const point = new Vector3().random().subScalar(0.5);
    points.push(point);
  }

  const geometryPoints = new BufferGeometry().setFromPoints(points);
  const materialPoints = new PointsNodeMaterial();

  materialPoints.colorNode = positionLocal.mul(3);

  const pointCloud = new Points(geometryPoints, materialPoints);
  pointCloud.position.set(2, -1, 0);
  scene.add(pointCloud);

  // lines

  const geometryLine = new BufferGeometry().setFromPoints([
    new Vector3(-0.5, -0.5, 0),
    new Vector3(0.5, -0.5, 0),
    new Vector3(0.5, 0.5, 0),
    new Vector3(-0.5, 0.5, 0),
  ]);

  geometryLine.setAttribute("color", geometryLine.getAttribute("position"));

  const materialLine = new LineBasicNodeMaterial();
  materialLine.colorNode = attribute("color");

  const line = new Line(geometryLine, materialLine);
  line.position.set(2, 1, 0);
  scene.add(line);

  //

  renderer = new WebGPURenderer({
    requiredFeatures: ["texture-compression-bc"],
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  box.rotation.x += 0.01;
  box.rotation.y += 0.02;

  renderer.render(scene, camera);
}

function createDataTexture() {
  const color = new Color(0xff0000);

  const width = 512;
  const height = 512;

  const size = width * height;
  const data = new Uint8Array(4 * size);

  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);

  for (let i = 0; i < size; i++) {
    const stride = i * 4;

    data[stride] = r;
    data[stride + 1] = g;
    data[stride + 2] = b;
    data[stride + 3] = 255;
  }

  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}
