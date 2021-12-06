import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  TextureLoader,
  RepeatWrapping,
  BoxGeometry,
  Vector2,
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

import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPU from "three/examples/jsm/renderers/webgpu/WebGPU.js";

import * as Nodes from "three/examples/jsm/renderers/nodes/Nodes.js";

let camera, scene, renderer;

let box;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw "No WebGPU support";
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
  const texture = textureLoader.load(
    "three/examples/textures/uv_grid_opengl.jpg"
  );
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.name = "uv_grid";

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
  const materialBox = new Nodes.MeshBasicNodeMaterial();

  const timerNode = new Nodes.TimerNode();

  // birection speed
  const timerScaleNode = new Nodes.OperatorNode(
    "*",
    timerNode,
    new Nodes.Vector2Node(new Vector2(-0.5, 0.1)).setConst(true)
  );
  const animateUV = new Nodes.OperatorNode(
    "+",
    new Nodes.UVNode(),
    timerScaleNode
  );

  const textureNode = new Nodes.TextureNode(texture, animateUV);

  materialBox.colorNode = new Nodes.MathNode(
    "mix",
    textureNode,
    new Nodes.CheckerNode(animateUV),
    new Nodes.FloatNode(0.5)
  );

  // test uv 2
  //geometryBox.setAttribute( 'uv2', geometryBox.getAttribute( 'uv' ) );
  //materialBox.colorNode = new TextureNode( texture, new UVNode( 1 ) );

  box = new Mesh(geometryBox, materialBox);
  box.position.set(0, 1, 0);
  scene.add(box);

  // displace example

  const geometrySphere = new SphereGeometry(0.5, 64, 64);
  const materialSphere = new Nodes.MeshBasicNodeMaterial();

  const displaceAnimated = new Nodes.SplitNode(
    new Nodes.TextureNode(textureDisplace),
    "x"
  );
  const displaceY = new Nodes.OperatorNode(
    "*",
    displaceAnimated,
    new Nodes.FloatNode(0.25).setConst(true)
  );

  const displace = new Nodes.OperatorNode(
    "*",
    new Nodes.NormalNode(Nodes.NormalNode.LOCAL),
    displaceY
  );

  materialSphere.colorNode = displaceY;
  materialSphere.positionNode = new Nodes.OperatorNode(
    "+",
    new Nodes.PositionNode(Nodes.PositionNode.LOCAL),
    displace
  );

  const sphere = new Mesh(geometrySphere, materialSphere);
  sphere.position.set(-2, -1, 0);
  scene.add(sphere);

  // data texture

  const geometryPlane = new PlaneGeometry();
  const materialPlane = new Nodes.MeshBasicNodeMaterial();
  materialPlane.colorNode = new Nodes.OperatorNode(
    "+",
    new Nodes.TextureNode(createDataTexture()),
    new Nodes.ColorNode(new Color(0x0000ff))
  );
  materialPlane.opacityNode = new Nodes.SplitNode(
    new Nodes.TextureNode(dxt5Texture),
    "a"
  );
  materialPlane.transparent = true;

  const plane = new Mesh(geometryPlane, materialPlane);
  plane.position.set(0, -1, 0);
  scene.add(plane);

  // compressed texture

  const materialCompressed = new Nodes.MeshBasicNodeMaterial();
  materialCompressed.colorNode = new Nodes.TextureNode(dxt5Texture);
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
  const materialPoints = new Nodes.PointsNodeMaterial();

  materialPoints.colorNode = new Nodes.OperatorNode(
    "*",
    new Nodes.PositionNode(),
    new Nodes.FloatNode(3).setConst(true)
  );

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

  const materialLine = new Nodes.LineBasicNodeMaterial();
  materialLine.colorNode = new Nodes.AttributeNode("color", "vec3");

  const line = new Line(geometryLine, materialLine);
  line.position.set(2, 1, 0);
  scene.add(line);

  //

  renderer = new WebGPURenderer({
    requiredFeatures: ["texture-compression-bc"],
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

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

  const texture = DataTexture(data, width, height, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function error(error) {
  console.error(error);
}
