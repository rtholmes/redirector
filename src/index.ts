import Server from "./server";

console.log("index::<clinit> - starting server");
const server = new Server();
server.start();
console.log("index::<clinit> - server started");

// Docker stops a container with SIGTERM, and Ctrl-C sends SIGINT. As PID 1 in a container
// Node ignores these unless handled, so Docker would wait out its timeout and kill it.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
	process.once(signal, async () => {
		console.log("index::" + signal + " - shutting down");
		setTimeout(() => process.exit(1), 5000).unref(); // do not hang on a stuck request
		await server.shutDown();
		process.exit(0);
	});
}
