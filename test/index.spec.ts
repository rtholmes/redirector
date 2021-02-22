import "mocha";
import chai, {expect} from "chai";
import chaiHttp from "chai-http";

import {configureForTesting, configurePrefixForTesting, LINKS_FILE, PATH_PREFIX, USERS_FILE} from "../src/constants";
import Server from "../src/server";

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
                const res = await agent.post('/admin/register')
                    .send({username: 'test', password: 'testPW', confirmPassword: 'testPW'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Registration successful. Please login./);
            });

            it("fails with non-matching passwords", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/register')
                    .send({username: 'foo', password: 'bar', confirmPassword: 'barX'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Passwords do not match./);
            });

            it("fails with already existing user", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/register')
                    .send({username: 'test', password: 'testPW', confirmPassword: 'testPW'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/User name registered./);
            });
        });

        describe("login", () => {

            it("fails with bad user/pass", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/login')
                    .send({username: 'foo', password: 'bar'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Invalid username or password./);
            });

            it("succeeds with good credentials", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/login')
                    .send({username: 'test', password: 'testPW'});

                console.log(res.header);

                expect(res).to.have.status(200);
            });
        });

        describe("link creation", () => {

            it("fails when user not logged in", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
                    // .set('Cookie', 'cookieName=cookieValue;otherName=otherValue')
                    .send({name: 'test', password: 'https://se.cs.ubc.ca/'});

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Please login to continue./);
            });

            it("fails when user incorrectly logged in", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=BADTOKEN')
                    .send({name: 'test', password: 'https://se.cs.ubc.ca/'});

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Please login to continue./);
            });

            it("fails when name is too short", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 't', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name must be &gt; 3 letters \(or blank\)./);
            });

            it("fails when name starts with admin", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'admin/test', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name cannot start with &#x27;admin&#x27;./);
            });

            it("fails when url is not valid", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'test/**', url: 'google.ca'}); // need http/https

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Link must be a valid URL./);
            });

            it("succeeds with valid values", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')
                    .send({name: 'test', url: 'https://se.cs.ubc.ca/'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Link successfully created./);
                expect(res.text).to.match(/http:\/\/localhost:3000\/test/);
            });

            it("succeeds with valid wildcard values", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/admin/createLink')
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
                const res = await agent.post('/admin/createLink')
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
                const res = await agent.get('/test').send().redirects(0);

                console.log(res.header);
                expect(res).to.have.status(301);
                expect(res.header.location).to.equal("https://se.cs.ubc.ca/")
            });

            it("successfully redirects with fwd/", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/fwd')
                    .send({name: 'test'})
                    .redirects(0);

                console.log(res.header);
                expect(res).to.have.status(301);
                expect(res.header.location).to.equal("https://se.cs.ubc.ca/")
            });


            it("successfully renders with /", async () => {
                const res = await chai.request(app).get('/');

                expect(res).to.have.status(200);
                expect(res.text).to.not.match(/alert/);
                expect(res.text).to.match(/Enter Name/);
            });

            it("fail to redirect with invalid /", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get('/NOTTHERE').send();

                console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name not found: NOTTHERE/);
            });

            it("fails to redirect with invalid fwd/", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.post('/fwd')
                    .send({name: 'NOTTHERE'});

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Name not found: NOTTHERE/);
            });

        });

        describe("link deletion", () => {

            it("fails without credentials", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get('/admin/removeLink?name=test')
                    .set('Cookie', 'AuthUser=test;AuthToken=BADAUTH')

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Please login to continue./);
            });

            it("fails when name does not exist", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                const res = await agent.get('/admin/removeLink?name=DOESNOTEXIST')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-danger/);
                expect(res.text).to.match(/Cannot remove this link as it does not exist./);
            });

            it("succeeds when link exists", async () => {
                const agent = chai.request.agent(app); // agent supports sessions
                // TODO: look at number of links before
                const res = await agent.get('/admin/removeLink?name=test')
                    .set('Cookie', 'AuthUser=test;AuthToken=tlLWP9ko6JrJVdyNjJe/BOjd2HuBP3BQS6/kkc4LKgs=')

                // console.log(res.text);

                expect(res).to.have.status(200);
                expect(res.text).to.match(/alert alert-success/);
                expect(res.text).to.match(/Link removed./);
                // TODO: look at number of links after is one fewer
            });

            it.skip("fails when link is not yours to delete", async () => {
                // TODO: look at number of links before
                // TODO: look at number of links after is the same
            });
        });

    });
}

runTests("Default", true);
runTests("Prefix", false);

export {};
