import express, {Request, Response} from "express";

import {clearSession, getLink, sendToHome} from "../util";
import {isTestEnvironment, PATH_PREFIX} from "../constants";
import {setLoggedOut} from "./admin";

const router = express.Router();

/**
 * The default home page provides a simple view for entering a short link.
 */
router.get("/", async function (req, res, next) {
    console.log("public::GET / - start");
    let opts = null;

    if (typeof (req.session as any).opts === "object") {
        console.log("public::GET / - start; has session opts");
        opts = (req.session as any).opts;
        clearSession(req);
    } else {
        console.log("public::GET / - start; no session opts");
        opts = {};
    }
    opts.prefix = PATH_PREFIX;
    setLoggedOut(opts, req);

    console.log("public::GET / - rendering with opts: " + JSON.stringify(opts));
    res.render("home", opts);
    return;
});

/**
 * Main forwarding route.
 */
router.get("/*", async function (req, res, next) {
    let name = req.path;
    console.log("public::GET /* - start; name: " + name);
    sendToRedirect(name, req, res);
});

/**
 * Route used by the submit button on the homepage.
 */
router.post("/fwd", async function (req, res, next) {
    let name = req.body.name;
    console.log("public::POST /fwd - start; name: " + name);
    sendToRedirect(name, req, res);
});

function cleanName(name: string): string {
    if (typeof name === "string") {
        name = name.replace(/\/*$/, ""); // Remove trailing slash
        if (name.startsWith("/")) {
            name = name.substr(1); // trim first slash, if it exists
        }
    }
    return name;
}

function sendToRedirect(name: string, req: Request, res: Response) {
    name = cleanName(name);
    console.log("public::sendToRedirect(..) - start; name: " + name + "; prefix: " + PATH_PREFIX);

    const url = getLink(name);
    if (url !== null) {
        // prefer redirect over a meta hack
        console.log("public::sendToRedirect(..) - found; name: " + name);
        res.redirect(301, url);
    } else {
        let opts = (req.session as any).opts || {};
        console.log("public::sendToRedirect(..) - not found; initial opts: " + JSON.stringify(opts));

        opts.message = "Name not found: " + name;
        opts.messageClass = "alert-danger";
        opts.prefix = PATH_PREFIX;

        setLoggedOut(opts, req);

        (req.session as any).opts = opts;
        console.log("public::sendToRedirect(..) - not found; opts: " + JSON.stringify(opts));

        sendToHome(res, opts);
    }
}

export default router;
