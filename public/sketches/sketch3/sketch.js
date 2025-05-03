let mobile = false;
let fontGraphics;
let skeleton;
let modules = [];
let groups = [];
let fSize = 0;
let firstGroupColor;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL2);
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
  
  regenerateSkeleton('Type:Lab', 8);
}

function draw() {
  background(0);
  // translate(-width / 2, -height / 2);

  let mouseNorm = mobile? constrain(map(rotationY, -90, 90, -0.2, 1.2), 0, 1) : constrain(mouseX / width, 0, 1);

  groups.forEach((g, index) => {
    // fill(map(idx, 0, groups.length - 1, 0, 255), 100, 200);
    let h = (hue(firstGroupColor) + index * 10) % 360;
    fill(h, saturation(firstGroupColor), brightness(firstGroupColor));
    noStroke();

    g.forEach(pt => {
      pt.update(mouseNorm);
      pt.display();
    });
  });
}

function regenerateSkeleton(inputText, density = 8) {
  modules = [];
  groups = [];

  fontGraphics.background(255);
  fontGraphics.fill(0);
  fontGraphics.textAlign(LEFT, TOP);

  let tSize = 10;
  while (tSize < 500) {
    fontGraphics.textSize(tSize);
    let tWidth = fontGraphics.textWidth(inputText);
    let tHeight = fontGraphics.textAscent() + fontGraphics.textDescent();
    if (tWidth > width * 0.9 || tHeight > height * 0.9) break;
    tSize += 2;
  }
  fontGraphics.textSize(tSize - 2);
  fSize = tSize - 2;

  const letterList = inputText.split('').map(ch => fontGraphics.textWidth(ch));
  const totalWidth = letterList.reduce((a, b) => a + b, 0) || 1;
  const offsetX = (width - totalWidth) / 2;
  const offsetY = (height - (fontGraphics.textAscent() + fontGraphics.textDescent())) / 2;

  fontGraphics.background(255);
  fontGraphics.fill(0);

  let acc = 0;
  for (let i = 0; i < letterList.length; i++) {
    fontGraphics.text(inputText[i], offsetX + acc, offsetY);
    acc += letterList[i];
  }

  let img = fontGraphics.get();
  img.loadPixels();

  let binaryImg = [];
  for (let y = 0; y < img.height; y++) {
    let rows = [];
    for (let x = 0; x < img.width; x++) {
      let idx = 4 * (y * img.width + x);
      let val = img.pixels[idx];
      rows.push(val < 128 ? 1 : 0);
    }
    binaryImg.push(rows);
  }

  skeleton = zhangSuen(binaryImg);
  skeleton = downsampleSkeletonByDistance(skeleton, density);

  const startX = [];
  const endX = [];
  acc = 0;
  for (let i = 0; i < letterList.length; i++) {
    startX[i] = offsetX + acc;
    endX[i] = startX[i] + letterList[i];
    acc += letterList[i];
  }

  for (let y = 0; y < skeleton.length; y++) {
    for (let x = 0; x < skeleton[0].length; x++) {
      if (skeleton[y][x] === 1) {
        let idx = 0;
        for (let i = 0; i < startX.length; i++) {
          if (x >= startX[i] && x < endX[i]) { idx = i; break; }
        }
        let m = new Module(x, y, idx);
        modules.push(m);
        if (!groups[idx]) groups[idx] = [];
        groups[idx].push(m);
      }
    }
  }

  // ⬇ 여기서 연결 기반 정렬 및 angle 설정
  for (let i = 0; i < groups.length; i++) {
    if (!groups[i] || groups[i].length === 0) continue;  // ← 이 줄 추가
  
    let sorted = sortPointsByPath(groups[i]);
    groups[i] = sorted;
  
    for (let j = 0; j < sorted.length; j++) {
      let prev = sorted[max(0, j - 1)];
      let next = sorted[min(j + 1, sorted.length - 1)];
      let angle = atan2(next.y - prev.y, next.x - prev.x);
      sorted[j].angle = angle;
    }
  }
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
    this.scale = constrain(map(d, 0, 1, 4, 0.5), 0.5, 4);
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    ellipse(0, 0, this.r * this.scale, this.r * this.scale, 6);
    pop();
  }
}

window.updateFromUI = function(entry) {
  regenerateSkeleton(entry.text, entry.density);
  firstGroupColor = color(entry.firstColor || '#ff0000');
};