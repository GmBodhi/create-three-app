import "./style.css"; // For webpack support

import {
  Vector2,
  OrthographicCamera,
  Scene,
  Color,
  DirectionalLight,
  BoxGeometry,
  Mesh,
  MeshLambertMaterial,
  Raycaster,
  WebGLRenderer,
  MathUtils,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let stats;
let camera, scene, raycaster, renderer;

let theta = 0;
let INTERSECTED;

const pointer = new Vector2();
const radius = 25;
const frustumSize = 50;

init();

function init() {
  const aspect = window.innerWidth / window.innerHeight;
  camera = new OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  );

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new BoxGeometry();

  for (let i = 0; i < 2000; i++) {
    const object = new Mesh(
      geometry,
      new MeshLambertMaterial({ color: Math.random() * 0xffffff })
    );

    object.position.x = Math.random() * 40 - 20;
    object.position.y = Math.random() * 40 - 20;
    object.position.z = Math.random() * 40 - 20;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    scene.add(object);
  }

  raycaster = new Raycaster();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  document.addEventListener("pointermove", onPointerMove);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;

  camera.left = (-frustumSize * aspect) / 2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

//

function animate() {
  render();
  stats.update();
}

function render() {
  theta += 0.1;

  camera.position.x = radius * Math.sin(MathUtils.degToRad(theta));
  camera.position.y = radius * Math.sin(MathUtils.degToRad(theta));
  camera.position.z = radius * Math.cos(MathUtils.degToRad(theta));
  camera.lookAt(scene.position);

  camera.updateMatrixWorld();

  // find intersections

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(scene.children, false);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].object) {
      if (INTERSECTED)
        INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

      INTERSECTED = intersects[0].object;
      INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
      INTERSECTED.material.emissive.setHex(0xff0000);
    }
  } else {
    if (INTERSECTED)
      INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

    INTERSECTED = null;
  }

  renderer.render(scene, camera);
}
