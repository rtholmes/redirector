import express, {Response} from "express";
import {getLink} from "../util";
import {PATH_PREFIX} from "../constants";

const router = express.Router();

/**
 * The default route could render a homepage, but we would prefer
 * to send it to a default target, to reduce registration burden
 * on admins.
 */
router.get("/", async function (req, res, next) {
    console.log("default route");
    // res.render("home");
    // res.json({home: true});
    sendToDefault(res, null);
    return;
});


/**
 * Main forwarding route.
 */
router.get("/*", async function (req, res, next) {
    let name = req.path;
    console.log("/* - start; name: " + name);

    let n = name.replace(/\//g, ""); // remove all /
    let p = PATH_PREFIX.replace(/\//g, ""); // remove all /
    if (n === p) {
        console.log("/* - prefix hit; name: " + name + "; prefix: " + PATH_PREFIX);
        // this is the root folder on a host that is serving from a dir
        sendToDefault(res, null);
        return;
    } else {
        console.log("/* - prefix NOT hit; name: " + name + " (" + n + "); prefix: " + PATH_PREFIX + " (" + p + ")");
        doRedirect(name, res);
    }
});

router.post("/fwd", async function (req, res, next) {
    let name = req.body.name;
    console.log("/fwd - start; name: " + name);
    doRedirect(name, res);
});

function doRedirect(name: string, res: Response) {
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
        // res.json({link: "se.cs.ubc.ca"});
        sendToDefault(res, {
            message: "Name not found: " + name,
            messageClass: "alert-danger"
        });
    }
}

function sendToDefault(res: Response, msg: any | null) {
    console.log("sendToDefault");
    // res.redirect(301, "https://se.cs.ubc.ca/");
    // res.json({link: "se.cs.ubc.ca"});
    if (msg === null) {
        res.render("home", {prefix: "admin/"});
    } else {
        msg.prefix = "admin/";
        res.render("home", msg);
    }
}

export default router;
