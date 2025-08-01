import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  atan,
  cos,
  float,
  max,
  min,
  mix,
  PI,
  PI2,
  sin,
  vec2,
  vec3,
  color,
  Fn,
  hash,
  hue,
  If,
  instanceIndex,
  Loop,
  mx_fractal_noise_float,
  mx_fractal_noise_vec3,
  pass,
  pcurve,
  storage,
  deltaTime,
  time,
  uv,
  uniform,
  step,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import WebGPU from "three/addons/capabilities/WebGPU.js";

let camera, scene, renderer, postProcessing, controls, timer, light;

let updateParticles, spawnParticles; // TSL compute nodes
let getInstanceColor; // TSL function

const screenPointer = new Vector2();
const scenePointer = new Vector3();
const raycastPlane = new Plane(new Vector3(0, 0, 1), 0);
const raycaster = new Raycaster();

const nbParticles = Math.pow(2, 13);

const timeScale = uniform(1.0);
const particleLifetime = uniform(0.5);
const particleSize = uniform(1.0);
const linksWidth = uniform(0.005);

const colorOffset = uniform(0.0);
const colorVariance = uniform(2.0);
const colorRotationSpeed = uniform(1.0);

const spawnIndex = uniform(0);
const nbToSpawn = uniform(5);
const spawnPosition = uniform(vec3(0.0));
const previousSpawnPosition = uniform(vec3(0.0));

const turbFrequency = uniform(0.5);
const turbAmplitude = uniform(0.5);
const turbOctaves = uniform(2);
const turbLacunarity = uniform(2.0);
const turbGain = uniform(0.5);
const turbFriction = uniform(0.01);

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0, 10);

  scene = new Scene();

  timer = new Timer();
  timer.connect(document);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setClearColor(0x14171a);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  // TSL function
  // current color from index
  getInstanceColor = /*#__PURE__*/ Fn(([i]) => {
    return hue(
      color(0x0000ff),
      colorOffset.add(
        mx_fractal_noise_float(i.toFloat().mul(0.1), 2, 2.0, 0.5, colorVariance)
      )
    );
  });

  // Particles
  // storage buffers
  const particlePositions = storage(
    new StorageInstancedBufferAttribute(nbParticles, 4),
    "vec4",
    nbParticles
  );
  const particleVelocities = storage(
    new StorageInstancedBufferAttribute(nbParticles, 4),
    "vec4",
    nbParticles
  );

  // init particles buffers
  renderer.computeAsync(
    /*#__PURE__*/ Fn(() => {
      particlePositions.element(instanceIndex).xyz.assign(vec3(10000.0));
      particlePositions.element(instanceIndex).w.assign(vec3(-1.0)); // life is stored in w component; x<0 means dead
    })().compute(nbParticles)
  );

  // particles output
  const particleQuadSize = 0.05;
  const particleGeom = new PlaneGeometry(particleQuadSize, particleQuadSize);

  const particleMaterial = new SpriteNodeMaterial();
  particleMaterial.blending = AdditiveBlending;
  particleMaterial.depthWrite = false;
  particleMaterial.positionNode = particlePositions.toAttribute();
  particleMaterial.scaleNode = vec2(particleSize);
  particleMaterial.rotationNode = atan(
    particleVelocities.toAttribute().y,
    particleVelocities.toAttribute().x
  );

  particleMaterial.colorNode = /*#__PURE__*/ Fn(() => {
    const life = particlePositions.toAttribute().w;
    const modLife = pcurve(life.oneMinus(), 8.0, 1.0);
    const pulse = pcurve(
      sin(hash(instanceIndex).mul(PI2).add(time.mul(0.5).mul(PI2)))
        .mul(0.5)
        .add(0.5),
      0.25,
      0.25
    )
      .mul(10.0)
      .add(1.0);

    return getInstanceColor(instanceIndex).mul(pulse.mul(modLife));
  })();

  particleMaterial.opacityNode = /*#__PURE__*/ Fn(() => {
    const circle = step(uv().xy.sub(0.5).length(), 0.5);
    const life = particlePositions.toAttribute().w;

    return circle.mul(life);
  })();

  const particleMesh = new InstancedMesh(
    particleGeom,
    particleMaterial,
    nbParticles
  );
  particleMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  particleMesh.frustumCulled = false;

  scene.add(particleMesh);

  // Links between particles
  // first, we define the indices for the links, 2 quads per particle, the indexation is fixed
  const linksIndices = [];
  for (let i = 0; i < nbParticles; i++) {
    const baseIndex = i * 8;
    for (let j = 0; j < 2; j++) {
      const offset = baseIndex + j * 4;
      linksIndices.push(
        offset,
        offset + 1,
        offset + 2,
        offset,
        offset + 2,
        offset + 3
      );
    }
  }

  // storage buffers attributes for the links
  const nbVertices = nbParticles * 8;
  const linksVerticesSBA = new StorageBufferAttribute(nbVertices, 4);
  const linksColorsSBA = new StorageBufferAttribute(nbVertices, 4);

  // links output
  const linksGeom = new BufferGeometry();
  linksGeom.setAttribute("position", linksVerticesSBA);
  linksGeom.setAttribute("color", linksColorsSBA);
  linksGeom.setIndex(linksIndices);

  const linksMaterial = new MeshBasicNodeMaterial();
  linksMaterial.vertexColors = true;
  linksMaterial.side = DoubleSide;
  linksMaterial.transparent = true;
  linksMaterial.depthWrite = false;
  linksMaterial.depthTest = false;
  linksMaterial.blending = AdditiveBlending;
  linksMaterial.opacityNode = storage(
    linksColorsSBA,
    "vec4",
    linksColorsSBA.count
  ).toAttribute().w;

  const linksMesh = new Mesh(linksGeom, linksMaterial);
  linksMesh.frustumCulled = false;
  scene.add(linksMesh);

  // compute nodes
  updateParticles = /*#__PURE__*/ Fn(() => {
    const position = particlePositions.element(instanceIndex).xyz;
    const life = particlePositions.element(instanceIndex).w;
    const velocity = particleVelocities.element(instanceIndex).xyz;
    const dt = deltaTime.mul(0.1).mul(timeScale);

    If(life.greaterThan(0.0), () => {
      // first we update the particles positions and velocities
      // velocity comes from a turbulence field, and is multiplied by the particle lifetime so that it slows down over time
      const localVel = mx_fractal_noise_vec3(
        position.mul(turbFrequency),
        turbOctaves,
        turbLacunarity,
        turbGain,
        turbAmplitude
      ).mul(life.add(0.01));
      velocity.addAssign(localVel);
      velocity.mulAssign(turbFriction.oneMinus());
      position.addAssign(velocity.mul(dt));

      // then we decrease the lifetime
      life.subAssign(dt.mul(particleLifetime.reciprocal()));

      // then we find the two closest particles and set a quad to each of them
      const closestDist1 = float(10000.0).toVar();
      const closestPos1 = vec3(0.0).toVar();
      const closestLife1 = float(0.0).toVar();
      const closestDist2 = float(10000.0).toVar();
      const closestPos2 = vec3(0.0).toVar();
      const closestLife2 = float(0.0).toVar();

      Loop(nbParticles, ({ i }) => {
        const otherPart = particlePositions.element(i);

        If(i.notEqual(instanceIndex).and(otherPart.w.greaterThan(0.0)), () => {
          // if not self and other particle is alive

          const otherPosition = otherPart.xyz;
          const dist = position.sub(otherPosition).lengthSq();
          const moreThanZero = dist.greaterThan(0.0);

          If(dist.lessThan(closestDist1).and(moreThanZero), () => {
            closestDist1.assign(dist);
            closestPos1.assign(otherPosition.xyz);
            closestLife1.assign(otherPart.w);
          }).ElseIf(dist.lessThan(closestDist2).and(moreThanZero), () => {
            closestDist2.assign(dist);
            closestPos2.assign(otherPosition.xyz);
            closestLife2.assign(otherPart.w);
          });
        });
      });

      // then we update the links correspondingly
      const linksPositions = storage(
        linksVerticesSBA,
        "vec4",
        linksVerticesSBA.count
      );
      const linksColors = storage(linksColorsSBA, "vec4", linksColorsSBA.count);
      const firstLinkIndex = instanceIndex.mul(8);
      const secondLinkIndex = firstLinkIndex.add(4);

      // positions link 1
      linksPositions.element(firstLinkIndex).xyz.assign(position);
      linksPositions.element(firstLinkIndex).y.addAssign(linksWidth);
      linksPositions.element(firstLinkIndex.add(1)).xyz.assign(position);
      linksPositions
        .element(firstLinkIndex.add(1))
        .y.addAssign(linksWidth.negate());
      linksPositions.element(firstLinkIndex.add(2)).xyz.assign(closestPos1);
      linksPositions
        .element(firstLinkIndex.add(2))
        .y.addAssign(linksWidth.negate());
      linksPositions.element(firstLinkIndex.add(3)).xyz.assign(closestPos1);
      linksPositions.element(firstLinkIndex.add(3)).y.addAssign(linksWidth);

      // positions link 2
      linksPositions.element(secondLinkIndex).xyz.assign(position);
      linksPositions.element(secondLinkIndex).y.addAssign(linksWidth);
      linksPositions.element(secondLinkIndex.add(1)).xyz.assign(position);
      linksPositions
        .element(secondLinkIndex.add(1))
        .y.addAssign(linksWidth.negate());
      linksPositions.element(secondLinkIndex.add(2)).xyz.assign(closestPos2);
      linksPositions
        .element(secondLinkIndex.add(2))
        .y.addAssign(linksWidth.negate());
      linksPositions.element(secondLinkIndex.add(3)).xyz.assign(closestPos2);
      linksPositions.element(secondLinkIndex.add(3)).y.addAssign(linksWidth);

      // colors are the same for all vertices of both quads
      const linkColor = getInstanceColor(instanceIndex);

      // store the minimum lifetime of the closest particles in the w component of colors
      const l1 = max(0.0, min(closestLife1, life)).pow(0.8); // pow is here to apply a slight curve to the opacity
      const l2 = max(0.0, min(closestLife2, life)).pow(0.8);

      Loop(4, ({ i }) => {
        linksColors.element(firstLinkIndex.add(i)).xyz.assign(linkColor);
        linksColors.element(firstLinkIndex.add(i)).w.assign(l1);
        linksColors.element(secondLinkIndex.add(i)).xyz.assign(linkColor);
        linksColors.element(secondLinkIndex.add(i)).w.assign(l2);
      });
    });
  })().compute(nbParticles);

  spawnParticles = /*#__PURE__*/ Fn(() => {
    const particleIndex = spawnIndex
      .add(instanceIndex)
      .mod(nbParticles)
      .toInt();
    const position = particlePositions.element(particleIndex).xyz;
    const life = particlePositions.element(particleIndex).w;
    const velocity = particleVelocities.element(particleIndex).xyz;

    life.assign(1.0); // sets it alive

    // random spherical direction
    const rRange = float(0.01);
    const rTheta = hash(particleIndex).mul(PI2);
    const rPhi = hash(particleIndex.add(1)).mul(PI);
    const rx = sin(rTheta).mul(cos(rPhi));
    const ry = sin(rTheta).mul(sin(rPhi));
    const rz = cos(rTheta);
    const rDir = vec3(rx, ry, rz);

    // position is interpolated between the previous cursor position and the current one over the number of particles spawned
    const pos = mix(
      previousSpawnPosition,
      spawnPosition,
      instanceIndex.toFloat().div(nbToSpawn.sub(1).toFloat()).clamp()
    );
    position.assign(pos.add(rDir.mul(rRange)));

    // start in that direction
    velocity.assign(rDir.mul(5.0));
  })().compute(nbToSpawn.value);

  // background , an inverted icosahedron
  const backgroundGeom = new IcosahedronGeometry(100, 5).applyMatrix4(
    new Matrix4().makeScale(-1, 1, 1)
  );
  const backgroundMaterial = new MeshStandardNodeMaterial();
  backgroundMaterial.roughness = 0.4;
  backgroundMaterial.metalness = 0.9;
  backgroundMaterial.flatShading = true;
  backgroundMaterial.colorNode = color(0x0);

  const backgroundMesh = new Mesh(backgroundGeom, backgroundMaterial);
  scene.add(backgroundMesh);

  // light for the background
  light = new PointLight(0xffffff, 3000);
  scene.add(light);

  // post processing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode("output");

  const bloomPass = bloom(scenePassColor, 0.75, 0.1, 0.5);

  postProcessing.outputNode = scenePassColor.add(bloomPass);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.maxDistance = 75;
  window.addEventListener("resize", onWindowResize);

  // pointer handling

  window.addEventListener("pointermove", onPointerMove);

  // GUI

  const gui = new GUI();

  gui.add(controls, "autoRotate").name("Auto Rotate");
  gui
    .add(controls, "autoRotateSpeed", -10.0, 10.0, 0.01)
    .name("Auto Rotate Speed");

  const partFolder = gui.addFolder("Particles");
  partFolder.add(timeScale, "value", 0.0, 4.0, 0.01).name("timeScale");
  partFolder.add(nbToSpawn, "value", 1, 100, 1).name("Spawn rate");
  partFolder.add(particleSize, "value", 0.01, 3.0, 0.01).name("Size");
  partFolder.add(particleLifetime, "value", 0.01, 2.0, 0.01).name("Lifetime");
  partFolder.add(linksWidth, "value", 0.001, 0.1, 0.001).name("Links width");
  partFolder
    .add(colorVariance, "value", 0.0, 10.0, 0.01)
    .name("Color variance");
  partFolder
    .add(colorRotationSpeed, "value", 0.0, 5.0, 0.01)
    .name("Color rotation speed");

  const turbFolder = gui.addFolder("Turbulence");
  turbFolder.add(turbFriction, "value", 0.0, 0.3, 0.01).name("Friction");
  turbFolder.add(turbFrequency, "value", 0.0, 1.0, 0.01).name("Frequency");
  turbFolder.add(turbAmplitude, "value", 0.0, 10.0, 0.01).name("Amplitude");
  turbFolder.add(turbOctaves, "value", 1, 9, 1).name("Octaves");
  turbFolder.add(turbLacunarity, "value", 1.0, 5.0, 0.01).name("Lacunarity");
  turbFolder.add(turbGain, "value", 0.0, 1.0, 0.01).name("Gain");

  const bloomFolder = gui.addFolder("bloom");
  bloomFolder.add(bloomPass.threshold, "value", 0, 2.0, 0.01).name("Threshold");
  bloomFolder.add(bloomPass.strength, "value", 0, 10, 0.01).name("Strength");
  bloomFolder.add(bloomPass.radius, "value", 0, 1, 0.01).name("Radius");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(e) {
  screenPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  screenPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function updatePointer() {
  raycaster.setFromCamera(screenPointer, camera);
  raycaster.ray.intersectPlane(raycastPlane, scenePointer);
}

function animate() {
  timer.update();

  // compute particles
  renderer.compute(updateParticles);
  renderer.compute(spawnParticles);

  // update particle index for next spawn
  spawnIndex.value = (spawnIndex.value + nbToSpawn.value) % nbParticles;

  // update raycast plane to face camera
  raycastPlane.normal.applyEuler(camera.rotation);
  updatePointer();

  // lerping spawn position
  previousSpawnPosition.value.copy(spawnPosition.value);
  spawnPosition.value.lerp(scenePointer, 0.1);

  // rotating colors
  colorOffset.value +=
    timer.getDelta() * colorRotationSpeed.value * timeScale.value;

  const elapsedTime = timer.getElapsed();
  light.position.set(
    Math.sin(elapsedTime * 0.5) * 30,
    Math.cos(elapsedTime * 0.3) * 30,
    Math.sin(elapsedTime * 0.2) * 30
  );

  controls.update();

  postProcessing.render();
}
