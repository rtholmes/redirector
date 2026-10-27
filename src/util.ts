import fs from "fs";

import {Request, Response} from "express";
import type {Link, User} from "./types";
import {LINKS_FILE, PATH_PREFIX} from "./constants";

const URL = require("url").URL;

export const normalizePort = (val: string) => {
	const port = parseInt(val, 10);
	if (isNaN(port)) {
		// named pipe
		return val;
	}
	if (port >= 0) {
		// port number
		return port;
	}
	return false;
}

/**
 * Read JSON data file.
 *
 * @param fName
 */
export function read(fName: string): User[] | Link[] {
	console.log("util::read( " + fName + " )");

	if (!fs.existsSync(fName)) {
		console.log("util::read( " + fName + " ) - does not exist, creating new file");
		fs.writeFileSync(fName, "[]"); // create empty file
	}

	const rawData = fs.readFileSync(fName);
	let data = JSON.parse(rawData as any);

	return data;
}

/**
 * Write JSON object to file.
 *
 * @param fName
 * @param data
 */
export function write(fName: string, data: User[] | Link[]) {
	console.log("util::write( " + fName + " )");

	fs.copyFileSync(fName, fName + ".bak." + Date.now());

	fs.writeFileSync(fName, JSON.stringify(data));
	return;
}

/**
 * Local time as ISO 8601 with UTC offset, e.g. 2026-10-27T14:41:00-07:00.
 * Same output as moment().format(), which this replaced.
 */
export function localISOString(d: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const offset = -d.getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
		+ `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function isValidURL(path: string) {
	console.log("util::isValidURL - start: " + path);
	let url;
	try {
		path = path.trim(); // remove start/trailing whitespace
		path = path.replace(/ /g, ""); // remove all spaces
		url = new URL(path);
	} catch (err) {
		console.log("util::isValidURL - err NOT valid URL: " + path);
		return false;
	}

	const isValid = url.protocol === "http:" || url.protocol === "https:";
	if (isValid === true) {
		console.log("util::isValidURL - IS valid URL: " + path);
	} else {
		console.log("util::isValidURL - NOT valid URL: " + path);
	}
	return isValid;
}

/**
 * Get the link to follow. If it does not exist, return null.
 *
 * @param name
 */
export function getLink(name: string): string | null {
	console.log("util::getLink( " + name + " ) - start");
	const links = read(LINKS_FILE) as Link[];
	for (const link of links) {
		if (link.name === name) {
			console.log("util::getLink( " + name + " ) - found: " + link.url);
			return link.url;
		}
	}
	console.log("util::getLink( " + name + " ) - NOT found");
	return null;
}

/**
 * Clear session opts after they have been consumed
 * @param req
 */
export function clearSession(req: Request) {
	delete (req.session as any).opts;
}

export function sendToHome(res: Response, opts: any) {
	if (PATH_PREFIX === "") {
		console.log("util::sendToHome() - not found; sending to default");
		res.redirect("/");
	} else {
		console.log("util::sendToHome() - prefix found; sending to: " + PATH_PREFIX);
		res.redirect(PATH_PREFIX);
	}
}
