import "./style.css"; // For webpack support

import {
  Clock,
  WebGLRenderer,
  Scene,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  PointsMaterial,
  Points,
  PerspectiveCamera,
  Vector3,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scenes = [];

const clock = new Clock();

let views, t, canvas, renderer;

window.onload = init;

function init() {
  const balls = 20;
  const size = 0.25;

  const colors = [
    "rgb(0,127,255)",
    "rgb(255,0,0)",
    "rgb(0,255,0)",
    "rgb(0,255,255)",
    "rgb(255,0,255)",
    "rgb(255,0,127)",
    "rgb(255,255,0)",
    "rgb(0,255,127)",
  ];

  canvas = document.getElementById("c");

  renderer = new WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  views = document.querySelectorAll(".view");

  for (let n = 0; n < views.length; n++) {
    const scene = new Scene();
    scene.background = new Color(0xffffff);

    const geometry0 = new BufferGeometry();
    const geometry1 = new BufferGeometry();

    const vertices = [];

    if (views[n].lattice) {
      const range = balls / 2;
      for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
          for (let k = -range; k <= range; k++) {
            vertices.push(i, j, k);
          }
        }
      }
    } else {
      for (let m = 0; m < Math.pow(balls, 3); m++) {
        const i = balls * Math.random() - balls / 2;
        const j = balls * Math.random() - balls / 2;
        const k = balls * Math.random() - balls / 2;

        vertices.push(i, j, k);
      }
    }

    geometry0.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry1.setAttribute(
      "position",
      new Float32BufferAttribute(vertices.slice(), 3)
    );

    const index = Math.floor(colors.length * Math.random());

    const canvas2 = document.createElement("canvas");
    canvas2.width = 128;
    canvas2.height = 128;
    const context = canvas2.getContext("2d");
    context.arc(64, 64, 64, 0, 2 * Math.PI);
    context.fillStyle = colors[index];
    context.fill();
    const texture = new CanvasTexture(canvas2);

    const material = new PointsMaterial({
      size: size,
      map: texture,
      transparent: true,
      alphaTest: 0.1,
    });

    scene.add(new Points(geometry0, material));

    scene.userData.view = views[n];
    scene.userData.geometry1 = geometry1;

    const camera = new PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.set(0, 0, 1.2 * balls);
    scene.userData.camera = camera;

    const controls = new OrbitControls(camera, views[n]);
    scene.userData.controls = controls;

    scenes.push(scene);
  }

  t = 0;
  animate();
}

function updateSize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height != height) {
    renderer.setSize(width, height, false);
  }
}

function animate() {
  render();
  requestAnimationFrame(animate);
}

function render() {
  updateSize();

  renderer.setClearColor(0xffffff);
  renderer.setScissorTest(false);
  renderer.clear();

  renderer.setClearColor(0x000000);
  renderer.setScissorTest(true);

  scenes.forEach(function (scene) {
    const rect = scene.userData.view.getBoundingClientRect();

    // check if it's offscreen. If so skip it

    if (
      rect.bottom < 0 ||
      rect.top > renderer.domElement.clientHeight ||
      rect.right < 0 ||
      rect.left > renderer.domElement.clientWidth
    ) {
      return; // it's off screen
    }

    // set the viewport

    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const left = rect.left;
    const bottom = renderer.domElement.clientHeight - rect.bottom;

    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);

    renderer.render(scene, scene.userData.camera);

    const points = scene.children[0];
    const position = points.geometry.attributes.position;

    const point = new Vector3();
    const offset = new Vector3();

    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(
        scene.userData.geometry1.attributes.position,
        i
      );

      scene.userData.view.displacement(
        point.x,
        point.y,
        point.z,
        t / 5,
        offset
      );

      position.setXYZ(
        i,
        point.x + offset.x,
        point.y + offset.y,
        point.z + offset.z
      );
    }

    position.needsUpdate = true;
  });

  t += clock.getDelta() * 60;
}
