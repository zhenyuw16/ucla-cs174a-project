# 3D Snake

UCLA COM SCI 174A Fall 2018

Group 10

Jung Hyun Park, Zhenyu Wang, Yaowei Guo, Zineng Guo

Our project is a 3D snake game that is played on a 3D cube, instead of a traditional 2D plane.

## Getting Started

### Playing Instructions

To start the game, simply run the host.bat / host.command file in our repository, just like running class assignments.

### Main Components

The game includes following main components:
- The **cube** is our game field. Clicking on the cube would select and change the colors of sub-cubes.
- The **snake**, starting with a length of 1 at the bottom left corner of the cube, could increase and decrease in length by eating bananas/hitting rocks. When the snake hits to its own body, all the body of the snake would become rocks.
- The **banana** is the consumable that can increase the length of the snake. When the snake eats the banana, the snake will get an acceleration force which makes it speed up for 2 seconds, and then gradually slows down to normal speed.
- The **rock** is the obstacle that can decrease the length of the snake when the snake collides with it.

### Key Controls

- Press "1" to attach the camera view to the head of the snake.

- Press O(up), K(left), L(down), and ;(right) to move the snake in four directions. 

- Press "P" to pause the game.

- Press "C" to change the background color.

- Click on the cube to change the colors of sub-cubes.

## Advanced Features

1. **Collision Detection** between the snake and other objects (banana and rock) by using the Ritter boundary spheres. 
2. **Bump mapping** on the snake.
3. **Rotation** as the snake crosses the edges of the cube.
4. **Picking and Selection**. The mouse clicking on the cube will lead to the change of the cube group's colors.
5. **Physics principals**. The movement speed of snake changes by the calculation of a friction force that is proportional to the current speed of the snake and a constant force that's equal to the initial friction force. After the snake eats a banana, it would accelerate due to a large force added upon which lasts 2 seconds. After 2 seconds, the force disappears, and the snake slows down due to the friction force.

## Some other features
- Sounds. We add a BGM for the game. The snake hitting rocks or eating banana triggers special sound effects.
- Use .obj files to make the visual effects better

## Contributing

- Yaowei and Zineng created the cube, and Zhenyu and Jung Hyun created the snake, banana, and rocks.
- Zineng and Zhenyu worked on bump mapping.
- Zhenyu and Yaowei worked on the camera view/rotation. 
- Jung Hyun worked on the collision detection and worked on the snake movement along with Zhenyu. 
- Yaowei added sounds to our game. 
- Zhenyu implemented physics principals and added .obj files.
- Zhenyu and Zineng worked on picking and selection. 

## Authors

* **[Jung Hyun Park](https://github.com/JungHyunPark97)**
* **[Zhenyu Wang](https://github.com/zhenyuw16)**
* **[Yaowei Guo](https://github.com/GYGWG)**
* **[Zineng Guo](https://github.com/fortunecookie34)**
