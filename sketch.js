let DIS_WIDTH = 1280;
let DIS_HEIGHT = 720;
let debug = false;
let FPS = 24;
let BORDER = 20

let PARTITION_SIZE = 20
let numXPartitions = DIS_WIDTH / PARTITION_SIZE;
let numYPartitions = DIS_HEIGHT / PARTITION_SIZE;

// let popMatrix = [];
// for (let i = 0; i < numYPartitions; i++) {
//   popMatrix.push([]);
//   for (let j = 0; j < numXPartitions; i++) {
//     popMatrix[i].push([]);
//   }
// }

let species = ["griffin", "pegasus", "dragon"];
let population = [];
let MAX_POP_SIZE = 300
let INIT_POP_SIZE = 0.3 * MAX_POP_SIZE;
let INIT_GRIFFIN_POP_SIZE = INIT_POP_SIZE/2;
let INIT_PEGASUS_POP_SIZE = INIT_POP_SIZE/2;

let HEALTH_DECAY = 1;
let MUTATION_RATE = 0.05;
let SPAWN_RATE = 0.004;
let MAX_HEALTH = 400;

let food = [];

function setup() {
  createCanvas(DIS_WIDTH, DIS_HEIGHT);
  frameRate(FPS);

  let griffinInitPos = createVector(random(width), random(height));
  let pegasusInitPos = createVector(random(width), random(height));

  for (let i = 0; i < INIT_GRIFFIN_POP_SIZE; i++) {
    let isDebugger = false;
    if (i == 0) {
      isDebugger = true;
    }
    population.push(new BoidVECO(griffinInitPos, "griffin", null, isDebugger));
  }
  for (let i = 0; i < INIT_PEGASUS_POP_SIZE; i++) {
    population.push(new BoidVECO(pegasusInitPos, "pegasus", null, false));
  }

}

function draw() {
  background(20);

  // let flatPopMatrix = [];
  // for (let row of popMatrix) {
  //   for (let column of row) {
  //     for (let boid of column) {
  //       flatPopMatrix.push(boid);
  //     }
  //   }
  // }

  for (let boid of population) {
    boid.interact(population);
    boid.scavenge(food);
  }

  for (let i = population.length-1; i >= 0; i--) { /// Update each boid afeter ALL force and damage applications
      let boid = population[i];
      // boid.applyForce(boid.steer(boid.accelerate(createVector(mouseX, mouseY), boid.sightRadius)).mult(2));
      boid.edges('repel');
      boid.update();

      if (boid.checkDeath()) {
        for (let j = 0; j <= 1; j++) {
          let randomX = constrain(boid.pos.x + random(-4, 4), BORDER, DIS_WIDTH-BORDER);
          let randomY = constrain(boid.pos.y + random(-4, 4), BORDER, DIS_HEIGHT-BORDER);
          let newCrumb = new Crumb(createVector(randomX, randomY), boid.specimen);
          food.push(newCrumb);
        }
        population.splice(i, 1);
      } else if (population.length < MAX_POP_SIZE) {
          newBoid = boid.spawn();
          if (newBoid !== null) {
            population.push(newBoid);
        }
      }
  }

  // stroke(255);
  // for (let i = 0; i < numXPartitions; i++) {
  //   line(PARTITION_SIZE * i, 0, PARTITION_SIZE * i, DIS_HEIGHT);
  // }
  // for (let i = 0; i < numYPartitions; i++) {
  //   line(0, PARTITION_SIZE * i, DIS_WIDTH, PARTITION_SIZE * i);
  // }

  for (let crumb of food) {
    crumb.display();
  }
  for (let boid of population) {
    boid.display()
  }
}

loopBool = true;
function keyPressed() {
  if (key == " ") {
    if (loopBool) {
      noLoop();
      loopBool = !loopBool;
    } else {
      loop();
      loopBool = !loopBool;
    }
  } else if (key == 'd') {
    debug = !debug;
  }
}
