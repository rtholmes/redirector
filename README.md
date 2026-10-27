# Redirector

This is a simple URL forwarding service configured for self hosting. It can generate random short URLs (e.g., `/r32xd`), named URLs (e.g., `/party/june2`), or a combination (e.g., `/prefix/r3ce2`).

The goal of the project is to be relatively simple (it is backed by `.json` files instead of a database), but to allow:

* Self-registration
* Login
* Link creation/deletion/modification
* An admin view for managing links

Users can only modify the links they create. The user named `admin` can see and delete every link, so register that account yourself before opening the service to others.

## Configuration

The server reads four environment variables. For local development they come from the `.env` file in this repository; in Docker they come from the compose file or `docker run -e`.

| Variable | Meaning |
|---|---|
| `HOST_PREFIX` | Public origin, no trailing slash (e.g., `https://se.cs.ubc.ca`) |
| `PATH_PREFIX` | Path the service is mounted under, no trailing slash (e.g., `/go`); empty for the root |
| `LINKS_FILE` | Path to the links data file |
| `USERS_FILE` | Path to the users data file |

Both data files hold JSON arrays and are created as `[]` if missing. Every change also writes a timestamped `.bak` copy next to the file.

## Docker

If you are using this in a dockerized environment under a prefix (say `go/`) the following `nginx.conf` rewrite rule may be useful:

```
location /go {
    port_in_redirect   off;
    rewrite            ^/go(/.*) $1 break;
    rewrite            ^/go$ / break;
    proxy_read_timeout 240;
    proxy_pass         http://redirector:3000;
}
```

The app trusts one proxy in front of it, so access logs record the visitor's address from `X-Forwarded-For`.

### Running the image locally

```
docker build -t redirector .
docker run -p 3000:3000 \
  -e HOST_PREFIX=http://localhost:3000 -e PATH_PREFIX=/go \
  -e LINKS_FILE=/app/data/links.json -e USERS_FILE=/app/data/users.json \
  -v "$PWD/data:/app/data" redirector
```

Then open http://localhost:3000/go. Access logs go to stdout (`docker logs`). `docker stop` shuts the server down cleanly once in-flight requests finish.

## Development

### Prerequisites

* Node.js 24+
* Yarn 1.22+ (classic)
* Docker (to build the image)

### Available commands

* `yarn start` Start a development server that restarts on changes (uses `.env`).
* `yarn test` Run the test suite with Node's built-in test runner.
* `yarn cover` Run the tests and report coverage.
* `yarn typecheck` Type-check the source and the tests.
* `yarn build` Compile to `build/` for production (`node build/index.js`).

Tests write throwaway data files under `data/`, which is gitignored. GitHub Actions runs the type-check, the tests and a Docker build on every push to `main` and on pull requests.
