let mobile = false;
let fontGraphics;
let skeleton;
let modules = [];
let groups = [];
let fSize = 0;
let firstGroupColor;
let fontMap = {};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(60);
  colorMode(HSB);
  rectMode(CENTER);

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
    strokeWeight(1);
    beginShape();
    g.forEach(m => vertex(m.x, m.y));
    endShape();
    
    g.forEach(pt => {
      pt.update(mouseNorm);
      pt.display();
    });
  });
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
      let m  = new Module(mx, my, gi);
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
  constructor(x, y, group) {
    this.sx = x;
    this.sy = y;
    this.x = x;
    this.y = y;
    this.group = group;
    this.angle = 0;
    this.r = 4 + fSize / 64;
    this.minX = 0;
    this.maxX = 0;
  }

  update(mouseNorm) {
    if (this.group in groups) {
      let groupPoints = groups[this.group];
      let xs = groupPoints.map(p => p.sx);
      this.minX = Math.min(...xs);
      this.maxX = Math.max(...xs);
    }

    let localNorm = (this.sx - this.minX) / ((this.maxX - this.minX) || 1);
    let d = abs(localNorm - mouseNorm);
    this.scale = constrain(map(d, 0, 1, 4, 0.5), 0.5, 8);
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    ellipse(0, 0, this.r * this.scale, this.r * this.scale, 6);
    pop();
  }
}