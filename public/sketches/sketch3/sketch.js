let a, b, c, d,
    first, mouse,
    p = [], entire,
    palette = [26, 47, 140, 170]

function setup() {
  createCanvas(windowWidth, windowHeight)
  frameRate(30)
  colorMode(HSB)
	
	m = min(width, height) * 0.1
  
  a = createVector(m, m)
  b = createVector(width - m, m)
  c = createVector(width - m, height - m)
  d = createVector(m, height - m)
  
  entire = (width - m * 2) * (height - m * 2)
  first = [a, b, c, d]
  p.push(new Polygon(first))
}

function draw() {
  background(0);
  
  for (let i = 0; i < p.length; i++) {
    p[i].draw()
    
    if (mouseInPolygon(p[i].points)) {
      fill(180, 72)
      stroke(255)
      strokeWeight(2)
      for (let j = 0; j < p[i].points.length; j++) {
        line(p[i].points[j].x, p[i].points[j].y, mouseX, mouseY)
      }
      
      if (mouse) {
        let rand = getRandom(p[i].points.length + 1)
        for (let j = 0; j < p[i].points.length; j++) {
          for (let k = 0; k < p[i].split(rand).length; k++) {
            let m = p[i].split(rand)[j][k]
            let n = p[i].split(rand)[j][k + 1]
            let z = [m, n, createVector(mouseX, mouseY)]
            
            p.push(new Polygon(z))
          }
        }
        p.splice(i, 1)
        mouse = false
      }
    }
  }
}

function mouseInPolygon(polygon) {
  let cross = 0

  for (let i = 0; i < polygon.length; i++) {
    let m, n
    m = polygon[i]
    n = (i == polygon.length - 1) ? polygon[0]:polygon [i + 1]

    if ((m.y > mouseY) != (n.y > mouseY)) {
      let x = (((n.x - m.x) / (n.y - m.y) * (mouseY - m.y))) + m.x
      if (mouseX < x) {
        cross ++
      }
    }
  }

  return (cross % 2 == 1) ? true:false
}

function getRandom(num) {
  let r = [0, 1]
  for (let i = 0; i < num - 2; i++) {
    r.push(random(1))
  }
  r.sort()
  return r
}

function mouseReleased() {
	mouse = true
}

function keyPressed() {
	if (keyCode == ENTER) {
		saveCanvas('img', 'png')
	}
}

class Polygon {
  constructor(points) {
    this.points = points
    this.size = abs((points[0].x * (points[1].y - points[2].y)
                + points[1].x * (points[2].y - points[0].y)
                + points[2].x * (points[0].y - points[1].y)) / 2)
    this.h = palette[int(random(palette.length - 1))]
    this.b = map(this.size, 0, entire, 100, 0)
  }
  
  draw() {
    fill(this.h, mouseInPolygon(this.points)? 20:90, constrain(map(this.size, 0, entire / 8, 100, 20), 20, 100))
    stroke(128)
    strokeWeight(0.5)
    
    beginShape()
    for (let i = 0; i < this.points.length; i++) {
      vertex(this.points[i].x, this.points[i].y)
    }
    endShape(CLOSE)
  }
  
  split(r) {
    let splitPoint = []
    
    for (let i = 0; i < this.points.length; i++) {
      let m, n, p = []
      m = this.points[i]
      n = (i == this.points.length - 1) ? this.points[0]:this.points[i + 1]

      for (let j = 0; j < this.points.length + 1; j++) {
        let q = createVector(lerp(m.x, n.x, r[j]), lerp(m.y, n.y, r[j]))
        p.push(q)
      }
      splitPoint.push(p)
    }
    return splitPoint
  }
}