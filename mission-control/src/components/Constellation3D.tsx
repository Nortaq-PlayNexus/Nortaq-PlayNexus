import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
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
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function makeLabel(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.font = '600 52px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // dim the label color so bloom doesn't wash it into an unreadable blob
  const dim = new THREE.Color(color).multiplyScalar(0.42).getStyle()
  ctx.shadowColor = dim
  ctx.shadowBlur = 6
  ctx.fillStyle = dim
  ctx.fillText(text, 256, 64)
  const tex = new THREE.CanvasTexture(c)
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
    float a = (0.10 + fres * 0.9) * uOpacity;
    vec3 col = uColor * (0.55 + fres * 1.7) * uIntensity;
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
    float ends = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
    vec3 base = vColor * 0.30;
    vec3 hot = mix(vColor, vec3(1.0, 0.96, 0.82), 0.7);
    vec3 col = base + hot * head * 1.5;
    float alpha = (0.13 + head * 0.85) * ends * vis;
    gl_FragColor = vec4(col, alpha);
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
    camera.position.set(0, compact ? 13 : 15, compact ? 50 : 47)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.minDistance = 14
    controls.maxDistance = 90
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = compact ? 0.3 : 0.45
    const speed = reduced ? 0.3 : 1

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
    scene.add(dustGroup)

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
    const sphereGeo = new THREE.SphereGeometry(1, 24, 18)
    const coreGeo = new THREE.SphereGeometry(0.4, 16, 12)

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
          uIntensity: { value: item.active ? 1.0 : 0.4 },
          uOpacity: { value: item.active ? 1 : 0.45 },
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
        opacity: item.active ? 1 : 0.4,
      })
      const core = new THREE.Mesh(coreGeo, coreMat)
      group.add(core)

      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(item.color),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: item.active ? 0.5 : 0.12,
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
      const geo = new THREE.TubeGeometry(curve, 30, 0.05, 5, false)
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
        n.mem.uniforms.uOpacity.value = match ? (n.base.active ? 1 : 0.45) : 0.05
        n.coreMat.opacity = match ? (n.base.active ? 1 : 0.4) : 0.06
        n.glowMat.opacity = match ? (n.base.active ? 0.5 : 0.12) : 0
      })
      labels.forEach(l => {
        l.sprite.visible = f === 'ALL' || l.domain === f
      })
    }
    applyFilter(filter)
    sceneApi.current = { nodeMeshes, applyFilter }

    // ---- bloom post-processing (the AI-brain glow) ----
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.75, 0.5, 0.45)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

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
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // ---- animation ----
    let raf = 0
    const clock = new THREE.Clock()
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime() * speed

      if (synapseMat) synapseMat.uniforms.uTime.value = t

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
          n.mem.uniforms.uIntensity.value = 0.4
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
