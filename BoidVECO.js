// version: ecosystem_GA
class BoidVECO {
  constructor(initPos, specimen, dna, isDebugger) {
    this.pos = initPos.copy();
    this.vel = createVector(random(-2,2), random(-2,2));
    this.acc = createVector(0, 0);

    this.radius = 2;
    this.mass = 1.0
    this.maxSpeed = random(5.2, 5.8);
    this.maxForce = random(0.24, 0.27);
    this.sightRadius = 210;
    this.arrivalRadius = 28;
    this.specimen = specimen;

    this.maxHealth = MAX_HEALTH;
    this.health = 0.7 * this.maxHealth;
    this.dead = false;

    this.dna = null;
    if (dna !== null) {
      this.dna = dna
    } else {
      this.dna = {'separationForceScl': random(0.0, 3.0),
                  'cohesionForceScl': random(0.0, 5.0),
                  'alignmentForceScl': random(0.0, 3.0),
                  'targetForceScl': random(1.0, 6.0), /// -1.5 ~ 1.5 (fight or flight, may outweigh sticking with flock)
                  'retreatForceScl': random(1.0, 6.0), /// 1.0 ~ 5.0 (*80)
                  'scavengeForceScl': random(1.0, 6.0)}
    }

    this.isDebugger = isDebugger;

  }

  steer(desiredVel, limit=true) { // Takes in a desired velocity, returns a steering force towards desired velocity
    // Steer force = Desired - Velocity
    let steer = p5.Vector.sub(desiredVel, this.vel);
    if (limit) {
      steer.limit(this.maxForce);
    }
    return steer;
  }

  seek(desiredPos, fn) { // Takes in a desired position, returns a steering force towards desired position
    // Desired velocity based on vector to target
    let desiredVel = p5.Vector.sub(desiredPos, this.pos);
    let speed = this.arrive(desiredVel, this.arrivalRadius);
    desiredVel.setMag(speed);

    let steerForce = this.steer(desiredVel);
    return steerForce;
  }

  arrive(targetPos, arrivalRadius) {
    let disp = p5.Vector.sub(targetPos, this.pos);
    let dist = disp.mag();
    let desiredVelDir = disp.copy().normalize();
    let speed;
    if (dist < arrivalRadius) { // If distance to target is small, make magnitude of desired velocity proportional to distance
      speed = map(dist, 0, arrivalRadius, 0, this.maxSpeed);
    } else { // If distance to target is large, make magnitude of desired velocity maxSpeed
      speed = this.maxSpeed;
    }
    return desiredVelDir.setMag(speed);
  }

  flee(desiredPos) { // Takes in a desired position, returns a steering force way from desired position
    // Desired velocity based on vector to target
    let desiredVel = p5.Vector.sub(desiredPos, this.pos).mult(-1);
    //let speed = this.arrive(desiredVel, 10);
    desiredVel.setMag(this.maxSpeed);

    let steer = this.steer(desiredVel);
    return steer;
  }

  align(vehicles, sightRadius) { // Desired velocity is average of velocities of all nearby vehicles
    let totalVec = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let dist = p5.Vector.dist(this.pos, other.pos);
      if (dist > 0 && dist <= sightRadius) { // dist>0 is safety mechanism for not fleeing from itself
        totalVec.add(other.vel);
        count++;
      }
    }
    if (count > 0) { // If there are any vehicles nearby to align with
      let desiredVel = totalVec.div(count);
      desiredVel.setMag(this.maxSpeed);
      let steer = this.steer(desiredVel);
      return steer;
    } else {
      let steer = createVector(0, 0);
      return steer;
    }
  }

  separate(vehicles, sightRadius) { // Desired velocity depends on average of distance to nearby vehicles, weighted by distance
    let totalVec = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let dist = p5.Vector.dist(this.pos, other.pos);
      if (dist > 0 && dist <= sightRadius) { // dist>0 is safety mechanism for not fleeing from itself
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(dist); // Velocity away from other is inversely proportional to distance
        totalVec.add(diff);
        count++;
      }
    }
    if (count > 0) {
      let desiredVel = totalVec.div(count);
      desiredVel.setMag(this.maxSpeed);
      let steer = this.steer(desiredVel);
      return steer;
    } else {
      let steer = createVector(0, 0);
      return steer;
    }
  }

  coalesce(vehicles, sightRadius) { // Desired velocity depends on average of distance to nearby vehicles, weighted by distance
    let totalVec = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let dist = p5.Vector.dist(this.pos, other.pos);
      if (dist > 0 && dist <= sightRadius) { // dist>0 is safety mechanism for not fleeing from itself
        let diff = p5.Vector.sub(other.pos, this.pos);
        diff.normalize();
        diff.div(dist); // Velocity towards other is inversely proportional to distance
        totalVec.add(diff);
        count++;
      }
    }
    if (count > 0) {
      let desiredVel = totalVec.div(count);
      desiredVel.setMag(this.maxSpeed);
      let steer = this.steer(desiredVel);
      return steer;
    } else {
      let steer = createVector(0, 0);
      return steer;
    }
  }

  cohesion(vehicles, sightRadius) {
    let totalVec = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let dist = p5.Vector.dist(this.pos, other.pos);
      if (dist > 0 && dist <= sightRadius) {
        totalVec.add(other.pos);
        count++;
      }
    }
    if (count > 0) {
      let desiredPos = totalVec.div(count);
      let steer = this.seek(desiredPos);
      return steer;
    } else {
      let steer = createVector(0, 0);
      return steer;
    }
  }

  interact(boids) {
    let numOwnBoids = 0;
    let totalSeparationVec = createVector(0, 0);
    let totalCohesionVec = createVector(0, 0);
    let totalAlignmentVec = createVector(0, 0);

    let targetBoid = null;
    let targetBoidDist = Infinity;

    for (let boid of boids) {
      let disp = p5.Vector.sub(boid.pos, this.pos);
      let dist = disp.mag();

      if (dist > 0 && dist <= this.sightRadius) { /// dist > 0 is safety mechanism so that boid doesn't consider itself when calculating forces
        if (boid.specimen == this.specimen) {
          /// Separation
          let separationVecDir = disp.copy().normalize().mult(-1); /// Separation direction opposite to that of displacement of other boid from self
          let separationVecMag = Math.pow(1.01, -dist); /// Separation magnitude exponential decay with increasing distance
          let separationVec = separationVecDir.setMag(separationVecMag);
          totalSeparationVec.add(separationVec);

          /// Cohesion
          totalCohesionVec.add(boid.pos.copy());

          /// Alignment
          let alignmentVecDir = boid.vel.copy().normalize(); /// Alignment direction same as that of other boid
          let alignmentVecMag = map(dist, 0, this.sightRadius, boid.vel.mag(), 0); /// Alignment magnitude inversely proportional to distance from that boid
          let alignmentVec = alignmentVecDir.setMag(alignmentVecMag);
          totalAlignmentVec.add(alignmentVec);

          numOwnBoids += 1;
        }

        else {
          if (dist < targetBoidDist) {
            targetBoid = boid;
            targetBoidDist = dist;
          }
        }

      }
    }

    if (numOwnBoids > 0) {
      /// Separation
      let desiredSeparationVel = totalSeparationVec.div(numOwnBoids).setMag(this.maxSpeed); /// desiredSeparationVel has direction of average of separationVecs with nearby boids, but magnitude of maxSpeed
      let separationForce = this.steer(desiredSeparationVel).mult(this.dna.separationForceScl); /// Steer force = desired velocity - current velocity
      this.applyForce(separationForce);

      /// Cohesion
      let desiredCohesionPos = totalCohesionVec.div(numOwnBoids); /// desiredCohesionPos is average position of nearby boids
      let desiredCohesionVel = this.arrive(desiredCohesionPos, this.arrivalRadius); /// desiredCohesionVel has direction towards average position of nearby boids, but magnitude using arrive()
      let cohesionForce = this.steer(desiredCohesionVel).mult(this.dna.cohesionForceScl); /// Steer force = desired velocity - current velocity
      this.applyForce(cohesionForce);

      /// Alignment
      let desiredAlignmentVel = totalAlignmentVec.div(numOwnBoids).setMag(this.maxSpeed); /// desiredAlignmentVel has direction of average velocity of neary boids, but magnitude of maxSpeed
      let alignmentForce = this.steer(desiredAlignmentVel).mult(this.dna.alignmentForceScl); /// Steer force = desired velocity - current velocity
      this.applyForce(alignmentForce);
    }

    if (targetBoid !== null) {
      if (targetBoidDist <= targetBoid.radius + this.radius) { /// Damage the other boid
        targetBoid.damage(100);
        let desiredRetreatVel = p5.Vector.sub(targetBoid.pos, this.pos).mult(-1).setMag(this.maxSpeed); /// desiredRetreatVel has direction away from targetBoid, but magnitude of maxSpeed
        let retreatForce = this.steer(desiredRetreatVel).mult(this.dna.retreatForceScl * 80); /// Steer force = desired velocity - current velocity
        this.applyForce(retreatForce);
      } else {
        let desiredTargetVel = this.arrive(targetBoid.pos, 5); /// desiredTargetVel has direction towards targetBoid, but magnitude according to arrive() using very small arrivalRadius
        let targetForce = this.steer(desiredTargetVel).mult(this.dna.targetForceScl).mult(map(targetBoidDist, 0, this.sightRadius, 1.3, 1)).mult(tanh(this.health/this.maxHealth)); /// Steer force = (desired velocity - current velocity) scaled by targetForceScl and inverse of distance to targetBoid
        this.applyForce(targetForce);
      }
    }

  }

  scavenge(food) {
    let targetCrumb = null;
    let targetCrumbDist = Infinity;
    if (this.health <= this.maxHealth) { /// Only seek food if less than full health
      for (let i = food.length-1; i >= 0; i--) { /// Finding closest crumb within sight range
        let crumb = food[i];
        if ((this.specimen == "griffin" && crumb.type == "pegasus") || (this.specimen == "pegasus" && crumb.type == "griffin")) { /// Only allowed to scavenge the crumbs of other species' type
          let disp = p5.Vector.sub(crumb.pos, this.pos);
          let dist = disp.mag();
          if (dist > this.radius + crumb.radius && dist <= this.sightRadius) { /// Target crumb
            if (dist < targetCrumbDist) {
              targetCrumb = crumb;
              targetCrumbDist = dist;
            }
          } else if (dist <= this.radius + crumb.radius) { /// Eat crumb
            this.health += 80;
            food.splice(i, 1);
          }
        }
      }
    }

    if (targetCrumb !== null) {
      let desiredScavengeVel = this.arrive(targetCrumb.pos, this.arrivalRadius);
      let steerForce = this.steer(desiredScavengeVel).mult(this.dna.scavengeForceScl).mult(map(targetCrumbDist, 0, this.sightRadius, 1.3, 1)); // Steer force = (desired velocity - current velocity) scaled by scavengeForceScl and inverse of distance to crumb
      this.applyForce(steerForce);
    }
  }

  damage(damageAmount) {
    this.health -= damageAmount;
  }

  checkDeath() {
    return this.dead;
  }

  spawn() {
    let spawn_chance = SPAWN_RATE * (this.maxHealth - this.health) / this.maxHealth;
    if (random() <= spawn_chance) {
      let babyBoid = new BoidVECO(this.pos, this.specimen, this.dna, false); /// babyBoid initPos is deep-copied in constructor
      babyBoid.mutate();
      return babyBoid;
    } else {
      return null;
    }
  }

  mutate() {
    if (random() <= MUTATION_RATE) {
      this.dna.separationForceScl = random(0.0, 3.0);
    }
    if (random() <= MUTATION_RATE) {
      this.dna.cohesionForceScl = random(0.0, 5.0);
    }
    if (random() <= MUTATION_RATE) {
      this.dna.alignmentForceScl = random(0.0, 4.0);
    }
    if (random() <= MUTATION_RATE) {
      this.dna.targetForceScl = random(1.0, 5.0);
    }
    if (random() <= MUTATION_RATE) {
      this.dna.retreatForceScl = random(1.0, 5.0);
    }
    if (random() <= MUTATION_RATE) {
      this.dna.scavengeForceScl = random(1.0, 5.0);
    }

  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    this.health -= HEALTH_DECAY;
    if (this.health <= 0) {
      this.dead = true;
    }
  }

  edges(setting) {
    if (setting=='wrap') {
      if (this.pos.x > width) {
        this.pos.x = 0;
      } else if (this.pos.x < 0) {
        this.pos.x = width;
      }
      if (this.pos.y > height) {
        this.pos.y = 0;
      } else if (this.pos.y < 0) {
        this.pos.y = height;
      }
    } else if (setting=='repel') {
      let desiredVel = this.vel.copy();

      if (this.pos.x < BORDER) {
        desiredVel.add(createVector(this.maxSpeed, 0));
      } else if (this.pos.x > width - BORDER) {
        desiredVel.add(createVector(-this.maxSpeed, 0));
      }

      if (this.pos.y < BORDER) {
        desiredVel.add(createVector(0, this.maxSpeed));
      } else if (this.pos.y > height - BORDER) {
        desiredVel.add(createVector(0, -this.maxSpeed));
      }

      desiredVel.setMag(this.maxSpeed);
      let steerForce = this.steer(desiredVel).mult(5);
      this.applyForce(steerForce);

    } else if (setting=='bounce') {
      if (this.pos.x > width) {
        this.pos.x = width;
        this.vel.x *= -1;
      } else if (this.pos.x < 0) {
        this.pos.x = 0;
        this.vel.x *= -1;
      }
      if (this.pos.y > height) {
        this.pos.y = height;
        this.vel.y *= -1;
      } else if (this.pos.y < 0) {
        this.pos.y = 0;
        this.vel.y *= -1;
      }
    } else if (setting=='none') {}
  }

  display() {
    let angle = this.vel.heading() + radians(90);
    stroke(255);
    // stroke(map(this.separationForceScl, 0.5, 1.5, 150, 255), map(this.cohesionForceScl, 0.5, 1.5, 150, 255), map(this.alignmentForceScl, 0.5, 1.5, 150, 255));
    strokeWeight(0.3);
    if (this.specimen == "griffin") {
      fill(235, 75, 160, 180);
    } else if (this.specimen == "pegasus") {
      fill(75, 222, 235, 180);
    } else if (this.specimen == "dragon") {
      fill(255, 180);
    }
    push();
    translate(this.pos.x, this.pos.y);
    rotate(angle);
    beginShape();
    vertex(0, -this.radius * 2);
    vertex(-this.radius, this.radius * 2);
    vertex(this.radius, this.radius * 2);
    endShape(CLOSE);
    pop();

    if (this.isDebugger || debug) {
      if (this.specimen == "griffin") {
        stroke(235, 75, 160, 90);
      } else if (this.specimen == "pegasus") {
        stroke(75, 222, 235, 90);
      } else if (this.specimen == "dragon") {
        stroke(255, 90);
      }
      strokeWeight(0.4);
      noFill();
      circle(this.pos.x, this.pos.y, this.sightRadius * 2);

      strokeWeight(0.6);
      line(this.pos.x, this.pos.y, this.pos.x+this.vel.x*15, this.pos.y+this.vel.y*15);
    }
  }
}


function tanh(x) {
  let a = 11;
  let b = 2.1;
  return (Math.exp(a*x-b) - Math.exp(-(a*x-b))) / (Math.exp(a*x-b) + Math.exp(-(a*x-b)));
}
