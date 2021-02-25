# Redirector

This is a simple URL forwarding service configured for self hosting. It can generate random short URLs (e.g., `/r32xd`), named URLs (e.g., `/party/june2`), or a combination (e.g., `/prefix/r3ce2`).

The goal of the project is to be relatively simple (it is backed by `.json` files instead of a database), but to allow:

* Self-registration
* Login
* Link creation/deletion/modification
* An admin view for managing links 

Users can only modify the links they create.

## Docker

If you are using this in a dockerized environment under a prefix (say `go/`) the following `nginx.conf` rewrite rule may be uesful:

```
location /go {
    port_in_redirect   off;
    rewrite            ^/go(/.*) $1 break;
    rewrite            ^/go$ / break;
    proxy_read_timeout 240;
    proxy_pass         http://redirector:3000;
}
```

## Development

This project was created using [create-express-typescript-app](https://www.npmjs.com/package/express-generator-typescript) which was invoked by calling `npx express-generator-typescript`.

The test suites should all pass when run locally.

### Pre-requisites

* `node v10.15.3+`
* `yarn v1.12+`
* `docker v18.01+` (if using docker image)

### Available commands

* `yarn start` Start a development server.
* `yarn test` Run the test suite.
* `yarn cover` Collect coverage data.
* `yarn build` To create compiled version for prod. 
* `yarn start-prod` To run in production.
* `yarn stop-prod -- <id>` To stop in production.
