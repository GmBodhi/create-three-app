import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  storage,
  If,
  vec3,
  not,
  uniform,
  uv,
  uint,
  float,
  Fn,
  vec2,
  abs,
  int,
  invocationLocalIndex,
  workgroupArray,
  uvec2,
  floor,
  instanceIndex,
  workgroupBarrier,
  atomicAdd,
  atomicStore,
  workgroupId,
} from "three/tsl";

import WebGPU from "three/addons/capabilities/WebGPU.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const StepType = {
  NONE: 0,
  // Swap values within workgroup local buffer.
  FLIP_LOCAL: 1,
  DISPERSE_LOCAL: 2,
  // Swap values within global data buffer.
  FLIP_GLOBAL: 3,
  DISPERSE_GLOBAL: 4,
};

const timestamps = {
  local_swap: document.getElementById("local_swap"),
  global_swap: document.getElementById("global_swap"),
};

const localColors = ["rgb(203, 64, 203)", "rgb(0, 215, 215)"];
const globalColors = ["rgb(1, 150, 1)", "red"];

// Total number of elements and the dimensions of the display grid.
const size = 16384;
const gridDim = Math.sqrt(size);

const getNumSteps = () => {
  const n = Math.log2(size);
  return (n * (n + 1)) / 2;
};

// Total number of steps in a bitonic sort with 'size' elements.
const MAX_STEPS = getNumSteps();
const WORKGROUP_SIZE = [64];

const effectController = {
  // Sqr root of 16834
  gridWidth: uniform(gridDim),
  gridHeight: uniform(gridDim),
  highlight: uniform(1),
  "Display Mode": "Swap Zone Highlight",
};

const gui = new GUI();
gui
  .add(effectController, "Display Mode", ["Elements", "Swap Zone Highlight"])
  .onChange(() => {
    if (effectController["Display Mode"] === "Elements") {
      effectController.highlight.value = 0;
    } else {
      effectController.highlight.value = 1;
    }
  });

if (WebGPU.isAvailable() === false) {
  document.body.appendChild(WebGPU.getErrorMessage());

  throw new Error("No WebGPU support");
}

// Allow Workgroup Array Swaps
init();

// Global Swaps Only
init(true);

// When forceGlobalSwap is true, force all valid local swaps to be global swaps.
async function init(forceGlobalSwap = false) {
  let currentStep = 0;
  let nextStepGlobal = false;

  const aspect = window.innerWidth / 2 / window.innerHeight;
  const camera = new OrthographicCamera(-aspect, aspect, 1, -1, 0, 2);
  camera.position.z = 1;

  const scene = new Scene();

  const nextAlgoBuffer = new StorageInstancedBufferAttribute(
    new Uint32Array(1).fill(
      forceGlobalSwap ? StepType.FLIP_GLOBAL : StepType.FLIP_LOCAL
    ),
    1
  );

  const nextAlgoStorage = storage(nextAlgoBuffer, "uint", nextAlgoBuffer.count)
    .setPBO(true)
    .setName("NextAlgo");

  const nextBlockHeightBuffer = new StorageInstancedBufferAttribute(
    new Uint32Array(1).fill(2),
    1
  );
  const nextBlockHeightStorage = storage(
    nextBlockHeightBuffer,
    "uint",
    nextBlockHeightBuffer.count
  )
    .setPBO(true)
    .setName("NextBlockHeight");
  const nextBlockHeightRead = storage(
    nextBlockHeightBuffer,
    "uint",
    nextBlockHeightBuffer.count
  )
    .setPBO(true)
    .setName("NextBlockHeight")
    .toReadOnly();

  const highestBlockHeightBuffer = new StorageInstancedBufferAttribute(
    new Uint32Array(1).fill(2),
    1
  );
  const highestBlockHeightStorage = storage(
    highestBlockHeightBuffer,
    "uint",
    highestBlockHeightBuffer.count
  )
    .setPBO(true)
    .setName("HighestBlockHeight");

  const counterBuffer = new StorageBufferAttribute(1, 1);
  const counterStorage = storage(counterBuffer, "uint", counterBuffer.count)
    .setPBO(true)
    .toAtomic()
    .setName("Counter");

  const array = new Uint32Array(
    Array.from({ length: size }, (_, i) => {
      return i;
    })
  );

  const randomizeDataArray = () => {
    let currentIndex = array.length;
    while (currentIndex !== 0) {
      const randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  };

  randomizeDataArray();

  const currentElementsBuffer = new StorageInstancedBufferAttribute(array, 1);
  const currentElementsStorage = storage(currentElementsBuffer, "uint", size)
    .setPBO(true)
    .setName("Elements");
  const tempBuffer = new StorageInstancedBufferAttribute(array, 1);
  const tempStorage = storage(tempBuffer, "uint", size)
    .setPBO(true)
    .setName("Temp");
  const randomizedElementsBuffer = new StorageInstancedBufferAttribute(size, 1);
  const randomizedElementsStorage = storage(
    randomizedElementsBuffer,
    "uint",
    size
  )
    .setPBO(true)
    .setName("RandomizedElements");

  const getFlipIndices = (index, blockHeight) => {
    const blockOffset = index.mul(2).div(blockHeight).mul(blockHeight);
    const halfHeight = blockHeight.div(2);
    const idx = uvec2(
      index.mod(halfHeight),
      blockHeight.sub(index.mod(halfHeight)).sub(1)
    );
    idx.x.addAssign(blockOffset);
    idx.y.addAssign(blockOffset);

    return idx;
  };

  const getDisperseIndices = (index, blockHeight) => {
    const blockOffset = index.mul(2).div(blockHeight).mul(blockHeight);
    const halfHeight = blockHeight.div(2);
    const idx = uvec2(
      index.mod(halfHeight),
      index.mod(halfHeight).add(halfHeight)
    );

    idx.x.addAssign(blockOffset);
    idx.y.addAssign(blockOffset);

    return idx;
  };

  const localStorage = workgroupArray("uint", 64 * 2);

  // Swap the elements in local storage
  const localCompareAndSwap = (idxBefore, idxAfter) => {
    If(
      localStorage.element(idxAfter).lessThan(localStorage.element(idxBefore)),
      () => {
        atomicAdd(counterStorage.element(0), 1);
        const temp = localStorage.element(idxBefore).toVar();
        localStorage.element(idxBefore).assign(localStorage.element(idxAfter));
        localStorage.element(idxAfter).assign(temp);
      }
    );
  };

  const globalCompareAndSwap = (idxBefore, idxAfter) => {
    // If the later element is less than the current element
    If(
      currentElementsStorage
        .element(idxAfter)
        .lessThan(currentElementsStorage.element(idxBefore)),
      () => {
        // Apply the swapped values to temporary storage.
        atomicAdd(counterStorage.element(0), 1);
        tempStorage
          .element(idxBefore)
          .assign(currentElementsStorage.element(idxAfter));
        tempStorage
          .element(idxAfter)
          .assign(currentElementsStorage.element(idxBefore));
      }
    ).Else(() => {
      // Otherwise apply the existing values to temporary storage.
      tempStorage
        .element(idxBefore)
        .assign(currentElementsStorage.element(idxBefore));
      tempStorage
        .element(idxAfter)
        .assign(currentElementsStorage.element(idxAfter));
    });
  };

  const computeInitFn = Fn(() => {
    randomizedElementsStorage
      .element(instanceIndex)
      .assign(currentElementsStorage.element(instanceIndex));
  });

  const computeBitonicStepFn = Fn(() => {
    const nextBlockHeight = nextBlockHeightStorage.element(0).toVar();
    const nextAlgo = nextAlgoStorage.element(0).toVar();

    // Get ids of indices needed to populate workgroup local buffer.
    // Use .toVar() to prevent these values from being recalculated multiple times.
    const localOffset = uint(WORKGROUP_SIZE[0])
      .mul(2)
      .mul(workgroupId.x)
      .toVar();

    const localID1 = invocationLocalIndex.mul(2);
    const localID2 = invocationLocalIndex.mul(2).add(1);

    // If we will perform a local swap, then populate the local data
    If(nextAlgo.lessThanEqual(uint(StepType.DISPERSE_LOCAL)), () => {
      localStorage
        .element(localID1)
        .assign(currentElementsStorage.element(localOffset.add(localID1)));
      localStorage
        .element(localID2)
        .assign(currentElementsStorage.element(localOffset.add(localID2)));
    });

    workgroupBarrier();

    // TODO: Convert to switch block.
    If(nextAlgo.equal(uint(StepType.FLIP_LOCAL)), () => {
      const idx = getFlipIndices(invocationLocalIndex, nextBlockHeight);
      localCompareAndSwap(idx.x, idx.y);
    })
      .ElseIf(nextAlgo.equal(uint(StepType.DISPERSE_LOCAL)), () => {
        const idx = getDisperseIndices(invocationLocalIndex, nextBlockHeight);
        localCompareAndSwap(idx.x, idx.y);
      })
      .ElseIf(nextAlgo.equal(uint(StepType.FLIP_GLOBAL)), () => {
        const idx = getFlipIndices(instanceIndex, nextBlockHeight);
        globalCompareAndSwap(idx.x, idx.y);
      })
      .ElseIf(nextAlgo.equal(uint(StepType.DISPERSE_GLOBAL)), () => {
        const idx = getDisperseIndices(instanceIndex, nextBlockHeight);
        globalCompareAndSwap(idx.x, idx.y);
      });

    // Ensure that all invocations have swapped their own regions of data
    workgroupBarrier();

    // Populate output data with the results from our swaps
    If(nextAlgo.lessThanEqual(uint(StepType.DISPERSE_LOCAL)), () => {
      currentElementsStorage
        .element(localOffset.add(localID1))
        .assign(localStorage.element(localID1));
      currentElementsStorage
        .element(localOffset.add(localID2))
        .assign(localStorage.element(localID2));
    });

    // If the previous algorithm was global, we execute an additional compute step to sync the current buffer with the output buffer.
  });

  const computeSetAlgoFn = Fn(() => {
    const nextBlockHeight = nextBlockHeightStorage.element(0).toVar();
    const nextAlgo = nextAlgoStorage.element(0);
    const highestBlockHeight = highestBlockHeightStorage.element(0).toVar();

    nextBlockHeight.divAssign(2);

    If(nextBlockHeight.equal(1), () => {
      highestBlockHeight.mulAssign(2);

      if (forceGlobalSwap) {
        If(highestBlockHeight.equal(size * 2), () => {
          nextAlgo.assign(StepType.NONE);
          nextBlockHeight.assign(0);
        }).Else(() => {
          nextAlgo.assign(StepType.FLIP_GLOBAL);
          nextBlockHeight.assign(highestBlockHeight);
        });
      } else {
        If(highestBlockHeight.equal(size * 2), () => {
          nextAlgo.assign(StepType.NONE);
          nextBlockHeight.assign(0);
        })
          .ElseIf(highestBlockHeight.greaterThan(WORKGROUP_SIZE[0] * 2), () => {
            nextAlgo.assign(StepType.FLIP_GLOBAL);
            nextBlockHeight.assign(highestBlockHeight);
          })
          .Else(() => {
            nextAlgo.assign(
              forceGlobalSwap ? StepType.FLIP_GLOBAL : StepType.FLIP_LOCAL
            );
            nextBlockHeight.assign(highestBlockHeight);
          });
      }
    }).Else(() => {
      if (forceGlobalSwap) {
        nextAlgo.assign(StepType.DISPERSE_GLOBAL);
      } else {
        nextAlgo.assign(
          nextBlockHeight
            .greaterThan(WORKGROUP_SIZE[0] * 2)
            .select(StepType.DISPERSE_GLOBAL, StepType.DISPERSE_LOCAL)
        );
      }
    });

    nextBlockHeightStorage.element(0).assign(nextBlockHeight);
    highestBlockHeightStorage.element(0).assign(highestBlockHeight);
  });

  const computeAlignCurrentFn = Fn(() => {
    currentElementsStorage
      .element(instanceIndex)
      .assign(tempStorage.element(instanceIndex));
  });

  const computeResetBuffersFn = Fn(() => {
    currentElementsStorage
      .element(instanceIndex)
      .assign(randomizedElementsStorage.element(instanceIndex));
  });

  const computeResetAlgoFn = Fn(() => {
    nextAlgoStorage
      .element(0)
      .assign(forceGlobalSwap ? StepType.FLIP_GLOBAL : StepType.FLIP_LOCAL);
    nextBlockHeightStorage.element(0).assign(2);
    highestBlockHeightStorage.element(0).assign(2);
    atomicStore(counterStorage.element(0), 0);
  });

  // Initialize each value in the elements buffer.
  const computeInit = computeInitFn().compute(size);
  // Swap a pair of elements in the elements buffer.
  const computeBitonicStep = computeBitonicStepFn().compute(size / 2);
  // Set the conditions for the next swap.
  const computeSetAlgo = computeSetAlgoFn().compute(1);
  // Align the current buffer with the temp buffer if the previous sort was executed in a global scope.
  const computeAlignCurrent = computeAlignCurrentFn().compute(size);
  // Reset the buffers and algorithm information after a full bitonic sort has been completed.
  const computeResetBuffers = computeResetBuffersFn().compute(size);
  const computeResetAlgo = computeResetAlgoFn().compute(1);

  const material = new MeshBasicNodeMaterial({ color: 0x00ff00 });

  const display = Fn(() => {
    const { gridWidth, gridHeight, highlight } = effectController;

    const newUV = uv().mul(vec2(gridWidth, gridHeight));

    const pixel = uvec2(uint(floor(newUV.x)), uint(floor(newUV.y)));

    const elementIndex = uint(gridWidth).mul(pixel.y).add(pixel.x);

    const colorChanger = currentElementsStorage.element(elementIndex);

    const subtracter = float(colorChanger).div(gridWidth.mul(gridHeight));

    const color = vec3(subtracter.oneMinus()).toVar();

    If(
      highlight
        .equal(1)
        .and(not(nextAlgoStorage.element(0).equal(StepType.NONE))),
      () => {
        const boolCheck = int(
          elementIndex
            .mod(nextBlockHeightRead.element(0))
            .lessThan(nextBlockHeightRead.element(0).div(2))
        );
        color.z.assign(
          nextAlgoStorage.element(0).lessThanEqual(StepType.DISPERSE_LOCAL)
        );
        color.x.mulAssign(boolCheck);
        color.y.mulAssign(abs(boolCheck.sub(1)));
      }
    );

    return color;
  });

  material.colorNode = display();

  const plane = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(plane);

  const renderer = new WebGPURenderer({
    antialias: false,
    trackTimestamp: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth / 2, window.innerHeight);

  const animate = () => {
    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(animate);

  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.width = "50%";
  renderer.domElement.style.height = "100%";

  if (forceGlobalSwap) {
    renderer.domElement.style.left = "50%";

    scene.background = new Color(0x212121);
  } else {
    scene.background = new Color(0x313131);
  }

  await renderer.computeAsync(computeInit);

  renderer.info.autoReset = false;

  const stepAnimation = async function () {
    renderer.info.reset();

    if (currentStep !== MAX_STEPS) {
      renderer.compute(computeBitonicStep);

      if (nextStepGlobal) {
        renderer.compute(computeAlignCurrent);
      }

      renderer.compute(computeSetAlgo);

      currentStep++;
    } else {
      renderer.compute(computeResetBuffers);
      renderer.compute(computeResetAlgo);

      currentStep = 0;
    }

    renderer.resolveTimestampsAsync(TimestampQuery.COMPUTE);

    const algo = new Uint32Array(
      await renderer.getArrayBufferAsync(nextAlgoBuffer)
    );
    nextStepGlobal = algo[0] > StepType.DISPERSE_LOCAL;
    const totalSwaps = new Uint32Array(
      await renderer.getArrayBufferAsync(counterBuffer)
    );

    renderer.render(scene, camera);
    renderer.resolveTimestampsAsync(TimestampQuery.RENDER);

    timestamps[forceGlobalSwap ? "global_swap" : "local_swap"].innerHTML = `

							Compute ${forceGlobalSwap ? "Global" : "Local"}: ${
      renderer.info.compute.frameCalls
    } pass in ${renderer.info.compute.timestamp.toFixed(6)}ms<br>
							Total Swaps: ${totalSwaps}<br>
								<div style="display: flex; flex-direction:row; justify-content: center; align-items: center;">
									${forceGlobalSwap ? "Global Swaps" : "Local Swaps"} Compare Region&nbsp;
									<div style="background-color: ${
                    forceGlobalSwap ? globalColors[0] : localColors[0]
                  }; width:12.5px; height: 1em; border-radius: 20%;"></div>
									&nbsp;to Region&nbsp;
									<div style="background-color: ${
                    forceGlobalSwap ? globalColors[1] : localColors[1]
                  }; width:12.5px; height: 1em; border-radius: 20%;"></div>
								</div>`;

    if (currentStep === MAX_STEPS) {
      setTimeout(stepAnimation, 1000);
    } else {
      setTimeout(stepAnimation, 50);
    }
  };

  stepAnimation();

  window.addEventListener("resize", onWindowResize);

  function onWindowResize() {
    renderer.setSize(window.innerWidth / 2, window.innerHeight);

    const aspect = window.innerWidth / 2 / window.innerHeight;

    const frustumHeight = camera.top - camera.bottom;

    camera.left = (-frustumHeight * aspect) / 2;
    camera.right = (frustumHeight * aspect) / 2;

    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }
}
