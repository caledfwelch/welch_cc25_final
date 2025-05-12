let player;
let circle;
let clones = [];
let score = 0;
let timeLeft = 30; // time per level
let gameState = "rules";
let level = 1;
let obstacles = [];
let cloneSpawnTimer = 0;// timers for levels 3, 4, 5
let obstacleTimer = 0;
let goodBadTimer = 0;
let isGood = true;

let controlMap = { 'w': 'w', 'a': 'a', 's': 's', 'd': 'd' }; // for remapping keys levels
let keys = {};

// all levels in order
let levelTricks = ["swapDirection", "remapControls", "circleClones", "obstacles", "goodBad"];
let powerUps = [];
let currentMultiplier = 1;
let popups = [];
let showLevelIntro = false;
let waitingAfterCatch = false;
let waitFrames = 0;

function setup() {
  createCanvas(800, 600);
  textAlign(CENTER, CENTER);
  player = createPlayer();
  circle = createCircle();
  setInterval(countdownTimer, 1000); // level timer countdown
  applyLevelTrick(); // apply current level
  showLevelIntro = true;
  spawnPowerUps(); // spawn powerups
  obstacleTimer = 0; // initialize obstacle timer
}

function draw() {
  background(20);

  // display rules screen
  if (gameState === "rules") {
    drawRules();
    return;
  }

  // display level intro screen
  if (showLevelIntro) {
    drawLevelIntro();
    return;
  }

  // delay before next level screen to show popups
  if (waitingAfterCatch) {
    drawPopups();
    waitFrames--;
    if (waitFrames <= 0) {
      waitingAfterCatch = false;
      if (level === levelTricks.length) { // if all 5 levels completed
        gameState = "win";
        return;
      }
      level = (level % levelTricks.length) + 1;
      applyLevelTrick(); // reapply level logic
      showLevelIntro = true;
    }
    return;
  }

  if (gameState === "playing") {
    if (levelTricks[level - 1] === "goodBad") {
      goodBadTimer++;
      if (goodBadTimer % 60 === 0) {
        isGood = !isGood; // toggle between good and bad
      }
    }

    if (levelTricks[level - 1] === "obstacles") {
      obstacleTimer++;
      if (obstacleTimer === 1 || obstacleTimer % (60 * 5) === 0) { // change obstacles ever 5 secs
        spawnObstacles();
      }
      drawObstacles();
      // Check collision with player
      for (let obs of obstacles) {
        if (obstacleColliding(player.pos.x, player.pos.y, player.size, player.size, obs.x, obs.y, obs.w, obs.h)) {
          gameState = "gameover"; // player hit an obstacle
        }
      }
    }

    player.update();
    circle.update();

    for (let clone of clones) {
      clone.update();
      clone.display();
      if (dist(player.pos.x, player.pos.y, clone.pos.x, clone.pos.y) < (player.size + clone.size) / 2) {
        if (!clone.hit) {
          score -= 100; // -100 points if player touches clone
          popups.push({ pos: clone.pos.copy(), text: "-100", timer: 60 });
          if (score < 0) score = 0;
          clone.hit = true;
        }
      }
    }

    // define touching circle (square and circle positions overlapping) for goodBad level
    let touchingCircle = dist(player.pos.x, player.pos.y, circle.pos.x, circle.pos.y) < (player.size + circle.size) / 2;

    if (levelTricks[level - 1] === "goodBad") {
      if (touchingCircle) {
        if (!isGood) { // if circle is "bad"
          gameState = "gameover";
          popups.push({ pos: circle.pos.copy(), text: "CAUGHT RED! GAME OVER", timer: 90 });
          return;
        } else { // if circle is "good"
          // same code as below for when circle caught
          let basePoints = 200;
          popups.push({ pos: circle.pos.copy(), text: "+200", timer: 90 });
          score += basePoints * currentMultiplier;
          currentMultiplier = 1;
          circle.pos = createVector(random(50, width - 50), random(50, height - 50));
          circle.vel = p5.Vector.random2D().mult(8); // make circle move faster
          clones = [];
          cloneSpawnTimer = 0;
          waitFrames = 90;
          timeLeft = 30;
          waitingAfterCatch = true;
          return;
        }
      }
    } else { // normal circle caught logic for other levels
      if (touchingCircle) {
        let basePoints = 100;
        if (timeLeft > 15) {
          basePoints = 200; // 200 points if caught with more than 15 seconds left
          popups.push({ pos: circle.pos.copy(), text: "+200: time bonus", timer: 90 });
        } else {
          popups.push({ pos: circle.pos.copy(), text: "+100", timer: 90 }); // 100 points if caught with less than 15 seconds left
        }
        if (circle.isPaused()) {
          basePoints += 100; // additional 100 points if caught while circle is flashing
          popups.push({ pos: createVector(circle.pos.x, circle.pos.y - 20), text: "+100: flash bonus", timer: 90 });
        }
        score += basePoints * currentMultiplier; // multiply score by current multiplier
        currentMultiplier = 1;
        // circle position and velocity
        circle.pos = createVector(random(50, width - 50), random(50, height - 50));
        circle.vel = p5.Vector.random2D().mult(3);
        clones = []; // clone array for clone level
        cloneSpawnTimer = 0;
        waitFrames = 90;
        timeLeft = 30; // reset timer
        waitingAfterCatch = true;
        return;
      }
    }

    if (levelTricks[level - 1] === "circleClones") {
      cloneSpawnTimer++;
      if (cloneSpawnTimer % 300 === 0) spawnClones(2); // spawn 2 clones every 5 seconds
    }

    // draw powerups
    for (let i = powerUps.length - 1; i >= 0; i--) { // loop backwards through powerup array (see below)
      let pu = powerUps[i]; // store current powerup when caught
      // make powerup outline flash by alternating color w/ sine wave
      let t = frameCount * 0.2; // t variable value changes every frame
      let flash = sin(t) > 0 ? color(255, 255, 0) : color(255); // when sin(t) > 0, outline color is yellow, otherwise white
      // ternary operator reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
      stroke(flash); // set stroke color
      strokeWeight(2);
      fill(pu.color); // color based on powerup type
      ellipse(pu.pos.x, pu.pos.y, 20); // draw powerup

      noStroke();
      fill(0);
      textSize(14);
      textAlign(CENTER, CENTER); // add text to powerup
      text(
        pu.type === "time" ? "+" : // + 30 secs; if type is time, show + icon
        pu.type === "trap" ? "-" : // - 100 points
        pu.type === "2x" ? "2" : // 2x score
        pu.type === "3x" ? "3" : pu.type, // 3x score, fallback to type
        pu.pos.x, pu.pos.y
      );

      if (dist(player.pos.x, player.pos.y, pu.pos.x, pu.pos.y) < (player.size + 20) / 2) { // add popup text when powerup collected
        let msg = "";
        if (pu.type === "time") { timeLeft += 30; msg = "+30 secs"; }
        if (pu.type === "2x") { score *= 2; msg = "score x2"; }
        if (pu.type === "3x") { score *= 3; msg = "score x3"; }
        if (pu.type === "trap") {
          score -= 100;
          msg = "-100 points";
          if (score < 0) gameState = "gameover"; // game over if score < 0
        }
        popups.push({ pos: pu.pos.copy(), text: msg, timer: 60 }); // copy powerup position so popup appears there, show text for 1 sec
        powerUps.splice(i, 1); // removes powerups when collected to preserve index order
        spawnPowerUps(); // add powerups to map
      }
    }

    player.display();
    if (levelTricks[level - 1] === "goodBad") { // check current level (since array starts at 0 but levels start at 1)
      fill(isGood ? color(0, 255, 0) : color(255, 0, 0)); // if isGood, fill green, else red
      ellipse(circle.pos.x, circle.pos.y, circle.size);
    } else {
      circle.display();
    }
    drawPopups();

    // left sidebar info panel
    fill(255);
    textSize(16);
    textAlign(LEFT);
    text(`score: ${score}`, 20, 25); // display score
    text(`time: ${timeLeft}s`, 20, 50); // display time left
    text(`level: ${levelTricks[level - 1]}`, 20, 75); // display current level name
    text(`↑: ${controlMap['w'].toUpperCase()}`, 20, 100); // display controls (normal WASD)
    text(`←: ${controlMap['a'].toUpperCase()}`, 20, 125);
    text(`↓: ${controlMap['s'].toUpperCase()}`, 20, 150);
    text(`→: ${controlMap['d'].toUpperCase()}`, 20, 175);
    if (levelTricks[level - 1] === "goodBad") {
      text(`status: ${isGood ? "GOOD (green)" : "BAD (red)"}`, 20, 200); // display circle state
    }
  }

  // game over screen
  if (gameState === "gameover") {
    background(0);
    fill(255,0,0);
    textSize(32);
    text("GAME OVER", width/2 - 140, height/2 - 30);
    fill(255);
    textSize(20);
    text("press SPACE to restart", width/2 - 140, height/2 + 20);
  }

  // you win screen
  if (gameState === "win") {
    background(0);
    fill(255, 255, 0);
    textSize(40);
    textAlign(CENTER, CENTER);
    text("YOU WIN!", width/2, height/2 - 40);
    fill(255);
    textSize(28);
    text(`final score: ${score}`, width/2, height/2 + 10);
    textSize(20);
    text("press SPACE to play again!", width/2, height/2 + 60);
  }
}

function spawnObstacles() { // for obsctacles level
  obstacles = []; // empty array
  for (let i = 0; i < 5; i++) { // spawn 5 obstacles
    let w = random(40, 100); // random width and height between 40 and 100
    let h = random(40, 100);
    let x = random(w/2, width - w/2); // random x and y position
    let y = random(h/2, height - h/2);
    obstacles.push({x, y, w, h}); // add obstacle to array
  }
}

function drawObstacles() {
  for (let obs of obstacles) { // iterate through obstacles array, draw them
    fill(255);
    rectMode(CENTER);
    rect(obs.x, obs.y, obs.w, obs.h);
  }
}

// check if player and obstacle are colliding
function obstacleColliding(px, py, pw, ph, ox, oy, ow, oh) {
  // px, py: player center coords
  // pw, ph: player size
  // ox, oy: obstacle center coords
  // ow,oh: obstacle size
      // player left edge, right edge         top edge,        bottom edge
  let left1 = px - pw/2, right1 = px + pw/2, top1 = py - ph/2, bottom1 = py + ph/2;
  // same for obstacle
  let left2 = ox - ow/2, right2 = ox + ow/2, top2 = oy - oh/2, bottom2 = oy + oh/2;
  // check if: 
           // player to right of obstacle
                             // player to left of obstacle
                                              // player below obstacle
                                                                // player above obstacle
  // if any of these are true, return false (not colliding)
  // ! operator inverts the result, so if there is an overlap, function returns true (aka collision occurred)
  return !(left1 > right2 || right1 < left2 || top1 > bottom2 || bottom1 < top2);
}

function createPlayer() {
  return {
    pos: createVector(width / 2, height / 2),
    size: 30,
    speed: 5,
    update() {
      if (keys[controlMap['w']]) this.pos.y -= this.speed; // up
      if (keys[controlMap['a']]) this.pos.x -= this.speed; // left
      if (keys[controlMap['s']]) this.pos.y += this.speed; // down
      if (keys[controlMap['d']]) this.pos.x += this.speed; // right
      if (this.pos.x < this.size/2 || this.pos.x > width - this.size/2 ||
          this.pos.y < this.size/2 || this.pos.y > height - this.size/2) {
        gameState = "gameover"; // player hit wall
      }
    },
    display() {
      rectMode(CENTER);
      fill(0, 150, 255);
      rect(this.pos.x, this.pos.y, this.size, this.size); // draw player as square
    }
  };
}

function createCircle() {
  return {
    pos: createVector(random(50, width - 50), random(50, height - 50)), // spawns at random point, not near edges
    vel: p5.Vector.random2D().mult(3), // random direction vector, speed of 3px/frame
    size: 25,
    pauseTimer: 0,
    flash: false,
    update() {
      if (this.pauseTimer > 0) {
        this.pauseTimer--;
        this.flash = frameCount % 10 < 5; // blinking effect, toggle flash on every 10 frames
      } else {
        this.flash = false; // normal movement, no flash if circle is in motion
        this.pos.add(this.vel); // moves by adding velocity vector to position vector
        if (random() < 0.005) this.pauseTimer = 60; // pause for 1 second at random
        if (this.pos.x < this.size/2 || this.pos.x > width - this.size/2) this.vel.x *= -1;
        if (this.pos.y < this.size/2 || this.pos.y > height - this.size/2) this.vel.y *= -1;
        // if circle touches an edge, it reverses direction (bounces)
        this.pos.x = constrain(this.pos.x, this.size/2, width - this.size/2);
        this.pos.y = constrain(this.pos.y, this.size/2, height - this.size/2); // keep circle in bounds
      }
    },
    display() {
      fill(this.flash ? color(255, 255, 0) : color(255, 50, 50)); // flash yellow when paused
      ellipse(this.pos.x, this.pos.y, this.size);
    },
    isPaused() {
      return this.pauseTimer > 0; // check if pauseTimer is counting down. if so, circle is paused
    }
  };
}

function spawnClones(count) {
  for (let i = 0; i < count; i++) { // create n=count clones
    clones.push({
      pos: circle.pos.copy(), // spawn at circle position
      vel: p5.Vector.random2D().mult(2.5), // random direction vector, speed of 2.5px/frame
      size: 20,
      hit: false, // check if clone has been hit
      update() {
        this.pos.add(this.vel); // same movement logic as circle
        if (this.pos.x < this.size/2 || this.pos.x > width - this.size/2) this.vel.x *= -1;
        if (this.pos.y < this.size/2 || this.pos.y > height - this.size/2) this.vel.y *= -1;
        this.pos.x = constrain(this.pos.x, this.size/2, width - this.size/2);
        this.pos.y = constrain(this.pos.y, this.size/2, height - this.size/2);
      },
      display() {
        fill(180, 0, 0); // darker red
        ellipse(this.pos.x, this.pos.y, this.size);
      }
    });
  }
}

function drawPopups() {
  textSize(16);
  textAlign(CENTER, CENTER);
  for (let i = popups.length - 1; i >= 0; i--) { // again, loop backwards through popups array
    let p = popups[i]; // store current popup
    fill(255);
    text(p.text, p.pos.x, p.pos.y);
    p.pos.y -= 0.7; // move text up
    p.timer--; // timer countdown
    if (p.timer <= 0) popups.splice(i, 1); // remove popup from array (disappear) when timer is up
  }
}

// introduce rules of each level
function drawLevelIntro() {
  fill(255);
  textSize(22);
  textAlign(CENTER, CENTER);
  let trick = levelTricks[level - 1];
  let message = "";
  if (trick === "swapDirection") {
    message = "DIRECTION SWAP:\nWASD has been scrambled!\ncheck the panel to the left.\npress any key to start.";
  } else if (trick === "remapControls") {
    message = "REMAP CONTROLS:\nWASD is now assigned to random keys!\ncheck the panel to the left.\npress any key to start.";
  } else if (trick === "circleClones") {
    message = "CLONES:\nclones of the circle spawn and move independently!\ntouching a clone costs 100 points!\npress any key to start.";
  } else if (trick === "obstacles") {
    message = "OBSTACLES:\nobstacles appear randomly and move every 5 secs!\ntouch one and it's game over!\npress any key to start.";
  } else if (trick === "goodBad") {
    message = "GOOD/BAD:\nthe speedy circle alternates between green and red every second.\ncatch it when it's green for big points!\ncatch it when it's red and it's game over!\npress any key to start.";
  }
  text(message, width / 2, height / 2);
}

// rules text
function drawRules() {
  textSize(20);
  fill(255,255,0);
  textAlign(LEFT, CENTER);
  text("welcome to catch me if you can!", width/2 - 140, 90);
  fill(255);
  textSize(16);
  text("you have 30 seconds to catch the", width/2 - 140, 120);
  fill(255,0,0);
  text("circle.", width/2 + 105, 120);
  fill(255);
  text("the rules of the game change each level!", width/2 - 140, 145);
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
  text(" lose 100 points", width/2 - 30, 255);
  fill(255);
  text("you lose the game and your progress if:", width/2 - 140, 285);
  text("you touch the wall", width/2 - 130, 310);
  text("your score drops below 0", width/2 - 130, 335);
  text("you run out of time", width/2 - 130, 360);
  text("you get more points the faster you catch the circle,", width/2 - 140, 400);
  text("and a bonus if you catch the circle when it's", width/2 - 140, 425);
  fill(255,255,0);
  text("flashing.", width/2 + 173, 425);
  fill(255);
  textSize(20);
  text("good luck! >:)", width/2 - 140, 480);
  fill(255,255,0);
  text("(press any key to start)", width/2 - 140, height - 80);
}

function keyPressed() {
  keys[key.toLowerCase()] = true;
  if (gameState === "rules") {
    gameState = "playing"; // swap from rules to play mode when any key pressed
  }
  else if (showLevelIntro) {
    showLevelIntro = false; // swap from level intro to play mode when any key pressed
  }
  if ((gameState === "gameover" || gameState === "win") && key === ' ') {
    initializeGame(); // restart game when space pressed
  }
}

function keyReleased() {
  keys[key.toLowerCase()] = false; // uppercase and lowercase keys are the same
}

function countdownTimer() {
  if (gameState === "playing" && !showLevelIntro && !waitingAfterCatch) { // only count down when playing
    timeLeft--;
    if (timeLeft <= 0) { // game over if time runs out
      gameState = "gameover";
    }
  }
}

// game setup
function initializeGame() {
  gameState = "playing";
  score = 0;
  timeLeft = 30;
  currentMultiplier = 1;
  player = createPlayer();
  circle = createCircle();
  level = 1;
  applyLevelTrick();
  showLevelIntro = true;
  powerUps = [];
  popups = [];
  waitingAfterCatch = false;
  clones = [];
  cloneSpawnTimer = 0;
  spawnPowerUps();
}

function spawnPowerUps() {
  powerUps = []; // powerup array
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
  clones = []; // for clone level
  cloneSpawnTimer = 0;

  let trick = levelTricks[level - 1]; // select curr level trick from array
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
      allKeys.splice(rand, 1); // // remove the used letter from the array to avoid duplicates
    }
  } else if (trick === "circleClones") {
    spawnClones(2); // spawn 2 clones
  } else if (trick === "obstacles") {
    spawnObstacles(); // spawn obstacles
    obstacleTimer = 0;
  } else if (trick === "goodBad") {
    goodBadTimer = 0;
    isGood = true; // start with good circle
    circle.vel = p5.Vector.random2D().mult(8); // make circle fast
  }
}

function resetControls() {
  controlMap = { 'w': 'w', 'a': 'a', 's': 's', 'd': 'd' }; // reset controls to default
}

function shuffle(array) { // to shuffle elems in array
  for (let i = array.length - 1; i > 0; i--) { // start at last elem and move backwards
    const j = floor(random(i + 1)); // random int between 0 and (i+1)
    [array[i], array[j]] = [array[j], array[i]]; // swap elems at indices i and j
  }
  return array;
}
