

(function () { 

	
	var MIN_PENCIL_INTERVAL_MS = instr.server_config.MAX_EMIT_COUNT_PERIOD / instr.server_config.MAX_EMIT_COUNT;

	
	var curLineId = "",
		lastTime = performance.now(); 

	
	function PointMessage(x, y) {
		this.type = 'child';
		this.parent = curLineId;
		this.x = x;
		this.y = y;
	}

	function startLine(x, y, evt) {

		
		evt.preventDefault();

		curLineId = instr.generateUID("l");

		instr.drawAndSend({
			'type': 'line',
			'id': curLineId,
			'color':  instr.getColor(),
			'size': 10,
			'opacity':  1,
		});

		continueLine(x, y);
	}

	function continueLine(x, y, evt) {
		
		if (curLineId !== "" && performance.now() - lastTime > MIN_PENCIL_INTERVAL_MS) {
			instr.drawAndSend(new PointMessage(x, y));
			lastTime = performance.now();
		}
		if (evt) evt.preventDefault();
	}

	function stopLineAt(x, y) {
		//Add a last point to the line
		continueLine(x, y);
		stopLine();
	}

	function stopLine() {
		curLineId = "";
	}

	var renderingLine = {};
	function draw(data) {
		instr.drawingEvent = true;
		switch (data.type) {
			case "line":
				renderingLine = createLine(data);
				break;
			case "child":
				var line = (renderingLine.id === data.parent) ? renderingLine : svg.getElementById(data.parent);
				if (!line) {
					
					line = renderingLine = createLine({ "id": data.parent }); //create a new line in order not to loose the points
				}
				addPoint(line, data.x, data.y);
				break;
			case "endline":
				//TODO?
				break;
			default:
				
				break;
		}
	}

	var pathDataCache = {};
	function getPathData(line) {
		var pathData = pathDataCache[line.id];
		if (!pathData) {
			pathData = line.getPathData();
			pathDataCache[line.id] = pathData;
		}
		return pathData;
	}

	var svg = instr.svg;

	function addPoint(line, x, y) {
		var pts = getPathData(line);
		pts = PencilPoint(pts, x, y);
		line.setPathData(pts);
	}

	function createLine(lineData) {
		//Creates a new line on the canvas, or update a line that already exists with new information
		var line = svg.getElementById(lineData.id) || instr.createSVGElement("path");
		line.id = lineData.id;
		//If some data is not provided, choose default value. The line may be updated later
		line.setAttribute("stroke", lineData.color || "black");
		line.setAttribute("stroke-width", lineData.size || 10);
		line.setAttribute("opacity", Math.max(0.1, Math.min(1, lineData.opacity)) || 1);
		instr.drawingArea.appendChild(line);
		return line;
	}


	var pencilTool = {
		"name": "Pencil",
		"shortcut": "p",
		"listeners": {
			"press": startLine,
			"move": continueLine,
			"release": stopLineAt,
		},
		"draw": draw,
		
		"mouseCursor": "url('tools/pencil/cursor.svg'), crosshair",
		"icon": "tools/pencil/icon.svg",
		"stylesheet": "tools/pencil/pencil.css"
	};
	instr.add(pencilTool);

})(); //End of code isolation
