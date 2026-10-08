import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Card, CardColor, EmojiReaction, Player, PlayDirection } from '../types/uno.ts';
import { getCardBackTexture, getCardFrontTexture } from '../utils/cardTexture.ts';

interface ThreeGameTableProps {
  discardPile: Card[];
  currentColor: CardColor;
  direction: PlayDirection;
  drawPileCount: number;
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId: string;
  reactions: EmojiReaction[];
  onDrawCard: () => void;
  onCallUno?: () => void;
  onChallengeUno?: (targetPlayerId: string) => void;
  onPassTurn?: () => void;
  canPass?: boolean;
  isMyTurn: boolean;
  canDraw: boolean;
}

export const ThreeGameTable: React.FC<ThreeGameTableProps> = ({
  discardPile,
  currentColor,
  direction,
  drawPileCount,
  players,
  currentPlayerIndex,
  myPlayerId,
  reactions,
  onDrawCard,
  onCallUno,
  onChallengeUno,
  onPassTurn,
  canPass = false,
  isMyTurn,
  canDraw,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const discardGroupRef = useRef<THREE.Group | null>(null);
  const drawDeckMeshRef = useRef<THREE.Mesh | null>(null);
  const directionRingRef = useRef<THREE.Group | null>(null);
  const opponentGroupRef = useRef<THREE.Group | null>(null);
  const reactionGroupRef = useRef<THREE.Group | null>(null);
  const activeSpotlightRef = useRef<THREE.DirectionalLight | null>(null);
  const discardPadMeshRef = useRef<THREE.Mesh | null>(null);
  const discardPileHistoryRef = useRef<string>('');
  const lastReactionCountRef = useRef<number>(0);

  // Keep latest props in ref to avoid stale closures in ThreeJS event listeners and animation loop
  const propsRef = useRef({ isMyTurn, canDraw, onDrawCard, onCallUno, direction, currentColor });
  propsRef.current = { isMyTurn, canDraw, onDrawCard, onCallUno, direction, currentColor };

  const colorHexMap: Record<CardColor, number> = {
    red: 0xef4444,
    blue: 0x3b82f6,
    green: 0x22c55e,
    yellow: 0xeab308,
    wild: 0xa855f7,
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.024);

    // 2. Camera setup: cinematic angled perspective with mobile responsive FOV
    const isPortrait = width < height || width < 768;
    const initialFov = isPortrait ? 56 : 44;
    const camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 100);
    if (isPortrait) {
      camera.position.set(0, 19.8, 16.8);
      camera.lookAt(0, -0.8, 0.4);
    } else {
      camera.position.set(0, 16.0, 14.8);
      camera.lookAt(0, -0.6, 0.2);
    }
    cameraRef.current = camera;

    // 3. Renderer with high-end tone mapping & soft shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting: warm overhead chandelier + color-keyed accent light
    const ambient = new THREE.AmbientLight(0xfffbeb, 0.75);
    scene.add(ambient);

    // Main table spotlight casting soft contact shadows
    const chandelierSpot = new THREE.SpotLight(0xfffbeb, 3.2);
    chandelierSpot.position.set(0, 24, 4);
    chandelierSpot.angle = Math.PI / 3.6;
    chandelierSpot.penumbra = 0.55;
    chandelierSpot.castShadow = true;
    chandelierSpot.shadow.mapSize.width = 1024;
    chandelierSpot.shadow.mapSize.height = 1024;
    chandelierSpot.shadow.bias = -0.0006;
    chandelierSpot.shadow.radius = 2.5;
    scene.add(chandelierSpot);

    // Rim light reflecting active game color
    const activeColorLight = new THREE.DirectionalLight(colorHexMap[currentColor] || 0x3b82f6, 1.4);
    activeColorLight.position.set(-9, 12, -9);
    scene.add(activeColorLight);
    activeSpotlightRef.current = activeColorLight;

    // 5. Luxury Casino Felt Table
    const tableGeom = new THREE.CylinderGeometry(13.6, 13.6, 0.9, 64);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0a1424, // Midnight navy tournament baize
      roughness: 0.75,
      metalness: 0.05,
    });
    const tableMesh = new THREE.Mesh(tableGeom, tableMat);
    tableMesh.position.y = -0.45;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // Gold Inlaid Perimeter Runner Line
    const goldOuterRingGeom = new THREE.RingGeometry(11.6, 11.75, 80);
    const goldMetalMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.85,
      side: THREE.DoubleSide,
    });
    const goldOuterRing = new THREE.Mesh(goldOuterRingGeom, goldMetalMat);
    goldOuterRing.rotation.x = -Math.PI / 2;
    goldOuterRing.position.y = 0.006;
    scene.add(goldOuterRing);

    // Gold Inlaid Inner Field Oval
    const goldInnerRingGeom = new THREE.RingGeometry(6.4, 6.52, 80);
    const goldInnerRing = new THREE.Mesh(goldInnerRingGeom, goldMetalMat);
    goldInnerRing.rotation.x = -Math.PI / 2;
    goldInnerRing.position.y = 0.006;
    scene.add(goldInnerRing);

    // Outer Armrest Bumper: Padded Dark Walnut Leather
    const bumperGeom = new THREE.TorusGeometry(13.6, 0.8, 32, 100);
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x120c08,
      roughness: 0.45,
      metalness: 0.25,
    });
    const bumperMesh = new THREE.Mesh(bumperGeom, bumperMat);
    bumperMesh.rotation.x = Math.PI / 2;
    bumperMesh.position.y = -0.05;
    scene.add(bumperMesh);

    // Burnished Brass Trim Ring separating felt & bumper
    const brassTrimGeom = new THREE.TorusGeometry(12.8, 0.12, 24, 100);
    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.9,
    });
    const brassTrim = new THREE.Mesh(brassTrimGeom, brassTrimMat);
    brassTrim.rotation.x = Math.PI / 2;
    brassTrim.position.y = 0.02;
    scene.add(brassTrim);

    // 6. Center Discard Zone Group
    const discardGroup = new THREE.Group();
    discardGroup.position.set(1.4, 0.01, 0.2);
    scene.add(discardGroup);
    discardGroupRef.current = discardGroup;

    // Inlaid Gold Discard Plate
    const padGeom = new THREE.PlaneGeometry(3.6, 5.0);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.85,
      transparent: true,
      opacity: 0.85,
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.003;
    discardGroup.add(pad);
    discardPadMeshRef.current = pad;

    // Discard Zone Gold Frame Border
    const padBorderGeom = new THREE.RingGeometry(2.3, 2.45, 4);
    const padBorder = new THREE.Mesh(padBorderGeom, goldMetalMat);
    padBorder.rotation.x = -Math.PI / 2;
    padBorder.rotation.z = Math.PI / 4;
    padBorder.scale.set(1.1, 1.45, 1);
    padBorder.position.y = 0.005;
    discardGroup.add(padBorder);

    // 7. Draw Pile Stack Mesh
    const cardThickness = 0.008;
    const deckHeight = Math.max(0.18, Math.min(0.9, (drawPileCount || 50) * cardThickness));
    const deckGeom = new THREE.BoxGeometry(2.4, deckHeight, 3.4);
    const backTex = getCardBackTexture();
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.15,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
    });
    const deckMaterials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const drawDeck = new THREE.Mesh(deckGeom, deckMaterials);
    drawDeck.position.set(-2.6, deckHeight / 2, 0.2);
    drawDeck.castShadow = true;
    drawDeck.receiveShadow = true;
    drawDeck.userData = { isDrawPile: true };
    scene.add(drawDeck);
    drawDeckMeshRef.current = drawDeck;

    // Draw Zone Inlaid Gold Outline
    const drawPadBorderGeom = new THREE.RingGeometry(2.3, 2.45, 4);
    const drawPadBorder = new THREE.Mesh(drawPadBorderGeom, goldMetalMat);
    drawPadBorder.rotation.x = -Math.PI / 2;
    drawPadBorder.rotation.z = Math.PI / 4;
    drawPadBorder.scale.set(1.1, 1.45, 1);
    drawPadBorder.position.set(-2.6, 0.004, 0.2);
    scene.add(drawPadBorder);

    // 8. Dynamic Direction Flow Orbit (Glowing orbital particles)
    const dirGroup = new THREE.Group();
    dirGroup.position.set(0, 0.03, 0.2);
    const orbitRadius = 4.6;
    const chevronCount = 8;

    for (let i = 0; i < chevronCount; i++) {
      const angle = (i / chevronCount) * Math.PI * 2;
      const chevronGeom = new THREE.ConeGeometry(0.24, 0.65, 16);
      const chevronMat = new THREE.MeshStandardMaterial({
        color: colorHexMap[currentColor] || 0x3b82f6,
        roughness: 0.3,
        metalness: 0.7,
        emissive: colorHexMap[currentColor] || 0x3b82f6,
        emissiveIntensity: 0.45,
      });
      const chevron = new THREE.Mesh(chevronGeom, chevronMat);
      chevron.position.set(Math.cos(angle) * orbitRadius, 0.02, Math.sin(angle) * orbitRadius);
      chevron.rotation.x = Math.PI / 2;
      chevron.rotation.z = -angle + (direction === 1 ? -Math.PI / 2 : Math.PI / 2);
      chevron.userData = { initialAngle: angle, radius: orbitRadius };
      dirGroup.add(chevron);
    }
    scene.add(dirGroup);
    directionRingRef.current = dirGroup;

    // 9. Opponent Podiums Group
    const opponentGroup = new THREE.Group();
    scene.add(opponentGroup);
    opponentGroupRef.current = opponentGroup;

    // 10. Reactions Group
    const reactionGroup = new THREE.Group();
    scene.add(reactionGroup);
    reactionGroupRef.current = reactionGroup;

    // Raycaster for Draw Pile & Table Tap Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastTapTime = 0;

    const handlePointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const now = Date.now();
      const isDoubleTap = now - lastTapTime < 340;
      lastTapTime = now;

      // Double-tap anywhere on table to call UNO (Basic+ rule!)
      if (isDoubleTap && propsRef.current.onCallUno) {
        propsRef.current.onCallUno();
      }

      if (drawDeckMeshRef.current) {
        const intersects = raycaster.intersectObject(drawDeckMeshRef.current);
        if (intersects.length > 0 && propsRef.current.isMyTurn && propsRef.current.canDraw) {
          propsRef.current.onDrawCard();
        }
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      if (drawDeckMeshRef.current && propsRef.current.isMyTurn && propsRef.current.canDraw) {
        const intersects = raycaster.intersectObject(drawDeckMeshRef.current);
        renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    // 11. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Rotate direction flow orbit smoothly according to CURRENT direction (+1 Clockwise, -1 Counter-Clockwise)
      if (directionRingRef.current) {
        const currentDir = propsRef.current.direction;
        const speed = currentDir === 1 ? -0.9 : 0.9;
        directionRingRef.current.rotation.y += speed * delta;
      }

      // Draw pile tactile hover bob when it's your turn
      if (drawDeckMeshRef.current) {
        if (isMyTurn && canDraw) {
          drawDeckMeshRef.current.position.y =
            deckHeight / 2 + Math.sin(elapsedTime * 4.2) * 0.07 + 0.05;
          drawDeckMeshRef.current.rotation.y = Math.sin(elapsedTime * 2.2) * 0.04;
        } else {
          drawDeckMeshRef.current.position.y = deckHeight / 2;
          drawDeckMeshRef.current.rotation.y = 0;
        }
      }

      // Animate floating emoji reaction particles
      if (reactionGroupRef.current) {
        for (let i = reactionGroupRef.current.children.length - 1; i >= 0; i--) {
          const item = reactionGroupRef.current.children[i] as THREE.Sprite;
          item.position.y += delta * 1.8;
          item.position.x += Math.sin(elapsedTime * 3.5 + item.id) * delta * 0.35;
          if (item.material instanceof THREE.SpriteMaterial) {
            item.material.opacity -= delta * 0.45;
            if (item.material.opacity <= 0.01) {
              reactionGroupRef.current.remove(item);
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      const isPort = w < h || w < 768;
      cameraRef.current.fov = isPort ? 56 : 44;
      if (isPort) {
        cameraRef.current.position.set(0, 19.8, 16.8);
        cameraRef.current.lookAt(0, -0.8, 0.4);
      } else {
        cameraRef.current.position.set(0, 16.0, 14.8);
        cameraRef.current.lookAt(0, -0.6, 0.2);
      }
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.removeEventListener('pointerdown', handlePointerDown);
        rendererRef.current.domElement.removeEventListener('pointermove', handlePointerMove);
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Update Center Discard Pile 3D Meshes with Physical Stacking & Rotational Settlement
  useEffect(() => {
    if (!discardGroupRef.current) return;
    const group = discardGroupRef.current;

    const pileHash = discardPile.map((c) => c.id).join(',');
    if (pileHash === discardPileHistoryRef.current) return;
    discardPileHistoryRef.current = pileHash;

    // Keep base pad and border (children 0 and 1)
    while (group.children.length > 2) {
      const child = group.children[group.children.length - 1];
      group.remove(child);
    }

    const sliceCount = Math.min(8, discardPile.length);
    const startIdx = Math.max(0, discardPile.length - sliceCount);
    const visibleCards = discardPile.slice(startIdx);

    const cardGeom = new THREE.BoxGeometry(2.4, 0.022, 3.4);
    const backTex = getCardBackTexture();
    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.15,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.65,
    });

    visibleCards.forEach((card, index) => {
      const isTop = index === visibleCards.length - 1;
      const frontTex = getCardFrontTexture(card.color, card.value);
      const frontMat = new THREE.MeshStandardMaterial({
        map: frontTex,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.92,
      });

      const materials = [edgeMat, edgeMat, frontMat, backMat, edgeMat, edgeMat];
      const mesh = new THREE.Mesh(cardGeom, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const seed = parseInt(card.id.replace(/\D/g, '') || '7', 10);
      const rotJitter = ((seed % 17) - 8) * 0.038;
      const xJitter = ((seed % 11) - 5) * 0.035;
      const zJitter = (((seed * 3) % 11) - 5) * 0.035;

      const yPos = 0.025 + index * 0.026;
      mesh.position.set(xJitter, yPos, zJitter);
      mesh.rotation.y = rotJitter;

      // Newly played top card toss drop animation
      if (isTop) {
        mesh.position.y = yPos + 2.4;
        mesh.rotation.y = rotJitter + 0.45;
        const targetY = yPos;
        const targetRot = rotJitter;

        const startTime = performance.now();
        const duration = 360;
        const animateDrop = (now: number) => {
          const t = Math.min(1, (now - startTime) / duration);
          const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          mesh.position.y = yPos + 2.4 + (targetY - (yPos + 2.4)) * ease;
          mesh.rotation.y = rotJitter + 0.45 + (targetRot - (rotJitter + 0.45)) * ease;
          if (t < 1) {
            requestAnimationFrame(animateDrop);
          }
        };
        requestAnimationFrame(animateDrop);
      }

      group.add(mesh);
    });
  }, [discardPile]);

  // Update Draw Pile Height & Stack Scale
  useEffect(() => {
    if (!drawDeckMeshRef.current) return;
    const cardThickness = 0.008;
    const newHeight = Math.max(0.16, Math.min(0.9, (drawPileCount || 50) * cardThickness));
    drawDeckMeshRef.current.scale.y = newHeight / 0.5;
  }, [drawPileCount]);

  // Update Active Color Theme & Direction Orientation on Table Accents
  useEffect(() => {
    if (!directionRingRef.current) return;
    const hex = colorHexMap[currentColor] || 0x3b82f6;

    directionRingRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.setHex(hex);
          child.material.emissive.setHex(hex);
        }
        const angle = child.userData.initialAngle ?? 0;
        child.rotation.z = -angle + (direction === 1 ? -Math.PI / 2 : Math.PI / 2);
      }
    });

    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.color.setHex(hex);
    }
  }, [currentColor, direction]);

  // Update Opponent Podiums & Physical 3D Card Fans
  useEffect(() => {
    if (!opponentGroupRef.current) return;
    const group = opponentGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const opponents = players.filter((p) => p.id !== myPlayerId);
    if (opponents.length === 0) return;

    const tableRadius = 9.8;
    const count = opponents.length;

    opponents.forEach((opponent, idx) => {
      const oppGroup = new THREE.Group();
      const t = count === 1 ? 0.5 : idx / (count - 1);
      const angle = Math.PI * (0.16 + t * 0.68);

      const posX = -Math.cos(angle) * tableRadius;
      const posZ = -Math.sin(angle) * (tableRadius * 0.85);

      oppGroup.position.set(posX, 0.4, posZ);
      oppGroup.lookAt(0, 0, 0);

      const isTheirTurn = players[currentPlayerIndex]?.id === opponent.id;

      // 1. Luxury Pedestal: Brushed obsidian with brass bevel rim
      const baseGeom = new THREE.CylinderGeometry(1.5, 1.7, 0.28, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isTheirTurn ? 0xd97706 : 0x18181b,
        roughness: 0.35,
        metalness: isTheirTurn ? 0.8 : 0.4,
        emissive: isTheirTurn ? 0xb45309 : 0x000000,
        emissiveIntensity: isTheirTurn ? 0.4 : 0,
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.y = 0.14;
      oppGroup.add(baseMesh);

      // 2. Active Turn Light Ring
      if (isTheirTurn) {
        const haloGeom = new THREE.RingGeometry(1.8, 2.2, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const halo = new THREE.Mesh(haloGeom, haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.3;
        oppGroup.add(halo);
      }

      // 3. Fanned 3D Physical Cards
      const numCards = opponent.cards.length;
      const fanGeom = new THREE.BoxGeometry(0.85, 1.28, 0.015);
      const backTex = getCardBackTexture();
      const cardMat = new THREE.MeshStandardMaterial({
        map: backTex,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity: 0.9,
      });

      const visibleCardCount = Math.min(numCards, 9);
      for (let c = 0; c < visibleCardCount; c++) {
        const cardMesh = new THREE.Mesh(fanGeom, cardMat);
        const fanT = visibleCardCount === 1 ? 0.5 : c / (visibleCardCount - 1);
        const fanAngle = (fanT - 0.5) * 0.52;
        const fanX = (fanT - 0.5) * 1.4;

        cardMesh.position.set(fanX, 1.15 + Math.cos(fanAngle) * 0.08, c * 0.02 + 0.3);
        cardMesh.rotation.z = -fanAngle;
        cardMesh.rotation.x = 0.22;
        oppGroup.add(cardMesh);
      }

      group.add(oppGroup);
    });
  }, [players, currentPlayerIndex, myPlayerId]);

  // Floating Emoji Reaction Particles
  useEffect(() => {
    if (!reactionGroupRef.current || reactions.length === 0) return;
    if (reactions.length === lastReactionCountRef.current) return;
    lastReactionCountRef.current = reactions.length;

    const latest = reactions[reactions.length - 1];
    if (!latest) return;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '74px sans-serif';
      ctx.fillText(latest.emoji, 80, 80);
      if (latest.label) {
        ctx.font = 'bold 20px "Outfit", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillText(latest.label, 80, 138);
      }
    }

    const spriteTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, transparent: true, opacity: 1 });
    const sprite = new THREE.Sprite(spriteMat);

    const randomOffset = (Math.random() - 0.5) * 3.8;
    sprite.position.set(randomOffset, 2.6, (Math.random() - 0.5) * 2.8);
    sprite.scale.set(2.4, 2.4, 1);

    reactionGroupRef.current.add(sprite);
  }, [reactions]);

  const opponents = players.filter((p) => p.id !== myPlayerId);

  return (
    <div className="relative w-full h-full select-none overflow-hidden" ref={mountRef}>
      {/* Tournament Opponent Plates across the top of the arena */}
      <div className="absolute top-14 sm:top-16 left-0 right-0 z-10 flex items-center justify-center gap-2 px-3 pointer-events-none flex-wrap">
        {opponents.map((opp) => {
          const isOppTurn = players[currentPlayerIndex]?.id === opp.id;
          const isVulnerable = opp.cards.length === 1 && !opp.hasCalledUno;

          const auraBorder =
            opp.aura === 'gold'
              ? 'border-amber-400'
              : opp.aura === 'neon'
              ? 'border-slate-300'
              : opp.aura === 'crimson'
              ? 'border-rose-500'
              : opp.aura === 'amethyst'
              ? 'border-purple-400'
              : opp.aura === 'emerald'
              ? 'border-emerald-400'
              : 'border-zinc-500';

          return (
            <div
              key={opp.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl backdrop-blur-md transition-all ${
                isOppTurn
                  ? 'bg-amber-950/80 border border-amber-400 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)] scale-105'
                  : 'bg-black/55 border border-white/10 text-slate-300'
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-7 h-7 rounded-lg bg-black/60 text-sm border ${auraBorder} shrink-0`}
              >
                <span>{opp.avatar}</span>
                {isOppTurn && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>

              <div className="flex flex-col text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white max-w-[90px] truncate">
                    {opp.name}
                  </span>
                  {opp.title && (
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      {opp.title.split(' ')[0]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      opp.cards.length === 1 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-400'
                    }`}
                  >
                    {opp.cards.length} {opp.cards.length === 1 ? 'card' : 'cards'}
                  </span>
                  {opp.hasCalledUno && (
                    <span className="font-bold text-rose-400 font-mono tracking-wider">
                      [UNO!]
                    </span>
                  )}
                </div>
              </div>

              {/* Tournament Penalty Challenge ("Catch UNO!") */}
              {isVulnerable && onChallengeUno && (
                <button
                  onClick={() => onChallengeUno(opp.id)}
                  className="pointer-events-auto ml-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg animate-bounce cursor-pointer"
                  title="Opponent failed to call UNO! Challenge to deal 3 penalty cards (Basic+ rule)"
                >
                  Catch!
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Table State Readout & Draw Action Dock (Bottom-left of felt) */}
      <div className="absolute bottom-44 sm:bottom-48 left-3 sm:left-6 z-20 flex items-center gap-2.5 pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md text-xs text-slate-300 font-medium shadow-xl">
          <span
            className="w-3 h-3 rounded-full border border-white/40 shadow-sm animate-pulse"
            style={{
              backgroundColor: colorHexMap[currentColor]
                ? `#${colorHexMap[currentColor].toString(16).padStart(6, '0')}`
                : '#3b82f6',
              boxShadow: `0 0 10px ${
                colorHexMap[currentColor]
                  ? `#${colorHexMap[currentColor].toString(16).padStart(6, '0')}`
                  : '#3b82f6'
              }`,
            }}
          />
          <span className="font-black uppercase tracking-wider text-white">
            {currentColor}
          </span>
          <span className="text-white/30" aria-hidden="true">·</span>
          <span className="text-slate-300 font-medium">
            {direction === 1 ? '↻ Clockwise' : '↺ Counter-Clockwise'}
          </span>
          <span className="text-white/30" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-400">
            {drawPileCount} in deck
          </span>
        </div>

        {/* Diegetic Quick Draw Button */}
        {isMyTurn && canDraw && (
          <button
            onClick={onDrawCard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.5)] border border-amber-300 transition-all cursor-pointer text-xs uppercase tracking-wider"
            title="Draw a card from the deck"
          >
            <span>🎴</span>
            <span>Draw Card</span>
          </button>
        )}

        {/* Pass Turn Button (when human player drew card) */}
        {isMyTurn && canPass && onPassTurn && (
          <button
            onClick={onPassTurn}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md shadow-lg transition-all cursor-pointer text-xs"
            title="Pass your turn"
          >
            <span>Pass Turn</span>
            <span>➔</span>
          </button>
        )}
      </div>
    </div>
  );
};
