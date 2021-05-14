

(function eraser() { //Code isolation

	var erasing = false;

	function startErasing(x, y, evt) {
		//Prevent the press from being interpreted by the browser
		evt.preventDefault();
		erasing = true;
		erase(x, y, evt);
	}

	var msg = {
		"type": "delete",
		"id": ""
	};

	function inDrawingArea(elem) {
		return instr.drawingArea.contains(elem);
	}

	function erase(x, y, evt) {
		// evt.target should be the element over which the mouse is...
		var target = evt.target;
		if (evt.type === "touchmove") {
			// ... the target of touchmove events is the element that was initially touched,
			// not the one **currently** being touched
			var touch = evt.touches[0];
			target = document.elementFromPoint(touch.clientX, touch.clientY);
		}
		if (erasing && target !== instr.svg && target !== instr.drawingArea && inDrawingArea(target)) {
			msg.id = target.id;
			instr.drawAndSend(msg);
		}
	}

	function stopErasing() {
		erasing = false;
	}

	function draw(data) {
		var elem;
		switch (data.type) {
			//TODO: add the ability to erase only some points in a line
			case "delete":
				elem = svg.getElementById(data.id);
				if (elem === null) console.error("Eraser: Tried to delete an element that does not exist.");
				else instr.drawingArea.removeChild(elem);
				break;
			default:
				console.error("Eraser: 'delete' instruction with unknown type. ", data);
				break;
		}
	}

	var svg = instr.svg;

	instr.add({ //The new tool
		"name": "Eraser",
		"shortcut": "e",
		"listeners": {
			"press": startErasing,
			"move": erase,
			"release": stopErasing,
		},
		"draw": draw,
		"icon": "tools/eraser/icon.svg",
		"mouseCursor": "crosshair",
		"showMarker": true,
	});

})(); //End of code isolation
