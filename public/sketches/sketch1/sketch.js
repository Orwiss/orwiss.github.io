let div = 60, ascii = []

function setup() {
  createCanvas(windowWidth, windowHeight)
  //colorMode(HSB)
  textFont('Noto Sans')
  textAlign(CENTER, CENTER)
  textSize(56)
  
  for (let y = height < 600 ? 30 : 0; y < height; y += div) {
    for (let x = width < 600 ? 30 : 0; x < width; x += div) {
      if (x == 0 || y == 0) continue
      ascii.push(new Typo(x, y))
    }
  }
}

function draw() {
  background(0)
  
  ascii.forEach (txt => txt.display(createVector(mouseX, mouseY)))
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)

  ascii = ascii.filter(txt => txt.x < width && txt.y < height);

  for (let x = 0; x < width; x += div) {
    for (let y = 0; y < height; y += div) {
      
      if (!ascii.some(txt => txt.x === x && txt.y === y)) {
        if (x == 0 || y == 0) continue
        ascii.push(new Typo(x, y));
      }
    }
  }
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
    
    //fill((this.txt * 4) % 360, 100, 100)
    fill(paletteLerp([
      ['#00FF33', 0],
      ['#FF7100', 0.33],
      ['#00FFD9', 0.67],
      ['#F4C200', 0.75],
      ['#00FF33', 1]
    ], (this.txt - 33) / 100 % 1))
    text(char(this.txt), this.x, this.y)
  }
}