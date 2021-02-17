import express, {Response} from "express";
import {getLink} from "../util";

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
    doRedirect(name, res);
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
        res.render("home");
    } else {
        res.render("home", msg);
    }
}

export default router;
