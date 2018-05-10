(function (window) {

    const KeysMap = {
        Enter: '\r'
    };

    const ReverseKeysMap = {};
    for (const key of Object.keys(KeysMap)) {
        const value = KeysMap[key];
        ReverseKeysMap[value] = key;
    }

    function _codeForCharacter(c) {
        if ('0123456789'.indexOf(c) !== -1) {
            return 'Digit' + c;
        }
        return 'Key' + c;
    }

    function _keyForCharacter(c) {
        const key = ReverseKeysMap[c];
        return key || c;
    }

    function _type(text, input) {
        const eventsToFire = ['keydown', 'keypress', 'keyup'];

        for (const character of text) {

            for (const eventType of eventsToFire) {
                const keyCode = character.charCodeAt(0);
                const key = _keyForCharacter(character);
                const code = _codeForCharacter(character);

                const evt = new KeyboardEvent(
                    eventType, {
                        key: key,
                        code: code,
                        keyCode: keyCode,
                        which: keyCode,
                        ctrlKey: false,
                        shiftKey: false,
                        altKey: false,
                        metaKey: false,
                        repeat: false,
                        isComposing: false
                    }
                );

                const canceled = !input.dispatchEvent(evt);
                if (canceled) {
                    /* eslint-disable no-console */
                    console.warn('Event canceled');
                    /* eslint-enable no-console */
                }
            }
            input.value = input.value + character;
        }
    }

    window.EventUtils = {
        type: _type,
        Keys: KeysMap
    };

})(window);