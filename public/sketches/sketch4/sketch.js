let mobile = false;
let fontGraphics;
let skeleton;
let modules = [];
let groups = [];
let fSize = 0;
let firstGroupColor;
let fontMap = {};
let dashPhase = 0;
let movingTrigger = 60;
let mode = 'wave';

const modeGuideMap = {
  'wave': '글자에 에너지가 전달됩니다',
  'line': '스켈레톤이 굵은 선으로 연결됩니다',
  'breath': '글자가 숨 쉬듯 움직입니다',
  'glitch': '선이 해체되고 정렬되어 돌아갑니다',
  'gravity': '글자가 점이 되어 떨어집니다'
};

const guide = document.getElementById('mode-guide');
guide.textContent = modeGuideMap[mode] || '';
guide.style.opacity = 1;
clearTimeout(window.__modeGuideTimeout);
window.__modeGuideTimeout = setTimeout(() => {
  guide.style.opacity = 0;
}, 3000);

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(60);
  colorMode(HSB);
  rectMode(CENTER);
  noiseDetail(64, 0.01);

  mobile = /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent)

  if (typeof(DeviceOrientationEvent) !== 'undefined' && typeof(DeviceOrientationEvent.requestPermission) === 'function') {
		DeviceOrientationEvent.requestPermission()
		DeviceMotionEvent.requestPermission()
	}

  fontGraphics = createGraphics(width, height);
  fontGraphics.pixelDensity(1);

  firstGroupColor = color(0, 100, 100);

  loadDefaultImage();
}

function draw() {
  background(0);
  translate(-width / 2, -height / 2);

  let mouseNorm = mobile? constrain(map(degrees(rotationY), -90, 90, -0.2, 1.2), 0, 1) : constrain(mouseX / width, 0, 1);

  groups.forEach((g, index) => {
    // fill(map(idx, 0, groups.length - 1, 0, 255), 100, 200);
    let h = (hue(firstGroupColor) + index * 10) % 360;
    fill(h, saturation(firstGroupColor), brightness(firstGroupColor));
    noStroke();

    noFill();
    stroke(255);
    beginShape();
    /*
    g.forEach((m, i) => {
      console.log(map(i, 0, g.length, 1, 12));
      if (mode === 'line') strokeWeight(map(i, 0, g.length, 1, 12));
      else strokeWeight(1);
      line(m.x, m.y);
    });
    endShape();
    */

    // if (mode === 'line') dashPhase += 0.0001;
    let dMin = 1e9;
    let segMin = 2, segMax = 12;

    for (let p of g) {
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const d  = Math.hypot(dx, dy);
      if (d < dMin) dMin = d;
    }

    let gap = dMin > 200 ? segMin: map(dMin, 0, 200, segMax, segMin, true);
    // if (mode === 'line') dashPhase += 0.0001;
    
    for (let i = 1; i < g.length; i++) {
      let m = g[i];
      if (mode === 'line') {
        let pc = dashPhase;
        
        strokeCap(SQUARE);
        strokeWeight(map(i, 0, g.length, 1, 32));
        //dashPhase = dashedSegment(g[i-1].x, g[i-1].y, g[i].x, g[i].y, dashPhase, gap, gap);
        pc = dashedSegment(g[i-1].x, g[i-1].y, g[i].x, g[i].y, pc, gap, gap);
        dashPhase = pc * 0.5;
      } else if (mode !== 'glitch') {
        movingTrigger = 60;
        strokeWeight(1);
        line(g[i - 1].x, g[i - 1].y, m.x, m.y);
      }
    }

    g.forEach(pt => {
      pt.update(mouseX, mouseY, mouseX - pmouseX, mouseY - pmouseY);
      pt.display();
    });
  });

  if (mode === 'glitch' && movingTrigger > 0) movingTrigger --;
}

function dashedSegment(x1, y1, x2, y2, phase, dashLen, gapLen) {
  const seg  = dashLen + gapLen;          // 이번 선분의 주기
  const dx   = x2 - x1,  dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const ux   = dx / dist,  uy = dy / dist;

  // 이번 선분 안에서 첫 실선 시작 위치
  for (let t = - (phase % seg); t < dist; t += seg) {
    const a = Math.max(0, t);
    const b = Math.min(t + dashLen, dist);
    if (b > a) {
      line(x1 + ux * a, y1 + uy * a,
           x1 + ux * b, y1 + uy * b);
    }
  }
  return phase + dist;
}

function regenerateSkeleton(input, density = 8) {
  modules = [];
  groups = [];

  fontGraphics.background(255);

  // 비율 유지하며 크기 조절
  let canvasAspect = width / height;
  let imgAspect = input.width / input.height;
  let w, h;

  if (imgAspect > canvasAspect) {
    w = width;
    h = width / imgAspect;
  } else {
    h = height;
    w = height * imgAspect;
  }

  const x0 = (width  - w) / 2;
  const y0 = (height - h) / 2;

  // 캔버스에 비율 맞게 중앙 배치
  fontGraphics.image(input, x0, y0, w, h);
  let img = fontGraphics.get();

  img.loadPixels();
  if (!img.pixels || img.pixels.length === 0) {
    console.warn("⚠ 이미지 픽셀 접근 실패");
    return;
  }
  console.log("🖼️ img pixels length:", img.pixels.length);
  let binaryImg = [];
  console.log("▶ regenerateSkeleton 호출됨");
  console.log("이미지 크기:", img.width, img.height);
  for (let y = 0; y < img.height; y++) {
    let row = [];
    for (let x = 0; x < img.width; x++) {
      let idx = 4 * (y * img.width + x);
      let val = img.pixels[idx];
      row.push(val < 128 ? 1 : 0);
    }
    binaryImg.push(row);
  }

  skeleton = zhangSuen(binaryImg);
  const flatBin = binaryImg.flat().filter(v => v === 1).length;
  console.log("binary 1의 수:", flatBin);

  /* ───── 1. adjacency 맵 (thin 스켈레톤 전체) ───── */
  const H = skeleton.length, W = skeleton[0].length;
  let adj = new Map();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (skeleton[y][x] !== 1) continue;
      let nb = [];
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
        if (!dx && !dy) continue;
        let ny = y+dy, nx = x+dx;
        if (ny>=0 && ny<H && nx>=0 && nx<W && skeleton[ny][nx]===1) nb.push([ny,nx]);
      }
      adj.set(`${y},${x}`, nb);
    }
  }

  /* ───── 2. stroke 추적 (endpoint + loop) ───── */
  let visited = new Set(), strokes = [];

  function traceStroke(startKey){
    let path = [], cur = startKey, prev = null;
    while (true){
      if (visited.has(cur)) break;
      visited.add(cur);  path.push(cur);

      let next = adj.get(cur)
                    .map(([yy,xx]) => `${yy},${xx}`)
                    .find(k => k !== prev && !visited.has(k));
      if (!next) break;
      prev = cur; cur = next;
    }
    if (path.length > 1) strokes.push(path);
  }

  /* 2-A) 끝점(deg==1) 부터 */
  for (let [k, nb] of adj) if (nb.length === 1) traceStroke(k);
  /* 2-B) 남은 픽셀(루프)도 모두 */
  for (let k of adj.keys()) if (!visited.has(k)) traceStroke(k);

  /* ───── 3. stroke 내부에서 density 간격으로 샘플링 ───── */
  modules = []; groups = [];
  const step = density;      // <= 8,4 등 기존 값 그대로
  strokes.forEach((pxArr, gi) => {
    let g = [];
    for (let i = 0; i < pxArr.length; i += step) {
      let [yy, xx] = pxArr[i].split(',').map(Number);
      let mx = x0 + xx;
      let my = y0 + yy;
      let m  = new Module(mx, my, gi, g.length, Math.ceil(pxArr.length / step));
      modules.push(m);
      g.push(m);
    }
    if (g.length) groups.push(g);
  });

  console.log("strokes:", strokes.length,
              "modules:", modules.length,
              "groups :", groups.length);

  // 정렬 및 위치 보정
  console.log("modules.length:", modules.length);
  console.log("groups.length:", groups.length);
  let allY = modules.map(m => m.y);
  let minY = Math.min(...allY);
  let maxY = Math.max(...allY);
  let centerY = (minY + maxY) / 2;
  let shiftY = (height / 2) - centerY;

  for (let m of modules) {
    m.sy += shiftY;
    m.y += shiftY;
  }

  /*
  // 그룹 정렬 및 각도 계산
  for (let i = 0; i < groups.length; i++) {
    if (!groups[i] || groups[i].length === 0) continue;
    let sorted = sortPointsByPath(groups[i]);
    groups[i] = sorted;
    for (let j = 0; j < sorted.length; j++) {
      let prev = sorted[max(0, j - 1)];
      let next = sorted[min(j + 1, sorted.length - 1)];
      sorted[j].angle = atan2(next.y - prev.y, next.x - prev.x);
    }
  }
  */

  skeleton = downsampleSkeletonByDistance(skeleton, density);
  const flatThin = skeleton.flat().filter(v => v === 1).length;
  console.log("thinned skeleton 1의 수:", flatThin);
}

function sortPointsByPath(points) {
  let sorted = [];
  let used = new Set();
  let current = points[0];
  used.add(current);
  sorted.push(current);

  while (used.size < points.length) {
    let minDist = Infinity;
    let nextPoint = null;
    for (let p of points) {
      if (used.has(p)) continue;
      let d = dist(current.x, current.y, p.x, p.y);
      if (d < minDist) {
        minDist = d;
        nextPoint = p;
      }
    }
    if (nextPoint) {
      used.add(nextPoint);
      sorted.push(nextPoint);
      current = nextPoint;
    } else break;
  }

  return sorted;
}

function zhangSuen(image) {
  let changing = true;
  let rows = image.length;
  let cols = image[0].length;
  let img = JSON.parse(JSON.stringify(image));

  while (changing) {
    changing = false;
    let markers = [];

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        if (img[y][x] === 1) {
          let n = getNeighbors(x, y, img);
          let B = n.reduce((a, b) => a + b, 0);
          let A = transitions(n);
          if (B >= 2 && B <= 6 && A === 1 && n[0]*n[2]*n[4] === 0 && n[2]*n[4]*n[6] === 0) {
            markers.push([x, y]);
          }
        }
      }
    }
    if (markers.length > 0) changing = true;
    markers.forEach(([x, y]) => img[y][x] = 0);

    markers = [];

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        if (img[y][x] === 1) {
          let n = getNeighbors(x, y, img);
          let B = n.reduce((a, b) => a + b, 0);
          let A = transitions(n);
          if (B >= 2 && B <= 6 && A === 1 && n[0]*n[2]*n[6] === 0 && n[0]*n[4]*n[6] === 0) {
            markers.push([x, y]);
          }
        }
      }
    }
    if (markers.length > 0) changing = true;
    markers.forEach(([x, y]) => img[y][x] = 0);
  }

  return img;
}

function getNeighbors(x, y, img) {
  return [
    img[y-1][x], img[y-1][x+1], img[y][x+1], img[y+1][x+1],
    img[y+1][x], img[y+1][x-1], img[y][x-1], img[y-1][x-1]
  ];
}

function transitions(n) {
  let t = 0;
  for (let i = 0; i < 8; i++) if (n[i] === 0 && n[(i+1)%8] === 1) t++;
  return t;
}

function downsampleSkeletonByDistance(skel, minDist = 4) {
  let out = create2DArray(skel.length, skel[0].length, 0);
  let lastPoints = [];
  for (let y = 0; y < skel.length; y++) {
    for (let x = 0; x < skel[0].length; x++) {
      if (skel[y][x] === 1) {
        let tooClose = lastPoints.some(([lx, ly]) => (lx-x)**2 + (ly-y)**2 < minDist*minDist);
        if (!tooClose) {
          out[y][x] = 1;
          lastPoints.push([x, y]);
        }
      }
    }
  }
  return out;
}

function create2DArray(r, c, v) {
  return Array.from({ length: r }, () => Array(c).fill(v));
}

class Module {
  constructor(x, y, group, order, groupLen) {
    this.sx = x;
    this.sy = y;
    this.x = x;
    this.y = y;
    this.r = 4 + fSize / 64;
    this.angle = 0;
    this.c = color(random(360), 100, 100);
    this.group = group;
    this.order = order;
    this.groupLen = groupLen;
    this.vx = random(-10, 10);
    this.vy = random(-10, 10);
    this.weight = random(0.5, 1.5);
    this.theta = map(this.x, 0, width, -1, 1);
  }

  update(mx, my, mvx, mvy) {
    if (mode !== 'gravity') {
      this.x = lerp(this.x, this.sx, 0.1);
      this.y = lerp(this.y, this.sy, 0.1);
      this.angle = lerp(this.angle, 0, 0.1);
    }

    if (mode !== 'glitch') this.theta = map(this.x, 0, width, -1, 1);

    /* ── A. 마우스 기여 ──────────────────────── */
    let area = 200;                  // 영향 반경(px)
    let d = dist(this.x, this.y, mx, my);
    let deltaMouse = map(d, 0, area, 4, -0.2, true); // 가까이 3배, 멀면 -0.2

    /* ── B. 파도 기여 (그대로) ───────────────── */
    let deltaPattern = 0;
    if (mode === 'wave') {
      let waveSpeed = 0.03; // 파도 속도
      let t   = (sin(frameCount * waveSpeed) + 1) * 0.5; // 0~1 사인파
      let u   = this.order / (this.groupLen - 1);   // 0~1
      let w   = 0.3;                                // 파도 폭
      deltaPattern = map(abs(u - t), 0, w, 6, 1.5, true);
    } else if (mode === 'breath') {
      let breathSpeed = 0.0075; // 호흡 속도
      // 2-D Perlin noise (x,y) + 3번째 인자에 시간
      let noiseScale = 0.015;
      let n = noise(this.sx * noiseScale, this.sy * noiseScale, frameCount * breathSpeed);   // 시간 진행
      deltaPattern = map(n, 0, 1, 0.5, 24);
    } else if (mode === 'gravity') {
      let r = this.r * this.weight * 2
      let gravity = 0.38 * this.weight; // 중력 가속도
      let resist = 0.78;
      this.vy += gravity;          // ↓ 가속
      this.y  += this.vy;

      const cursorBase = 28;                   // 기본 충돌 반경(px)
      const mv = Math.hypot(mvx, mvy);         // 커서 속도 크기
      const cRad = cursorBase + mv * 1.2;      // 속도에 비례해 커짐

      const dx = this.x - mx;
      const dy = this.y - my;
      const dist = Math.hypot(dx, dy);
      const minD = cRad + this.r;

      if (dist < minD) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        const overlap = minD - dist;

        // 위치 보정
        this.x += nx * overlap;
        this.y += ny * overlap;

        // 속도 반사 + 커서 충격
        const push = 0.1 * mv + 2;    // mv=0이어도 약간 튐
        this.vx += nx * push;
        this.vy += ny * push;

        this.vx *= resist;
        this.vy *= resist;
      }

      // ── 속도·위치 갱신 ────────────────────────
      this.x += this.vx;
      this.y += this.vy;
      this.angle = atan2(this.vy, this.vx); // 속도 방향 각도  

      // 왼쪽 벽
      if (this.x - r < 0) {
        this.x = r;
        this.vx *= -resist;
      }

      // 오른쪽 벽
      else if (this.x + r > width) {
        this.x = width - r;
        this.vx *= -resist;
      }

      // 천장
      if (this.y - r < 0) {
        this.y = r;
        this.vy *= -resist;
      }

      // 바닥 충돌
      if (this.y + r > height) {
        this.y = height - r;        // 바닥 위에 딱 붙이기
        this.vy *= -resist;        // 탄성 반사
        if (this.y + r >= height - 0.5 && Math.abs(this.vy) < 0.5) {
          this.vx *= 0.95;
          if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }
        if (abs(this.vy) < 0.2)    // 거의 멈추면 정지
          this.vy = 0;
      }
    }

    /* ── C. 합산 & 클램프 ────────────────────── */
    this.scale = constrain(1 + deltaMouse + deltaPattern, 0.3, 16);
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    if (mode === 'wave') {
      stroke(255);
      ellipse(0, 0, this.r * this.scale, this.r * this.scale, 6);
    }
    else if (mode === 'breath') {
      noStroke();
      fill((frameCount / 8) % 360, 100, 100);
      circle(0, 0, this.r * this.scale);
    } else if (mode === 'line') {

    } else if (mode === 'gravity') {
      noStroke();
      fill(this.c);
      circle(0, 0, this.r * this.weight * 4);
    } else if (mode === 'glitch') {
      stroke(120, 100, 100);
      this.x = constrain(map(sin(this.theta), -1, 1, 0, width), 0, width);
      if (abs(this.sx - this.x) < 6) circle(0, 0, this.r * this.weight * 8);
      else line(-30, 0, 30, 0);
      this.theta += map(movingTrigger, 0, 60, 0.02, 1);
    }
    pop();
  }
}

function mousePressed() {
  const target = window.event?.target;

  if (
    target &&
    (target.closest('#floating-save-btn') ||
     target.closest('#floating-description-btn') ||
     target.closest('#description-modal'))
  ) {
    return; // UI 요소 클릭 시 무시
  }

  if (mode === 'wave') mode = 'line';
  else if (mode === 'line') mode = 'breath';
  else if (mode === 'breath') mode = 'glitch';
  else if (mode === 'glitch') mode = 'gravity';
  else if (mode === 'gravity') mode = 'wave';

  const guide = document.getElementById('mode-guide');
  guide.textContent = modeGuideMap[mode] || '';
  guide.style.opacity = 1;
  clearTimeout(window.__modeGuideTimeout);
  window.__modeGuideTimeout = setTimeout(() => {
    guide.style.opacity = 0;
  }, 3000);
}