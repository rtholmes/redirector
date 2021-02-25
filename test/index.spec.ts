import "mocha";
import chai, {expect} from "chai";
import chaiHttp from "chai-http";

import {configureForTesting, configurePrefixForTesting, LINKS_FILE, PATH_PREFIX, USERS_FILE} from "../src/constants";
import Server from "../src/server";
import {read} from "../src/util";

chai.use(chaiHttp);

// tests are encapsulated in a function so we can run them twice
// once with a prefix and once without

const runTests = function (title: string, noPrefix: boolean) {
    describe(title + " path Redirector tests", () => {

        console.log("declaring test vars");
        let server: Server;
        let app: Express.Application;
        console.log("test vars declared");

        before(function () {
            // runs once before the first test in this block
            console.log("before - updating env");
            configureForTesting();
            if (noPrefix === false) {
                configurePrefixForTesting();
            }
            console.log("pathPrefix: " + PATH_PREFIX);
            console.log("users file: " + USERS_FILE);
            console.log("links file: " + LINKS_FILE);
            console.log("before - env updated");
            console.log("before - starting server");
            server = new Server();
            app = server.getApp();
            server.start();
            console.log("before - server started");
        });

        after(async function () {
            await server.shutDown();
        });

        describe("registration", () => {

            it("succeeds with valid values", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const startUserCount = read(USERS_FILE).length;
                const res = await agent.post(PATH_PREFIX + '/admin/register')
                    .send({username: 'test', password: 'testPW', confirmPassword: 'testPW'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Registration successful. Please login./);
                const endUserCount = read(USERS_FILE).length;
                expect(endUserCount).to.equal(startUserCount + 1);
            });

            it("fails when required params missing", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/register')
                    .send({wrongkey: 'foo', password: 'bar', confirmPassword: 'bar'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Required params missing./);
            });

            it("fails with non-matching passwords", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/register')
                    .send({username: 'foo', password: 'bar', confirmPassword: 'barX'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Passwords do not match./);
            });

            it("fails with already existing user", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/register')
                    .send({username: 'test', password: 'testPW', confirmPassword: 'testPW'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/User name registered./);
            });
        });

        describe("login", () => {

            it("fails with bad user/pass", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/login')
                    .send({username: 'foo', password: 'bar'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Invalid credentials./);
            });

            it("fails when required params missing", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/login')
                    .send({badkey: 'test', password: 'testPW'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Required params missing./);
            });

            it("succeeds with good credentials", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/login')
                    .send({username: 'test', password: 'testPW'});

                // console.log(res.header);
                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/Create New Link/); // should be on links page
            });

            it("succeeds at logging out", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get(PATH_PREFIX + '/admin/logout')
                    .send({username: 'test', password: 'testPW'});

                console.log(res.header);
                console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/Go!/); // should be on /
            });
        });

        describe("link creation", () => {

            it("fails when user not logged in", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    // .set('Cookie', 'cookieName=cookieValue;otherName=otherValue')
                    .send({name: 'test', password: 'https://se.cs.ubc.ca/'});

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Please login to continue./);
            });

            it("fails when user incorrectly logged in", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=BADTOKEN')
                    .send({name: 'test', password: 'https://se.cs.ubc.ca/'});

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Please login to continue./);
            });

            it("fails when required params are not present", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({wrongkey: 't', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Required params missing./);
            });

            it("fails when name is too short", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 't', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name must be &gt; 3 letters \(or blank\)./);
            });

            it("fails when name starts with admin", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'admin/test', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name cannot start with &#x27;admin&#x27;./);
            });

            it("fails when url is not valid", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'test/**', url: 'google.ca'}); // need http/https

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Link must be a valid URL./);
            });

            it("succeeds with valid values", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const startLinkCount = read(LINKS_FILE).length;
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'test', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Link successfully created./);
                expect(res.text).to.match(/http:\/\/localhost:3000\/test/);
                const endLinkCount = read(LINKS_FILE).length;
                expect(endLinkCount).to.equal(startLinkCount + 1);
            });

            it("succeeds with valid wildcard values", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'test/deep/*/*/deeperthings/*', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Link successfully created./);
                let m = "http:\/\/localhost:3000\/" + PATH_PREFIX + "test\/deep";
                expect(res.text).to.match(/m/);
                expect(res.text).to.match(/deeperthings\//);
            });

            it("fails when link already exists", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'test', url: 'https://se.cs.ubc.ca/ALTERNATE'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name is already taken./);
            });
        });

        describe("public routes", () => {

            it("successfully redirects with /test", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get(PATH_PREFIX + '/test').send().redirects(0);

                console.log(res.header);
                expect(res).to.have.status(301);
                expect(res.header.location).to.equal("https://se.cs.ubc.ca/")
            });

            it("successfully redirects with fwd/", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/fwd')
                    .send({name: 'test'})
                    .redirects(0);

                console.log(res.header);
                expect(res).to.have.status(301);
                expect(res.header.location).to.equal("https://se.cs.ubc.ca/")
            });

            it("successfully renders with /", async () => {
                const res = await chai.request(app).get(PATH_PREFIX + '/');

                expect(res).to.have.status(200);
                expect(res.text).to.not.match(/alert/);
                expect(res.text).to.match(/Enter Name/);
            });

            it("successfully gets the static images", async () => {
                const images = [
                    'icon.png',
                    'github.png',
                    'key.png',
                    'trash.png'
                ]

                for (const image of images) {
                    // This is confusing:
                    // when PATH_PREFIX is set, it will be injected into the hbs views
                    // so this should be PATH_PREFIX + '/admin/...'
                    // but: nginx rewrite actually takes care of the prefix
                    // so the system (less the views) is unaware of it
                    const res = await chai.request(app).get(PATH_PREFIX + '/admin/static/' + image);
                    // console.log(res.header);
                    expect(res).to.have.status(200);
                    expect(res.header["content-type"]).to.equal("image/png");
                    expect(Number(res.header["content-length"])).to.be.greaterThan(3000);
                    expect(Number(res.header["content-length"])).to.be.lessThan(13000);
                    console.log("worked: " + image);
                }
            });

            it("successfully redirects to / with invalid fwd name", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/fwd')
                    .send({name: 'DOESNOTEXIST'});

                console.log(res.header);
                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name not found: DOESNOTEXIST/);
            });

            it("fail to redirect with invalid /", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get(PATH_PREFIX + '/NOTTHERE').send();

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name not found: NOTTHERE/);
            });

            it("fails to redirect with invalid fwd/", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post(PATH_PREFIX + '/fwd')
                    .send({name: 'NOTTHERE'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name not found: NOTTHERE/);
            });

        });

        describe("link deletion", () => {

            it("fails without credentials", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get(PATH_PREFIX + '/admin/removeLink?name=test')
                    .set('Cookie', 'AuthUser=test;AuthToken=BADAUTH')

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Please login to continue./);
            });

            it("fails when name does not exist", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get(PATH_PREFIX + '/admin/removeLink?name=DOESNOTEXIST')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Cannot remove this link as it does not exist./);
            });

            it("fails without required params", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get(PATH_PREFIX + '/admin/removeLink?wrongkey=test')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Required params missing./);
            });

            it("succeeds when link exists", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const startLinkCount = read(LINKS_FILE).length;
                const res = await agent.get(PATH_PREFIX + '/admin/removeLink?name=test')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Link removed./);
                const endLinkCount = read(LINKS_FILE).length;
                expect(endLinkCount).to.equal(startLinkCount - 1);
            });

            it.skip("fails when link is not yours to delete", async () => {
                // TODO: look at number of links before
                // TODO: look at number of links after is the same
            });
        });

    });
}

// run the tests with no prefix (e.g., http://localhost/)
runTests("Default", true);
// run the tests with a prefix (e.g., http://localhost/prefix)
runTests("Prefix", false);

