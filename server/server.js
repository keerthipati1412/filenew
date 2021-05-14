var app = require('http').createServer(handler)
	, sockets = require('./sockets.js')
	, path = require('path')
	, url = require('url')
	, fs = require("fs")
	, crypto = require("crypto")
	, serveStatic = require("serve-static")
	, createSVG = require("./createSVG.js")
	, templating = require("./templating.js")
	, config = require("./configuration.js")
	, polyfillLibrary = require('polyfill-library');


var MIN_NODE_VERSION = 8.0;



var io = sockets.start(app);

app.listen(config.PORT);
console.log("server started", { port: config.PORT });


var CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:";

var fileserver = serveStatic(config.WEBROOT, {
	maxAge: 2 * 3600 * 1000,
	setHeaders: function (res) {
		res.setHeader("X-UA-Compatible", "IE=Edge");
		res.setHeader("Content-Security-Policy", CSP);
	}
});

var errorPage = fs.readFileSync(path.join(config.WEBROOT, "error.html"));
function serveError(request, response) {
	return function (err) {
		
		response.writeHead(err ? 500 : 404, { "Content-Length": errorPage.length });
		response.end(errorPage);
	}
}



function handler(request, response) {
	try {
		handleRequest(request, response);
	} catch (err) {
		console.trace(err);
		response.writeHead(500, { 'Content-Type': 'text/plain' });
		response.end(err.toString());
	}
}

const boardTemplate = new templating.BoardTemplate(path.join(config.WEBROOT, 'board.html'));
const indexTemplate = new templating.Template(path.join(config.WEBROOT, 'index.html'));

function validateBoardName(boardName) {
	if (/^[\w%\-_~()]*$/.test(boardName)) return boardName;
	throw new Error("Illegal board name: " + boardName);
}

function handleRequest(request, response) {
	var parsedUrl = url.parse(request.url, true);
	var seg = parsedUrl.pathname.split('/');
	if (seg[0] === '') seg.shift();

	switch (seg[0]) {
		case "boards":
			
			if (seg.length === 1) {
				
				var boardName = parsedUrl.query.board || "anonymous";

				var headers = { Location: 'boards/' + encodeURIComponent(boardName) };
				response.writeHead(301, headers);
				response.end();
			} else if (seg.length === 2 && request.url.indexOf('.') === -1) {
				validateBoardName(seg[1]);
				
				boardTemplate.serve(request, response);
			} else { 
				request.url = "/" + seg.slice(1).join('/');
				fileserver(request, response, serveError(request, response));
			}
			break;

	

		

		case "": 
			
			indexTemplate.serve(request, response);
			break;

		default:
			fileserver(request, response, serveError(request, response));
	}
}


module.exports = app;
