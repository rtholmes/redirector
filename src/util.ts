import fs from "fs";

const URL = require("url").URL;

export const normalizePort = (val: string) => {
    var port = parseInt(val, 10);
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
 * Read JSON data file
 * @param fName
 */
export function read(fName: string): any[] {
    const rawData = fs.readFileSync(fName);
    const data: any = JSON.parse(rawData as any);
    return data;
}

/**
 * Write JSON object to file
 * @param fName
 * @param data
 */
export function write(fName: string, data: any) {
    fs.writeFileSync(fName, JSON.stringify(data));
    return;
}

export function isValidURL(path: string) {
    console.log("isValidURL - start: " + path);
    let url;
    try {
        path = path.trim(); // remove start/trailing whitespace
        path = path.replace(/ /g, ""); // remove all spaces
        url = new URL(path);
    } catch (err) {
        console.log("isValidURL - err NOT valid URL: " + path);
        return false;
    }

    const isValid = url.protocol === "http:" || url.protocol === "https:";
    if (isValid === true) {
        console.log("isValidURL - IS valid URL: " + path);
    } else {
        console.log("isValidURL - NOT valid URL: " + path);
    }
    return isValid;
}

/**
 * Get the link to follow. If it does not exist, return null.
 *
 * @param name
 */
export function getLink(name: string): string | null {
    console.log("getLink( " + name + " ) - start");
    const links = read("data/links.json");
    for (const link of links) {
        // console.log("getLink( " + name + " ) - name: " + link.name);
        if (link.name === name) {
            console.log("getLink( " + name + " ) - found: " + link.url);
            return link.url;
        }
    }
    console.log("getLink( " + name + " ) - NOT found");
    return null;
}
