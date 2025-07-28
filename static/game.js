// functions 

function getCanvasShape() {
    let gameCanvas = document.getElementById('gameCanvas');
    return [gameCanvas.width, gameCanvas.height];
}

function updateOnScreeResize(gameInstance){
    updateCanvasShape();
    updatePhysicsParams(gameInstance)
}

function updateCanvasShape() {
    let gameCanvas = document.getElementById('gameCanvas');
    gameCanvas.width = gameCanvas.offsetWidth;
    gameCanvas.height = gameCanvas.offsetHeight;
}

function updatePhysicsParams(gameInstance) {
    [, canvasHeight] = getCanvasShape();

    let playerHeight = 0.15 * canvasHeight;
    let playerWidth = 0.2 * playerHeight;

    gameInstance.player1.height = playerHeight;
    gameInstance.player1.width = playerWidth;
    gameInstance.player2.height = playerHeight;
    gameInstance.player2.width = playerWidth;
    gameInstance.ball.width = playerWidth;

    gameInstance.ball.velocity = gameCanvas.height * gameInstance.ball.velocityFactor;
    gameInstance.player1.velocity = gameCanvas.height * gameInstance.player1.velocityFactor;
    gameInstance.player2.velocity = gameCanvas.height * gameInstance.player2.velocityFactor;
}

function toRadians(deg) {
    return deg * Math.PI / 180;
}

function getRandomAngle() {
    const ranges = [
        { min: -65, max: 65 },
        { min: 115, max: 245 }
    ];

    const range = ranges[Math.floor(Math.random() * ranges.length)];
    let angleDegrees = Math.random() * (range.max - range.min) + range.min;
    return toRadians(angleDegrees);
}

function getDistanceFromPlayerToBall(ball, player){
    let distance = player.forwardVector[0] * (ball.xPosition - player.xPosition);
    return distance;
}


// Classes


class Player {
    constructor(){
        this.velocityFactor = 0.5;
        this.velocity = 0;
        this.score = 0;
        this.forwardVector = [1, 0];
        this.height = 0;
        this.width = 0;
        this.resetYPosition();
    }

    resetPosition(){
        this.resetYPosition();
        this.resetXPosition();
    }

    resetXPosition(){
        this.xPosition = this.width;
    }

    resetYPosition(){
        let [, canvasHeight] = getCanvasShape();
        this.yPosition = canvasHeight*0.5;
    }

    scorePoint(){
        this.score += 1
    }

}

class HumanPlayer extends Player{
    constructor(){
        super();
        this.resetXPosition();
    }

    move(delta) {
        let [, canvasHeight] = getCanvasShape();
        let yMax = canvasHeight - this.height/2;
        let yMin = this.height/2;
        if (keysPressed['w']) {
            this.yPosition -= this.velocity * delta;
        }
        if (keysPressed['s']) {
            this.yPosition += this.velocity * delta;
        }
        // dont let player leave canvas
        this.yPosition = Math.max(yMin,Math.min(yMax, this.yPosition));
        return;
    }
}

class CpuPlayer extends Player{
    constructor(){
        super();
        this.velocityFactor = 0.33;
        this.velocity = 0;
        this.forwardVector = [-1, 0];
    }

    resetXPosition(){
        let [canvasWidth,] = getCanvasShape();
        this.xPosition = canvasWidth-this.width;
    }

    move(delta, yBall){
        let distanceToBall = yBall - this.yPosition;
        let maxDistance = this.velocity*delta;
        let distance = Math.min(maxDistance, Math.abs(distanceToBall));
        distance = distance * Math.sign(distanceToBall);
        this.yPosition += distance;
        // dont let player leave canvas
        let [, canvasHeight] = getCanvasShape();
        let yMax = canvasHeight - this.height/2;
        let yMin =this.height/2;
        this.yPosition = Math.max(yMin,Math.min(yMax, this.yPosition));
        return;
    }
}

class Ball{
    constructor(){
        this.velocityFactor = 0.5;
        this.velocity = 0;
        this.width = 0;
        this.reset();
    }

    reset(){
        let [canvasWidth, canvasHeight] = getCanvasShape();
        this.xPosition = canvasWidth/2;
        this.yPosition = canvasHeight/2;
        let startAngle = getRandomAngle();
        this.forwardVector = [Math.cos(startAngle), Math.sin(startAngle)];
    }

    update(delta){
        this.dealWithWallCollision();
        this.move(delta);
    }

    move(delta){
        let xDistance = this.forwardVector[0]*this.velocity*delta;
        let yDistance = this.forwardVector[1]*this.velocity*delta;
        this.xPosition += xDistance;
        this.yPosition += yDistance;
    }

    dealWithWallCollision(){
        let [, canvasHeight] = getCanvasShape();
        // detect wall collisions and reflect
        let upperBorder = this.width/2;
        let lowerBorder = canvasHeight-this.width/2;
        if (this.yPosition <= upperBorder || this.yPosition >= lowerBorder){
            this.forwardVector[1] *= -1;
        }
    }

    dealWithPlayerHit(player){
        
        let distance = getDistanceFromPlayerToBall(this, player);
        let product = player.forwardVector[0]*this.forwardVector[0];
        if (distance < 0 || product==1) {
            // cant collide
            return;
        }
        
        let xMax = player.width/2;
        let xMin = -player.width/2;
        if (distance > xMax  || distance < xMin) {
            // is not at the raket
            return;
        } 
        let yMax = player.yPosition + player.height/2;
        let yMin = player.yPosition - player.height/2;

        if(this.yPosition > yMin && this.yPosition < yMax){
            // is within the raket
            this.forwardVector[0] *= -1;
        }
        return;
    }
}

class Game{

    constructor() {
        this.isRunning = false;
        this.animationFrameId = null;
        this.player1 = new HumanPlayer();
        this.player2 = new CpuPlayer();
        this.ball = new Ball();
        this.tickRate = 100
        this.timeSlice = (1 / this.tickRate) * 1000; // ms
        this.init();
    }

    init(){
        // Reset game state (scores, positions, etc.)
        this.player1.score = 0;
        this.player2.score = 0;
        this.updateScore();
        this.reset();
    }
    
    reset() {
        // sets up game for next point
        updatePhysicsParams(this);
        this.player1.resetPosition();
        this.player2.resetPosition();
        this.ball.reset();
    }

    start() {
        this.isRunning = true;
        this.init();
        this.accumulator = 0;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    loop = (now) => {
        if (!this.isRunning) return; // stop loop if not running
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta;
       
        while (this.accumulator > this.timeSlice) {
            this.update(delta);
            this.accumulator -= this.timeSlice;
        }
        this.draw();

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    update(delta){
        delta = delta / 1000 // ms -> seconds
        this.ball.update(delta);
        this.ball.dealWithPlayerHit(this.player1);
        this.ball.dealWithPlayerHit(this.player2);

        if (this.checkIfScored()) {
            this.updateScore();
            this.reset();
        }

        if (this.hasWinner()) {
            this.isRunning = false;   
        }
        this.player1.move(delta);
        this.player2.move(delta, this.ball.yPosition);
    }   

    draw(){
        let gameCanvas = document.getElementById('gameCanvas');
        let [canvasWidth, canvasHeight] = getCanvasShape()
        if (gameCanvas.getContext) {
            let context = gameCanvas.getContext("2d");
            context.clearRect(0, 0, canvasWidth, canvasHeight); // clear canvas
            context.fillStyle = "white";
            // draw player 1
            let x = this.player1.width;
            let y = this.player1.yPosition - this.player1.height/2; 
            context.fillRect(x, y, this.player1.width, this.player1.height); 
            // draw player 1
            x = canvasWidth - 2*this.player2.width;
            y = this.player2.yPosition - this.player1.height/2; 
            context.fillRect(x, y, this.player2.width, this.player2.height); 
            // draw ball
            x = this.ball.xPosition - this.ball.width/2;
            y = this.ball.yPosition - this.ball.width/2; 
            context.fillRect(x, y, this.ball.width, this.ball.width); 
        }
    }

    hasWinner(){
        if (this.player1.score == 11 || this.player2.score == 11 ) {
            return true;
        }
        return false;
    }

    checkIfScored(){
        let [canvasWidth, ] = getCanvasShape()
        if (this.ball.xPosition <= 0){
            this.player2.scorePoint();
            return true;
        }
        else if (this.ball.xPosition >= canvasWidth){
            this.player1.scorePoint();
            return true;
        }
        return false;
    }

    updateScore(){
        let scoreText = `${this.player1.score} : ${this.player2.score}`;
        document.getElementById('scoreDisplay').innerText = scoreText;
    }

}


// Manage Game


function startGame() {
    if (!game.isRunning){
        game.start();
    } else{
        game.stop();
        game.start();
    }    
}

function stopGame() {
    game.stop();
}


// Event listeners 

const keysPressed = {};
window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 's') {
        keysPressed[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 's') {
        keysPressed[e.key] = false;
    }
});


const game = new Game();
updateOnScreeResize(game)

window.addEventListener('resize', () => {
    updateOnScreeResize(game);
});


