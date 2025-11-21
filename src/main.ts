import "./style.css";
import { interval, fromEvent, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";

function main() {
  
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  // ========== CONSTANTS ==========
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 780;
  const RIVER_TOP = 70;
  const RIVER_BOTTOM = 330; // 70 + 259 (river height) + 1
  const FROG_SIZE = 40;
  const FROG_START_X = 275;
  const FROG_START_Y = 700;
  const FROG_COLOUR = "#7FFF00";
  const MOVE_DISTANCE = 30;
  
  // Game speeds
  const CAR_SPEEDS = [1, 3, -4, -2.5] as const;
  const LOG_SPEEDS = [2, -3, 1] as const;

  // ========== TYPE DEFINITIONS ==========
  class ChangeMove {
    constructor(
      public readonly axis: string,
      public readonly distance: number,
    ) {}
  }

  class Frog {
    constructor(
      public readonly x: number,
      public readonly y: number,
      public readonly width: number,
      public readonly height: number,
      public readonly colour: string,
    ) {}
  }

  class Car {
    constructor(
      public readonly x: number,
      public readonly y: number,
      public readonly width: number,
      public readonly height: number,
    ) {}
  }

  class Wood {
    constructor(
      public readonly x: number,
      public readonly y: number,
      public readonly width: number,
      public readonly height: number,
    ) {}
  }

  class Goal {
    constructor(
      public readonly x: number,
      public readonly y: number,
      public readonly width: number,
      public readonly height: number,
    ) {}
  }

  class Game {
    constructor(
      public readonly score: number,
      public readonly gameOver: boolean,
      public readonly Frog: Frog,
      public readonly Car: Car[],
      public readonly Wood: Wood[],
      public readonly wasOnGoal: boolean, // Track if frog was on goal to prevent duplicate scoring
    ) {}
  }

  // ========== PURE HELPER FUNCTIONS ==========
  
  // Check if frog is in the water area
  const isInWater = (y: number): boolean => y > RIVER_TOP && y < RIVER_BOTTOM;
  
  // Find which log (if any) the frog is standing on
  const findLogUnderFrog = (frog: Frog, logs: Wood[]): Wood | undefined =>
    logs.find(log => checkCollision(frog, log));
  
  // Check if frog is safely on a log or on land
  const isOnLog = (frog: Frog, logs: Wood[]): boolean =>
    isInWater(frog.y) ? findLogUnderFrog(frog, logs) !== undefined : true;
  
  // Get the speed of a log that the frog is standing on
  const getLogSpeed = (frog: Frog, logs: Wood[], speeds: readonly number[]): number => {
    const log = findLogUnderFrog(frog, logs);
    if (!log) return 0;
    const index = logs.indexOf(log);
    return index >= 0 ? speeds[index] : 0;
  };
  
  // Clamp x coordinate to canvas boundaries
  const clampX = (x: number, width: number): number =>
    Math.max(0, Math.min(CANVAS_WIDTH - width, x));
  
  // Clamp y coordinate to canvas boundaries
  const clampY = (y: number, height: number): number =>
    Math.max(0, Math.min(CANVAS_HEIGHT - height, y));
  
  // Check if two objects are colliding
  const checkCollision = (obj1: Frog, obj2: Car | Wood | Goal): boolean =>
    obj1.x + obj1.width >= obj2.x &&
    obj1.x <= obj2.x + obj2.width &&
    obj1.y + obj1.height >= obj2.y &&
    obj1.y <= obj2.y + obj2.height;
  
  // Check if object is beyond horizontal boundary
  const checkBoundaryH = (direction: 'left' | 'right', left: number, right: number): boolean =>
    direction === 'left' ? right <= 0 : left >= CANVAS_WIDTH;
  
  // Check if object is beyond vertical boundary
  const checkBoundaryV = (direction: 'up' | 'down', top: number, bottom: number): boolean =>
    direction === 'up' ? top <= 0 : bottom >= CANVAS_HEIGHT;
  
  // Reset x position when object wraps around screen
  const resetX = (left: number, speed: number, right: number): number => {
    const newLeft = left + speed;
    const newRight = right + speed;
    if (checkBoundaryH('left', newLeft, newRight)) {
      return CANVAS_WIDTH - (right - left);
    }
    if (checkBoundaryH('right', newLeft, newRight)) {
      return 0;
    }
    return newLeft;
  };
  
  // Update car positions with their speeds
  const updateCars = (cars: Car[], speeds: readonly number[]): Car[] =>
    cars.map((car, i) =>
      new Car(
        resetX(car.x, speeds[i], car.x + car.width),
        car.y,
        car.width,
        car.height
      )
    );
  
  // Update log positions with their speeds
  const updateLogs = (logs: Wood[], speeds: readonly number[]): Wood[] =>
    logs.map((log, i) =>
      new Wood(
        resetX(log.x, speeds[i], log.x + log.width),
        log.y,
        log.width,
        log.height
      )
    );
  
  // Check if frog collides with any car
  const checkCarCollision = (frog: Frog, cars: Car[]): boolean =>
    cars.some(car => checkCollision(frog, car));

  // ========== DOM SETUP ==========
  
  // Helper function to create and append SVG elements
  const createSVGRect = (attrs: Record<string, number | string>): Element => {
    const rect = document.createElementNS(svg.namespaceURI, "rect");
    Object.entries(attrs).forEach(([key, val]) => rect.setAttribute(key, String(val)));
    svg.appendChild(rect);
    return rect;
  };

  // Create game background elements
  createSVGRect({ x: 0, y: RIVER_TOP, width: CANVAS_WIDTH, height: 259, fill: "#0000FF" }); // river
  createSVGRect({ x: 0, y: 710, width: CANVAS_WIDTH, height: 70, fill: "#800080" }); // sidewalk1
  createSVGRect({ x: 0, y: 330, width: CANVAS_WIDTH, height: 70, fill: "#800080" }); // sidewalk2
  createSVGRect({ x: 0, y: 0, width: CANVAS_WIDTH, height: 70, fill: "#008000" }); // grass

  // Create log elements
  const wood: Element = createSVGRect({ x: 100, y: 250, width: 200, height: 80, fill: "#A0522D" });
  const wood2: Element = createSVGRect({ x: 300, y: 170, width: 400, height: 70, fill: "#A0522D" });
  const wood3: Element = createSVGRect({ x: 250, y: 80, width: 300, height: 80, fill: "#A0522D" });

  // Create frog element
  const frogElement: Element = createSVGRect({
    x: FROG_START_X,
    y: FROG_START_Y,
    width: FROG_SIZE,
    height: FROG_SIZE,
    fill: FROG_COLOUR
  });

  // Create car elements
  const obstacle: Element = createSVGRect({ x: 400, y: 570, width: 130, height: 50, fill: "#FF0000" });
  const obstacle2: Element = createSVGRect({ x: 250, y: 420, width: 130, height: 50, fill: "#FF0000" });
  const obstacle3: Element = createSVGRect({ x: 100, y: 630, width: 80, height: 50, fill: "#FF0000" });
  const obstacle4: Element = createSVGRect({ x: 330, y: 500, width: 150, height: 50, fill: "#FF0000" });

  // Create goal element
  const goal: Element = createSVGRect({ x: FROG_START_X, y: 0, width: FROG_SIZE, height: FROG_SIZE, fill: "#FFA500" });

  // Create score display
  const scoreElement = document.createElementNS(svg.namespaceURI, "text")!;
  scoreElement.textContent = "Score: 0";
  scoreElement.setAttribute('x', String(500));
  scoreElement.setAttribute('y', String(50));
  svg.appendChild(scoreElement);

  // ========== INITIAL GAME STATE ==========
  const initialFrog = new Frog(FROG_START_X, FROG_START_Y, FROG_SIZE, FROG_SIZE, FROG_COLOUR);
  const initialCars = [
    new Car(400, 570, 130, 50),
    new Car(250, 420, 130, 50),
    new Car(100, 630, 80, 50),
    new Car(330, 500, 150, 50)
  ];
  const initialLogs = [
    new Wood(100, 250, 200, 80),
    new Wood(300, 170, 400, 70),
    new Wood(250, 80, 300, 80)
  ];
  const initialGame = new Game(0, false, initialFrog, initialCars, initialLogs, false);
  const initGoal = new Goal(FROG_START_X, 0, FROG_SIZE, FROG_SIZE);

  // ========== REACTIVE STREAMS ==========
  
  // Keyboard controls stream
  const controls$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    filter((key) => key.key === 'w' || key.key === 'a' || key.key === 's' || key.key === 'd'),
    filter(({ repeat }) => !repeat),
    map(key =>
      key.key === 'w' ? new ChangeMove('y', -MOVE_DISTANCE) :
      key.key === 's' ? new ChangeMove('y', MOVE_DISTANCE) :
      key.key === 'd' ? new ChangeMove('x', MOVE_DISTANCE) :
      new ChangeMove('x', -MOVE_DISTANCE)
    )
  );

  // ========== GAME STATE REDUCER ==========
  const reduceGameState = (acc: Game, val: ChangeMove | number): Game => {
    // If game is over, don't update state
    if (acc.gameOver) return acc;

    // Update frog position based on user input
    const movedFrog = val instanceof ChangeMove
      ? val.axis === 'x'
        ? new Frog(
            acc.Frog.x + val.distance,
            acc.Frog.y,
            acc.Frog.width,
            acc.Frog.height,
            acc.Frog.colour
          )
        : new Frog(
            acc.Frog.x,
            acc.Frog.y + val.distance,
            acc.Frog.width,
            acc.Frog.height,
            acc.Frog.colour
          )
      : acc.Frog;

    // Update cars and logs positions
    const newCars = updateCars(acc.Car, CAR_SPEEDS);
    const newLogs = updateLogs(acc.Wood, LOG_SPEEDS);

    // Move frog with log if standing on one
    const logSpeed = getLogSpeed(movedFrog, newLogs, LOG_SPEEDS);
    const frogOnLog = logSpeed !== 0
      ? new Frog(
          movedFrog.x + logSpeed,
          movedFrog.y,
          movedFrog.width,
          movedFrog.height,
          movedFrog.colour
        )
      : movedFrog;

    // Clamp frog position to boundaries
    const clampedFrog = new Frog(
      clampX(frogOnLog.x, frogOnLog.width),
      clampY(frogOnLog.y, frogOnLog.height),
      frogOnLog.width,
      frogOnLog.height,
      frogOnLog.colour
    );

    // Check if frog is safely on a log or on land
    const onLog = isOnLog(clampedFrog, newLogs);

    // Check for collisions
    const hitCar = checkCarCollision(clampedFrog, newCars);
    const endGame = hitCar || !onLog;

    // Check if frog reached goal (only score if wasn't already on goal)
    const reachedGoal = checkCollision(clampedFrog, initGoal);
    const newScore = reachedGoal && !acc.wasOnGoal ? acc.score + 1 : acc.score;
    const wasOnGoal = reachedGoal;

    // Reset frog position if goal reached
    const finalFrog = reachedGoal
      ? new Frog(FROG_START_X, FROG_START_Y, FROG_SIZE, FROG_SIZE, FROG_COLOUR)
      : clampedFrog;

    return new Game(newScore, endGame, finalFrog, newCars, newLogs, wasOnGoal);
  };

  // ========== VIEW UPDATE FUNCTIONS ==========
  
  const animateFrog = (object: Element) => (frog: Frog) => {
    object.setAttribute('x', String(frog.x));
    object.setAttribute('y', String(frog.y));
  };

  const animateCar = (object: Element) => (car: Car) => {
    object.setAttribute('x', String(car.x));
  };

  const animateWood = (object: Element) => (wood: Wood) => {
    object.setAttribute('x', String(wood.x));
  };

  // Check if game over element already exists (functional approach - no mutable state)
  const gameOverElementId = 'gameOverText';
  const hasGameOverElement = (): boolean => 
    document.getElementById(gameOverElementId) !== null;

  const updateView = (scoreEl: Element) => (game: Game) => {
    // Update frog position
    animateFrog(frogElement)(game.Frog);

    // Update car positions
    animateCar(obstacle)(game.Car[0]);
    animateCar(obstacle2)(game.Car[1]);
    animateCar(obstacle3)(game.Car[2]);
    animateCar(obstacle4)(game.Car[3]);

    // Update log positions
    animateWood(wood)(game.Wood[0]);
    animateWood(wood2)(game.Wood[1]);
    animateWood(wood3)(game.Wood[2]);

    // Update score
    scoreEl.textContent = 'Score: ' + game.score;

    // Display game over message (only once - check DOM instead of mutable variable)
    if (game.gameOver && !hasGameOverElement()) {
      const lose = document.createElementNS(svg.namespaceURI, "text")!;
      lose.id = gameOverElementId;
      lose.textContent = "Game Over!";
      lose.setAttribute('x', String(10));
      lose.setAttribute('y', String(50));
      svg.appendChild(lose);
    }
  };

  // ========== START GAME ==========
  const stream = merge(interval(10), controls$)
    .pipe(scan(reduceGameState, initialGame))
    .subscribe(updateView(scoreElement));
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
