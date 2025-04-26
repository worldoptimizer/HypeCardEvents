# Hype Card Events
A Tumult Hype extension that fires **HypeCardUnload**, **HypeCardPrepare**, and **HypeCardLoad** (or a single **HypeCardEvent**) only when the *scene name* (your "card") changes, ignoring layout-only switches.

## Installation
1. Open the **Resources** panel in your Hype document.
2. Click the **"+"** button and choose **Add Resource…**, then select the `HypeCardEvents.js` file.
3. Ensure **"Auto-Link Resource"** is enabled so Hype includes the script automatically.

## Usage in the Hype IDE
1. Open the **Document** panel.
2. Define *Document Functions* named exactly:
   - `HypeCardPrepare(hypeDocument, element, event)`
   - `HypeCardLoad(hypeDocument, element, event)`  
   - `HypeCardUnload(hypeDocument, element, event)`  
   - OR a single combined handler: `HypeCardEvent(hypeDocument, element, event)`

3. In your handlers, inspect the `event` object for:
   - `event.type` — either `HypeCardPrepare`, `HypeCardLoad`, or `HypeCardUnload`
   - `event.previousCardName` — the card we're coming from (undefined on first load)
   - `event.currentCardName` — the current/target card name
   - `event.nextCardName` — the upcoming card (only available in `HypeCardUnload`)

```javascript
// Example Document Functions
function HypeCardPrepare(hypeDocument, element, event) {
    console.log("Preparing card:", event.currentCardName);
}

function HypeCardLoad(hypeDocument, element, event) {
    console.log("Loading card:", event.currentCardName);
}

function HypeCardUnload(hypeDocument, element, event) {
    console.log("Unloading card:", event.currentCardName, "going to:", event.nextCardName);
}
```

### Combined Handler Example
If you prefer one function to handle all events, use a switch on `event.type`:

```javascript
function HypeCardEvent(hypeDocument, element, event) {
    switch (event.type) {
        case "HypeCardPrepare":
            // handle prepare
            console.log("Card prepare:", event.currentCardName);
            break;
        case "HypeCardLoad":
            // handle load
            console.log("Card loaded:", event.currentCardName);
            break;
        case "HypeCardUnload":
            // handle unload
            console.log("Card unloaded:", event.currentCardName);
            break;
    }
}
```

## Event Sequence
1. **HypeCardUnload**: Fired when leaving a card, before the new scene is prepared
2. **HypeCardPrepare**: Fired when a new card is about to be shown
3. **HypeCardLoad**: Fired when a new card has finished loading

## Behavior
- **Initial load**: fires `HypeCardPrepare` and `HypeCardLoad` on the very first scene.
- **Scene change**: fires `HypeCardUnload` for the previous scene, then `HypeCardPrepare` and `HypeCardLoad` for the new scene.
- **Layout change only**: does **not** fire any card events.

## Understanding Event Payloads
- In **HypeCardUnload**, `previousCardName` is the card before the one being unloaded, and `currentCardName` is the card being unloaded.
- In **HypeCardPrepare** and **HypeCardLoad**, `previousCardName` is the card we're coming from, and `currentCardName` is the new card.
