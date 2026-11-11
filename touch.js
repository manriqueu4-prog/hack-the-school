'use strict';

/* ==========================================================================
   CONTROLES TÁCTILES (celular / tablet)
   Se carga después de game.js y usa sus variables globales.
   En la compu no hace nada. Para probar en la compu: agregá ?touch=1 a la URL.
   ========================================================================== */
(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
        || new URLSearchParams(location.search).get('touch') === '1';
    if (!isTouch) return;
    document.body.classList.add('is-touch');

    const JOY_RADIUS = 52;      // cuánto se mueve la perilla (px)
    const JOY_DEAD = 0.28;      // zona muerta (0 a 1)
    const LOOK_YAW = 0.0048;    // giro por píxel arrastrado
    const LOOK_PITCH = 0.55;    // subir/bajar la vista por píxel arrastrado

    const make = (tag, cls, parent, text) => {
        const node = document.createElement(tag);
        node.className = cls;
        if (text) node.textContent = text;
        parent.append(node);
        return node;
    };

    /* --- Estructura --------------------------------------------------- */
    const root = make('div', 'tc-root', document.body);
    root.hidden = true;
    const lookZone = make('div', 'tc-look', root);
    const joyZone = make('div', 'tc-joy', root);
    const joyBase = make('div', 'tc-joy-base', joyZone);
    const joyKnob = make('div', 'tc-joy-knob', joyBase);
    joyBase.hidden = true;
    make('div', 'tc-rotate', document.body, 'GIRÁ EL CELULAR / ROTATE YOUR PHONE');

    /* --- Joystick (izquierda) ----------------------------------------- */
    let joyId = null;
    let joyOx = 0;
    let joyOy = 0;

    function setMoveKeys(forward, backward, left, right) {
        const map = [['KeyW', forward], ['KeyS', backward], ['KeyA', left], ['KeyD', right]];
        for (const [code, on] of map) {
            if (on) keys.add(code); else keys.delete(code);
        }
    }

    function resetJoystick() {
        joyId = null;
        joyBase.hidden = true;
        setMoveKeys(false, false, false, false);
    }

    joyZone.addEventListener('pointerdown', (e) => {
        if (joyId !== null) return;
        e.preventDefault();
        joyId = e.pointerId;
        joyZone.setPointerCapture(e.pointerId);
        const rect = joyZone.getBoundingClientRect();
        joyOx = e.clientX;
        joyOy = e.clientY;
        joyBase.style.left = `${joyOx - rect.left}px`;
        joyBase.style.top = `${joyOy - rect.top}px`;
        joyKnob.style.transform = 'translate(-50%, -50%)';
        joyBase.hidden = false;
    });

    joyZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== joyId) return;
        let dx = e.clientX - joyOx;
        let dy = e.clientY - joyOy;
        const len = Math.hypot(dx, dy);
        if (len > JOY_RADIUS) {
            dx = (dx / len) * JOY_RADIUS;
            dy = (dy / len) * JOY_RADIUS;
        }
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        const nx = dx / JOY_RADIUS;
        const ny = dy / JOY_RADIUS;
        setMoveKeys(ny < -JOY_DEAD, ny > JOY_DEAD, nx < -JOY_DEAD, nx > JOY_DEAD);
    });

    const endJoy = (e) => { if (e.pointerId === joyId) resetJoystick(); };
    joyZone.addEventListener('pointerup', endJoy);
    joyZone.addEventListener('pointercancel', endJoy);

    /* --- Mirar arrastrando el dedo (toda la pantalla, debajo de lo demás) --- */
    let lookId = null;
    let lastX = 0;
    let lastY = 0;

    lookZone.addEventListener('pointerdown', (e) => {
        if (lookId !== null) return;
        e.preventDefault();
        lookId = e.pointerId;
        lookZone.setPointerCapture(e.pointerId);
        lastX = e.clientX;
        lastY = e.clientY;
    });

    lookZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== lookId || state.paused) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        const slow = settings.sensitivity / state.zoom;     // con zoom, más lento y preciso
        rotate(-dx * LOOK_YAW * slow);
        if (settings.verticalLook) {
            const offset = state.lookOffset - dy * LOOK_PITCH * slow;
            state.lookOffset = clamp(offset, -CONFIG.maxLookOffset, CONFIG.maxLookOffset);
        }
    });

    const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    /* --- Botones -------------------------------------------------------- */
    function button(label, cls, parent, onDown, onUp) {
        const b = make('button', `tc-btn ${cls}`, parent, label);
        b.type = 'button';
        b.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            b.setPointerCapture(e.pointerId);
            b.classList.add('is-down');
            onDown();
        });
        const up = () => {
            b.classList.remove('is-down');
            if (onUp) onUp();
        };
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
        return b;
    }

    button('FUEGO', 'tc-fire', root,
        () => { state.mouseFiring = true; },
        () => { state.mouseFiring = false; });

    const scopeBtn = button('MIRA', 'tc-scope', root, () => setScope(!state.scoped));
    button('R', 'tc-reload', root, () => startReload(performance.now()));
    const weaponBtn = button('ARMA', 'tc-weapon', root, () => cycleWeapon(1));

    // Objetos del duelo PVP (G, H, F)
    const pvpBox = make('div', 'tc-pvp', root);
    pvpBox.hidden = true;
    for (const [label, code] of [['G', 'KeyG'], ['H', 'KeyH'], ['F', 'KeyF']]) {
        button(label, 'tc-item', pvpBox, () => {
            if (state.pvp && !state.over) pvpUseItem(code, performance.now());
        });
    }

    /* --- Mostrar/ocultar según el estado del juego ---------------------- */
    let wasActive = false;

    function resetAll() {
        resetJoystick();
        lookId = null;
        state.mouseFiring = false;
    }

    setInterval(() => {
        const active = state.started && !state.paused && !state.over && !state.settingsOpen;
        if (wasActive && !active) resetAll();
        wasActive = active;

        root.hidden = !active;
        pvpBox.hidden = !state.pvp;
        document.body.classList.toggle('tc-playing', state.started && !state.over);

        state.hintUntil = 0;     // en el celu no se muestra el cartel "CLIC PARA USAR EL MOUSE"

        if (active) {
            weaponBtn.textContent = WEAPONS[settings.weapon].name;
            scopeBtn.classList.toggle('is-on', state.scoped);
        }
    }, 100);
})();