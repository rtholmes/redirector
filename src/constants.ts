import path from "path";

require("dotenv").config();
// not const-for testing

export let HOST_PREFIX = process.env.HOST_PREFIX as string;
export let PATH_PREFIX = process.env.PATH_PREFIX as string;
console.log("PATH_PREFIX (initial): " + PATH_PREFIX + "; length: " + PATH_PREFIX.length);
PATH_PREFIX = PATH_PREFIX.trim(); // remove whitespace
if (PATH_PREFIX === "/") {
    // empty path shouldn"t be just a slash (although that is a natural value to put there)
    PATH_PREFIX = "";
}
if (PATH_PREFIX.length > 1 && !PATH_PREFIX.startsWith("/")) {
    // ensure initial slash is there
    PATH_PREFIX = "/" + PATH_PREFIX;
}

// not const-for testing
export let LINKS_FILE = process.env.LINKS_FILE as string;
export let USERS_FILE = process.env.USERS_FILE as string;

export const SERVER_ROOT = path.join(__dirname, "../");
export const LOG_PATH = path.join(SERVER_ROOT, "log");
export const STATIC_PATH = path.join(SERVER_ROOT, "public");

export function printConfiguration() {
    console.log("PATH_PREFIX: " + PATH_PREFIX);
    console.log("LINKS_FILE: " + LINKS_FILE);
    console.log("USERS_FILE: " + USERS_FILE);
    console.log("LOG_PATH: " + LOG_PATH);
    console.log("IS TEST: " + isTestEnvironment());
}

export function isTestEnvironment() {
    return typeof global.it === "function" && typeof global.afterEach === "function";
}

export function configureForTesting() {
    const ts = Date.now();

    process.env.LINKS_FILE = process.env.LINKS_FILE + ".test." + ts;
    LINKS_FILE = process.env.LINKS_FILE;

    process.env.USERS_FILE = process.env.USERS_FILE + ".test." + ts;
    USERS_FILE = process.env.USERS_FILE;
}

export function configurePrefixForTesting() {
    process.env.PATH_PREFIX = "/testsuite"
    PATH_PREFIX = process.env.PATH_PREFIX;
}
