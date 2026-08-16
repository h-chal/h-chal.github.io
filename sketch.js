// Boid code adapted from
// https://p5js.org/examples/classes-and-objects-flocking/
// License: https://creativecommons.org/licenses/by-nc-sa/4.0/


var canvas;
var flock;
var maxTriangleDistance = 150;
var cloudCoverage = 0;
var frameCounter = 0;

function setup() {
  colorMode(HSL);
  const [width, height] = getTargetCanvasDimensions()
  canvas = createCanvas(width, height);
  canvas.position(0, 0);
  canvas.style('z-index', '-1')

  

  flock = new Flock();
  // Add an initial set of boids into the system
  for (let i = 0; i < 100; i++) {
    let b = new Boid(random(0, width), random(0, height));
    flock.addBoid(b);
  }
}

function draw() {
  background(207, 100, 80, 100);
  flock.triangles();
  flock.run();
  
  // Update coverage display every 10 frames
  frameCounter++;
  if (frameCounter >= 50) {
    frameCounter = 0;
    let coverageElement = document.getElementById('cloud-coverage');
    if (coverageElement) {
      coverageElement.textContent = cloudCoverage.toFixed(1) + '%';
    }
  }
}

function getTargetCanvasDimensions() {
  const css = getComputedStyle(canvas.parentElement);
  const marginWidth = round(float(css.marginLeft) + float(css.marginRight));
  const marginHeight = round(float(css.marginTop) + float(css.marginBottom));
  const w = windowWidth - marginWidth;
  const h = windowHeight - marginHeight;
  return [w, h];
}

function windowResized() {
  const [w, h] = getTargetCanvasDimensions()
  resizeCanvas(w, h)
}


// Flock class to manage the array of all the boids
class Flock {
  constructor() {
    // Initialize the array of boids
    this.boids = [];
  }

  run() {
    for (let boid of this.boids) {
      // Pass the entire list of boids to each boid individually
      boid.run(this.boids);
    }
  }

  addBoid(b) {
    this.boids.push(b);
  }

  triangles() {
    const maxDistance = maxTriangleDistance;
  
    // Extract positions into array of [x, y]
    let coords = this.boids.map(b => [b.position.x, b.position.y]);
  
    let delaunay = Delaunator.from(coords);
    let triangles = delaunay.triangles;
  
    let totalArea = 0;
  
    for (let i = 0; i < triangles.length; i += 3) {
      let i0 = triangles[i];
      let i1 = triangles[i + 1];
      let i2 = triangles[i + 2];
    
      let p0 = this.boids[i0].position;
      let p1 = this.boids[i1].position;
      let p2 = this.boids[i2].position;
    
      // Skip triangles with long sides
      if (
        p5.Vector.dist(p0, p1) > maxDistance ||
        p5.Vector.dist(p1, p2) > maxDistance ||
        p5.Vector.dist(p2, p0) > maxDistance
      ) continue;
    
      let v1 = p5.Vector.sub(p1, p0);
      let v2 = p5.Vector.sub(p2, p0);
      let area = Math.abs(v1.cross(v2).z) * 0.5;
    
      // Clip triangle to screen bounds
      let clippedArea = this.clipTriangleToScreen(p0, p1, p2, area);
      totalArea += clippedArea;
    
      // Could use constrain instead
      let brightness = map(1000/area, 0, 1, 0, 1, true);

      push();
      noStroke();
      fill(
        207,
        100,
        lerp(80, 100, brightness)  // Interpolate lightness of HSL colour
      )
      triangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
      pop();
    }
    
    // Calculate cloud coverage percentage
    let screenArea = width * height;
    cloudCoverage = (totalArea / screenArea) * 100;
  }

  // Clip triangle area to screen bounds using Sutherland-Hodgman algorithm
  clipTriangleToScreen(p0, p1, p2, originalArea) {
    // Screen bounds
    let screenPolygon = [
      {x: 0, y: 0},
      {x: width, y: 0},
      {x: width, y: height},
      {x: 0, y: height}
    ];
    
    // Triangle vertices
    let trianglePolygon = [
      {x: p0.x, y: p0.y},
      {x: p1.x, y: p1.y},
      {x: p2.x, y: p2.y}
    ];
    
    // Check if triangle is fully on screen (optimization)
    if (p0.x >= 0 && p0.x <= width && p0.y >= 0 && p0.y <= height &&
        p1.x >= 0 && p1.x <= width && p1.y >= 0 && p1.y <= height &&
        p2.x >= 0 && p2.x <= width && p2.y >= 0 && p2.y <= height) {
      return originalArea;
    }
    
    // Clip against each edge of the screen
    let clipped = trianglePolygon;
    
    // Define screen edges: left, right, top, bottom
    let edges = [
      [{x: 0, y: 0}, {x: 0, y: height}],     // left
      [{x: width, y: 0}, {x: width, y: height}], // right
      [{x: 0, y: 0}, {x: width, y: 0}],      // top
      [{x: 0, y: height}, {x: width, y: height}] // bottom
    ];
    
    for (let edge of edges) {
      clipped = this.clipPolygonByEdge(clipped, edge[0], edge[1]);
      if (clipped.length === 0) return 0;
    }
    
    // Calculate area of clipped polygon
    return this.polygonArea(clipped);
  }
  
  // Clip polygon by a single edge using Sutherland-Hodgman
  clipPolygonByEdge(polygon, edgeStart, edgeEnd) {
    if (polygon.length === 0) return [];
    
    let clipped = [];
    
    for (let i = 0; i < polygon.length; i++) {
      let current = polygon[i];
      let next = polygon[(i + 1) % polygon.length];
      
      let currentInside = this.isPointInsideEdge(current, edgeStart, edgeEnd);
      let nextInside = this.isPointInsideEdge(next, edgeStart, edgeEnd);
      
      if (currentInside && nextInside) {
        clipped.push(next);
      } else if (currentInside && !nextInside) {
        let intersection = this.lineIntersection(current, next, edgeStart, edgeEnd);
        if (intersection) clipped.push(intersection);
      } else if (!currentInside && nextInside) {
        let intersection = this.lineIntersection(current, next, edgeStart, edgeEnd);
        if (intersection) clipped.push(intersection);
        clipped.push(next);
      }
    }
    
    return clipped;
  }
  
  // Check if point is on the "inside" of an edge (left side when looking from start to end)
  isPointInsideEdge(point, edgeStart, edgeEnd) {
    return (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) - 
           (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x) >= 0;
  }
  
  // Find intersection of two line segments
  lineIntersection(p1, p2, p3, p4) {
    let x1 = p1.x, y1 = p1.y;
    let x2 = p2.x, y2 = p2.y;
    let x3 = p3.x, y3 = p3.y;
    let x4 = p4.x, y4 = p4.y;
    
    let denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;
    
    let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  
  // Calculate area of polygon using shoelace formula
  polygonArea(polygon) {
    if (polygon.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      let j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    return Math.abs(area) / 2;
  }
}




class Boid {
  constructor(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.size = 3.0;

    // Maximum speed
    this.maxSpeed = 1;

    // Maximum steering force
    this.maxForce = 0.05;
    // colorMode(HSB);
    // this.color = color(random(256), 255, 255);
  }

  run(boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
  }

  applyForce(force) {
    // We could add mass here if we want: A = F / M
    this.acceleration.add(force);
  }

  // We accumulate a new acceleration each time based on three rules
  flock(boids) {
    let separation = this.separate(boids);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let repelFromMouse = this.repelFromMouse();

    // Arbitrarily weight these forces
    separation.mult(2);
    alignment.mult(0.7);
    cohesion.mult(0.3);
    repelFromMouse.mult(5);


    // Add the force vectors to acceleration
    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(repelFromMouse);
  }

  // Method to update location
  update() {
    // Update velocity
    this.velocity.add(this.acceleration);

    // Limit speed
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);

    // Reset acceleration to 0 each cycle
    this.acceleration.mult(0);
  }

  // A method that calculates and applies a steering force towards a target
  // STEER = DESIRED MINUS VELOCITY
  seek(target) {
    // A vector pointing from the location to the target
    let desired = p5.Vector.sub(target, this.position);

    // Normalize desired and scale to maximum speed
    desired.normalize();
    desired.mult(this.maxSpeed);

    // Steering = Desired minus Velocity
    let steer = p5.Vector.sub(desired, this.velocity);

    // Limit to maximum steering force
    steer.limit(this.maxForce);
    return steer;
  }

  render() {
    // Draw a triangle rotated in the direction of velocity
    // let theta = this.velocity.heading() + radians(90);
    // fill(this.color);
    // stroke(255);
    // push();
    // translate(this.position.x, this.position.y);
    // rotate(theta);
    // beginShape();
    // vertex(0, -this.size * 2);
    // vertex(-this.size, this.size * 2);
    // vertex(this.size, this.size * 2);
    // endShape(CLOSE);
    // pop();

    push();
    fill(255);
    //stroke(50, 157, 250);
    stroke(255);
    circle(this.position.x, this.position.y, 5)
    pop();
  }

  // Wraparound
  borders() {
    let borderPadding = 0.5*maxTriangleDistance
    if (this.position.x < -this.size - borderPadding) {
      this.position.x = width + this.size + borderPadding;
    }

    if (this.position.y < -this.size - borderPadding) {
      this.position.y = height + this.size + borderPadding;
    }

    if (this.position.x > width + this.size + borderPadding) {
      this.position.x = -this.size - borderPadding;
    }

    if (this.position.y > height + this.size + borderPadding) {
      this.position.y = -this.size - borderPadding;
    }
  }

  // Separation
  // Method checks for nearby boids and steers away
  separate(boids) {
    let desiredSeparation = 30;
    let steer = createVector(0, 0);
    let count = 0;

    // For every boid in the system, check if it's too close
    for (let boid of boids) {
      let distanceToNeighbor = p5.Vector.dist(this.position, boid.position);

      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if (distanceToNeighbor > 0 && distanceToNeighbor < desiredSeparation) {
        // Calculate vector pointing away from neighbor
        let diff = p5.Vector.sub(this.position, boid.position);
        diff.normalize();

        // Scale by distance
        diff.div(distanceToNeighbor);
        steer.add(diff);

        // Keep track of how many
        count++;
      }
    }

    // Average -- divide by how many
    if (count > 0) {
      steer.div(count);
    }

    // As long as the vector is greater than 0
    if (steer.mag() > 0) {
      // Implement Reynolds: Steering = Desired - Velocity
      steer.normalize();
      steer.mult(this.maxSpeed);
      steer.sub(this.velocity);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  // Alignment
  // For every nearby boid in the system, calculate the average velocity
  align(boids) {
    let neighborDistance = 75;
    let sum = createVector(0, 0);
    let count = 0;
    for (let i = 0; i < boids.length; i++) {
      let d = p5.Vector.dist(this.position, boids[i].position);
      if (d > 0 && d < neighborDistance) {
        sum.add(boids[i].velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    } else {
      return createVector(0, 0);
    }
  }

  // Cohesion
  // For the average location (i.e., center) of all nearby boids, calculate steering vector towards that location
  cohesion(boids) {
    let neighborDistance = 50;
    let sum = createVector(0, 0); // Start with empty vector to accumulate all locations
    let count = 0;
    for (let i = 0; i < boids.length; i++) {
      let d = p5.Vector.dist(this.position, boids[i].position);
      if (d > 0 && d < neighborDistance) {
        sum.add(boids[i].position); // Add location
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum); // Steer towards the location
    } else {
      return createVector(0, 0);
    }
  }

  repelFromMouse() {
  let mouse = createVector(mouseX, mouseY);
  let desiredSeparation = 200;
  let d = p5.Vector.dist(this.position, mouse);

  if (d < desiredSeparation && d > 0) {
    let flee = p5.Vector.sub(this.position, mouse);
    flee.normalize();
    flee.mult(this.maxSpeed);
    flee.sub(this.velocity);
    flee.limit(this.maxForce);
    return flee;
  } else {
    return createVector(0, 0);
  }
}

} // class Boid