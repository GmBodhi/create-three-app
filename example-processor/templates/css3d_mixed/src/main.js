import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  Color,
  EdgesGeometry,
  BoxGeometry,
  LineBasicMaterial,
  LineSegments,
  HemisphereLight,
  PlaneGeometry,
  MeshBasicMaterial,
  NoBlending,
  Mesh,
  Raycaster,
  Vector2,
  Group,
  MeshStandardMaterial,
  Shape,
  Path,
  ExtrudeGeometry,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/addons/renderers/CSS3DRenderer.js";

let camera, scene, rendererCSS3D, rendererWebGL;
let controls;

init();

function init() {
  rendererCSS3D = new CSS3DRenderer();
  rendererCSS3D.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(rendererCSS3D.domElement);

  rendererWebGL = new WebGLRenderer({ antialias: true, alpha: true });
  rendererWebGL.domElement.style.position = "absolute";
  rendererWebGL.domElement.style.top = "0";
  rendererWebGL.setPixelRatio(window.devicePixelRatio);
  rendererWebGL.setSize(window.innerWidth, window.innerHeight);
  rendererWebGL.toneMapping = NeutralToneMapping;
  rendererWebGL.setAnimationLoop(animate);
  document.body.appendChild(rendererWebGL.domElement);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(-1000, 500, 1500);

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  // Add room
  const roomGeometry = new EdgesGeometry(
    new BoxGeometry(4000, 2000, 4000, 10, 5, 10)
  );
  const roomMaterial = new LineBasicMaterial({
    color: 0x000000,
    opacity: 0.2,
    transparent: true,
  });
  const room = new LineSegments(roomGeometry, roomMaterial);
  scene.add(room);

  // Add light
  const hemisphereLight = new HemisphereLight(0xffffff, 0x444444, 4);
  hemisphereLight.position.set(-25, 100, 50);
  scene.add(hemisphereLight);

  // Add cutout mesh
  const geometry = new PlaneGeometry(1024, 768);
  const material = new MeshBasicMaterial({
    color: 0xff0000,
    blending: NoBlending,
    opacity: 0,
    premultipliedAlpha: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "cutout";
  scene.add(mesh);

  // Add frame
  const frame = buildFrame(1024, 768, 50);
  scene.add(frame);

  // Add CSS3D element
  const iframe = document.createElement("iframe");
  iframe.style.width = "1028px";
  iframe.style.height = "768px";
  iframe.style.border = "0px";
  iframe.src = "https://threejs.org/examples/#webgl_animation_keyframes";
  scene.add(new CSS3DObject(iframe));

  // Add controls
  controls = new OrbitControls(camera);
  controls.connect(rendererWebGL.domElement);
  controls.enableDamping = true;

  // Track OrbitControls state
  let isDragging = false;
  controls.addEventListener("start", () => (isDragging = true));
  controls.addEventListener("end", () => (isDragging = false));

  // raycast to find CSS3DObject
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  document.addEventListener("pointermove", (event) => {
    // Skip raycasting when dragging
    if (isDragging) return;

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    rendererWebGL.domElement.style.pointerEvents = "";

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (object.name === "cutout") {
        rendererWebGL.domElement.style.pointerEvents = "none";
      }
    }
  });

  window.addEventListener("resize", onWindowResize);
}

function buildFrame(width, height, thickness) {
  const group = new Group();
  const material = new MeshStandardMaterial({ color: 0x2200ff });

  // Create the frame border
  const outerShape = new Shape();
  outerShape.moveTo(-(width / 2 + thickness), -(height / 2 + thickness));
  outerShape.lineTo(width / 2 + thickness, -(height / 2 + thickness));
  outerShape.lineTo(width / 2 + thickness, height / 2 + thickness);
  outerShape.lineTo(-(width / 2 + thickness), height / 2 + thickness);
  outerShape.lineTo(-(width / 2 + thickness), -(height / 2 + thickness));

  // Create inner rectangle (hole)
  const innerHole = new Path();
  innerHole.moveTo(-width / 2, -height / 2);
  innerHole.lineTo(width / 2, -height / 2);
  innerHole.lineTo(width / 2, height / 2);
  innerHole.lineTo(-width / 2, height / 2);
  innerHole.lineTo(-width / 2, -height / 2);

  outerShape.holes.push(innerHole);

  const frameGeometry = new ExtrudeGeometry(outerShape, {
    depth: thickness,
    bevelEnabled: false,
  });

  const frameMesh = new Mesh(frameGeometry, material);
  frameMesh.position.z = -thickness / 2;
  group.add(frameMesh);

  // Add back plane
  const backGeometry = new PlaneGeometry(
    width + thickness * 2,
    height + thickness * 2
  );
  const backMesh = new Mesh(backGeometry, material);
  backMesh.position.set(0, 0, -thickness / 2);
  backMesh.rotation.y = Math.PI;
  group.add(backMesh);

  return group;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  rendererWebGL.setSize(window.innerWidth, window.innerHeight);
  rendererCSS3D.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  rendererWebGL.render(scene, camera);
  rendererCSS3D.render(scene, camera);
}
