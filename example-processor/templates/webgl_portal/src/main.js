//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  PlaneGeometry,
  Plane,
  Vector3,
  IcosahedronGeometry,
  MeshPhongMaterial,
  Mesh,
  CameraHelper,
  WebGLRenderTarget,
  LinearFilter,
  RGBFormat,
  MeshBasicMaterial,
  PointLight,
} from "three";

import * as CameraUtils from "three/examples/jsm/utils/CameraUtils.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;

let cameraControls;

let smallSphereOne, smallSphereTwo;

let portalCamera,
  leftPortal,
  rightPortal,
  leftPortalTexture,
  reflectedPosition,
  rightPortalTexture,
  bottomLeftCorner,
  bottomRightCorner,
  topLeftCorner;

init();
animate();

function init() {
  const container = document.getElementById("container");

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.localClippingEnabled = true;

  // scene
  scene = new Scene();

  // camera
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0, 75, 160);

  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 40, 0);
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.update();

  //

  const planeGeo = new PlaneGeometry(100.1, 100.1);

  // bouncing icosphere
  const portalPlane = new Plane(new Vector3(0, 0, 1), 0.0);
  const geometry = new IcosahedronGeometry(5, 0);
  const material = new MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x333333,
    flatShading: true,
    clippingPlanes: [portalPlane],
    clipShadows: true,
  });
  smallSphereOne = new Mesh(geometry, material);
  scene.add(smallSphereOne);
  smallSphereTwo = new Mesh(geometry, material);
  scene.add(smallSphereTwo);

  // portals
  portalCamera = new PerspectiveCamera(45, 1.0, 0.1, 500.0);
  scene.add(portalCamera);
  //frustumHelper = new CameraHelper( portalCamera );
  //scene.add( frustumHelper );
  bottomLeftCorner = new Vector3();
  bottomRightCorner = new Vector3();
  topLeftCorner = new Vector3();
  reflectedPosition = new Vector3();

  leftPortalTexture = new WebGLRenderTarget(256, 256, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBFormat,
  });
  leftPortal = new Mesh(
    planeGeo,
    new MeshBasicMaterial({ map: leftPortalTexture.texture })
  );
  leftPortal.position.x = -30;
  leftPortal.position.y = 20;
  leftPortal.scale.set(0.35, 0.35, 0.35);
  scene.add(leftPortal);

  rightPortalTexture = new WebGLRenderTarget(256, 256, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBFormat,
  });
  rightPortal = new Mesh(
    planeGeo,
    new MeshBasicMaterial({ map: rightPortalTexture.texture })
  );
  rightPortal.position.x = 30;
  rightPortal.position.y = 20;
  rightPortal.scale.set(0.35, 0.35, 0.35);
  scene.add(rightPortal);

  // walls
  const planeTop = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xffffff })
  );
  planeTop.position.y = 100;
  planeTop.rotateX(Math.PI / 2);
  scene.add(planeTop);

  const planeBottom = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xffffff })
  );
  planeBottom.rotateX(-Math.PI / 2);
  scene.add(planeBottom);

  const planeFront = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0x7f7fff })
  );
  planeFront.position.z = 50;
  planeFront.position.y = 50;
  planeFront.rotateY(Math.PI);
  scene.add(planeFront);

  const planeBack = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xff7fff })
  );
  planeBack.position.z = -50;
  planeBack.position.y = 50;
  //planeBack.rotateY( Math.PI );
  scene.add(planeBack);

  const planeRight = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0x00ff00 })
  );
  planeRight.position.x = 50;
  planeRight.position.y = 50;
  planeRight.rotateY(-Math.PI / 2);
  scene.add(planeRight);

  const planeLeft = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xff0000 })
  );
  planeLeft.position.x = -50;
  planeLeft.position.y = 50;
  planeLeft.rotateY(Math.PI / 2);
  scene.add(planeLeft);

  // lights
  const mainLight = new PointLight(0xcccccc, 1.5, 250);
  mainLight.position.y = 60;
  scene.add(mainLight);

  const greenLight = new PointLight(0x00ff00, 0.25, 1000);
  greenLight.position.set(550, 50, 0);
  scene.add(greenLight);

  const redLight = new PointLight(0xff0000, 0.25, 1000);
  redLight.position.set(-550, 50, 0);
  scene.add(redLight);

  const blueLight = new PointLight(0x7f7fff, 0.25, 1000);
  blueLight.position.set(0, 50, 550);
  scene.add(blueLight);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderPortal(thisPortalMesh, otherPortalMesh, thisPortalTexture) {
  // set the portal camera position to be reflected about the portal plane
  thisPortalMesh.worldToLocal(reflectedPosition.copy(camera.position));
  reflectedPosition.x *= -1.0;
  reflectedPosition.z *= -1.0;
  otherPortalMesh.localToWorld(reflectedPosition);
  portalCamera.position.copy(reflectedPosition);

  // grab the corners of the other portal
  // - note: the portal is viewed backwards; flip the left/right coordinates
  otherPortalMesh.localToWorld(bottomLeftCorner.set(50.05, -50.05, 0.0));
  otherPortalMesh.localToWorld(bottomRightCorner.set(-50.05, -50.05, 0.0));
  otherPortalMesh.localToWorld(topLeftCorner.set(50.05, 50.05, 0.0));
  // set the projection matrix to encompass the portal's frame
  CameraUtils.frameCorners(
    portalCamera,
    bottomLeftCorner,
    bottomRightCorner,
    topLeftCorner,
    false
  );

  // render the portal
  thisPortalTexture.texture.encoding = renderer.outputEncoding;
  renderer.setRenderTarget(thisPortalTexture);
  renderer.state.buffers.depth.setMask(true); // make sure the depth buffer is writable so it can be properly cleared, see #18897
  if (renderer.autoClear === false) renderer.clear();
  thisPortalMesh.visible = false; // hide this portal from its own rendering
  renderer.render(scene, portalCamera);
  thisPortalMesh.visible = true; // re-enable this portal's visibility for general rendering
}

function animate() {
  requestAnimationFrame(animate);

  // move the bouncing sphere(s)
  const timerOne = Date.now() * 0.01;
  const timerTwo = timerOne + Math.PI * 10.0;

  smallSphereOne.position.set(
    Math.cos(timerOne * 0.1) * 30,
    Math.abs(Math.cos(timerOne * 0.2)) * 20 + 5,
    Math.sin(timerOne * 0.1) * 30
  );
  smallSphereOne.rotation.y = Math.PI / 2 - timerOne * 0.1;
  smallSphereOne.rotation.z = timerOne * 0.8;

  smallSphereTwo.position.set(
    Math.cos(timerTwo * 0.1) * 30,
    Math.abs(Math.cos(timerTwo * 0.2)) * 20 + 5,
    Math.sin(timerTwo * 0.1) * 30
  );
  smallSphereTwo.rotation.y = Math.PI / 2 - timerTwo * 0.1;
  smallSphereTwo.rotation.z = timerTwo * 0.8;

  // save the original camera properties
  const currentRenderTarget = renderer.getRenderTarget();
  const currentXrEnabled = renderer.xr.enabled;
  const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
  renderer.xr.enabled = false; // Avoid camera modification
  renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

  // render the portal effect
  renderPortal(leftPortal, rightPortal, leftPortalTexture);
  renderPortal(rightPortal, leftPortal, rightPortalTexture);

  // restore the original rendering properties
  renderer.xr.enabled = currentXrEnabled;
  renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
  renderer.setRenderTarget(currentRenderTarget);

  // render the main scene
  renderer.render(scene, camera);
}
