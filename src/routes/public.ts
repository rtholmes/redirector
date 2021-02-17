import express, {Request, Response, NextFunction} from 'express';
import {getLink} from "../util";

const router = express.Router();

/**
 * The default route could render a homepage, but we would prefer
 * to send it to a default target, to reduce registration burden
 * on admins.
 */
router.get("/", async function (req, res, next) {
    // res.render('home');
    sendToDefault(res);
});

/**
 * Main forwarding route.
 */
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
        sendToDefault(res);
    }
});

function sendToDefault(res: Response) {
    // TODO: make this a param
    res.redirect(301, "https://se.cs.ubc.ca/");
}

export default router;
