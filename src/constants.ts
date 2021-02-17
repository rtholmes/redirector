import path from "path";

require('dotenv').config();

export const SERVER_ROOT = path.join(__dirname, '../');

export const HOST_PREFIX = process.env.HOST_PREFIX as string;
export const PATH_PREFIX = process.env.PATH_PREFIX as string;

export const LINKS_FILE = process.env.LINKS_FILE as string;
export const USERS_FILE = process.env.USERS_FILE as string;
export const LOG_PATH = path.join(SERVER_ROOT, "log");
