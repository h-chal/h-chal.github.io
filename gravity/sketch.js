// Presets (setting):
// 1: two balls of similar size
// 2: a smaller ball orbitting a bigger one
// 3: binary system
// 4: random :)
// 5: 3 balls
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var setting = parseInt(urlParams.get("preset"));
if (!setting || setting==0 || setting>5) {
  setting = 1 + Math.floor(Math.random(1, 5) * 5);
}

let gravConst = 100;
let playSpeed = 1;
let maxHistory = 300;  // trail length


const screenWidth = 800;
const screenHeight = 800;

function setup() {
  frameRate(60)  // default
  createCanvas(screenWidth, screenHeight);
  
  gravE = createElement("h3", "Gravitational Constant (default is 100):");
  gravE.style("color", "#0474cf");
  gravE.position(20, 5);
  gravInput = createSlider(0, 1000, 100);
  gravInput.position(20, 50);
  gravInput.style("width", "250px")
  repulsive = createCheckbox("Repulsive", false)
  repulsive.position(275, 50)
  repulsive.style("color", "#0474cf")
  
  playSpeedE = createElement("h3", "Simulation Speed:")
  playSpeedE.position(20, 70)
  playSpeedE.style("color", "#0474cf");
  playSpeedInput = createSlider(0, 2, 1, 0.25)
  playSpeedInput.position(20, 115)
  
  spawning = createCheckbox("Click to spawn balls", false)
  spawning.position(20, 140)
  spawning.style("color", "#0474cf")
}

function drawArrow(base, vec) {
  // taken from https://p5js.org/reference/#/p5.Vector/magSq
  push();
  //stroke(myColor);
  //strokeWeight(3);
  //fill(myColor);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 7;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}


class Ball {
  
  constructor(pos, vel, radius) {  // pos and vel should be vectors
    this.pos = pos;
    this.vel = vel;
    this.acc = {x: 0, y: 0};
    this.radius = radius;
    this.mass = 3.14159265358979323846 * this.radius ** 2  // mass = area (density = 1)
    this.history = []
    this.collidedLastFrame = false;
  }
  
  update(){
    this.history.push({x: this.pos.x, y: this.pos.y});
    if (this.history.length > maxHistory) {
      this.history.splice(0, 1);
    }
    let dt = deltaTime / 1000;
    dt *= playSpeed
    
    this.vel.x += this.acc.x * dt;
    this.vel.y += this.acc.y * dt;
    
    this.pos.x += this.vel.x * dt + 0.5 * this.acc.x * dt**2;
    this.pos.y += this.vel.y * dt + 0.5 * this.acc.y * dt**2;
    
    this.acc = {x:0, y:0};
  }
  
  show() {
    circle(this.pos.x, this.pos.y, this.radius*2);
    drawArrow(createVector(this.pos.x, this.pos.y), createVector(this.vel.x, this.vel.y))
  }
  
  showTrail() {
    if (this.history[0]) {
      for (let i = 0; i < this.history.length; i++) {
        point(this.history[i].x, this.history[i].y)
      }
    }
  }
  
  collideBorders() {
    // x:
    if (this.pos.x - this.radius <= 0) {
      this.pos.x = this.radius;
      this.vel.x = abs(this.vel.x);
    } 
    else if (this.pos.x >= screenWidth - this.radius) {
      this.pos.x = screenWidth - this.radius;
      this.vel.x = -1 * abs(this.vel.x);
    }
    
    // y:
    if (this.pos.y - this.radius <= 0) {
      this.pos.y = this.radius;
      this.vel.y = abs(this.vel.y);
    } 
    else if (this.pos.y >= screenHeight - this.radius) {
      this.pos.y = screenHeight - this.radius;
      this.vel.y = -1 * abs(this.vel.y);
    }
  }
  
  attract(other) {  // call once between each pair of balls
    const distX = other.pos.x - this.pos.x;
    const distY = other.pos.y - this.pos.y;
    const dist = sqrt(distX**2 + distY**2);
    const radii = this.radius + other.radius;
    
    if (dist > radii) {  // if balls not overlapping
      this.collidedLastFrame = false  // they didn't collide this frame (this will be used next frame)
      other.collidedLastFrame = false // ^
      
      const force = gravConst * ((this.mass * other.mass) / (dist ** 2))  // magnitude of force
      let dt = deltaTime / 1000;  // time since last frame
      dt *= playSpeed
      if (distX !== 0) {  // avoid divide by zero error
        const forceX = force * (distX / dist);  // same as multiplying by sine of angle
        this.vel.x += (forceX * dt) / this.mass;
        other.vel.x -= (forceX * dt) / other.mass;
      }
      if (distY !== 0) {  // avoid divide by zero error
        const forceY = force * (distY / dist);  // same as multiplying by cosine of angle
        this.vel.y += (forceY * dt) / this.mass;
        other.vel.y -= (forceY * dt) / other.mass;
      }
    } else{  // if balls overlapping
        this.collide(other);
    }
  }
  
  collide(other) {
    // called within attract function
    if (this.collidedLastFrame && other.collidedLastFrame) {
      // don't resolve collision if it was resolved last frame
      return;
    }
    this.collidedLastFrame = true
    other.collidedLastFrame = true
    // followed https://spicyyoghurt.com/tutorials/html5-javascript-game-development/collision-detection-physics
    let vCollision = {x: other.pos.x - this.pos.x, y: other.pos.y - this.pos.y};
    let dist = sqrt(vCollision.x**2 + vCollision.y**2);
    let vCollisionNorm = {x: vCollision.x / dist, y: vCollision.y / dist};  // normalised vector
    let relVel = {x: this.vel.x - other.vel.x, y: this.vel.y - other.vel.y};  // relative vel
    let speed = relVel.x * vCollisionNorm.x + relVel.y * vCollisionNorm.y;  // dot product
    if (speed < 0) {
      return;
    }
    let impulse = 2 * speed / (this.mass + other.mass);
    this.vel.x -= (impulse * other.mass * vCollisionNorm.x);
    this.vel.y -= (impulse * other.mass * vCollisionNorm.y);
    other.vel.x += (impulse * this.mass * vCollisionNorm.x);
    other.vel.y += (impulse * this.mass * vCollisionNorm.y);
   
  }
  
}



let balls = [];

// different initial conditions
switch (setting) {
    case 1:
      balls.push(new Ball({x:400, y:200}, {x:100, y:30}, 50));
      balls.push(new Ball({x:400, y:400}, {x:0, y:0}, 70));
      break;
    case 2:
      balls.push(new Ball({x:400, y:200}, {x:130, y:0}, 10));
      balls.push(new Ball({x:400, y:400}, {x:0, y:0}, 100));
      break;
    case 3:
      balls.push(new Ball({x:400, y:300}, {x:20, y:0}, 30));
      balls.push(new Ball({x:400, y:500}, {x:-20, y:0}, 30));
      break;
    case 4:
      p5 = new p5();  // cannot use random otherwise
      balls.push(new Ball({x:random(0, screenWidth), y:random(0, screenHeight)}, {x:random(-100, 100), y:random(-100, 100)}, random(10, 100)));
      balls.push(new Ball({x:random(0, screenWidth), y:random(0, screenHeight)}, {x:random(-100, 100), y:random(-100, 100)}, random(10, 100)));
      break;
    case 5:
      balls.push(new Ball({x:490, y:300}, {x:20, y:30}, 50));
      balls.push(new Ball({x:200, y:700}, {x:-40, y:-10}, 50));
      balls.push(new Ball({x:600, y:500}, {x:80, y:0}, 50));
    break;
}


var pairs = [];  // taken from https://stackoverflow.com/questions/22566379/how-to-get-all-pairs-of-array-javascript
l = balls.length;
for(var i=0; i<l; i++)
    for(var j=i+1; j<l; j++)
        pairs.push([balls[i], balls[j]]);


function mousePressed() {
  // check if mouse is within rectangular areas to change sliders/checkboxes
  let inGravArea = (mouseX > 15) && (mouseX < 360) &&
    (mouseY > 50) && (mouseY < 70);
  let inSpeedArea = (mouseX > 15) && (mouseX < 160) &&
    (mouseY > 110) && (mouseY < 135);
  let inSpawnArea = (mouseX > 20) && (mouseX < 175) &&
    (mouseY > 135) && (mouseY < 165);
  
  // don't spawn balls if changing sliders/checkboxes or if spawning is disabled
  if (inGravArea || inSpeedArea || inSpawnArea || !spawning.checked()) {
    return;
  }
  
  balls.push(new Ball({x: mouseX, y: mouseY}, {x:random(-50, 50), y:random(-50, 50)}, random(10, 50)))
  
  // create new pair between each existing ball and the new ball
  var l = balls.length;
  for (var i = 0; i < l - 1; i++) {
    pairs.push([balls[i], balls[l-1]]);
  }
}




function draw() {  // mainloop
  background(220);
  
  fill("#0474cf")
  gravConst = gravInput.value()
  text(gravConst, 25, 80)
  playSpeed = playSpeedInput.value()
  text(str(playSpeed + "x"), 160, 130)
  frameRate(60/playSpeed)
  fill(255, 255, 255)
  if (repulsive.checked()) {
    gravConst *= -1;
  }
  
  // per frame functions for each ball
  for (var i = 0; i < balls.length; i++) {
    balls[i].show();
    balls[i].showTrail();
    balls[i].update();
    balls[i].collideBorders();
  }
  
  // per frame functions for each pair of balls
  for (var i = 0; i < pairs.length; i++) {
    pairs[i][0].attract(pairs[i][1]);
    // collide is called within attract for efficiency
  }
  
  
}