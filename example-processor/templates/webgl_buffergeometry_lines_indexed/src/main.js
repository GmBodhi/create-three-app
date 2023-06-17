import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  BufferGeometry,
  LineBasicMaterial,
  Vector3,
  Float32BufferAttribute,
  LineSegments,
  Object3D,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let container, stats;

let camera, scene, renderer;

let parent_node;

init();
animate();

function init() {
  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 9000;

  scene = new Scene();

  const geometry = new BufferGeometry();
  const material = new LineBasicMaterial({ vertexColors: true });

  const indices = [];
  const positions = [];
  const colors = [];

  let next_positions_index = 0;

  //

  const iteration_count = 4;
  const rangle = (60 * Math.PI) / 180.0;

  function add_vertex(v) {
    if (next_positions_index == 0xffff) console.error("Too many points.");

    positions.push(v.x, v.y, v.z);
    colors.push(Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1);

    return next_positions_index++;
  }

  // simple Koch curve

  function snowflake_iteration(p0, p4, depth) {
    if (--depth < 0) {
      const i = next_positions_index - 1; // p0 already there
      add_vertex(p4);
      indices.push(i, i + 1);

      return;
    }

    const v = p4.clone().sub(p0);
    const v_tier = v.clone().multiplyScalar(1 / 3);
    const p1 = p0.clone().add(v_tier);

    const angle = Math.atan2(v.y, v.x) + rangle;
    const length = v_tier.length();
    const p2 = p1.clone();
    p2.x += Math.cos(angle) * length;
    p2.y += Math.sin(angle) * length;

    const p3 = p0.clone().add(v_tier).add(v_tier);

    snowflake_iteration(p0, p1, depth);
    snowflake_iteration(p1, p2, depth);
    snowflake_iteration(p2, p3, depth);
    snowflake_iteration(p3, p4, depth);
  }

  function snowflake(points, loop, x_offset) {
    for (let iteration = 0; iteration != iteration_count; iteration++) {
      add_vertex(points[0]);

      for (
        let p_index = 0, p_count = points.length - 1;
        p_index != p_count;
        p_index++
      ) {
        snowflake_iteration(points[p_index], points[p_index + 1], iteration);
      }

      if (loop)
        snowflake_iteration(points[points.length - 1], points[0], iteration);

      // translate input curve for next iteration

      for (
        let p_index = 0, p_count = points.length;
        p_index != p_count;
        p_index++
      ) {
        points[p_index].x += x_offset;
      }
    }
  }

  let y = 0;

  snowflake([new Vector3(0, y, 0), new Vector3(500, y, 0)], false, 600);

  y += 600;
  snowflake(
    [
      new Vector3(0, y, 0),
      new Vector3(250, y + 400, 0),
      new Vector3(500, y, 0),
    ],
    true,
    600
  );

  y += 600;
  snowflake(
    [
      new Vector3(0, y, 0),
      new Vector3(500, y, 0),
      new Vector3(500, y + 500, 0),
      new Vector3(0, y + 500, 0),
    ],
    true,
    600
  );

  y += 1000;
  snowflake(
    [
      new Vector3(250, y, 0),
      new Vector3(500, y, 0),
      new Vector3(250, y, 0),
      new Vector3(250, y + 250, 0),
      new Vector3(250, y, 0),
      new Vector3(0, y, 0),
      new Vector3(250, y, 0),
      new Vector3(250, y - 250, 0),
      new Vector3(250, y, 0),
    ],
    false,
    600
  );

  //

  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const lineSegments = new LineSegments(geometry, material);
  lineSegments.position.x -= 1200;
  lineSegments.position.y -= 1200;

  parent_node = new Object3D();
  parent_node.add(lineSegments);

  scene.add(parent_node);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;

  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

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
  const time = Date.now() * 0.001;

  parent_node.rotation.z = time * 0.5;

  renderer.render(scene, camera);
}
