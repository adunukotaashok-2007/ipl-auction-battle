import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface CinematicIntroProps {
  onComplete: () => void;
}

const CinematicIntro: React.FC<CinematicIntroProps> = ({
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    // =========================================================
    // SCENE
    // =========================================================

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x020307);

    scene.fog = new THREE.FogExp2(
      0x020307,
      0.035
    );

    // =========================================================
    // CAMERA
    // =========================================================

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    camera.position.set(
      0,
      5.5,
      13
    );

    camera.lookAt(
      0,
      1.5,
      0
    );

    // =========================================================
    // RENDERER
    // =========================================================

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.15;

    container.appendChild(
      renderer.domElement
    );

    // =========================================================
    // LIGHTING
    // =========================================================

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        0.22
      );

    scene.add(ambientLight);

    // Golden key light
    const keyLight =
      new THREE.DirectionalLight(
        0xffb13b,
        4
      );

    keyLight.position.set(
      6,
      12,
      7
    );

    keyLight.castShadow = true;

    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;

    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;

    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;

    scene.add(keyLight);

    // Blue rim light
    const rimLight =
      new THREE.DirectionalLight(
        0x008cff,
        2.5
      );

    rimLight.position.set(
      -8,
      7,
      -8
    );

    scene.add(rimLight);

    // White top light
    const topLight =
      new THREE.PointLight(
        0xffffff,
        2,
        35
      );

    topLight.position.set(
      0,
      12,
      2
    );

    scene.add(topLight);

    // =========================================================
    // FLOOR
    // =========================================================

    const floorGeometry =
      new THREE.CircleGeometry(
        30,
        96
      );

    const floorMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x080a0f,
        roughness: 0.3,
        metalness: 0.8,
      });

    const floor =
      new THREE.Mesh(
        floorGeometry,
        floorMaterial
      );

    floor.rotation.x =
      -Math.PI / 2;

    floor.position.y = 0;

    floor.receiveShadow = true;

    scene.add(floor);

    // =========================================================
    // AUCTION PLATFORM
    // =========================================================

    const platformGeometry =
      new THREE.CylinderGeometry(
        2.6,
        2.8,
        0.55,
        64
      );

    const platformMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x141821,
        roughness: 0.28,
        metalness: 0.85,
      });

    const platform =
      new THREE.Mesh(
        platformGeometry,
        platformMaterial
      );

    platform.position.y = 0.28;

    platform.castShadow = true;
    platform.receiveShadow = true;

    scene.add(platform);

    // Golden platform ring
    const platformRingGeometry =
      new THREE.TorusGeometry(
        2.45,
        0.045,
        16,
        96
      );

    const platformRingMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xffc400,
      });

    const platformRing =
      new THREE.Mesh(
        platformRingGeometry,
        platformRingMaterial
      );

    platformRing.rotation.x =
      Math.PI / 2;

    platformRing.position.y =
      0.58;

    scene.add(platformRing);

    // =========================================================
    // GOLDEN CRICKET BALL
    // =========================================================

    const ballGroup =
      new THREE.Group();

    ballGroup.position.set(
      0,
      14,
      0
    );

    scene.add(ballGroup);

    const ballGeometry =
      new THREE.SphereGeometry(
        1.15,
        64,
        64
      );

    const ballMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xffc400,
        metalness: 0.85,
        roughness: 0.16,
      });

    const ball =
      new THREE.Mesh(
        ballGeometry,
        ballMaterial
      );

    ball.castShadow = true;

    ballGroup.add(ball);

    // Ball seam
    const seamGeometry =
      new THREE.TorusGeometry(
        1.16,
        0.018,
        8,
        96
      );

    const seamMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });

    const seam =
      new THREE.Mesh(
        seamGeometry,
        seamMaterial
      );

    seam.rotation.x =
      Math.PI / 2;

    ballGroup.add(seam);

    // Second seam
    const seam2 =
      seam.clone();

    seam2.rotation.z =
      Math.PI / 2;

    ballGroup.add(seam2);

    // =========================================================
    // GAVEL
    // =========================================================

    const gavelGroup =
      new THREE.Group();

    gavelGroup.position.set(
      0,
      1.15,
      1.8
    );

    gavelGroup.rotation.z =
      -0.45;

    scene.add(gavelGroup);

    // Handle
    const handleGeometry =
      new THREE.CylinderGeometry(
        0.13,
        0.16,
        2.8,
        32
      );

    const handleMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x8a5528,
        roughness: 0.3,
        metalness: 0.25,
      });

    const handle =
      new THREE.Mesh(
        handleGeometry,
        handleMaterial
      );

    handle.rotation.z =
      Math.PI / 2;

    handle.position.x = -1.3;

    handle.castShadow = true;

    gavelGroup.add(handle);

    // Hammer head
    const hammerGeometry =
      new THREE.CylinderGeometry(
        0.48,
        0.48,
        1.35,
        48
      );

    const hammerMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xb87527,
        roughness: 0.2,
        metalness: 0.55,
      });

    const hammer =
      new THREE.Mesh(
        hammerGeometry,
        hammerMaterial
      );

    hammer.rotation.z =
      Math.PI / 2;

    hammer.position.x = 0.25;

    hammer.castShadow = true;

    gavelGroup.add(hammer);

    // =========================================================
    // SHOCKWAVE
    // =========================================================

    const shockwaveGroup =
      new THREE.Group();

    shockwaveGroup.position.y =
      0.62;

    scene.add(shockwaveGroup);

    const shockwaveGeometry =
      new THREE.RingGeometry(
        0.15,
        0.28,
        96
      );

    const shockwaveMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xffd000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });

    const shockwave =
      new THREE.Mesh(
        shockwaveGeometry,
        shockwaveMaterial
      );

    shockwave.rotation.x =
      -Math.PI / 2;

    shockwaveGroup.add(shockwave);

    // =========================================================
    // PARTICLES
    // =========================================================

    const particleCount = 450;

    const particlePositions =
      new Float32Array(
        particleCount * 3
      );

    const particleVelocities: THREE.Vector3[] =
      [];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      particlePositions[i3] =
        0;

      particlePositions[i3 + 1] =
        0.65;

      particlePositions[i3 + 2] =
        0;

      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        2 +
        Math.random() * 7;

      particleVelocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          1.5 +
            Math.random() * 6,
          Math.sin(angle) * speed
        )
      );
    }

    const particleGeometry =
      new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        particlePositions,
        3
      )
    );

    const particleMaterial =
      new THREE.PointsMaterial({
        color: 0xffc400,
        size: 0.075,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });

    const particles =
      new THREE.Points(
        particleGeometry,
        particleMaterial
      );

    scene.add(particles);

    // =========================================================
    // STADIUM LIGHTS
    // =========================================================

    const stadiumLights: THREE.PointLight[] =
      [];

    const lightPositions = [
      [-10, 8, -8],
      [10, 8, -8],
      [-10, 8, 8],
      [10, 8, 8],
    ];

    lightPositions.forEach(
      ([x, y, z]) => {
        const light =
          new THREE.PointLight(
            0xffe9a0,
            2.5,
            30
          );

        light.position.set(
          x,
          y,
          z
        );

        scene.add(light);

        stadiumLights.push(
          light
        );
      }
    );

    // =========================================================
    // HTML OVERLAY
    // =========================================================

    const overlay =
      document.createElement('div');

    overlay.style.position =
      'absolute';

    overlay.style.inset = '0';

    overlay.style.zIndex = '10';

    overlay.style.pointerEvents =
      'none';

    overlay.style.display =
      'flex';

    overlay.style.flexDirection =
      'column';

    overlay.style.justifyContent =
      'center';

    overlay.style.alignItems =
      'center';

    overlay.style.textAlign =
      'center';

    overlay.style.opacity = '0';

    overlay.style.transform =
      'scale(0.8)';

    overlay.innerHTML = `
      <div
        style="
          color:#ffd000;
          font-size:clamp(14px,2vw,22px);
          letter-spacing:8px;
          font-weight:700;
          margin-bottom:14px;
          text-shadow:0 0 25px rgba(255,208,0,.65);
        "
      >
        WELCOME TO
      </div>

      <div
        style="
          color:#ffffff;
          font-size:clamp(38px,7vw,92px);
          line-height:.95;
          font-weight:900;
          letter-spacing:3px;
          text-transform:uppercase;
          text-shadow:
            0 0 15px rgba(255,255,255,.4),
            0 0 45px rgba(255,190,0,.35);
        "
      >
        IPL AUCTION
      </div>

      <div
        style="
          color:#00c8ff;
          font-size:clamp(24px,4vw,52px);
          line-height:1;
          font-weight:900;
          letter-spacing:8px;
          margin-top:12px;
          text-shadow:0 0 30px rgba(0,200,255,.6);
        "
      >
        BATTLE
      </div>

      <div
        style="
          width:160px;
          height:3px;
          margin-top:24px;
          background:linear-gradient(
            90deg,
            transparent,
            #ffd000,
            transparent
          );
          box-shadow:0 0 15px #ffd000;
        "
      ></div>

      <div
        style="
          color:#aab4c4;
          font-size:12px;
          letter-spacing:5px;
          margin-top:18px;
        "
      >
        LET THE BIDDING BEGIN
      </div>
    `;

    container.appendChild(
      overlay
    );

    // =========================================================
    // DARK CINEMATIC VIGNETTE
    // =========================================================

    const vignette =
      document.createElement('div');

    vignette.style.position =
      'absolute';

    vignette.style.inset = '0';

    vignette.style.zIndex = '9';

    vignette.style.pointerEvents =
      'none';

    vignette.style.background =
      'radial-gradient(circle, transparent 30%, rgba(0,0,0,.78) 100%)';

    container.appendChild(
      vignette
    );

    // =========================================================
    // ANIMATION TIMELINE
    // =========================================================

    const timeline =
      gsap.timeline();

    // Initial ball state
    ballGroup.scale.set(
      0.4,
      0.4,
      0.4
    );

    // Ball enters
    timeline.to(
      ballGroup.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.55,
        ease: 'power2.out',
      }
    );

    // Ball drop
    timeline.to(
      ballGroup.position,
      {
        y: 1.7,
        duration: 1.25,
        ease: 'bounce.out',
      },
      '-=0.15'
    );

    // Ball rotation
    timeline.to(
      ballGroup.rotation,
      {
        x: Math.PI * 2,
        y: Math.PI * 4,
        duration: 1.5,
        ease: 'power2.out',
      },
      '<'
    );

    // Camera moves closer
    timeline.to(
      camera.position,
      {
        z: 8,
        y: 3.4,
        duration: 1.5,
        ease: 'power2.inOut',
      },
      '<'
    );

    // Gavel lifts
    timeline.to(
      gavelGroup.rotation,
      {
        z: -1.2,
        duration: 0.45,
        ease: 'power2.out',
      }
    );

    // Gavel strike
    timeline.to(
      gavelGroup.rotation,
      {
        z: 0.2,
        duration: 0.22,
        ease: 'power4.in',
      }
    );

    // Impact
    timeline.add(() => {
      shockwave.scale.set(
        0.1,
        0.1,
        0.1
      );

      shockwaveMaterial.opacity =
        1;

      particleMaterial.opacity =
        1;

      particlePositions.forEach(
        (_, index) => {
          if (index % 3 === 0) {
            particlePositions[
              index
            ] = 0;
          }
        }
      );

      const attribute =
        particleGeometry.getAttribute(
          'position'
        );

      attribute.needsUpdate = true;

      // Camera shake
      gsap.to(
        camera.position,
        {
          x: 0.15,
          duration: 0.05,
          yoyo: true,
          repeat: 5,
          ease: 'power1.inOut',
        }
      );
    });

    // Shockwave
    timeline.to(
      shockwave.scale,
      {
        x: 25,
        y: 25,
        z: 25,
        duration: 1.1,
        ease: 'power2.out',
      },
      '<'
    );

    timeline.to(
      shockwaveMaterial,
      {
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      },
      '<'
    );

    // Gavel settles
    timeline.to(
      gavelGroup.rotation,
      {
        z: -0.35,
        duration: 0.3,
        ease: 'bounce.out',
      }
    );

    // Title reveal
    timeline.to(
      overlay,
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'back.out(1.7)',
      },
      '-=0.35'
    );

    // Hold title
    timeline.to(
      {},
      {
        duration: 1.8,
      }
    );

    // Fade intro
    timeline.to(
      container,
      {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
      }
    );

    // Complete
    timeline.add(() => {
      if (!completedRef.current) {
        completedRef.current = true;

        onComplete();
      }
    });

    // =========================================================
    // ANIMATION LOOP
    // =========================================================

    let animationFrame = 0;

    const clock =
      new THREE.Clock();

    const animate = () => {
      animationFrame =
        requestAnimationFrame(
          animate
        );

      const elapsed =
        clock.getElapsedTime();

      // Ball idle rotation
      ball.rotation.y +=
        0.012;

      ball.rotation.x +=
        0.004;

      // Platform ring
      platformRing.rotation.z =
        elapsed * 0.15;

      // Stadium lights pulse
      stadiumLights.forEach(
        (light, index) => {
          light.intensity =
            2.2 +
            Math.sin(
              elapsed * 2 +
                index
            ) *
              0.25;
        }
      );

      // Particles
      const positions =
        particleGeometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;

      for (
        let i = 0;
        i < particleCount;
        i++
      ) {
        const i3 = i * 3;

        positions.array[
          i3
        ] +=
          particleVelocities[i].x *
          0.012;

        positions.array[
          i3 + 1
        ] +=
          particleVelocities[i].y *
          0.012;

        positions.array[
          i3 + 2
        ] +=
          particleVelocities[i].z *
          0.012;

        particleVelocities[i].y -=
          0.045;

        if (
          positions.array[i3 + 1] <
          0
        ) {
          positions.array[
            i3
          ] = 0;

          positions.array[
            i3 + 1
          ] = 0.65;

          positions.array[
            i3 + 2
          ] = 0;

          particleVelocities[
            i
          ].set(
            0,
            0,
            0
          );
        }
      }

      positions.needsUpdate =
        true;

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    // =========================================================
    // RESPONSIVE
    // =========================================================

    const handleResize = () => {
      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    };

    window.addEventListener(
      'resize',
      handleResize
    );

    // =========================================================
    // CLEANUP
    // =========================================================

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      timeline.kill();

      window.removeEventListener(
        'resize',
        handleResize
      );

      if (
        container.contains(
          renderer.domElement
        )
      ) {
        container.removeChild(
          renderer.domElement
        );
      }

      if (
        container.contains(
          overlay
        )
      ) {
        container.removeChild(
          overlay
        );
      }

      if (
        container.contains(
          vignette
        )
      ) {
        container.removeChild(
          vignette
        );
      }

      renderer.dispose();

      floorGeometry.dispose();
      floorMaterial.dispose();

      ballGeometry.dispose();
      ballMaterial.dispose();

      seamGeometry.dispose();
      seamMaterial.dispose();

      platformGeometry.dispose();
      platformMaterial.dispose();

      platformRingGeometry.dispose();
      platformRingMaterial.dispose();

      handleGeometry.dispose();
      handleMaterial.dispose();

      hammerGeometry.dispose();
      hammerMaterial.dispose();

      shockwaveGeometry.dispose();
      shockwaveMaterial.dispose();

      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#020307',
        zIndex: 99999,
      }}
    />
  );
};

export default CinematicIntro;
