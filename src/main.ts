import "./style.css";
import { interval, fromEvent, merge,  } from "rxjs";
import { map, filter, scan, take, mergeMap, takeUntil, reduce } from "rxjs/operators";

function main() {
  
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  type Direction = 'Horizontal'|'Vertical'


  //utilising classes to manage states of different objects in the game
  class changeMove{constructor(
    public readonly axis: String,
    public readonly distance: number,
  ){}}

  class Frog{constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
    public readonly colour: string,
    ){}}

  class Car{constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
  ){}}

  class Wood{constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
  ){}}

  class Goal{constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
  ){}}

  class Game{constructor(
    public readonly score: number,
    public readonly gameOver: boolean,
    public readonly Frog: Frog,
    public readonly Car: Car[],
    public readonly Wood: Wood[],
    
  ){}}
  

  


  // adding the elements in the svg canvas
  
  const river = document.createElementNS(svg.namespaceURI, "rect")
  Object.entries({
    x: 0,
    y: 70,
    width: 600,
    height: 259,
    fill: "#0000FF",}).forEach(([key, val]) => river.setAttribute(key, String(val)));
    svg.appendChild(river);

  const sidewalk1 = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 0,
    y: 710,
    width: 600,
    height: 70,
    fill: "#800080",
  }).forEach(([key, val]) => sidewalk1.setAttribute(key, String(val)));
  svg.appendChild(sidewalk1);

  const sidewalk2 = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 0,
    y: 330,
    width: 600,
    height: 70,
    fill: "#800080",
  }).forEach(([key, val]) => sidewalk2.setAttribute(key, String(val)));
  svg.appendChild(sidewalk2);

  const grass = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 0,
    y: 0,
    width: 600,
    height: 70,
    fill: "#008000",
  }).forEach(([key, val]) => grass.setAttribute(key, String(val)));
  svg.appendChild(grass);

  const wood = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 100,
    y: 250,
    width: 200,
    height: 80,
    fill: "#A0522D",
  }).forEach(([key, val]) => wood.setAttribute(key, String(val)));
  svg.appendChild(wood);

  const wood2 = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 300,
    y: 170,
    width: 400,
    height: 70,
    fill: "#A0522D",
  }).forEach(([key, val]) => wood2.setAttribute(key, String(val)));
  svg.appendChild(wood2);

  const wood3 = 
  document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 250,
    y: 80,
    width: 300,
    height: 80,
    fill: "#A0522D",
  }).forEach(([key, val]) => wood3.setAttribute(key, String(val)));
  svg.appendChild(wood3);

  const frogElement = document.createElementNS(svg.namespaceURI, "rect");
  Object.entries({
    x: 275,
    y: 700,
    width: 40,
    height: 40,
    fill: "#7FFF00",}).forEach(([key, val]) => frogElement.setAttribute(key, String(val)));
    svg.appendChild(frogElement);

  const obstacle = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 400,
    y: 570,
    width: 130,
    height: 50,
    fill: "#FF0000",
  }).forEach(([key, val]) => obstacle.setAttribute(key, String(val)));
  svg.appendChild(obstacle);



  const obstacle2 = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 250,
    y: 420,
    width: 130,
    height: 50,
    fill: "#FF0000",
  }).forEach(([key, val]) => obstacle2.setAttribute(key, String(val)));
  svg.appendChild(obstacle2);

  const obstacle3 = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 100,
    y: 630,
    width: 80,
    height: 50,
    fill: "#FF0000",
  }).forEach(([key, val]) => obstacle3.setAttribute(key, String(val)));
  svg.appendChild(obstacle3);


  const obstacle4 = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 330,
    y: 500,
    width: 150,
    height: 50,
    fill: "#FF0000",
  }).forEach(([key, val]) => obstacle4.setAttribute(key, String(val)));
  svg.appendChild(obstacle4);

  const goal = document.createElementNS(svg.namespaceURI, 'rect')
  Object.entries({
    x: 275,
    y: 0,
    width: 40,
    height: 40,
    fill: "#FFA500",
  }).forEach(([key, val]) => goal.setAttribute(key, String(val)));
  svg.appendChild(goal);

  


  //adding the event listeners for keyboard
  const controls$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    filter((key) => key.key == 'w'|| key.key == 'a' || key.key == 's' || key.key == 'd'
  ), filter(({repeat}) => !repeat),
  map(key => key.key === 'w'? new changeMove('y',-30)
  : key.key === 's' ? new changeMove('y', 30)
  : key.key === 'd' ?  new changeMove('x', 30)
  : new changeMove('x',  -30)))
  

  
  //instantiating car objects from the Car class 
  const car1 = new Car(400,570,130,50)
  const car2 = new Car(250,420, 130,50)
  const car3 = new Car(100,630,80,50)
  const car4 = new Car(330,500,150,50)

 
  //function to get the car elements in the canvas moving
  const animateCar = (object: Element) => (s: Car) => object.setAttribute('x', String(s.x))


    
  //instantiating log objects from the Wood class
  const log1 = new Wood(100,250,200,80)
  const log2 = new Wood(300,170,400,70)
  const log3 = new Wood(250,80,300,80)


 
  //function to get the logs elements in the canvas moving
  const animateWood = (object: Element) => (s: Wood) => object.setAttribute('x', String(s.x))
  

  //function that takes in an empty list of Car objects and returns a list containing all the car objects that have been instantiated
  function collectCars(cars: Car[]){
    return function(speed1: number, speed2: number, speed3: number, speed4: number){
      return [new Car(resetX(cars[0].x, speed1, cars[0].x + cars[0].width), cars[0].y, cars[0].width, cars[0].height), 
        new Car(resetX(cars[1].x, speed2, cars[1].x + cars[1].width), cars[1].y, cars[1].width, cars[1].height), 
        new Car(resetX(cars[2].x, speed3, cars[2].x + cars[2].width), cars[2].y, cars[2].width, cars[2].height), 
        new Car(resetX(cars[3].x, speed4, cars[3].x + cars[3].width), cars[3].y, cars[3].width, cars[3].height)]
    }
  }

  //function that works the same as collectCars but for log objects
  function collectLogs(wood: Wood[]){
    return function(speed1: number, speed2: number, speed3: number){
      return [new Wood(resetX(wood[0].x, speed1, wood[0].x + wood[0].width), wood[0].y, wood[0].width, wood[0].height), 
        new Wood(resetX(wood[1].x, speed2, wood[1].x + wood[1].width), wood[1].y, wood[1].width, wood[1].height), 
        new Wood(resetX(wood[2].x, speed3, wood[2].x + wood[2].width), wood[2].y, wood[2].width, wood[2].height)]
    }
  }

  // creating initial instances from their respective classes 
  const initialFrog = new Frog(275, 700, 40, 40, "#7FFF00")

  const initialGame = new Game(0, false, initialFrog, [car1,car2,car3,car4],[log1,log2,log3]) 

  const initGoal = new Goal(275,0,40,40)


  // function that takes in an accumulator which is a Game object and the other parameter is the input to change the accumulator
  const reduceGameState = (acc: Game, val: changeMove |  Number) =>{
    /*
     Input: acc: Game object which acts like an accumulator which stores all the properties of the Game object
            val: input which is supposed to change the Frog object's x and y properties 
      
     */
    //accumulating state of the Game object
      const frogger = val instanceof changeMove? val.axis == 'x'?
      new Frog(acc.Frog.x + val.distance, acc.Frog.y, acc.Frog.width, acc.Frog.height, acc.Frog.colour):
      new Frog(acc.Frog.x, acc.Frog.y + val.distance, acc.Frog.width, acc.Frog.height, acc.Frog.colour):
      new Frog(acc.Frog.x, acc.Frog.y, acc.Frog.width, acc.Frog.height, acc.Frog.colour)

      
      // creating lists of Car and Log objects using the collectCars and collectLogs functions
        const newCar = collectCars(acc.Car)(1,3,-4,-2.5)
        const newLog = collectLogs(acc.Wood)(2,-3,1)

      // creating a boolean constant which returns either true if the frog is touching a log while on water or if the frog is on land, and false when the frog is on the water and not touching a log
      const onLog: boolean = (frogger.y <= 280 && frogger.y > 70) &&
      ((checkCollision(frogger, newLog[0])) ||
      (checkCollision(frogger, newLog[1])) ||
      (checkCollision(frogger, newLog[2]))) ? true :  frogger.y <= 280 && frogger.y > 70? false : true
      

     // makes sure that the frog does not go beyond the boundaries of the svg canvas 
    const updateFrog: Frog = checkBoundaryV('up', frogger.y, frogger.y + frogger.height) ? new Frog(frogger.x, 1, 40, 40, "#7FFF00"):
                              checkBoundaryV('down', frogger.y, frogger.y + frogger.height) ? new Frog(frogger.x, 750, 40, 40, "#7FFF00"):
                              checkBoundaryH('left', frogger.x, frogger.x + frogger.width) ? new Frog(1, frogger.y, 40, 40, "#7FFF00"):
                              checkBoundaryH('right', frogger.x, frogger.x + frogger.width)? new Frog(600 - 30, frogger.y, 40, 40, "#7FFF00")
                              : frogger
    
    
    // sets the constant endGame to true if the frog has collided with either a car or has fallen in the river. false otherwise
    const endGame: boolean = checkCollision(updateFrog,newCar[0]) ||
    checkCollision(updateFrog,newCar[1]) ||
    checkCollision(updateFrog,newCar[2]) ||
    checkCollision(updateFrog,newCar[3]) ||
    !onLog ? true : false

    
    // if the frog reaches the goal, the score increments
    const increaseScore: number = checkCollision(updateFrog, initGoal)? acc.score + 1 : acc.score
    
    // when the frog reaches the goal, its position gets set back to its original position
    const updateFrog2: Frog = checkCollision(updateFrog, initGoal)? 
    new Frog(275, 700, 40, 40, "#7FFF00") : updateFrog

    
    const updateGame: Game = checkCollision(updateFrog2, initGoal)? 
        new Game(increaseScore, endGame, updateFrog2, newCar, newLog) : new Game(increaseScore, endGame, updateFrog2, newCar, newLog)

            
    return updateGame.gameOver? updateGame : updateGame

    
    
  }
// creating score element to be shown in campus
  const score = document.createElementNS(svg.namespaceURI, "text")!
  score.textContent = "Score " 
  score.setAttribute('x', String(500))
  score.setAttribute('y', String(50))
  svg.appendChild(score);

// creates a stream where two observables are merged and scan is used to combine the inputs to pass into the subscribe function which calls updateView 
  const stream = merge(interval(10), controls$).pipe(scan(reduceGameState, initialGame)).subscribe(updateView(score))

// function that sets the (x,y) coordinates of the frog object in the canvas according to the x and y properties of the frog object
  const animateFrog = (object: Element, s: Frog)  => {
    object.setAttribute('x',String(s.x))
    object.setAttribute('y',String(s.y))
  
  }

// function that updates the svg canvas by calling the respective animate functions for the objects
// it also shows the current score in the game and also displays a 'game over' message when the frog dies
  function updateView(v: Element){
    /*
    Input: v: Element type which is used to show the score of the current game
    Output: another function which takes in a Game object which calls all the animate function on all the elements in the canvas to move based 
            on the properties of the objects from the Game object
    */
    return function(game: Game){
    animateFrog(frogElement, game.Frog)
    animateCar(obstacle)(game.Car[0])
    animateCar(obstacle2)(game.Car[1])
    animateCar(obstacle3)(game.Car[2])
    animateCar(obstacle4)(game.Car[3])
    animateWood(wood)(game.Wood[0])
    animateWood(wood2)(game.Wood[1])
    animateWood(wood3)(game.Wood[2])

    v.textContent = 'Score: ' + game.score

    // displays 'game over' when frog hits car or falls in river on the top left of the canvas
    if(game.gameOver == true){
      stream.unsubscribe()
      const lose = document.createElementNS(svg.namespaceURI, "text")!
      lose.textContent = "Game Over!" 
      lose.setAttribute('x', String(10))
      lose.setAttribute('y', String(50))
      svg.appendChild(lose);
    }
  }}

  // the functions below are to reduce repetition


// takes in a direction and two numbers which are supposed to be the object's x-coordinates for the left and right sides
// returns a boolean which is true if either left or right is over the boundary
  function checkBoundaryH(direction: 'left'|'right', left: number, right: number): boolean {
    return direction == 'left'? right <= 0  :  left >= 600 
  }


  //same thing as the above function but checks for the vertical boundaries
  function checkBoundaryV(direction: 'up'|'down', top: number, bottom: number): boolean{
    return direction == 'up' ? top <= 0 : bottom >= 780
  }

  //function that uses the checkBoundary functions to set the position to not go over the boundaries of the svg canvas
  function resetX(left: number, pos: number, right: number): number{
    return checkBoundaryH('left', left + pos, right)? 599 : checkBoundaryH('right', left + pos, right)? 1 - (right - left) : left + pos
  }

  // function that returns a boolean which checks whether the two input objects are colliding
  function checkCollision(obj1: Frog, obj2: Car | Wood): boolean{
    if(obj1.x + obj1.width >= obj2.x && obj1.x <= obj2.x + obj2.width &&
       obj1.y + obj1.height >= obj2.y && obj1.y <= obj2.y + obj2.height){
        return true
       }
    return false 
  }

  



}

  







  

  
    

  

  
  



















// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
