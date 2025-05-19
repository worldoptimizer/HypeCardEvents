/*!
 * Hype Card Events 1.2.3
 * copyright (c) 2025 by Max Siebell (https://maxziebell.de). MIT-license
 */

/*
 * Version-History
 * 1.0.0  Initial release under MIT-license
 * 1.0.1  Added initial-load support
 * 1.0.2  Consolidated unload/load logic into HypeSceneLoad
 * 1.0.3  Introduced event payloads with oldName and newName
 * 1.0.4  Added HypeCardPrepare, consolidated helper, and generic fallback logic
 * 1.0.5  Enhanced HypeCardUnload event with proper previous transition state and added nextCardName
 * 1.0.6  Added tracking for last pointerdown interaction time and included its age (ms) in event payloads. Attach listener on HypeDocumentLoad.
 * 1.0.7  Added tracking for previousCardElement and currentCardElement in event payloads.
 * 1.0.8  Added JSDoc. Attached helper functions (getLastInteractionAge, getLastInteractionTime) directly to hypeDocument object. 
 *        Removed redundant checks and internal comments/typedef.
 * 1.1.0  Unified event dispatch system: all events (including custom) support default handlers,
 *        user functions, and are dispatched through notifyEvent. HypeCardInteraction uses
 *        the native pointerup event. Codebase is now more extensible.
 * 1.2.0  Track pointerdown position/time and report distance and duration between pointerdown and pointerup in HypeCardInteraction events.
 * 1.2.1  Also report last pointer interaction details to HypeCardUnload event, without recalculation.
 * 1.2.2  Adds swipe detection to payload: isSwipe, swipeDirection, minSwipeDistance, maxSwipeDuration. These are available in HypeCardInteraction and HypeCardUnload event payloads. Swipe thresholds are now configurable defaults.
 * 1.2.3  Adds ability to set a custom function for retrieving the current scene name (sceneNameFunction), defaulting to hypeDocument.currentSceneName().
 */
if ("HypeCardEvents" in window === false) {
    /**
     * @namespace HypeCardEvents
     * @description Manages card (scene) transition events for Hype documents, focusing on scene names.
     * @version 1.2.3
     */
    window.HypeCardEvents = (function() {
        var lastLoadedNameByDoc = {};    // Stores string|undefined
        var nameBeforeLastByDoc = {};    // Stores string|undefined
        var lastInteractionTimeByDoc = {}; // Stores timestamp (ms) or null
        var pointerDownInfoByDoc = {}; // Stores {x, y, time} or null
        var lastPointerInteractionByDoc = {}; // Stores the last pointer interaction details per doc

        // --- Defaults and notifyEvent logic ---
        var _default = {
            minSwipeDistance: 30, // px
            maxSwipeDuration: 750, // ms
            sceneNameFunction: 'currentSceneName' // default function name for scene retrieval
        };
        /**
         * Sets default configuration values for HypeSceneMagic
         * @param {(string|Object)} key - Either a string key or an object containing multiple key-value pairs
         * @param {*} [value] - The value to set if key is a string
         * @returns {void}
         */
        function setDefault(key, value) {
            if (typeof(key) == 'object') {
                _default = key;
                return;
            }
            _default[key] = value;
        }
        /**
         * Gets default configuration values from HypeSceneMagic
         * @param {string} [key] - Optional key to get specific default value
         * @returns {*} The entire default object if no key provided, otherwise the value for the specified key
         */
        function getDefault(key) {
            if (!key) return _default;
            return _default[key];
        }

        /**
         * Dispatches an event to Hype's event system.
         * @param {Object} event - The event object to dispatch.
         * @param {Element} element - The DOM element associated with the event.
         * @returns {void}
         */
        var notifyEvent = function(event, element) {
            var eventListeners = window['HYPE_eventListeners'];
            if (eventListeners == null) {
                return;
            }
            var result;
            for (var i = 0; i < eventListeners.length; i++) {
                if (eventListeners[i]['type'] == event['type'] && eventListeners[i]['callback'] != null) {
                    result = eventListeners[i]['callback'](_hype['API'], element, event);
                    if (result === false) {
                        return false;
                    }
                }
            }
            return result;
        };

        /**
         * Dispatches a card event.
         * @param {string} eventType - The type of the event to dispatch.
         * @param {HypeDocument} hypeDocument - The Hype document associated with the event.
         * @param {Element} element - The DOM element associated with the event.
         * @param {Object} baseEvent - The base event object to use as the payload.
         * @returns {void}
         */
        function dispatchHypeCardEvent(eventType, hypeDocument, element, baseEvent) {
            // Use the event object as the payload
            var event = baseEvent || {};
            event.type = eventType;
            event.target = element;
            // Call default handler for specific event
            var defaultHandler = getDefault(eventType);
            if (typeof defaultHandler === 'function') {
                defaultHandler(hypeDocument, element, event);
            }
            // Call broad/catch-all default handler for HypeCardEvent
            var genericDefault = getDefault('HypeCardEvent');
            if (typeof genericDefault === 'function' && eventType !== 'HypeCardEvent') {
                genericDefault(hypeDocument, element, event);
            }
            // Get user functions
            var hypeFunctions = hypeDocument.functions && hypeDocument.functions();
           
            // Also call HypeCardEvent user function if present (for catch-all)
            if (hypeFunctions && typeof hypeFunctions.HypeCardEvent === 'function' && eventType !== 'HypeCardEvent') {
                hypeFunctions.HypeCardEvent(hypeDocument, element, event);
            }
            // Call user function if defined
            if (hypeFunctions && typeof hypeFunctions[eventType] === 'function') {
                hypeFunctions[eventType](hypeDocument, element, event);
            }
            // Fire event through notifyEvent (calls user event listeners)
            notifyEvent(event, element);
        }

        // --- Scene Name Functionality ---
        /**
         * Gets the current scene name using the configured function name in defaults.
         * @param {HypeDocument} hypeDocument
         * @returns {string}
         */
        function getSceneName(hypeDocument) {
            var fnName = getDefault('sceneNameFunction') || 'currentSceneName';
            if (typeof hypeDocument[fnName] === 'function') {
                return hypeDocument[fnName]();
            }
            // fallback
            return hypeDocument.currentSceneName();
        }

        /**
         * Attaches the pointerup interaction listener.
         * @param {HypeDocument} hypeDocument
         * @private
         */
        function _attachInteractionListener(hypeDocument) {
            var docId = hypeDocument.documentId();
            if (!(docId in lastInteractionTimeByDoc)) {
                var container = hypeDocument.getElementById(hypeDocument.documentId());
                // Pointerdown: record position and time
                container.addEventListener('pointerdown', function(e) {
                    pointerDownInfoByDoc[docId] = {
                        x: e.clientX,
                        y: e.clientY,
                        time: Date.now()
                    };
                }, {passive: true});
                // Pointerup: calculate distance and duration if pointerdown exists
                container.addEventListener('pointerup', function(e) {
                    lastInteractionTimeByDoc[docId] = Date.now();
                    var pointerDown = pointerDownInfoByDoc[docId];
                    var pointerUp = { x: e.clientX, y: e.clientY, time: Date.now() };
                    var distance = null, duration = null;
                    if (pointerDown) {
                        var dx = pointerUp.x - pointerDown.x;
                        var dy = pointerUp.y - pointerDown.y;
                        distance = Math.sqrt(dx*dx + dy*dy);
                        duration = pointerUp.time - pointerDown.time;
                    }
                    // DRY: Build pointerInteraction object once
                    var pointerInteraction = {
                        pointerDown: pointerDown,
                        pointerUp: pointerUp,
                        pointerDistance: distance,
                        pointerDuration: duration
                    };
                    // Swipe detection logic for payload
                    var minSwipeDistance = getDefault('minSwipeDistance');
                    var maxSwipeDuration = getDefault('maxSwipeDuration');
                    var dx = pointerDown && pointerUp ? pointerUp.x - pointerDown.x : null;
                    var dy = pointerDown && pointerUp ? pointerUp.y - pointerDown.y : null;
                    var swipeDirection = null;
                    if (dx !== null && dy !== null) {
                        if (Math.abs(dx) > Math.abs(dy)) {
                            swipeDirection = dx > 0 ? 'right' : 'left';
                        } else {
                            swipeDirection = dy > 0 ? 'down' : 'up';
                        }
                    }
                    var isSwipe = (distance != null && duration != null && distance >= minSwipeDistance && duration <= maxSwipeDuration);
                    pointerInteraction.isSwipe = isSwipe;
                    pointerInteraction.swipeDirection = swipeDirection;
                    pointerInteraction.minSwipeDistance = minSwipeDistance;
                    pointerInteraction.maxSwipeDuration = maxSwipeDuration;
                    lastPointerInteractionByDoc[docId] = pointerInteraction;
                    // Merge pointerInteraction into event payload
                    var eventPayload = Object.assign({}, e, pointerInteraction);
                    dispatchHypeCardEvent('HypeCardInteraction', hypeDocument, e.target, eventPayload);
                    pointerDownInfoByDoc[docId] = null;
                }, {passive: true});
            }
        }

        /**
         * Dispatches a card event.
         * @param {HypeDocument} hypeDocument
         * @param {Element} element - The DOM element associated with the Hype callback context.
         * @param {string} eventType - 'HypeCardLoad', 'HypeCardUnload', 'HypeCardPrepare'.
         * @param {string|undefined} previousCardName - Name of the scene transitioned from.
         * @param {string} currentCardName - Name of the scene relevant to the event.
         * @param {string|undefined} nextCardName - Name of the upcoming scene (for Unload only).
         * @private
         */
        function _fireEvent(
            hypeDocument, element, eventType, previousCardName, currentCardName,
            nextCardName
        ) {
            var docId = hypeDocument.documentId();
            var interactionAge = typeof hypeDocument.getLastInteractionAge === 'function'
                ? hypeDocument.getLastInteractionAge() : null;
            if (interactionAge === null) {
                 let lastInteractionTime = lastInteractionTimeByDoc[docId];
                 if (docId in lastInteractionTimeByDoc && lastInteractionTime !== null) {
                    interactionAge = Date.now() - lastInteractionTime;
                 }
            }
            // Compose event object
            var event = {
                type: eventType,
                previousCardName: previousCardName,
                currentCardName: currentCardName,
                lastInteractionAge: interactionAge,
                target: element
            };
            if (nextCardName !== undefined) event.nextCardName = nextCardName;
            // For HypeCardUnload, add pointer interaction details if available
            if (eventType === 'HypeCardUnload') {
                var lastPointer = lastPointerInteractionByDoc[docId];
                if (lastPointer) {
                    Object.assign(event, lastPointer);
                }
                // Reset pointer interaction and last interaction age after reporting
                lastPointerInteractionByDoc[docId] = null;
                pointerDownInfoByDoc[docId] = null;
                lastInteractionTimeByDoc[docId] = null;
            }
            dispatchHypeCardEvent(eventType, hypeDocument, element, event);
        }

        /**
         * HypeDocumentLoad callback. Initializes tracking and adds helper functions.
         * @param {HypeDocument} hypeDocument
         * @param {Element} element
         * @param {Event} event
         */
        function HypeDocumentLoad(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();

            lastLoadedNameByDoc[docId] = undefined;
            nameBeforeLastByDoc[docId] = undefined;

             _attachInteractionListener(hypeDocument);

            /**
             * Gets the timestamp (Date.now()) of the last pointerup interaction.
             * @function getLastInteractionTime
             * @memberof HypeDocument#
             * @returns {number|null} Timestamp in milliseconds or null if no interaction recorded.
             */
            hypeDocument.getLastInteractionTime = function() {
                var currentDocId = this.documentId();
                var lastTime = lastInteractionTimeByDoc[currentDocId];
                return (currentDocId in lastInteractionTimeByDoc && lastTime !== null) ? lastTime : null;
            };

            /**
             * Gets the time elapsed in milliseconds since the last pointerup interaction.
             * @function getLastInteractionAge
             * @memberof HypeDocument#
             * @returns {number|null} Elapsed milliseconds or null if no interaction recorded.
             */
            hypeDocument.getLastInteractionAge = function() {
                var lastTime = this.getLastInteractionTime();
                return (lastTime !== null) ? Date.now() - lastTime : null;
            };
        }

        /**
         * HypeScenePrepareForDisplay callback. Fires HypeCardUnload and HypeCardPrepare.
         * @param {HypeDocument} hypeDocument
         * @param {Element} element - Scene element being prepared for display.
         * @param {Event} event
         */
        function HypeScenePrepareForDisplay(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();
            var incomingName = getSceneName(hypeDocument);
            var leavingName = lastLoadedNameByDoc[docId];
            var originName = nameBeforeLastByDoc[docId];

            if (leavingName === undefined || incomingName !== leavingName) {
                if (leavingName !== undefined) {
                    _fireEvent(
                        hypeDocument,
                        element, // Context: Element being prepared
                        "HypeCardUnload",
                        originName,   // Name BEFORE unloading one
                        leavingName,  // Name OF unloading one
                        incomingName  // Name of NEXT one
                    );
                }

                _fireEvent(
                    hypeDocument,
                    element, // Context: Element being prepared
                    "HypeCardPrepare",
                    leavingName,  // Name of the one being left
                    incomingName, // Name of the one being prepared
                    undefined
                );
            }
        }

        /**
         * HypeSceneLoad callback. Fires HypeCardLoad and updates state.
         * @param {HypeDocument} hypeDocument
         * @param {Element} element - Scene element just loaded.
         * @param {Event} event
         */
        function HypeSceneLoad(hypeDocument, element, event) {
            var docId = hypeDocument.documentId();
            var loadedName = getSceneName(hypeDocument);
            var previousName = lastLoadedNameByDoc[docId];

            if (previousName === undefined || loadedName !== previousName) {
                 _fireEvent(
                    hypeDocument,
                    element, // Context: Element just loaded
                    "HypeCardLoad",
                    previousName, // Name of previous scene
                    loadedName,   // Name of loaded scene
                    undefined
                );

                nameBeforeLastByDoc[docId] = lastLoadedNameByDoc[docId];
                lastLoadedNameByDoc[docId] = loadedName;
            }
        }

        if (!window.HYPE_eventListeners) window.HYPE_eventListeners = [];
        window.HYPE_eventListeners.unshift({ type: "HypeDocumentLoad", callback: HypeDocumentLoad });
        window.HYPE_eventListeners.unshift({ type: "HypeScenePrepareForDisplay", callback: HypeScenePrepareForDisplay });
        window.HYPE_eventListeners.unshift({ type: "HypeSceneLoad", callback: HypeSceneLoad });

        return {
            version: '1.2.3',
            setDefault: setDefault,
            getDefault: getDefault
        };
    })();
}
