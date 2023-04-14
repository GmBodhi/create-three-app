import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  RepeatWrapping,
  EquirectangularReflectionMapping,
  SphereGeometry,
  Color,
  MeshStandardMaterial,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  AmbientLight,
  DirectionalLight,
  PointLight,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

let container, stats;

let camera, scene, renderer;
let particleLight;

const loader = new FontLoader();
loader.load("fonts/gentilis_regular.typeface.json", function (font) {
  init(font);
  animate();
});

function init(font) {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    2500
  );
  camera.position.set(0.0, 400, 400 * 3.5);

  scene = new Scene();

  // Materials

  let imgTexture = new TextureLoader().load("textures/planets/moon_1024.jpg");
  imgTexture.wrapS = imgTexture.wrapT = RepeatWrapping;
  imgTexture.anisotropy = 16;
  imgTexture = null;

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("pedestrian_overpass_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      const bumpScale = 1;
      const cubeWidth = 400;
      const numberOfSphersPerSide = 5;
      const sphereRadius = (cubeWidth / numberOfSphersPerSide) * 0.8 * 0.5;
      const stepSize = 1.0 / numberOfSphersPerSide;

      const geometry = new SphereGeometry(sphereRadius, 32, 16);

      let index = 0;

      for (let alpha = 0; alpha <= 1.0; alpha += stepSize) {
        for (let beta = 0; beta <= 1.0; beta += stepSize) {
          for (let gamma = 0; gamma <= 1.0; gamma += stepSize) {
            // basic monochromatic energy preservation
            const diffuseColor = new Color().setHSL(
              alpha,
              0.5,
              gamma * 0.5 + 0.1
            );

            const material = new MeshStandardMaterial({
              map: imgTexture,
              bumpMap: imgTexture,
              bumpScale: bumpScale,
              color: diffuseColor,
              metalness: beta,
              roughness: 1.0 - alpha,
              envMap: index % 2 === 0 ? null : texture,
            });

            index++;

            const mesh = new Mesh(geometry, material);

            mesh.position.x = alpha * 400 - 200;
            mesh.position.y = beta * 400 - 200;
            mesh.position.z = gamma * 400 - 200;

            scene.add(mesh);
          }
        }

        index++;
      }

      scene.background = texture;
    });

  function addLabel(name, location) {
    const textGeo = new TextGeometry(name, {
      font: font,

      size: 20,
      height: 1,
      curveSegments: 1,
    });

    const textMaterial = new MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new Mesh(textGeo, textMaterial);
    textMesh.position.copy(location);
    scene.add(textMesh);
  }

  addLabel("+roughness", new Vector3(-350, 0, 0));
  addLabel("-roughness", new Vector3(350, 0, 0));

  addLabel("-metalness", new Vector3(0, -300, 0));
  addLabel("+metalness", new Vector3(0, 300, 0));

  addLabel("-diffuse", new Vector3(0, 0, -300));
  addLabel("+diffuse", new Vector3(0, 0, 300));

  particleLight = new Mesh(
    new SphereGeometry(4, 8, 8),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  // Lights

  scene.add(new AmbientLight(0x222222));

  const directionalLight = new DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);

  const pointLight = new PointLight(0xffffff, 2, 800);
  particleLight.add(pointLight);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.75;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 200;
  controls.maxDistance = 2000;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const timer = Date.now() * 0.00025;

  //camera.position.x = Math.cos( timer ) * 800;
  //camera.position.z = Math.sin( timer ) * 800;

  camera.lookAt(scene.position);

  particleLight.position.x = Math.sin(timer * 7) * 300;
  particleLight.position.y = Math.cos(timer * 5) * 400;
  particleLight.position.z = Math.cos(timer * 3) * 300;

  renderer.render(scene, camera);
}
