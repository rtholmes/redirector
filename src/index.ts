import Server from "./server";

console.log("index::<clinit> - starting server");
const server = new Server();
server.start();
console.log("index::<clinit> - server started");
