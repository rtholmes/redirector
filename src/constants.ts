import path from "path";

require('dotenv').config();

export const HOST_PREFIX = process.env.HOST_PREFIX as string;
export const PATH_PREFIX = process.env.PATH_PREFIX as string;

// not const-for testing
export let LINKS_FILE = process.env.LINKS_FILE as string;
export let USERS_FILE = process.env.USERS_FILE as string;

export const SERVER_ROOT = path.join(__dirname, '../');
export const LOG_PATH = path.join(SERVER_ROOT, "log");
export const STATIC_PATH = path.join(SERVER_ROOT, "public");

export function configureForTesting() {
    const ts = Date.now();
    process.env.LINKS_FILE = process.env.LINKS_FILE + ".test." + ts;
    LINKS_FILE = process.env.LINKS_FILE;
    process.env.USERS_FILE = process.env.USERS_FILE + ".test." + ts;
    USERS_FILE = process.env.USERS_FILE;
}
