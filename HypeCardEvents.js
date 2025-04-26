/*!
 * Hype Card Events 1.0.1
 * copyright (c) 2025 by Max Siebell (https://maxziebell.de). MIT-license
 */

/*
 * Version-History
 * 1.0.0 Initial release under MIT-license
 * 1.0.1 Include oldName and newName in event payloads
 */

if ("HypeCardEvents" in window === false) {
    window.HypeCardEvents = (function() {

        var prevCardByDoc = {};

        function HypeSceneLoad(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();
            var oldName = prevCardByDoc[docId];
            var newName = hypeDocument.currentSceneName();
            var hypeFunctions = hypeDocument.functions();

            // initial load
            if (oldName === undefined) {
                var loadEvent = { type: "HypeCardLoad", oldName: undefined, newName: newName };
                if (hypeFunctions.HypeCardLoad) {
                    hypeFunctions.HypeCardLoad(hypeDocument, element, loadEvent);
                } else if (hypeFunctions.HypeCardEvent) {
                    hypeFunctions.HypeCardEvent(hypeDocument, element, loadEvent);
                }
            }
            // subsequent scene changes
            else if (newName !== oldName) {
                var unloadEvent = { type: "HypeCardUnload", oldName: oldName, newName: newName };
                if (hypeFunctions.HypeCardUnload) {
                    hypeFunctions.HypeCardUnload(hypeDocument, element, unloadEvent);
                } else if (hypeFunctions.HypeCardEvent) {
                    hypeFunctions.HypeCardEvent(hypeDocument, element, unloadEvent);
                }

                var loadEvent = { type: "HypeCardLoad", oldName: oldName, newName: newName };
                if (hypeFunctions.HypeCardLoad) {
                    hypeFunctions.HypeCardLoad(hypeDocument, element, loadEvent);
                } else if (hypeFunctions.HypeCardEvent) {
                    hypeFunctions.HypeCardEvent(hypeDocument, element, loadEvent);
                }
            }

            prevCardByDoc[docId] = newName;
        }

        if (!("HYPE_eventListeners" in window)) {
            window.HYPE_eventListeners = [];
        }
        window.HYPE_eventListeners.push({ type: "HypeSceneLoad", callback: HypeSceneLoad });

        return { version: '1.0.1' };

    })();
}
