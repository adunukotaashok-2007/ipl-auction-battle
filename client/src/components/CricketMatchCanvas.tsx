import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './CricketMatchCanvas.css';

type DeliveryInput = {
  zone: PitchZone;
  line: PitchLine;
  speed: number;
};

type ShotInput = {
  direction: ShotDirection;
  shotType: ShotType;
  timing: number;
};

type PitchZone =
  | 'YORKER'
  | 'FULL'
  | 'GOOD_LENGTH'
  | 'SHORT'
  | 'BOUNCER';

type PitchLine =
  | 'WIDE_OFF'
  | 'OFF'
  | 'MIDDLE'
  | 'LEG'
  | 'WIDE_LEG';

type ShotDirection =
  | 'STRAIGHT'
  | 'COVER'
  | 'POINT'
  | 'SQUARE_LEG'
  | 'MID_WICKET'
  | 'FINE_LEG';

type ShotType =
  | 'GROUND'
  | 'LOFT'
  | 'DRIVE'
  | 'CUT'
  | 'PULL'
  | 'SWEEP';

type Props = {
  isBatting: boolean;
  isBowling: boolean;
  phase: string;
  battingTeamName: string;
  bowlingTeamName: string;
  strikerName: string;
  bowlerName: string;
  onDeliverySubmit: (delivery: DeliveryInput) => void;
  onShotSubmit: (shot: ShotInput) => void;
};

type PlayerRig = {
  root: THREE.Group;
  bat: THREE.Group | null;
  body: THREE.Object3D;
};

type SceneState = {
  phase: string;
  isBatting: boolean;
  isBowling: boolean;
  battingTeamName: string;
  bowlingTeamName: string;
  strikerName: string;
  bowlerName: string;
  selectedDirection: ShotDirection;
  selectedShotType: ShotType;
  timing: number;
};

const PITCH_LENGTH = 26;
const BATTER_Z = 8.5;
const BOWLER_Z = -8.5;
const BOUNDARY_RADIUS = 33;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function teamColor(name: string, fallback: number): number {
  if (!name) return fallback;

  const hue = (hashString(name) % 360) / 360;

  return new THREE.Color()
    .setHSL(hue, 0.72, 0.48)
    .getHex();
}

function createMaterial(
  color: number,
  roughness = 0.75,
  metalness = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    position[0],
    position[1],
    position[2]
  );

  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  group.add(mesh);

  return mesh;
}

function createPlayer(
  jerseyColor: number,
  options?: {
    batsman?: boolean;
    scale?: number;
    crouched?: boolean;
  }
): PlayerRig {
  const group = new THREE.Group();

  const scale = options?.scale ?? 1;
  const batsman = options?.batsman ?? false;
  const crouched = options?.crouched ?? false;

  group.scale.setScalar(scale);

  const skin = createMaterial(0xc98762, 0.8);
  const jersey = createMaterial(jerseyColor, 0.7);
  const dark = createMaterial(0x171717, 0.65);
  const white = createMaterial(0xf4f4f4, 0.6);
  const shoe = createMaterial(0x101010, 0.8);
  const batMaterial = createMaterial(0xc8914d, 0.65);

  const bodyHeight = crouched ? 0.72 : 0.95;

  const body = addMesh(
    group,
    new THREE.BoxGeometry(0.58, bodyHeight, 0.38),
    jersey,
    [0, crouched ? 1.05 : 1.2, 0]
  );

  // Neck
  addMesh(
    group,
    new THREE.CylinderGeometry(0.09, 0.1, 0.16, 10),
    skin,
    [0, crouched ? 1.47 : 1.72, 0]
  );

  // Head
  const headY = crouched ? 1.72 : 1.98;

  addMesh(
    group,
    new THREE.SphereGeometry(0.27, 16, 12),
    skin,
    [0, headY, 0]
  );

  // Hair
  addMesh(
    group,
    new THREE.SphereGeometry(0.275, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
    [0, headY + 0.03, 0]
  );

  // Simple nose
  addMesh(
    group,
    new THREE.SphereGeometry(0.045, 8, 8),
    skin,
    [0, headY - 0.01, 0.265]
  );

  // Arms
  const armY = crouched ? 1.12 : 1.28;

  const leftArm = addMesh(
    group,
    new THREE.CylinderGeometry(0.07, 0.085, 0.72, 8),
    jersey,
    [-0.39, armY, 0]
  );

  const rightArm = addMesh(
    group,
    new THREE.CylinderGeometry(0.07, 0.085, 0.72, 8),
    jersey,
    [0.39, armY, 0]
  );

  leftArm.rotation.z = -0.15;
  rightArm.rotation.z = 0.15;

  // Legs
  const legY = crouched ? 0.58 : 0.47;

  addMesh(
    group,
    new THREE.CylinderGeometry(0.09, 0.1, 0.88, 8),
    dark,
    [-0.16, legY, 0]
  );

  addMesh(
    group,
    new THREE.CylinderGeometry(0.09, 0.1, 0.88, 8),
    dark,
    [0.16, legY, 0]
  );

  // Shoes
  addMesh(
    group,
    new THREE.BoxGeometry(0.25, 0.12, 0.42),
    shoe,
    [-0.16, 0.06, 0.05]
  );

  addMesh(
    group,
    new THREE.BoxGeometry(0.25, 0.12, 0.42),
    shoe,
    [0.16, 0.06, 0.05]
  );

  let bat: THREE.Group | null = null;

  if (batsman) {
    // Cricket helmet
    addMesh(
      group,
      new THREE.SphereGeometry(
        0.31,
        16,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.65
      ),
      dark,
      [0, headY + 0.02, 0]
    );

    // Helmet grille
    for (let i = -2; i <= 2; i += 1) {
      const grille = addMesh(
        group,
        new THREE.CylinderGeometry(0.012, 0.012, 0.38, 6),
        dark,
        [i * 0.055, headY - 0.05, 0.28],
        true,
        false
      );

      grille.rotation.x = Math.PI / 2;
    }

    // Bat
    bat = new THREE.Group();

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 1.35, 0.08),
      batMaterial
    );

    blade.position.y = 0.65;
    blade.castShadow = true;

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.45, 8),
      dark
    );

    handle.position.y = 1.48;
    handle.castShadow = true;

    bat.add(blade);
    bat.add(handle);

    bat.position.set(
      0.48,
      0.75,
      0.2
    );

    bat.rotation.z = -0.35;

    group.add(bat);

    // Batting pads
    addMesh(
      group,
      new THREE.BoxGeometry(0.22, 0.72, 0.18),
      white,
      [-0.16, 0.48, 0.13]
    );

    addMesh(
      group,
      new THREE.BoxGeometry(0.22, 0.72, 0.18),
      white,
      [0.16, 0.48, 0.13]
    );
  }

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return {
    root: group,
    bat,
    body,
  };
}

function createStumps(
  scene: THREE.Scene,
  z: number
): THREE.Group {
  const group = new THREE.Group();

  const wood = createMaterial(0xe4b45e, 0.7);

  for (let i = -1; i <= 1; i += 1) {
    addMesh(
      group,
      new THREE.CylinderGeometry(0.045, 0.055, 1.0, 10),
      wood,
      [i * 0.12, 0.5, z]
    );
  }

  addMesh(
    group,
    new THREE.BoxGeometry(0.25, 0.035, 0.055),
    wood,
    [-0.06, 1.02, z],
    true,
    true
  );

  addMesh(
    group,
    new THREE.BoxGeometry(0.25, 0.035, 0.055),
    wood,
    [0.06, 1.02, z],
    true,
    true
  );

  scene.add(group);

  return group;
}

function createBall(): THREE.Group {
  const ballGroup = new THREE.Group();

  const red = createMaterial(0xa71919, 0.45);
  const white = createMaterial(0xffffff, 0.4);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 20, 16),
    red
  );

  ball.castShadow = true;

  ballGroup.add(ball);

  const seam1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.012, 6, 24),
    white
  );

  seam1.rotation.x = Math.PI / 2;

  ballGroup.add(seam1);

  const seam2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.012, 6, 24),
    white
  );

  seam2.rotation.y = Math.PI / 2;

  ballGroup.add(seam2);

  ballGroup.visible = false;

  return ballGroup;
}

function createStadium(
  scene: THREE.Scene,
  battingTeamName: string,
  bowlingTeamName: string
): void {
  const fieldMaterial = createMaterial(0x176b36, 0.95);
  const pitchMaterial = createMaterial(0xc6a36a, 0.95);

  // Main field
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(46, 96),
    fieldMaterial
  );

  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;

  scene.add(field);

  // Grass stripes
  for (let i = -8; i <= 8; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 3),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x1b743b : 0x176b36,
        roughness: 1,
      })
    );

    stripe.rotation.x = -Math.PI / 2;
    stripe.position.z = i * 4.5;
    stripe.position.y = 0.01;

    scene.add(stripe);
  }

  // Pitch
  const pitch = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.12, PITCH_LENGTH),
    pitchMaterial
  );

  pitch.position.y = 0.08;
  pitch.receiveShadow = true;
  pitch.castShadow = true;

  scene.add(pitch);

  // Pitch side lines
  const lineMaterial = createMaterial(0xf4f4f4, 0.55);

  const leftPitchLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.025, PITCH_LENGTH),
    lineMaterial
  );

  leftPitchLine.position.set(-1.98, 0.16, 0);

  scene.add(leftPitchLine);

  const rightPitchLine = leftPitchLine.clone();

  rightPitchLine.position.x = 1.98;

  scene.add(rightPitchLine);

  // Creases
  const creasePositions = [
    BATTER_Z - 1.1,
    BATTER_Z - 0.25,
    BOWLER_Z + 0.25,
    BOWLER_Z + 1.1,
  ];

  for (const z of creasePositions) {
    const crease = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.025, 0.06),
      lineMaterial
    );

    crease.position.set(0, 0.17, z);

    scene.add(crease);
  }

  createStumps(scene, BATTER_Z);
  createStumps(scene, BOWLER_Z);

  // Boundary rope
  const boundaryMaterial = createMaterial(0xffffff, 0.5);

  const boundary = new THREE.Mesh(
    new THREE.TorusGeometry(
      BOUNDARY_RADIUS,
      0.16,
      8,
      128
    ),
    boundaryMaterial
  );

  boundary.rotation.x = -Math.PI / 2;
  boundary.position.y = 0.2;

  scene.add(boundary);

  // Stadium seating rings
  const standMaterials = [
    createMaterial(0x273449, 0.85),
    createMaterial(0x34465d, 0.85),
    createMaterial(0x1e2938, 0.85),
  ];

  for (let row = 0; row < 3; row += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        38 + row * 2.2,
        1.3,
        8,
        96
      ),
      standMaterials[row]
    );

    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1.0 + row * 1.25;

    scene.add(ring);
  }

  // Crowd blocks
  for (let i = 0; i < 36; i += 1) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 40;

    const block = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.8, 2.5),
      createMaterial(
        i % 3 === 0 ? 0x43536a : 0x29374a,
        0.9
      )
    );

    block.position.set(
      Math.cos(angle) * radius,
      3.0,
      Math.sin(angle) * radius
    );

    block.rotation.y = -angle;

    block.castShadow = true;
    block.receiveShadow = true;

    scene.add(block);
  }

  // Floodlight towers
  const towerPositions = [
    [-31, -27],
    [31, -27],
    [-31, 27],
    [31, 27],
  ];

  for (const [x, z] of towerPositions) {
    const tower = new THREE.Group();

    addMesh(
      tower,
      new THREE.CylinderGeometry(0.16, 0.22, 9, 10),
      createMaterial(0x4a4f57, 0.8, 0.2),
      [0, 4.5, 0]
    );

    addMesh(
      tower,
      new THREE.BoxGeometry(1.5, 0.7, 0.3),
      createMaterial(0xe8edf2, 0.45),
      [0, 8.7, 0]
    );

    tower.position.set(x, 0, z);

    scene.add(tower);

    const light = new THREE.PointLight(
      0xffffff,
      80,
      70,
      2
    );

    light.position.set(x, 8.5, z);

    light.castShadow = true;

    scene.add(light);
  }

  // Simple scoreboard boards
  const boardMaterial = createMaterial(0x111827, 0.55);

  const board1 = new THREE.Mesh(
    new THREE.BoxGeometry(10, 4, 0.4),
    boardMaterial
  );

  board1.position.set(0, 4.8, -39);
  board1.rotation.y = Math.PI;

  scene.add(board1);

  const board2 = board1.clone();

  board2.position.z = 39;
  board2.rotation.y = 0;

  scene.add(board2);

  // Team-color banners
  const batColor = teamColor(battingTeamName, 0x1565c0);
  const bowlColor = teamColor(bowlingTeamName, 0xc62828);

  const banner1 = new THREE.Mesh(
    new THREE.BoxGeometry(9, 1.1, 0.08),
    createMaterial(batColor, 0.6)
  );

  banner1.position.set(0, 5.3, -38.75);

  scene.add(banner1);

  const banner2 = new THREE.Mesh(
    new THREE.BoxGeometry(9, 1.1, 0.08),
    createMaterial(bowlColor, 0.6)
  );

  banner2.position.set(0, 5.3, 38.75);

  scene.add(banner2);
}

function createFielders(
  scene: THREE.Scene,
  bowlingTeamName: string
): PlayerRig[] {
  const color = teamColor(bowlingTeamName, 0x1565c0);

  const positions: Array<[number, number, number]> = [
    [-11, 2.5, 0.82],
    [11, 2.5, 0.82],
    [-16, -3, 0.75],
    [16, -3, 0.75],
    [-20, 7, 0.72],
    [20, 7, 0.72],
    [-14, 15, 0.7],
    [14, 15, 0.7],
    [0, 22, 0.7],
  ];

  const rigs: PlayerRig[] = [];

  positions.forEach(([x, z, scale], index) => {
    const rig = createPlayer(color, {
      scale,
      crouched: index < 2,
    });

    rig.root.position.set(x, 0, z);

    const direction = Math.atan2(-x, -z);
    rig.root.rotation.y = direction;

    scene.add(rig.root);

    rigs.push(rig);
  });

  return rigs;
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.geometry.dispose();

    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else {
      object.material.dispose();
    }
  });
}

const CricketMatchCanvas: React.FC<Props> = ({
  isBatting,
  isBowling,
  phase,
  battingTeamName,
  bowlingTeamName,
  strikerName,
  bowlerName,
  onDeliverySubmit,
  onShotSubmit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  const ballRef = useRef<THREE.Group | null>(null);
  const batterRef = useRef<PlayerRig | null>(null);
  const bowlerRef = useRef<PlayerRig | null>(null);

  const fieldersRef = useRef<PlayerRig[]>([]);

  const flightProgressRef = useRef(0);
  const resultProgressRef = useRef(0);

  const [selectedZone, setSelectedZone] =
    useState<PitchZone>('GOOD_LENGTH');

  const [selectedLine, setSelectedLine] =
    useState<PitchLine>('MIDDLE');

  const [bowlingSpeed, setBowlingSpeed] =
    useState(135);

  const [selectedDirection, setSelectedDirection] =
    useState<ShotDirection>('STRAIGHT');

  const [selectedShotType, setSelectedShotType] =
    useState<ShotType>('GROUND');

  const [timing, setTiming] = useState(50);

  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef<SceneState>({
    phase,
    isBatting,
    isBowling,
    battingTeamName,
    bowlingTeamName,
    strikerName,
    bowlerName,
    selectedDirection,
    selectedShotType,
    timing,
  });

  const callbacksRef = useRef({
    onDeliverySubmit,
    onShotSubmit,
  });

  useEffect(() => {
    stateRef.current = {
      phase,
      isBatting,
      isBowling,
      battingTeamName,
      bowlingTeamName,
      strikerName,
      bowlerName,
      selectedDirection,
      selectedShotType,
      timing,
    };
  }, [
    phase,
    isBatting,
    isBowling,
    battingTeamName,
    bowlingTeamName,
    strikerName,
    bowlerName,
    selectedDirection,
    selectedShotType,
    timing,
  ]);

  useEffect(() => {
    callbacksRef.current = {
      onDeliverySubmit,
      onShotSubmit,
    };
  }, [onDeliverySubmit, onShotSubmit]);

  useEffect(() => {
    flightProgressRef.current = 0;
    resultProgressRef.current = 0;

    if (ballRef.current) {
      ballRef.current.visible =
        phase === 'BALL_IN_FLIGHT' ||
        phase === 'RESULT_SHOWCASE';
    }
  }, [phase]);

  const handleDeliverBall = () => {
    if (!isBowling || phase !== 'AWAITING_DELIVERY') {
      return;
    }

    callbacksRef.current.onDeliverySubmit({
      zone: selectedZone,
      line: selectedLine,
      speed: bowlingSpeed,
    });
  };

  const handlePlayShot = () => {
    if (!isBatting) {
      return;
    }

    if (
      phase !== 'BALL_IN_FLIGHT' &&
      phase !== 'AWAITING_DELIVERY'
    ) {
      return;
    }

    callbacksRef.current.onShotSubmit({
      direction: selectedDirection,
      shotType: selectedShotType,
      timing,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) {
      return;
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    rendererRef.current = renderer;

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x07111f);

    scene.fog = new THREE.Fog(
      0x07111f,
      38,
      90
    );

    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      48,
      1,
      0.1,
      150
    );

    camera.position.set(
      0,
      9.5,
      18
    );

    camera.lookAt(
      0,
      1,
      -2
    );

    cameraRef.current = camera;

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(
      0x9cc9ff,
      0x18351e,
      2.0
    );

    scene.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(
      0xffffff,
      3.2
    );

    sunLight.position.set(
      -12,
      24,
      12
    );

    sunLight.castShadow = true;

    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;

    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;

    scene.add(sunLight);

    createStadium(
      scene,
      stateRef.current.battingTeamName,
      stateRef.current.bowlingTeamName
    );

    // Batter
    const batterColor = teamColor(
      stateRef.current.battingTeamName,
      0xc62828
    );

    const batter = createPlayer(
      batterColor,
      {
        batsman: true,
        scale: 1.15,
      }
    );

    batter.root.position.set(
      0,
      0,
      BATTER_Z
    );

    batter.root.rotation.y = Math.PI;

    scene.add(batter.root);

    batterRef.current = batter;

    // Bowler
    const bowlerColor = teamColor(
      stateRef.current.bowlingTeamName,
      0x1565c0
    );

    const bowler = createPlayer(
      bowlerColor,
      {
        scale: 1.08,
      }
    );

    bowler.root.position.set(
      0,
      0,
      BOWLER_Z
    );

    bowler.root.rotation.y = 0;

    scene.add(bowler.root);

    bowlerRef.current = bowler;

    // Wicket keeper
    const keeper = createPlayer(
      bowlerColor,
      {
        scale: 0.88,
        crouched: true,
      }
    );

    keeper.root.position.set(
      0,
      0,
      BATTER_Z + 1.8
    );

    keeper.root.rotation.y = Math.PI;

    scene.add(keeper.root);

    fieldersRef.current =
      createFielders(
        scene,
        stateRef.current.bowlingTeamName
      );

    const ball = createBall();

    scene.add(ball);

    ballRef.current = ball;

    const clock = new THREE.Clock();

    const resize = () => {
      const width = Math.max(
        1,
        wrapper.clientWidth
      );

      const height = Math.max(
        1,
        wrapper.clientHeight
      );

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height,
        false
      );
    };

    resize();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(resize)
        : null;

    resizeObserver?.observe(wrapper);

    window.addEventListener(
      'resize',
      resize
    );

    const animate = () => {
      animationFrameRef.current =
        requestAnimationFrame(animate);

      const delta = Math.min(
        clock.getDelta(),
        0.05
      );

      const current =
        stateRef.current;

      const ballObject =
        ballRef.current;

      // -----------------------------
      // BALL FLIGHT
      // -----------------------------
      if (
        current.phase === 'BALL_IN_FLIGHT'
      ) {
        flightProgressRef.current +=
          delta / 1.05;

        const t = clamp(
          flightProgressRef.current,
          0,
          1
        );

        if (ballObject) {
          ballObject.visible = true;

          const startZ = BOWLER_Z;
          const endZ = BATTER_Z;

          const z =
            THREE.MathUtils.lerp(
              startZ,
              endZ,
              t
            );

          const x =
            Math.sin(t * Math.PI * 2) *
            0.18;

          let y =
            0.38 +
            Math.sin(Math.PI * t) *
              2.2;

          // Small bounce near batter
          if (t > 0.62) {
            y +=
              Math.sin(
                ((t - 0.62) / 0.38) *
                  Math.PI
              ) *
              0.28;
          }

          ballObject.position.set(
            x,
            y,
            z
          );

          ballObject.rotation.x +=
            delta * 10;

          ballObject.rotation.z +=
            delta * 8;
        }

        // Bat preparation/swing
        if (batterRef.current?.bat) {
          const swingStart =
            Math.max(
              0,
              (t - 0.62) / 0.38
            );

          batterRef.current.bat.rotation.z =
            -0.35 -
            swingStart *
              (Math.PI * 0.95);
        }
      }

      // -----------------------------
      // RESULT / SHOT FLIGHT
      // -----------------------------
      else if (
        current.phase === 'RESULT_SHOWCASE'
      ) {
        resultProgressRef.current +=
          delta / 1.35;

        const t = clamp(
          resultProgressRef.current,
          0,
          1
        );

        if (ballObject) {
          ballObject.visible = true;

          let directionX = 0;
          let directionZ = -1;

          switch (
            current.selectedDirection
          ) {
            case 'COVER':
              directionX = 0.85;
              directionZ = -0.35;
              break;

            case 'POINT':
              directionX = 1;
              directionZ = 0.05;
              break;

            case 'SQUARE_LEG':
              directionX = -1;
              directionZ = 0.05;
              break;

            case 'MID_WICKET':
              directionX = -0.75;
              directionZ = -0.4;
              break;

            case 'FINE_LEG':
              directionX = -0.65;
              directionZ = 0.75;
              break;

            case 'STRAIGHT':
            default:
              directionX = 0;
              directionZ = -1;
              break;
          }

          const distance =
            current.selectedShotType === 'LOFT'
              ? 42
              : 28;

          const startX = 0;
          const startZ = BATTER_Z;

          const endX =
            directionX * distance;

          const endZ =
            startZ +
            directionZ * distance;

          const x =
            THREE.MathUtils.lerp(
              startX,
              endX,
              t
            );

          const z =
            THREE.MathUtils.lerp(
              startZ,
              endZ,
              t
            );

          const arc =
            current.selectedShotType ===
            'LOFT'
              ? Math.sin(Math.PI * t) *
                8
              : Math.sin(Math.PI * t) *
                1.2;

          const y =
            0.32 + arc;

          ballObject.position.set(
            x,
            y,
            z
          );

          ballObject.rotation.x +=
            delta * 14;

          ballObject.rotation.z +=
            delta * 12;
        }

        if (batterRef.current?.bat) {
          const swing =
            Math.sin(
              Math.min(1, t) * Math.PI
            );

          batterRef.current.bat.rotation.z =
            -0.35 -
            swing * Math.PI;
        }
      }

      // -----------------------------
      // WAITING
      // -----------------------------
      else {
        if (ballObject) {
          ballObject.visible = false;
        }

        if (batterRef.current?.bat) {
          batterRef.current.bat.rotation.z =
            -0.35;
        }
      }

      // Small idle player animation
      const idleTime =
        performance.now() * 0.001;

      if (batterRef.current) {
        batterRef.current.body.position.y =
          Math.sin(idleTime * 2) *
          0.015;
      }

      if (bowlerRef.current) {
        bowlerRef.current.body.position.y =
          Math.sin(
            idleTime * 2 + 1
          ) * 0.012;
      }

      fieldersRef.current.forEach(
        (fielder, index) => {
          fielder.body.position.y =
            Math.sin(
              idleTime * 1.6 +
                index
            ) *
            0.01;
        }
      );

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    return () => {
      if (
        animationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      resizeObserver?.disconnect();

      window.removeEventListener(
        'resize',
        resize
      );

      disposeScene(scene);

      renderer.dispose();

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      ballRef.current = null;
      batterRef.current = null;
      bowlerRef.current = null;
      fieldersRef.current = [];
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="cricket-canvas-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        overflow: 'hidden',
        borderRadius: '18px',
      }}
    >
      <canvas
        ref={canvasRef}
        className="match-canvas"
        aria-label="3D cricket match"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {webglError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(180deg, #07111f, #10291a)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 700,
            textAlign: 'center',
            padding: '20px',
          }}
        >
          3D cricket graphics are not available
          on this device/browser.
        </div>
      )}

      {/* Broadcast information */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          gap: '12px',
        }}
      >
        <div
          style={{
            background:
              'rgba(5, 10, 18, 0.72)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {bowlingTeamName}
          <br />
          <span
            style={{
              opacity: 0.7,
              fontWeight: 500,
            }}
          >
            BOWLER: {bowlerName}
          </span>
        </div>

        <div
          style={{
            background:
              'rgba(5, 10, 18, 0.72)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'right',
          }}
        >
          {battingTeamName}
          <br />
          <span
            style={{
              opacity: 0.7,
              fontWeight: 500,
            }}
          >
            STRIKER: {strikerName}
          </span>
        </div>
      </div>

      {/* Bowling Controls */}
      {isBowling &&
        phase === 'AWAITING_DELIVERY' && (
          <div className="match-controls bowling-controls">
            <div className="control-title">
              BOWLING
            </div>

            <div className="control-row">
              <label>
                Length
                <select
                  value={selectedZone}
                  onChange={(event) =>
                    setSelectedZone(
                      event.target
                        .value as PitchZone
                    )
                  }
                >
                  <option value="YORKER">
                    Yorker
                  </option>
                  <option value="FULL">
                    Full
                  </option>
                  <option value="GOOD_LENGTH">
                    Good Length
                  </option>
                  <option value="SHORT">
                    Short
                  </option>
                  <option value="BOUNCER">
                    Bouncer
                  </option>
                </select>
              </label>

              <label>
                Line
                <select
                  value={selectedLine}
                  onChange={(event) =>
                    setSelectedLine(
                      event.target
                        .value as PitchLine
                    )
                  }
                >
                  <option value="WIDE_OFF">
                    Wide Off
                  </option>
                  <option value="OFF">
                    Off
                  </option>
                  <option value="MIDDLE">
                    Middle
                  </option>
                  <option value="LEG">
                    Leg
                  </option>
                  <option value="WIDE_LEG">
                    Wide Leg
                  </option>
                </select>
              </label>
            </div>

            <div className="control-row">
              <label>
                Speed: {bowlingSpeed} km/h
                <input
                  type="range"
                  min="90"
                  max="155"
                  value={bowlingSpeed}
                  onChange={(event) =>
                    setBowlingSpeed(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="primary-control-button"
              onClick={handleDeliverBall}
            >
              🏏 DELIVER BALL
            </button>
          </div>
        )}

      {/* Batting Controls */}
      {isBatting &&
        (
          phase === 'AWAITING_DELIVERY' ||
          phase === 'BALL_IN_FLIGHT'
        ) && (
          <div className="match-controls batting-controls">
            <div className="control-title">
              BATTING
            </div>

            <div className="control-row">
              <label>
                Direction
                <select
                  value={selectedDirection}
                  onChange={(event) =>
                    setSelectedDirection(
                      event.target
                        .value as ShotDirection
                    )
                  }
                >
                  <option value="STRAIGHT">
                    Straight
                  </option>
                  <option value="COVER">
                    Cover
                  </option>
                  <option value="POINT">
                    Point
                  </option>
                  <option value="SQUARE_LEG">
                    Square Leg
                  </option>
                  <option value="MID_WICKET">
                    Mid Wicket
                  </option>
                  <option value="FINE_LEG">
                    Fine Leg
                  </option>
                </select>
              </label>

              <label>
                Shot
                <select
                  value={selectedShotType}
                  onChange={(event) =>
                    setSelectedShotType(
                      event.target
                        .value as ShotType
                    )
                  }
                >
                  <option value="GROUND">
                    Ground
                  </option>
                  <option value="DRIVE">
                    Drive
                  </option>
                  <option value="CUT">
                    Cut
                  </option>
                  <option value="PULL">
                    Pull
                  </option>
                  <option value="SWEEP">
                    Sweep
                  </option>
                  <option value="LOFT">
                    Loft
                  </option>
                </select>
              </label>
            </div>

            <div className="control-row">
              <label>
                Timing: {timing}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={timing}
                  onChange={(event) =>
                    setTiming(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="primary-control-button"
              onClick={handlePlayShot}
            >
              ⚡ PLAY SHOT
            </button>
          </div>
        )}

      {/* Stadium broadcast label */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'rgba(0, 0, 0, 0.58)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        LIVE • 3D CRICKET STADIUM
      </div>
    </div>
  );
};

export default CricketMatchCanvas;
