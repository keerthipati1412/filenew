var iolib = require('socket.io')
	
	, BoardData = require("./boardData.js").BoardData
	, config = require("./configuration");


var boards = {};
var usernames=[];

function noFail(fn) {
	return function noFailWrapped(arg) {
		try {
			return fn(arg);
		} catch (e) {
			console.trace(e);
		}
	}
}

function startIO(app) {
	io = iolib(app);
	io.on('connection', noFail(socketConnection));
	return io;
}


function getBoard(name) {
	if (boards.hasOwnProperty(name)) {
		return boards[name];
	} else {
		var board = BoardData.load(name);
		boards[name] = board;
		return board;
	}
}


function socketConnection(socket) {

	async function joinBoard(name) {
		
		if (!name) name = "anonymous";

		
		socket.join(name);

		var board = await getBoard(name);
		board.users.add(socket.id);
		
		return board;
	}

	socket.on("error", noFail(function onError(error) {
		
	}));

	socket.on("usernames",async function getName(un)
	{
		usernames.push(un);
		console.log(usernames);
		socket.emit('usernames', usernames);
	});

	socket.on("getboard", async function onGetBoard(name) {
		var board = await joinBoard(name);
		
		socket.emit("broadcast", { _children: board.getAll() });
	});

	socket.on("joinboard", noFail(joinBoard));

	var lastEmitSecond = Date.now() / config.MAX_EMIT_COUNT_PERIOD | 0;
	var emitCount = 0;
	socket.on('broadcast', noFail(function onBroadcast(message) {
		var currentSecond = Date.now() / config.MAX_EMIT_COUNT_PERIOD | 0;
		if (currentSecond === lastEmitSecond) {
			emitCount++;
			if (emitCount > config.MAX_EMIT_COUNT) {
				var request = socket.client.request;
				
				return;
			}
		} else {
			emitCount = 0;
			lastEmitSecond = currentSecond;
		}

		var boardName = message.board || "anonymous";
		var data = message.data;

		if (!socket.rooms.has(boardName)) socket.join(boardName);

		if (!data) {
			console.warn(" Invalid : ", JSON.stringify(message));
			return;
		}

		

		
		handleMessage(boardName, data, socket);

		
		socket.broadcast.to(boardName).emit('broadcast', data);
	}));

	socket.on('disconnecting', function onDisconnecting(reason) {
		socket.rooms.forEach(async function disconnectFrom(room) {
			if (boards.hasOwnProperty(room)) {
				var board = await boards[room];
				board.users.delete(socket.id);
				var userCount = board.users.size;
				
				if (userCount === 0) {
					board.save();
					delete boards[room];
				}
			}
		});
	});
}

function handleMessage(boardName, message, socket) {
	if (message.tool === "Cursor") {
		message.socket = socket.id;
	} else {
		saveHistory(boardName, message);
	}
}

async function saveHistory(boardName, message) {
	var id = message.id;
	var board = await getBoard(boardName);
	switch (message.type) {
		case "delete":
			if (id) board.delete(id);
			break;
		case "update":
			if (id) board.update(id, message);
			break;
		case "child":
			board.addChild(message.parent, message);
			break;
		default: 
			if (!id) throw new Error("Invalid message: ", message);
			board.set(id, message);
	}
}

function generateUID(prefix, suffix) {
	var uid = Date.now().toString(36); 
	uid += (Math.round(Math.random() * 36)).toString(36); 
	if (prefix) uid = prefix + uid;
	if (suffix) uid = uid + suffix;
	return uid;
}

if (exports) {
	exports.start = startIO;
}
