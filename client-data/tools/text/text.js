

(function () { //Code isolation
	var board = instr.board;

	var input = document.createElement("input");
	input.id = "textToolInput";
	input.type = "text";
	input.setAttribute("autocomplete", "off");

	var curText = {
		"x": 0,
		"y": 0,
		"size": 36,
		"rawSize": 16,
		"oldSize": 0,
		"opacity": 1,
		"color": "#000",
		"id": 0,
		"sentText": "",
		"lastSending": 0
	};

	var active = false;


	function onStart() {
		curText.oldSize = 30;
		
	}

	function onQuit() {
		stopEdit();
		
	}

	function clickHandler(x, y, evt, isTouchEvent) {
		//if(document.querySelector("#menu").offsetWidth>Tools.menu_width+3) return;
		if (evt.target === input) return;
		if (evt.target.tagName === "text") {
			editOldText(evt.target);
			evt.preventDefault();
			return;
		}
		curText.rawSize = 30;
		curText.size = parseInt(curText.rawSize * 1.5 + 12);
		curText.opacity = 1;
		curText.color = instr.getColor();
		curText.x = x;
		curText.y = y + curText.size / 2;

		stopEdit();
		startEdit();
		evt.preventDefault();
	}

	function editOldText(elem) {
		curText.id = elem.id;
		var r = elem.getBoundingClientRect();
		var x = (r.left + document.documentElement.scrollLeft) / instr.scale;
		var y = (r.top + r.height + document.documentElement.scrollTop) / instr.scale;

		curText.x = x;
		curText.y = y;
		curText.sentText = elem.textContent;
		curText.size = parseInt(elem.getAttribute("font-size"));
		curText.opacity = parseFloat(elem.getAttribute("opacity"));
		curText.color = elem.getAttribute("fill");
		startEdit();
		input.value = elem.textContent;
	}

	function startEdit() {
		active = true;
		if (!input.parentNode) board.appendChild(input);
		input.value = "";
		var left = curText.x - document.documentElement.scrollLeft + 'px';
		var clientW = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		var x = curText.x * instr.scale - document.documentElement.scrollLeft;
		if (x + 250 > clientW) {
			x = Math.max(60, clientW - 260)
		}

		input.style.left = x + 'px';
		input.style.top = curText.y * instr.scale - document.documentElement.scrollTop + 20 + 'px';
		input.focus();
		input.addEventListener("keyup", textChangeHandler);
		input.addEventListener("blur", textChangeHandler);
		input.addEventListener("blur", blur);
	}

	function stopEdit() {
		try { input.blur(); } catch (e) { /* Internet Explorer */ }
		active = false;
		blur();
		curText.id = 0;
		curText.sentText = "";
		input.value = "";
		input.removeEventListener("keyup", textChangeHandler);
	}

	function blur() {
		if (active) return;
		input.style.top = '-1000px';
	}

	function textChangeHandler(evt) {
		if (evt.which === 13) { // enter
			curText.y += 1.5 * curText.size;
			stopEdit();
			startEdit();
		} else if (evt.which === 27) { // escape
			stopEdit();
		}
		if (performance.now() - curText.lastSending > 100) {
			if (curText.sentText !== input.value) {
				//If the user clicked where there was no text, then create a new text field
				if (curText.id === 0) {
					curText.id = instr.generateUID("t"); //"t" for text
					instr.drawAndSend({
						'type': 'new',
						'id': curText.id,
						'color': curText.color,
						'size': curText.size,
						'opacity': curText.opacity,
						'x': curText.x,
						'y': curText.y
					})
				}
				instr.drawAndSend({
					'type': "update",
					'id': curText.id,
					'txt': input.value.slice(0, 280)
				});
				curText.sentText = input.value;
				curText.lastSending = performance.now();
			}
		} else {
			clearTimeout(curText.timeout);
			curText.timeout = setTimeout(textChangeHandler, 500, evt);
		}
	}

	function draw(data, isLocal) {
		instr.drawingEvent = true;
		switch (data.type) {
			case "new":
				createTextField(data);
				break;
			case "update":
				var textField = document.getElementById(data.id);
				if (textField === null) {
					
					return false;
				}
				updateText(textField, data.txt);
				break;
			default:
				
				break;
		}
	}

	function updateText(textField, text) {
		textField.textContent = text;
	}

	function createTextField(fieldData) {
		var elem = instr.createSVGElement("text");
		elem.id = fieldData.id;
		elem.setAttribute("x", fieldData.x);
		elem.setAttribute("y", fieldData.y);
		elem.setAttribute("font-size", fieldData.size);
		elem.setAttribute("fill", fieldData.color);
		elem.setAttribute("opacity", Math.max(0.1, Math.min(1, fieldData.opacity)) || 1);
		if (fieldData.txt) elem.textContent = fieldData.txt;
		instr.drawingArea.appendChild(elem);
		return elem;
	}

	instr.add({ //The new tool
		"name": "Text",
		"shortcut": "t",
		"listeners": {
			"press": clickHandler,
		},
		"onstart": onStart,
		"onquit": onQuit,
		"draw": draw,
		"stylesheet": "tools/text/text.css",
		"icon": "tools/text/icon.svg",
		"mouseCursor": "text"
	});

})(); //End of code isolation
