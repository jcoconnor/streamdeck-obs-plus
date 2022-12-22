const keyInactive = 0
const keyPreview = 1
const keySourcePreview = 3
const keySourceLive = 4
const keyLiveOutput = 5
const keySlidePreview = 6   
const keyNewSlideBaseScene = 7


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
			console.log("Payload Processing ........:", this)
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
			case type_scene:
				console.log("Key down here Scene:", this.pi_payload.currentScene, "OBS", OBS, "coords", this.coordinates.column, this.coordinates.row, "source", this.pi_payload.currentSource, "state", this.state, this)
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
						if (OBS.program.current.type == type_slide && OBS.program.slideBaseScene == this.pi_payload.currentScene) {
							this._LiveOutputSlide()
						} else {
							StreamDeck.sendAlert(this.context)
						}
						break
					case keyLiveOutput:
						if (OBS.program.current.type == type_slide && OBS.program.slideBaseScene == this.pi_payload.currentScene) {
							this._LiveOutputSlide()
						} else {
							StreamDeck.sendAlert(this.context)
						}
						break
				}
				break
			case type_slide:
				console.log("Key down here Slide:", this.pi_payload.currentScene, "OBS", OBS, "coords", this.coordinates.column, this.coordinates.row, "state", this.state, this)
				switch (this.state) {
					case keyInactive:
						this._PreviewSlide()
						break
					case keySlidePreview:
					case keySourcePreview:    // Allows slide to be switched over to source preview.
							this._LiveOutputSlide()
						break

					// Remainder of these should just trigger an alarm.
					case keyPreview:
					case keySourceLive:
					case keyLiveOutput:
						StreamDeck.sendAlert(this.context)
						break
				}
				break
		}
	}

	_Preview() {
		StreamDeck.sendOk(this.context)
		this.setPreviewScene()
		this._setState(keyPreview)
	}


	setPreviewScene() {
		// TODO - Redundant function.
		if (this.pi_payload.currentScene != OBS.preview.sceneName) {
			console.log("Setting Scene to: ", this.pi_payload.currentScene)
			OBS.preview.next.button = this.context
			OBS.preview.next.type = this.type
			obs.send('SetPreviewScene', {
				'scene-name': this.pi_payload.currentScene
			})
		} else {
			console.log("Scene already set no changing")
		}
	}



	_PreviewSlide() {
		/*
		1. What is scene in live screen
			Does it match our grouping scene?
			1. Yes - setup Preview scenario with that.
			2. No - Check Preview - does it match - then setup scenario
		2. Alert
		   Further checks here to handle 
		*/

		if (OBS.program.slideBaseScene != "") {
			console.log("_PreviewSlide - Active Slide sequence in progress")
			StreamDeck.sendAlert(this.context)
			return
		}

		console.log("_PreviewSlide: Checking scene grouping against grouping:", this.pi_payload.currentSceneGrouping, "OBS Object", OBS)

		let slideBaseScene = ''
		let baseCamera = ''
		let slideScene = ''

		if (OBS.program.sources.includes(this.pi_payload.currentSceneGrouping)) {
			console.log("We have a program match", OBS)
			slideBaseScene = OBS.program.sceneName
			baseCamera = OBS.program.camera
		} else if (OBS.preview.sources.includes(this.pi_payload.currentSceneGrouping)) {
			console.log("We have a preview match", OBS)
			slideBaseScene = OBS.preview.sceneName
			baseCamera = OBS.preview.camera
		} else {
			console.log("We have a NO MATCH")
			StreamDeck.sendAlert(this.context)
			return
		}

		// See if we can find slide scene match.
		slideScene = ''
		let curSc = {}
		for (curSc of this.pi_payload.currentScenes) {
			if (baseCamera == curSc.camera) {
				slideScene = curSc.slideScene
			}
		}
		console.log("slideBaseScene:", slideBaseScene, " Camera:", baseCamera, " Slide Scene is:", slideScene)

		if (slideScene == '') {
			console.log("No slide scene match")
			StreamDeck.sendAlert(this.context)
			return
		}

		StreamDeck.sendOk(this.context)

		if (slideScene != OBS.preview.sceneName) {

			console.log("Setting Scene to: ", slideScene)
			this.pi_payload.currentScene = slideScene
			this.pi_payload.slideBaseScene = slideBaseScene
			OBS.preview.next.button = this.context
			OBS.preview.next.type = this.type
			// this._setState(keySlidePreview)
			obs.send('SetPreviewScene', {
				'scene-name': slideScene
			})
		} else {
			console.log("Scene already set no changing")
		}
	}

	_LiveOutput() {
		console.log("_LiveOutput: this", this)
		StreamDeck.sendOk(this.context)
		console.log("_LiveOutput: Starting Scene transition to program")
		OBS.program.next.button = this.context
		OBS.program.next.type = this.type
		OBS.program.programTransition = true   // Previews handlePreviewSceneChanged from screwing things
		obs.send('TransitionToProgram')
		console.log("Checking button state", this)
		this._setState(keySourceLive)
	}

	_LiveOutputSlide() {
		StreamDeck.sendOk(this.context)

		console.log("_LiveOutputSlide: Starting Scene transition to program")
		OBS.program.next.button = this.context
		OBS.program.next.type = this.type
		OBS.program.programTransition = true   // Previews handlePreviewSceneChanged from screwing things
		obs.send('SetCurrentScene', {
			'scene-name': this.pi_payload.currentScene
		})
		console.log("Checking button state", this)
		this._setState(keySourceLive)
	}

	_updateTitle() {
		// StreamDeck.setTitle(this.context, this[this.type], StreamDeck.BOTH)
	}

	setPreview() {
		// Add detection here for primed/no primed
		console.log("setPreview", this)
		switch (this.type) {
			case type_scene:
				this._setState(keyPreview)
				break
			case type_slide:
				this._setState(keySlidePreview)
				break;
		}
		OBS.preview.current.type = this.type
		OBS.preview.current.button = this.context
		this.setOnline()
	}

	setProgram() {
		if (this.type != '') {
			console.log("setProgram", this)
			this._setState(keyLiveOutput)
			OBS.program.current.type = this.type
			OBS.program.current.button = this.context
			this.setOnline()
		}
	}

	setSourcePreview() {
		if (this.type != '') {
			console.log("setSourcePreview", this)
			this._setState(keySourcePreview)
			this.state = keySourcePreview
			// TODO - Button detection.
			if (OBS.preview.type == type_scene) {

			}
			this.setOnline()
		}
	}

	setSourceProgram() {
		console.log("setSourceProgram", this)
		switch (this.type) {
			case type_scene:
				this._setState(keySourceLive)
				break
			case type_slide:
				this._setState(keySlidePreview)
				break;
		}
		this.setOnline()
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

		// TODO - remove duplicates....
		switch (this.type) {
			case type_scene:
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

			case type_slide:
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
		switch (this.type) {
			case type_slide:
				switch (this.state) {
					// Need to select by Type as well here.
					case keyInactive:
						break
					case keyPreview:
						main_box = green
						circle_col = green
						break
					case keySourcePreview:
						// Making assumptions here that if we are in source preview then
						// then we are also 
						if (OBS.preview.slideBaseScene != "") {
							circle_col = yellow
						}
						lower_bar = green
						break
					case keySourceLive:
						if (OBS.program.slideBaseScene != "") {
							circle_col = yellow
						}
						lower_bar = red
						break
					case keyLiveOutput:
						circle_col = red
						main_box = red
						break
					case keySlidePreview:
						lower_bar = red
						circle_col = yellow
						break;
				}
			case type_scene:
				switch (this.state) {
					// Need to select by Type as well here.
					case keyInactive:
						break
					case keyPreview:
						main_box = green
						circle_col = green
						break
					case keySourcePreview:
						if (this.pi_payload.currentScene == OBS.preview.slideBaseScene) {
							circle_col = yellow
						}
						lower_bar = green
						break
					case keySourceLive:
						if (this.pi_payload.currentScene == OBS.program.slideBaseScene) {
							circle_col = yellow
						}
						lower_bar = red
						break
					case keyLiveOutput:
						circle_col = red
						main_box = red
						break
					case keySlidePreview:
						lower_bar = red
						circle_col = yellow
						break;
				}
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
			ctx.lineWidth = rectangle_line_width * 2;
			ctx.moveTo(0, src_rectangle_y)
			ctx.lineTo(rectangle_width + rectangle_line_width, src_rectangle_y)
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
			btnimg.onload = function () {
				ctx.drawImage(btnimg, 0, 0)
				resolve("Image Loaded")
			}
			btnimg.src = imagecontents
		});
	}
}
