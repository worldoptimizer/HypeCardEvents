/*!
 * Hype Card Events 1.0.4
 * copyright (c) 2025 by Max Siebell (https://maxziebell.de). MIT-license
 */

/*
 * Version-History
 * 1.0.0 Initial release under MIT-license
 * 1.0.1 Added initial-load support
 * 1.0.2 Consolidated unload/load logic into HypeSceneLoad
 * 1.0.3 Introduced event payloads with oldName and newName
 * 1.0.4 Added HypeCardPrepare, consolidated helper, and generic fallback logic
 */

if ("HypeCardEvents" in window === false) {
    window.HypeCardEvents = (function() {

        var prevCardByDoc = {};

        /**
         * Fires specific handler and generic HypeCardEvent if defined
         */
        function _fireEvent(hypeDocument, element, eventType, previousCardName, currentCardName) {
            var hypeFunctions = hypeDocument.functions();
            var payload = { type: eventType, previousCardName: previousCardName, currentCardName: currentCardName };

            if (typeof hypeFunctions[eventType] === 'function') {
                hypeFunctions[eventType](hypeDocument, element, payload);
            }
            if (typeof hypeFunctions.HypeCardEvent === 'function') {
                hypeFunctions.HypeCardEvent(hypeDocument, element, payload);
            }
        }

        function HypeScenePrepareForDisplay(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();
            var previousCardName = prevCardByDoc[docId];
            var currentCardName = hypeDocument.currentSceneName();

            if (previousCardName === undefined || currentCardName !== previousCardName) {
                _fireEvent(hypeDocument, element, "HypeCardPrepare", previousCardName, currentCardName);
            }
        }

        function HypeSceneLoad(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();
            var previousCardName = prevCardByDoc[docId];
            var currentCardName = hypeDocument.currentSceneName();

            if (previousCardName === undefined || currentCardName !== previousCardName) {
                if (previousCardName !== undefined) {
                    _fireEvent(hypeDocument, element, "HypeCardUnload", previousCardName, currentCardName);
                }
                _fireEvent(hypeDocument, element, "HypeCardLoad", previousCardName, currentCardName);
                prevCardByDoc[docId] = currentCardName;
            }
        }

        if (!window.HYPE_eventListeners) {
            window.HYPE_eventListeners = [];
        }
        window.HYPE_eventListeners.push({ type: "HypeScenePrepareForDisplay", callback: HypeScenePrepareForDisplay });
        window.HYPE_eventListeners.push({ type: "HypeSceneLoad", callback: HypeSceneLoad });

        return { version: '1.0.4' };

    })();
}
