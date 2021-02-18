# Redirector

This is a simple URL forwarding service configured for self hosting. It can generate random short URLs (e.g., `/r32xd`), named URLs (e.g., `party/june2`), or a combination (e.g., `/prefix/r3ce2`).

The goal of the project is to be relatively simple (it is backed by `.json` files instead of a database), but to allow self-registration, login, and link creation/deletion/modification. Users can only modify the links they create.

## Dev

This project was created using [create-express-typescript-app](https://www.npmjs.com/package/express-generator-typescript) which was invoked by calling `npx express-generator-typescript`. The docs below are from the bootstrap project.

## Pre-requisite to build this project

    $ node -v
    10.15.3
    $ yarn

## Available commands

### Install

    yarn

### To start a development server

    $ yarn start

### To create compiled version for distribution or deployment to production

    $ yarn build

### To run in production

    $ yarn start-prod

### To stop in production

    $ yarn stop-prod -- <id>
