import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

type ModelRig = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: string | null;
  fallback: boolean;
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

const MODEL_PATHS = {
  batsman: '/models/batsman.glb',
  bowler: '/models/bowler.glb',
  fielder: '/models/fielder.glb',
};

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.max(min, Math.min(max, value));

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function teamColor(
  name: string,
  fallback: number
): number {
  if (!name) return fallback;

  const hue =
    (hashString(name) % 360) / 360;

  return new THREE.Color()
    .setHSL(hue, 0.72, 0.48)
    .getHex();
}

function material(
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
  mat: THREE.Material,
  position: [number, number, number]
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geometry,
    mat
  );

  mesh.position.set(
    position[0],
    position[1],
    position[2]
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  group.add(mesh);

  return mesh;
}

/*
 * Temporary visual fallback.
 *
 * This is only used if a GLB model has not
 * been uploaded yet.
 */
function createFallbackPlayer(
  color: number,
  batsman = false
): ModelRig {
  const root = new THREE.Group();

  const skin = material(0xc98762);
  const jersey = material(color);
  const dark = material(0x111827);
  const white = material(0xf5f5f5);

  addMesh(
    root,
    new THREE.SphereGeometry(
      0.28,
      20,
      16
    ),
    skin,
    [0, 2.05, 0]
  );

  addMesh(
    root,
    new THREE.BoxGeometry(
      0.7,
      1,
      0.42
    ),
    jersey,
    [0, 1.25, 0]
  );

  addMesh(
    root,
    new THREE.CylinderGeometry(
      0.1,
      0.12,
      0.9,
      10
    ),
    dark,
    [-0.17, 0.45, 0]
  );

  addMesh(
    root,
    new THREE.CylinderGeometry(
      0.1,
      0.12,
      0.9,
      10
    ),
    dark,
    [0.17, 0.45, 0]
  );

  addMesh(
    root,
    new THREE.BoxGeometry(
      0.28,
      0.12,
      0.42
    ),
    dark,
    [-0.17, 0.06, 0.05]
  );

  addMesh(
    root,
    new THREE.BoxGeometry(
      0.28,
      0.12,
      0.42
    ),
    dark,
    [0.17, 0.06, 0.05]
  );

  if (batsman) {
    addMesh(
      root,
      new THREE.SphereGeometry(
        0.32,
        20,
        12
      ),
      dark,
      [0, 2.1, 0]
    );

    addMesh(
      root,
      new THREE.BoxGeometry(
        0.16,
        1.5,
        0.08
      ),
      material(0xc8914d),
      [0.48, 1, 0.25]
    );
  }

  return {
    root,
    mixer: null,
    actions: new Map(),
    currentAction: null,
    fallback: true,
  };
}

/*
 * Load a real GLB player model.
 *
 * GLTFLoader supports glTF 2.0 and returns
 * both the scene and animation clips.
 */
async function loadPlayerModel(
  path: string,
  scale: number,
  fallbackColor: number,
  batsman = false
): Promise<ModelRig> {
  const loader = new GLTFLoader();

  try {
    const gltf =
      await loader.loadAsync(path);

    const root =
      new THREE.Group();

    const model = gltf.scene;

    model.traverse((object) => {
      if (
        object instanceof THREE.Mesh
      ) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    model.scale.setScalar(scale);

    root.add(model);

    const mixer =
      gltf.animations.length > 0
        ? new THREE.AnimationMixer(model)
        : null;

    const actions =
      new Map<string, THREE.AnimationAction>();

    if (mixer) {
      gltf.animations.forEach(
        (clip) => {
          const action =
            mixer.clipAction(clip);

          actions.set(
            clip.name.toLowerCase(),
            action
          );
        }
      );
    }

    const rig: ModelRig = {
      root,
      mixer,
      actions,
      currentAction: null,
      fallback: false,
    };

    playAnimation(
      rig,
      [
        'idle',
        'idle breathing',
        'standing',
      ]
    );

    return rig;
  } catch {
    return createFallbackPlayer(
      fallbackColor,
      batsman
    );
  }
}

function findAnimation(
  rig: ModelRig,
  names: string[]
): THREE.AnimationAction | null {
  for (const wanted of names) {
    const wantedLower =
      wanted.toLowerCase();

    for (const [
      name,
      action,
    ] of rig.actions.entries()) {
      if (
        name.includes(wantedLower)
      ) {
        return action;
      }
    }
  }

  return null;
}

function playAnimation(
  rig: ModelRig | null,
  names: string[]
): void {
  if (!rig || !rig.mixer) {
    return;
  }

  const action =
    findAnimation(rig, names);

  if (!action) {
    return;
  }

  if (
    rig.currentAction &&
    rig.currentAction ===
      action.getClip().name
  ) {
    return;
  }

  const previous =
    rig.currentAction
      ? rig.actions.get(
          rig.currentAction
        )
      : null;

  if (previous) {
    previous.fadeOut(0.2);
  }

  action.reset();
  action.fadeIn(0.2);
  action.play();

  rig.currentAction =
    action.getClip().name;
}

function createStumps(
  scene: THREE.Scene,
  z: number
): THREE.Group {
  const group = new THREE.Group();

  const wood =
    material(0xe4b45e);

  for (
    let i = -1;
    i <= 1;
    i += 1
  ) {
    addMesh(
      group,
      new THREE.CylinderGeometry(
        0.045,
        0.055,
        1,
        10
      ),
      wood,
      [i * 0.12, 0.5, 0]
    );
  }

  addMesh(
    group,
    new THREE.BoxGeometry(
      0.25,
      0.035,
      0.055
    ),
    wood,
    [-0.06, 1.02, 0]
  );

  addMesh(
    group,
    new THREE.BoxGeometry(
      0.25,
      0.035,
      0.055
    ),
    wood,
    [0.06, 1.02, 0]
  );

  group.position.z = z;

  scene.add(group);

  return group;
}

function createBall(): THREE.Group {
  const group = new THREE.Group();

  const ballMaterial =
    material(0xa71919, 0.4);

  const ball =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.16,
        24,
        18
      ),
      ballMaterial
    );

  ball.castShadow = true;

  group.add(ball);

  const seam =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        0.115,
        0.012,
        8,
        32
      ),
      material(0xffffff, 0.4)
    );

  seam.rotation.x =
    Math.PI / 2;

  group.add(seam);

  group.visible = false;

  return group;
}

function createStadium(
  scene: THREE.Scene,
  battingTeamName: string,
  bowlingTeamName: string
): void {
  const field =
    new THREE.Mesh(
      new THREE.CircleGeometry(
        46,
        128
      ),
      material(0x176b36, 1)
    );

  field.rotation.x =
    -Math.PI / 2;

  field.receiveShadow = true;

  scene.add(field);

  for (
    let i = -8;
    i <= 8;
    i += 1
  ) {
    const stripe =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          46,
          3
        ),
        material(
          i % 2 === 0
            ? 0x1b743b
            : 0x176b36,
          1
        )
      );

    stripe.rotation.x =
      -Math.PI / 2;

    stripe.position.set(
      0,
      0.015,
      i * 4.5
    );

    scene.add(stripe);
  }

  const pitch =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        4.2,
        0.12,
        PITCH_LENGTH
      ),
      material(0xc6a36a, 1)
    );

  pitch.position.y = 0.08;
  pitch.receiveShadow = true;

  scene.add(pitch);

  const lineMaterial =
    material(0xf4f4f4, 0.5);

  for (
    const x of [-1.98, 1.98]
  ) {
    const line =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.035,
          0.025,
          PITCH_LENGTH
        ),
        lineMaterial
      );

    line.position.set(
      x,
      0.16,
      0
    );

    scene.add(line);
  }

  const creasePositions = [
    BATTER_Z - 1.1,
    BATTER_Z - 0.25,
    BOWLER_Z + 0.25,
    BOWLER_Z + 1.1,
  ];

  for (
    const z of creasePositions
  ) {
    const crease =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          3.6,
          0.025,
          0.06
        ),
        lineMaterial
      );

    crease.position.set(
      0,
      0.17,
      z
    );

    scene.add(crease);
  }

  createStumps(
    scene,
    BATTER_Z
  );

  createStumps(
    scene,
    BOWLER_Z
  );

  const boundary =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        BOUNDARY_RADIUS,
        0.16,
        8,
        160
      ),
      material(0xffffff, 0.5)
    );

  boundary.rotation.x =
    -Math.PI / 2;

  boundary.position.y = 0.2;

  scene.add(boundary);

  for (
    let row = 0;
    row < 4;
    row += 1
  ) {
    const ring =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          38 + row * 2.2,
          1.3,
          8,
          128
        ),
        material(
          row % 2 === 0
            ? 0x273449
            : 0x34465d,
          0.85
        )
      );

    ring.rotation.x =
      -Math.PI / 2;

    ring.position.y =
      1 + row * 1.25;

    scene.add(ring);
  }

  for (
    let i = 0;
    i < 48;
    i += 1
  ) {
    const angle =
      (i / 48) *
      Math.PI *
      2;

    const radius = 40;

    const block =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          5,
          2.8,
          2.5
        ),
        material(
          i % 3 === 0
            ? 0x43536a
            : 0x29374a,
          0.9
        )
      );

    block.position.set(
      Math.cos(angle) *
        radius,
      3,
      Math.sin(angle) *
        radius
    );

    block.rotation.y =
      -angle;

    block.castShadow = true;

    scene.add(block);
  }

  const towerPositions: Array<
    [number, number]
  > = [
    [-31, -27],
    [31, -27],
    [-31, 27],
    [31, 27],
  ];

  towerPositions.forEach(
    ([x, z]) => {
      const tower =
        new THREE.Group();

      addMesh(
        tower,
        new THREE.CylinderGeometry(
          0.16,
          0.22,
          9,
          10
        ),
        material(
          0x4a4f57,
          0.8,
          0.2
        ),
        [0, 4.5, 0]
      );

      addMesh(
        tower,
        new THREE.BoxGeometry(
          1.6,
          0.7,
          0.3
        ),
        material(
          0xe8edf2,
          0.45
        ),
        [0, 8.7, 0]
      );

      tower.position.set(
        x,
        0,
        z
      );

      scene.add(tower);

      const light =
        new THREE.PointLight(
          0xffffff,
          75,
          70,
          2
        );

      light.position.set(
        x,
        8.5,
        z
      );

      light.castShadow = true;

      scene.add(light);
    }
  );

  /*
   * Broadcast screens.
   */
  const screen =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        11,
        5,
        0.35
      ),
      material(0x07111f, 0.45)
    );

  screen.position.set(
    0,
    5,
    -39
  );

  screen.rotation.y =
    Math.PI;

  scene.add(screen);

  const screen2 =
    screen.clone();

  screen2.position.z = 39;
  screen2.rotation.y = 0;

  scene.add(screen2);

  const batColor =
    teamColor(
      battingTeamName,
      0x1565c0
    );

  const bowlColor =
    teamColor(
      bowlingTeamName,
      0xc62828
    );

  const banner =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        9,
        1.1,
        0.08
      ),
      material(batColor, 0.6)
    );

  banner.position.set(
    0,
    5.4,
    -38.75
  );

  scene.add(banner);

  const banner2 =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        9,
        1.1,
        0.08
      ),
      material(bowlColor, 0.6)
    );

  banner2.position.set(
    0,
    5.4,
    38.75
  );

  scene.add(banner2);
}

async function createFielders(
  scene: THREE.Scene,
  bowlingTeamName: string
): Promise<ModelRig[]> {
  const color =
    teamColor(
      bowlingTeamName,
      0x1565c0
    );

  const positions: Array<
    [number, number, number]
  > = [
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

  const rigs: ModelRig[] = [];

  for (
    let index = 0;
    index < positions.length;
    index += 1
  ) {
    const [
      x,
      z,
      scale,
    ] = positions[index];

    const rig =
      await loadPlayerModel(
        MODEL_PATHS.fielder,
        scale,
        color
      );

    rig.root.position.set(
      x,
      0,
      z
    );

    rig.root.rotation.y =
      Math.atan2(
        -x,
        -z
      );

    scene.add(rig.root);

    rigs.push(rig);
  }

  return rigs;
}

function disposeScene(
  scene: THREE.Scene
): void {
  scene.traverse(
    (object) => {
      if (
        object instanceof THREE.Mesh
      ) {
        object.geometry.dispose();

        if (
          Array.isArray(
            object.material
          )
        ) {
          object.material.forEach(
            (mat) =>
              mat.dispose()
          );
        } else {
          object.material.dispose();
        }
      }
    }
  );
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
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const wrapperRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const animationFrameRef =
    useRef<number | null>(null);

  const ballRef =
    useRef<THREE.Group | null>(
      null
    );

  const batterRef =
    useRef<ModelRig | null>(
      null
    );

  const bowlerRef =
    useRef<ModelRig | null>(
      null
    );

  const keeperRef =
    useRef<ModelRig | null>(
      null
    );

  const fieldersRef =
    useRef<ModelRig[]>([]);

  const flightProgressRef =
    useRef(0);

  const resultProgressRef =
    useRef(0);

  const [selectedZone, setSelectedZone] =
    useState<PitchZone>(
      'GOOD_LENGTH'
    );

  const [selectedLine, setSelectedLine] =
    useState<PitchLine>(
      'MIDDLE'
    );

  const [bowlingSpeed, setBowlingSpeed] =
    useState(135);

  const [selectedDirection, setSelectedDirection] =
    useState<ShotDirection>(
      'STRAIGHT'
    );

  const [selectedShotType, setSelectedShotType] =
    useState<ShotType>(
      'GROUND'
    );

  const [timing, setTiming] =
    useState(50);

  const [webglError, setWebglError] =
    useState(false);

  const [modelsLoading, setModelsLoading] =
    useState(true);

  const [modelsLoaded, setModelsLoaded] =
    useState(false);

  const stateRef =
    useRef<SceneState>({
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

  const callbacksRef =
    useRef({
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
  }, [
    onDeliverySubmit,
    onShotSubmit,
  ]);

  useEffect(() => {
    flightProgressRef.current = 0;
    resultProgressRef.current = 0;

    if (ballRef.current) {
      ballRef.current.visible =
        phase === 'BALL_IN_FLIGHT' ||
        phase === 'RESULT_SHOWCASE';
    }
  }, [phase]);

  const handleDeliverBall =
    () => {
      if (
        !isBowling ||
        phase !==
          'AWAITING_DELIVERY'
      ) {
        return;
      }

      callbacksRef.current
        .onDeliverySubmit({
          zone: selectedZone,
          line: selectedLine,
          speed: bowlingSpeed,
        });
    };

  const handlePlayShot =
    () => {
      if (!isBatting) {
        return;
      }

      if (
        phase !==
          'BALL_IN_FLIGHT' &&
        phase !==
          'AWAITING_DELIVERY'
      ) {
        return;
      }

      callbacksRef.current
        .onShotSubmit({
          direction:
            selectedDirection,
          shotType:
            selectedShotType,
          timing,
        });
    };

  useEffect(() => {
    const canvas =
      canvasRef.current;

    const wrapper =
      wrapperRef.current;

    if (
      !canvas ||
      !wrapper
    ) {
      return;
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer =
        new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: false,
          powerPreference:
            'high-performance',
        });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio ||
          1,
        2
      )
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.1;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x07111f
      );

    scene.fog =
      new THREE.Fog(
        0x07111f,
        42,
        100
      );

    const camera =
      new THREE.PerspectiveCamera(
        45,
        1,
        0.1,
        150
      );

    camera.position.set(
      0,
      7.2,
      20
    );

    camera.lookAt(
      0,
      1.1,
      -3
    );

    /*
     * Broadcast lighting.
     */
    const hemisphere =
      new THREE.HemisphereLight(
        0x9cc9ff,
        0x18351e,
        2.2
      );

    scene.add(hemisphere);

    const sun =
      new THREE.DirectionalLight(
        0xffffff,
        3.5
      );

    sun.position.set(
      -15,
      28,
      14
    );

    sun.castShadow = true;

    sun.shadow.mapSize.width =
      2048;

    sun.shadow.mapSize.height =
      2048;

    sun.shadow.camera.left =
      -45;

    sun.shadow.camera.right =
      45;

    sun.shadow.camera.top =
      45;

    sun.shadow.camera.bottom =
      -45;

    scene.add(sun);

    createStadium(
      scene,
      stateRef.current
        .battingTeamName,
      stateRef.current
        .bowlingTeamName
    );

    /*
     * Ball.
     */
    const ball =
      createBall();

    scene.add(ball);

    ballRef.current =
      ball;

    /*
     * Resize.
     */
    const resize = () => {
      const width =
        Math.max(
          1,
          wrapper.clientWidth
        );

      const height =
        Math.max(
          1,
          wrapper.clientHeight
        );

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height,
        false
      );
    };

    resize();

    const resizeObserver =
      typeof ResizeObserver !==
      'undefined'
        ? new ResizeObserver(
            resize
          )
        : null;

    resizeObserver?.observe(
      wrapper
    );

    window.addEventListener(
      'resize',
      resize
    );

    let disposed = false;

    /*
     * Load actual human models.
     */
    const loadPlayers =
      async () => {
        setModelsLoading(true);

        const battingColor =
          teamColor(
            stateRef.current
              .battingTeamName,
            0xc62828
          );

        const bowlingColor =
          teamColor(
            stateRef.current
              .bowlingTeamName,
            0x1565c0
          );

        const [
          batter,
          bowler,
          keeper,
          fielders,
        ] = await Promise.all([
          loadPlayerModel(
            MODEL_PATHS.batsman,
            1.15,
            battingColor,
            true
          ),

          loadPlayerModel(
            MODEL_PATHS.bowler,
            1.08,
            bowlingColor
          ),

          loadPlayerModel(
            MODEL_PATHS.fielder,
            0.9,
            bowlingColor
          ),

          createFielders(
            scene,
            stateRef.current
              .bowlingTeamName
          ),
        ]);

        if (disposed) {
          return;
        }

        batter.root.position.set(
          0,
          0,
          BATTER_Z
        );

        batter.root.rotation.y =
          Math.PI;

        scene.add(
          batter.root
        );

        batterRef.current =
          batter;

        bowler.root.position.set(
          0,
          0,
          BOWLER_Z
        );

        bowler.root.rotation.y =
          0;

        scene.add(
          bowler.root
        );

        bowlerRef.current =
          bowler;

        keeper.root.position.set(
          0,
          0,
          BATTER_Z + 1.8
        );

        keeper.root.rotation.y =
          Math.PI;

        scene.add(
          keeper.root
        );

        keeperRef.current =
          keeper;

        fieldersRef.current =
          fielders;

        setModelsLoading(false);
        setModelsLoaded(true);
      };

    loadPlayers();

    const clock =
      new THREE.Clock();

    const animate = () => {
      animationFrameRef.current =
        requestAnimationFrame(
          animate
        );

      const delta =
        Math.min(
          clock.getDelta(),
          0.05
        );

      const current =
        stateRef.current;

      /*
       * Update model animations.
       */
      batterRef.current?.mixer?.update(
        delta
      );

      bowlerRef.current?.mixer?.update(
        delta
      );

      keeperRef.current?.mixer?.update(
        delta
      );

      fieldersRef.current.forEach(
        (fielder) =>
          fielder.mixer?.update(
            delta
          )
      );

      /*
       * BOWLER ANIMATION
       */
      if (
        current.phase ===
          'AWAITING_DELIVERY' &&
        current.isBowling
      ) {
        playAnimation(
          bowlerRef.current,
          [
            'idle',
            'standing',
          ]
        );
      }

      /*
       * BALL DELIVERY.
       */
      if (
        current.phase ===
        'BALL_IN_FLIGHT'
      ) {
        flightProgressRef.current +=
          delta / 1.05;

        const t =
          clamp(
            flightProgressRef.current,
            0,
            1
          );

        if (t < 0.35) {
          playAnimation(
            bowlerRef.current,
            [
              'run',
              'run up',
              'bowling',
            ]
          );
        } else {
          playAnimation(
            bowlerRef.current,
            [
              'follow',
              'idle',
              'standing',
            ]
          );
        }

        playAnimation(
          batterRef.current,
          [
            'batting',
            'stance',
            'idle',
          ]
        );

        if (ballRef.current) {
          const startZ =
            BOWLER_Z;

          const endZ =
            BATTER_Z;

          const z =
            THREE.MathUtils.lerp(
              startZ,
              endZ,
              t
            );

          const x =
            Math.sin(
              t *
                Math.PI *
                2
            ) * 0.18;

          const y =
            0.38 +
            Math.sin(
              Math.PI * t
            ) * 2.2;

          ballRef.current.visible =
            true;

          ballRef.current.position.set(
            x,
            y,
            z
          );

          ballRef.current.rotation.x +=
            delta * 12;

          ballRef.current.rotation.z +=
            delta * 8;
        }
      }

      /*
       * SHOT.
       */
      else if (
        current.phase ===
        'RESULT_SHOWCASE'
      ) {
        resultProgressRef.current +=
          delta / 1.35;

        const t =
          clamp(
            resultProgressRef.current,
            0,
            1
          );

        playAnimation(
          batterRef.current,
          [
            'batting',
            'bat',
            'swing',
          ]
        );

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

          default:
            directionX = 0;
            directionZ = -1;
        }

        const distance =
          current.selectedShotType ===
          'LOFT'
            ? 42
            : 28;

        const endX =
          directionX *
          distance;

        const endZ =
          BATTER_Z +
          directionZ *
            distance;

        if (ballRef.current) {
          const x =
            THREE.MathUtils.lerp(
              0,
              endX,
              t
            );

          const z =
            THREE.MathUtils.lerp(
              BATTER_Z,
              endZ,
              t
            );

          const arc =
            current.selectedShotType ===
            'LOFT'
              ? Math.sin(
                  Math.PI * t
                ) * 8
              : Math.sin(
                  Math.PI * t
                ) * 1.2;

          ballRef.current.visible =
            true;

          ballRef.current.position.set(
            x,
            0.32 + arc,
            z
          );

          ballRef.current.rotation.x +=
            delta * 16;

          ballRef.current.rotation.z +=
            delta * 14;
        }

        /*
         * Fielders react to a shot.
         */
        if (t > 0.15) {
          fieldersRef.current.forEach(
            (
              fielder,
              index
            ) => {
              if (
                index %
                  2 ===
                0
              ) {
                playAnimation(
                  fielder,
                  [
                    'run',
                    'field',
                    'running',
                  ]
                );
              }
            }
          );
        }
      } else {
        if (ballRef.current) {
          ballRef.current.visible =
            false;
        }

        playAnimation(
          batterRef.current,
          [
            'idle',
            'stance',
            'standing',
          ]
        );

        playAnimation(
          bowlerRef.current,
          [
            'idle',
            'standing',
          ]
        );
      }

      /*
       * Subtle camera movement.
       * This gives the scene a broadcast feel.
       */
      const cameraShake =
        current.phase ===
        'RESULT_SHOWCASE'
          ? Math.sin(
              performance.now() *
                0.006
            ) * 0.025
          : 0;

      camera.position.x =
        cameraShake;

      camera.lookAt(
        0,
        1.1,
        -3
      );

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    return () => {
      disposed = true;

      if (
        animationFrameRef.current !==
        null
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

      ballRef.current = null;
      batterRef.current = null;
      bowlerRef.current = null;
      keeperRef.current = null;
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
        background:
          '#07111f',
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
              '#07111f',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 700,
            textAlign: 'center',
            padding: '20px',
          }}
        >
          3D cricket graphics are
          not available on this
          device/browser.
        </div>
      )}

      {modelsLoading &&
        !webglError && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform:
                'translate(-50%, -50%)',
              padding:
                '12px 18px',
              borderRadius: '12px',
              background:
                'rgba(0,0,0,0.7)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              pointerEvents:
                'none',
            }}
          >
            LOADING 3D PLAYERS...
          </div>
        )}

      {modelsLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '50%',
            transform:
              'translateX(-50%)',
            background:
              'rgba(5,10,18,0.72)',
            backdropFilter:
              'blur(8px)',
            color: '#fff',
            padding:
              '6px 12px',
            borderRadius:
              '999px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing:
              '0.5px',
            pointerEvents:
              'none',
          }}
        >
          3D PLAYER MODELS
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          display: 'flex',
          justifyContent:
            'space-between',
          pointerEvents:
            'none',
          gap: '12px',
        }}
      >
        <div
          style={{
            background:
              'rgba(5,10,18,0.72)',
            backdropFilter:
              'blur(8px)',
            borderRadius:
              '10px',
            padding:
              '8px 12px',
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
            BOWLER:{' '}
            {bowlerName}
          </span>
        </div>

        <div
          style={{
            background:
              'rgba(5,10,18,0.72)',
            backdropFilter:
              'blur(8px)',
            borderRadius:
              '10px',
            padding:
              '8px 12px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            textAlign:
              'right',
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
            STRIKER:{' '}
            {strikerName}
          </span>
        </div>
      </div>

      {isBowling &&
        phase ===
          'AWAITING_DELIVERY' && (
          <div className="match-controls bowling-controls">
            <div className="control-title">
              BOWLING
            </div>

            <div className="control-row">
              <label>
                Length
                <select
                  value={
                    selectedZone
                  }
                  onChange={(
                    event
                  ) =>
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
                  value={
                    selectedLine
                  }
                  onChange={(
                    event
                  ) =>
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
                Speed:{' '}
                {bowlingSpeed}{' '}
                km/h
                <input
                  type="range"
                  min="90"
                  max="155"
                  value={
                    bowlingSpeed
                  }
                  onChange={(
                    event
                  ) =>
                    setBowlingSpeed(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="primary-control-button"
              onClick={
                handleDeliverBall
              }
            >
              🏏 DELIVER BALL
            </button>
          </div>
        )}

      {isBatting &&
        (
          phase ===
            'AWAITING_DELIVERY' ||
          phase ===
            'BALL_IN_FLIGHT'
        ) && (
          <div className="match-controls batting-controls">
            <div className="control-title">
              BATTING
            </div>

            <div className="control-row">
              <label>
                Direction
                <select
                  value={
                    selectedDirection
                  }
                  onChange={(
                    event
                  ) =>
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
                  value={
                    selectedShotType
                  }
                  onChange={(
                    event
                  ) =>
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
                  onChange={(
                    event
                  ) =>
                    setTiming(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className="primary-control-button"
              onClick={
                handlePlayShot
              }
            >
              ⚡ PLAY SHOT
            </button>
          </div>
        )}

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform:
            'translateX(-50%)',
          background:
            'rgba(0,0,0,0.58)',
          color: '#fff',
          padding:
            '6px 12px',
          borderRadius:
            '999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing:
            '0.5px',
          pointerEvents:
            'none',
          whiteSpace:
            'nowrap',
        }}
      >
        LIVE • 3D CRICKET STADIUM
      </div>
    </div>
  );
};

export default CricketMatchCanvas;
