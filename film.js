const CHAPTERS = [
  { id: "title", label: "片名", duration: 7000 },
  { id: "estuary", label: "江海", duration: 8500 },
  { id: "scale", label: "尺度", duration: 10500 },
  { id: "shores", label: "两岸", duration: 11000 },
  { id: "height", label: "高度", duration: 9000 },
  { id: "port", label: "港口", duration: 8500 },
  { id: "streets", label: "街巷", duration: 10500 },
  { id: "arrive", label: "抵达", duration: 8000 },
];

const SVG_NS = "http://www.w3.org/2000/svg";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = document.getElementById("stage");
const rail = document.getElementById("rail");
const fill = document.getElementById("fill");
const clock = document.getElementById("clock");
const nowEl = document.getElementById("now");
const scrub = document.getElementById("scrub");
const toggle = document.getElementById("toggle");
const replay = document.getElementById("replay");

let phase = "poster";
let playing = false;
let elapsed = 0;
let last = 0;
let currentId = "";
let booted = false;
let dragging = false;

function total() {
  return CHAPTERS.reduce((sum, chapter) => sum + chapter.duration, 0);
}

function chapterStart(index) {
  return CHAPTERS.slice(0, index).reduce((sum, chapter) => sum + chapter.duration, 0);
}

function chapterAt(ms) {
  let cursor = 0;
  for (let index = 0; index < CHAPTERS.length; index += 1) {
    const chapter = CHAPTERS[index];
    if (ms < cursor + chapter.duration || index === CHAPTERS.length - 1) {
      return {
        chapter,
        index,
        start: cursor,
        local: Math.min(Math.max(0, ms - cursor), chapter.duration),
      };
    }
    cursor += chapter.duration;
  }
  return null;
}

function fmt(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function svg(name, attrs, parent) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (parent) parent.appendChild(node);
  return node;
}

function rand(n) {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function windows(group, x, y, w, h, seed) {
  const cols = Math.max(1, Math.floor((w - 8) / 14));
  const rows = Math.max(1, Math.floor((h - 10) / 18));
  let n = seed;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      n += 1;
      const on = rand(n) > 0.3;
      const rect = svg("rect", {
        x: x + 5 + col * ((w - 8) / cols),
        y: y + 6 + row * ((h - 10) / rows),
        width: 3.2,
        height: 5.5,
        class: on ? "win on" : "win",
      }, group);
      if (on) rect.style.animationDelay = `${(x / 1920) * 1.2 + rand(n + 9) * 1.6}s`;
    }
  }
}

function mountSkyline(root) {
  const base = 392;
  svg("rect", { x: 0, y: base, width: 1920, height: 108, class: "water" }, root);

  const bund = [
    { x: 70, w: 84, h: 108 },
    { x: 164, w: 58, h: 186, clock: true },
    { x: 232, w: 110, h: 132 },
    { x: 352, w: 138, h: 168, dome: true },
    { x: 500, w: 72, h: 118 },
    { x: 582, w: 96, h: 146 },
    { x: 688, w: 48, h: 198, spire: true },
    { x: 746, w: 120, h: 112 },
    { x: 876, w: 78, h: 128 },
  ];

  bund.forEach((building, index) => {
    const y = base - building.h;
    if (building.dome) {
      svg("ellipse", {
        cx: building.x + building.w / 2,
        cy: y,
        rx: building.w * 0.34,
        ry: 22,
        class: "b-bund",
      }, root);
    }
    svg("rect", { x: building.x, y, width: building.w, height: building.h, class: "b-bund" }, root);
    if (building.clock) {
      svg("circle", {
        cx: building.x + building.w / 2,
        cy: y + 30,
        r: 16,
        class: "pearl",
      }, root);
      windows(root, building.x, y + 54, building.w, building.h - 62, 40 + index * 17);
    } else if (building.spire) {
      svg("rect", {
        x: building.x + building.w / 2 - 2,
        y: y - 34,
        width: 4,
        height: 34,
        class: "pearl",
      }, root);
      windows(root, building.x, y + 8, building.w, building.h - 16, 40 + index * 17);
    } else {
      windows(root, building.x, y + (building.dome ? 16 : 8), building.w, building.h - 18, 40 + index * 17);
    }
  });

  addPearl(root, 1188, base);
  addPagoda(root, 1348, base, 226);
  addAperture(root, 1496, base, 265);
  addTower(root, 1688, base, 340);

  for (let i = 0; i < 5; i += 1) {
    const line = svg("line", {
      x1: 980,
      x2: 1140,
      y1: 408 + i * 10,
      y2: 408 + i * 10,
      class: "shimmer",
    }, root);
    line.style.animationDelay = `${i * 0.35}s`;
  }

  const ferry = svg("g", { class: "ferry" }, root);
  svg("rect", { x: 0, y: 0, width: 72, height: 12, rx: 2 }, ferry);
  svg("rect", { x: 18, y: -10, width: 26, height: 10 }, ferry);

  svg("text", { x: 470, y: 454, class: "sky-label" }, root).textContent = "外滩";
  svg("text", { x: 1460, y: 454, class: "sky-label" }, root).textContent = "陆家嘴";
  svg("text", { x: 1768, y: 454, class: "sky-label" }, root).textContent = "示意";
}

function addPearl(group, x, base) {
  svg("rect", { x: x - 4, y: base - 250, width: 8, height: 250, class: "b-pudong" }, group);
  svg("circle", { cx: x, cy: base - 78, r: 28, class: "pearl" }, group);
  svg("circle", { cx: x, cy: base - 162, r: 15, class: "pearl" }, group);
  svg("circle", { cx: x, cy: base - 214, r: 8, class: "pearl" }, group);
  svg("rect", { x: x - 1.5, y: base - 292, width: 3, height: 78, class: "pearl" }, group);
}

function addPagoda(group, x, base, height) {
  const steps = [76, 64, 52, 40, 28, 18];
  const stepH = height / steps.length;
  let y = base;
  steps.forEach((w, index) => {
    y -= stepH;
    svg("rect", { x: x - w / 2, y, width: w, height: stepH + 0.5, class: "b-pudong" }, group);
    windows(group, x - w / 2, y, w, stepH, 300 + index * 13);
  });
  svg("polygon", { points: `${x},${y - 34} ${x - 7},${y} ${x + 7},${y}`, class: "pearl" }, group);
}

function addAperture(group, x, base, height) {
  const holeTop = base - height + 34;
  const d = [
    `M ${x - 48} ${base}`,
    `L ${x + 48} ${base}`,
    `L ${x + 30} ${base - height}`,
    `L ${x - 30} ${base - height} Z`,
    `M ${x - 16} ${holeTop}`,
    `L ${x + 16} ${holeTop}`,
    `L ${x + 16} ${holeTop + 42}`,
    `L ${x - 16} ${holeTop + 42} Z`,
  ].join(" ");
  svg("path", { d, "fill-rule": "evenodd", class: "b-pudong" }, group);
  windows(group, x - 36, base - height + 90, 72, height - 110, 480);
}

function addTower(group, x, base, height) {
  const floors = 18;
  const slice = height / floors;
  for (let i = 0; i < floors; i += 1) {
    const t = i / (floors - 1);
    const w = 92 - t * 34;
    const sway = Math.sin(t * Math.PI * 2) * 16;
    const y = base - (i + 1) * slice;
    const cx = x + sway;
    svg("polygon", {
      points: `${cx - w / 2},${y + slice} ${cx + w / 2},${y + slice} ${cx + w / 2 - 2},${y} ${cx - w / 2 + 2},${y}`,
      class: "b-pudong",
    }, group);
    if (i % 2 === 0) {
      const pane = svg("rect", {
        x: cx - 10,
        y: y + 3,
        width: 20,
        height: Math.max(3, slice - 6),
        class: "win on",
      }, group);
      pane.style.animationDelay = `${0.3 + t * 2}s`;
    }
  }
  svg("rect", { x: x - 1, y: base - height - 26, width: 2, height: 26, class: "pearl" }, group);
}

function mountHarbor(root) {
  const colors = ["#5c3333", "#234845", "#8a7040", "#2e3d58", "#4a3d34", "#1b3c38", "#6b3a32", "#314844"];
  ["near", "far"].forEach((kind, laneIndex) => {
    const lane = document.createElement("div");
    lane.className = kind === "far" ? "lane far" : "lane";
    for (let copy = 0; copy < 2; copy += 1) {
      for (let i = 0; i < 18; i += 1) {
        const box = document.createElement("span");
        const size = i % 5 === 0 ? "t" : i % 3 === 0 ? "m" : i % 4 === 0 ? "s" : "";
        box.className = size ? `box ${size}` : "box";
        box.style.background = colors[(i + laneIndex * 3) % colors.length];
        lane.appendChild(box);
      }
    }
    root.appendChild(lane);
  });
}

function buildRail() {
  CHAPTERS.forEach((chapter, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = chapter.id;
    button.textContent = `${String(index).padStart(2, "0")}  ${chapter.label}`;
    button.addEventListener("click", () => seek(chapterStart(index)));
    rail.appendChild(button);
  });
}

function setPhase(next) {
  phase = next;
  stage.dataset.phase = phase;
  stage.classList.toggle("is-poster", phase === "poster");
  stage.classList.toggle("is-live", phase !== "poster");
  stage.classList.toggle("is-paused", phase === "paused");
  stage.classList.toggle("is-ended", phase === "ended");
  toggle.hidden = phase === "poster";
  replay.hidden = phase !== "ended";
  const label = phase === "ended" ? "重播" : phase === "playing" ? "暂停" : "继续";
  toggle.textContent = label;
  toggle.setAttribute("aria-label", label);
}

function showScene(id) {
  document.querySelectorAll(".scene").forEach((scene) => {
    const on = scene.id === `scene-${id}`;
    scene.classList.remove("is-on");
    scene.hidden = !on;
    if (on) {
      void scene.offsetWidth;
      scene.classList.add("is-on");
    }
    scene.inert = !on;
    scene.setAttribute("aria-hidden", on ? "false" : "true");
  });
  rail.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-current", button.dataset.id === id ? "true" : "false");
  });
  currentId = id;
}

function updateDynamic(pos) {
  const scene = document.getElementById(`scene-${pos.chapter.id}`);
  scene.querySelectorAll("[data-count]").forEach((node) => {
    const target = Number(node.dataset.count);
    const decimals = Number(node.dataset.decimals || 0);
    const duration = Number(node.dataset.dur || 1600);
    const delay = Number(node.dataset.delay || 0);
    const progress = reduced ? 1 : Math.min(1, Math.max(0, (pos.local - delay) / duration));
    const eased = 1 - (1 - progress) ** 3;
    node.textContent = (target * eased).toFixed(decimals);
  });

  if (pos.chapter.id !== "streets") return;
  const sceneDuration = pos.chapter.duration;
  const index = reduced ? -1 : Math.min(2, Math.floor(pos.local / (sceneDuration / 3)));
  scene.querySelectorAll(".beat").forEach((beat, beatIndex) => {
    beat.classList.toggle("is-show", reduced || beatIndex === index);
  });
}

function updateHud(pos) {
  const length = total();
  const ratio = length === 0 ? 0 : elapsed / length;
  fill.style.transform = `scaleX(${ratio})`;
  scrub.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  scrub.setAttribute("aria-valuetext", `${fmt(elapsed)} / ${fmt(length)}`);
  clock.textContent = `${fmt(elapsed)} / ${fmt(length)}`;
  nowEl.textContent = pos.chapter.label;
}

function paint(seek) {
  const pos = chapterAt(elapsed);
  if (seek || pos.chapter.id !== currentId) showScene(pos.chapter.id);
  updateDynamic(pos);
  updateHud(pos);
}

function seek(ms, autoplay = true) {
  elapsed = Math.max(0, Math.min(ms, total()));
  if (elapsed >= total()) {
    playing = false;
    setPhase("ended");
  } else if (autoplay) {
    playing = true;
    setPhase("playing");
    last = performance.now();
  } else {
    playing = false;
    setPhase("paused");
  }
  paint(true);
}

function onPrimary() {
  if (phase === "poster" || phase === "ended") {
    seek(0);
    return;
  }
  if (phase === "playing") {
    playing = false;
    setPhase("paused");
    return;
  }
  playing = true;
  setPhase("playing");
  last = performance.now();
}

function bind() {
  document.getElementById("play").addEventListener("click", () => seek(0));
  replay.addEventListener("click", () => seek(0));
  toggle.addEventListener("click", onPrimary);

  scrub.addEventListener("pointerdown", (event) => {
    dragging = true;
    scrub.setPointerCapture(event.pointerId);
    seek(eventRatio(event) * total());
  });
  scrub.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    elapsed = eventRatio(event) * total();
    const pos = chapterAt(elapsed);
    if (pos.chapter.id !== currentId) showScene(pos.chapter.id);
    if (elapsed >= total()) {
      playing = false;
      setPhase("ended");
    } else if (phase !== "playing") {
      playing = true;
      setPhase("playing");
      last = performance.now();
    }
    updateDynamic(pos);
    updateHud(pos);
  });
  scrub.addEventListener("pointerup", () => {
    dragging = false;
  });
  scrub.addEventListener("keydown", (event) => {
    if (event.code === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      seek(elapsed + 5000);
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      seek(Math.max(0, elapsed - 5000));
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) onPrimary();
      return;
    }
    if (event.target === scrub) return;
    if (event.code === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  });
}

function eventRatio(event) {
  const rect = scrub.getBoundingClientRect();
  if (rect.width === 0) return 0;
  return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
}

function step(direction) {
  const pos = chapterAt(Math.min(elapsed, total() - 1));
  const index = Math.min(CHAPTERS.length - 1, Math.max(0, pos.index + direction));
  seek(chapterStart(index));
}

function tick(now) {
  if (playing && !document.hidden && !dragging) {
    elapsed += now - last;
    if (elapsed >= total()) {
      elapsed = total();
      playing = false;
      setPhase("ended");
    }
    paint(false);
  }
  last = now;
  requestAnimationFrame(tick);
}

function boot() {
  if (booted) return;
  booted = true;
  mountSkyline(document.getElementById("skyline"));
  mountHarbor(document.getElementById("harbor"));
  buildRail();
  bind();
  document.getElementById("hint").textContent = `片长 ${fmt(total())}`;
  const params = new URLSearchParams(location.search);
  if (params.get("shot") === "1") stage.classList.add("is-shot");
  if (params.get("autoplay") === "1") {
    seek(Number(params.get("t") || 0) * 1000);
  } else if (params.has("t")) {
    seek(Number(params.get("t")) * 1000, params.get("pause") !== "1");
  } else {
    setPhase("poster");
    paint(true);
  }
  stage.classList.add("is-ready");
  last = performance.now();
  requestAnimationFrame(tick);
}

document.fonts.ready.then(boot);
setTimeout(boot, 2500);
