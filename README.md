# Redirector

This is a simple URL forwarding service configured for self hosting. It can generate random short URLs (e.g., `/r32xd`), named URLs (e.g., `/party/june2`), or a combination (e.g., `/prefix/r3ce2`).

The goal of the project is to be relatively simple (it is backed by `.json` files instead of a database), but to allow:

* Self-registration
* Login
* Link creation/deletion/modification
* An admin view for managing links

Users can only modify the links they create. Admins (see `ADMINS` below) can see and delete every link.

## Configuration

The server reads these environment variables. For local development they come from the `.env` file in this repository; in Docker they come from the compose file or `docker run -e`.

| Variable | Meaning |
|---|---|
| `HOST_PREFIX` | Public origin, no trailing slash (e.g., `https://se.cs.ubc.ca`) |
| `PATH_PREFIX` | Path the service is mounted under, no trailing slash (e.g., `/go`); empty for the root |
| `LINKS_FILE` | Path to the links data file |
| `USERS_FILE` | Path to the users data file |
| `ALLOW_REGISTRATION` | Optional. `false` stops people creating their own accounts; allowed when unset |
| `ADMINS` | Optional. Comma-separated usernames that can see and delete every link; `admin` when unset |

Both data files hold JSON arrays and are created as `[]` if missing. Every change also writes a timestamped `.bak` copy next to the file.

With `ADMINS` unset, whoever registers the username `admin` gets admin rights, so either register it yourself first or set `ADMINS` to real usernames. To run with registration off, create the accounts you need first, then set `ALLOW_REGISTRATION=false`.

## Docker

To serve it under a prefix behind nginx (say `/go`), set `PATH_PREFIX=/go` and pass the path through unchanged. The app handles the prefix itself, so do not rewrite it away; with a rewrite, every page returns 404.

```
location /go {
    port_in_redirect   off;
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
