/*!
 * Hype Card Events 1.0.5
 * copyright (c) 2025 by Max Siebell (https://maxziebell.de). MIT-license
 */

/*
 * Version-History
 * 1.0.0 Initial release under MIT-license
 * 1.0.1 Added initial-load support
 * 1.0.2 Consolidated unload/load logic into HypeSceneLoad
 * 1.0.3 Introduced event payloads with oldName and newName
 * 1.0.4 Added HypeCardPrepare, consolidated helper, and generic fallback logic
 * 1.0.5 Enhanced HypeCardUnload event with proper previous transition state and added nextCardName
 */
if ("HypeCardEvents" in window === false) {
    window.HypeCardEvents = (function() {
        var prevCardByDoc = {};       // Keeps track of the previous card name by document ID
        var prevPrevCardByDoc = {};   // Keeps track of the card before the previous card
        
        /**
         * Fires specific handler and generic HypeCardEvent if defined
         */
        function _fireEvent(hypeDocument, element, eventType, previousCardName, currentCardName, nextCardName) {
            var hypeFunctions = hypeDocument.functions();
            var payload = { 
                type: eventType, 
                previousCardName: previousCardName, 
                currentCardName: currentCardName
            };
            
            // Add nextCardName to payload if provided
            if (nextCardName !== undefined) {
                payload.nextCardName = nextCardName;
            }
            
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
            
            // Only proceed if the scene name has actually changed
            if (previousCardName === undefined || currentCardName !== previousCardName) {
                // If we have a previous card, fire unload with the correct previous card
                // and include the next card as well
                if (previousCardName !== undefined) {
                    _fireEvent(
                        hypeDocument, 
                        element, 
                        "HypeCardUnload", 
                        prevPrevCardByDoc[docId], // The card before the previous card
                        previousCardName,         // The previous card (being unloaded)
                        currentCardName           // The next card we're going to
                    );
                }
                
                // Fire prepare with current transition data
                _fireEvent(hypeDocument, element, "HypeCardPrepare", previousCardName, currentCardName);
                
                // Update the card-before-previous before updating previous
                prevPrevCardByDoc[docId] = previousCardName;
            }
        }
        
        function HypeSceneLoad(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();
            var previousCardName = prevCardByDoc[docId];
            var currentCardName = hypeDocument.currentSceneName();
            
            // Only fire the load event if the scene/card has actually changed
            if (previousCardName === undefined || currentCardName !== previousCardName) {
                _fireEvent(hypeDocument, element, "HypeCardLoad", previousCardName, currentCardName);
                prevCardByDoc[docId] = currentCardName;
            }
        }
        
        if (!window.HYPE_eventListeners) {
            window.HYPE_eventListeners = [];
        }
        window.HYPE_eventListeners.push({ type: "HypeScenePrepareForDisplay", callback: HypeScenePrepareForDisplay });
        window.HYPE_eventListeners.push({ type: "HypeSceneLoad", callback: HypeSceneLoad });
        
        return { version: '1.0.5' };
    })();
}
