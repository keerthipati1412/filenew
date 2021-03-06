var fs = require('./fs_promises.js')
	
	, path = require("path")
	, config = require("./configuration.js");


var BoardData = function (name) {
	
	this.name = name;
	this.board = {};
	console.log("name:"+name);
	this.file = path.join(config.HISTORY_DIR, "board-" + encodeURIComponent(name) + ".json");
	this.lastSaveDate = Date.now();
	this.users = new Set();
	
};


BoardData.prototype.set = function (id, data) {
	
	data.time = Date.now();
	this.validate(data);
	this.board[id] = data;
	this.delaySave();
};


BoardData.prototype.addChild = function (parentId, child) {
	var obj = this.board[parentId];
	if (typeof obj !== "object") return false;
	if (Array.isArray(obj._children)) obj._children.push(child);
	else obj._children = [child];

	this.validate(obj);
	this.delaySave();
	return true;
};


BoardData.prototype.update = function (id, data, create) {
	delete data.type;
	delete data.tool;

	var obj = this.board[id];
	if (typeof obj === "object") {
		for (var i in data) {
			obj[i] = data[i];
		}
	} else if (create || obj !== undefined) {
		this.board[id] = data;
	}
	this.delaySave();
};


BoardData.prototype.delete = function (id) {
	
	delete this.board[id];
	this.delaySave();
};


BoardData.prototype.get = function (id, children) {
	return this.board[id];
};


BoardData.prototype.getAll = function (id) {
	var results = [];
	for (var i in this.board) {
		if (!id || i > id) {
			results.push(this.board[i]);
		}
	}
	return results;
};


BoardData.prototype.addUser = function addUser(userId) {
console.log("test Board")
}


BoardData.prototype.delaySave = function (file) {
	if (this.saveTimeoutId !== undefined) clearTimeout(this.saveTimeoutId);
	this.saveTimeoutId = setTimeout(this.save.bind(this), config.SAVE_INTERVAL);
	if (Date.now() - this.lastSaveDate > config.MAX_SAVE_DELAY) setTimeout(this.save.bind(this), 0);
};


BoardData.prototype.save = async function (file) {
	this.lastSaveDate = Date.now();
	this.clean();
	if (!file) file = this.file;
	var tmp_file = backupFileName(file);
	var board_txt = JSON.stringify(this.board);
	if (board_txt === "{}") { 
		try {
			await fs.promises.unlink(file);
			
		} catch (err) {
			
		}
	} else {
		try {
			await fs.promises.writeFile(tmp_file, board_txt);
			await fs.promises.rename(tmp_file, file);
			
		} catch (err) {
			
			return;
		}
	}
};


BoardData.prototype.clean = function cleanBoard() {
	var board = this.board;
	var ids = Object.keys(board);
	if (ids.length > config.MAX_ITEM_COUNT) {
		var toDestroy = ids.sort(function (x, y) {
			return (board[x].time | 0) - (board[y].time | 0);
		}).slice(0, -config.MAX_ITEM_COUNT);
		for (var i = 0; i < toDestroy.length; i++) delete board[toDestroy[i]];
		
	}
}


BoardData.prototype.validate = function validate(item, parent) {
	if (item.hasOwnProperty("size")) {
		item.size = parseInt(item.size) || 1;
		item.size = Math.min(Math.max(item.size, 1), 50);
	}
	if (item.hasOwnProperty("x") || item.hasOwnProperty("y")) {
		item.x = parseFloat(item.x) || 0;
		item.x = Math.min(Math.max(item.x, 0), config.MAX_BOARD_SIZE);
		item.x = Math.round(10 * item.x) / 10;
		item.y = parseFloat(item.y) || 0;
		item.y = Math.min(Math.max(item.y, 0), config.MAX_BOARD_SIZE);
		item.y = Math.round(10 * item.y) / 10;
	}
	if (item.hasOwnProperty("opacity")) {
		item.opacity = Math.min(Math.max(item.opacity, 0.1), 1) || 1;
		if (item.opacity === 1) delete item.opacity;
	}
	if (item.hasOwnProperty("_children")) {
		if (!Array.isArray(item._children)) item._children = [];
		if (item._children.length > config.MAX_CHILDREN) item._children.length = config.MAX_CHILDREN;
		for (var i = 0; i < item._children.length; i++) {
			this.validate(item._children[i]);
		}
	}
}


BoardData.load = async function loadBoard(name) {
	var boardData = new BoardData(name), data;
	try {
		data = await fs.promises.readFile(boardData.file);
		boardData.board = JSON.parse(data);
		for (id in boardData.board) boardData.validate(boardData.board[id]);
	
	} catch (e) {
		
		boardData.board = {}
		if (data) {
		
			var backup = backupFileName(boardData.file);
			
		}
	}
	return boardData;
};

function backupFileName(baseName) {
	var date = new Date().toISOString().replace(/:/g, '');
	return baseName + '.' + date + '.bak';
}

module.exports.BoardData = BoardData;
