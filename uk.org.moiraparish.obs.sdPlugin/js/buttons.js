const keyInactive = 0
const keyPreview = 1
const keySourcePreview = 3
const keySourceLive = 4
const keyLiveOutput = 5

let lower_bar = ""
let main_box = ""
let circle_col = ""
class Button {
	constructor(type, data) {
		this.context = data.context
		this.coordinates = data.coordinates
		this.type = type
		this.state = keyInactive
		this.processStreamDeckData(data)
	}

	processStreamDeckData(data) {
		console.log("Incoming data", data)
		if (this.type != '') {
			console.log("Processing Streamdeck Payload ......", data.payload.state, data, OBS)
			if (data.payload.coordinates) this.coordinates = data.payload.coordinates
			if (data.payload.settings.pi_payload) this.pi_payload = data.payload.settings.pi_payload
			console.log ("Payload Processing ........:", this)
			switch (this.state) {
				case keyInactive:
					this.setOffline()
					break;
				default:
					this.setOnline()
					break;
			}
			this._updateTitle()
		}
	}

	keyDown() {
		console.log("Working on Key Down", this)
		switch (this.type) {
			case 'scene':
				console.log("Key down here Scene:", this.pi_payload.currentScene, "coords", this.coordinates.column, this.coordinates.row, "source", this.pi_payload.currentSource, "state", this.state, this)
				switch (this.state) {
					case keyInactive:
						this._Preview()
						break
					case keyPreview:
						this._LiveOutput()
						break
					case keySourcePreview: 
						this._Preview()
						break
					case keySourceLive:
						// Check for overlay - otherwise
						if (false) {
							//
						} else {
							StreamDeck.sendAlert(this.context)
						}
						break
					case keyLiveOutput:
						if (false) {
							this._LiveOutput()
						} else {
							StreamDeck.sendAlert(this.context)
						}
						break
				}
				break
			case 'slide':
				console.log("Key down here Slide:", this.pi_payload.currentScene, "coords", this.coordinates.column, this.coordinates.row,  "state", this.state, this)
				switch (this.state) {
					case keyInactive:
						this._PreviewSlide()
						break
					case keyPreview:
						this._LiveOutput()
						break
					case keySourcePreview: 
						/*
						   Setup preview on this if we are matching the grouping scene ?
						*/
						StreamDeck.sendAlert(this.context)
						break
					case keySourceLive:
						/*
						   Transition to this if we are matching the grouping scene ?
						*/
						StreamDeck.sendAlert(this.context)
						break
					case keyLiveOutput:
						/*
						   Straight alert - we don't need to do anymore here.
						*/
						StreamDeck.sendAlert(this.context)
						break
				}
				break
		}
	}

	_Preview() {
		// TODO - Removed check on included scene
		StreamDeck.sendOk(this.context)
		if (this.pi_payload.currentScene != OBS.preview) {
			console.log("Setting Scene to: ", this.pi_payload.currentScene)
			obs.send('SetPreviewScene', {
				'scene-name': this.pi_payload.currentScene
			})
		} else {
			console.log("Scene already set no changing")
		}
		this._setState(keyPreview)
	}

	_PreviewSlide() {
		/*
		1. What is scene in live screen
			Does it match our grouping scene?
			1. Yes - setup Preview scenario with that.
			2. No - Check Preview - does it match - then setup scenario
		2. Alert
		*/


		console.log("Checking scene grouping against grouping:", this.pi_payload.currentSceneGrouping, "OBS Object", OBS)

		let base_scene = ""
		let base_cam = ""
		let slide_scene = ""

		if (OBS.program_sources.includes(this.pi_payload.currentSceneGrouping)) {
			console.log("We have a program match", OBS)
			base_scene = OBS.program
			base_cam = OBS.program_cam
		} else if (OBS.preview_sources.includes(this.pi_payload.currentSceneGrouping)) {
			console.log("We have a preview match", OBS)
			base_scene = OBS.preview
			base_cam = OBS.preview_cam
		} else {
			console.log("We have a NO MATCH")
			StreamDeck.sendAlert(this.context)
			return
		}

		// Quick and nasty - check each of the scenes for a camera match.
		if (base_cam == this.pi_payload.currentSceneCam1_cam) {
			slide_scene = this.pi_payload.currentSceneCam1
		} else if (base_cam == this.pi_payload.currentSceneCam2_cam) {
			slide_scene = this.pi_payload.currentSceneCam2
		} else if (base_cam == this.pi_payload.currentSceneCam3_cam) {
			slide_scene = this.pi_payload.currentSceneCam3
		}
		console.log("Scene:", base_scene, " Camera:", base_cam, " Slide Scene is:", slide_scene)

		if (slide_scene == '') {
			console.log("No slide scene match")
			StreamDeck.sendAlert(this.context)
			return
		}

		StreamDeck.sendOk(this.context)

		if (slide_scene != OBS.preview) {

			console.log("Setting Scene to: ", slide_scene)
			obs.send('SetPreviewScene', {
				'scene-name': slide_scene
			})
		} else {
			console.log("Scene already set no changing")
		}
		this.pi_payload.currentScene = slide_scene
		this._setState(keyPreview)
	}

	_LiveOutput() {
		StreamDeck.sendOk(this.context)
		
		if (false) {
			// Overlay test maybe ??
		} else {
			console.log("Starting Scene transition to program")
			obs.send('TransitionToProgram')
		}
		console.log("Checking button state", this)
		this._setState(keySourceLive)
	}

	_LiveOutputSlide() {
	}

	_updateTitle() {
		// StreamDeck.setTitle(this.context, this[this.type], StreamDeck.BOTH)
	}

	setPreview() {
		// Add detection here for primed/no primed
		if (this.type != '' ) {
			console.log("setPreview", this)
			this._setState(keyPreview)
			this.setOnline()
		}
	}

	setProgram() {
		if (this.type != '' ) {
			console.log("setProgram", this)
			this._setState(keyLiveOutput)
			this.setOnline()
		}
	}

	setSourcePreview() {
		if (this.type == 'scene') {
			console.log("setSourcePreview", this)
			this._setState(keySourcePreview)
			this.state = keySourcePreview
			this.setOnline()
		}
	}

	setSourceProgram() {
		if (this.type == 'scene') {
			console.log("setSourceProgram", this)
			this._setState(keySourceLive)
			this.setOnline()
		}
	}

	setOffAir() {
		if (this.type != '') {
			console.log("Setting OFF AIR", this)
			this._setState(keyInactive)
			this.setOffline()
		}
	}
	
	_setState(newstate) {
		console.log("Setting state to ", newstate)
		StreamDeck.setState(this.context, newstate)
		this.state = newstate
	}

	setOnline() {
		console.log("setOnline Scene:", this.pi_payload.currentScene, "coords", this.coordinates.column, this.coordinates.row, "type", this.type, "source", this.pi_payload.currentSource, "state", this.state, this)

		switch (this.type) {
			case 'scene':
				var canvas = document.getElementById('canvas')
				var ctx = canvas.getContext('2d')

				ctx.clearRect(0, 0, max_rect_width, max_rect_width);
				if (this.pi_payload.currentButtonImageContents) {
					this._loadButtonImage(ctx, this.pi_payload.currentButtonImageContents).then((values) => {
						this._ActiveButtonBoxes(ctx, canvas)
					})
				} else {
					this._ActiveButtonBoxes(ctx, canvas)
				}
				break

			case 'slide':
				var canvas = document.getElementById('canvas')
				var ctx = canvas.getContext('2d')

				ctx.clearRect(0, 0, max_rect_width, max_rect_width);
				if (this.pi_payload.currentButtonImageContents) {
					this._loadButtonImage(ctx, this.pi_payload.currentButtonImageContents).then((values) => {
						this._ActiveButtonBoxes(ctx, canvas)
					})
				} else {
					this._ActiveButtonBoxes(ctx, canvas)
				}
				break
	
			default:
				console.log("Setting blackimage for main", this)
				this.setOffline()
				break
		}
	}


	_ActiveButtonBoxes(ctx, canvas) {
		main_box = ""
		lower_bar = ""
		circle_col = ""
		switch (this.state) {
			case keyInactive:
				break
			case keyPreview:
				main_box = green
				circle_col = green
				break
			case keySourcePreview:
				lower_bar = green
				break
			case keySourceLive:
				lower_bar = red
				break
			case keyLiveOutput:
				main_box = red
				circle_col = red
				break
		}
		console.log("***** SetOnline Scene:", this.pi_payload.currentScene, 
					"coords", this.coordinates.column, this.coordinates.row, 
					"source", this.pi_payload.currentSource, 
					"state", this.state, 
					"image", this.pi_payload.currentButtonImage,
					"main:", main_box, 
					"lower", lower_bar, 
					"Circle:", circle_col)

		ctx.beginPath()
		if (circle_col != "") {
			ctx.beginPath();
			ctx.fillStyle = circle_col;
			//ctx.strokeStyle = circle_col
			ctx.beginPath();
			ctx.arc(primed_x, primed_y, primed_radius, 0, 2 * Math.PI);
			ctx.fill();
		}
		if (main_box != "") {
			ctx.beginPath();
			ctx.strokeStyle = main_box
			ctx.lineWidth = rectangle_line_width;
			ctx.rect(rectangle_x, rectangle_y, rectangle_width, rectangle_height)
			ctx.stroke()
		}
		if (lower_bar != "") {
			ctx.beginPath();
			ctx.strokeStyle = lower_bar
			ctx.lineWidth = rectangle_line_width*2;
			ctx.moveTo(0, src_rectangle_y)
			ctx.lineTo(rectangle_width+rectangle_line_width, src_rectangle_y)
			ctx.stroke()
		}
		// console.log("Canvas output", canvas.toDataURL())
		StreamDeck.setImage(this.context, canvas.toDataURL(), StreamDeck.BOTH)
	}

	setOffline() {
		console.log("Setting Off Line Scene:", this.pi_payload.currentScene, "coords", this.coordinates.column, this.coordinates.row, "source", this.pi_payload.currentSource, "state", this.state, this)
		var canvas = document.getElementById('canvas')
		var ctx = canvas.getContext('2d')
		ctx.clearRect(0, 0, max_rect_width, max_rect_width);
		if (this.pi_payload.currentButtonImageContents) {
			this._loadButtonImage(ctx, this.pi_payload.currentButtonImageContents).then((values) => {
				// console.log("Canvas output", canvas.toDataURL())
				StreamDeck.setImage(this.context, canvas.toDataURL(), StreamDeck.BOTH)
			})
		} else {
			StreamDeck.setImage(this.context, canvas.toDataURL(), StreamDeck.BOTH)
		}
	
	}

	_loadButtonImage(ctx, imagecontents) {

		return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
			console.log("Loading Button image and drawing it.")
			var btnimg = new Image();
			btnimg.onload = function() {
				ctx.drawImage(btnimg,0,0)
				resolve("Image Loaded")
			}
			btnimg.src = imagecontents
		});
	}
}
