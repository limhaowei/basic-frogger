import "./style.css";
import { interval, fromEvent, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";

function main() {
  
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  // ========== CONSTANTS ==========
  const GRID_SIZE = 40; // Base unit for grid alignment
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 800;
  const RIVER_TOP = 120; // 3 grid rows
  const RIVER_BOTTOM = 360; // 6 grid rows (240px total for river)
  const ROAD_TOP = 360; // Road area starts here
  const ROAD_BOTTOM = 680; // 8 grid rows (320px total for road) - wider road
  const FROG_SIZE = GRID_SIZE;
  const FROG_START_X = 280;
  const FROG_START_Y = 720;
  const FROG_COLOUR = "#7FFF00";
  const MOVE_DISTANCE = GRID_SIZE;
  
  // Game speeds
  const CAR_SPEEDS = [2, 2.5, -3, -2] as const;
  const LOG_SPEEDS = [2, -3, 1] as const;

  // ========== TYPE DEFINITIONS ==========
  class ChangeMove {
    constructor(
      public readonly axis: string,
      public readonly distance: number,
    ) {}
  }

  class Restart {
    constructor() {}
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
      public readonly showGameOverMessage: boolean, // Track if game over message should be displayed
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
  
  // Check if two objects are colliding (strict overlap, not just touching)
  const checkCollision = (obj1: Frog, obj2: Car | Wood | Goal): boolean =>
    obj1.x + obj1.width > obj2.x &&
    obj1.x < obj2.x + obj2.width &&
    obj1.y + obj1.height > obj2.y &&
    obj1.y < obj2.y + obj2.height;
  
  // Check if object is beyond horizontal boundary
  const checkBoundaryH = (direction: 'left' | 'right', left: number, right: number): boolean =>
    direction === 'left' ? right <= 0 : left >= CANVAS_WIDTH;
  
  // Check if object is beyond vertical boundary
  const checkBoundaryV = (direction: 'up' | 'down', top: number, bottom: number): boolean =>
    direction === 'up' ? top <= 0 : bottom >= CANVAS_HEIGHT;
  
  // Reset x position when object wraps around screen
  // Allows objects to smoothly transition from one side to the other
  const resetX = (left: number, speed: number, right: number): number => {
    const width = right - left;
    const newLeft = left + speed;
    const newRight = newLeft + width;
    
    // Object moving right: if completely off right side, wrap to left side (negative x for gradual appearance)
    if (speed > 0 && newLeft >= CANVAS_WIDTH) {
      return -width; // Start off-screen on the left, will gradually appear
    }
    
    // Object moving left: if completely off left side, wrap to right side (beyond canvas for gradual appearance)
    if (speed < 0 && newRight <= 0) {
      return CANVAS_WIDTH; // Start off-screen on the right, will gradually appear
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
  createSVGRect({ x: 0, y: 0, width: CANVAS_WIDTH, height: RIVER_TOP, fill: "#008000" }); // grass (goal area)
  createSVGRect({ x: 0, y: RIVER_TOP, width: CANVAS_WIDTH, height: RIVER_BOTTOM - RIVER_TOP, fill: "#0000FF" }); // river
  createSVGRect({ x: 0, y: ROAD_TOP, width: CANVAS_WIDTH, height: ROAD_BOTTOM - ROAD_TOP, fill: "#444444" }); // road (car area)
  createSVGRect({ x: 0, y: ROAD_BOTTOM, width: CANVAS_WIDTH, height: CANVAS_HEIGHT - ROAD_BOTTOM, fill: "#800080" }); // starting area

  // Create log elements (grid-aligned: 40px height, widths as multiples of 40)
  const wood: Element = createSVGRect({ x: 80, y: 320, width: 160, height: GRID_SIZE, fill: "#A0522D" });
  const wood2: Element = createSVGRect({ x: 200, y: 240, width: 320, height: GRID_SIZE, fill: "#A0522D" });
  const wood3: Element = createSVGRect({ x: 120, y: 160, width: 240, height: GRID_SIZE, fill: "#A0522D" });

  // Create frog element
  const frogElement: Element = createSVGRect({
    x: FROG_START_X,
    y: FROG_START_Y,
    width: FROG_SIZE,
    height: FROG_SIZE,
    fill: FROG_COLOUR
  });

  // Create car elements (grid-aligned: 40px height, widths as multiples of 40)
  const initialCarsForDisplay = [
    new Car(450, 560, 120, GRID_SIZE),
    new Car(150, 400, 120, GRID_SIZE),
    new Car(200, 640, 80, GRID_SIZE),
    new Car(50, 480, 120, GRID_SIZE)
  ];

  const obstacles: Element[] = initialCarsForDisplay.map(car =>
    createSVGRect({ x: car.x, y: car.y, width: car.width, height: GRID_SIZE, fill: "#FF0000" })
  );

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
  
  const initialCars = initialCarsForDisplay;
  
  // Initialize logs: objects moving right start off-screen left, objects moving left start off-screen right
  // LOG_SPEEDS = [2, -3, 1] (logs 0,2 move right; log 1 moves left)
  const initialLogs = [
    new Wood(-160, 320, 160, GRID_SIZE), // Log 0: speed 2 (right) - start off-screen left
    new Wood(600, 240, 320, GRID_SIZE), // Log 1: speed -3 (left) - start off-screen right
    new Wood(-240, 160, 240, GRID_SIZE)  // Log 2: speed 1 (right) - start off-screen left
  ];
  const initialGame = new Game(0, false, initialFrog, initialCars, initialLogs, false, false);
  const initGoal = new Goal(FROG_START_X, 0, FROG_SIZE, FROG_SIZE);

  // ========== REACTIVE STREAMS ==========

  // Keyboard controls stream
  const controls$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    filter((key) => key.key === 'w' || key.key === 'a' || key.key === 's' || key.key === 'd' || key.key === 'r' || key.key === 'R'),
    filter(({ repeat }) => !repeat),
    map(key =>
      key.key === 'w' ? new ChangeMove('y', -MOVE_DISTANCE) :
      key.key === 's' ? new ChangeMove('y', MOVE_DISTANCE) :
      key.key === 'd' ? new ChangeMove('x', MOVE_DISTANCE) :
      key.key === 'a' ? new ChangeMove('x', -MOVE_DISTANCE) :
      new Restart()
    )
  );

  // Restart button stream
  const restartBtn$ = fromEvent(document.getElementById('restartBtn')!, 'click').pipe(
    map(() => new Restart())
  );

  // ========== GAME STATE REDUCER ==========
  const reduceGameState = (acc: Game, val: ChangeMove | number | Restart): Game => {
    // Handle restart action
    if (val instanceof Restart) {
      return initialGame;
    }

    // If game is over, don't update state
    if (acc.gameOver) return acc;

    // Update frog position based on user input
    const movedFrog = val instanceof ChangeMove
      ? (() => {
          // Check if frog is actually standing on a log (not just on land)
          const isTouchingLog = findLogUnderFrog(acc.Frog, acc.Wood) !== undefined;
          // For Y-axis (forward/backward): if touching a log, move 2 spaces; otherwise 1 space
          // For X-axis (left/right): always move 1 space regardless
          const moveDistance = val.axis === 'y' && isTouchingLog ? val.distance * 2 : val.distance;
          
          return val.axis === 'x'
            ? new Frog(
                acc.Frog.x + moveDistance,
                acc.Frog.y,
                acc.Frog.width,
                acc.Frog.height,
                acc.Frog.colour
              )
            : new Frog(
                acc.Frog.x,
                acc.Frog.y + moveDistance,
                acc.Frog.width,
                acc.Frog.height,
                acc.Frog.colour
              );
        })()
      : acc.Frog;

    // Check if frog is on a log BEFORE logs move (using current log positions)
    // This ensures the frog moves with the log it's standing on
    const logSpeed = getLogSpeed(movedFrog, acc.Wood, LOG_SPEEDS);
    
    // Move frog with log if standing on one (apply log speed to frog)
    const frogOnLog = logSpeed !== 0
      ? new Frog(
          movedFrog.x + logSpeed,
          movedFrog.y,
          movedFrog.width,
          movedFrog.height,
          movedFrog.colour
        )
      : movedFrog;

    // Update cars and logs positions (after moving frog with log)
    const newCars = updateCars(acc.Car, CAR_SPEEDS);
    const newLogs = updateLogs(acc.Wood, LOG_SPEEDS);

    const clampedFrog = new Frog(
      clampX(frogOnLog.x, frogOnLog.width),
      clampY(frogOnLog.y, frogOnLog.height),
      frogOnLog.width,
      frogOnLog.height,
      frogOnLog.colour
    );

    const onLog = isOnLog(clampedFrog, newLogs);

    const hitCar = checkCarCollision(clampedFrog, acc.Car);  
    const endGame = hitCar || !onLog;

    // Check if frog reached goal (only score if wasn't already on goal)
    const reachedGoal = checkCollision(clampedFrog, initGoal);
    const newScore = reachedGoal && !acc.wasOnGoal ? acc.score + 1 : acc.score;
    const wasOnGoal = reachedGoal;

    // Reset frog position if goal reached
    const finalFrog = reachedGoal
      ? new Frog(FROG_START_X, FROG_START_Y, FROG_SIZE, FROG_SIZE, FROG_COLOUR)
      : clampedFrog;

    // Show game over message only when game just ended (transition from not gameOver to gameOver)
    const showGameOverMessage = endGame && !acc.gameOver;

    return new Game(newScore, endGame, finalFrog, newCars, newLogs, wasOnGoal, showGameOverMessage);
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

  const gameOverElementId = 'gameOverText';

  const updateView = (scoreEl: Element) => (game: Game) => {
    animateFrog(frogElement)(game.Frog);

    game.Car.forEach((car, index) => animateCar(obstacles[index])(car));

    animateWood(wood)(game.Wood[0]);
    animateWood(wood2)(game.Wood[1]);
    animateWood(wood3)(game.Wood[2]);

    // Update score
    scoreEl.textContent = 'Score: ' + game.score;

    // Display game over message only when showGameOverMessage is true (derived from state)
    if (game.showGameOverMessage) {
      const lose = document.createElementNS(svg.namespaceURI, "text")!;
      lose.id = gameOverElementId;
      lose.textContent = "Game Over!";
      lose.setAttribute('x', String(10));
      lose.setAttribute('y', String(50));
      svg.appendChild(lose);
    }

    // Remove game over message on restart (when game is not over and element exists)
    if (!game.gameOver) {
      const gameOverEl = document.getElementById(gameOverElementId);
      if (gameOverEl) {
        gameOverEl.remove();
      }
    }
  };

  // ========== START GAME ==========
  const stream = merge(interval(10), controls$, restartBtn$)
    .pipe(scan(reduceGameState, initialGame))
    .subscribe(updateView(scoreElement));
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
