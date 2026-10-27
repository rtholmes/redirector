import http from "http";
import express, {Express} from "express";
import cookieParser from "cookie-parser";

import morgan from "morgan";

import {ApplicationError} from "./types";
import {normalizePort} from "./util";
import {handlebarsEngine} from "./viewEngine";
import {checkConstantExists, checkPermissions, PATH_PREFIX, printConfiguration} from "./constants";

import PublicRouter from "./routes/public";
import AdminRouter from "./routes/admin";

export default class Server {

	private app: Express = express();
	private server: http.Server;

	constructor() {
		console.log("Server::<init> - start; prefix: " + PATH_PREFIX);

		checkConstantExists();
		checkPermissions();
		printConfiguration();

		// Apache combined-format access log to stdout, where `docker logs` collects it
		this.app.use(morgan("combined"));

		this.app.use(express.json());
		this.app.use(express.urlencoded({extended: false}));

		this.app.use(cookieParser());

		this.app.use(PATH_PREFIX + "/admin/static", express.static("public"));
		this.app.use(PATH_PREFIX + "/admin", AdminRouter);
		this.app.use(PATH_PREFIX + "/", PublicRouter);

		this.app.engine("hbs", handlebarsEngine);

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
