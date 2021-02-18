import express, {Request, Response} from "express";
import {getLink} from "../util";
import {PATH_PREFIX} from "../constants";

const router = express.Router();

/**
 * The default route could render a homepage, but we would prefer
 * to send it to a default target, to reduce registration burden
 * on admins.
 */
router.get("/", async function (req, res, next) {
    console.log("/");
    let opts = null;
    if (typeof (req.session as any).opts === "object") {
        console.log("/ - start; has session opts");
        opts = (req.session as any).opts;
    } else {
        console.log("/ - start; no session opts");
        opts = {};
    }
    opts.prefix = PATH_PREFIX;

    res.render("home", opts);
    return;
});


/**
 * Main forwarding route.
 */
router.get("/*", async function (req, res, next) {
    let name = req.path;
    console.log("/* - start; name: " + name);
    name = name.replace(/\/*$/, ""); // Remove trailing slash
    if (name === "") {
        console.log("/* - Name was empty (just a trailing slash)");
        // this is the root folder on a host that is serving from a dir
        sendToDefault(req, res);
        return;
    } else {
        console.log("/* - Name was not empty; name: " + name);
        doRedirect(name, req, res);
    }
});

router.post("/fwd", async function (req, res, next) {
    let name = req.body.name;
    console.log("/fwd - start; name: " + name);
    doRedirect(name, req, res);
});

function doRedirect(name: string, req: Request, res: Response) {
    if (name.startsWith("/")) {
        name = name.substr(1); // trim first slash, if it exists
    }
    const url = getLink(name);

    if (url !== null) {
        // using a meta tag is hacky, just do a proper redirect
        // const redirect = "<meta http-equiv="refresh" content="0; URL="" + url + "" />";
        // res.status(301);
        // res.send(redirect);

        res.redirect(301, url);
    } else {
        sendToDefault(req, res, {
            message: "Name not found: " + name,
            messageClass: "alert-danger"
        });
    }
}

function sendToDefault(req: Request, res: Response, opts?: any) {
    console.log("sendToDefault");

    if (typeof opts === "undefined" || opts === null) {
        opts = {};
    }
    opts.prefix = PATH_PREFIX;

    (req.session as any).opts = opts;
    res.redirect(PATH_PREFIX);
}


export default router;
