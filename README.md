# Sourcegraph browser extensions

[![build](https://badge.buildkite.com/59c6f8596c7823a61a1d7341805fd83515999ec114c9fb7ae2.svg)](https://buildkite.com/sourcegraph/browser-extensions)
[![chrome version](https://img.shields.io/chrome-web-store/v/dgjhfomjieaadpoljlnidmbgkdffpack.svg)](https://chrome.google.com/webstore/detail/sourcegraph/dgjhfomjieaadpoljlnidmbgkdffpack)
[![chrome users](https://img.shields.io/chrome-web-store/users/dgjhfomjieaadpoljlnidmbgkdffpack.svg)](https://chrome.google.com/webstore/detail/sourcegraph/dgjhfomjieaadpoljlnidmbgkdffpack)
[![chrome rating](https://img.shields.io/chrome-web-store/rating/dgjhfomjieaadpoljlnidmbgkdffpack.svg)](https://chrome.google.com/webstore/detail/sourcegraph/dgjhfomjieaadpoljlnidmbgkdffpack)
[![firefox version](https://img.shields.io/amo/v/sourcegraph.svg)](https://addons.mozilla.org/en-US/firefox/addon/sourcegraph/)
[![firefox users](https://img.shields.io/amo/users/sourcegraph.svg)](https://addons.mozilla.org/en-US/firefox/addon/sourcegraph/)
[![firefox rating](https://img.shields.io/amo/rating/sourcegraph.svg)](https://addons.mozilla.org/en-US/firefox/addon/sourcegraph/)

test patch

## Overview

The Sourcegraph browser extension adds tooltips to code on GitHub, Phabricator, and Bitbucket.
The tooltips include features like:

- symbol type information & documentation
- go to definition & find references (currently for Go, Java, TypeScript, JavaScript, Python)
- find references
- improved search functionality

#### 🚀 Install: [**Sourcegraph for Chrome**](https://chrome.google.com/webstore/detail/sourcegraph/dgjhfomjieaadpoljlnidmbgkdffpack) — [**Sourcegraph for Firefox**](https://addons.mozilla.org/en-US/firefox/addon/sourcegraph/)

It works as follows:

Something

- when visiting e.g. https://github.com/..., the extension injects a content script (inject.bundle.js)
- there is a background script running to access certain chrome APIs, like storage (background.bundle.js)
- a "code view" contains rendered (syntax highlighted) code (in an HTML table); the extension adds event listeners to the code view which control the tooltip
- when the user mouses over a code table cell, the extension modifies the DOM node:
  - text nodes are wrapped in <span> (so hover/click events have appropriate specificity)
  - element nodes may be recursively split into multiple element nodes (e.g. a <span>&Router{namedRoutes:<span> contains multiple code tokens, and event targets need more granular ranges)
  - ^^ we assume syntax highlighting takes care of the base case of wrapping a discrete language symbol
  - tooltip data is fetched from the Sourcegraph API
- when an event occurs, we modify a central state store about what kind of tooltip to display
- code subscribes to the central store updates, and creates/adds/removes/hides an absolutely positioned element (the tooltip)

## Project Layout

- `app/`
  - application code, e.g. injected onto GitHub (as a content script)
- `chrome/`
  - entrypoint for Chrome extension. Includes bundled assets, background scripts, options)
- `phabricator/`
  - entrypoint for Phabricator extension. The Phabricator extension is injected by Phabricator (not Chrome)
- `scripts/`
  - development scripts
- `test/`
  - test code
- `webpack`
  - build configs

## Requirements

- `node`
- `npm`
- `make`

## Development

For each browser run:

```bash
$ npm install
$ npm run dev
```

Now, follow the steps below for the browser you intend to work with.

### Chrome

- Browse to [chrome://extensions](chrome://extensions).
- If you already have the Sourcegraph extension installed, disable it by unchecking the "Enabled" box.
- Click on [Load unpacked extensions](https://developer.chrome.com/extensions/getstarted#unpacked), and select the `build/chrome` folder.
- Browse to any public repository on GitHub to confirm it is working.
- After making changes it is necessary to refresh the extension. This is done by going to [chrome://extensions](chrome://extensions) and clicking "Reload".

![Add dist folder](readme-load-extension-asset.png)

#### Updating the bundle

Click reload for Sourcegraph at `chrome://extensions`

### Firefox (hot reloading)

In a separate terminal session run:

```bash
npm run dev:firefox
```

A Firefox window will be spun up with the extension already installed.

#### Updating the bundle

Save a file and wait for webpack to finish rebuilding.

#### Caveats

The window that is spun up is completely separate from any existing sessions you have on Firefox.
You'll have to sign into everything at the begining of each development session(each time you run `npm run dev:firefox`).
You should ensure you're signed into any Sourcegraph instance you point the extension at as well as Github.

### Firefox (manual)

- Go to `about:debugging`
- Select "Enable add-on debugging"
- Click "Load Temporary Add-on" and select "firefox-bundle.xpi"
- [More information](https://developer.mozilla.org/en-US/docs/Tools/about:debugging#Add-ons)

#### Updating the bundle

Click reload for Sourcegraph at `about:debugging`

### Safari

- Make sure developer tools are enabled
  - Open Safari > Preferences (or `Cmd+,`) and click Advanced
  - Check "Show Develop menu in menu bar"
- Open `Develop -> Show Extension Builder`
- Click the `+` at the bottom left of the Extension Builder and select `browser-extension/Sourcegraph.safariextension`
- Click `Install` and `Add extension...` and open `~/path/to/browser-extensions/Sourcegraph.safariextension`
- To test against localhost, follow https://about.sourcegraph.com/docs/features/safari-extension:
  - Set `"corsOrigin": "https://github.com"` in your localhost site configuration
  - Download the `ngrok` executable https://dashboard.ngrok.com/get-started, authenticate, and run `./ngrok localhost 3080`
  - Visit the URL it spits out, sign in, and add the URL to your Safari extension (to the left of the address bar - don't change Settings in the Extension Builder)

## Testing

Coming soon...

## Deploy

Deployment to Firefox and Chrome extension stores happen automatically in CI when the `release` branch is updated.
Releases are also uploaded to the [GitHub releases page](https://github.com/sourcegraph/browser-extensions/releases) and tagged in git.

Make sure that commit messages follow the [Conventional Commits Standard](https://conventionalcommits.org/) as the commit message will be used for the (public) release notes and to automatically determine the version number.

To release the latest commit on master, ensure your master is up-to-date and run

```sh
git push origin master:release
```

### Safari

_Safari support is work-in-progress and released manually._

- Ensure you have the production build by running `npm run build`
- Open the extension builder in Safari `Develop -> Show Extension Builder`
  - Notice the `Sourcegraph.safariextz` zip file is created in `browser-extension`
- Click `Build Package`
- Open the [Safari extension bucket](https://console.cloud.google.com/storage/browser/sourcegraph-safariextz?project=sourcegraph-dev) on GCP
- Click `UPLOAD FILES` and pick `Sourcegraph.safariextz`
- In the `Resolve Conflict` prompt, choose to replace the existing object
- `IMPORTANT` - Ensure that the `Share Publicly` setting is still checked
- Click the `...` menu on the far right of the line item for `Sourcegraph.safariextz`
- Copy `Sourcegraph.safariextz` and change the destination name to `Sourcegraph-<version>.safariextz`
  - Make sure to keep the source permissions
