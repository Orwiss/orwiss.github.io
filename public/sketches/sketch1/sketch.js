let div = 20, ascii = []

function setup() {
  createCanvas(windowWidth, windowHeight)
  colorMode(HSB)
  textFont('Noto Sans')
  textAlign(CENTER, CENTER)
  textSize(56)
  
  for (let y = 0; y < height; y += height / div) {
    for (let x = 0; x < width; x += width / div) {
      if (x == 0 || y == 0) continue
      ascii.push(new Typo(x, y))
    }
  }
}

function draw() {
  background(0)
  
  ascii.forEach (txt => txt.display(createVector(mouseX, mouseY)))
}

class Typo {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.txt = 33
    this.num = 33
    this.count = 0
  }
  
  display(mouse) {
    if (mouseIsPressed) {
      let power = constrain(map(dist(mouse.x, mouse.y, this.x, this.y), 0, max(width, height) / 4, 10, 0), 0, 10)
      this.num += int(power)
    }
    
    if (this.txt < this.num) this.txt ++
    else if (this.txt == this.num && this.num > 33) {
      if (this.count < 30) this.count ++
      else { this.num --; this.count = 0 }
    }
    else this.txt = this.num
    
    fill((this.txt * 4) % 360, 100, 100)
    text(char(this.txt), this.x, this.y)
  }
}