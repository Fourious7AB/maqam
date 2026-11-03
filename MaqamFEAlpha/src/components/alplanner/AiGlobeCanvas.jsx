import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hyper-Futuristic 3D Holographic AI Neural Globe with Orbiting Airplanes
 * Built with Three.js.
 *
 * Features:
 * - 3D Passenger / Supersonic Airplanes flying surrounding the globe (orbital & route flights)
 * - True 3D airplane models with streamlined fuselage, swept-back wings, vertical tail fin & jet thrusters
 * - Blinking wingtip strobe lights & glowing jet contrails
 * - Tangent orientation: planes naturally bank and point in their direction of flight
 * - Fibonacci Cyber Particle Matrix (1,200 points with emerald, neon & gold gradient)
 * - Digital Latitude & Longitude HUD Grids
 * - 3D Curved Flight Trajectories between global travel hubs
 * - Pulsing Destination Hub Beacons (Makkah, Madinah, Istanbul, Dubai, Delhi, Cairo)
 * - Segmented Sci-Fi Compass HUD Rings with ticking counter-rotation
 * - Sweeping Vertical AI Radar Scanner
 * - Smooth spring-damped Mouse Parallax
 * - Supersonic acceleration during AI "isThinking" state
 */
/**
 * Key Travel Hubs & Sacred Sanctuaries
 */
export const GLOBE_HUBS = [
  { name: "Makkah", icon: "🕋", lat: 21.4, lon: 39.8, color: 0xfbbf24, query: "Plan Umrah package to Makkah with 5-star hotel near Haram" },
  { name: "Madinah", icon: "🕌", lat: 24.5, lon: 39.6, color: 0x34d399, query: "Find historical Ziyarat packages for Madinah" },
  { name: "Dubai", icon: "🏙️", lat: 25.2, lon: 55.3, color: 0x67e8f9, query: "Show 5-day luxury Dubai packages with desert safari" },
  { name: "Istanbul", icon: "🕌", lat: 41.0, lon: 28.9, color: 0x38bdf8, query: "Find 7-day Turkey & Istanbul packages under 70000" },
  { name: "Delhi", icon: "🛫", lat: 28.6, lon: 77.2, color: 0xf59e0b, query: "Find Umrah packages departing from Delhi" },
  { name: "Cairo", icon: "🏛️", lat: 30.0, lon: 31.2, color: 0x10b981, query: "Find packages for Egypt and Cairo historical tour" },
];

export default function AiGlobeCanvas({ isThinking = false, className = "" }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ isThinking });

  useEffect(() => {
    stateRef.current.isThinking = isThinking;
  }, [isThinking]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // ── 1. Scene & Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Master Group (follows mouse parallax)
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Core Globe Group (rotates on Y axis)
    const globeGroup = new THREE.Group();
    masterGroup.add(globeGroup);

    // Airplanes Group (holds all flying planes)
    const planesGroup = new THREE.Group();
    masterGroup.add(planesGroup);

    const radius = 1.38;
    const disposables = [];

    // Helper: Convert Lat/Long to 3D Coordinates on Sphere
    const latLongToVector3 = (lat, lon, r) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    // ── 2. Inner Glowing Core & Wireframe Dodecahedron ──
    const innerCoreGeo = new THREE.SphereGeometry(radius * 0.96, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x022c22,
      transparent: true,
      opacity: 0.35,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    globeGroup.add(innerCore);
    disposables.push(innerCoreGeo, innerCoreMat);

    const dodecaGeo = new THREE.DodecahedronGeometry(radius * 1.01, 1);
    const dodecaMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const dodecaMesh = new THREE.Mesh(dodecaGeo, dodecaMat);
    globeGroup.add(dodecaMesh);
    disposables.push(dodecaGeo, dodecaMat);

    // ── 3. High-Density Cyber Particle Sphere (1,200 points) ──
    const particleCount = 1200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorEmerald = new THREE.Color("#10b981");
    const colorCyan = new THREE.Color("#06b6d4");
    const colorGold = new THREE.Color("#fbbf24");
    const colorNeon = new THREE.Color("#34d399");

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const r = radius + (Math.random() - 0.5) * 0.035;
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const mix = Math.random();
      let c;
      if (mix < 0.55) {
        c = colorEmerald.clone().lerp(colorNeon, Math.random() * 0.4);
      } else if (mix < 0.85) {
        c = colorCyan.clone().lerp(colorEmerald, Math.random() * 0.5);
      } else {
        c = colorGold.clone();
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.046,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });

    const particleSphere = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(particleSphere);
    disposables.push(particleGeo, particleMat);

    // ── 4. Digital Latitude & Longitude HUD Rings ──
    const createLatitudeRing = (latDeg, opacity = 0.16, color = 0x10b981) => {
      const phi = (90 - latDeg) * (Math.PI / 180);
      const rAtLat = radius * Math.sin(phi);
      const yAtLat = radius * Math.cos(phi);
      const segments = 90;
      const points = [];

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            rAtLat * Math.cos(theta),
            yAtLat,
            rAtLat * Math.sin(theta),
          ),
        );
      }

      const ringGeo = new THREE.BufferGeometry().setFromPoints(points);
      const ringMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(ringGeo, ringMat);
      disposables.push(ringGeo, ringMat);
      return line;
    };

    globeGroup.add(createLatitudeRing(0, 0.28, 0x34d399));
    globeGroup.add(createLatitudeRing(23.5, 0.15, 0x06b6d4));
    globeGroup.add(createLatitudeRing(-23.5, 0.15, 0x06b6d4));

    // ── 5. Destination Hub Beacons ──
    const HUBS = GLOBE_HUBS;

    const beaconPings = [];

    HUBS.forEach((hub) => {
      const pos = latLongToVector3(hub.lat, hub.lon, radius);

      const dotGeo = new THREE.SphereGeometry(0.032, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: hub.color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      globeGroup.add(dot);
      disposables.push(dotGeo, dotMat);

      const pingGeo = new THREE.RingGeometry(0.04, 0.075, 24);
      const pingMat = new THREE.MeshBasicMaterial({
        color: hub.color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const ping = new THREE.Mesh(pingGeo, pingMat);
      ping.position.copy(pos);
      ping.lookAt(pos.clone().multiplyScalar(2));
      globeGroup.add(ping);
      disposables.push(pingGeo, pingMat);

      beaconPings.push({ mesh: ping, speed: 1.8 + Math.random() * 0.8 });
    });

    // ── 6. 3D AIRPLANE MODEL BUILDER ──
    const createAirplaneMesh = (
      bodyColor = 0xffffff,
      wingColor = 0x38bdf8,
      engineColor = 0x00f0ff,
      scale = 1.0,
    ) => {
      const plane = new THREE.Group();

      // Fuselage: Streamlined aerodynamic body pointing along +Z
      const bodyGeo = new THREE.ConeGeometry(0.022 * scale, 0.17 * scale, 8);
      bodyGeo.rotateX(Math.PI / 2); // Rotate so cone apex points along +Z (forward)
      const bodyMat = new THREE.MeshBasicMaterial({
        color: bodyColor,
        transparent: true,
        opacity: 0.95,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      plane.add(body);
      disposables.push(bodyGeo, bodyMat);

      // Swept-Back Main Wings
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.04 * scale);
      wingShape.lineTo(0.14 * scale, -0.05 * scale);
      wingShape.lineTo(0.12 * scale, -0.075 * scale);
      wingShape.lineTo(0, -0.03 * scale);
      wingShape.lineTo(-0.12 * scale, -0.075 * scale);
      wingShape.lineTo(-0.14 * scale, -0.05 * scale);
      wingShape.closePath();

      const wingGeo = new THREE.ShapeGeometry(wingShape);
      wingGeo.rotateX(-Math.PI / 2); // Lay flat on XZ plane
      const wingMat = new THREE.MeshBasicMaterial({
        color: wingColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.position.set(0, 0, 0.01 * scale);
      plane.add(wings);
      disposables.push(wingGeo, wingMat);

      // Vertical Tail Fin
      const tailShape = new THREE.Shape();
      tailShape.moveTo(0, 0);
      tailShape.lineTo(0, 0.048 * scale);
      tailShape.lineTo(-0.04 * scale, 0);
      tailShape.closePath();

      const tailGeo = new THREE.ShapeGeometry(tailShape);
      tailGeo.rotateY(Math.PI / 2);
      const tailMat = new THREE.MeshBasicMaterial({
        color: wingColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, 0.005 * scale, -0.06 * scale);
      plane.add(tail);
      disposables.push(tailGeo, tailMat);

      // Dual Glowing Jet Thrusters
      const thrusterGeo = new THREE.SphereGeometry(0.014 * scale, 8, 8);
      const thrusterMat = new THREE.MeshBasicMaterial({
        color: engineColor,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
      const leftEngine = new THREE.Mesh(thrusterGeo, thrusterMat);
      leftEngine.position.set(-0.045 * scale, -0.008 * scale, -0.055 * scale);
      const rightEngine = new THREE.Mesh(thrusterGeo, thrusterMat);
      rightEngine.position.set(0.045 * scale, -0.008 * scale, -0.055 * scale);
      plane.add(leftEngine);
      plane.add(rightEngine);
      disposables.push(thrusterGeo, thrusterMat);

      // Wingtip Navigation Strobes (Red Left, Green Right)
      const strobeGeo = new THREE.SphereGeometry(0.008 * scale, 6, 6);
      const strobeRedMat = new THREE.MeshBasicMaterial({
        color: 0xff3b30,
        blending: THREE.AdditiveBlending,
      });
      const strobeGreenMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        blending: THREE.AdditiveBlending,
      });
      const leftStrobe = new THREE.Mesh(strobeGeo, strobeRedMat);
      leftStrobe.position.set(-0.138 * scale, 0, -0.05 * scale);
      const rightStrobe = new THREE.Mesh(strobeGeo, strobeGreenMat);
      rightStrobe.position.set(0.138 * scale, 0, -0.05 * scale);
      plane.add(leftStrobe);
      plane.add(rightStrobe);
      disposables.push(strobeGeo, strobeRedMat, strobeGreenMat);

      return {
        plane,
        leftStrobe,
        rightStrobe,
        engines: [leftEngine, rightEngine],
      };
    };

    // ── 7. 3D Hub-to-Hub Flight Routes with Airplanes ──
    const FLIGHT_ROUTES = [
      {
        from: HUBS[4],
        to: HUBS[0],
        color: 0x34d399,
        name: "DEL-JED",
        planeColor: 0xffffff,
        wingColor: 0x10b981,
      }, // Delhi -> Makkah
      {
        from: HUBS[4],
        to: HUBS[2],
        color: 0x38bdf8,
        name: "DEL-IST",
        planeColor: 0xffffff,
        wingColor: 0x0284c7,
      }, // Delhi -> Istanbul
      {
        from: HUBS[2],
        to: HUBS[3],
        color: 0xfbbf24,
        name: "IST-DXB",
        planeColor: 0xffffff,
        wingColor: 0xf59e0b,
      }, // Istanbul -> Dubai
      {
        from: HUBS[3],
        to: HUBS[0],
        color: 0x10b981,
        name: "DXB-JED",
        planeColor: 0xffffff,
        wingColor: 0x34d399,
      }, // Dubai -> Makkah
      {
        from: HUBS[0],
        to: HUBS[1],
        color: 0x6ee7b7,
        name: "JED-MED",
        planeColor: 0xffffff,
        wingColor: 0x059669,
      }, // Makkah -> Madinah
      {
        from: HUBS[5],
        to: HUBS[1],
        color: 0x06b6d4,
        name: "CAI-MED",
        planeColor: 0xffffff,
        wingColor: 0x06b6d4,
      }, // Cairo -> Madinah
    ];

    const routePlanes = [];

    FLIGHT_ROUTES.forEach((route, idx) => {
      const p1 = latLongToVector3(route.from.lat, route.from.lon, radius);
      const p2 = latLongToVector3(route.to.lat, route.to.lon, radius);

      // Midpoint arched upward to high cruising altitude
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const arcAltitude = radius + Math.max(0.35, dist * 0.42);
      mid.normalize().multiplyScalar(arcAltitude);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const curvePoints = curve.getPoints(60);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const curveMat = new THREE.LineBasicMaterial({
        color: route.color,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      const arcLine = new THREE.Line(curveGeo, curveMat);
      globeGroup.add(arcLine);
      disposables.push(curveGeo, curveMat);

      // Build 3D Airplane for this route
      const { plane, leftStrobe, rightStrobe, engines } = createAirplaneMesh(
        route.planeColor,
        route.wingColor,
        route.color,
        1.05,
      );
      globeGroup.add(plane);

      routePlanes.push({
        plane,
        curve,
        leftStrobe,
        rightStrobe,
        engines,
        speed: 0.12 + (idx % 3) * 0.03,
        offset: idx * 0.22,
      });
    });

    // ── 8. ORBITAL PLANES (Circling surrounding the entire globe) ──
    const orbitalPlanes = [];

    const ORBIT_CONFIGS = [
      {
        r: 1.88,
        tiltX: 0.52,
        tiltY: 0.25,
        speed: 0.38,
        color: 0x38bdf8,
        wingColor: 0x0284c7,
      },
      {
        r: 2.14,
        tiltX: -0.68,
        tiltY: -0.42,
        speed: -0.32,
        color: 0x34d399,
        wingColor: 0x059669,
      },
      {
        r: 1.76,
        tiltX: 0.95,
        tiltY: -0.65,
        speed: 0.44,
        color: 0xfbbf24,
        wingColor: 0xd97706,
      },
    ];

    ORBIT_CONFIGS.forEach((cfg) => {
      // Orbital flight corridor ring
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      const segs = 100;
      for (let i = 0; i <= segs; i++) {
        const theta = (i / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            cfg.r * Math.cos(theta),
            0,
            cfg.r * Math.sin(theta),
          ),
        );
      }
      ringGeo.setFromPoints(points);
      const ringMat = new THREE.LineBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Line(ringGeo, ringMat);
      ring.rotation.x = cfg.tiltX;
      ring.rotation.y = cfg.tiltY;
      planesGroup.add(ring);
      disposables.push(ringGeo, ringMat);

      // 3D Airplane flying along this orbit
      const { plane, leftStrobe, rightStrobe, engines } = createAirplaneMesh(
        0xffffff,
        cfg.wingColor,
        cfg.color,
        1.18,
      );
      planesGroup.add(plane);

      orbitalPlanes.push({
        plane,
        radius: cfg.r,
        tiltX: cfg.tiltX,
        tiltY: cfg.tiltY,
        speed: cfg.speed,
        leftStrobe,
        rightStrobe,
        engines,
        angle: Math.random() * Math.PI * 2,
      });
    });

    // ── 9. Outer Sci-Fi Segmented HUD Compass Rings ──
    const createSegmentedHudRing = (
      ringRadius,
      tiltX,
      tiltZ,
      colorHex,
      segmentCount = 48,
    ) => {
      const ringGroup = new THREE.Group();
      ringGroup.rotation.x = tiltX;
      ringGroup.rotation.z = tiltZ;

      const lineGeo = new THREE.BufferGeometry();
      const linePos = [];

      for (let i = 0; i < segmentCount; i++) {
        if (i % 2 === 0) continue;
        const a1 = (i / segmentCount) * Math.PI * 2;
        const a2 = ((i + 0.6) / segmentCount) * Math.PI * 2;

        linePos.push(ringRadius * Math.cos(a1), 0, ringRadius * Math.sin(a1));
        linePos.push(ringRadius * Math.cos(a2), 0, ringRadius * Math.sin(a2));
      }

      lineGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePos, 3),
      );
      const lineMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });

      const ringMesh = new THREE.LineSegments(lineGeo, lineMat);
      ringGroup.add(ringMesh);
      disposables.push(lineGeo, lineMat);

      return ringGroup;
    };

    const hudRing1 = createSegmentedHudRing(2.05, 0.48, 0.28, 0x34d399, 64);
    const hudRing2 = createSegmentedHudRing(2.32, -0.65, -0.38, 0x38bdf8, 72);
    masterGroup.add(hudRing1);
    masterGroup.add(hudRing2);

    // ── 10. Sweeping Radar Scanner ──
    const scanRingGeo = new THREE.RingGeometry(
      radius * 0.98,
      radius * 1.05,
      64,
    );
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanRing.rotation.x = Math.PI / 2;
    globeGroup.add(scanRing);
    disposables.push(scanRingGeo, scanRingMat);

    // ── 11. Ambient Cosmic Dust ──
    const dustCount = 280;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 7.5;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 7.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.028,
      color: 0xa7f3d0,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    disposables.push(dustGeo, dustMat);

    // ── 12. Mouse Interaction & Responsive Parallax ──
    let targetRotX = 0;
    let targetRotY = 0;
    let curRotX = 0;
    let curRotY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.75;
      targetRotX = y * 0.45;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    // ── 13. Dynamic Flight Animation Loop ──
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const isCurrentlyThinking = stateRef.current.isThinking;
      const speedMult = isCurrentlyThinking ? 3.0 : 1.0;

      // Base globe and ring rotations
      globeGroup.rotation.y += 0.005 * speedMult;
      hudRing1.rotation.z += 0.007 * speedMult;
      hudRing2.rotation.z -= 0.006 * speedMult;
      dust.rotation.y += 0.001;

      // Vertical scanner
      scanRing.position.y =
        Math.sin(elapsedTime * 2.2 * speedMult) * (radius * 0.85);
      const scanScale = Math.cos(
        Math.asin(Math.min(0.99, Math.abs(scanRing.position.y / radius))),
      );
      scanRing.scale.set(scanScale, scanScale, 1);

      // Beacon ripples
      beaconPings.forEach((b, i) => {
        const pingTime = (elapsedTime * b.speed + i * 0.4) % 1.0;
        const scale = 1.0 + pingTime * 2.4;
        b.mesh.scale.set(scale, scale, scale);
        b.mesh.material.opacity = Math.max(0, 0.75 * (1.0 - pingTime));
      });

      // Animate Route Planes (Flying between travel hubs)
      routePlanes.forEach((rp) => {
        const t = (elapsedTime * rp.speed * speedMult + rp.offset) % 1.0;
        const pos = rp.curve.getPoint(t);
        const tangent = rp.curve.getTangent(t);

        rp.plane.position.copy(pos);
        // Point airplane nose towards tangent direction of flight
        rp.plane.lookAt(pos.clone().add(tangent));

        // Strobe flash
        const strobeState = Math.sin(elapsedTime * 12) > 0.3;
        rp.leftStrobe.material.opacity = strobeState ? 1.0 : 0.2;
        rp.rightStrobe.material.opacity = strobeState ? 1.0 : 0.2;

        // Pulse jet engines
        const enginePulse = 1.0 + Math.sin(elapsedTime * 18) * 0.25;
        rp.engines.forEach((eng) =>
          eng.scale.set(enginePulse, enginePulse, enginePulse),
        );
      });

      // Animate Orbital Planes (Circling surrounding the entire globe)
      orbitalPlanes.forEach((op) => {
        op.angle += 0.008 * op.speed * speedMult;

        // Position on 2D orbit plane
        const localPos = new THREE.Vector3(
          op.radius * Math.cos(op.angle),
          0,
          op.radius * Math.sin(op.angle),
        );

        // Next position to compute tangent vector
        const delta = 0.02 * Math.sign(op.speed);
        const nextLocalPos = new THREE.Vector3(
          op.radius * Math.cos(op.angle + delta),
          0,
          op.radius * Math.sin(op.angle + delta),
        );

        // Apply tilt rotation
        const rotEuler = new THREE.Euler(op.tiltX, op.tiltY, 0, "XYZ");
        localPos.applyEuler(rotEuler);
        nextLocalPos.applyEuler(rotEuler);

        op.plane.position.copy(localPos);
        op.plane.lookAt(nextLocalPos);

        // Strobe flash
        const strobeState = Math.sin(elapsedTime * 10 + op.angle) > 0.2;
        op.leftStrobe.material.opacity = strobeState ? 1.0 : 0.15;
        op.rightStrobe.material.opacity = strobeState ? 1.0 : 0.15;
      });

      // Neural Core Pulsing
      const pulseScale = isCurrentlyThinking
        ? 1.0 + Math.sin(elapsedTime * 7) * 0.07
        : 1.0 + Math.sin(elapsedTime * 1.6) * 0.025;
      particleSphere.scale.set(pulseScale, pulseScale, pulseScale);
      dodecaMesh.scale.set(pulseScale, pulseScale, pulseScale);

      // Smooth mouse parallax
      curRotX += (targetRotX - curRotX) * 0.055;
      curRotY += (targetRotY - curRotY) * 0.055;
      masterGroup.rotation.x = curRotX;
      masterGroup.rotation.y = curRotY * 0.6;
      masterGroup.rotation.z = -curRotY * 0.25;

      renderer.render(scene, camera);
    };

    animate();

    // ── 14. Cleanup ──
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      disposables.forEach((item) => {
        if (item && typeof item.dispose === "function") {
          item.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full flex items-center justify-center pointer-events-none ${className}`}
    />
  );
}
