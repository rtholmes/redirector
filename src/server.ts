import http from "http";
import express, {Express} from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import * as crypto from "crypto";

import morgan from "morgan";
import rfs from "rotating-file-stream";
import debugLib from "debug";

import {ApplicationError} from "./types";
import {normalizePort} from "./util";
import {checkConstantExists, checkPermissions, LOG_PATH, PATH_PREFIX, printConfiguration} from "./constants";

import PublicRouter from "./routes/public";
import AdminRouter from "./routes/admin";

const debug = debugLib("server");
const exphbs = require("express-handlebars");

export default class Server {

	private accessLogStream = rfs("access.log", {
		interval: "1d", // rotate daily
		path: LOG_PATH
	});

	private app: Express = express();
	private server: http.Server;

	constructor() {
		console.log("Server::<init> - start; prefix: " + PATH_PREFIX);

		checkConstantExists();
		checkPermissions();
		printConfiguration();

		// Apache commons style logging
		this.app.use(morgan("combined", {
			stream: this.accessLogStream
		}));

		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({extended: false}));

		this.app.use(cookieParser());
		this.app.use(session({
			secret: crypto.randomBytes(4).toString("hex"),
			resave: false,
			saveUninitialized: false,
			cookie: {maxAge: 60 * 60 * 1000} // 60 min
		}));

		this.app.use(PATH_PREFIX + "/admin/static", express.static("public"));
		this.app.use(PATH_PREFIX + "/admin", AdminRouter);
		this.app.use(PATH_PREFIX + "/", PublicRouter);

		this.app.engine("hbs", exphbs({
			extname: ".hbs"
		}));

		this.app.set("view engine", "hbs");

		// catch 404 and forward to error handler
		// app.use(function(req, res, next) {
		//   const err: ApplicationError = new Error("Not Found");
		//   err.status = 404;
		//   next(err);
		// });

		const port = normalizePort(process.env.PORT || "3000");
		this.app.set("port", port);

		this.server = http.createServer(this.app);
		console.log("Server::<init> - done");
	}

	/* istanbul ignore next */
	public async start(): Promise<void> {
		const that = this;
		let port = that.app.get("port");

		that.server.on("error", (error: ApplicationError) => {
			if (error.syscall !== "listen") {
				throw error;
			}

			const bind = typeof port === "string"
				? "Pipe " + port
				: "Port " + port;

			// handle specific listen errors with friendly messages
			switch (error.code) {
				case "EACCES":
					console.error(bind + " requires elevated privileges");
					process.exit(1);
					break;
				case "EADDRINUSE":
					console.error(bind + " is already in use");
					process.exit(1);
					break;
				default:
					throw error;
			}
		});

		that.server.on("listening", () => {
			const addr = that.server.address();
			if (addr) {
				const bind = typeof addr === "string"
					? "pipe " + addr
					: "port " + addr.port;
				debug("Listening on " + bind);
			} else {
				debug("Unable to create address");
			}
		});

		that.server.on("SIGTERM", () => {
			console.log("Server::start() - SIGTERM received");
			that.shutDown();
		});
		that.server.on("SIGKILL", () => {
			console.log("Server::start() - SIGKILL received");
            that.shutDown();
		});

		console.log("Server::start() - Starting application server");
		that.server.listen(port);
		console.log(`Server::start() - Server is up @ http://localhost:${port}${PATH_PREFIX}`);
	}

	// TODO: do we need a close function?

	public getApp(): Express {
		return this.app;
	}

	public async shutDown() {
		console.log("Server::shutdown() - starting shutdown");
		await this.server.close();
		console.log("Server::shutdown() - done");
	}
}
