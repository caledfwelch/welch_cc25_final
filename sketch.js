let player;
let circle;
let score = 0;
let timeLeft = 30;  // time per level
let gameState = "rules";
let level = 1;
let controlMap = { 'w': 'w', 'a': 'a', 's': 's', 'd': 'd' }; // default
let keys = {};
let levelTricks = ["swapDirection", "remapControls"]; // only 2 levels so far
let powerUps = [];
let currentMultiplier = 1;

function setup() {
  createCanvas(800, 600);
  textAlign(CENTER, CENTER);

  player = {
    pos: createVector(width / 2, height / 2),
    size: 30,
    speed: 5,
    update: function() {
      if (keys[controlMap['w']]) this.pos.y -= this.speed; // up
      if (keys[controlMap['a']]) this.pos.x -= this.speed; // left
      if (keys[controlMap['s']]) this.pos.y += this.speed; // down
      if (keys[controlMap['d']]) this.pos.x += this.speed; // right

      if (this.pos.x < this.size/2 || this.pos.x > width - this.size/2 ||
          this.pos.y < this.size/2 || this.pos.y > height - this.size/2) {
        gameState = "gameover"; // game over if player touches wall
      }
    },
    display: function() {
      rectMode(CENTER);
      fill(0, 150, 255);
      rect(this.pos.x, this.pos.y, this.size, this.size);
    }
  };

  circle = {
    pos: createVector(random(50, width - 50), random(50, height - 50)), // spawns at random point, not near edges
    vel: p5.Vector.random2D().mult(3), // random direction vector, speed of 3px/frame
    size: 25,
    pauseTimer: 0,
    flash: false,
    update: function() {
      if (this.pauseTimer > 0) {
        this.pauseTimer--;
        if (frameCount % 10 < 5) this.flash = true; // blinking effect, toggle flash on every 10 frames
        else this.flash = false;
      } else {
        this.flash = false; // normal movement, no flash if circle is in motion
        this.pos.add(this.vel); // moves by adding velocity vector to position vector

        if (random() < 0.005) {
          this.pauseTimer = 60; // pause for 1 second at random
        }

        if (this.pos.x < this.size/2 || this.pos.x > width - this.size/2) {
          this.vel.x *= -1;
        }
        if (this.pos.y < this.size/2 || this.pos.y > height - this.size/2) {
          this.vel.y *= -1;
        } // if circle touches an edge, it reverses direction (bounces)
        this.pos.x = constrain(this.pos.x, this.size/2, width - this.size/2);
        this.pos.y = constrain(this.pos.y, this.size/2, height - this.size/2); // keep circle in bounds (might change?)**
      }
    },
    display: function() {
      if (this.flash) {
        fill(255, 255, 0); // flash yellow
      } else {
        fill(255, 50, 50);
      }
      ellipse(this.pos.x, this.pos.y, this.size); // redraw circle
    },
    isPaused: function() {
      return this.pauseTimer > 0; // check if pauseTimer is counting down. if so, circle is paused
    }
  };

  setInterval(countdownTimer, 1000);
  shuffle(levelTricks);
  applyLevelTrick();
  spawnPowerUps(); // level setup
}

function draw() {
  background(20);

  if (gameState === "rules") {
    textSize(20);
    fill(255,255,0);
    textAlign(LEFT, CENTER);
    text("welcome to catch me if you can!", width/2 - 140, 90);

    fill(255);
    textSize(16);
    text("you have 30 seconds to complete each level.", width/2 - 140, 120);
    text("the rules of the game change each level.", width/2 - 140, 145);
    text("complete all levels to win.", width/2 - 140, 170);

    fill(0, 255, 255);
    text("2/3 power up:", width/2 - 140, 205);
    fill(255);
    text(" score multiplies by 2x/3x", width/2 - 30, 205);

    fill(0, 255, 0);
    text("+ power up:", width/2 - 140, 230);
    fill(255);
    text(" add 30 seconds", width/2 - 30, 230);

    fill(255, 0, 0);
    text("- power up:", width/2 - 140, 255);
    fill(255);
    text(" -100 points", width/2 - 30, 255);

    fill(255);
    text("you lose the game and your progress if:", width/2 - 140, 285);
    text("you touch the wall", width/2 - 130, 310);
    text("your score drops below 0", width/2 - 130, 335);
    text("you run out of time", width/2 - 130, 360);

    text("you get more points the faster you catch the circle,", width/2 - 140, 400);
    text("and a bonus if you catch the circle when it's flashing", width/2 - 140, 425);

    textSize(20);
    text("good luck! >:)", width/2 - 140, 480);
    fill(255,255,0);
    text("(press any key to start)", width/2 - 140, height - 80);
    return; // rules text, self-explanatory
  }

  if (gameState === "playing") {
    player.update();
    circle.update(); // update positions

    if (dist(player.pos.x, player.pos.y, circle.pos.x, circle.pos.y) < (player.size + circle.size) / 2) {
        // check if player is overlapping w circle (aka circle has been caught)
      timeLeft = 30; // reset timer
      let basePoints = timeLeft > 15 ? 200 : 100; // if >15 secs remain, give 200 points; 100 points otherwise
      // ternary operator reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
      if (circle.isPaused()) {
        basePoints += 100; // bonus points if circle caught when paused/flashing
      }
      score += basePoints * currentMultiplier; // multiply score by 2x/3x if powerup caught
      currentMultiplier = 1; // then reset multiplier until next one caught
      circle.pos = createVector(random(50, width - 50), random(50, height - 50));
      circle.vel = p5.Vector.random2D().mult(3); // move circle to new random spot
      level = (level % 2) + 1; // switch between lvl 1 and 2 (since i only have 2 so far)
      applyLevelTrick(); // apply the currnet level
    }

    for (let i = powerUps.length - 1; i >= 0; i--) { // loop backwards through powerup array (see line 174)
      let pu = powerUps[i]; // store current powerup when caught
      fill(pu.color);
      ellipse(pu.pos.x, pu.pos.y, 20);

      fill(0);
      textSize(14);
      textAlign(CENTER, CENTER);
      if (pu.type === "time") text("+", pu.pos.x, pu.pos.y); // +30 secs
      if (pu.type === "2x") text("2", pu.pos.x, pu.pos.y); // multiply score 2x
      if (pu.type === "3x") text("3", pu.pos.x, pu.pos.y); // multiply score 3x
      if (pu.type === "trap") text("-", pu.pos.x, pu.pos.y); // -100 pts

      if (dist(player.pos.x, player.pos.y, pu.pos.x, pu.pos.y) < (player.size + 20) / 2) {
        if (pu.type === "time") timeLeft += 30;
        if (pu.type === "2x") score *= 2;
        if (pu.type === "3x") score *= 3;
        if (pu.type === "trap") {
          score -= 100;
          if (score < 0) {
            gameState = "gameover";
          } // game over if negative points
        }
        powerUps.splice(i, 1); // removes powerups when collected to preserve index order
        spawnPowerUps(); // add powerups to map
      }
    }

    player.display();
    circle.display();

    fill(255);
    textSize(16);
    textAlign(LEFT);
    text(`score: ${score}`, 20, 25);
    text(`time: ${timeLeft}s`, 20, 50);
    text(`level: ${levelTricks[level - 1]}`, 20, 75); // todo: text, not variable name
    text(`↑: ${controlMap['w'].toUpperCase()}`, 20, 100); // current directions
    text(`←: ${controlMap['a'].toUpperCase()}`, 20, 125);
    text(`↓: ${controlMap['s'].toUpperCase()}`, 20, 150);
    text(`→: ${controlMap['d'].toUpperCase()}`, 20, 175);

  } else if (gameState === "gameover") {
    background(0);
    fill(255);
    textSize(32);
    text("GAME OVER", width/2, height/2 - 30);
    textSize(20);
    text("press SPACE to restart", width/2, height/2 + 20); // game over message
  }
}

function keyPressed() {
  keys[key.toLowerCase()] = true;
  if (gameState === "rules") {
    gameState = "playing"; // swap from rules to play mode when any key pressed
  }
  if (gameState === "gameover" && key === ' ') {
    initializeGame(); // restart game when space pressed
  }
}

function keyReleased() {
  keys[key.toLowerCase()] = false; // uppercase and lowercase keys are the same
}

function countdownTimer() {
  if (gameState === "playing") {
    timeLeft--; // countdown
    if (timeLeft <= 0) {
      gameState = "gameover";
    }
  }
}

function initializeGame() { // game setup, self-explanatory
  gameState = "playing";
  score = 0;
  timeLeft = 30;
  currentMultiplier = 1;
  player.pos = createVector(width / 2, height / 2);
  circle.pos = createVector(random(50, width - 50), random(50, height - 50));
  circle.vel = p5.Vector.random2D().mult(3);
  circle.pauseTimer = 0;
  shuffle(levelTricks); // levels appear in random order (might change)**
  applyLevelTrick();
  powerUps = [];
  spawnPowerUps();
}

function spawnPowerUps() {
  powerUps = []; // reset powerup array
  let types = ["time", random(["2x", "3x"]), "trap"];
  for (let t of types) { // loop through powerup types
    powerUps.push({
      type: t,
      pos: createVector(random(50, width - 50), random(50, height - 50)),
      color: t === "time" ? color(0, 255, 0) : t === "trap" ? color(255, 0, 0) : color(0, 255, 255) // different colors for each powerup type
    });
  }
}

function applyLevelTrick() {
  resetControls();
  let trick = levelTricks[level - 1]; // select curr level trick from array (might change logic when more levels added)**
  if (trick === "swapDirection") {
    let keysArr = ['w', 'a', 's', 'd']; // map to logical directions (u,l,d,r)
    let shuffled = shuffle([...keysArr]); // take elems from keysarr and make a shallow copy to avoid making edits to actual keysarr array
    // spread operator reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
    for (let i = 0; i < keysArr.length; i++) {
      controlMap[keysArr[i]] = shuffled[i];
    } // so we use same keys, but the directions they trigger have been remapped
  } else if (trick === "remapControls") {
    let keysArr = ['w', 'a', 's', 'd'];
    let allKeys = "qwertyuiopasdfghjklzxcvbnm".split(""); // array of all the letters on the keyboard
    for (let i = 0; i < keysArr.length; i++) { // loop through wasd to reassign each one to a random letter
      let rand = floor(random(allKeys.length)); // pick random letter
      controlMap[keysArr[i]] = allKeys[rand]; // reassign
      allKeys.splice(rand, 1); // remove the used letter from the array to avoid duplicates
    }
  }
}

function resetControls() {
  controlMap = { 'w': 'w', 'a': 'a', 's': 's', 'd': 'd' };
}

function shuffle(array) { // to shuffle elems in array
  for (let i = array.length - 1; i > 0; i--) { // start at last elem and move backwards
    const j = floor(random(i + 1)); // random int between 0 and (i+1)
    [array[i], array[j]] = [array[j], array[i]]; // swap elems at indices i and j
  }
  return array;
}
