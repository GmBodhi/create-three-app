import "./style.css"; // For webpack support

import {
  Vector2,
  PlaneGeometry,
  SphereGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  CylinderGeometry,
  BoxGeometry,
  LatheGeometry,
  TorusGeometry,
  TorusKnotGeometry,
} from "three";

import { UVsDebug } from "three/addons/utils/UVsDebug.js";

/*
 * This is to help debug UVs problems in geometry,
 * as well as allow a new user to visualize what UVs are about.
 */

function test(name, geometry) {
  const d = document.createElement("div");

  d.innerHTML = "<h3>" + name + "</h3>";

  d.appendChild(UVsDebug(geometry));

  document.body.appendChild(d);
}

const points = [];

for (let i = 0; i < 10; i++) {
  points.push(new Vector2(Math.sin(i * 0.2) * 15 + 50, (i - 5) * 2));
}

//

test("new PlaneGeometry( 100, 100, 4, 4 )", new PlaneGeometry(100, 100, 4, 4));

test("new SphereGeometry( 75, 12, 6 )", new SphereGeometry(75, 12, 6));

test("new IcosahedronGeometry( 30, 1 )", new IcosahedronGeometry(30, 1));

test("new OctahedronGeometry( 30, 2 )", new OctahedronGeometry(30, 2));

test(
  "new CylinderGeometry( 25, 75, 100, 10, 5 )",
  new CylinderGeometry(25, 75, 100, 10, 5)
);

test(
  "new BoxGeometry( 100, 100, 100, 4, 4, 4 )",
  new BoxGeometry(100, 100, 100, 4, 4, 4)
);

test("new LatheGeometry( points, 8 )", new LatheGeometry(points, 8));

test("new TorusGeometry( 50, 20, 8, 8 )", new TorusGeometry(50, 20, 8, 8));

test(
  "new TorusKnotGeometry( 50, 10, 12, 6 )",
  new TorusKnotGeometry(50, 10, 12, 6)
);
