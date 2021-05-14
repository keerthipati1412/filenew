
var instr = {};

instr.inCheck1 = (function inCheck1() {
	
	return {
		"t": function translate(s) {
			var key = s.toLowerCase().replace(/ /g, '_');
			return translations[key] || s;
		}
	};
})();

instr.server_config = JSON.parse(document.getElementById("configuration").text);
instr.board = document.getElementById("board");
instr.myBoardName=localStorage.getItem("boardName")
instr.userName=localStorage.getItem("userName");
document.getElementById("myText").textContent = instr.userName;

document.getElementById("myBoardName").textContent =instr.myBoardName;
instr.svg = document.getElementById("canvas");
instr.drawingArea = instr.svg.getElementById("drawingArea");


instr.curTool = null;
instr.drawingEvent = true;
instr.showMarker = true;
instr.showOtherCursors = true;
instr.showMyCursor = true;

instr.isIE = /MSIE|Trident/.test(window.navigator.userAgent);

instr.socket = null;
instr.connect = function () {
	var self = this;

	
	if (self.socket) {
		self.socket.destroy();
		delete self.socket;
		self.socket = null;
	}



	this.socket = io.connect('', {
		"path": window.location.pathname.split("/boards/")[0] + "/socket.io",
		"reconnection": true,
		"reconnectionDelay": 100, 
		"timeout": 1000 * 60 * 20 
	});

	
	this.socket.on("broadcast", function (msg) {
		handleMessage(msg).finally(function afterload() {
			var loadingEl = document.getElementById("loadingMessage");
			loadingEl.classList.add("hidden");
		});
				
			}
		
	);

	this.socket.on("reconnect", function onReconnection() {
		instr.socket.emit('joinboard', instr.boardName);
	});


	this.socket.on("usernames", function addUn(usernames){
				
		usernames.forEach(ele => {
				console.log("usrName"+un);
				var tar=document.getElementById("un");
				var li = document.createElement("LI");
				li.innerText = ele;
				li.className="tool1";

				var img=document.createElement("img");
				img.src="active.png";
				img.style="overflow: hidden;vertical-align: middle;"
				img.width="20";
				img.height="20";
				li.appendChild(img);
				tar.appendChild(li);
			})
	})

};



instr.connect();



instr.boardName = (function () {
	var path = window.location.pathname.split("/");
	return decodeURIComponent(path[path.length - 1]);
})();


instr.socket.emit("getboard", instr.boardName);


instr.userName=localStorage.getItem("userName");
if(instr.userName!=null)
{
instr.socket.emit("usernames",instr.userName);
localStorage.removeItem("userName");
}


instr.HTML = {
	template: new Minitpl("#tools > .tool"),
	addShortcut: function addShortcut(key, callback) {
		window.addEventListener("keydown", function (e) {
			if (e.key === key && !e.target.matches("input[type=text], textarea")) {
				callback();
			}
		});
	},
	addTool: function (toolName, toolIcon, toolIconHTML, toolShortcut, oneTouch) {
		var callback = function () {
			instr.change(toolName);
		};
		this.addShortcut(toolShortcut, function () {
			instr.change(toolName);
			document.activeElement.blur && document.activeElement.blur();
		});
		return this.template.add(function (elem) {
			elem.addEventListener("click", callback);
			elem.id = "toolID-" + toolName;
			elem.getElementsByClassName("tool-name")[0].textContent = instr.inCheck1.t(toolName);
			var toolIconElem = elem.getElementsByClassName("tool-icon")[0];
			toolIconElem.src = toolIcon;
			toolIconElem.alt = toolIcon;
			if (oneTouch) elem.classList.add("oneTouch");
			elem.title =
				instr.inCheck1.t(toolName) + " (" +
				instr.inCheck1.t("keyboard shortcut") + ": " +
				toolShortcut + ")" +
				(instr.list[toolName].secondary ? " [" + instr.inCheck1.t("click_to_toggle") + "]" : "");
			
		});
	},
	addStylesheet: function (href) {
		
		var link = document.createElement("link");
		link.href = href;
		link.rel = "stylesheet";
		link.type = "text/css";
		document.head.appendChild(link);
	},
	colorPresetTemplate: new Minitpl("#colorPresetSel .colorPresetButton"),
	addColorButton: function (button) {
		var setColor = instr.setColor.bind(instr, button.color);
		if (button.key) this.addShortcut(button.key, setColor);
		return this.colorPresetTemplate.add(function (elem) {
			elem.addEventListener("click", setColor);
			elem.id = "color_" + button.color.replace(/^#/, '');
			elem.style.backgroundColor = button.color;
			if (button.key) {
				elem.title = instr.inCheck1.t("keyboard shortcut") + ": " + button.key;
			}
		});
	}
};

instr.list = {}; 




instr.register = function registerTool(newTool) {
	

	if (newTool.name in instr.list) {
		console.log("Tools.add: The tool '" + newTool.name + "' is already" +
			"in the list. Updating it...");
	}

	
	instr.applyHooks(instr.toolHooks, newTool);


	instr.list[newTool.name] = newTool;

	
	if (newTool.onSizeChange) instr.sizeChangeHandlers.push(newTool.onSizeChange);

	
	var pending = instr.pendingMessages[newTool.name];
	if (pending) {
		console.log("Drawing pending messages for '%s'.", newTool.name);
		var msg;
		while (msg = pending.shift()) {
			
			newTool.draw(msg, false);
		}
	}
};


instr.add = function (newTool) {
	

	instr.register(newTool);

	if (newTool.stylesheet) {
		instr.HTML.addStylesheet(newTool.stylesheet);
	}

	
	instr.HTML.addTool(newTool.name, newTool.icon, newTool.iconHTML, newTool.shortcut, newTool.oneTouch);
};

instr.change = function (toolName) {
	var newTool = instr.list[toolName];
	var oldTool = instr.curTool;
	if (!newTool) throw new Error("Trying to select a tool that has never been added!");
	if (newTool === oldTool) {
		if (newTool.secondary) {
			newTool.secondary.active = !newTool.secondary.active;
			var props = newTool.secondary.active ? newTool.secondary : newTool;
			instr.HTML.toggle(newTool.name, props.name, props.icon);
			if (newTool.secondary.switch) newTool.secondary.switch();
		}
		return;
	}
	if (!newTool.oneTouch) {
		
		var curToolName = (instr.curTool) ? instr.curTool.name : "";
		try {
			instr.HTML.changeTool(curToolName, toolName);
		} catch (e) {
			console.error("Unable to update the GUI with the new tool. " + e);
		}
		instr.svg.style.cursor = newTool.mouseCursor || "auto";
		instr.board.title = instr.inCheck1.t(newTool.helpText || "");

		
		if (instr.curTool !== null) {
			
			if (newTool === instr.curTool) return;

			
			instr.removeToolListeners(instr.curTool);

			
			instr.curTool.onquit(newTool);
		}

		
		instr.addToolListeners(newTool);
		instr.curTool = newTool;
	}

	
	newTool.onstart(oldTool);
};

instr.addToolListeners = function addToolListeners(tool) {
	for (var event in tool.compiledListeners) {
		var listener = tool.compiledListeners[event];
		var target = listener.target || instr.board;
		target.addEventListener(event, listener, { 'passive': false });
	}
};

instr.removeToolListeners = function removeToolListeners(tool) {
	for (var event in tool.compiledListeners) {
		var listener = tool.compiledListeners[event];
		var target = listener.target || instr.board;
		target.removeEventListener(event, listener);
		
		if (instr.isIE) target.removeEventListener(event, listener, true);
	}
};



instr.send = function (data, toolName) {
	toolName = toolName || instr.curTool.name;
	var d = data;
	d.tool = toolName;
	instr.applyHooks(instr.messageHooks, d);
	var message = {
		"board": instr.boardName,
		"data": d
	};
	instr.socket.emit('broadcast', message);
};

instr.drawAndSend = function (data, tool) {
	if (tool == null) tool = instr.curTool;
	tool.draw(data, true);
	instr.send(data, tool.name);
};


instr.pendingMessages = {};


function messageForTool(message) {
	var name = message.tool,
		tool = instr.list[name];

	if (tool) {
		instr.applyHooks(instr.messageHooks, message);
		tool.draw(message, false);
	} else {
		
		if (!instr.pendingMessages[name]) instr.pendingMessages[name] = [message];
		else instr.pendingMessages[name].push(message);
	}

	if (message.tool !== 'Hand' && message.deltax != null && message.deltay != null) {
	
		messageForTool({ tool: 'Hand', type: 'update', deltax: message.deltax || 0, deltay: message.deltay || 0, id: message.id });
	}
}


function batchCall(fn, args) {
	var BATCH_SIZE = 1024;
	if (args.length === 0) {
		return Promise.resolve();
	} else {
		var batch = args.slice(0, BATCH_SIZE);
		var rest = args.slice(BATCH_SIZE);
		return Promise.all(batch.map(fn))
			.then(function () {
				return new Promise(requestAnimationFrame);
			}).then(batchCall.bind(null, fn, rest));
	}
}


function handleMessage(message) {
	
	if (!message.tool && !message._children) {
		console.error("Received a badly formatted message (no tool). ", message);
	}
	if (message.tool) messageForTool(message);
	if (message._children) return batchCall(handleMessage, message._children);
	else return Promise.resolve();
}

instr.unreadMessagesCount = 0;
instr.newUnreadMessage = function () {
	instr.unreadMessagesCount++;
	updateDocumentTitle();
};

window.addEventListener("focus", function () {
	instr.unreadMessagesCount = 0;
	updateDocumentTitle();
});

function updateDocumentTitle() {
	document.title =
		(instr.unreadMessagesCount ? '(' + instr.unreadMessagesCount + ') ' : '') +
		instr.boardName;
}

(function () {
	
	var scrollTimeout, lastStateUpdate = Date.now();

	window.addEventListener("scroll", function onScroll() {
		var x = document.documentElement.scrollLeft / instr.getScale(),
			y = document.documentElement.scrollTop / instr.getScale();

		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(function updateHistory() {
			var hash = '#' + (x | 0) + ',' + (y | 0) + ',' + instr.getScale().toFixed(1);
			if (Date.now() - lastStateUpdate > 5000 && hash !== window.location.hash) {
				window.history.pushState({}, "", hash);
				lastStateUpdate = Date.now();
			} else {
				window.history.replaceState({}, "", hash);
			}
		}, 100);
	});

	function setScrollFromHash() {
		var coords = window.location.hash.slice(1).split(',');
		var x = coords[0] | 0;
		var y = coords[1] | 0;
		var scale = parseFloat(coords[2]);
		resizeCanvas({ x: x, y: y });
		instr.setScale(scale);
		window.scrollTo(x * scale, y * scale);
	}

	window.addEventListener("hashchange", setScrollFromHash, false);
	window.addEventListener("popstate", setScrollFromHash, false);
	window.addEventListener("DOMContentLoaded", setScrollFromHash, false);
})();


function resizeCanvas(m) {
	
	var x = m.x | 0, y = m.y | 0
	var MAX_BOARD_SIZE = 65536; 
	if (x > instr.svg.width.baseVal.value - 2000) {
		instr.svg.width.baseVal.value = Math.min(x + 2000, MAX_BOARD_SIZE);
	}
	if (y > instr.svg.height.baseVal.value - 2000) {
		instr.svg.height.baseVal.value = Math.min(y + 2000, MAX_BOARD_SIZE);
	}
}

function updateUnreadCount(m) {
	if (document.hidden && ["child", "update"].indexOf(m.type) === -1) {
		instr.newUnreadMessage();
	}
}

instr.messageHooks = [resizeCanvas, updateUnreadCount];

instr.scale = 1.0;
var scaleTimeout = null;
instr.setScale = function setScale(scale) {
	if (isNaN(scale)) scale = 1;
	scale = Math.max(0.1, Math.min(10, scale));
	instr.svg.style.willChange = 'transform';
	instr.svg.style.transform = 'scale(' + scale + ')';
	clearTimeout(scaleTimeout);
	scaleTimeout = setTimeout(function () {
		instr.svg.style.willChange = 'auto';
	}, 1000);
	instr.scale = scale;
	return scale;
}
instr.getScale = function getScale() {
	return instr.scale;
}


instr.toolHooks = [
	function checkToolAttributes(tool) {
		if (typeof (tool.name) !== "string") throw "A tool must have a name";
		if (typeof (tool.listeners) !== "object") {
			tool.listeners = {};
		}
		if (typeof (tool.onstart) !== "function") {
			tool.onstart = function () { };
		}
		if (typeof (tool.onquit) !== "function") {
			tool.onquit = function () { };
		}
	},
	function compileListeners(tool) {
		
		var listeners = tool.listeners;

		
		var compiled = tool.compiledListeners || {};
		tool.compiledListeners = compiled;

		function compile(listener) { 
			return (function listen(evt) {
				var x = evt.pageX / instr.getScale(),
					y = evt.pageY / instr.getScale();
				return listener(x, y, evt, false);
			});
		}

		function compileTouch(listener) { 
			return (function touchListen(evt) {
				
				if (evt.changedTouches.length === 1) {
					
					var touch = evt.changedTouches[0];
					var x = touch.pageX / instr.getScale(),
						y = touch.pageY / instr.getScale();
					return listener(x, y, evt, true);
				}
				return true;
			});
		}

		function wrapUnsetHover(f, toolName) {
			return (function unsetHover(evt) {
				document.activeElement && document.activeElement.blur && document.activeElement.blur();
				return f(evt);
			});
		}

		if (listeners.press) {
			compiled["mousedown"] = wrapUnsetHover(compile(listeners.press), tool.name);
			compiled["touchstart"] = wrapUnsetHover(compileTouch(listeners.press), tool.name);
		}
		if (listeners.move) {
			compiled["mousemove"] = compile(listeners.move);
			compiled["touchmove"] = compileTouch(listeners.move);
		}
		if (listeners.release) {
			var release = compile(listeners.release),
				releaseTouch = compileTouch(listeners.release);
			compiled["mouseup"] = release;
			if (!instr.isIE) compiled["mouseleave"] = release;
			compiled["touchleave"] = releaseTouch;
			compiled["touchend"] = releaseTouch;
			compiled["touchcancel"] = releaseTouch;
		}
	}
];

instr.applyHooks = function (hooks, object) {

	hooks.forEach(function (hook) {
		hook(object);
	});
};




instr.generateUID = function (prefix, suffix) {
	var uid = Date.now().toString(36); 
	uid += (Math.round(Math.random() * 36)).toString(36); 
	if (prefix) uid = prefix + uid;
	if (suffix) uid = uid + suffix;
	return uid;
};

instr.createSVGElement = function createSVGElement(name, attrs) {
	var elem = document.createElementNS(instr.svg.namespaceURI, name);
	if (typeof (attrs) !== "object") return elem;
	Object.keys(attrs).forEach(function (key, i) {
		elem.setAttributeNS(null, key, attrs[key]);
	});
	return elem;
};

instr.positionElement = function (elem, x, y) {
	elem.style.top = y + "px";
	elem.style.left = x + "px";
};

instr.colorPresets = [
	{ color: "#001f3f", key: '1' },
	{ color: "#FF4136", key: '2' },
	{ color: "#0074D9", key: '3' },
	{ color: "#FF851B", key: '4' },
	{ color: "#FFDC00", key: '5' },
	{ color: "#3D9970", key: '6' },
	{ color: "#91E99B", key: '7' },
	{ color: "#90468b", key: '8' },
	{ color: "#7FDBFF", key: '9' },
	{ color: "#AAAAAA", key: '0' },
	{ color: "#E65194" }
];

instr.color_chooser = document.getElementById("chooseColor");

instr.setColor = function (color) {
	instr.color_chooser.value = color;
};

instr.getColor = (function color() {
	var color_index = (Math.random() * instr.colorPresets.length) | 0;
	var initial_color = instr.colorPresets[color_index].color;
	instr.setColor(initial_color);
	return function () { return instr.color_chooser.value; };
})();

instr.colorPresets.forEach(instr.HTML.addColorButton.bind(instr.HTML));

instr.sizeChangeHandlers = [];


instr.getSize = (function () { return 30; });

instr.getOpacity = (function opacity() {
	
	return function () {
		return 1;
	};
})();



instr.svg.width.baseVal.value = document.body.clientWidth;
instr.svg.height.baseVal.value = document.body.clientHeight;


