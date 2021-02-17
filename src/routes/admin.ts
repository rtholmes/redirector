import express, {NextFunction, Request, Response} from "express";

const crypto = require("crypto");
const moment = require("moment");

import {getLink, isValidURL, read, write} from "../util";

const router = express.Router();

// should be first
router.use((req, res, next) => {
    // Get auth token from the cookies
    const authToken = req.cookies['AuthToken'];
    const authUser = req.cookies['AuthUser'];

    // inject the auth details into request
    (req as any).authToken = authToken;
    (req as any).authUser = authUser;

    // console.log('authCheck: user: ' + JSON.stringify((req as any).authUser));
    // console.log('authCheck: token: ' + JSON.stringify((req as any).authToken));
    next();
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/login', (req, res) => {
    res.render('login');
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log("requireAuth - start");
    let login = false;
    if (typeof (req as any).authUser === "string" && typeof (req as any).authToken === "string") {
        const authUser = (req as any).authUser;
        const authToken = (req as any).authToken;

        const users = read("data/users.json");
        const user = users.find(user => user.username === authUser);

        if (user !== null && getHashedPassword(user.password) === authToken) {
            login = true;
            next();
        }
    }
    if (login === false) {
        res.render('login', {
            message: 'Please login to continue.',
            messageClass: 'alert-danger'
        });
    }
};

router.get('/protected', requireAuth, async function (req, res) {
    const links = listLinks((req as any).authUser); // read("data/links.json");
    res.render('protected', {
        linkTable: links
    });
});

router.post("/createLink", requireAuth, async function (req, res, next) {
    let {name, url} = req.body;
    console.log("/createLink - start; name: " + name + "; url: " + url);

    const links = read("data/links.json");

    if (typeof name === "string" && typeof url === "string") {
        name = name.trim();
        url = url.trim();

        let threeChars = new RegExp("/(.*[a-z]){3}/i");
        if (name.length === 0) {
            // generate name
            // TODO: do this better:
            //   * ensure it at least starts with one char
            //   * ensure the name does not already exist
            // TODO: if name ends in /*, replace * with a generated link
            //   * good for specified prefixes like: cs310/* -> cs310/f32d
            name = crypto.randomBytes(2).toString('hex');
            console.log("/createLink - generated name: " + name);
        } else if (threeChars.test(name) === false) {
            let threeChars = new RegExp("/(.*[a-z]){3}/i");
            res.render('protected', {
                message: 'Name must be > 3 letters (or blank).',
                messageClass: 'alert-danger',
                linkTable: links
            });
            return;
        }

        if (isValidURL(url) === false) {
            // not a valid url
            res.render('protected', {
                message: 'Link must be a valid URL.',
                messageClass: 'alert-danger',
                linkTable: links
            });
            return;
        }

        const exists = getLink(name);
        if (exists !== null) {
            // already exists
            res.render('protected', {
                message: 'Name is already taken.',
                messageClass: 'alert-danger',
                linkTable: links
            });
            return;
        }

        // must be new and valid; make it!
        console.log("/createLink - make new; name: " + name + "; url: " + url);

        let dStr = moment().format('YYYY-MM-DD_hh:mm:SS');

        links.push({
            name: name,
            user: (req as any).authUser,
            created: dStr,
            url: url
        });
        write("data/links.json", links);

        res.render('protected', {
            message: 'Link successfully created:',
            newURL: url,
            newName: name,
            newHost: 'http://localhost:3000/' + name, // TODO: newHost should not be hardcoded
            messageClass: 'alert-success',
            linkTable: links
        });

    } else {
        console.log("/createLink - outer else");
        return;
    }
});

// router.get("/removeLink/:id", async function (req: Request, res: Response, next) {
//     console.log("/list - start");
// });

function createLink(name: string, url: string, user: string, auth: string) {
    console.log("createLink - start");
}

/**
 * Returns all the links for a given user.
 *
 * @param user
 */
function listLinks(user: string): any {
    console.log("listLinks( " + user + " ) - start");
    const ret = [];
    const links = read("data/links.json");
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

router.post('/register', (req, res) => {
    const {username, password, confirmPassword} = req.body;

    // ensure passwords match
    if (password !== confirmPassword) {
        res.render('register', {
            message: 'Password does not match.',
            messageClass: 'alert-danger'
        });
        return;
    }

    // ensure user does not already exist
    const users = read('data/users.json');
    if (users.find(user => user.username === username)) {
        res.render('register', {
            message: 'User name registered.',
            messageClass: 'alert-danger'
        });
        return;
    }

    // store new user with password hash
    const hashedPassword = getHashedPassword(password);
    users.push({
        username: username,
        password: hashedPassword
    });
    write("data/users.json", users);

    // forward to login page
    res.render('login', {
        message: 'Registration successful. Please login.',
        messageClass: 'alert-success'
    });
});

router.post('/login', (req, res) => {
    console.log('logins/ - start');
    const {username, password} = req.body;

    const hashedPassword = getHashedPassword(password);
    // console.log("logins: " + JSON.stringify(req.body));

    const users = read("data/users.json");
    const user = users.find(u => {
        return u.username === username && hashedPassword === u.password
    });

    if (user) {
        console.log('logins/ - successful; username: ' + username);
        // login successful
        const authToken = getHashedPassword(hashedPassword);

        // Setting the auth details in cookies
        res.cookie('AuthToken', authToken);
        res.cookie('AuthUser', username);

        // Redirect user to the protected page
        res.redirect('/protected');
    } else {
        console.log('logins/ - failed; username: ' + username);
        res.cookie('AuthToken', '');
        res.cookie('AuthUser', '');

        // login failed
        res.render('login', {
            message: 'Invalid username or password.',
            messageClass: 'alert-danger'
        });
    }
});

const getHashedPassword = (password: any) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}


export default router;
