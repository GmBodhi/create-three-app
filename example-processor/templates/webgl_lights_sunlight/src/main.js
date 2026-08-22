import "./style.css"; // For webpack support

import {
  Color,
  MathUtils,
  Scene,
  Fog,
  PerspectiveCamera,
  WebGLRenderer,
  ACESFilmicToneMapping,
  Timer,
  PMREMGenerator,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  Object3D,
  InstancedMesh,
  BoxGeometry,
} from "three";

import { SunLight } from "three/addons/lights/SunLight.js";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer,
  scene,
  camera,
  controls,
  timer,
  sunLight,
  sky,
  sceneEnv,
  pmremGenerator,
  renderTarget;

const params = {
  showCascades: false,
  far: 1000,
  resolution: 2048,
  azimuth: 135,
  elevation: 10,
};

const _sunDay = new Color(0xfff2e3),
  _sunDusk = new Color(0xff8a3d);
const _fogDay = new Color(0xd8e2ea),
  _fogDusk = new Color(0xd9a273);

// tints each fragment by its cascade, using the data of the built-in sun shadow shader

function tintCascades(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <opaque_fragment>",
    /* glsl */ `
					#include <opaque_fragment>

					#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0

						float cascade = 0.0;
						for ( int i = 0; i < 2; i ++ ) cascade += step( sunShadowCascade[ i ].y, vSunShadowWorldPosition.w );
						gl_FragColor.rgb *= 0.7 + 0.3 * cos( cascade * 1.2 + vec3( 0.0, 4.2, 2.1 ) );

					#endif
				`
  );
}

init();

function updateSun() {
  sunLight.position.setFromSphericalCoords(
    1,
    MathUtils.degToRad(90 - params.elevation),
    MathUtils.degToRad(params.azimuth)
  );

  // the sun light warms up and fades towards the horizon

  const daylight = Math.min(1, params.elevation / 30);

  sunLight.color.lerpColors(_sunDusk, _sunDay, daylight);
  sunLight.intensity = 3 + daylight * 2;

  scene.fog.color.lerpColors(_fogDusk, _fogDay, daylight);

  sky.material.uniforms.sunPosition.value.copy(sunLight.position);

  // light the scene with the sky itself

  if (renderTarget !== undefined) renderTarget.dispose();

  sceneEnv.add(sky);
  renderTarget = pmremGenerator.fromScene(sceneEnv);
  scene.add(sky);

  scene.environment = renderTarget.texture;
}

function init() {
  scene = new Scene();
  scene.fog = new Fog(0x000000, 500, 4000);
  scene.environmentIntensity = 0.5;

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.5,
    5000
  );
  camera.position.set(60, 8, 0);
  camera.lookAt(-60, 8, 0);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  document.body.appendChild(renderer.domElement);

  controls = new FirstPersonControls(camera, renderer.domElement);
  controls.movementSpeed = 40;
  controls.lookSpeed = 0.05;

  timer = new Timer();
  pmremGenerator = new PMREMGenerator(renderer);
  sceneEnv = new Scene();

  // sky and sun

  sky = new Sky();
  sky.scale.setScalar(9000);
  scene.add(sky);

  sky.material.uniforms.turbidity.value = 3;
  sky.material.uniforms.rayleigh.value = 2;
  sky.material.uniforms.showSunDisc.value = false; // the sun is represented by the light

  sunLight = new SunLight();
  sunLight.castShadow = true;
  sunLight.shadow.camera.far = params.far; // maximum shadow distance
  sunLight.shadow.mapSize.setScalar(params.resolution);
  sunLight.shadow.normalBias = 0.05;
  scene.add(sunLight);

  updateSun();

  // ground

  const ground = new Mesh(
    new PlaneGeometry(10000, 10000),
    new MeshStandardMaterial({ color: 0xa39f8e })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const dummy = new Object3D();

  // an avenue of thin posts shows the shadow resolution from up close
  // all the way down to the shadow distance

  const posts = new InstancedMesh(
    new BoxGeometry(1, 10, 1),
    new MeshStandardMaterial({ color: 0x475161 }),
    120
  );
  posts.castShadow = true;
  posts.receiveShadow = true;
  scene.add(posts);

  for (let i = 0; i < 60; i++) {
    for (const side of [-1, 1]) {
      dummy.position.set(30 - i * 17, 5, side * 13);
      dummy.updateMatrix();
      posts.setMatrixAt(i * 2 + (side + 1) / 2, dummy.matrix);
    }
  }

  // towers for large shadows in the distance

  const towers = new InstancedMesh(
    new BoxGeometry(10, 1, 10),
    new MeshStandardMaterial(),
    60
  );
  towers.castShadow = true;
  towers.receiveShadow = true;
  scene.add(towers);

  const towerColors = [new Color(0x08d9d6), new Color(0xff2e63)];

  MathUtils.seededRandom(6);

  for (let i = 0; i < 30; i++) {
    for (const side of [-1, 1]) {
      const height = 20 + MathUtils.seededRandom() * 40;

      dummy.position.set(
        -40 - i * 32 - MathUtils.seededRandom() * 10,
        height / 2,
        side * (38 + MathUtils.seededRandom() * 55)
      );
      dummy.scale.y = height;
      dummy.updateMatrix();

      const index = i * 2 + (side + 1) / 2;
      towers.setMatrixAt(index, dummy.matrix);
      towers.setColorAt(index, towerColors[(i + (side + 1) / 2) % 2]);
    }
  }

  // gui

  const materials = [ground.material, posts.material, towers.material];

  const gui = new GUI();

  gui
    .add(params, "showCascades")
    .name("show cascades")
    .onChange(function (value) {
      for (const material of materials) {
        if (value) material.onBeforeCompile = tintCascades;
        else delete material.onBeforeCompile;

        material.needsUpdate = true;
      }
    });

  gui
    .add(params, "far", 100, 3000)
    .step(1)
    .name("shadow far")
    .onChange(function (value) {
      sunLight.shadow.camera.far = value;
    });

  gui
    .add(params, "resolution", [256, 512, 1024, 2048, 4096])
    .name("shadow resolution")
    .onChange(function (value) {
      sunLight.shadow.mapSize.setScalar(value);
    });

  gui.add(params, "azimuth", 0, 360).onChange(updateSun);
  gui.add(params, "elevation", 5, 80).onChange(updateSun);

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.handleResize();
  });
}

function animate() {
  timer.update();

  controls.update(timer.getDelta());

  renderer.render(scene, camera);
}
