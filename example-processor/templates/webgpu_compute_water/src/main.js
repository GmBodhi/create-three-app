import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  instanceIndex,
  struct,
  If,
  uint,
  int,
  floor,
  float,
  length,
  clamp,
  vec2,
  cos,
  vec3,
  vertexIndex,
  Fn,
  uniform,
  instancedArray,
  min,
  max,
  positionLocal,
  transformNormalToView,
} from "three/tsl";

import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";

// Dimensions of simulation grid.
const WIDTH = 128;

// Water size in system units.
const BOUNDS = 6;
const BOUNDS_HALF = BOUNDS * 0.5;
const limit = BOUNDS_HALF - 0.2;

const waterMaxHeight = 0.1;

let container, stats;
let camera, scene, renderer, controls;

let mouseDown = false;
let firstClick = true;
let updateOriginMouseDown = false;

const mouseCoords = new Vector2();
const raycaster = new Raycaster();
let frame = 0;

const effectController = {
  mousePos: uniform(new Vector2()).setName("mousePos"),
  mouseSpeed: uniform(new Vector2()).setName("mouseSpeed"),
  mouseDeep: uniform(0.5).setName("mouseDeep"),
  mouseSize: uniform(0.12).setName("mouseSize"),
  viscosity: uniform(0.96).setName("viscosity"),
  ducksEnabled: true,
  wireframe: false,
  speed: 5,
};

let sun;
let waterMesh;
let poolBorder;
let meshRay;
let computeHeight, computeDucks;
let duckModel = null;

const NUM_DUCKS = 100;

const simplex = new SimplexNoise();

init();

function noise(x, y) {
  let multR = waterMaxHeight;
  let mult = 0.025;
  let r = 0;
  for (let i = 0; i < 15; i++) {
    r += multR * simplex.noise(x * mult, y * mult);
    multR *= 0.53 + 0.025 * i;
    mult *= 1.25;
  }

  return r;
}

async function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.set(0, 2.0, 4);
  camera.lookAt(0, 0, 0);

  scene = new Scene();

  sun = new DirectionalLight(0xffffff, 4.0);
  sun.position.set(-1, 2.6, 1.4);
  scene.add(sun);

  //

  // Initialize height storage buffers
  const heightArray = new Float32Array(WIDTH * WIDTH);
  const prevHeightArray = new Float32Array(WIDTH * WIDTH);

  let p = 0;
  for (let j = 0; j < WIDTH; j++) {
    for (let i = 0; i < WIDTH; i++) {
      const x = (i * 128) / WIDTH;
      const y = (j * 128) / WIDTH;

      const height = noise(x, y);

      heightArray[p] = height;
      prevHeightArray[p] = height;

      p++;
    }
  }

  const heightStorage = instancedArray(heightArray).setName("Height");
  const prevHeightStorage =
    instancedArray(prevHeightArray).setName("PrevHeight");

  // Get Indices of Neighbor Values of an Index in the Simulation Grid
  const getNeighborIndicesTSL = (index) => {
    const width = uint(WIDTH);

    // Get 2-D compute coordinate from one-dimensional instanceIndex. The calculation will
    // still work even if you dispatch your compute shader 2-dimensionally, since within a compute
    // context, instanceIndex is a 1-dimensional value derived from the workgroup dimensions.

    // Cast to int to prevent unintended index overflow upon subtraction.
    const x = int(index.mod(WIDTH));
    const y = int(index.div(WIDTH));

    // The original shader accesses height via texture uvs. However, unlike with textures, we can't
    // access areas that are out of bounds. Accordingly, we emulate the Clamp to Edge Wrapping
    // behavior of accessing a DataTexture with out of bounds uvs.

    const leftX = max(0, x.sub(1));
    const rightX = min(x.add(1), width.sub(1));

    const bottomY = max(0, y.sub(1));
    const topY = min(y.add(1), width.sub(1));

    const westIndex = y.mul(width).add(leftX);
    const eastIndex = y.mul(width).add(rightX);

    const southIndex = bottomY.mul(width).add(x);
    const northIndex = topY.mul(width).add(x);

    return { northIndex, southIndex, eastIndex, westIndex };
  };

  // Get simulation index neighbor values
  const getNeighborValuesTSL = (index, store) => {
    const { northIndex, southIndex, eastIndex, westIndex } =
      getNeighborIndicesTSL(index);

    const north = store.element(northIndex);
    const south = store.element(southIndex);
    const east = store.element(eastIndex);
    const west = store.element(westIndex);

    return { north, south, east, west };
  };

  // Get new normals of simulation area.
  const getNormalsFromHeightTSL = (index, store) => {
    const { north, south, east, west } = getNeighborValuesTSL(index, store);

    const normalX = west.sub(east).mul(WIDTH / BOUNDS);
    const normalY = south.sub(north).mul(WIDTH / BOUNDS);

    return { normalX, normalY };
  };

  computeHeight = Fn(() => {
    const { viscosity, mousePos, mouseSize, mouseDeep, mouseSpeed } =
      effectController;

    const height = heightStorage.element(instanceIndex).toVar();
    const prevHeight = prevHeightStorage.element(instanceIndex).toVar();

    const { north, south, east, west } = getNeighborValuesTSL(
      instanceIndex,
      heightStorage
    );

    const neighborHeight = north.add(south).add(east).add(west);
    neighborHeight.mulAssign(0.5);
    neighborHeight.subAssign(prevHeight);

    const newHeight = neighborHeight.mul(viscosity);

    // Get 2-D compute coordinate from one-dimensional instanceIndex.
    const x = float(instanceIndex.mod(WIDTH)).mul(1 / WIDTH);
    const y = float(instanceIndex.div(WIDTH)).mul(1 / WIDTH);

    // Mouse influence
    const centerVec = vec2(0.5);

    // Get length of position in range [ -BOUNDS / 2, BOUNDS / 2 ], offset by mousePos, then scale.
    const mousePhase = clamp(
      length(vec2(x, y).sub(centerVec).mul(BOUNDS).sub(mousePos))
        .mul(Math.PI)
        .div(mouseSize),
      0.0,
      Math.PI
    );

    // "Indent" water down by scaled distance from center of mouse impact
    newHeight.addAssign(
      cos(mousePhase).add(1.0).mul(mouseDeep).mul(mouseSpeed.length())
    );

    prevHeightStorage.element(instanceIndex).assign(height);
    heightStorage.element(instanceIndex).assign(newHeight);
  })().compute(WIDTH * WIDTH);

  // Water Geometry corresponds with buffered compute grid.
  const waterGeometry = new PlaneGeometry(BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1);

  const waterMaterial = new MeshStandardNodeMaterial({
    color: 0x9bd2ec,
    metalness: 0.9,
    roughness: 0,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  });

  waterMaterial.normalNode = Fn(() => {
    // To correct the lighting as our mesh undulates, we have to reassign the normals in the normal shader.
    const { normalX, normalY } = getNormalsFromHeightTSL(
      vertexIndex,
      heightStorage
    );

    return transformNormalToView(
      vec3(normalX, normalY.negate(), 1.0)
    ).toVertexStage();
  })();

  waterMaterial.positionNode = Fn(() => {
    return vec3(
      positionLocal.x,
      positionLocal.y,
      heightStorage.element(vertexIndex)
    );
  })();

  waterMesh = new Mesh(waterGeometry, waterMaterial);
  waterMesh.rotation.x = -Math.PI * 0.5;
  waterMesh.matrixAutoUpdate = false;
  waterMesh.updateMatrix();

  scene.add(waterMesh);

  // Pool border
  const borderGeom = new TorusGeometry(4.2, 0.1, 12, 4);
  borderGeom.rotateX(Math.PI * 0.5);
  borderGeom.rotateY(Math.PI * 0.25);
  poolBorder = new Mesh(
    borderGeom,
    new MeshStandardMaterial({ color: 0x908877, roughness: 0.2 })
  );
  scene.add(poolBorder);

  // Mesh just for mouse raycasting
  const geometryRay = new PlaneGeometry(BOUNDS, BOUNDS, 1, 1);
  meshRay = new Mesh(
    geometryRay,
    new MeshBasicMaterial({ color: 0xffffff, visible: false })
  );
  meshRay.rotation.x = -Math.PI / 2;
  meshRay.matrixAutoUpdate = false;
  meshRay.updateMatrix();
  scene.add(meshRay);

  // Initialize sphere mesh instance position and velocity.
  // position<vec3> + velocity<vec2> + unused<vec3> = 8 floats per sphere.
  // for structs arrays must be enclosed in multiple of 4

  const duckStride = 8;
  const duckInstanceDataArray = new Float32Array(NUM_DUCKS * duckStride);

  // Only hold velocity in x and z directions.
  // The sphere is wedded to the surface of the water, and will only move vertically with the water.

  for (let i = 0; i < NUM_DUCKS; i++) {
    duckInstanceDataArray[i * duckStride + 0] =
      (Math.random() - 0.5) * BOUNDS * 0.7;
    duckInstanceDataArray[i * duckStride + 1] = 0;
    duckInstanceDataArray[i * duckStride + 2] =
      (Math.random() - 0.5) * BOUNDS * 0.7;
  }

  const DuckStruct = struct({
    position: "vec3",
    velocity: "vec2",
  });

  // Duck instance data storage

  const duckInstanceDataStorage = instancedArray(
    duckInstanceDataArray,
    DuckStruct
  ).setName("DuckInstanceData");

  computeDucks = Fn(() => {
    const yOffset = float(-0.04);
    const verticalResponseFactor = float(0.98);
    const waterPushFactor = float(0.015);
    const linearDamping = float(0.92);
    const bounceDamping = float(-0.4);

    // Get 2-D compute coordinate from one-dimensional instanceIndex. The calculation will
    const instancePosition = duckInstanceDataStorage
      .element(instanceIndex)
      .get("position")
      .toVar();
    const velocity = duckInstanceDataStorage
      .element(instanceIndex)
      .get("velocity")
      .toVar();

    const gridCoordX = instancePosition.x.div(BOUNDS).add(0.5).mul(WIDTH);
    const gridCoordZ = instancePosition.z.div(BOUNDS).add(0.5).mul(WIDTH);

    // Cast to int to prevent unintended index overflow upon subtraction.
    const xCoord = uint(clamp(floor(gridCoordX), 0, WIDTH - 1));
    const zCoord = uint(clamp(floor(gridCoordZ), 0, WIDTH - 1));
    const heightInstanceIndex = zCoord.mul(WIDTH).add(xCoord);

    // Get height of water at the duck's position
    const waterHeight = heightStorage.element(heightInstanceIndex);
    const { normalX, normalY } = getNormalsFromHeightTSL(
      heightInstanceIndex,
      heightStorage
    );

    // Calculate the target Y position based on the water height and the duck's vertical offset
    const targetY = waterHeight.add(yOffset);

    const deltaY = targetY.sub(instancePosition.y);
    instancePosition.y.addAssign(deltaY.mul(verticalResponseFactor)); // Gradually update position

    // Get the normal of the water surface at the duck's position
    const pushX = normalX.mul(waterPushFactor);
    const pushZ = normalY.mul(waterPushFactor);

    // Apply the water push to the duck's velocity
    velocity.x.mulAssign(linearDamping);
    velocity.y.mulAssign(linearDamping);

    velocity.x.addAssign(pushX);
    velocity.y.addAssign(pushZ);

    // update position based on velocity
    instancePosition.x.addAssign(velocity.x);
    instancePosition.z.addAssign(velocity.y);

    // Clamp position to the pool bounds

    If(instancePosition.x.lessThan(-limit), () => {
      instancePosition.x = -limit;
      velocity.x.mulAssign(bounceDamping);
    }).ElseIf(instancePosition.x.greaterThan(limit), () => {
      instancePosition.x = limit;
      velocity.x.mulAssign(bounceDamping);
    });

    If(instancePosition.z.lessThan(-limit), () => {
      instancePosition.z = -limit;
      velocity.y.mulAssign(bounceDamping); // Invert and damp vz (velocity.y)
    }).ElseIf(instancePosition.z.greaterThan(limit), () => {
      instancePosition.z = limit;
      velocity.y.mulAssign(bounceDamping);
    });

    // assignment of new values to the instance data storage

    duckInstanceDataStorage
      .element(instanceIndex)
      .get("position")
      .assign(instancePosition);
    duckInstanceDataStorage
      .element(instanceIndex)
      .get("velocity")
      .assign(velocity);
  })().compute(NUM_DUCKS);

  // Models / Textures

  const rgbeLoader = new RGBELoader().setPath(
    "three/examples/textures/equirectangular/"
  );
  const glbloader = new GLTFLoader().setPath("models/gltf/");
  glbloader.setDRACOLoader(
    new DRACOLoader().setDecoderPath("jsm/libs/draco/gltf/")
  );

  const [env, model] = await Promise.all([
    rgbeLoader.loadAsync("blouberg_sunrise_2_1k.hdr"),
    glbloader.loadAsync("duck.glb"),
  ]);
  env.mapping = EquirectangularReflectionMapping;
  scene.environment = env;
  scene.background = env;
  scene.backgroundBlurriness = 0.3;
  scene.environmentIntensity = 1.25;

  duckModel = model.scene.children[0];
  duckModel.material.positionNode = Fn(() => {
    const instancePosition = duckInstanceDataStorage
      .element(instanceIndex)
      .get("position");

    const newPosition = positionLocal.add(instancePosition);

    return newPosition;
  })();

  const duckMesh = new InstancedMesh(
    duckModel.geometry,
    duckModel.material,
    NUM_DUCKS
  );
  scene.add(duckMesh);

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, container);

  container.style.touchAction = "none";

  // Stats

  stats = new Stats();
  container.appendChild(stats.dom);

  container.style.touchAction = "none";
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerUp);

  window.addEventListener("resize", onWindowResize);

  // GUI

  const gui = new GUI();
  gui.add(effectController.mouseSize, "value", 0.1, 0.3).name("Mouse Size");
  gui.add(effectController.mouseDeep, "value", 0.1, 1).name("Mouse Deep");
  gui
    .add(effectController.viscosity, "value", 0.9, 0.96, 0.001)
    .name("viscosity");
  gui.add(effectController, "speed", 1, 6, 1);
  gui.add(effectController, "ducksEnabled").onChange(() => {
    duckMesh.visible = effectController.ducksEnabled;
  });
  gui.add(effectController, "wireframe").onChange(() => {
    waterMesh.material.wireframe = !waterMesh.material.wireframe;
    poolBorder.material.wireframe = !poolBorder.material.wireframe;
    duckModel.material.wireframe = !duckModel.material.wireframe;
    waterMesh.material.needsUpdate = true;
    poolBorder.material.needsUpdate = true;
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setMouseCoords(x, y) {
  mouseCoords.set(
    (x / renderer.domElement.clientWidth) * 2 - 1,
    -(y / renderer.domElement.clientHeight) * 2 + 1
  );
}

function onPointerDown() {
  mouseDown = true;
  firstClick = true;
  updateOriginMouseDown = true;
}

function onPointerUp() {
  mouseDown = false;
  firstClick = false;
  updateOriginMouseDown = false;

  controls.enabled = true;
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  setMouseCoords(event.clientX, event.clientY);
}

function animate() {
  render();
  stats.update();
}

function raycast() {
  if (mouseDown && (firstClick || !controls.enabled)) {
    raycaster.setFromCamera(mouseCoords, camera);

    const intersects = raycaster.intersectObject(meshRay);

    if (intersects.length > 0) {
      const point = intersects[0].point;

      if (updateOriginMouseDown) {
        effectController.mousePos.value.set(point.x, point.z);

        updateOriginMouseDown = false;
      }

      effectController.mouseSpeed.value.set(
        point.x - effectController.mousePos.value.x,
        point.z - effectController.mousePos.value.y
      );

      effectController.mousePos.value.set(point.x, point.z);

      if (firstClick) {
        controls.enabled = false;
      }
    } else {
      updateOriginMouseDown = true;

      effectController.mouseSpeed.value.set(0, 0);
    }

    firstClick = false;
  } else {
    updateOriginMouseDown = true;

    effectController.mouseSpeed.value.set(0, 0);
  }
}

function render() {
  raycast();

  frame++;

  if (frame >= 7 - effectController.speed) {
    renderer.computeAsync(computeHeight);

    if (effectController.ducksEnabled) {
      renderer.computeAsync(computeDucks);
    }

    frame = 0;
  }

  renderer.render(scene, camera);
}
