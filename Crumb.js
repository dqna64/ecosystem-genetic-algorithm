
class Crumb {
  constructor(initPos, type) {
    this.pos = initPos.copy();
    this.type = type;
    this.radius = 2;
  }

  display() {
    // stroke(79, 219, 133)
    noStroke();
    if (this.type == 'griffin') {
      fill(235, 75, 160, 120);
      circle(this.pos.x, this.pos.y, this.radius * 2);
    } else if (this.type == 'pegasus') {
      fill(75, 222, 235, 120);
      circle(this.pos.x, this.pos.y, this.radius * 2);
    } else {
      fill(255, 120);
      circle(this.pos.x, this.pos.y, this.radius * 2);
    }
  }
}
