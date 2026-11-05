import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RepoData } from '../types'
import { caseFile, colorFor, statusOf } from '../theme'

interface Props {
  repos: RepoData[]
  filter?: string
  compact?: boolean
  onSelect?: (repo: RepoData) => void
}

interface LaidNode {
  repo: RepoData
  pos: THREE.Vector3
  scale: number
  active: boolean
  color: string
  domainIdx: number
}

interface Cluster {
  name: string
  center: THREE.Vector3
  count: number
  top: number
}

/** Deterministic 0..1 hash so the layout is stable across rerenders. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

function makeLabel(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.font = '700 96px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // dim the label color so bloom doesn't wash it into an unreadable blob
  const dim = new THREE.Color(color).multiplyScalar(0.42).getStyle()
  ctx.shadowColor = dim
  ctx.shadowBlur = 10
  ctx.fillStyle = dim
  ctx.fillText(text, 512, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(7.5, 1.9, 1)
  return sprite
}

/* ---- shader: neuron membrane (fresnel rim glow) ---- */
const MEMBRANE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const MEMBRANE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform float uFresPow;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float ndv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
    float fres = pow(1.0 - ndv, uFresPow);
    // hot nucleus glint facing the camera — the bright core look of AI-brain renders
    float nucleus = pow(ndv, 12.0);
    float a = (0.10 + fres * 0.9 + nucleus * 0.45) * uOpacity;
    vec3 col = uColor * (0.55 + fres * 1.7) * uIntensity
      + vec3(1.0, 0.97, 0.9) * nucleus * 0.95 * uIntensity;
    gl_FragColor = vec4(col, a);
  }
`

/* ---- shader: synapse tubes (flowing energy pulses) ---- */
const SYNAPSE_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aDomA;
  attribute float aDomB;
  attribute vec3 aColor;
  varying vec2 vUv;
  varying float vPhase;
  varying float vDomA;
  varying float vDomB;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vPhase = aPhase;
    vDomA = aDomA;
    vDomB = aDomB;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SYNAPSE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uFilter; /* -1 = ALL, else domain index */
  varying vec2 vUv;
  varying float vPhase;
  varying float vDomA;
  varying float vDomB;
  varying vec3 vColor;

  float comet(float t) {
    return smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.05, 0.22, t));
  }

  void main() {
    float vis = 1.0;
    if (uFilter > -0.5) {
      vis = (abs(vDomA - uFilter) < 0.5 || abs(vDomB - uFilter) < 0.5) ? 1.0 : 0.05;
    }
    float t1 = fract(vUv.x * 2.0 - uTime * 0.16 + vPhase);
    float t2 = fract(vUv.x * 1.0 + uTime * 0.11 + vPhase * 2.3);
    float head = comet(t1) + comet(t2) * 0.7;
    // soft afterglow trailing each pulse head
    float halo = comet(t1 + 0.07) * 0.5 + comet(t2 + 0.07) * 0.3;
    float ends = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
    vec3 base = vColor * 0.34;
    vec3 hot = mix(vColor, vec3(1.0, 0.97, 0.86), 0.75);
    vec3 col = base + hot * (head * 2.0 + halo * 0.7);
    float alpha = (0.15 + head * 1.0 + halo * 0.3) * ends * vis;
    gl_FragColor = vec4(col, alpha);
  }
`

/* ---- shader: radar sweep on the floor plane ---- */
const SWEEP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SWEEP_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    float ang = atan(c.y, c.x);
    float t = fract(uTime * 0.11 - ang / 6.2831853);
    // tight trail: only the wedge edge glows, no flat haze across the disc
    float trail = pow(1.0 - t, 14.0);
    float ring = smoothstep(0.1, 0.18, r) * (1.0 - smoothstep(0.78, 1.0, r));
    float alpha = trail * ring * 0.5;
    vec3 col = mix(vec3(0.96, 0.73, 0.26), vec3(0.37, 0.78, 0.77), trail * 0.45);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

/* ---- shader: neon uplink beams (straight lasers from the core) ---- */
const BEAM_VERT = /* glsl */ `
  attribute float aT;
  attribute float aPhase;
  attribute vec3 aColor;
  varying float vT;
  varying float vPhase;
  varying vec3 vColor;
  void main() {
    vT = aT;
    vPhase = aPhase;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BEAM_FRAG = /* glsl */ `
  uniform float uTime;
  varying float vT;
  varying float vPhase;
  varying vec3 vColor;
  void main() {
    float g = fract(uTime * 0.45 + vPhase);
    float pulse = smoothstep(0.22, 0.0, abs(vT - g));
    // each beam flickers on for stretches, dark for stretches
    float gate = smoothstep(0.35, 0.65, sin(uTime * 1.3 + vPhase * 6.2831853) * 0.5 + 0.5);
    float alpha = (0.05 + pulse * 0.95) * gate;
    vec3 col = mix(vColor, vec3(1.0), pulse * 0.65);
    gl_FragColor = vec4(col * alpha * 1.7, alpha);
  }
`

/* ---- shader: vertical scanner ring climbing through the brain ---- */
const SCAN_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float ring = smoothstep(0.05, 0.0, abs(r - 0.62));
    float alpha = ring * 0.5;
    vec3 col = mix(vec3(0.18, 0.95, 0.88), vec3(1.0, 0.25, 0.85), 0.5 + 0.5 * sin(uTime * 0.6));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

/* ---- final grade pass: chromatic aberration + vignette + film grain ---- */
const GRADE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const GRADE_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform vec2 uRes;
  varying vec2 vUv;
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  void main() {
    vec2 uv = vUv;
    vec2 dir = uv - 0.5;
    float d2 = dot(dir, dir);
    // chromatic aberration, strongest at frame edges
    float ab = 0.006 * d2;
    vec3 col;
    col.r = texture2D(tDiffuse, uv + dir * ab).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv - dir * ab).b;
    // vignette
    float vig = smoothstep(1.05, 0.3, length(dir) * 1.35);
    col *= mix(0.66, 1.04, vig);
    // fine film grain
    float grain = hash21(uv * uRes + fract(uTime) * 137.0);
    col += (grain - 0.5) * 0.04;
    gl_FragColor = vec4(col, 1.0);
  }
`

export default function Constellation3D({ repos, filter = 'ALL', compact = false, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ repo: RepoData; x: number; y: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const hoverNameRef = useRef<string | null>(null)
  const filterRef = useRef(filter)
  filterRef.current = filter

  // ---- layout (pure data, rebuilt only when repos change) ----
  const layout = useMemo(() => {
    const active = repos.filter(r => !r.archived && !r.fork)
    const domains = Array.from(new Set(active.map(r => r.domain))).sort()
    const domainIndex: Record<string, number> = {}
    domains.forEach((d, i) => (domainIndex[d] = i))

    const groups: Record<string, RepoData[]> = {}
    active.forEach(r => {
      if (!groups[r.domain]) groups[r.domain] = []
      groups[r.domain].push(r)
    })

    const ringR = 15
    // squash/stretch into an overall brain-shaped ellipsoid + dorsal dome
    const brainify = (x: number, y: number, z: number) => {
      const r2 = x * x + z * z
      const dome = Math.max(0, 1 - r2 / (ringR * ringR * 1.5))
      return new THREE.Vector3(x * 1.3, y * 0.75 + 4.0 * dome, z * 1.1)
    }

    const nodes: LaidNode[] = []
    const clusters: Cluster[] = []

    domains.forEach((domain, di) => {
      const angle = (di / Math.max(1, domains.length)) * Math.PI * 2 - Math.PI / 2
      const center = brainify(Math.cos(angle) * ringR, Math.sin(di * 1.9) * 4, Math.sin(angle) * ringR)
      const list = groups[domain]
      const m = list.length
      const rad = m === 1 ? 0 : 3.2 + Math.sqrt(m) * 1.15
      let top = -Infinity
      list.forEach((repo, j) => {
        const a = (j / m) * Math.PI * 2 + hash(repo.name) * 0.5
        const jitter = (hash(repo.name + 'j') - 0.5) * 1.8
        const rr = rad + jitter
        const oy = (hash(repo.name + 'y') - 0.5) * 4
        const pos = brainify(
          center.x / 1.3 + Math.cos(a) * rr,
          center.y / 0.75 + oy - 4.0 * Math.max(0, 1 - (center.x * center.x + center.z * center.z) / (ringR * ringR * 1.5)),
          center.z / 1.1 + Math.sin(a) * rr,
        )
        top = Math.max(top, pos.y)
        nodes.push({
          repo,
          pos,
          scale: 0.38 + Math.min(1.15, Math.sqrt(repo.stargazers_count) * 0.45 + hash(repo.name + 's') * 0.18),
          active: repo.days_since_push < 30,
          color: colorFor(repo.domain),
          domainIdx: domainIndex[repo.domain] ?? -1,
        })
      })
      clusters.push({ name: domain, center, count: m, top: Number.isFinite(top) ? top : center.y })
    })
    return { nodes, clusters, domainIndex }
  }, [repos])

  // ---- synapse links: shared language chains + nearest-neighbour proximity ----
  const edges = useMemo(() => {
    const pairs = new Map<string, { a: number; b: number }>()
    const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)
    const add = (a: number, b: number) => {
      if (a !== b) pairs.set(key(a, b), { a, b })
    }

    // semantic link: repos sharing a language channel
    const langMap: Record<string, number[]> = {}
    layout.nodes.forEach((n, i) => {
      const l = n.repo.language
      if (!l) return
      if (!langMap[l]) langMap[l] = []
      langMap[l].push(i)
    })
    Object.values(langMap).forEach(group => {
      for (let i = 0; i < group.length - 1 && i < 5; i++) add(group[i], group[i + 1])
    })

    // structural link: 2 nearest neighbours (dense neural-net look)
    layout.nodes.forEach((n, i) => {
      layout.nodes
        .map((m, j) => ({ j, d: m.pos.distanceToSquared(n.pos) }))
        .filter(x => x.j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach(x => add(i, x.j))
    })

    return Array.from(pairs.values()).slice(0, 230)
  }, [layout])

  // ---- three.js scene ----
  const sceneApi = useRef<{ nodeMeshes: THREE.Mesh[]; applyFilter: (f: string) => void } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    } catch {
      setFailed(true)
      return
    }

    const w = container.clientWidth || 600
    const h = container.clientHeight || 400
    // supersample up to 2x device resolution for true hi-DPI / 4K crispness
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h)
    renderer.domElement.style.display = 'block'
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0c0b)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400)
    // motion effects were explicitly requested — run them regardless of OS setting
    const reduced = false
    // cinematic dolly-in: open pulled far back, ease into the working framing
    const camEnd = new THREE.Vector3(0, compact ? 13 : 15, compact ? 50 : 47)
    const camStart = new THREE.Vector3(0, compact ? 30 : 28, compact ? 80 : 74)
    camera.position.copy(reduced ? camEnd : camStart)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 2.2, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.minDistance = 14
    controls.maxDistance = 90
    controls.autoRotate = false // spins up when the intro finishes
    controls.autoRotateSpeed = compact ? 0.3 : 0.45
    const speed = reduced ? 0.3 : 1
    let introDone = reduced

    // ---- central brain core ----
    const coreInner = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xffe9bd }),
    )
    scene.add(coreInner)

    const glowTex = makeGlowTexture()

    const coreGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xf5b942,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    })
    const coreGlow = new THREE.Sprite(coreGlowMat)
    coreGlow.scale.setScalar(9)
    scene.add(coreGlow)

    const coreWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.7, 1),
      new THREE.MeshBasicMaterial({ color: 0xf5b942, wireframe: true, transparent: true, opacity: 0.2 }),
    )
    scene.add(coreWire)

    const coreShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 32, 24),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xf5b942) },
          uIntensity: { value: 1.0 },
          uOpacity: { value: 0.8 },
          uFresPow: { value: 2.4 },
        },
        vertexShader: MEMBRANE_VERT,
        fragmentShader: MEMBRANE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    scene.add(coreShell)

    // ---- outer aura shell (faint containment glow) ----
    const aura = new THREE.Mesh(
      new THREE.IcosahedronGeometry(17, 3),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xf5b942) },
          uIntensity: { value: 0.22 },
          uOpacity: { value: 0.03 },
          uFresPow: { value: 4.5 },
        },
        vertexShader: MEMBRANE_VERT,
        fragmentShader: MEMBRANE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    aura.scale.set(1.3, 0.8, 1.15)
    scene.add(aura)

    // ---- starfield + neural dust ----
    const starCount = 800
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 70 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.cos(phi)
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x9a9486, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.65,
    })))

    const dustGroup = new THREE.Group()
    const mkDust = (count: number, size: number, color: string, opacity: number, rMin: number, rMax: number) => {
      const pos = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const r = rMin + Math.random() * (rMax - rMin)
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.3
        pos[i * 3 + 1] = r * Math.cos(phi) * 0.7
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 1.1
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      dustGroup.add(new THREE.Points(g, new THREE.PointsMaterial({
        map: glowTex, color, size, sizeAttenuation: true, transparent: true,
        opacity, blending: THREE.AdditiveBlending, depthWrite: false,
      })))
    }
    mkDust(260, 0.5, '#d9c08a', 0.4, 8, 30)
    mkDust(140, 1.1, '#8fd0cc', 0.25, 10, 32)
    mkDust(110, 0.9, '#ff5fd8', 0.2, 9, 30)
    mkDust(90, 0.8, '#8dff5a', 0.16, 10, 30)
    scene.add(dustGroup)

    // ---- distant nebula glow (depth behind the brain) ----
    const nebulaColors: [number, number][] = [
      [0xf5b942, 0.06],
      [0x5ec8c5, 0.05],
      [0xa58bd4, 0.045],
      [0xff8c42, 0.04],
    ]
    nebulaColors.forEach(([col, op], i) => {
      for (let k = 0; k < 3; k++) {
        const mat = new THREE.SpriteMaterial({
          map: glowTex,
          color: col,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: op,
          rotation: hash(`neb-rot-${i}-${k}`) * Math.PI,
        })
        const s = new THREE.Sprite(mat)
        const a = ((i * 3 + k) / 12) * Math.PI * 2 + hash(`neb-a-${i}-${k}`) * 2
        const r = 95 + hash(`neb-r-${i}-${k}`) * 55
        s.position.set(Math.cos(a) * r, (hash(`neb-y-${i}-${k}`) - 0.5) * 90, Math.sin(a) * r)
        s.scale.setScalar(55 + hash(`neb-s-${i}-${k}`) * 70)
        scene.add(s)
      }
    })

    // ---- radar sweep across the floor ----
    const sweepMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: SWEEP_VERT,
      fragmentShader: SWEEP_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sweep = new THREE.Mesh(new THREE.PlaneGeometry(54, 54), sweepMat)
    sweep.rotation.x = -Math.PI / 2
    sweep.position.y = -10.8
    scene.add(sweep)

    // ---- vertical scanner ring climbing through the neural mass ----
    const scanMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: SWEEP_VERT,
      fragmentShader: SCAN_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), scanMat)
    scan.rotation.x = -Math.PI / 2
    scan.position.y = -7
    scene.add(scan)

    // ---- neon uplink beams: straight lasers core → assets ----
    const beamCount = 12
    const beamPos = new Float32Array(beamCount * 6)
    const beamT = new Float32Array(beamCount * 2)
    const beamPhase = new Float32Array(beamCount * 2)
    const beamColor = new Float32Array(beamCount * 6)
    const neonColors = ['#2ff3e0', '#ff3fd8', '#b6ff2f', '#9d5cff'].map(c => new THREE.Color(c))
    for (let i = 0; i < beamCount; i++) {
      const target = layout.nodes[Math.floor(hash(`beam-${i}`) * layout.nodes.length)]
      if (!target) continue
      const origin = new THREE.Vector3(
        (hash(`beam-ox-${i}`) - 0.5) * 6,
        1 + (hash(`beam-oy-${i}`) - 0.5) * 4,
        (hash(`beam-oz-${i}`) - 0.5) * 6,
      )
      const col = neonColors[i % neonColors.length]
      const ph = hash(`beam-p-${i}`)
      beamPos.set([origin.x, origin.y, origin.z, target.pos.x, target.pos.y, target.pos.z], i * 6)
      beamT[i * 2] = 0
      beamT[i * 2 + 1] = 1
      beamPhase[i * 2] = ph
      beamPhase[i * 2 + 1] = ph
      beamColor.set([col.r, col.g, col.b], i * 6)
      beamColor.set([col.r, col.g, col.b], i * 6 + 3)
    }
    const beamGeo = new THREE.BufferGeometry()
    beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3))
    beamGeo.setAttribute('aT', new THREE.BufferAttribute(beamT, 1))
    beamGeo.setAttribute('aPhase', new THREE.BufferAttribute(beamPhase, 1))
    beamGeo.setAttribute('aColor', new THREE.BufferAttribute(beamColor, 3))
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    scene.add(new THREE.LineSegments(beamGeo, beamMat))

    // ---- radar floor rings ----
    const ringMat = new THREE.LineBasicMaterial({ color: 0x383e2e, transparent: true, opacity: 0.45 })
    ;[8, 15, 22].forEach(r => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2
        pts.push(new THREE.Vector3(Math.cos(a) * r * 1.3, -11, Math.sin(a) * r * 1.1))
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat))
    })

    // ---- neurons ----
    const sphereGeo = new THREE.SphereGeometry(1, 48, 32)
    const coreGeo = new THREE.SphereGeometry(0.4, 32, 24)

    interface Neuron {
      group: THREE.Group
      mem: THREE.ShaderMaterial
      coreMat: THREE.MeshBasicMaterial
      glowMat: THREE.SpriteMaterial
      base: LaidNode
      cur: number
    }
    const neurons: Neuron[] = []
    const nodeMeshes: THREE.Mesh[] = []

    layout.nodes.forEach(item => {
      const group = new THREE.Group()
      group.position.copy(item.pos)
      group.scale.setScalar(item.scale)

      const mem = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(item.color) },
          uIntensity: { value: item.active ? 1.0 : 0.55 },
          uOpacity: { value: item.active ? 1 : 0.55 },
          uFresPow: { value: 2.0 },
        },
        vertexShader: MEMBRANE_VERT,
        fragmentShader: MEMBRANE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const membrane = new THREE.Mesh(sphereGeo, mem)
      membrane.userData.repo = item.repo
      group.add(membrane)
      nodeMeshes.push(membrane)

      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(item.color).lerp(new THREE.Color(0xffffff), 0.55),
        transparent: true,
        opacity: item.active ? 1 : 0.55,
      })
      const core = new THREE.Mesh(coreGeo, coreMat)
      group.add(core)

      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(item.color),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: item.active ? 0.5 : 0.18,
      })
      const glow = new THREE.Sprite(glowMat)
      glow.scale.setScalar(3.6)
      group.add(glow)

      scene.add(group)
      neurons.push({ group, mem, coreMat, glowMat, base: item, cur: item.scale })
    })

    // ---- synapses: merged tube geometry + flowing pulse shader ----
    let synapseMat: THREE.ShaderMaterial | null = null
    const tubeGeos: THREE.BufferGeometry[] = []
    edges.forEach(({ a, b }) => {
      const na = layout.nodes[a]
      const nb = layout.nodes[b]
      const mid = na.pos.clone().add(nb.pos).multiplyScalar(0.5)
      const dist = na.pos.distanceTo(nb.pos)
      const outward = mid.lengthSq() > 0.5 ? mid.clone().normalize() : new THREE.Vector3(0, 1, 0)
      const ctrl = mid
        .clone()
        .add(outward.multiplyScalar(dist * 0.16 + 0.8))
      ctrl.y += dist * 0.1 + 0.6
      const curve = new THREE.QuadraticBezierCurve3(na.pos.clone(), ctrl, nb.pos.clone())
      const geo = new THREE.TubeGeometry(curve, 44, 0.055, 8, false)
      const count = geo.getAttribute('position').count
      geo.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(count).fill(hash(`${a}:${b}`)), 1))
      geo.setAttribute('aDomA', new THREE.BufferAttribute(new Float32Array(count).fill(na.domainIdx), 1))
      geo.setAttribute('aDomB', new THREE.BufferAttribute(new Float32Array(count).fill(nb.domainIdx), 1))
      const col = new THREE.Color(na.color).lerp(new THREE.Color(nb.color), 0.5)
      const colArr = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) colArr.set([col.r, col.g, col.b], i * 3)
      geo.setAttribute('aColor', new THREE.BufferAttribute(colArr, 3))
      tubeGeos.push(geo)
    })

    const merged = mergeGeometries(tubeGeos)
    tubeGeos.forEach(g => g.dispose())
    if (merged) {
      synapseMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFilter: { value: -1 },
        },
        vertexShader: SYNAPSE_VERT,
        fragmentShader: SYNAPSE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      scene.add(new THREE.Mesh(merged, synapseMat))
    }

    // ---- domain labels (skipped in compact mode) ----
    const labels: { sprite: THREE.Sprite; domain: string }[] = []
    if (!compact) {
      layout.clusters.forEach(cl => {
        const sprite = makeLabel(`${cl.name} · ${cl.count}`, colorFor(cl.name))
        sprite.position.set(cl.center.x, cl.top + 3.2, cl.center.z)
        scene.add(sprite)
        labels.push({ sprite, domain: cl.name })
      })
    }

    // ---- filtering ----
    const applyFilter = (f: string) => {
      const fIdx = f === 'ALL' ? -1 : (layout.domainIndex[f] ?? -1)
      if (synapseMat) synapseMat.uniforms.uFilter.value = fIdx
      neurons.forEach(n => {
        const match = f === 'ALL' || n.base.repo.domain === f
        n.mem.uniforms.uOpacity.value = match ? (n.base.active ? 1 : 0.55) : 0.05
        n.coreMat.opacity = match ? (n.base.active ? 1 : 0.55) : 0.06
        n.glowMat.opacity = match ? (n.base.active ? 0.5 : 0.18) : 0
      })
      labels.forEach(l => {
        l.sprite.visible = f === 'ALL' || l.domain === f
      })
    }
    applyFilter(filter)
    sceneApi.current = { nodeMeshes, applyFilter }

    // ---- bloom post-processing (the AI-brain glow) ----
    // HDR + 4x MSAA render target for clean edges, bloom fed at device resolution
    const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2())
    const composerRT = new THREE.WebGLRenderTarget(drawSize.x, drawSize.y, {
      type: THREE.HalfFloatType,
      samples: 4,
    })
    const composer = new EffectComposer(renderer, composerRT)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(drawSize.x, drawSize.y), 0.9, 0.6, 0.4)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // ---- final grade: chromatic aberration + vignette + film grain ----
    const gradePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(w, h) },
      },
      vertexShader: GRADE_VERT,
      fragmentShader: GRADE_FRAG,
    })
    gradePass.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio())
    composer.addPass(gradePass)

    // ---- raycasting ----
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pick = (e: PointerEvent): RepoData | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(nodeMeshes, false)
      if (hits.length === 0) return null
      const repo = (hits[0].object as THREE.Mesh).userData.repo as RepoData
      if (filterRef.current !== 'ALL' && repo.domain !== filterRef.current) return null
      return repo
    }

    let downAt: { x: number; y: number } | null = null

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const repo = pick(e)
      hoverNameRef.current = repo ? repo.name : null
      if (repo) {
        setHover({ repo, x: e.clientX - rect.left, y: e.clientY - rect.top })
        renderer.domElement.style.cursor = onSelectRef.current ? 'pointer' : 'crosshair'
      } else {
        setHover(null)
        renderer.domElement.style.cursor = 'grab'
      }
    }
    const onPointerLeave = () => {
      hoverNameRef.current = null
      setHover(null)
    }
    const onPointerDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY }
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!downAt) return
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y)
      downAt = null
      if (moved > 6 || !onSelectRef.current) return
      const repo = pick(e)
      if (repo) onSelectRef.current(repo)
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    // ---- resize ----
    const resize = () => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      if (nw === 0 || nh === 0) return
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
      composer.setSize(nw, nh)
      gradePass.uniforms.uRes.value.set(nw * renderer.getPixelRatio(), nh * renderer.getPixelRatio())
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // ---- animation ----
    let raf = 0
    const startTime = performance.now()
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const elapsed = (performance.now() - startTime) / 1000
      const t = elapsed * speed

      if (synapseMat) synapseMat.uniforms.uTime.value = t
      sweepMat.uniforms.uTime.value = elapsed
      gradePass.uniforms.uTime.value = elapsed
      beamMat.uniforms.uTime.value = elapsed
      scanMat.uniforms.uTime.value = elapsed
      // scanner ring climbs and dives through the brain
      scan.position.y = -7 + (Math.sin(elapsed * 0.32) * 0.5 + 0.5) * 17

      neurons.forEach((n, i) => {
        // gentle breathing bob
        n.group.position.y = n.base.pos.y + Math.sin(t * 0.55 + i * 1.7) * 0.2
        // scale: hover lift with smooth approach
        const hoverBoost = hoverNameRef.current === n.base.repo.name ? 1.35 : 1
        const target = n.base.scale * hoverBoost
        n.cur += (target - n.cur) * 0.15
        n.group.scale.setScalar(n.cur)
        // activity pulse
        if (n.base.active) {
          const pulse = Math.sin(t * 1.8 + i * 1.3) * 0.5 + 0.5
          n.mem.uniforms.uIntensity.value = (hoverNameRef.current === n.base.repo.name ? 1.5 : 1.0) + pulse * 0.5
          n.glowMat.opacity = Math.min(1, (n.mem.uniforms.uOpacity.value > 0.5 ? 0.42 + pulse * 0.25 : 0)) *
            (n.mem.uniforms.uOpacity.value > 0.1 ? 1 : 0)
        } else if (hoverNameRef.current === n.base.repo.name) {
          n.mem.uniforms.uIntensity.value = 1.1
        } else {
          n.mem.uniforms.uIntensity.value = 0.55
        }
      })

      // brain core breathing
      const corePulse = Math.sin(t * 1.2) * 0.5 + 0.5
      coreInner.scale.setScalar(1 + corePulse * 0.14)
      coreGlowMat.opacity = 0.55 + corePulse * 0.25
      coreWire.rotation.y = t * 0.06
      coreWire.rotation.x = t * 0.035
      coreShell.scale.setScalar(1 + corePulse * 0.1)

      aura.rotation.y = t * 0.01
      if (!reduced) dustGroup.rotation.y = t * 0.02

      // cinematic dolly-in, then hand off to orbit + auto-rotate
      if (!introDone) {
        const k = Math.min(1, elapsed / 2.0)
        const ease = 1 - Math.pow(1 - k, 3)
        camera.position.lerpVectors(camStart, camEnd, ease)
        if (k >= 1) {
          introDone = true
          controls.autoRotate = true
        }
      }

      controls.update()
      composer.render()
    }
    animate()

    // ---- cleanup ----
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      scene.traverse(obj => {
        const any = obj as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }
        any.geometry?.dispose()
        const mats = Array.isArray(any.material) ? any.material : any.material ? [any.material] : []
        mats.forEach(m => {
          const withMap = m as THREE.SpriteMaterial
          withMap.map?.dispose()
          m.dispose()
        })
      })
      glowTex.dispose()
      ringMat.dispose()
      bloom.dispose()
      composer.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
      sceneApi.current = null
    }
    // layout/edges are stable for a given repos array; filter applied via sceneApi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, edges, compact])

  // apply domain filter without rebuilding the scene
  useEffect(() => {
    sceneApi.current?.applyFilter(filter)
    setHover(null)
  }, [filter])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {failed && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
          3D RENDERER UNAVAILABLE — WEBGL REQUIRED
        </div>
      )}
      <div className="constellation-hint">DRAG · ORBIT &nbsp;·&nbsp; SCROLL · ZOOM &nbsp;·&nbsp; CLICK · DOSSIER</div>
      {hover && (
        <div className="node-tip" style={{ left: Math.min(hover.x + 14, (containerRef.current?.clientWidth ?? 400) - 230), top: hover.y + 14 }}>
          <div className="node-tip-name" style={{ color: colorFor(hover.repo.domain) }}>{hover.repo.name}</div>
          <div className="node-tip-meta">{caseFile(hover.repo.name)} · {hover.repo.domain} · {hover.repo.language || 'UNKNOWN'}</div>
          <div className="node-tip-stats">
            {hover.repo.stargazers_count}★ {hover.repo.forks_count}⑂ {hover.repo.open_issues_count} OPEN · {statusOf(hover.repo)}
          </div>
          {onSelect && <div className="node-tip-cta">CLICK FOR FULL DOSSIER →</div>}
        </div>
      )}
    </div>
  )
}
