import express, {NextFunction, Request, Response} from "express";
import fs from "fs";

const router = express.Router();

// should be first
router.use((req, res, next) => {
    // Get auth token from the cookies
    const authToken = req.cookies['AuthToken'];
    const authUser = req.cookies['AuthUser'];

    // Inject the user to the request
    // @ts-ignore
    // req.authToken = authTokens[authToken];
    (req as any).authToken = authToken; // authTokens[authToken];
    (req as any).authUser = authUser;
    // console.log('auth token: '+JSON.stringify(req.cookies));
    console.log('authCheck: user: ' + JSON.stringify((req as any).authUser));
    console.log('authCheck: token: ' + JSON.stringify((req as any).authToken));

    next();
});

// GET index (show nothing)
router.get("/", async function (req, res, next) {
    // TODO: redirect to https://se.cs.ubc.ca/
    res.render('home');
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
    const links = read("data/links.json");
    res.render('protected', {
        linkTable: links
    });
});

router.post("/createLink", requireAuth, async function (req, res, next) {
    const {name, url} = req.body;
    console.log("/createLink - start; name: " + name + "; url: " + url);

    const links = read("data/links.json");

    if (typeof name === "string" && typeof url === "string") {
        const exists = getLink(name);

        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            // not a valid url
            res.render('protected', {
                message: 'Link must start with http or https.',
                messageClass: 'alert-danger',
                linkTable: links
            });
            return;
        }

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

        links.push({
            name: name,
            user: (req as any).authUser,
            created: new Date().toDateString()+" "+new Date().toLocaleTimeString(), // TODO: better date format
            url: url
        });
        write("data/links.json", links);

        res.render('protected', {
            message: 'Link successfully created.',
            messageClass: 'alert-success',
            linkTable: links
        });

    } else {
        console.log("/createLink - outer else");
        return;
    }
});

router.get("/removeLink/:id", async function (req: Request, res: Response, next) {
    console.log("/list - start");
});

router.get("/list", async function (req: Request, res: Response, next) {
    // res.render("index", { title: "Express LIST PAGE" });
    console.log("/list - start; path: " + req.path + "; params: " +
        JSON.stringify(req.params) + "; query: " + JSON.stringify(req.query));

    const login = getAuth(req);
    if (login !== null && isAuthorized(login.user, login.auth)) {
        console.log("/list - authorized");
        const body = listLinks(login.user);
        res.json({list: body}); // forward to "https://se.cs.ubc.ca"
    } else {
        console.log("/list - NOT authorized");
        res.json({list: "listPageNOTAUTH"}); // forward to "https://se.cs.ubc.ca"
    }
});

// GET link (forward to link)
router.get("/*", async function (req, res, next) {
    let name = req.path;
    if (name.startsWith("/")) {
        name = name.substr(1); // trim first slash, if it exists
    }
    const url = getLink(name);

    if (url !== null) {
        // using a meta tag is hacky, just do a proper redirect
        // const redirect = '<meta http-equiv="refresh" content="0; URL="' + url + '" />';
        // res.status(301);
        // res.send(redirect);

        res.redirect(301, url);
    } else {
        res.json({link: 'se.cs.ubc.ca'});
    }
});

function getAuth(req: Request): { user: string, auth: string } | null {
    // TODO: follow this: https://stackabuse.com/handling-authentication-in-express-js/
    // this is not great, but for now just use appended query args
    if (req.query && req.query.user && req.query.auth) {
        return {user: req.query.user, auth: req.query.auth};
    }
    return null;
}

/**
 * Get the link to follow. If it does not exist, return null.
 *
 * @param name
 */
function getLink(name: string): string | null {
    console.log("getLink( " + name + " ) - start");
    const links = read("data/links.json");
    for (const link of links) {
        console.log("getLink( " + name + " ) - name: " + link.name);
        if (link.name === name) {
            console.log("getLink( " + name + " ) - found: " + link.url);
            return link.url;
        }
    }
    console.log("getLink( " + name + " ) - NOT found");
    return null;
}

/**
 *
 *
 * MOVE INTO AUTH
 *
 *
 */

function isAuthorized(user: string, auth: string) {
    console.log("isAuthorized( " + user + ", " + auth + " ) - start");
    const users = read("data/users.json");
    for (const u of users) {
        // console.log("\t" + JSON.stringify(u));
        if (u.user === user && u.auth === auth) {
            console.log("isAuthorized() - match for: " + user);
            return true;
        }
    }
    console.log("isAuthorized() - NO match for: " + user);
    return false;
}

function createLink(name: string, url: string, user: string, auth: string) {
    console.log("createLink - start");
}


function listLinks(user: string): any {
    console.log("listLinks( " + user + " ) - start");
    const ret = [];
    const links = read("data/links.json");
    for (const link of links) {
        if (user === "admin" || link.user === user) {
            // can only see your links (except for admin, who sees all)
            console.log("\tLINK: " + link);
            ret.push(link);
        }
    }
    return ret;
}

/**
 *
 *
 * MOVE INTO UTIL
 *
 *
 */

/**
 * Read JSON data file
 * @param fName
 */
function read(fName: string): any[] {
    const rawData = fs.readFileSync(fName);
    const data: any = JSON.parse(rawData as any);
    return data;
}

/**
 * Write JSON object to file
 * @param fName
 * @param data
 */
function write(fName: string, data: any) {
    fs.writeFileSync(fName, JSON.stringify(data));
    return;
}


const crypto = require('crypto');

const getHashedPassword = (password: any) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}


// const users = [
//     // This user is added to the array to avoid creating a new user on each restart
//     {
//         firstName: 'John',
//         lastName: 'Doe',
//         email: 'johndoe@email.com',
//         // This is the SHA256 hash for value of `password`
//         password: 'XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg='
//     }
// ];

router.post('/register', (req, res) => {
    const {username, password, confirmPassword} = req.body;
    // const {email, firstName, lastName, password, confirmPassword} = req.body;

    const users = read('data/users.json');
    // Check if the password and confirm password fields match
    if (password === confirmPassword) {

        // Check if user with the same email is also registered
        if (users.find(user => user.username === username)) {

            res.render('register', {
                message: 'User already registered.',
                messageClass: 'alert-danger'
            });

            return;
        }

        const hashedPassword = getHashedPassword(password);

        // Store user into the database if you are using one
        users.push({
            username: username,
            password: hashedPassword
        });
        write("data/users.json", users);

        res.render('login', {
            message: 'Registration Complete. Please login to continue.',
            messageClass: 'alert-success'
        });
    } else {
        res.render('register', {
            message: 'Password does not match.',
            messageClass: 'alert-danger'
        });
    }
});

router.post('/login', (req, res) => {
    console.log('logins/ - start');
    const {username, password} = req.body;
    const hashedPassword = getHashedPassword(password);
    console.log("logins: " + JSON.stringify(req.body));

    const users = read("data/users.json");
    const user = users.find(u => {
        return u.username === username && hashedPassword === u.password
    });

    if (user) {
        console.log('logins/ - successful; username: ' + username);
        // login successful
        const authToken = getHashedPassword(hashedPassword);

        // Setting the auth token in cookies
        res.cookie('AuthToken', authToken);
        res.cookie('AuthUser', username);

        // console.log("login user: " + username);
        // console.log("login token: " + authToken);

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

export default router;
