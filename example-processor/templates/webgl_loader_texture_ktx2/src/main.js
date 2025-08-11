import "./style.css"; // For webpack support

import {
  DataTexture,
  CompressedTexture,
  WebGLRenderer,
  PlaneGeometry,
  Scene,
  PerspectiveCamera,
  Mesh,
  MeshBasicMaterial,
} from "three";

import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

let canvas, renderer;

const scenes = [];

const sections = [
  {
    title: "Uncompressed",
    description:
      "Uncompressed formats (rgba8, rgba16, rgba32) load as DataTexture objects." +
      " Lossless, easy to read/write, uncompressed on GPU, optionally compressed over the network.",
    textures: [
      { path: "2d_rgba8.ktx2" },
      { path: "2d_rgba8_linear.ktx2" },
      { path: "2d_rgba16_linear.ktx2" },
      { path: "2d_rgba32_linear.ktx2" },
      { path: "2d_rgb9e5_linear.ktx2" },
      { path: "2d_r11g11b10_linear.ktx2" },
    ],
  },
  {
    title: "Compressed",
    description:
      "Compressed formats (ASTC, BCn, ...) load as CompressedTexture objects," +
      " reducing memory cost. Requires native support on the device GPU: no single compressed" +
      " format is supported on every device.",
    textures: [
      { path: "2d_astc4x4.ktx2" },
      { path: "2d_etc1.ktx2" },
      { path: "2d_etc2.ktx2" },
      { path: "2d_bc1.ktx2" },
      { path: "2d_bc3.ktx2" },
      // { path: '2d_bc5.ktx2' },
      { path: "2d_bc7.ktx2" },
    ],
  },

  {
    title: "Universal",
    description:
      "Basis Universal textures are specialized intermediate formats supporting fast" +
      " runtime transcoding into other GPU texture compression formats. After transcoding," +
      " universal textures can be used on any device at reduced memory cost.",
    textures: [{ path: "2d_etc1s.ktx2" }, { path: "2d_uastc.ktx2" }],
  },
];

init();

async function init() {
  canvas = document.getElementById("c");

  renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0xffffff, 1);
  renderer.setPixelRatio(window.devicePixelRatio);

  const loader = new KTX2Loader()
    .setTranscoderPath("jsm/libs/basis/")
    .setPath("textures/ktx2/")
    .detectSupport(renderer);

  const geometry = flipY(new PlaneGeometry(1, 1));

  const content = document.getElementById("content");

  for (const section of sections) {
    const sectionElement = document.createElement("section");

    const sectionHeader = document.createElement("h2");
    sectionHeader.textContent = section.title;
    sectionElement.appendChild(sectionHeader);

    const sectionDescription = document.createElement("p");
    sectionDescription.className = "description";
    sectionDescription.textContent = section.description;
    sectionElement.appendChild(sectionDescription);

    for (const { path, supported } of section.textures) {
      const scene = new Scene();

      // make a list item
      const element = document.createElement("div");
      element.className = "list-item";

      const sceneElement = document.createElement("div");
      element.appendChild(sceneElement);

      const labelElement = document.createElement("div");
      labelElement.innerText = "file: " + path;
      element.appendChild(labelElement);

      // the element that represents the area we want to render the scene
      scene.userData.element = sceneElement;
      sectionElement.appendChild(element);

      const camera = new PerspectiveCamera(50, 1, 1, 10);
      camera.position.z = 2;
      scene.userData.camera = camera;

      try {
        const texture = await loader.loadAsync(
          supported === false ? "fail_load.ktx2" : path
        );
        const mesh = new Mesh(
          geometry,
          new MeshBasicMaterial({ map: texture })
        );

        labelElement.innerText += "\ncolorSpace: " + texture.colorSpace;

        scene.add(mesh);
        scenes.push(scene);
      } catch (e) {
        console.error(`Failed to load ${path}`, e);
      }
    }

    content.appendChild(sectionElement);
  }

  renderer.setAnimationLoop(animate);
}

function updateSize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
  }
}

/** Rewrite UVs for `flipY=false` textures. */
function flipY(geometry) {
  const uv = geometry.attributes.uv;

  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, 1 - uv.getY(i));
  }

  return geometry;
}

function animate() {
  updateSize();

  canvas.style.transform = `translateY(${window.scrollY}px)`;

  renderer.setClearColor(0xffffff);
  renderer.setScissorTest(false);
  renderer.clear();

  renderer.setClearColor(0xe0e0e0);
  renderer.setScissorTest(true);

  scenes.forEach(function (scene) {
    // get the element that is a place holder for where we want to
    // draw the scene
    const element = scene.userData.element;

    // get its position relative to the page's viewport
    const rect = element.getBoundingClientRect();

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

    const camera = scene.userData.camera;

    renderer.render(scene, camera);
  });
}
