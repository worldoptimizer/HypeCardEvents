# Hype Card Events

A Tumult Hype extension that fires **HypeCardUnload** and **HypeCardLoad** (or a single **HypeCardEvent**) only when the *scene name* (your “card”) changes, ignoring layout-only switches.

## Installation
1. Open the **Resources** panel in your Hype document.
2. Click the **“+”** button and choose **Add Resource…**, then select the `HypeCardEvents.js` file.
3. Ensure **“Auto-Link Resource”** is enabled so Hype includes the script automatically.

## Usage in the Hype IDE
1. Open the **Scene** or **Document** panel.
2. Add **Run JavaScript…** actions, or define *Document Functions*, named exactly:
   - `HypeCardLoad(hypeDocument, element, event)`  
   - `HypeCardUnload(hypeDocument, element, event)`  
   - OR a single combined handler: `HypeCardEvent(hypeDocument, element, event)`

3. In your handlers, inspect the `event` object for:
   - `event.type` — either `HypeCardLoad` or `HypeCardUnload`
   - `event.oldName` — previous scene name (undefined on first load)
   - `event.newName` — newly loaded scene name

```javascript
// Example Document Function
function HypeCardLoad(hypeDocument, element, event) {
    console.log("Loading card:", event.newName);
}

function HypeCardUnload(hypeDocument, element, event) {
    console.log("Unloading card:", event.oldName);
}
```

### Combined Handler Example
If you prefer one function to handle both events, use a switch on `event.type`:

```javascript
function HypeCardEvent(hypeDocument, element, event) {
    switch (event.type) {
        case "HypeCardLoad":
            // handle load
            console.log("Card loaded:", event.newName);
            break;
        case "HypeCardUnload":
            // handle unload
            console.log("Card unloaded:", event.oldName);
            break;
    }
}
```

## Behavior
- **Initial load**: fires a single `HypeCardLoad` on the very first scene.  
- **Scene change**: when the scene’s *name* changes, fires `HypeCardUnload` then `HypeCardLoad`.  
- **Layout change only**: does **not** fire any card events.
