import express, {NextFunction, Request, Response} from "express";
import {getLink, isValidURL, read, write} from "../util";
import {HOST_PREFIX, LINKS_FILE, PATH_PREFIX, USERS_FILE} from "../constants";

const crypto = require("crypto");
const moment = require("moment");

const router = express.Router();

// should be first
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

router.get("/register", (req, res) => {
    res.render("register", {prefix: PATH_PREFIX});
});

router.get("/login", (req, res) => {
    res.render("login", {prefix: PATH_PREFIX});
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log("requireAuth - start");
    let login = false;
    if (typeof (req as any).authUser === "string" && typeof (req as any).authToken === "string") {
        const authUser = (req as any).authUser;
        const authToken = (req as any).authToken;

        const users = read(USERS_FILE);
        const user = users.find(user => user.username === authUser);

        if (user !== null && getHashedPassword(user.password) === authToken) {
            login = true;
            next();
        }
    }
    if (login === false) {
        res.render("login", {
            message: "Please login to continue.",
            messageClass: "alert-danger",
            prefix: PATH_PREFIX
        });
    }
};

router.get("/protected", requireAuth, async function (req, res) {
    console.log("/protected - start;");
    let opts = null;
    if (typeof (req.session as any).opts === "object") {
        console.log("/protected - start; has session opts");
        opts = (req.session as any).opts;
    }

    if (opts === null) {
        console.log("/protected - start; no session opts");
        const links = listLinks((req as any).authUser);
        opts = {
            linkTable: links,
            prefix: PATH_PREFIX,
            HOST: HOST_PREFIX + PATH_PREFIX
        };
    }

    res.render("protected", opts);
});

router.post("/createLink", requireAuth, async function (req, res, next) {
    let {name, url} = req.body;
    console.log("/createLink - start; name: " + name + "; url: " + url);
    const user = (req as any).authUser;

    const answer = function (msg: string, worked: boolean, opts?: any) {
        console.log("/createLink - answer; worked: " + worked + "; msg: " + msg);
        let messageClass = "alert-danger";
        if (worked === true) {
            messageClass = "alert-success";
        }

        if (typeof opts === "undefined") {
            const links = listLinks(user);
            opts = {
                message: msg,
                messageClass: messageClass,
                linkTable: links,
                prefix: PATH_PREFIX
            };
        }
        (req.session as any).opts = opts;
        res.redirect("protected");
        return;
    }

    const links = read(LINKS_FILE);

    if (typeof name === "string" && typeof url === "string") {
        name = name.trim();
        url = url.trim();

        while (name.indexOf("*") >= 0) {
            // transform * into generated chars
            const part = crypto.randomBytes(2).toString("hex");
            name = name.replace("*", part); // replace only does one instance at a time
            console.log("/createLink - replaced *; name: " + name);
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

            console.log("/createLink - final generated name: " + name);
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
        console.log("/createLink - make new; name: " + name + "; url: " + url);

        let dStr = moment().format("YYYY-MM-DD_hh:mm:SS");

        links.push({
            name: name,
            user: user,
            created: dStr,
            url: url
        });
        write(LINKS_FILE, links);

        const opts = {
            message: "Link successfully created:",
            newURL: url,
            newName: name,
            newHost: `${HOST_PREFIX}${PATH_PREFIX}/${name}`,
            messageClass: "alert-success",
            linkTable: links,
            prefix: PATH_PREFIX
        }
        answer("", true, opts);
        return;
    } else {
        console.log("/createLink - outer else");
        return;
    }
});

router.get("/removeLink", async function (req: Request, res: Response, next) {
    let id = req.query.name;
    if (typeof id === "string") {
        id = id.trim();
    } else {
        id = ""; // won't match and will fail
    }

    console.log("/removeLink - start; name: " + id);
    const user = (req as any).authUser;

    const answer = function (msg: string, worked: boolean) {
        console.log("/removeLink - answer; worked: " + worked + "; msg: " + msg);
        let messageClass = "alert-danger";
        if (worked === true) {
            messageClass = "alert-success";
        }
        const links = listLinks(user);
        const opts = {
            message: msg,
            messageClass: messageClass,
            linkTable: links,
            prefix: PATH_PREFIX
        };
        // res.render("protected", opts);
        (req.session as any).opts = opts;
        res.redirect("protected");
        return;
    }

    if (typeof id === "string" && id.length >= 3) {
        const links = listLinks(user);

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
    } else {
        // invalid param
        answer("Cannot remove link.", false);
    }
    // res.json({warning: "delete not yet implemented"});
});

/**
 * Returns all the links for a given user.
 *
 * @param user
 */
function listLinks(user: string): any {
    console.log("listLinks( " + user + " ) - start");
    const ret = [];
    const links = read(LINKS_FILE);
    for (const link of links) {
        if (user === "admin" || link.user === user) {
            // can only see your links (except for admin, who sees all)
            // console.log("\tLINK: " + link);
            ret.push(link);
        }
    }
    console.log("listLinks( " + user + " ) - returning: " + ret.length);
    return ret;
}

router.post("/register", (req, res) => {
    const {username, password, confirmPassword} = req.body;

    // ensure passwords match
    if (password !== confirmPassword) {
        res.render("register", {
            message: "Password does not match.",
            messageClass: "alert-danger",
            prefix: PATH_PREFIX
        });
        return;
    }

    // ensure user does not already exist
    const users = read(USERS_FILE);
    if (users.find(user => user.username === username)) {
        res.render("register", {
            message: "User name registered.",
            messageClass: "alert-danger",
            prefix: PATH_PREFIX
        });
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
    res.render("login", {
        message: "Registration successful. Please login.",
        messageClass: "alert-success",
        prefix: PATH_PREFIX
    });
});

router.post("/login", (req, res) => {
    console.log("logins/ - start");
    const {username, password} = req.body;

    const hashedPassword = getHashedPassword(password);
    // console.log("logins: " + JSON.stringify(req.body));

    const users = read(USERS_FILE);
    const user = users.find(u => {
        return u.username === username && hashedPassword === u.password
    });

    if (user) {
        console.log("logins/ - successful; username: " + username);
        // login successful
        const authToken = getHashedPassword(hashedPassword);

        // Setting the auth details in cookies
        res.cookie("AuthToken", authToken);
        res.cookie("AuthUser", username);

        // Redirect user to the protected page
        res.redirect("protected");
    } else {
        console.log("logins/ - failed; username: " + username);
        res.cookie("AuthToken", "");
        res.cookie("AuthUser", "");

        // login failed
        res.render("login", {
            message: "Invalid username or password.",
            messageClass: "alert-danger",
            prefix: PATH_PREFIX
        });
    }
});

const getHashedPassword = (password: any) => {
    const sha256 = crypto.createHash("sha256");
    const hash = sha256.update(password).digest("base64");
    return hash;
}

export default router;
