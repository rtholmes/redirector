// import http from "http";
// import express from "express";
// import bodyParser from "body-parser";
// import cookieParser from "cookie-parser";
// import session from "express-session";
// import * as crypto from "crypto";
//
// import morgan from "morgan";
// import rfs from "rotating-file-stream";
// import debugLib from "debug";
//
// import {ApplicationError} from "./types";
// import {normalizePort} from "./util";
// import {LOG_PATH} from "./constants";
//
// import PublicRouter from "./routes/public";
// import AdminRouter from "./routes/admin";
//
// const debug = debugLib("server");
// const exphbs = require("express-handlebars");
//
// const accessLogStream = rfs("access.log", {
//     interval: "1d", // rotate daily
//     path: LOG_PATH
// });
//
// export const app = express();
//
// // Apache commons style logging
// app.use(morgan("combined", {stream: accessLogStream}));
//
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: false}));
//
// app.use(cookieParser());
// app.use(session({
//     secret: crypto.randomBytes(4).toString("hex"),
//     resave: false,
//     saveUninitialized: false,
//     cookie: {maxAge: 60 * 60 * 1000} // 60 min
// }));
//
// app.use("/admin/static", express.static('public'));
// app.use("/admin", AdminRouter);
// app.use("/", PublicRouter);
//
// app.engine("hbs", exphbs({
//     extname: ".hbs"
// }));
//
// app.set("view engine", "hbs");
//
// // catch 404 and forward to error handler
// // app.use(function(req, res, next) {
// //   const err: ApplicationError = new Error("Not Found");
// //   err.status = 404;
// //   next(err);
// // });
//
// const port = normalizePort(process.env.PORT || "3000");
// app.set("port", port);
//
// export const server = http.createServer(app);
//
// server.on("error", (error: ApplicationError) => {
//     if (error.syscall !== "listen") {
//         throw error;
//     }
//
//     const bind = typeof port === "string"
//         ? "Pipe " + port
//         : "Port " + port;
//
//     // handle specific listen errors with friendly messages
//     switch (error.code) {
//         case "EACCES":
//             console.error(bind + " requires elevated privileges");
//             process.exit(1);
//             break;
//         case "EADDRINUSE":
//             console.error(bind + " is already in use");
//             process.exit(1);
//             break;
//         default:
//             throw error;
//     }
// });
//
// server.on("listening", () => {
//     const addr = server.address();
//     if (addr) {
//         const bind = typeof addr === "string"
//             ? "pipe " + addr
//             : "port " + addr.port;
//         debug("Listening on " + bind);
//     } else {
//         debug("Unable to create address");
//     }
// });
//
// (async () => {
//     console.log("Starting application server");
//     server.listen(port);
//     console.log(`Server is up @ http://localhost:${port}`);
// })();

import Server from "./Server";

const server = new Server();
server.start();
