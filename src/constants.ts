import * as fs from "fs";

import {read} from "./util";

// Load .env for local development and tests; in Docker the environment comes from compose.
// As with dotenv, variables already set in the environment win and a missing file is ignored.
if (fs.existsSync(".env")) {
	process.loadEnvFile(".env");
}

// check that all constants exist so that if the environment is not configured
// correctly we can get a useful error message
export function checkConstantExists() {
	const requiredKeys = ["HOST_PREFIX", "PATH_PREFIX", "LINKS_FILE", "USERS_FILE"];
	let requiredKeyMissing = false;
	for (const key of requiredKeys) {
		if (typeof process.env[key] === "undefined") {
			console.log("Required .env key missing: " + key);
			requiredKeyMissing = true;
		}
	}
	if (requiredKeyMissing === true) {
		console.log("Cannot launch redirector; required key missing.");
		process.exit(-1);
	}
}

export let HOST_PREFIX = process.env.HOST_PREFIX as string;
export let PATH_PREFIX = process.env.PATH_PREFIX as string;
console.log("PATH_PREFIX (initial): " + PATH_PREFIX + "; length: " + PATH_PREFIX.length);
PATH_PREFIX = PATH_PREFIX.trim(); // remove whitespace
if (PATH_PREFIX === "/") {
	// empty path should not be just a slash (although that is a natural value to put there)
	PATH_PREFIX = "";
}
if (PATH_PREFIX.length > 1 && !PATH_PREFIX.startsWith("/")) {
	// ensure initial slash is there
	PATH_PREFIX = "/" + PATH_PREFIX;
}

// not const-for testing
export let LINKS_FILE = process.env.LINKS_FILE as string;
export let USERS_FILE = process.env.USERS_FILE as string;

/**
 * Whether people can create their own accounts (#17). On unless ALLOW_REGISTRATION
 * is false, 0, no or off. Read on every call so tests can change it.
 */
export function isRegistrationAllowed(): boolean {
	const value = (process.env.ALLOW_REGISTRATION ?? "").trim().toLowerCase();
	return !["false", "0", "no", "off"].includes(value);
}

/**
 * Usernames that can see and delete every link (#16): ADMINS as a comma-separated
 * list, or just "admin" when unset. Read on every call so tests can change it.
 */
export function getAdmins(): string[] {
	const value = process.env.ADMINS;
	if (value === undefined) {
		return ["admin"];
	}
	return value.split(",").map(name => name.trim()).filter(name => name.length > 0);
}

export function isAdmin(username: string): boolean {
	return getAdmins().includes(username);
}

export function printConfiguration() {
	console.log("HOST_PREFIX: " + HOST_PREFIX);
	console.log("PATH_PREFIX: " + PATH_PREFIX);
	console.log("LINKS_FILE: " + LINKS_FILE);
	console.log("USERS_FILE: " + USERS_FILE);
	console.log("ALLOW_REGISTRATION: " + isRegistrationAllowed());
	console.log("ADMINS: " + getAdmins().join(", "));
	console.log("IS TEST: " + isTestEnvironment());
}

export function isTestEnvironment() {
	return process.env.NODE_TEST_CONTEXT !== undefined;
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

export function checkPermissions() {
	console.log("constants::checkPermissions() - start");
	// check read (create if needed)
	read(LINKS_FILE);
	read(USERS_FILE);
	// ensure write
	fs.accessSync(LINKS_FILE, fs.constants.R_OK | fs.constants.W_OK);
	fs.accessSync(USERS_FILE, fs.constants.R_OK | fs.constants.W_OK);
	console.log("constants::checkPermissions() - done");
}
