import express, {NextFunction, Request, Response} from "express";

import {clearSession, getLink, isValidURL, read, write} from "../util";
import {HOST_PREFIX, LINKS_FILE, PATH_PREFIX, USERS_FILE} from "../constants";
import {Link, User} from "types";

const crypto = require("crypto");
const moment = require("moment");

const router = express.Router();

/**
 * Check injected auth and user to make sure they correspond to valid
 * users and passwords. This is checked on every admin request.
 *
 * If successful, the request is passed to the next handler. If not,
 * the user is forwarded to the login page.
 *
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log("requireAuth - start");
    let login = false;

    const authUser = req.cookies.AuthUser;
    const authToken = req.cookies.AuthToken;
    if (typeof authUser === "string" && typeof authToken === "string") {
        // console.log("requireAuth - cookies: " + JSON.stringify(req.cookies));

        const users = read(USERS_FILE) as User[];
        const user = users.find(user => user.username === authUser);

        // for debugging
        // if (user) {
        //     console.log("comparing hpw: " + getHashedPassword(user.password) + "; token: " + authToken);
        // }

        if (user && getHashedPassword(user.password) === authToken) {
            // login successful
            console.log("requireAuth - success; user: " + authUser);
            login = true;
            next();
        } else {
            console.log("requireAuth - nope");
        }
    } else {
        // cookies missing
        console.log("requireAuth - cookies missing; authUser: " + authUser + "; authToken: " + authToken);
    }

    if (login === false) {
        goPage(req, res, "login", "Please login to continue.", false);
        // NOTE: next() is _NOT_ called here to stop request chain.
    }
};

/**
 * Should be first in the admin router; injects auth info into all subsequent calls
 */
router.use((req, res, next) => {
    // Get auth token from the cookies
    const authToken = req.cookies["AuthToken"];
    const authUser = req.cookies["AuthUser"];

    // inject the auth details into request
    (req as any).authToken = authToken;
    (req as any).authUser = authUser;

    // console.log("authCheck: user: " + JSON.stringify((req as any).authUser));
    // console.log("authCheck: token: " + JSON.stringify((req as any).authToken));
    next();
});

/**
 * Display the register page.
 */
router.get("/register", (req, res) => {
    let opts = (req.session as any).opts || {};
    opts.prefix = PATH_PREFIX;
    console.log("GET /register; opts: " + JSON.stringify(opts));
    res.render("register", opts);
});

/**
 * Display the login page.
 */
router.get("/login", (req, res) => {
    let opts = (req.session as any).opts || {};
    opts.prefix = PATH_PREFIX;
    console.log("GET /login; opts: " + JSON.stringify(opts));
    res.render("login", opts);
});

router.get("/links", requireAuth, async function (req, res) {
    console.log("GET /links - start;");
    let opts = null;
    if (typeof (req.session as any).opts === "object") {
        console.log("GET /links - start; has session opts");
        opts = (req.session as any).opts;
        clearSession(req);
    }

    if (opts === null || opts.target !== "links") {
        console.log("GET /links - start; no session opts");
        const links = listLinks((req as any).authUser);
        opts = {
            linkTable: links
        };
    }
    opts.prefix = PATH_PREFIX;
    opts.HOST = HOST_PREFIX + PATH_PREFIX;

    opts.target = "links";
    res.render("links", opts);
});

router.post("/createLink", requireAuth, async function (req, res, next) {
    let {name, url} = req.body;
    console.log("POST /createLink - start; name: " + name + "; url: " + url);

    if (typeof name !== "string" || typeof url !== "string") {
        console.log("POST /createLink - name: " + name + "; url: " + url);
        goPage(req, res, "links", "Required params missing.", false);
        return;
    }

    const user = (req as any).authUser;

    const answer = function (msg: string, worked: boolean, opts?: any) {
        console.log("POST /createLink - answer; msg: " + msg + "; worked: " + worked);
        if (typeof opts === "undefined") {
            opts = {};
        }
        console.log("POST /createLink - answer; opts: " + JSON.stringify(opts)); // before linktable for size
        opts.linkTable = listLinks(user);
        goPage(req, res, "links", msg, worked, opts);
    }

    const links = read(LINKS_FILE) as Link[];

    name = name.trim();
    url = url.trim();

    console.log("POST /createLink - verifying; name: " + name + "; url: " + url);

    while (name.indexOf("*") >= 0) {
        // transform * into generated chars
        const part = crypto.randomBytes(2).toString("hex");
        name = name.replace("*", part); // replace only does one instance at a time
        console.log("POST /createLink - replaced *; name: " + name);
    }

    if (name.length === 0) {
        // generate name (does not check for collisions)
        name = crypto.randomBytes(2).toString("hex");
        name = name.toLowerCase(); // easier typing on mobile
        if (/^[a-z]/i.test(name) === false) {
            // ensure name starts with a letter
            const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
            name = letter + name.substr(1);
        }

        console.log("POST /createLink - final generated name: " + name);
    } else if (name.length < 3) {
        // let threeChars = new RegExp("/(.*[a-z]){3}/i");
        answer("Name must be > 3 letters (or blank).", false);
        return;
    }

    if (/^\/?admin\//.test(name)) {
        // admin/* is for Redirector
        answer("Name cannot start with 'admin'.", false);
        return;
    }

    if (isValidURL(url) === false) {
        // not a valid url
        answer("Link must be a valid URL.", false);
        return;
    }

    const exists = getLink(name);
    if (exists !== null) {
        // already exists
        answer("Name is already taken. To modify, delete existing link and create again.", false);
        return;
    }

    // must be new and valid; make it!
    console.log("POST /createLink - make new; name: " + name + "; url: " + url);

    // let dStr = moment().format("YYYY-MM-DD_hh:mm:SS");
    let dStr = moment().format(); // 24h time, show UTC offset

    links.push({
        name: name,
        user: user,
        created: dStr,
        url: url
    });
    write(LINKS_FILE, links);

    const opts = {
        newURL: url,
        newName: name,
        newHost: `${HOST_PREFIX}${PATH_PREFIX}/${name}`
    }
    answer("Link successfully created:", true, opts);
    return;
});

router.get("/removeLink", requireAuth, async function (req: Request, res: Response, next) {
    let id = req.query.name;

    if (typeof id !== "string") {
        console.log("GET /removeLink - id: " + id);
        goPage(req, res, "links", "Required params missing.", false);
        return;
    }

    id = id.trim();
    console.log("/removeLink - start; name: " + id);
    const user = (req as any).authUser;

    const answer = function (msg: string, worked: boolean, opts?: any) {
        console.log("/removeLink - answer; msg: " + msg + "; worked: " + worked);
        if (typeof opts === "undefined") {
            opts = {};
        }
        opts.linkTable = listLinks(user);
        goPage(req, res, "links", msg, worked, opts);
    }

    if (id.length >= 3) {
        const links = read(LINKS_FILE) as Link[]; // read _all_ links

        const linkExists = links.filter(function (innerLink: any) {
            return innerLink.name === id;
        });

        console.log("/removeLink - linkExists: " + JSON.stringify(linkExists));
        if (linkExists === null || linkExists.length !== 1) {
            // does not exist
            answer("Cannot remove this link as it does not exist.", false);
        } else if (user !== "admin" && linkExists[0].user !== user) {
            // owned by another user (unless admin)
            answer("Cannot remove this link as it was created by another user.", false);
        } else {
            // delete
            console.log("/removeLink - before deletion: " + links.length);
            const newLinks = links.filter(function (innerLink: any) {
                return innerLink.name !== id;
            });
            console.log("/removeLink - after deletion: " + newLinks.length);
            write(LINKS_FILE, newLinks);

            answer("Link removed.", true);
        }
    }
});

router.post("/register", (req, res) => {
    const {username, password, confirmPassword} = req.body;

    const answer = function (msg: string) {
        console.log("/register - answer; msg: " + msg);
        goPage(req, res, "register", msg, false);
    }

    if (typeof username === "undefined" || typeof password === "undefined" || typeof confirmPassword === "undefined") {
        console.log("POST /register - username: " + username + "; password: " + password + "; confirm: " + confirmPassword);
        answer("Required params missing.");
        return;
    }

    // ensure passwords match
    if (password !== confirmPassword) {
        answer("Passwords do not match.");
        return;
    }

    // ensure user does not already exist
    const users = read(USERS_FILE) as User[];
    if (users.find(user => user.username === username)) {
        answer("User name registered.");
        return;
    }

    // store new user with password hash
    const hashedPassword = getHashedPassword(password);
    users.push({
        username: username,
        password: hashedPassword
    });
    write(USERS_FILE, users);

    // forward to login page
    goPage(req, res, "login", "Registration successful. Please login.", true);
});

/**
 * Login route. Does not require `requireAuth` because the user is not
 * authenticated yet. If successful, forward to the protected resource,
 * if not, forward back to the login page.
 */
router.post("/login", (req, res) => {
    const {username, password} = req.body;
    console.log("logins/ - start; username: " + username);

    if (typeof username === "undefined" || typeof password === "undefined") {
        console.log("POST /login - username: " + username + "; password: " + password);
        goPage(req, res, "login", "Required params missing.", false);
        return;
    }

    const hashedPassword = getHashedPassword(password);

    const users = read(USERS_FILE) as User[];
    const user = users.find(u => {
        return u.username === username && hashedPassword === u.password
    });

    if (user) {
        console.log("logins/ - successful; username: " + username);

        // Setting the auth cookie details
        const authToken = getHashedPassword(hashedPassword);
        res.cookie("AuthToken", authToken);
        res.cookie("AuthUser", username);

        // Redirect user to the links page
        res.redirect("links");
    } else {
        console.log("logins/ - failed; username: " + username);

        // Clear the auth cookie details
        res.cookie("AuthToken", "");
        res.cookie("AuthUser", "");

        // login failed
        goPage(req, res, "login", "Invalid username or password.", false);
    }
});

/**
 * Returns all the links for a given user.
 *
 * @param user
 */
function listLinks(user: string): any {
    console.log("listLinks( " + user + " ) - start");
    const ret = [];
    const links = read(LINKS_FILE) as Link[];
    for (const link of links) {
        if (user === "admin" || link.user === user) {
            // a user can only see their links (except for admin, who sees all)
            ret.push(link);
        }
    }
    console.log("listLinks( " + user + " ) - returning: " + ret.length);
    return ret;
}

/**
 * Passwords are stored hashed on disk.
 *
 * Tokens are just hashes of the password hash (should probably
 * actually be a hash of the password hash combined with a secret
 * that is regenerated on each server launch).
 *
 * @param password
 */
const getHashedPassword = (password: any) => {
    const sha256 = crypto.createHash("sha256");
    const hash = sha256.update(password).digest("base64");
    return hash;
}


function goPage(req: Request, res: Response, target: string, msg: string, worked: boolean, opts?: any) {
    console.log("/goPage - answer; worked: " + worked + "; msg: " + msg);
    let messageClass = "alert-danger";
    if (worked === true) {
        messageClass = "alert-success";
    }

    if (typeof opts === "undefined") {
        opts = {};
    }

    // set if provided
    if (msg !== null) {
        opts.message = msg;
        opts.messageClass = messageClass;
    }

    // set for all
    opts.prefix = PATH_PREFIX;

    opts.target = target;
    (req.session as any).opts = opts;
    res.redirect(target);
    return;
}

export default router;
