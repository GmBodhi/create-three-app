import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  mx_noise_float,
  color,
  cross,
  dot,
  float,
  transformNormalToView,
  positionLocal,
  sign,
  step,
  Fn,
  uniform,
  varying,
  vec2,
  vec3,
  Loop,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let camera, scene, renderer, controls, drag;

init();

function init() {
  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(-10, 8, -2.2);

  scene = new Scene();
  scene.background = new Color(0x201919);

  const gui = new GUI();

  // environment

  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    "three/examples/textures/equirectangular/pedestrian_overpass_1k.hdr",
    (environmentMap) => {
      environmentMap.mapping = EquirectangularReflectionMapping;

      scene.background = environmentMap;
      scene.backgroundBlurriness = 0.5;
      scene.environment = environmentMap;
    }
  );

  // lights

  const directionalLight = new DirectionalLight("#ffffff", 2);
  directionalLight.position.set(6.25, 3, 4);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(1024, 1024);
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 30;
  directionalLight.shadow.camera.top = 8;
  directionalLight.shadow.camera.right = 8;
  directionalLight.shadow.camera.bottom = -8;
  directionalLight.shadow.camera.left = -8;
  directionalLight.shadow.normalBias = 0.05;
  directionalLight.shadow.bias = 0;
  scene.add(directionalLight);

  // terrain

  const material = new MeshStandardNodeMaterial({
    metalness: 0,
    roughness: 0.5,
    color: "#85d534",
  });

  const noiseIterations = uniform(3);
  const positionFrequency = uniform(0.175);
  const warpFrequency = uniform(6);
  const warpStrength = uniform(1);
  const strength = uniform(10);
  const offset = uniform(vec2(0, 0));
  const normalLookUpShift = uniform(0.01);
  const colorSand = uniform(color("#ffe894"));
  const colorGrass = uniform(color("#85d534"));
  const colorSnow = uniform(color("#ffffff"));
  const colorRock = uniform(color("#bfbd8d"));

  const vNormal = varying(vec3());
  const vPosition = varying(vec3());

  const terrainElevation = Fn(([position]) => {
    const warpedPosition = position.add(offset).toVar();
    warpedPosition.addAssign(
      mx_noise_float(
        warpedPosition.mul(positionFrequency).mul(warpFrequency),
        1,
        0
      ).mul(warpStrength)
    );

    const elevation = float(0).toVar();
    Loop(
      {
        type: "float",
        start: float(1),
        end: noiseIterations.toFloat(),
        condition: "<=",
      },
      ({ i }) => {
        const noiseInput = warpedPosition
          .mul(positionFrequency)
          .mul(i.mul(2))
          .add(i.mul(987));
        const noise = mx_noise_float(noiseInput, 1, 0).div(i.add(1).mul(2));
        elevation.addAssign(noise);
      }
    );

    const elevationSign = sign(elevation);
    elevation.assign(elevation.abs().pow(2).mul(elevationSign).mul(strength));

    return elevation;
  });

  material.positionNode = Fn(() => {
    // neighbours positions

    const neighbourA = positionLocal.xyz
      .add(vec3(normalLookUpShift, 0.0, 0.0))
      .toVar();
    const neighbourB = positionLocal.xyz
      .add(vec3(0.0, 0.0, normalLookUpShift.negate()))
      .toVar();

    // elevations

    const position = positionLocal.xyz.toVar();
    const elevation = terrainElevation(positionLocal.xz);
    position.y.addAssign(elevation);

    neighbourA.y.addAssign(terrainElevation(neighbourA.xz));
    neighbourB.y.addAssign(terrainElevation(neighbourB.xz));

    // compute normal

    const toA = neighbourA.sub(position).normalize();
    const toB = neighbourB.sub(position).normalize();
    vNormal.assign(cross(toA, toB));

    // varyings

    vPosition.assign(position.add(vec3(offset.x, 0, offset.y)));

    return position;
  })();

  material.normalNode = transformNormalToView(vNormal);

  material.colorNode = Fn(() => {
    const finalColor = colorSand.toVar();

    // grass

    const grassMix = step(-0.06, vPosition.y);
    finalColor.assign(grassMix.mix(finalColor, colorGrass));

    // rock

    const rockMix = step(0.5, dot(vNormal, vec3(0, 1, 0)))
      .oneMinus()
      .mul(step(-0.06, vPosition.y));
    finalColor.assign(rockMix.mix(finalColor, colorRock));

    // snow

    const snowThreshold = mx_noise_float(vPosition.xz.mul(25), 1, 0)
      .mul(0.1)
      .add(0.45);
    const snowMix = step(snowThreshold, vPosition.y);
    finalColor.assign(snowMix.mix(finalColor, colorSnow));

    return finalColor;
  })();

  const geometry = new PlaneGeometry(10, 10, 500, 500);
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  geometry.rotateX(-Math.PI * 0.5);

  const terrain = new Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);

  // debug

  const terrainGui = gui.addFolder("🏔️ terrain");

  terrainGui.add(noiseIterations, "value", 0, 10, 1).name("noiseIterations");
  terrainGui
    .add(positionFrequency, "value", 0, 1, 0.001)
    .name("positionFrequency");
  terrainGui.add(strength, "value", 0, 20, 0.001).name("strength");
  terrainGui.add(warpFrequency, "value", 0, 20, 0.001).name("warpFrequency");
  terrainGui.add(warpStrength, "value", 0, 2, 0.001).name("warpStrength");

  terrainGui
    .addColor({ color: colorSand.value.getHexString(SRGBColorSpace) }, "color")
    .name("colorSand")
    .onChange((value) => colorSand.value.set(value));
  terrainGui
    .addColor({ color: colorGrass.value.getHexString(SRGBColorSpace) }, "color")
    .name("colorGrass")
    .onChange((value) => colorGrass.value.set(value));
  terrainGui
    .addColor({ color: colorSnow.value.getHexString(SRGBColorSpace) }, "color")
    .name("colorSnow")
    .onChange((value) => colorSnow.value.set(value));
  terrainGui
    .addColor({ color: colorRock.value.getHexString(SRGBColorSpace) }, "color")
    .name("colorRock")
    .onChange((value) => colorRock.value.set(value));

  // water

  const water = new Mesh(
    new PlaneGeometry(10, 10, 1, 1),
    new MeshPhysicalMaterial({
      transmission: 1,
      roughness: 0.5,
      ior: 1.333,
      color: "#4db2ff",
    })
  );
  water.rotation.x = -Math.PI * 0.5;
  water.position.y = -0.1;
  scene.add(water);

  const waterGui = gui.addFolder("💧 water");

  waterGui.add(water.material, "roughness", 0, 1, 0.01);
  waterGui.add(water.material, "ior").min(1).max(2).step(0.001);
  waterGui
    .addColor(
      { color: water.material.color.getHexString(SRGBColorSpace) },
      "color"
    )
    .name("color")
    .onChange((value) => water.material.color.set(value));

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.target.y = -0.5;
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  // drag

  drag = {};
  drag.screenCoords = new Vector2();
  drag.prevWorldCoords = new Vector3();
  drag.worldCoords = new Vector3();
  drag.raycaster = new Raycaster();
  drag.down = false;
  drag.hover = false;

  drag.object = new Mesh(
    new PlaneGeometry(10, 10, 1, 1),
    new MeshBasicMaterial()
  );
  drag.object.rotation.x = -Math.PI * 0.5;
  drag.object.visible = false;
  scene.add(drag.object);

  drag.getIntersect = () => {
    drag.raycaster.setFromCamera(drag.screenCoords, camera);
    const intersects = drag.raycaster.intersectObject(drag.object);
    if (intersects.length) return intersects[0];

    return null;
  };

  drag.update = () => {
    const intersect = drag.getIntersect();

    if (intersect) {
      drag.hover = true;

      if (!drag.down) renderer.domElement.style.cursor = "grab";
    } else {
      drag.hover = false;
      renderer.domElement.style.cursor = "default";
    }

    if (drag.hover && drag.down) {
      drag.worldCoords.copy(intersect.point);
      const delta = drag.prevWorldCoords.sub(drag.worldCoords);

      offset.value.x += delta.x;
      offset.value.y += delta.z;
    }

    drag.prevWorldCoords.copy(drag.worldCoords);
  };

  window.addEventListener("pointermove", (event) => {
    drag.screenCoords.x = (event.clientX / window.innerWidth - 0.5) * 2;
    drag.screenCoords.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("pointerdown", () => {
    if (drag.hover) {
      renderer.domElement.style.cursor = "grabbing";
      controls.enabled = false;
      drag.down = true;
      drag.object.scale.setScalar(10);

      const intersect = drag.getIntersect();
      drag.prevWorldCoords.copy(intersect.point);
      drag.worldCoords.copy(intersect.point);
    }
  });

  window.addEventListener("pointerup", () => {
    drag.down = false;
    controls.enabled = true;
    drag.object.scale.setScalar(1);
  });

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  controls.update();

  drag.update();

  renderer.render(scene, camera);
}
