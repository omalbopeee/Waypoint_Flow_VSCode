# Waypoint Flow — editable prototype

This is the complete HTML, CSS and JavaScript source for the four-role prototype: Dispatcher, Loader, Driver and Store Manager.

## Open in VS Code

1. Extract this ZIP.
2. Open VS Code and choose **File > Open Folder**. Select `Waypoint_Flow_VSCode`.
3. Open `dist/index.html`.
4. Use a local static web server to preview the `dist` folder. If Live Server is already installed in VS Code, right-click `index.html` and choose **Open with Live Server**.
5. Save edits and refresh your browser if it does not refresh automatically.

There is no npm installation or build step. No API keys are needed.

Alternative if Python is installed: open a terminal in this folder and run:

```sh
python -m http.server 5500 --directory dist
```

Then open http://localhost:5500 in your browser. Stop the server with Ctrl+C.

## Which file should I edit?

| File | Purpose |
| --- | --- |
| `dist/index.html` | Page title, metadata and stylesheet/script loading |
| `dist/styles.css` | Colours, fonts, spacing, mobile layouts and dialogs |
| `dist/app.js` | Four role interfaces, navigation, forms and click handlers |
| `dist/core.js` | Sample data, allocation constraints, loading, delivery, sync and receipt logic |
| `tests/workflow.cjs` | Checks for the main business workflows |
| `.vscode/settings.json` | Preview root for Live Server |

All browser assets are included. The logo is an inline SVG favicon; the interface uses system fonts. There are no separate image downloads or external runtime dependencies.

The existing source is compact. VS Code's **Format Document** command can make the files easier to read before editing.

## Try the demo

Open **Demo guide** at the top of the prototype for the full walkthrough.

1. Dispatcher: assign DEMO001, DEMO002 and DEMO003 to VEH036, trip 1.
2. Try DEMO004 on trip 1 (volume constraint) and trip 2 (receiving-window constraint). Defer it with a reason, then review and publish the plan.
3. Loader: acknowledge each plan and check carton counts. Try two missing cartons to block loading; arrange replacements in Dispatcher, then acknowledge and recount.
4. Driver: start the fully loaded trip. Simulate no signal, record arrival and delivery, then reconnect and sync.
5. Store Manager: select the matching outlet and confirm receipt, or report a quantity discrepancy for Dispatcher to resolve.

## Optional workflow checks

If Node.js is installed, run from the project folder:

```sh
node tests/workflow.cjs
```

Node.js is only needed for these checks, not to run the website.

## Prototype limitations

- This is a front-end demonstration, without a production backend or authentication.
- Demo progress is saved in this browser's localStorage under `waypoint-flow-prototype-v2`. Reset Demo clears its current records; clearing browser data also removes them.
- The local preview and hosted site have separate saved progress. Keep the same local address and port to reuse local progress.
- Offline sync, event times, travel estimates and proof choices are demonstrations. Signature/photo capture and real server sync are not implemented.
- Vehicle/outlet records support a dataset-grounded scenario. Orders and other demonstration values are illustrative; the complete competition CSV dataset is not a runtime dependency.
- Editing these files does not automatically update the hosted site.

## Source snapshot

Exported from deployed source commit `f995a1e0d256e4751d26c2751acf3dce01c74f31`.
Original private prototype: https://waypoint-ops-designathon.omalbopage.chatgpt.site

This portable export excludes deployment credentials and Git history. Every file needed to run and edit the prototype is included.
