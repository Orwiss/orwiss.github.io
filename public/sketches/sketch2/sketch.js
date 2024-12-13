let { Engine, World, Body, Bodies, Mouse } = Matter
let engine, world, mouse, mouseObject, object = [], gravity = 0.000003

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight)
  frameRate(30)
  rectMode(CENTER)
  noStroke()
  colorMode(HSB)
  fill(32)
  
  engine = Engine.create()
  Matter.Runner.create()
  world = engine.world
  Matter.Runner.run(engine)
  
  //Remove Gravity
  world.gravity.x = 0
  world.gravity.y = 0
  
  //Mouse Set
  mouse = Mouse.create(cnv.elt)
  mouse.pixelRatio = window.devicePixelRatio
  let mouseOption = { mouse: mouse }
  
  //Wall Set
  wall = [Bodies.rectangle(width / 2, -5, width, 10,
                           { friction: 0.1, restitution: 0.95, isStatic: true }),
  Bodies.rectangle(-5, height / 2, 10, height,
                   { friction: 0.1, restitution: 0.95, isStatic: true }),
  Bodies.rectangle(width + 5, height / 2, 10, height,
                   { friction: 0.1, restitution: 0.95, isStatic: true }),
  Bodies.rectangle(width / 2, height + 5, width, 10,
                   { friction: 0.1, restitution: 0.95, isStatic: true })]
  World.add(world, wall)
  
  //Big Circle Set
  mouseObject = Bodies.circle(width / 2, height / 2, 60,
                              { friction: 0.1, restitution: 0.95 })
  World.add(world, mouseObject)
  
  //Circle Particle Set
  let circleNum = int(random(48, 64))
  for (let i = 0; i < circleNum; i++) {
    let c = color(random(20, 180), 100, 90)
    object.push(new circles(random(width), random(height), random(5, 20), c))
  }
  
  //Triangle Particle Set
  let triangleNum = int(random(36, 48))
  for (let i = 0; i < triangleNum; i++) {
    let c = color(random(25, 180), 100, 90)
    object.push(new triangles(random(width), random(height), random(5, 20), c))
  }
  
  //Sqaure Particle Set
  let squareNum = int(random(36, 48))
  for (let i = 0; i < squareNum; i++) {
    let c = color(random(20, 180), 100, 90)
    object.push(new squares(random(width), random(height), random(5, 20), c))
  }
}

function draw() {
  background(0)
  Engine.update(engine)
  
  //Draw Big Circle
  circle(mouseObject.position.x, mouseObject.position.y, 120)
	
  //Big circle follows mouse position
  Body.setPosition(mouseObject, { x: mouse.position.x, y: mouse.position.y })  
  
  //Draw Particles
  for (let i = 0; i < object.length; i++) {
    object[i].draw()
  }
}

function circles(x, y, r, c) {
  let option = {
    friction: 0,
    restitution: 0.95
  }
  this.body = Bodies.circle(x, y, r, option)
  
  World.add(world, this.body)
  
  this.draw = function() {
    let force = createVector(mouseObject.position.x - this.body.position.x, mouseObject.position.y - this.body.position.y)
    force.mult(gravity)
    Body.applyForce(this.body, this.body.position, { x: force.x, y: force.y })
    
    let pos = this.body.position
    let angle = this.body.angle
    
    push()
    fill(c)
    translate(pos.x, pos.y)
    rotate(angle)
    circle(0, 0, r * 2)
    pop()
  }
}

function squares(x, y, r, c) {
  let option = {
    friction: 0,
    restitution: 0.95
  }
  this.body = Bodies.circle(x, y, r, option)
  
  World.add(world, this.body)
  
  this.draw = function() {
    let force = createVector(mouseObject.position.x - this.body.position.x, mouseObject.position.y - this.body.position.y)
    force.mult(gravity)
    Body.applyForce(this.body, this.body.position, { x: force.x, y: force.y })
    
    let pos = this.body.position
    let angle = this.body.angle
    
    push()
    fill(c)
    translate(pos.x, pos.y)
    rotate(angle)
    square(0, 0, r * 2)
    pop()
  }
}

function triangles(x, y, r, c) {
  let option = {
    friction: 0,
    restitution: 0.95
  }
  this.body = Bodies.polygon(x, y, 3, r, option)
  
  World.add(world, this.body)
  
  this.draw = function() {
    let force = createVector(mouseObject.position.x - this.body.position.x, mouseObject.position.y - this.body.position.y)
    force.mult(gravity)
    Body.applyForce(this.body, this.body.position, { x: force.x, y: force.y })
    
    let pos = this.body.position
    let angle = this.body.angle
    
    push()
    fill(c)
    translate(pos.x, pos.y)
    rotate(angle)
    triangle(cos(-TWO_PI / 6) * r, sin(-TWO_PI / 6) * r, cos(TWO_PI / 6) * r, sin(TWO_PI / 6) * r, cos(TWO_PI / 2) * r, sin(TWO_PI / 2) * r)
    pop()
  }
}