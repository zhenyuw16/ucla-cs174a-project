window.Snake = window.classes.Snake =
class Snake extends Scene_Component
  { constructor( context, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   context, control_box );    // First, include a secondary Scene that provides movement controls:
        if( !context.globals.has_controls   ) 
          context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,10,30 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
        this.initial_camera_location = Mat4.inverse( context.globals.graphics_state.camera_transform );

        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );
		


		// loading sound in gameplay
        this.sounds = { eat: new Audio('assets/food.mp3' ), 
                    bounce: new Audio('assets/collide.wav' ),
                    dead: new Audio('assets/dead.mp3') }

		// there is one donut per side, so donut_X[0] is x location of donut at side 0, or front
		this.donut_X = new Array();
		this.donut_Y = new Array();

		this.rock_X = new Array();
		this.rock_Y = new Array();
		this.rock_side = new Array();
		
		this.epilepsy = false;

		//speed and acceleration
		this.speed=30.0;
		this.k_air=10.0;
		this.a_air=this.k_air*this.speed;
		this.a_F0=this.a_air;
		this.a_F1=0;
		this.a_last_time=0;

		// initialize random rock locations
		for (var i = 0; i < 6; i++)	{
			this.donut_X.push(Math.floor(Math.random()*9));
			this.donut_Y.push(Math.floor(Math.random()*9));
			for (var j = 0; j < 9; j++)	{
				this.rock_side.push(i);
				let temp_X = (Math.random()*8)+1;
				let temp_Y = (Math.random()*8)+1;

				this.rock_X.push(temp_X);
				this.rock_Y.push(temp_Y);
			}
		}

		this.donut_X[0] = 1;
		this.donut_Y[0] = 1;
   
        this.t_pre=0;
        this.t_now=0;
		this.snake_direction = 0;
		// 0 means static
		// 1 means up
		// 2 means down
		// 3 means left
		// 4 means right

		this.snake_X = new Array();
		this.snake_Y = new Array();
		this.snake_side = new Array();
		// 0 means front
		// 1 means back
		// 2 means top
		// 3 means bottom
		// 4 means left
		// 5 means right

		this.snake_X.push(0);
		this.snake_Y.push(0);
		this.snake_side.push(0);

		this.canvas = document.getElementById("main-canvas").children[0];
        this.webgl_manager = context;
        this.gl = this.canvas.getContext("webgl", {preserveDrawingBuffer: true});
		
        this.backgroundcolor = Color.of(Math.random(),Math.random(),Math.random(),1);
        this.gl.clearColor.apply(this.gl, this.backgroundcolor);
        
        const shapes = { 
                         //rock: new Four(),
                         rock: new Shape_From_File( "/assets/Rock_6.obj" ),
                         sphere: new Subdivision_Sphere(4),
                         //torus:  new Torus( 15, 15 ),
                         torus:  new Shape_From_File( "/assets/Banana.obj" ),
						 cube: new Cube(),
						 outline: new Cube_Outline(),
                         grid_sphere: new ( Grid_Sphere.prototype.make_flat_shaded_version() )( 10, 10 )
                       }
        this.submit_shapes( context, shapes );
                                     
                                     // Make some Material objects available to you:
        this.materials =
          { color_1:      context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1    ), { ambient: .3, diffusivity: .5, specularity: .5,texture: context.get_instance( "/assets/Banana.jpg",false) } ),
            color_2: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), { ambient: .7, diffusivity: .5, specularity: .5,texture: context.get_instance( "/assets/Rock_6_d.png",false) } ),
            color_3: context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1  ), { ambient: 0.5, diffusivity: .5, specularity: .5,texture: context.get_instance( "/assets/Banana.jpg",false) } ),
            color_4: context.get_instance( Bump_Shader ).material( Color.of( 0,0,0,1 ), { ambient: 1.0, diffusivity: .5, specularity: .5,texture: context.get_instance( "/assets/brick001.jpg" )} ),
            color_5: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), { ambient: 1 } ),
            color_6:     context.get_instance( Ring_Shader  ).material(),
			phong: context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1 ),
            context.get_instance( Phong_Shader ).material( Color.of( 0, 0, 0, 1 ),
            { ambient: 1, texture: context.get_instance("assets/grid.png", false)})
             )
          }

                                     // Make some other Material objects available to you:
        this.clay   = context.get_instance( Phong_Shader ).material( Color.of( .9,.5,.9, 1 ), { ambient: .4, diffusivity: .4 } );
        this.clay   = context.get_instance( Phong_Shader ).material( Color.of( .9,.5,.9, 1 ), { ambient: 1, diffusivity: 1 } );
        this.black  = context.get_instance( Basic_Shader ).material();
        this.plastic = this.clay.override({ specularity: .6});

        this.lights = [ new Light( Vec.of( 0,5,5,1 ), Color.of( 0, 1, 1, 1 ), 100000 ) ];
        this.set_colors();

        const color1 = Color.of( 0,0,1,1 ), color2 = Color.of( 1,1,0,1 ), color3 = Color.of( 1,0,0,1 ), 
          color4 = Color.of( 0,1,0,1 ), color5 = Color.of( 1,0,1,1 ), color6 = Color.of( 0,1,1,1 ), color7 = Color.of( 1,1,1,1 ), color8 = Color.of( 1,0.5,0,1 )
          , color9 = Color.of( 0.5,0.5,0.5,1 ), color10 = Color.of( 0,0.5,0,1 );
        this.group1 = [color4, color6, color4, color6, color4, color6, color4, color6, color4, color6]
        this.group2 = [color6, color4, color6, color4, color6, color4, color6, color4, color6, color4]
        this.group3 = [color3, color4, color5, color6, color7, color8, color9, color10, color1, color2]
        
        this.ngroup1 = [10,11,12,13,14,15,16,17,18,19];
        this.ngroup2 = [20,21,22,23,24,25,26,27,28,29];
        this.ngroup3 = [30,31,32,33,34,35,36,37,38,39];
        this.groupVector = [this.group1, this.group2, this.group3];
        this.ngroupVector = [this.ngroup1, this.ngroup2, this.ngroup3];
        this.chooseGroup = 0;

        this.webgl_manager.canvas.addEventListener("click", event => {
		 	this.webgl_manager.gl.clear( this.webgl_manager.gl.COLOR_BUFFER_BIT | this.webgl_manager.gl.DEPTH_BUFFER_BIT);
		 	let l=this.lights;
		 	this.lights=[  ];
		 	this.plastic = this.clay.override({diffusivity:0,specularity:0});
		 	this.draw_box_first_time(context.globals.graphics_state);

			let x = event.clientX,
			y = event.clientY,
			rect = event.target.getBoundingClientRect();
			x = x - rect.left;
			y = rect.bottom - y;
			let point = {x:x,y:y};
			let pixels = new Uint8Array(4);
			this.webgl_manager.gl.readPixels(point.x, point.y, 1, 1, this.webgl_manager.gl.RGBA, this.webgl_manager.gl.UNSIGNED_BYTE, pixels);
			this.webgl_manager.gl.clear( this.webgl_manager.gl.COLOR_BUFFER_BIT | this.webgl_manager.gl.DEPTH_BUFFER_BIT);

			let cube_num=pixels[0];
			if(Math.floor(cube_num/10)-1>=0&&Math.floor(cube_num/10)-1<3)
			{
				this.groupVector[Math.floor(cube_num/10)-1][cube_num%10]=Color.of( Math.random(),Math.random(),Math.random(),1 );
			}


			this.lights=l;
			//console.log(pixels);
			this.plastic = this.clay.override({diffusivity:1,specularity:0.6});
		})


      }

      play_sound( name, volume = 1 )	{
      	  if( 0 < this.sounds[ name ].currentTime && this.sounds[ name ].currentTime < .3 ) return;
		  this.sounds[ name ].currentTime = 0;
		  this.sounds[ name ].volume = Math.min(Math.max(volume, 0), 1);;
		  this.sounds[ name ].play();
		}	

	  check_rock()	{
	  	for (var i = 0; i < this.rock_X.length; i++)	{
	  		if (this.rock_side[i] == this.snake_side[0])	{
	  			let temp = {x: this.rock_X[i], y: this.rock_Y[i]};
	  			let a = this.generate_rock_sphere(temp);
	  			let b = {x: this.snake_X[0]+.5, y: this.snake_Y[0]+.5, z: .25, r: .25};
	  			if (this.check_collision(a, b))	{
	  				//alert(a.x + " " + a.y + " " + a.z + " " + a.r + " " + b.x + " " + b.y + " " + b.z + " " + b.r);
	  				this.snake_X.pop();
	  				this.snake_Y.pop();
	  				this.snake_side.pop();
	  				this.rock_X.splice(i, 1);
	  				this.rock_Y.splice(i, 1);
	  				this.rock_side.splice(i, 1);

	  				if (this.snake_X.length != 0)
	  					this.play_sound( "bounce" );
	  			}
	  		}
	  	}
	  }

	  check_cannibal()	{
	  	if (this.snake_X.length > 1)	{
	  		let head_X = this.snake_X[0];
	  		let head_Y = this.snake_Y[0];
	  		let head_side = this.snake_side[0];

	  		for (var i = 1; i < this.snake_X.length; i++)	{
	  			if (this.snake_X[i] == head_X && this.snake_Y[i] == head_Y && this.snake_side[i] == head_side)	{
	  				while (this.snake_X.length > i)	{
	  					this.rock_X.push(this.snake_X.pop());
	  					this.rock_Y.push(this.snake_Y.pop());
	  					this.rock_side.push(this.snake_side.pop());
	  				}
	  			}
	  		}
	  	}
	  }


	 

	  generate_rock_sphere(r)	{
		let points = [];
		let temp = {x: r.x+.2, y: r.y+.2, z: 1};
		points.push(temp);
		temp = {x: r.x+.8, y: r.y+1, z: 0.1};
		points.push(temp);
		temp = {x: r.x+1, y: r.y+.3, z: 0.1};
		points.push(temp);
		temp = {x: r.x+.5, y: r.y+1.1, z: 0};
		points.push(temp);
		let r_sphere = this.ritter_sphere(points);
		return r_sphere;
	  }

	  generate_donut_sphere(d)	{
	  	let points = [];
		let temp = {x: d.x+.3, y: d.y+.3, z: .5};
		points.push(temp);
		temp = {x: d.x+.8, y: d.y+.7, z: .4};
		points.push(temp);
		temp = {x: d.x+.6, y: d.y+.5, z: 1};
		points.push(temp);

		let d_sphere = this.ritter_sphere(points);
		return d_sphere;
	  }

	  update_speed(dt)
	  {
	  	if(this.a_last_time>this.t_now)
	  		this.a_F1=1000;
	  	else
	  		this.a_F1=0;
	  	this.a_air=this.k_air*this.speed;
	  	this.speed=(this.a_F1+this.a_F0-this.a_air)*dt;
	  }

      move_snake()	{
      	this.t_pre = this.t_now;
      	let temp_X = this.snake_X[this.snake_X.length-1];
      	let temp_Y = this.snake_Y[this.snake_X.length-1];
      	let temp_side = this.snake_side[this.snake_X.length-1]; 	
      	if (this.snake_direction != 0)	{
			for (var i = this.snake_X.length-1; i > 0; i--)	{
				this.snake_X[i]=this.snake_X[i-1];
				this.snake_Y[i]=this.snake_Y[i-1];
				this.snake_side[i]=this.snake_side[i-1];
			}
      	}
      	switch(this.snake_direction)	{
      		case 1:
      			if(this.snake_Y[0]<9.5) this.snake_Y[0]+=0.25;
      			else {
      				switch(this.snake_side[0]){
      					case 0:
      						this.snake_Y[0]=-.5;
      						this.snake_side[0]=2;
      						break;
      					case 1:
      						this.snake_X[0]=9.5-this.snake_X[0];
      						this.snake_side[0]=2;
      						this.snake_direction=2;
      						break;
      					case 2:
      						this.snake_X[0]=9.5-this.snake_X[0];
      						this.snake_side[0]=1;
      						this.snake_direction=2;
      						break;
      					case 3:
      						this.snake_Y[0]=-.5;
      						this.snake_side[0]=0;
      						break;
      					case 4:
      						this.snake_Y[0]=9.5-this.snake_X[0];
      						this.snake_X[0]=-.5;
      						this.snake_side[0]=2;
      						this.snake_direction=4;
      						break;
      					case 5:
      						this.snake_Y[0]=this.snake_X[0];
      						this.snake_X[0]=9.5;
      						this.snake_side[0]=2;
      						this.snake_direction=3;
      						break;	
      				}
      			}
      			break;
      		case 2:
      			if(this.snake_Y[0]>-.5) this.snake_Y[0]-=0.25;
      			else{
      				switch(this.snake_side[0]){
      					case 0:
      						this.snake_Y[0]=9.5;
      						this.snake_side[0]=3;
      						break;
      					case 1:
      						this.snake_X[0]=9.5-this.snake_X[0];
      						this.snake_side[0]=3;
      						this.snake_direction=1;
      						break;
      					case 2:
      						this.snake_Y[0]=9.5;
      						this.snake_side[0]=0;
      						break;
      					case 3:
      						this.snake_X[0]=9.5-this.snake_X[0];
      						this.snake_side[0]=1;
      						this.snake_direction=1;
      						break;
      					case 4:
      						this.snake_Y[0]=this.snake_X[0];
      						this.snake_X[0]=-.5;
      						this.snake_side[0]=3;
      						this.snake_direction=4;
      						break;
      					case 5:
      						this.snake_Y[0]=9.5-this.snake_X[0];
      						this.snake_X[0]=9.5;
      						this.snake_side[0]=3;
      						this.snake_direction=3;
      						break;
      				}
      			}
      			break;
      		case 3:
      			if(this.snake_X[0]>-.5) this.snake_X[0]-=0.25;
      			else {
      				switch(this.snake_side[0]){
      					case 0:
      						this.snake_X[0]=9.5;
      						this.snake_side[0]=4;
      						break;
      					case 1:
      						this.snake_X[0]=9.5;
      						this.snake_side[0]=5;
      						break;
      					case 2:
      						this.snake_X[0]=9.5-this.snake_Y[0];
      						this.snake_Y[0]=9.5;
      						this.snake_side[0]=4;
      						this.snake_direction=2;
      						break;
      					case 3:
      						this.snake_X[0]=this.snake_Y[0];
      						this.snake_Y[0]=-.5;
      						this.snake_side[0]=4;
      						this.snake_direction=1;
      						break;
      					case 4:
      						this.snake_X[0]=9.5;
      						this.snake_side[0]=1;
      						break;
      					case 5:
      						this.snake_X[0]=9.5;
      						this.snake_side[0]=0;
      						break;	
      				}
      			}
      			break;
      		case 4:
      			if(this.snake_X[0]<9.5) this.snake_X[0]+=0.25;
      			else {
      				switch(this.snake_side[0]){
      					case 0:
      						this.snake_X[0]=-.5;
      						this.snake_side[0]=5;
      						break;
      					case 1:
      						this.snake_X[0]=-.5;
      						this.snake_side[0]=4;
      						break;
      					case 2:
      						this.snake_X[0]=this.snake_Y[0];
      						this.snake_Y[0]=9.5;
      						this.snake_side[0]=5;
      						this.snake_direction=2;
      						break;
      					case 3:
      						this.snake_X[0]=9.5-this.snake_Y[0];
      						this.snake_Y[0]=-.5;
      						this.snake_side[0]=5;
      						this.snake_direction=1;
      						break;
      					case 4:
      						this.snake_X[0]=-.5;
      						this.snake_side[0]=0;
      						break;
      					case 5:
      						this.snake_X[0]=-.5;
      						this.snake_side[0]=1;
      						break;	
      				}
      			}
      			break;      			
      	}

		let temp = {x: this.donut_X[this.snake_side[0]], y: this.donut_Y[this.snake_side[0]]};
		let a = this.generate_donut_sphere(temp);
		let b = {x: this.snake_X[0]+.5, y: this.snake_Y[0]+.5, z: .25, r: .25};
      	if (this.check_collision(a, b))	{   
      		 //alert(a.x + " " + a.y + " " + a.z + " " + a.r + " " + b.x + " " + b.y + " " + b.z + " " + b.r);
   		
      		this.snake_X.push(temp_X);
      		this.snake_Y.push(temp_Y);
      		this.snake_side.push(temp_side);
      		this.donut_X[this.snake_side[0]] = Math.random()*9;
			this.donut_Y[this.snake_side[0]] = Math.random()*9;	

			this.play_sound( "eat" );

			this.a_last_time = this.t_now + 2.0;
      	}
      	this.check_rock();
      	this.check_cannibal();

      	if (this.snake_X.length == 0)	{
      		this.snake_X.push(0);
      		this.snake_Y.push(0);
      		this.snake_side.push(0);
      		this.snake_direction = 0;
      		this.play_sound( "dead" );
      	}
      }

	 // initialize the boundary sphere for collision between two points
     initialize_boundary_sphere(a, b){
     	var temp = {x: (a.x + b.x)*.5, y:(a.y + b.y)*.5, z:(a.z + b.z)*.5};
		var rad = Math.sqrt(Vec.of(temp.x - a.x, temp.y - a.y, temp.z - a.z).dot(Vec.of (temp.x - a.x, temp.y - a.y, temp.z - a.z)));
		var s = {x: temp.x, y: temp.y, z: temp.z, r: rad};
		return s;
     }

	 // add point to the sphere if it is outside the sphere
     add_point_to_sphere(s, p)	{
	 	var dist = Vec.of(s.x - p.x, s.y - p.y, s.z - p.z).dot(Vec.of (s.x - p.x, s.y - p.y, s.z - p.z));
		if (dist > s.r*s.r)	{
			var newDist = Math.sqrt(dist);
			var newRad = (s.r + newDist) * .5
			var k = (newRad - s.r)/newDist;
			s.r = newRad;
			s.x += (s.x-p.x)*k;
			s.y += (s.y-p.y)*k;
			s.z += (s.z-p.z)*k;
		}
		return s;
     }

	 // form a ritter sphere for the shapes
     ritter_sphere(points)	{
     	var sph = this.initialize_boundary_sphere(points[0], points[1]);
     	for (let i = 2; i < points.length; i++)	{
     		let tempS = this.add_point_to_sphere(sph, points[i]);
     		sph = tempS;
     	}
     	return sph;
     }

    check_collision(a, b)	{
		var dist = Vec.of(b.x - a.x, b.y - a.y, b.z - a.z).dot(Vec.of (b.x - a.x, b.y - a.y, b.z - a.z));
		var r_sum = a.r + b.r;
		return dist <= r_sum*r_sum;
    }


    set_colors() {
          /*this.colors = 
          [ Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1),
          Color.of( Math.random(), Math.random(), Math.random(),1) ];*/

          this.colors = [Color.of( 0,0,1,1 ), Color.of( 1,1,0,1 ), Color.of( 1,0,0,1 ), 
          Color.of( 0,1,0,1 ), Color.of( 1,0,1,1 ), Color.of( 0,1,1,1 ), Color.of( 1,1,1,1 ), Color.of( 1,0.5,0,1 )
          , Color.of( 0.5,0.5,0.5,1 ), Color.of( 0,0.5,0,1 )];
      }

    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { 
      this.key_triggered_button( "Global view",[ "0"], () => this.attached = () => this.initial_camera_location);
      this.key_triggered_button( "Stick to head",  [ "1" ], () => this.attached = () => this.head_location );
      this.key_triggered_button( "Left",  [ "k" ], () => {
      	if (this.snake_direction != 4)
      		this.snake_direction = 3;
      });
      this.key_triggered_button( "Right",  [ ";" ], () => {
      	if (this.snake_direction != 3)
      		this.snake_direction = 4;
      });
      this.key_triggered_button( "Up",  [ "o" ], () => {
      	if (this.snake_direction != 2)
      		this.snake_direction = 1;
      });
      this.key_triggered_button( "Down",  [ "l" ], () => {
      	if (this.snake_direction != 1)
      		this.snake_direction = 2;
      });
      this.key_triggered_button( "Pause",  [ "p" ], () => {
      	this.snake_direction = 0;
      });
      this.key_triggered_button( "Background Changing",  [ "c" ], () => {
		  this.epilepsy = !this.epilepsy;
      });
      }

    draw_box( graphics_state, model_transform, number, number2, direction, times)
    {
      // this.shapes.cube.draw( graphics_state, model_transform, this.plastic.override({ color: this.colors[0] } )); // draw a box
      if(times==2)
      	this.shapes.cube.draw( graphics_state, model_transform, this.plastic.override({ color: this.groupVector[number][number2] }) );
      else{
      	this.shapes.cube.draw( graphics_state, model_transform, this.plastic.override({ color: Color.of(this.ngroupVector[number][number2] /255.0,0,0,1) }) );
      }
      	
      this.shapes.outline.draw( graphics_state, model_transform, this.black, "LINES");
        let trans1 = Mat4.translation( [0, -2, 0]);
        let trans2 = Mat4.translation( [-2, 0, 0]);
        let trans3 = Mat4.translation( [0, 2, 0]);
        let trans4 = Mat4.translation( [2, 0, 0]);
        let trans5 = Mat4.translation( [0, 0, 2]);
        let trans6 = Mat4.translation( [0, 0, -2]);

        if (direction == 0)
          model_transform = model_transform.times( trans3 );
        else if (direction == 1)
          model_transform = model_transform.times( trans4 );
        else if (direction == 2)
          model_transform = model_transform.times( trans1 );
        else if (direction == 3)
          model_transform = model_transform.times( trans2 );
        else if (direction == 4)
          model_transform = model_transform.times( trans5 );
        else
          model_transform = model_transform.times( trans6 );

        return model_transform;
    } 
     
    
    draw_snake(graphics_state)
    {
    	for (var i = 0; i < this.snake_X.length; i++)	{
    		switch(this.snake_side[i]){
    			case 0:
    				this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0, this.snake_X[i]*2 ], [ 0,.5,0, this.snake_Y[i]*2], [ 0,0,.5,1.5 ], [ 0,0,0,1 ] ), this.materials.color_4 );
    				break;
    			case 1:
    				this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0, (9-this.snake_X[i])*2 ], [ 0,.5,0, this.snake_Y[i]*2], [ 0,0,.5,-19.5 ], [ 0,0,0,1 ] ), this.materials.color_4 );
					break;
				case 2:
					this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0, this.snake_X[i]*2 ], [ 0,.5,0,19.5], [ 0,0,.5,-this.snake_Y[i]*2 ], [ 0,0,0,1 ] ), this.materials.color_4 );
					break;
				case 3:
					this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0, this.snake_X[i]*2 ], [ 0,.5,0,-1.5], [ 0,0,.5,-(9-this.snake_Y[i])*2 ], [ 0,0,0,1 ] ), this.materials.color_4 );
					break;
				case 4:
					this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0,-1.5], [ 0,.5,0, this.snake_Y[i]*2], [ 0,0,.5,-(9-this.snake_X[i])*2 ], [ 0,0,0,1 ] ), this.materials.color_4 );
					break;
				case 5:
					this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0,19.5 ], [ 0,.5,0, this.snake_Y[i]*2], [ 0,0,.5,-this.snake_X[i]*2 ], [ 0,0,0,1 ] ), this.materials.color_4 );
					break;
    		}
			
		}
    }

    draw_rock(graphics_state)
    {
    	for (var i = 0; i < this.rock_X.length; i++)	{
    		switch(this.rock_side[i]){
    			case 0:
    				this.shapes.rock.draw( graphics_state, Mat.of( [ .75,0,0, this.rock_X[i]*2 ], [ 0,1,0, this.rock_Y[i]*2], [ 0,0,1,1 ], [ 0,0,0,1 ] ), this.materials.color_2 );
    				break;
    			case 1:
    				this.shapes.rock.draw( graphics_state, Mat.of( [ .75,0,0, (9-this.rock_X[i])*2 ], [ 0,1,0, this.rock_Y[i]*2], [ 0,0,1,-19 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI,Vec.of(0,1,0))), this.materials.color_2 );
					break;
				case 2:
					this.shapes.rock.draw( graphics_state, Mat.of( [ .75,0,0, this.rock_X[i]*2 ], [ 0,1,0,19], [ 0,0,1,-this.rock_Y[i]*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI/2,Vec.of(1,0,0))), this.materials.color_2 );
					break;
				case 3:
					this.shapes.rock.draw( graphics_state, Mat.of( [ .75,0,0, this.rock_X[i]*2 ], [ 0,1,0,-1], [ 0,0,1,-(9-this.rock_Y[i])*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(Math.PI/2,Vec.of(1,0,0))), this.materials.color_2 );
					break;
				case 4:
					this.shapes.rock.draw( graphics_state, Mat.of( [ 1,0,0, -1 ], [ 0,1,0, this.rock_Y[i]*2], [ 0,0,.75,-(9-this.rock_X[i])*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI/2,Vec.of(0,1,0))), this.materials.color_2 );
					break;
				case 5:
					this.shapes.rock.draw( graphics_state, Mat.of( [ 1,0,0,19 ], [ 0,1,0, this.rock_Y[i]*2], [ 0,0,.75,-this.rock_X[i]*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(Math.PI/2,Vec.of(0,1,0))), this.materials.color_2 );
					break;
    		}
		}
    }

    draw_donut(graphics_state)
    {
    	for (var i = 0; i < 6; i++)	{
    		switch(i){
    			case 0:
    				this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, this.donut_X[0]*2 ], [ 0,1,0, this.donut_Y[0]*2+.25], [ 0,0,1.0,1.25 ], [ 0,0,0,1 ] ), this.materials.color_3 );
    				this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, this.donut_X[0]*2 ], [ 0,1,0, this.donut_Y[0]*2-.25], [ 0,0,1.0,1.25 ], [ 0,0,0,1 ] ), this.materials.color_3 );
    				break;
    			case 1:
    				this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, (9-this.donut_X[1])*2 ], [ 0,1,0, this.donut_Y[1]*2+.25], [ 0,0,1.0,-19.25 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI,Vec.of(0,1,0))), this.materials.color_3 );
    				this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, (9-this.donut_X[1])*2 ], [ 0,1,0, this.donut_Y[1]*2-.25], [ 0,0,1.0,-19.25 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI,Vec.of(0,1,0))), this.materials.color_3 );					
					break;
				case 2:
					this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, this.donut_X[2]*2 ], [ 0,1.0,0,19.25], [ 0,0,1,-this.donut_Y[i]*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI/2,Vec.of(1,0,0))), this.materials.color_3 );
					break;
				case 3:
					this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, this.donut_X[3]*2 ], [ 0,1.0,0,-1.25], [ 0,0,1,-(9-this.donut_Y[3])*2+.25 ], [ 0,0,0,1 ] ).times(Mat4.rotation(Math.PI/2,Vec.of(1,0,0))), this.materials.color_3 );
					this.shapes.torus.draw( graphics_state, Mat.of( [ .5,0,0, this.donut_X[3]*2 ], [ 0,1.0,0,-1.25], [ 0,0,1,-(9-this.donut_Y[3])*2-.25 ], [ 0,0,0,1 ] ).times(Mat4.rotation(Math.PI/2,Vec.of(1,0,0))), this.materials.color_3 );
					break;
				case 4:
					this.shapes.torus.draw( graphics_state, Mat.of( [ 1.0,0,0, -1.25 ], [ 0,1,0, this.donut_Y[4]*2+.25], [ 0,0,.5,-(9-this.donut_X[4])*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI/2,Vec.of(0,1,0))), this.materials.color_3 );
					this.shapes.torus.draw( graphics_state, Mat.of( [ 1.0,0,0, -1.25 ], [ 0,1,0, this.donut_Y[4]*2-.25], [ 0,0,.5,-(9-this.donut_X[4])*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(-Math.PI/2,Vec.of(0,1,0))), this.materials.color_3 );					
					break;
				case 5:
					this.shapes.torus.draw( graphics_state, Mat.of( [ 1.0,0,0,19.25 ], [ 0,1,0, this.donut_Y[5]*2+.25], [ 0,0,.5,-this.donut_X[5]*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(Math.PI/2,Vec.of(0,1,0))), this.materials.color_3 );
					this.shapes.torus.draw( graphics_state, Mat.of( [ 1.0,0,0,19.25 ], [ 0,1,0, this.donut_Y[5]*2-.25], [ 0,0,.5,-this.donut_X[5]*2 ], [ 0,0,0,1 ] ).times(Mat4.rotation(Math.PI/2,Vec.of(0,1,0))), this.materials.color_3 );					
					break;
    		}
		}
    }
	
	draw_box_first_time(graphics_state)
	{
		//let model_transform = Mat4.identity().times(Mat4.translation( [-10, 0, 0] ));
        //let model_transform = Mat4.identity().times(Mat4.translation( [-10, -10, 0] ));
        let model_transform = Mat4.identity();
        let reset = Mat4.translation( [2, -20, 0] );
        let reset2 = Mat4.translation( [-20, 0, -2] );
        let reset3 = Mat4.translation( [2, 2, 0] );
        let reset_3 = Mat4.translation( [-2, -2, 0] );
        let reset4 = Mat4.translation( [2, 0, -2] );
        let reset_4 = Mat4.translation( [-2, 0, 2] );
        let reset5 = Mat4.translation( [0, 2, -2] );
        let reset_5 = Mat4.translation( [0, -2, 2] );
        
        //the first time
		for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,1);

            model_transform = model_transform.times(reset3);
          }
          model_transform = model_transform.times(reset_3);

          
          model_transform = model_transform.times( Mat4.translation( [-8, 10, 0] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,1);

            model_transform = model_transform.times(reset4);
          }
          model_transform = model_transform.times(reset_4);

          
          model_transform = model_transform.times( Mat4.translation( [-8, -18, -10] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,1);
            model_transform = model_transform.times(reset3);
          }
          model_transform = model_transform.times(reset_3);


          model_transform = model_transform.times( Mat4.translation( [-8, -8, 18] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,1);
            model_transform = model_transform.times(reset4);
          }
          model_transform = model_transform.times(reset_4);


          model_transform = model_transform.times( Mat4.translation( [-8, 0, 8] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,1);
            model_transform = model_transform.times(reset5);
          }
          model_transform = model_transform.times(reset_5);
          
        
          model_transform = model_transform.times( Mat4.translation( [18, -8, 8] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,1);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,1);
            model_transform = model_transform.times(reset5);
          }
          model_transform = model_transform.times(reset_5);
		//end of the first time
	}
	
	draw_box_second_time(graphics_state)
	{
		 let model_transform = Mat4.identity();
        let reset = Mat4.translation( [2, -20, 0] );
        let reset2 = Mat4.translation( [-20, 0, -2] );
        let reset3 = Mat4.translation( [2, 2, 0] );
        let reset_3 = Mat4.translation( [-2, -2, 0] );
        let reset4 = Mat4.translation( [2, 0, -2] );
        let reset_4 = Mat4.translation( [-2, 0, 2] );
        let reset5 = Mat4.translation( [0, 2, -2] );
        let reset_5 = Mat4.translation( [0, -2, 2] );
        
        for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,2);

            model_transform = model_transform.times(reset3);
          }
          model_transform = model_transform.times(reset_3);

          
          model_transform = model_transform.times( Mat4.translation( [-8, 10, 0] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,2);

            model_transform = model_transform.times(reset4);
          }
          model_transform = model_transform.times(reset_4);

          
          model_transform = model_transform.times( Mat4.translation( [-8, -18, -10] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,2);
            model_transform = model_transform.times(reset3);
          }
          model_transform = model_transform.times(reset_3);


          model_transform = model_transform.times( Mat4.translation( [-8, -8, 18] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 1 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 3 ,2);
            model_transform = model_transform.times(reset4);
          }
          model_transform = model_transform.times(reset_4);


          model_transform = model_transform.times( Mat4.translation( [-8, 0, 8] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,2);
            model_transform = model_transform.times(reset5);
          }
          model_transform = model_transform.times(reset_5);
          
        
          model_transform = model_transform.times( Mat4.translation( [18, -8, 8] ) );
          for (let j = 9; j > 0; j = j-2)
          {
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 0 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 5 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 2 ,2);
            for (let i = 0; i < j; i++)
              model_transform = this.draw_box(graphics_state, model_transform, 2, j-1, 4 ,2);
            model_transform = model_transform.times(reset5);
          }
          model_transform = model_transform.times(reset_5);
	}


    display( graphics_state )
      { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;
		this.t_now=t;
		//this.shapes.cube.draw( graphics_state, Mat.of( [ 5,0,0,0 ], [ 0,5,0,0 ], [ 0,0,5,0 ], [ 0,0,0,1 ] ), this.materials.phong );
        //this.shapes.sphere.draw( graphics_state, Mat.of( [ .5,0,0,0 ], [ 0,.5,0,10 ], [ 0,0,.5,0 ], [ 0,0,0,1 ] ), this.materials.color_4 );

        //let model_transform = Mat4.identity();
        //this.draw_box(graphics_state, model_transform);
		

        if( typeof(this.attached) != "undefined" )
        { 
        	let dc;
          switch(this.snake_side[0]){
          	case 0:
          		dc= Mat4.inverse( this.attached().times( Mat4.rotation( Math.PI/3, Vec.of(1,0,0) ).times( Mat4.translation([ 0,-25,10 ]) ) ));
          		//dc= Mat4.inverse( this.attached().times( Mat4.rotation( Math.PI/4, Vec.of(1,0,0) ).times( Mat4.translation([ 0,-20,0 ]) ) ));
          		break;
          	case 1:
          		dc= Mat4.inverse( this.attached().times( Mat4.rotation( 2 * Math.PI/3 ,Vec.of(1,0,0) ).times(Mat4.rotation( Math.PI ,Vec.of(0,0,1) )).times( Mat4.translation([ -4, -25, 10 ]) ) ));
          		break;
          	case 2:
          		dc= Mat4.inverse( this.attached().times(Mat4.rotation( -Math.PI/6, Vec.of(1,0,0)) ).times( Mat4.translation([ 0, -25, 10 ]) ) );
          		break;
          	case 3:
          		dc= Mat4.inverse( this.attached().times(Mat4.rotation( 5 * Math.PI/6,Vec.of(1,0,0)) ).times( Mat4.translation([ 0, -25, 10 ]) ) );
          		break;
          	case 4:
          		dc= Mat4.inverse( this.attached().times( Mat4.rotation( -Math.PI/2, Vec.of(0,1,0) ).times(Mat4.rotation( Math.PI/3,Vec.of(1,0,0) )).times( Mat4.translation([ 0,-25,10 ]) ) ));
          		break;
          	case 5:
          		dc= Mat4.inverse( this.attached().times( Mat4.rotation( Math.PI/2, Vec.of(0,1,0) ).times(Mat4.rotation( Math.PI/3,Vec.of(1,0,0) )).times( Mat4.translation([ 0,-25,10 ]) ) ));
          		break;
          }
          const desired_camera=dc;
          graphics_state.camera_transform = desired_camera.map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 4*dt ) );
        }

        this.draw_box_second_time(graphics_state);
       

		switch(this.snake_side[0]){
			case 0:
				this.head_location = Mat.of( [ 1,0,0, this.snake_X[0]*2 ], [ 0,1,0, this.snake_Y[0]*2], [ 0,0,1,30 ], [ 0,0,0,1 ] );
				break;
			case 1:
				this.head_location= Mat.of( [ 1,0,0, (7-this.snake_X[0])*2 ], [ 0,1,0, this.snake_Y[0]*2], [ 0,0,1,-50 ], [ 0,0,0,1 ] );
				break;
			case 2:
				this.head_location=Mat.of( [ 1,0,0, this.snake_X[0]*2 ], [ 0,1,0,50], [ 0,0,1,-this.snake_Y[0]*2 ], [ 0,0,0,1 ] );
				break;
			case 3:
				this.head_location=Mat.of( [ 1,0,0, this.snake_X[0]*2 ], [ 0,1,0,-30], [ 0,0,1,-(9-this.snake_Y[0])*2 ], [ 0,0,0,1 ] );
				break;
			case 4:
				this.head_location = Mat.of( [ 1,0,0, -30 ], [ 0,1,0, this.snake_Y[0]*2], [ 0,0,1,-(9-this.snake_X[0])*2 ], [ 0,0,0,1 ] );
				break;
			case 5:
				this.head_location = Mat.of( [ 1,0,0,50 ], [ 0,1,0, this.snake_Y[0]*2], [ 0,0,1,-this.snake_X[0]*2 ], [ 0,0,0,1 ] );
				break;
		}

		if (this.t_now-this.t_pre > 1/this.speed)
			this.move_snake();
		this.update_speed(dt);

		this.draw_snake(graphics_state);

		this.draw_rock(graphics_state);
        
		this.draw_donut(graphics_state);
		
		if (this.epilepsy)	{
			this.backgroundcolor = Color.of(Math.random(),Math.random(),Math.random(),1);
			this.gl.clearColor.apply(this.gl, this.backgroundcolor);
		}

      }
  }

window.Ring_Shader = window.classes.Ring_Shader =
class Ring_Shader extends Shader              // Subclasses of Shader each store and manage a complete GPU program.
{ material() { return { shader: this } }      // Materials here are minimal, without any settings.
  map_attribute_name_to_buffer_name( name )       // The shader will pull single entries out of the vertex arrays, by their data fields'
    {                                             // names.  Map those names onto the arrays we'll pull them from.  This determines
                                                  // which kinds of Shapes this Shader is compatible with.  Thanks to this function, 
                                                  // Vertex buffers in the GPU can get their pointers matched up with pointers to 
                                                  // attribute names in the GPU.  Shapes and Shaders can still be compatible even
                                                  // if some vertex data feilds are unused. 
      return { object_space_pos: "positions" }[ name ];      // Use a simple lookup table.
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
      { const proj_camera = g_state.projection_transform.times( g_state.camera_transform );
                                                                                        // Send our matrices to the shader programs:
        gl.uniformMatrix4fv( gpu.model_transform_loc,             false, Mat.flatten_2D_to_1D( model_transform.transposed() ) );
        gl.uniformMatrix4fv( gpu.projection_camera_transform_loc, false, Mat.flatten_2D_to_1D(     proj_camera.transposed() ) );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec4 position;
              varying vec4 center;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 object_space_pos;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_transform;

        void main()
        { center = model_transform * vec4( 0,0,0,1 );
          position = model_transform * vec4(object_space_pos, 1.0);
          gl_Position = projection_camera_transform * position;            // The vertex's final resting place (in NDCS).
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        void main()
        { float dist = sin( 25.0 * distance( position, center ) );
          gl_FragColor = .9 * dist * vec4( 1,.6,.5,1 );
        }`;
    }
}

class Shape_From_File extends Shape          // A versatile standalone Shape that imports all its arrays' data from an .obj 3D model file.
{ constructor( filename )
    { super( "positions", "normals", "texture_coords" );
      this.load_file( filename );      // Begin downloading the mesh. Once that completes, return control to our parse_into_mesh function.
    }
  load_file( filename )
      { return fetch( filename )       // Request the external file and wait for it to load.
          .then( response =>
            { if ( response.ok )  return Promise.resolve( response.text() )
              else                return Promise.reject ( response.status )
            })
          .then( obj_file_contents => this.parse_into_mesh( obj_file_contents ) )
          .catch( error => { this.copy_onto_graphics_card( this.gl ); } )                     // Failure mode:  Loads an empty shape.
      }
  parse_into_mesh( data )                                           // Adapted from the "webgl-obj-loader.js" library found online:
    { var verts = [], vertNormals = [], textures = [], unpacked = {};   

      unpacked.verts = [];        unpacked.norms = [];    unpacked.textures = [];
      unpacked.hashindices = {};  unpacked.indices = [];  unpacked.index = 0;

      var lines = data.split('\n');

      var VERTEX_RE = /^v\s/;    var NORMAL_RE = /^vn\s/;    var TEXTURE_RE = /^vt\s/;
      var FACE_RE = /^f\s/;      var WHITESPACE_RE = /\s+/;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var elements = line.split(WHITESPACE_RE);
        elements.shift();

        if      (VERTEX_RE.test(line))   verts.push.apply(verts, elements);
        else if (NORMAL_RE.test(line))   vertNormals.push.apply(vertNormals, elements);
        else if (TEXTURE_RE.test(line))  textures.push.apply(textures, elements);
        else if (FACE_RE.test(line)) {
          var quad = false;
          for (var j = 0, eleLen = elements.length; j < eleLen; j++)
          {
              if(j === 3 && !quad) {  j = 2;  quad = true;  }
              if(elements[j] in unpacked.hashindices) 
                  unpacked.indices.push(unpacked.hashindices[elements[j]]);
              else
              {
                  var vertex = elements[ j ].split( '/' );

                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);   unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);   
                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);
                  
                  if (textures.length) 
                    {   unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 0]);
                        unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 1]);  }
                  
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 0]);
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 1]);
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 2]);
                  
                  unpacked.hashindices[elements[j]] = unpacked.index;
                  unpacked.indices.push(unpacked.index);
                  unpacked.index += 1;
              }
              if(j === 3 && quad)   unpacked.indices.push( unpacked.hashindices[elements[0]]);
          }
        }
      }
      for( var j = 0; j < unpacked.verts.length/3; j++ )
      {
        this.positions     .push( Vec.of( unpacked.verts[ 3*j ], unpacked.verts[ 3*j + 1 ], unpacked.verts[ 3*j + 2 ] ) );        
        this.normals       .push( Vec.of( unpacked.norms[ 3*j ], unpacked.norms[ 3*j + 1 ], unpacked.norms[ 3*j + 2 ] ) );
        this.texture_coords.push( Vec.of( unpacked.textures[ 2*j ], unpacked.textures[ 2*j + 1 ]  ));
      }
      this.indices = unpacked.indices;

      this.normalize_positions( false );
      this.copy_onto_graphics_card( this.gl );
      this.ready = true;
    }
  draw( graphics_state, model_transform, material )       // Cancel all attempts to draw the shape before it loads.
    { if( this.ready ) super.draw( graphics_state, model_transform, material );   }
}

window.Bump_Shader = window.classes.Bump_Shader =
class Bump_Shader extends Shader          
{ material( color, properties )     // Define an internal class "Material" that stores the standard settings found in Phong lighting.
  { return new class Material       // Possible properties: ambient, diffusivity, specularity, smoothness, gouraud, texture.
      { constructor( shader, color = Color.of( 0,0,0,1 ), ambient = 0, diffusivity = 1, specularity = 1, smoothness = 40 )
          { Object.assign( this, { shader, color, ambient, diffusivity, specularity, smoothness } );  // Assign defaults.
            Object.assign( this, properties );                                                        // Optionally override defaults.
          }
        override( properties )                      // Easily make temporary overridden versions of a base material, such as
          { const copied = new this.constructor();  // of a different color or diffusivity.  Use "opacity" to override only that.
            Object.assign( copied, this );
            Object.assign( copied, properties );
            copied.color = copied.color.copy();
            if( properties[ "opacity" ] != undefined ) copied.color[3] = properties[ "opacity" ];
            return copied;
          }
      }( this, color );
  }
  map_attribute_name_to_buffer_name( name )                  // We'll pull single entries out per vertex by field name.  Map
    {                                                        // those names onto the vertex array names we'll pull them from.
      return { object_space_pos: "positions", normal: "normals", tex_coord: "texture_coords", tgts: "tangents"}[ name ]; }   // Use a simple lookup table.
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
        const int N_LIGHTS = 2;             // We're limited to only so many inputs in hardware.  Lights are costly (lots of sub-values).
        uniform float ambient, diffusivity, specularity, smoothness, animation_time, attenuation_factor[N_LIGHTS];
        uniform bool GOURAUD, COLOR_NORMALS, USE_TEXTURE;               // Flags for alternate shading methods
        uniform vec4 lightPosition[N_LIGHTS], lightColor[N_LIGHTS], shapeColor;
        varying vec3 N, E;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
        varying vec2 f_tex_coord;             // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
        varying vec4 VERTEX_COLOR;            // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 L[N_LIGHTS], H[N_LIGHTS];
        varying float dist[N_LIGHTS];
        varying mat3 tbn;
        
        vec3 phong_model_lights( vec3 N )
          { vec3 result = vec3(0.0);
            for(int i = 0; i < N_LIGHTS; i++)
              {
                float attenuation_multiplier = 1.0 / (1.0 + attenuation_factor[i] * (dist[i] * dist[i]));
                float diffuse  =      max( dot(N, L[i]), 0.0 );
                float specular = pow( max( dot(N, H[i]), 0.0 ), smoothness );
                result += attenuation_multiplier * ( shapeColor.xyz * diffusivity * diffuse + lightColor[i].xyz * specularity * specular );
              }
            return result;
          }
        `;
    }

 vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 object_space_pos, normal, tgts; // code courtesy of the book
        attribute vec2 tex_coord;
        uniform mat4 camera_transform, camera_model_transform, projection_camera_model_transform;
        uniform mat3 inverse_transpose_modelview;
        uniform sampler2D texture;
        uniform sampler2D texture2;
        void main()
        { gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);     // The vertex's final resting place (in NDCS).
          N = normalize( inverse_transpose_modelview * normal );                             // The final normal vector in screen space.
          f_tex_coord = tex_coord;                                         // Directly use original texture coords and interpolate between.
          
          vec3 eyePosition = (camera_model_transform * gl_Position).xyz;
          vec3 eyeLightPos = (camera_model_transform * lightPosition[0]).xyz;
          vec3 T = normalize(inverse_transpose_modelview * normalize(tgts));
          vec3 B = cross(N, T);
          L[0].x = dot(T, eyeLightPos - eyePosition);
          L[0].y = dot(B, eyeLightPos - eyePosition);
          L[0].z = dot(N, eyeLightPos - eyePosition);
          L[0] = normalize(L[0]);
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    { return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          
          vec4 tex_color = texture2D( texture, f_tex_coord );                    // Use texturing as well.
          vec3 bumped_N  = normalize( normalize(N) + tex_color.rgb - .5*vec3(1,1,1) );      // Slightly disturb normals based on sampling
                                                                                 // the same image that was used for texturing.
                                                                                 
                                                                                 // Compute an initial (ambient) color:
          gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          //gl_FragColor = vec4( 0.,0.,0.,1. ); 
          gl_FragColor.xyz += phong_model_lights( bumped_N );                    // Compute the final color with contributions from lights.
        }`;
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
    {                              // First, send the matrices to the GPU, additionally cache-ing some products of them we know we'll need:
      this.update_matrices( g_state, model_transform, gpu, gl );
      gl.uniform1f ( gpu.animation_time_loc, g_state.animation_time / 1000 );

      if( g_state.gouraud === undefined ) { g_state.gouraud = g_state.color_normals = false; }    // Keep the flags seen by the shader 
      gl.uniform1i( gpu.GOURAUD_loc,        g_state.gouraud || material.gouraud );                // program up-to-date and make sure 
      gl.uniform1i( gpu.COLOR_NORMALS_loc,  g_state.color_normals );                              // they are declared.

      gl.uniform4fv( gpu.shapeColor_loc,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient_loc,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity_loc,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity_loc,    material.specularity );
      gl.uniform1f ( gpu.smoothness_loc,     material.smoothness  );

      if( material.texture )                           // NOTE: To signal not to draw a texture, omit the texture parameter from Materials.
      { gpu.shader_attributes["tex_coord"].enabled = true;
        gl.uniform1f ( gpu.USE_TEXTURE_loc, 1 );
        gl.bindTexture( gl.TEXTURE_2D, material.texture.id );
        if( material.texture2) 
        {
            gl.activeTexture(gl.TEXTURE1);
            gl.uniform1i( gpu.texture2_loc, 1);
            gl.bindTexture( gl.TEXTURE_2D, material.texture2.id );
            gl.activeTexture(gl.TEXTURE0);
        }
      }
      else  { gl.uniform1f ( gpu.USE_TEXTURE_loc, 0 );   gpu.shader_attributes["tex_coord"].enabled = false; }

      if( !g_state.lights.length )  return;
      var lightPositions_flattened = [], lightColors_flattened = [], lightAttenuations_flattened = [];
      for( var i = 0; i < 4 * g_state.lights.length; i++ )
        { lightPositions_flattened                  .push( g_state.lights[ Math.floor(i/4) ].position[i%4] );
          lightColors_flattened                     .push( g_state.lights[ Math.floor(i/4) ].color[i%4] );
          lightAttenuations_flattened[ Math.floor(i/4) ] = g_state.lights[ Math.floor(i/4) ].attenuation;
        }
      gl.uniform4fv( gpu.lightPosition_loc,       lightPositions_flattened );
      gl.uniform4fv( gpu.lightColor_loc,          lightColors_flattened );
      gl.uniform1fv( gpu.attenuation_factor_loc,  lightAttenuations_flattened );
    }
  update_matrices( g_state, model_transform, gpu, gl )                                    // Helper function for sending matrices to GPU.
    {                                                   // (PCM will mean Projection * Camera * Model)
      let [ P, C, M ]    = [ g_state.projection_transform, g_state.camera_transform, model_transform ],
            CM     =      C.times(  M ),
            PCM    =      P.times( CM ),
            inv_CM = Mat4.inverse( CM ).sub_block([0,0], [3,3]);
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.                                  
      gl.uniformMatrix4fv( gpu.camera_transform_loc,                  false, Mat.flatten_2D_to_1D(     C .transposed() ) );
      gl.uniformMatrix4fv( gpu.camera_model_transform_loc,            false, Mat.flatten_2D_to_1D(     CM.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(    PCM.transposed() ) );
      gl.uniformMatrix3fv( gpu.inverse_transpose_modelview_loc,       false, Mat.flatten_2D_to_1D( inv_CM              ) );       
    }
}