'use strict';

/* ==========================================================================
   DOOM FILE SYSTEM // Sector 02  (versión retro)
   ========================================================================== */

/* --- Configuración -------------------------------------------------------- */

const TILE = Object.freeze({ EMPTY: 0, WALL: 1, DOOR: 2 });
const SETTINGS_KEY = 'doomFileSystem.settings';

const CONFIG = Object.freeze({
    // Jugador
    moveSpeed: 3.0,            // casillas por segundo
    rotSpeed: 2.5,             // radianes por segundo (flechas del teclado)
    playerRadius: 0.2,
    startAmmo: 500,
    reloadAmmo: 500,            // al recargar (tecla R) tenés como mínimo esta cantidad de balas
    reloadMs: 1000,            // cuánto dura la recarga (no podés disparar mientras tanto)
    startHealth: 100,
    muzzleFlashMs: 150,
    tracerMs: 90,              // cuánto dura el rayo de energía del disparo

    // Francotirador (clic derecho)
    sniperZoom: 3.2,           // aumento de la mira
    zoomSpeed: 14,             // qué tan rápido entra y sale el zoom
    basePlane: 0.66,           // largo base del plano de cámara (campo de visión normal)

    // Mouse
    mouseYawPerPixel: 0.0022,  // radianes que gira por cada píxel de mouse (sensibilidad 1.0)
    mousePitchPerPixel: 0.8,   // píxeles de pantalla que sube/baja la vista por píxel de mouse
    maxLookOffset: 110,        // cuánto se puede mirar hacia arriba/abajo (en píxeles)
    minSensitivity: 0.3,
    maxSensitivity: 3,
    mouseHintMs: 5000,         // cuánto se muestra el aviso "clic para usar el mouse"

    // Enemigos (valores comunes; cada tipo tiene los suyos en VIRUS_TYPES)
    enemyRadius: 0.25,         // colisión con paredes
    enemyHitRadius: 0.42,      // fracción del tamaño del enemigo que cuenta como impacto
    enemyChaseRange: 4,        // si te ve a esta distancia, te persigue
    enemyMinSpawnDistance: 5,  // distancia mínima al jugador al aparecer
    enemyTouchDistance: 0.6,
    damageMultiplier: 1,       // poné 0 para que los enemigos no hagan daño
    hurtCooldownMs: 700,
    hitFlashMs: 100,
    deathAnimMs: 300,

    // Jefe final
    bossAmmoBonus: 200,         // balas extra que recibís cuando aparece el jefe
    bossBannerMs: 3500,        // cuánto dura el cartel de alerta

    // Habitaciones
    doorReward: 200,
    doorAmmo: 100,
    doorHeal: 25,

    // Minimapa
    minimapCell: 9,            // tamaño de cada casilla en el minimapa (píxeles del canvas)

    // Efectos visuales
    fogDistance: 9,            // a esta distancia las paredes quedan casi a oscuras
    codeRefreshMs: 180,        // cada cuánto cambian algunos símbolos del código
    maxParticles: 250,
    backdropBands: 6,          // cuántas franjas de color tiene el techo y el piso (estilo retro)

    // Interfaz
    faceResetMs: 1500,
    endScreenDelayMs: 700,
});

/* Música de fondo (se genera con código, no hace falta ningún archivo de audio).
   bpm = velocidad, maxGain = volumen máximo general (el control de volumen se multiplica por esto). */
const MUSIC = Object.freeze({
    bpm: 104,
    maxGain: 0.4,
    lookahead: 0.3,                 // cuántos segundos por adelantado se programan las notas
    roots: [45, 41, 38, 40],        // notas graves de cada compás (A, F, D, E)
    thirds: [3, 4, 3, 4],           // 3 = acorde menor, 4 = acorde mayor
});

/* Niveles: idioma de las preguntas y de las respuestas de las habitaciones. */
const LEVELS = Object.freeze({
    easy:   { id: 'easy',   label: 'FÁCIL',      questionLang: 'es', answerLang: 'es' },
    medium: { id: 'medium', label: 'INTERMEDIO', questionLang: 'en', answerLang: 'es' },
    hard:   { id: 'hard',   label: 'DIFÍCIL',    questionLang: 'en', answerLang: 'en' },
});

/* Textos de la interfaz de las habitaciones (según el idioma de las respuestas). */
const ROOM_TEXT = Object.freeze({
    es: {
        room: 'HABITACIÓN DE SERVIDOR',
        correct: '[OK] ¡Correcto!',
        wrong: '[X] Incorrecto. ¡Intentá de nuevo!',
        next: 'CONTINUAR >',
    },
    en: {
        room: 'SERVER ROOM',
        correct: '[OK] Correct!',
        wrong: '[X] Incorrect. Try again!',
        next: 'CONTINUE >',
    },
});

/* Tipos de enemigo.
   count = cuántos aparecen, hp = disparos necesarios, scale = tamaño,
   wander / chase = velocidad al pasear / al perseguirte (casillas por segundo),
   damage = daño al tocarte, reward = puntos, ammo = balas que suelta,
   color = color de las chispas al recibir un disparo (y del punto en el minimapa). */
const VIRUS_TYPES = Object.freeze({
    virus: {
        id: 'virus', count: 5, hp: 2, scale: 0.7,
        wander: 0.8, chase: 1.4, damage: 10, reward: 100, ammo: 30, frameMs: 450,
        color: '#b84dff',
    },
    worm: {
        id: 'worm', count: 4, hp: 1, scale: 0.5,
        wander: 1.3, chase: 2.2, damage: 5, reward: 60, ammo: 20, frameMs: 180,
        color: '#a6ff00',
    },
    trojan: {
        id: 'trojan', count: 2, hp: 5, scale: 0.9,
        wander: 0.5, chase: 0.9, damage: 20, reward: 300, ammo: 80, frameMs: 400,
        color: '#ff7a00',
    },
    rootkit: {
        id: 'rootkit', count: 2, hp: 3, scale: 0.8,
        wander: 0.7, chase: 1.1, damage: 15, reward: 250, ammo: 50, frameMs: 220,
        alpha: 0.65, phasing: true, chaseRange: 5,       // atraviesa paredes
        color: '#00e5ff',
    },
    bomb: {
        id: 'bomb', count: 2, hp: 1, scale: 0.6,
        wander: 0.9, chase: 2.6, damage: 30, reward: 150, ammo: 30, frameMs: 250,
        explodes: true, deathMs: 450,                    // explota al tocarte
        color: '#ff2b2b',
    },
    /* JEFE FINAL: count 0 porque no aparece al inicio. Se invoca cuando
       eliminás a todos los demás Y resolviste todas las habitaciones. Cuando le queda
       la mitad de la vida se enfurece y va más rápido (enrageAt / enrageSpeed). */
    boss: {
        id: 'boss', name: 'KERNEL PANIC', count: 0, hp: 70, scale: 1.7,
        wander: 0.8, chase: 1.3, damage: 30, reward: 2000, ammo: 0, frameMs: 260,
        chaseRange: 16, touch: 0.95,
        boss: true, deathMs: 1800, enrageAt: 0.5, enrageSpeed: 1.8,
        // Ataque a distancia: lanza partículas de virus en abanico.
        // Cuando se enfurece dispara más seguido y con más partículas.
        ranged: {
            range: 12, speed: 3.6, damage: 8, spread: 0.2,
            cooldownMs: 1900, shots: 3,
            enragedCooldownMs: 1100, enragedShots: 5,
        },
        // Al bajar a esta fracción de vida invoca un virus de cada tipo
        summonAt: 0.5, summonTypes: ['virus', 'worm', 'trojan', 'rootkit', 'bomb'],
        color: '#ff1a1a',
    },
});

/* Jefe del SECTOR 03: más vida, más rápido, dispara más partículas e invoca más refuerzos. */
const BOSS_SECTOR_03 = Object.freeze({
    ...VIRUS_TYPES.boss,
    name: 'ROOT OVERLORD',
    hp: 120, scale: 1.9,
    wander: 0.9, chase: 1.5, damage: 35, reward: 5000, chaseRange: 22,
    ranged: Object.freeze({
        range: 14, speed: 4, damage: 8, spread: 0.18,
        cooldownMs: 1500, shots: 5,
        enragedCooldownMs: 800, enragedShots: 7,
    }),
    summonTypes: ['virus', 'worm', 'trojan', 'rootkit', 'bomb', 'worm', 'bomb', 'virus'],
});

const COLORS = Object.freeze({
    // Escenario (techo y piso se dibujan en franjas planas)
    ceilingHorizon: '#06301a',
    floorHorizon: '#0a3a1f',
    wallEdge: '#17a34a',
    doorEdge: '#ff7a7a',
    codeHead: '#d8ffe8',
    codeBgWall: '#010b04',
    codeBgDoor: '#120203',

    // Armas
    gunDark: '#101410',
    gunLight: '#4a5a4a',
    gunCore: '#66ff99',
    gunFiring: '#ffcc00',

    // Efectos
    crosshair: '#33ff66',
    danger: '#e03030',
    hurtOverlay: 'rgba(255, 0, 0, 0.25)',

    // Minimapa
    minimapWall: '#0d5a2c',
    minimapFloor: '#031a0c',
    minimapDoor: '#ff3333',
});

/* Armas. cooldownMs = tiempo entre disparos, cost = balas por disparo, damage = daño por impacto,
   pellets = rayos por disparo, spread = dispersión en píxeles (0 = exacto). */
const WEAPONS = ({
    pistol:  { id: 'pistol',  name: 'PISTOLA',    key: 'Digit1', cooldownMs: 150, cost: 1, damage: 1, pellets: 1, spread: 0,
               rgb: '102,255,153', sparks: ['#ffffff', '#ffe066', '#66ff99'], tracer: true,  tracerWidth: 5,  muzzleY: 142, flashY: 136 },
    shotgun: { id: 'shotgun', name: 'ESCOPETA',   key: 'Digit2', cooldownMs: 750, cost: 2, damage: 1, pellets: 7, spread: 70,
               rgb: '255,170,60',  sparks: ['#ffffff', '#ffb347'],            tracer: false, tracerWidth: 0,  muzzleY: 150, flashY: 154 },
    smg:     { id: 'smg',     name: 'METRALLETA', key: 'Digit3', cooldownMs: 75,  cost: 1, damage: 1, pellets: 1, spread: 16,
               rgb: '255,204,0',   sparks: ['#ffffff', '#ffcc00'],            tracer: true,  tracerWidth: 2,  muzzleY: 160, flashY: 162 },
    plasma:  { id: 'plasma',  name: 'PLASMA',     key: 'Digit4', cooldownMs: 650, cost: 3, damage: 4, pellets: 1, spread: 0,
               rgb: '0,229,255',   sparks: ['#ffffff', '#00e5ff'],            tracer: true,  tracerWidth: 12, muzzleY: 150, flashY: 150 },
});
WEAPONS.sniper = ({
    id: 'sniper', name: 'FRANCOTIRADOR', key: 'Digit5', cooldownMs: 900, cost: 5, damage: 6, pellets: 1, spread: 0,
    rgb: '255,90,90', sparks: ['#ffffff', '#ff5a5a'], tracer: true, tracerWidth: 3, muzzleY: 190, flashY: 190,
});
Object.values(WEAPONS).forEach(Object.freeze);
Object.freeze(WEAPONS);
const WEAPON_ORDER = Object.keys(WEAPONS);

/* Lluvia de código de las paredes: cada textura tiene 16 columnas de símbolos. */
const CODE_TEXTURE = Object.freeze({
    width: 128, cols: 16, rows: 16, glyphW: 8, glyphH: 10,
});
const GLYPHS = '0101010123456789ABCDEF<>/{}[]();=+*#$%&!?:|';
const CODE_PALETTES = Object.freeze({
    wall: [[0, 255, 102], [0, 255, 102], [0, 255, 102], [0, 229, 255], [166, 255, 0]],
    door: [[255, 51, 51], [255, 51, 51], [255, 140, 0]],
});

/* Cara del HUD en texto (estilo retro, sin emojis) */
const FACES = Object.freeze({ idle: '[o_o]', win: '[^_^]', hurt: '[x_x]' });

const KEY_BINDINGS = Object.freeze({
    forward:     ['KeyW', 'ArrowUp'],
    backward:    ['KeyS', 'ArrowDown'],
    strafeLeft:  ['KeyA'],
    strafeRight: ['KeyD'],
    turnLeft:    ['ArrowLeft'],
    turnRight:   ['ArrowRight'],
    fire:        ['Space'],
});
const GAME_KEYS = new Set(Object.values(KEY_BINDINGS).flat());

const SPRITE_SIZE = 64;

/* Mapa: 1 = pared, 0 = pasillo, 2 = puerta de habitación.
   Se accede como worldMap[x][y] (el primer índice es X). */
const MAP_SECTOR_02 = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,2,1],
    [1,0,1,0,1,0,1,1,1,0,1,1],
    [1,0,1,0,0,0,0,0,1,0,0,1],
    [1,1,1,1,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,0,1],
    [1,0,2,0,1,0,0,0,0,2,0,1],
    [1,1,1,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
];

/* ==========================================================================
   SECTORES (cada sector es un mapa distinto)
   Para agregar uno nuevo, sumá otro objeto a SECTORS.
   Los mapas de texto se leen tal cual se ven en el minimapa:
   # = pared, . = pasillo, D = puerta de habitación (arriba del texto = norte del minimapa).
   counts = cuántos virus de cada tipo aparecen (si no se pone, se usan los de VIRUS_TYPES).
   ========================================================================== */
const parseMap = (rows) => Array.from({ length: rows[0].length }, (_, x) =>
    Array.from({ length: rows.length }, (_, y) => {
        const ch = rows[rows.length - 1 - y][x];
        return ch === '#' ? TILE.WALL : ch === 'D' ? TILE.DOOR : TILE.EMPTY;
    }));

const MAP_SECTOR_03_ROWS = [
    '#########################',
    '#D..#.................#D#',
    '###.#.#####.#.#######.#.#',
    '#...#.#D#...#...........#',
    '#.###.....#####.##..##.##',
    '#.....#.#.#.............#',
    '#.#...#.#.#...#.....##..#',
    '#.....#.#...#...........#',
    '###...#.####D####..#.##.#',
    '#...............#.......#',
    '#.#####..####.#.####..###',
    '#.#..D#.......#.........#',
    '#.#.###.#.....#####...#.#',
    '#.#...#.#...............#',
    '#.###.#.#.....#####.#.#.#',
    '#.......#.....#.......#.#',
    '#######.#.###.######D##.#',
    '#.....#....D#.......#...#',
    '#.###.########.####.#.###',
    '#.#.....................#',
    '#.#.#.#.#########.....#.#',
    '#.......................#',
    '#...#.#####...#.#####.###',
    '#.............#........D#',
    '#########################',
];

const SECTORS = Object.freeze([
    {
        id: 's02', name: 'SECTOR 02',
        map: MAP_SECTOR_02,
        start: { x: 1.5, y: 1.5 },
        counts: null,                         // usa los números de VIRUS_TYPES (15 virus)
        minimapCell: 9,
        startAmmo: CONFIG.startAmmo,
        minSpawnDistance: CONFIG.enemyMinSpawnDistance,
        bossAmmoBonus: CONFIG.bossAmmoBonus,
        boss: VIRUS_TYPES.boss,
        theme: {
            ceiling: COLORS.ceilingHorizon, floor: COLORS.floorHorizon,
            wallEdge: COLORS.wallEdge, wallPalette: CODE_PALETTES.wall,
            codeBg: COLORS.codeBgWall, minimapWall: COLORS.minimapWall,
        },
    },
    {
        id: 's03', name: 'SECTOR 03',
        map: parseMap(MAP_SECTOR_03_ROWS),    // 25x25, 8 habitaciones
        start: { x: 1.5, y: 1.5 },
        counts: { virus: 12, worm: 10, trojan: 5, rootkit: 5, bomb: 6 },   // 38 virus
        minimapCell: 6,
        startAmmo: 800,
        minSpawnDistance: 7,
        bossAmmoBonus: 300,
        boss: BOSS_SECTOR_03,
        theme: {
            ceiling: '#2a0a3a', floor: '#1a0626',
            wallEdge: '#b84dff',
            wallPalette: [[184, 77, 255], [184, 77, 255], [184, 77, 255], [255, 43, 200], [0, 229, 255]],
            codeBg: '#0a0212', minimapWall: '#5a1a8a',
        },
    },
]);

let currentSector = SECTORS[0];
let LEVEL = currentSector.map;

/* Preguntas de las habitaciones (programación básica).
   Cada texto tiene versión en español (es) y en inglés (en).
   La PRIMERA opción es siempre la correcta: se mezclan al mostrarse.
   Para agregar una pregunta, sumá otro objeto a la lista. */
const T = (es, en) => ({ es, en });      // texto en los dos idiomas
const S = (text) => ({ es: text, en: text });   // texto igual en los dos idiomas (código, símbolos)

const CHALLENGES = [
    {
        question: T('¿Qué es una variable?', 'What is a variable?'),
        options: [
            T('Un espacio con nombre en la memoria que guarda un valor', 'A named space in memory that stores a value'),
            T('Un tipo de bucle que se repite para siempre', 'A type of loop that repeats forever'),
            T('Un error en la sintaxis del código', 'A mistake in the syntax of the code'),
            T('Un programa que traduce código', 'A program that translates code'),
        ],
        explanation: T(
            'Una variable guarda un valor que tu programa puede leer y cambiar.',
            'A variable stores a value that your program can read and change.'),
    },
    {
        question: T('¿Qué símbolo asigna un valor a una variable en JavaScript?', 'Which symbol assigns a value to a variable in JavaScript?'),
        options: [S('='), S('=='), S('!='), S('=>')],
        explanation: T(
            '= asigna un valor, mientras que == compara dos valores.',
            '= assigns a value, while == compares two values.'),
    },
    {
        question: T('¿Qué imprime este código? console.log(2 + 3 * 4)', 'What does this code print? console.log(2 + 3 * 4)'),
        options: [S('14'), S('20'), S('24'), S('9')],
        explanation: T(
            'La multiplicación va primero: 3 * 4 = 12, y después 2 + 12 = 14.',
            'Multiplication comes first: 3 * 4 = 12, and then 2 + 12 = 14.'),
    },
    {
        question: T('¿Qué tipo de dato solo puede ser verdadero o falso?', 'Which data type can only be true or false?'),
        options: [
            T('Booleano', 'Boolean'),
            T('String (texto)', 'String'),
            T('Número', 'Number'),
            T('Array (arreglo)', 'Array'),
        ],
        explanation: T(
            'Un booleano tiene exactamente dos valores posibles: true y false.',
            'A boolean has exactly two possible values: true and false.'),
    },
    {
        question: T('¿Para qué sirve un bucle (loop)?', 'What is a loop used for?'),
        options: [
            T('Para repetir un bloque de código varias veces', 'To repeat a block of code several times'),
            T('Para guardar texto en una variable', 'To store text in a variable'),
            T('Para apagar la computadora', 'To stop the computer'),
            T('Para escribir un comentario', 'To write a comment'),
        ],
        explanation: T(
            'Los bucles te permiten repetir instrucciones sin escribirlas una y otra vez.',
            'Loops let you repeat instructions without writing them again and again.'),
    },
    {
        question: T('¿Cuántas veces se ejecuta este bucle? for (let i = 0; i < 3; i++) { ... }', 'How many times does this loop run? for (let i = 0; i < 3; i++) { ... }'),
        options: [
            T('3 veces', '3 times'),
            T('2 veces', '2 times'),
            T('4 veces', '4 times'),
            T('Para siempre', 'Forever'),
        ],
        explanation: T(
            'La variable i toma los valores 0, 1 y 2, así que el cuerpo se ejecuta 3 veces.',
            'The variable i takes the values 0, 1 and 2, so the body runs 3 times.'),
    },
    {
        question: T('¿Qué es un array (arreglo)?', 'What is an array?'),
        options: [
            T('Una lista ordenada de valores', 'An ordered list of values'),
            T('Un único valor verdadero o falso', 'A single true or false value'),
            T('Un error en el código', 'A mistake in the code'),
            T('Un comando que borra archivos', 'A command that deletes files'),
        ],
        explanation: T(
            'Un array guarda varios valores en orden, por ejemplo [10, 20, 30].',
            'An array stores several values in order, for example [10, 20, 30].'),
    },
    {
        question: T('En la mayoría de los lenguajes de programación, ¿cuál es el índice del primer elemento de un array?', 'In most programming languages, what is the index of the first element of an array?'),
        options: [S('0'), S('1'), S('-1'), S('10')],
        explanation: T(
            'Los índices empiezan en 0, así que el primer elemento está en la posición 0.',
            'Indexes start at 0, so the first element is at position 0.'),
    },
    {
        question: T('¿Para qué sirve una sentencia if?', 'What is an if statement used for?'),
        options: [
            T('Para ejecutar código solo cuando una condición es verdadera', 'To run code only when a condition is true'),
            T('Para repetir código diez veces', 'To repeat code ten times'),
            T('Para crear un archivo nuevo', 'To create a new file'),
            T('Para mostrar un error', 'To print an error'),
        ],
        explanation: T(
            'Una sentencia if permite que tu programa tome decisiones.',
            'An if statement lets your program make decisions.'),
    },
    {
        question: T('¿Qué es una función?', 'What is a function?'),
        options: [
            T('Un bloque de código reutilizable con un nombre', 'A reusable block of code with a name'),
            T('Una variable que nunca cambia', 'A variable that never changes'),
            T('Un tipo de error', 'A type of error'),
            T('Una lista de números', 'A list of numbers'),
        ],
        explanation: T(
            'Escribís una función una vez y la llamás cada vez que la necesitás.',
            'You write a function once and call it whenever you need it.'),
    },
    {
        question: T('¿Qué es un bug?', 'What is a bug?'),
        options: [
            T('Un error o defecto en un programa', 'A mistake or defect in a program'),
            T('Una computadora muy rápida', 'A very fast computer'),
            T('Un comentario en el código', 'A comment in the code'),
            T('Un tipo de variable', 'A type of variable'),
        ],
        explanation: T(
            'Encontrar y arreglar bugs se llama depurar (debugging).',
            'Finding and fixing bugs is called debugging.'),
    },
    {
        question: T('¿Qué es un comentario en el código?', 'What is a comment in code?'),
        options: [
            T('Una nota para humanos que la computadora ignora', 'A note for humans that the computer ignores'),
            T('Un comando que se ejecuta dos veces', 'A command that runs twice'),
            T('Un mensaje de error', 'An error message'),
            T('El nombre de una variable', 'The name of a variable'),
        ],
        explanation: T(
            'Los comentarios explican el código a otras personas (y a vos mismo en el futuro).',
            'Comments explain the code to other people (and to your future self).'),
    },
    {
        question: T('¿Cuál de estos valores es un string (texto)?', 'Which of these values is a string?'),
        options: [T('"Hola"', '"Hello"'), S('42'), S('true'), S('[1, 2, 3]')],
        explanation: T(
            'El texto escrito entre comillas es un string.',
            'Text written between quotation marks is a string.'),
    },
    {
        question: T('¿Qué devuelve "code".length en JavaScript?', 'What does "code".length return in JavaScript?'),
        options: [S('4'), S('3'), S('5'), S('0')],
        explanation: T(
            'La palabra "code" tiene 4 caracteres: c, o, d y e.',
            'The word "code" has 4 characters: c, o, d and e.'),
    },
    {
        question: T('¿Qué operador significa AND lógico en JavaScript?', 'Which operator means logical AND in JavaScript?'),
        options: [S('&&'), S('||'), S('!'), S('==')],
        explanation: T(
            'a && b es verdadero solo cuando a y b son verdaderos.',
            'a && b is true only when both a and b are true.'),
    },
    {
        question: T('¿Cuál es el resultado de 10 % 3?', 'What is the result of 10 % 3?'),
        options: [S('1'), S('3'), S('0'), S('3.33')],
        explanation: T(
            'El operador % devuelve el resto de una división: 10 = 3 * 3 + 1.',
            'The % operator returns the remainder of a division: 10 = 3 * 3 + 1.'),
    },
    {
        question: T('¿Qué hace un compilador?', 'What does a compiler do?'),
        options: [
            T('Traduce el código fuente a una forma que la computadora puede ejecutar', 'Translates source code into a form the computer can run'),
            T('Borra las variables que no se usan', 'Deletes unused variables'),
            T('Dibuja imágenes en la pantalla', 'Draws images on the screen'),
            T('Conecta tu computadora a internet', 'Connects your computer to the internet'),
        ],
        explanation: T(
            'Los compiladores y los intérpretes convierten el código que escribís en instrucciones de máquina.',
            'Compilers and interpreters turn the code you write into machine instructions.'),
    },
    {
        question: T('¿Qué es un algoritmo?', 'What is an algorithm?'),
        options: [
            T('Un procedimiento paso a paso para resolver un problema', 'A step-by-step procedure to solve a problem'),
            T('Un tipo de teclado', 'A type of keyboard'),
            T('Un virus informático', 'A computer virus'),
            T('Un navegador web', 'A web browser'),
        ],
        explanation: T(
            'Una receta de cocina es un buen ejemplo: una lista clara de pasos que lleva a un resultado.',
            'A recipe is a good example: a clear list of steps that leads to a result.'),
    },
    {
        question: T('¿Qué palabra clave crea una variable que no se puede reasignar en JavaScript?', 'Which keyword creates a variable that cannot be reassigned in JavaScript?'),
        options: [S('const'), S('let'), S('var'), S('fixed')],
        explanation: T(
            'const mantiene siempre el mismo valor, mientras que let y var se pueden cambiar después.',
            'const keeps the same value, while let and var can be changed later.'),
    },
    {
        question: T('¿Qué es un bucle infinito?', 'What is an infinite loop?'),
        options: [
            T('Un bucle cuya condición nunca se vuelve falsa', 'A loop whose condition never becomes false'),
            T('Un bucle que se ejecuta exactamente una vez', 'A loop that runs exactly once'),
            T('Un bucle sin código adentro', 'A loop without any code inside'),
            T('Un bucle que se ejecuta muy rápido', 'A loop that runs very fast'),
        ],
        explanation: T(
            'Nunca se detiene solo, así que el programa se queda trabado.',
            'It never stops by itself, so the program gets stuck.'),
    },
    {
        question: T('¿Qué imprime este código? let x = 5; x = x + 1; console.log(x);', 'What does this code print? let x = 5; x = x + 1; console.log(x);'),
        options: [S('6'), S('5'), S('x'), T('Un error', 'An error')],
        explanation: T(
            'x empieza en 5 y después pasa a ser 5 + 1 = 6.',
            'x starts at 5 and then becomes 5 + 1 = 6.'),
    },
    {
        question: T('¿Qué hace la palabra clave return dentro de una función?', 'What does the return keyword do inside a function?'),
        options: [
            T('Devuelve un valor y termina la función', 'Sends a value back and ends the function'),
            T('Empieza un bucle nuevo', 'Starts a new loop'),
            T('Crea una variable', 'Creates a variable'),
            T('Borra la función', 'Deletes the function'),
        ],
        explanation: T(
            'El valor que va después de return es el resultado que recibe quien llamó a la función.',
            'The value after return is the result the caller receives.'),
    },
    {
        question: T('¿Cuál de estos es un array válido en JavaScript?', 'Which of these is a valid array in JavaScript?'),
        options: [S('[1, 2, 3]'), S('{1; 2; 3}'), S('<1, 2, 3>'), S('(1 -> 2 -> 3)')],
        explanation: T(
            'Los arrays se escriben entre corchetes.',
            'Arrays are written between square brackets.'),
    },
    {
        question: T('¿Qué es un parámetro de una función?', 'What is a parameter of a function?'),
        options: [
            T('Una entrada con nombre que la función recibe', 'A named input that the function receives'),
            T('La última línea del programa', 'The last line of the program'),
            T('Un tipo de bucle', 'A kind of loop'),
            T('Un error de sintaxis', 'A syntax error'),
        ],
        explanation: T(
            'En function add(a, b), los nombres a y b son parámetros.',
            'In function add(a, b), the names a and b are parameters.'),
    },
    {
        question: T('¿A qué equivale !true?', 'What does !true evaluate to?'),
        options: [S('false'), S('true'), S('0'), S('undefined')],
        explanation: T(
            'El operador ! (NOT) invierte un valor booleano.',
            'The ! operator (NOT) flips a boolean value.'),
    },
    {
        question: T('¿Qué es un error de sintaxis?', 'What is a syntax error?'),
        options: [
            T('Código que rompe las reglas gramaticales del lenguaje', 'Code that breaks the grammar rules of the language'),
            T('Un programa que corre pero da resultados incorrectos', 'A program that runs but gives wrong results'),
            T('Un programa muy lento', 'A very slow program'),
            T('Una conexión a internet que falta', 'A missing internet connection'),
        ],
        explanation: T(
            'Normalmente el programa ni siquiera se ejecuta hasta que lo arreglás.',
            'The program usually will not run at all until you fix it.'),
    },
    {
        question: T('¿Qué extensión de archivo se usa normalmente para JavaScript?', 'Which file extension is normally used for JavaScript files?'),
        options: [S('.js'), S('.java'), S('.html'), S('.css')],
        explanation: T(
            'Los archivos .js contienen JavaScript, mientras que los .java son de otro lenguaje.',
            '.js files contain JavaScript, while .java files belong to a different language.'),
    },
    {
        question: T('¿Qué hace console.log("Hi")?', 'What does console.log("Hi") do?'),
        options: [
            T('Muestra Hi en la consola', 'Prints Hi in the console'),
            T('Borra la palabra Hi', 'Deletes the word Hi'),
            T('Crea una variable llamada Hi', 'Creates a variable named Hi'),
            T('Cierra el programa', 'Closes the program'),
        ],
        explanation: T(
            'console.log es la forma más fácil de ver qué está haciendo tu código.',
            'console.log is the easiest way to see what your code is doing.'),
    },
];

/* --- Multijugador PVP (PeerJS: conexión directa entre dos navegadores) ----- */

const PVP = Object.freeze({
    kills: 5,                  // eliminaciones para ganar el duelo
    damageMul: 7,              // el daño de cada arma se multiplica por esto contra jugadores
    sendMs: 50,                // cada cuánto se envía tu posición al rival
    shieldMs: 1500,            // protección al reaparecer
    scale: 0.9,                // tamaño del rival en pantalla
});
/* Servidor PVP (WebSocket). Después de subir server/ a Render, poné acá tu URL (wss://...).
   Para probar con tu servidor local: abrí el juego con ?server=ws://localhost:3000 al final de la URL. */
const PVP_SERVER_URL = new URLSearchParams(location.search).get('server') || 'wss://hts-pvp.onrender.com';
const CONNECT_TIMEOUT_MS = 70000;      // Render gratis tarda hasta ~1 minuto en despertar
const net = {
    connTimer: 0, wakeTimer: 0, ws: null,
    peer: null, conn: null, role: null, lastSend: 0, remote: null, myKills: 0, rivalKills: 0, shieldUntil: 0,
    ready: false, rivalReady: false, rival: null, inv: null, lastNade: 0,
};
let remoteTexture;
let nadeTexture;

/* Aspecto del personaje */
const PLAYER_COLORS = Object.freeze([
    { name: 'AZUL',     body: '#4aa3ff', dark: '#2a5d9a', eye: '#00e5ff' },
    { name: 'ROJO',     body: '#ff5a5a', dark: '#9a2a2a', eye: '#ffe066' },
    { name: 'VERDE',    body: '#4aff7a', dark: '#1f8a3a', eye: '#ffffff' },
    { name: 'NARANJA',  body: '#ff9a30', dark: '#9a5410', eye: '#fff0a0' },
    { name: 'VIOLETA',  body: '#b84dff', dark: '#5a1f8a', eye: '#ff99ff' },
    { name: 'AMARILLO', body: '#ffe066', dark: '#9a8420', eye: '#ff5a5a' },
]);
const PLAYER_STYLES = Object.freeze(['CLÁSICO', 'CASCO', 'OREJAS']);

/* Granadas */
const NADE = Object.freeze({ fuseMs: 1800, speed: 7, radius: 2.4, damage: 80, cooldownMs: 600, shieldMs: 5000 });
const nades = [];               // granadas en el aire (las de los dos jugadores)
const blasts = [];              // explosiones recientes (solo visual)

/* Tienda previa al duelo */
const SHOP_CREDITS = 100;
const SHOP_ITEMS = Object.freeze([
    { id: 'shotgun', kind: 'weapon', ref: 'shotgun', name: 'Escopeta',       price: 25, desc: '7 perdigones, ideal de cerca' },
    { id: 'smg',     kind: 'weapon', ref: 'smg',     name: 'Metralleta',     price: 25, desc: 'Disparo rápido' },
    { id: 'plasma',  kind: 'weapon', ref: 'plasma',  name: 'Plasma',         price: 45, desc: 'Daño alto, gasta 3 balas' },
    { id: 'sniper',  kind: 'weapon', ref: 'sniper',  name: 'Francotirador',  price: 40, desc: 'Mira con clic derecho' },
    { id: 'nade',    kind: 'qty',    ref: 'nade',    name: 'Granada [G]',    price: 10, max: 6, desc: 'Explota a los 1,8 s, daño en área' },
    { id: 'medkit',  kind: 'qty',    ref: 'medkit',  name: 'Botiquín [H]',   price: 15, max: 3, desc: 'Recupera 50 de salud' },
    { id: 'shield',  kind: 'qty',    ref: 'shield',  name: 'Escudo [F]',     price: 30, max: 2, desc: 'Invulnerable durante 5 segundos' },
    { id: 'boots',   kind: 'boots',  ref: 'boots',   name: 'Botas veloces',  price: 20, desc: '+30% de velocidad' },
]);

function cleanName(value) {
    const name = String(value ?? '').replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ _-]/g, '').trim().slice(0, 12).toUpperCase();
    return name || 'SENTINEL';
}

/* --- Estado --------------------------------------------------------------- */

const DEFAULT_SETTINGS = Object.freeze({
    weapon: 'pistol',
    sensitivity: 1,
    verticalLook: true,
    music: true,
    musicVolume: 0.5,
    name: 'SENTINEL',
    color: 0,
    style: 0,
});

const worldMap = LEVEL.map((row) => [...row]);

const player = {
    x: 1.5, y: 1.5,
    dirX: 1, dirY: 0,
    planeX: 0, planeY: -0.66,
};

/* Posición desde donde se dibuja la escena (= jugador, siempre en 1ra persona) */
const camera = { x: player.x, y: player.y };

const settings = { ...DEFAULT_SETTINGS };

const state = {
    level: 'easy',              // nivel elegido (easy / medium / hard)
    sector: 0,                  // sector elegido (0 = Sector 02, 1 = Sector 03)
    started: false,
    paused: false,
    settingsOpen: false,
    over: false,
    moving: false,
    pointerLocked: false,
    mouseFiring: false,
    pvp: false,                 // true en un duelo online contra otro jugador
    scoped: false,              // true mientras se mantiene el clic derecho (mira del francotirador)
    zoom: 1,                    // aumento actual de la cámara (1 = normal)
    prevWeapon: null,           // arma que tenías antes de usar la mira
    lookOffset: 0,              // desplazamiento vertical de la vista (px); positivo = mirar arriba
    lastUnlockAt: -Infinity,
    hintUntil: 0,
    score: 0,
    ammo: CONFIG.startAmmo,
    health: CONFIG.startHealth,
    face: FACES.idle,
    lastFireAt: 0,
    firingUntil: 0,
    tracerUntil: 0,
    lastHurtAt: -Infinity,
    hurtUntil: 0,
    roomsTotal: 0,              // cuántas habitaciones hay en el mapa
    roomsDone: 0,               // cuántas ya resolviste
    bossSpawned: false,
    bannerUntil: 0,
    bannerText: '',
    bannerSub: '',
    activeChallenge: null,
    activeDoor: null,
    playTime: 0,                // segundos jugados en la partida actual
    reloadUntil: 0,             // momento en que termina la recarga (0 = no está recargando)
};

let enemies = [];
let particles = [];             // chispas y destellos de los disparos
let projectiles = [];           // partículas de virus que lanza el jefe
let projectileTextures;
let challengeDeck = [];         // preguntas pendientes (se reparten sin repetir hasta agotarlas)
let zBuffer;                    // distancia a la pared de cada columna

let wallTexture;                // lluvia de código verde de las paredes
let doorTexture;                // lluvia de código roja de las puertas
const wallOffsets = new Float32Array(CODE_TEXTURE.cols);
const doorOffsets = new Float32Array(CODE_TEXTURE.cols);
let lastCodeRefresh = 0;

let enemyTextures;
let blastTexture;

const keys = new Set();
const dom = {};
let canvas, ctx;
let lastFrameTime = 0;
let faceTimer = null;

/* Estado del motor de música */
const audio = { ctx: null, master: null, noise: null, timer: null, nextTime: 0, step: 0 };

/* --- Utilidades ----------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Mezcla una lista en el lugar (Fisher-Yates) y la devuelve. */
function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

/** Devuelve el tipo de casilla; fuera del mapa cuenta como pared. */
function getTile(x, y) {
    return worldMap[Math.floor(x)]?.[Math.floor(y)] ?? TILE.WALL;
}

function setTile(x, y, value) {
    worldMap[x][y] = value;
}

function aliveCount() {
    return enemies.filter((e) => e.alive).length;
}

/* --- Música de fondo (Web Audio, sin archivos) ---------------------------- */

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Nota con envolvente simple (ataque rápido y caída). */
function playTone(type, freq, start, duration, gain, cutoff) {
    const c = audio.ctx;
    const osc = c.createOscillator();
    const filter = c.createBiquadFilter();
    const amp = c.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(audio.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
}

function playKick(start) {
    const c = audio.ctx;
    const osc = c.createOscillator();
    const amp = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, start);
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.12);
    amp.gain.setValueAtTime(0.8, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    osc.connect(amp);
    amp.connect(audio.master);
    osc.start(start);
    osc.stop(start + 0.25);
}

function playHat(start) {
    const c = audio.ctx;
    const source = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const amp = c.createGain();

    source.buffer = audio.noise;
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    amp.gain.setValueAtTime(0.14, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(audio.master);
    source.start(start);
    source.stop(start + 0.08);
}

/** Programa lo que suena en cada paso de semicorchea (16 pasos por compás, 4 compases). */
function playMusicStep(step, time, stepDuration) {
    const bar = Math.floor(step / 16) % MUSIC.roots.length;
    const s = step % 16;
    const root = MUSIC.roots[bar];
    const third = MUSIC.thirds[bar];

    if (s % 4 === 0) playKick(time);
    if (s % 4 === 2) playHat(time);

    // Bajo: corcheas, con salto de octava de vez en cuando
    if (s % 2 === 0) {
        const note = root + (s % 8 === 6 ? 12 : 0);
        playTone('sawtooth', midiToHz(note), time, stepDuration * 1.8, 0.3, 520);
    }

    // Arpegio agudo del acorde
    const chord = [0, third, 7, 12];
    const pattern = [0, 1, 2, 3, 2, 1, 2, 1];
    playTone('square', midiToHz(root + 24 + chord[pattern[s % 8]]), time, stepDuration * 0.9, 0.04, 2200);

    // Colchón de sonido al comienzo de cada compás
    if (s === 0) {
        for (const interval of [12, 12 + third, 19]) {
            playTone('sine', midiToHz(root + interval), time, stepDuration * 16, 0.06, 1200);
        }
    }
}

function scheduleMusic() {
    const stepDuration = 60 / MUSIC.bpm / 4;
    while (audio.nextTime < audio.ctx.currentTime + MUSIC.lookahead) {
        playMusicStep(audio.step, audio.nextTime, stepDuration);
        audio.nextTime += stepDuration;
        audio.step = (audio.step + 1) % (16 * MUSIC.roots.length);
    }
}

function applyMusicVolume() {
    if (!audio.ctx) return;
    audio.master.gain.setTargetAtTime(settings.musicVolume * MUSIC.maxGain, audio.ctx.currentTime, 0.05);
}

function startMusic() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audio.ctx) {
        audio.ctx = new AudioCtx();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = settings.musicVolume * MUSIC.maxGain;
        audio.master.connect(audio.ctx.destination);

        // Ruido blanco para el hi-hat
        const length = Math.floor(audio.ctx.sampleRate * 0.3);
        audio.noise = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
        const data = audio.noise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }

    const resumed = audio.ctx.resume();
    if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
    applyMusicVolume();

    if (!audio.timer) {
        audio.nextTime = Math.max(audio.nextTime, audio.ctx.currentTime + 0.1);
        audio.timer = setInterval(scheduleMusic, 50);
    }
}

function stopMusic() {
    clearInterval(audio.timer);
    audio.timer = null;
    if (audio.ctx && audio.ctx.state === 'running') {
        const suspended = audio.ctx.suspend();
        if (suspended && typeof suspended.catch === 'function') suspended.catch(() => {});
    }
}

/** Enciende o apaga la música según la configuración y el estado de la partida. */
function applyMusic() {
    if (state.started && !state.over && settings.music) startMusic();
    else stopMusic();
}

function setMusic(on) {
    settings.music = on;
    saveSettings();
    syncSettingsUi();
    applyMusic();
}

function toggleMusic() {
    setMusic(!settings.music);
}

function onMusicVolumeInput() {
    settings.musicVolume = clamp(Number(dom.musicVolume.value), 0, 1);
    dom.musicVolumeValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
    saveSettings();
    applyMusicVolume();
}

function onMusicButton(e) {
    toggleMusic();
    e.currentTarget.blur();   // evita que la barra espaciadora "pulse" el botón
}

/* --- Pantalla completa (permanente) --------------------------------------- */

/**
 * El juego siempre ocupa toda la ventana (lo hace el CSS) y además pide al navegador
 * la pantalla completa real. Los navegadores solo la permiten después de un clic o
 * una tecla, por eso se vuelve a pedir en cada clic importante (empezar, volver
 * de la configuración, volver de una habitación...).
 */
function enterFullscreen() {
    if (document.fullscreenElement) return;
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) return;
    try {
        const result = request.call(root);
        if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
        /* el navegador no permite la pantalla completa */
    }
}

/* --- Configuración del usuario -------------------------------------------- */

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (!saved) return;

        if (WEAPONS[saved.weapon]) {
            settings.weapon = saved.weapon;
        }
        if (Number.isFinite(saved.sensitivity)) {
            settings.sensitivity = clamp(saved.sensitivity, CONFIG.minSensitivity, CONFIG.maxSensitivity);
        }
        if (typeof saved.verticalLook === 'boolean') {
            settings.verticalLook = saved.verticalLook;
        }
        if (typeof saved.music === 'boolean') {
            settings.music = saved.music;
        }
        if (Number.isFinite(saved.musicVolume)) {
            settings.musicVolume = clamp(saved.musicVolume, 0, 1);
        }
        if (typeof saved.name === 'string') settings.name = cleanName(saved.name);
        if (PLAYER_COLORS[saved.color]) settings.color = saved.color;
        if (PLAYER_STYLES[saved.style]) settings.style = saved.style;
    } catch {
        /* sin almacenamiento o datos inválidos: se usan los valores por defecto */
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        /* sin almacenamiento: las opciones valen solo para esta sesión */
    }
}

function syncSettingsUi() {
    dom.weaponInputs.forEach((input) => {
        input.checked = input.value === settings.weapon;
    });
    dom.sensitivity.value = settings.sensitivity;
    dom.sensitivityValue.textContent = `${settings.sensitivity.toFixed(1)}x`;
    dom.verticalLook.checked = settings.verticalLook;

    dom.musicOn.checked = settings.music;
    dom.musicVolume.value = settings.musicVolume;
    dom.musicVolumeValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
    dom.musicBtn.textContent = settings.music ? 'SND ON' : 'SND OFF';
    dom.musicBtn.setAttribute('aria-pressed', String(settings.music));
}

function selectWeapon(id) {
    if (!WEAPONS[id]) return;
    if (state.pvp && !net.inv.weapons.has(id)) { syncSettingsUi(); return; }   // en PVP solo las compradas
    if (settings.weapon === id) return;
    state.scoped = false;                                      // cambiar de arma a mano cancela la mira
    state.prevWeapon = null;
    settings.weapon = id;
    state.firingUntil = 0;
    state.tracerUntil = 0;
    saveSettings();
    syncSettingsUi();
}

function cycleWeapon(direction) {
    const count = WEAPON_ORDER.length;
    let index = WEAPON_ORDER.indexOf(settings.weapon);
    for (let i = 0; i < count; i++) {
        index = (index + direction + count) % count;
        const id = WEAPON_ORDER[index];
        if (!state.pvp || net.inv.weapons.has(id)) { selectWeapon(id); return; }
    }
}

function onWheel(e) {
    if (!state.pointerLocked || state.paused) return;
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
}

function onSensitivityInput() {
    settings.sensitivity = clamp(Number(dom.sensitivity.value), CONFIG.minSensitivity, CONFIG.maxSensitivity);
    dom.sensitivityValue.textContent = `${settings.sensitivity.toFixed(1)}x`;
    saveSettings();
}

function onVerticalLookChange() {
    settings.verticalLook = dom.verticalLook.checked;
    if (!settings.verticalLook) state.lookOffset = 0;
    saveSettings();
}

/* --- Temporizador --------------------------------------------------------- */

let lastTimerText = '';

/** 75 -> "01:15"; 3725 -> "1:02:05". */
function formatTime(totalSeconds) {
    const total = Math.floor(totalSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function updateTimerDisplay() {
    const text = `TIEMPO ${formatTime(state.playTime)}`;
    if (text === lastTimerText) return;   // solo toca el DOM cuando cambia el segundo
    lastTimerText = text;
    dom.timer.textContent = text;
}

/* --- Volver al menú principal (portada con el botón JUGAR) ---------------- */

function goToMenu() {
    pvpDisconnect();
    state.pvp = false;
    $('modal-pvp').hidden = true;
    $('modal-shop').hidden = true;
    nades.length = 0;
    blasts.length = 0;
    state.started = false;
    state.paused = true;
    state.settingsOpen = false;
    state.over = false;
    state.activeChallenge = null;
    state.activeDoor = null;
    releaseInputs();
    releasePointer();
    applyMusic();                // started = false: detiene la música

    dom.settings.hidden = true;
    dom.settingsBtn.hidden = true;
    dom.timer.hidden = true;
    dom.room.hidden = true;
    dom.modal.hidden = true;
    dom.levelModal.hidden = true;
    dom.introModal.hidden = true;
    dom.videoModal.hidden = true;
    dom.introVideo.pause();

    dom.titleModal.hidden = false;
    dom.titlePlay.focus();
}

function openSettings() {
    if (!state.started || state.over || state.activeChallenge || state.settingsOpen) return;
    state.settingsOpen = true;
    state.paused = true;
    releaseInputs();
    releasePointer();
    syncSettingsUi();
    dom.settings.hidden = false;
    dom.settingsClose.focus();
}

function closeSettings(capture = false) {
    if (!state.settingsOpen) return;
    state.settingsOpen = false;
    state.paused = false;
    dom.settings.hidden = true;
    document.activeElement?.blur();   // evita que la barra espaciadora "pulse" un botón enfocado
    flashMouseHint();
    if (capture) {
        enterFullscreen();            // si salió de pantalla completa, vuelve a entrar
        capturePointer();
    }
}

function onHotkey(e) {
    if (e.repeat || e.target instanceof HTMLInputElement && e.target.type === 'text') return;
    if (e.code === 'Escape') {
        // Si el navegador acaba de soltar el mouse por esta misma tecla, no hacemos nada más
        if (performance.now() - state.lastUnlockAt < 300) return;
        if (state.settingsOpen) closeSettings();
        else openSettings();
    } else if (e.code === 'KeyM') {
        toggleMusic();
    } else if (e.code === 'KeyR') {
        if (state.started && !state.paused && !state.over) startReload(performance.now());
    } else if (state.pvp && state.started && !state.paused && !state.over && ['KeyG', 'KeyH', 'KeyF'].includes(e.code)) {
        pvpUseItem(e.code, performance.now());
    } else if (!state.paused) {
        const id = WEAPON_ORDER.find((weaponId) => WEAPONS[weaponId].key === e.code);
        if (id) selectWeapon(id);
    }
}

/* --- Entrada: teclado ----------------------------------------------------- */

function isPressed(action) {
    return KEY_BINDINGS[action].some((code) => keys.has(code));
}

function onKeyDown(e) {
    if (state.paused || !GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    keys.add(e.code);
}

function onKeyUp(e) {
    keys.delete(e.code);
}

function releaseInputs() {
    keys.clear();
    state.mouseFiring = false;
    setScope(false);
}

/* --- Entrada: mouse ------------------------------------------------------- */

function capturePointer() {
    if (!canvas.requestPointerLock) return;
    try {
        const request = canvas.requestPointerLock();
        if (request && typeof request.catch === 'function') request.catch(() => {});
    } catch {
        /* el navegador no permitió capturar el mouse (por ejemplo, sin un clic previo) */
    }
}

function releasePointer() {
    if (document.pointerLockElement) document.exitPointerLock();
}

function flashMouseHint() {
    state.hintUntil = performance.now() + CONFIG.mouseHintMs;
}

function onPointerLockChange() {
    state.pointerLocked = document.pointerLockElement === canvas;
    if (state.pointerLocked) return;

    state.lastUnlockAt = performance.now();
    state.mouseFiring = false;
    setScope(false);

    // Si el jugador soltó el mouse (Esc) en plena partida, se abre la configuración
    if (state.started && !state.paused && !state.over) openSettings();
}

function onCanvasClick() {
    if (!state.started || state.paused) return;
    enterFullscreen();
    if (!state.pointerLocked) capturePointer();
}

function onMouseMove(e) {
    if (!state.pointerLocked || state.paused) return;
    // Algunos navegadores envían saltos enormes de vez en cuando: se ignoran
    if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;

    const slow = settings.sensitivity / state.zoom;            // con zoom el mouse es más lento y preciso

    rotate(-e.movementX * CONFIG.mouseYawPerPixel * slow);

    if (settings.verticalLook) {
        const offset = state.lookOffset - e.movementY * CONFIG.mousePitchPerPixel * slow;
        state.lookOffset = clamp(offset, -CONFIG.maxLookOffset, CONFIG.maxLookOffset);
    }
}

/** Clic derecho: saca el francotirador y activa la mira; al soltar vuelve al arma anterior. */
function setScope(on) {
    if (on === state.scoped) return;
    if (on) {
        if (!state.started || state.paused || state.over) return;
        if (state.pvp && !net.inv.weapons.has('sniper')) return;   // hace falta comprar el francotirador
        state.scoped = true;
        if (settings.weapon !== 'sniper') {
            state.prevWeapon = settings.weapon;
            settings.weapon = 'sniper';                        // cambio temporal (no se guarda)
            state.firingUntil = 0;
            state.tracerUntil = 0;
            syncSettingsUi();
        }
    } else {
        state.scoped = false;
        if (state.prevWeapon && WEAPONS[state.prevWeapon]) {
            settings.weapon = state.prevWeapon;
            state.firingUntil = 0;
            state.tracerUntil = 0;
            syncSettingsUi();
        }
        state.prevWeapon = null;
    }
}

/** Ajusta el campo de visión según el zoom actual (el plano de cámara se achica al hacer zoom). */
function applyZoom() {
    const length = Math.hypot(player.planeX, player.planeY);
    if (!length) return;
    const scale = (CONFIG.basePlane / state.zoom) / length;
    player.planeX *= scale;
    player.planeY *= scale;
}

function updateZoom(dt) {
    const target = state.scoped ? CONFIG.sniperZoom : 1;
    const diff = target - state.zoom;
    state.zoom = Math.abs(diff) < 0.01 ? target : state.zoom + diff * Math.min(1, dt * CONFIG.zoomSpeed);
    applyZoom();
}

function onMouseDown(e) {
    if (!state.pointerLocked || state.paused) return;
    if (e.button === 0) state.mouseFiring = true;
    else if (e.button === 2) setScope(true);
}

function onMouseUp(e) {
    if (e.button === 0) state.mouseFiring = false;
    else if (e.button === 2) setScope(false);
}

/* --- PVP: red --------------------------------------------------------------- */

const pvpStatus = (text) => { $('pvp-status').textContent = text; };

function netSend(msg) {
    if (net.conn && net.conn.open && net.ws && net.ws.readyState === 1) {
        net.ws.send(JSON.stringify({ type: 'msg', d: msg }));
    }
}

function pvpClearTimer() {
    clearTimeout(net.connTimer);
    clearTimeout(net.wakeTimer);
    net.connTimer = 0;
    net.wakeTimer = 0;
}

function pvpDisconnect() {
    pvpClearTimer();
    const ws = net.ws;
    net.ws = null;
    net.conn = null;
    try { ws?.close(); } catch { /* ya estaba cerrado */ }
}

function openPvpMenu() {
    dom.levelModal.hidden = true;
    renderProfileUi();
    $('pvp-code').textContent = '';
    pvpStatus('');
    $('modal-pvp').hidden = false;
    $('btn-pvp-host').focus();
}

function closePvpMenu() {
    pvpDisconnect();
    $('modal-pvp').hidden = true;
    dom.levelModal.hidden = false;
}

/** Abre el WebSocket al servidor y llama a onOpen cuando está listo. */
function pvpConnect(onOpen) {
    pvpDisconnect();
    let ws;
    try { ws = new WebSocket(PVP_SERVER_URL); } catch {
        pvpStatus('La dirección del servidor no es válida. Revisá PVP_SERVER_URL en game.js.');
        return;
    }
    net.ws = ws;
    pvpStatus('Conectando con el servidor...');
    net.wakeTimer = setTimeout(() => {
        if (net.ws === ws && ws.readyState === 0) pvpStatus('Despertando el servidor (puede tardar hasta 1 minuto)...');
    }, 4000);
    net.connTimer = setTimeout(() => {
        if (net.ws !== ws || ws.readyState === 1) return;
        pvpDisconnect();
        pvpStatus('No se pudo conectar con el servidor (tiempo agotado). Probá de nuevo en un rato.');
    }, CONNECT_TIMEOUT_MS);
    ws.onopen = () => {
        if (net.ws !== ws) return;
        pvpClearTimer();
        onOpen();
    };
    ws.onmessage = (ev) => {
        if (net.ws !== ws) return;
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        onServerMsg(m);
    };
    ws.onerror = () => {
        if (net.ws !== ws) return;
        pvpClearTimer();
        net.ws = null;
        pvpStatus('No se pudo conectar con el servidor. Revisá tu internet o probá de nuevo en un rato.');
    };
    ws.onclose = () => {
        if (net.ws !== ws) return;
        pvpClearTimer();
        net.ws = null;
        if (net.conn) onNetClose();
        else if (!$('modal-pvp').hidden) pvpStatus('Se cortó la conexión con el servidor.');
    };
}

function onServerMsg(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'created' && typeof m.code === 'string') {
        $('pvp-code').textContent = m.code;
        pvpStatus('Pasale este código a tu amigo y esperá a que entre...');
    } else if (m.type === 'joined' || m.type === 'peer-joined') {
        pvpPaired();
    } else if (m.type === 'peer-left') {
        if (net.conn) onNetClose();
    } else if (m.type === 'msg') {
        onNetData(m.d);
    } else if (m.type === 'error') {
        const texts = {
            'no-room': 'No existe una sala con ese código.',
            'full': 'Esa sala ya está llena.',
            'busy': 'El servidor está ocupado, probá de nuevo en un momento.',
        };
        pvpStatus(texts[m.reason] ?? 'Error del servidor.');
    }
}

function pvpHost() {
    commitName();
    net.role = 'host';
    pvpConnect(() => net.ws.send(JSON.stringify({ type: 'create' })));
}

function pvpJoin() {
    commitName();
    const code = $('pvp-input').value.trim().toUpperCase();
    if (code.length < 5) { pvpStatus('Escribí el código de 5 letras que te dio tu amigo.'); return; }
    net.role = 'guest';
    pvpConnect(() => {
        pvpStatus('Buscando la sala...');
        net.ws.send(JSON.stringify({ type: 'join', code }));
    });
}

/** Los dos jugadores ya están en la sala (equivale al 'open' de antes). */
function pvpPaired() {
    net.conn = { open: true };
    net.ready = false;
    net.rivalReady = false;
    net.rival = null;
    if (net.role === 'host') {
        netSend({ t: 'hello', sector: state.sector });
        openShop();
    }
}

function onNetClose() {
    net.conn = null;
    if (state.pvp && !state.over) pvpEnd(true, 'el rival se desconectó');
    else if (!$('modal-shop').hidden) {
        $('modal-shop').hidden = true;
        $('modal-pvp').hidden = false;
        pvpStatus('El rival se fue de la sala.');
    } else if (!$('modal-pvp').hidden) pvpStatus('Se cortó la conexión.');
}

function onNetData(msg) {
    if (!msg || typeof msg !== 'object') return;
    const now = performance.now();
    if (msg.t === 'hello' && net.role === 'guest' && SECTORS[msg.sector]) {
        state.sector = msg.sector;
        openShop();
    } else if (msg.t === 'pos' && net.remote && Number.isFinite(msg.x) && Number.isFinite(msg.y)) {
        net.remote.x = msg.x;
        net.remote.y = msg.y;
        if (!net.remote.seen) { net.remote.rx = msg.x; net.remote.ry = msg.y; net.remote.seen = true; }
    } else if (msg.t === 'hit' && state.pvp && !state.over) {
        if (Number.isFinite(msg.d)) damageSelf(clamp(msg.d, 0, 100), now);
    } else if (msg.t === 'ready') {
        net.rival = {
            name: cleanName(msg.name),
            color: PLAYER_COLORS[msg.color] ? msg.color : 0,
            style: PLAYER_STYLES[msg.style] ? msg.style : 0,
        };
        net.rivalReady = true;
        maybeStart();
    } else if (msg.t === 'nade' && state.pvp && !state.over) {
        if ([msg.x, msg.y, msg.vx, msg.vy].every(Number.isFinite)) {
            nades.push({ x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, explodeAt: now + NADE.fuseMs });
        }
    } else if (msg.t === 'dead' && state.pvp && !state.over) {
        net.myKills++;
        flashFace(FACES.win);
        if (net.myKills >= PVP.kills) pvpEnd(true);
    }
}

/* --- PVP: partida ----------------------------------------------------------- */

/** Dos puntos de aparición: el inicio del sector y la casilla más lejana (por camino). */
function pvpSpawns() {
    const start = { x: currentSector.start.x, y: currentSector.start.y };
    const key = (x, y) => `${x},${y}`;
    const first = [Math.floor(start.x), Math.floor(start.y)];
    const dist = new Map([[key(...first), 0]]);
    const queue = [first];
    let far = first;
    for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        const d = dist.get(key(x, y));
        if (d > dist.get(key(...far))) far = [x, y];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (getTile(nx, ny) !== TILE.EMPTY || dist.has(key(nx, ny))) continue;
            dist.set(key(nx, ny), d + 1);
            queue.push([nx, ny]);
        }
    }
    return [start, { x: far[0] + 0.5, y: far[1] + 0.5 }];
}

function startPvp() {
    state.pvp = true;
    net.myKills = 0;
    net.rivalKills = 0;
    net.shieldUntil = 0;
    net.lastNade = 0;
    net.remote = { x: 0, y: 0, rx: 0, ry: 0, seen: false };
    nades.length = 0;
    blasts.length = 0;
    const rival = net.rival ?? { name: 'RIVAL', color: 0, style: 0 };
    remoteTexture = makeRobotTexture(rival.color, rival.style);
    settings.weapon = 'pistol';                                // en PVP solo tenés lo que compraste
    syncSettingsUi();
    $('modal-shop').hidden = true;
    $('modal-pvp').hidden = true;
    startGame();
}

function maybeStart() {
    if (net.ready && net.rivalReady && net.conn && !state.pvp) startPvp();
}

/* --- PVP: perfil y tienda -------------------------------------------------- */

const shop = { cart: null };

function newCart() {
    return { weapons: new Set(['pistol']), nade: 0, medkit: 0, shield: 0, boots: false };
}

function itemCount(cart, item) {
    if (item.kind === 'weapon') return cart.weapons.has(item.ref) ? 1 : 0;
    if (item.kind === 'boots') return cart.boots ? 1 : 0;
    return cart[item.ref];
}

function setItemCount(cart, item, count) {
    if (item.kind === 'weapon') {
        if (count) cart.weapons.add(item.ref); else cart.weapons.delete(item.ref);
    } else if (item.kind === 'boots') {
        cart.boots = count > 0;
    } else {
        cart[item.ref] = count;
    }
}

const cartCost = (cart) => SHOP_ITEMS.reduce((sum, item) => sum + item.price * itemCount(cart, item), 0);

function commitName() {
    settings.name = cleanName($('pvp-name').value);
    $('pvp-name').value = settings.name;
    saveSettings();
}

function renderProfileUi() {
    $('pvp-name').value = settings.name;
    $('pvp-colors').replaceChildren(...PLAYER_COLORS.map((color, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `swatch${i === settings.color ? ' is-selected' : ''}`;
        button.style.background = color.body;
        button.dataset.color = i;
        button.title = color.name;
        button.setAttribute('aria-label', `Color ${color.name}`);
        button.setAttribute('aria-pressed', String(i === settings.color));
        return button;
    }));
    $('pvp-styles').replaceChildren(...PLAYER_STYLES.map((label, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `style-btn${i === settings.style ? ' is-selected' : ''}`;
        button.textContent = label;
        button.dataset.style = i;
        button.setAttribute('aria-pressed', String(i === settings.style));
        return button;
    }));
    const g = $('pvp-preview').getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 64, 64);
    g.drawImage(makeRobotTexture(settings.color, settings.style), 0, 0);
}

function onProfileClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.color !== undefined) settings.color = Number(button.dataset.color);
    if (button.dataset.style !== undefined) settings.style = Number(button.dataset.style);
    saveSettings();
    renderProfileUi();
}

function openShop() {
    net.ready = false;
    shop.cart = newCart();
    $('modal-pvp').hidden = true;
    $('modal-shop').hidden = false;
    $('btn-shop-ready').disabled = false;
    $('shop-status').textContent = '';
    renderShop();
}

function renderShop() {
    const left = SHOP_CREDITS - cartCost(shop.cart);
    $('shop-credits').textContent = `CRÉDITOS: ${left}`;
    const button = (label, item, delta, disabled) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'shop-btn';
        b.textContent = label;
        b.dataset.id = item.id;
        b.dataset.delta = delta;
        b.disabled = disabled || net.ready;
        return b;
    };
    const rows = SHOP_ITEMS.map((item) => {
        const count = itemCount(shop.cart, item);
        const row = document.createElement('div');
        row.className = 'shop-row';

        const info = document.createElement('div');
        info.className = 'shop-info';
        const title = document.createElement('strong');
        title.textContent = `${item.name} - ${item.price} cr.`;
        const desc = document.createElement('small');
        desc.textContent = item.desc;
        info.append(title, desc);

        const controls = document.createElement('div');
        controls.className = 'shop-controls';
        if (item.kind === 'qty') {
            const amount = document.createElement('span');
            amount.className = 'shop-count';
            amount.textContent = count;
            controls.append(button('-', item, -1, count === 0), amount,
                button('+', item, 1, count >= item.max || left < item.price));
        } else {
            controls.append(count
                ? button('QUITAR', item, -1, false)
                : button('COMPRAR', item, 1, left < item.price));
        }
        row.append(info, controls);
        return row;
    });
    $('shop-list').replaceChildren(...rows);
}

function onShopClick(e) {
    const b = e.target.closest('button');
    if (!b || net.ready) return;
    const item = SHOP_ITEMS.find((i) => i.id === b.dataset.id);
    if (!item) return;
    const delta = Number(b.dataset.delta);
    if (delta > 0 && SHOP_CREDITS - cartCost(shop.cart) < item.price) return;
    setItemCount(shop.cart, item, clamp(itemCount(shop.cart, item) + delta, 0, item.max ?? 1));
    renderShop();
}

function shopReady() {
    if (net.ready || !net.conn) return;
    net.ready = true;
    const cart = shop.cart;
    net.inv = { weapons: new Set(cart.weapons), nade: cart.nade, medkit: cart.medkit, shield: cart.shield, boots: cart.boots };
    netSend({ t: 'ready', name: settings.name, color: settings.color, style: settings.style });
    $('btn-shop-ready').disabled = true;
    $('shop-status').textContent = net.rivalReady ? 'Empezando...' : 'Esperando que tu rival termine de comprar...';
    renderShop();
    maybeStart();
}

function cancelShop() {
    $('modal-shop').hidden = true;
    closePvpMenu();
}

/* --- PVP: daño, granadas y objetos ------------------------------------------ */

function damageSelf(amount, now) {
    if (!state.pvp || state.over || amount <= 0 || now < net.shieldUntil) return;
    state.health = Math.max(0, state.health - amount);
    state.hurtUntil = now + 200;
    state.lastHurtAt = now;
    flashFace(FACES.hurt);
    if (state.health === 0) pvpDie(now);
}

function throwNade(now) {
    if (net.inv.nade <= 0 || now - net.lastNade < NADE.cooldownMs) return;
    net.lastNade = now;
    net.inv.nade--;
    const ahead = getTile(player.x + player.dirX * 0.4, player.y + player.dirY * 0.4) === TILE.EMPTY ? 0.4 : 0;
    const nade = {
        x: player.x + player.dirX * ahead,
        y: player.y + player.dirY * ahead,
        vx: player.dirX * NADE.speed,
        vy: player.dirY * NADE.speed,
        explodeAt: now + NADE.fuseMs,
    };
    nades.push(nade);
    netSend({ t: 'nade', x: nade.x, y: nade.y, vx: nade.vx, vy: nade.vy });
}

function pvpUseItem(code, now) {
    if (code === 'KeyG') {
        throwNade(now);
    } else if (code === 'KeyH' && net.inv.medkit > 0 && state.health < CONFIG.startHealth) {
        net.inv.medkit--;
        state.health = Math.min(CONFIG.startHealth, state.health + 50);
        flashFace(FACES.win);
    } else if (code === 'KeyF' && net.inv.shield > 0 && now >= net.shieldUntil) {
        net.inv.shield--;
        net.shieldUntil = now + NADE.shieldMs;
    }
}

function explodeNade(n, now) {
    blasts.push({ x: n.x, y: n.y, at: now });
    const d = Math.hypot(player.x - n.x, player.y - n.y);
    if (d < NADE.radius && hasLineOfSight(n.x, n.y, player.x, player.y)) {
        damageSelf(Math.round(NADE.damage * (1 - d / NADE.radius)), now);
    }
}

function updateNades(dt, now) {
    for (let i = nades.length - 1; i >= 0; i--) {
        const n = nades[i];
        const nx = n.x + n.vx * dt;
        const ny = n.y + n.vy * dt;
        if (getTile(nx, n.y) === TILE.EMPTY) n.x = nx; else n.vx *= -0.5;   // rebota en las paredes
        if (getTile(n.x, ny) === TILE.EMPTY) n.y = ny; else n.vy *= -0.5;
        const drag = Math.max(0, 1 - 1.2 * dt);
        n.vx *= drag;
        n.vy *= drag;
        if (now >= n.explodeAt) {
            nades.splice(i, 1);
            explodeNade(n, now);
        }
    }
    while (blasts.length && now - blasts[0].at > 500) blasts.shift();
}

function drawRivalName(width, height, horizon) {
    const r = net.remote;
    if (!state.pvp || !r?.seen || !net.rival) return;
    const { x: lateral, depth } = project(r.rx, r.ry);
    if (depth <= 0.1) return;
    const screenX = (width / 2) * (1 + lateral / depth);
    if (screenX < 0 || screenX >= width || depth >= zBuffer[Math.floor(screenX)]) return;
    const size = ((height * state.zoom) / depth) * PVP.scale;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = 'bold 12px "Courier New", monospace';
    hudLine(net.rival.name, screenX, horizon - size / 2 - 4, '#ffe066');
}

function pvpDie(now) {
    net.rivalKills++;
    netSend({ t: 'dead' });
    if (net.rivalKills >= PVP.kills) { pvpEnd(false); return; }

    // Reaparece en el punto que quede más lejos del rival
    const spot = pvpSpawns()
        .map((s) => ({ ...s, d: Math.hypot(s.x - net.remote.rx, s.y - net.remote.ry) }))
        .sort((a, b) => b.d - a.d)[0];
    player.x = spot.x;
    player.y = spot.y;
    state.health = CONFIG.startHealth;
    state.ammo = Math.max(state.ammo, CONFIG.reloadAmmo);
    state.reloadUntil = 0;
    net.shieldUntil = now + PVP.shieldMs;
}

function pvpTick(dt, now) {
    updateNades(dt, now);
    const remote = net.remote;
    if (remote?.seen) {
        const k = Math.min(1, dt * 15);                        // suaviza el movimiento del rival
        remote.rx += (remote.x - remote.rx) * k;
        remote.ry += (remote.y - remote.ry) * k;
    }
    if (now - net.lastSend >= PVP.sendMs) {
        net.lastSend = now;
        netSend({ t: 'pos', x: player.x, y: player.y });
    }
}

function pvpEnd(won, reason = '') {
    if (state.over) return;
    state.over = true;
    state.paused = true;
    releaseInputs();
    releasePointer();
    applyMusic();
    dom.settingsBtn.hidden = true;
    dom.modalTitle.textContent = won ? '[OK] VICTORIA' : '[!] DERROTA';
    dom.modalText.textContent = `Duelo PVP - ${settings.name} ${net.myKills} : ${net.rivalKills} ${net.rival?.name ?? 'RIVAL'}${reason ? ` - ${reason}` : ''}`;
    dom.bestiary.hidden = true;
    dom.levelBadge.hidden = true;
    dom.startBtn.hidden = true;
    dom.nextSectorBtn.hidden = true;
    dom.endMenuBtn.hidden = false;
    setTimeout(() => {
        dom.modal.hidden = false;
        dom.endMenuBtn.focus();
    }, CONFIG.endScreenDelayMs);
}

function makeRobotTexture(colorIdx, styleIdx) {
    const c = PLAYER_COLORS[colorIdx] ?? PLAYER_COLORS[0];
    const tex = createTexture();
    const g = tex.getContext('2d');
    if (styleIdx === 2) {                                      // orejas
        g.fillStyle = c.body; g.fillRect(12, 10, 6, 12); g.fillRect(46, 10, 6, 12);
    } else {                                                   // antena
        g.fillStyle = '#ff3355'; g.fillRect(31, 1, 2, 7);
    }
    g.fillStyle = '#e8f4ff'; g.fillRect(18, 8, 28, 22);        // cabeza
    if (styleIdx === 1) {                                      // casco
        g.fillStyle = c.dark; g.fillRect(16, 4, 32, 9);
        g.fillStyle = c.body; g.fillRect(16, 4, 32, 4);
    }
    g.fillStyle = '#000000'; g.fillRect(22, 13, 20, 10);
    g.fillStyle = c.eye; g.fillRect(25, 16, 5, 4); g.fillRect(34, 16, 5, 4);
    g.fillStyle = c.body; g.fillRect(14, 32, 36, 22);          // cuerpo
    g.fillStyle = '#e8f4ff'; g.fillRect(7, 34, 8, 18); g.fillRect(49, 34, 8, 18);
    g.fillStyle = c.eye; g.fillRect(24, 38, 16, 6);
    g.fillStyle = c.dark; g.fillRect(18, 54, 10, 9); g.fillRect(36, 54, 10, 9);
    return tex;
}

function drawRemoteTexture() {
    remoteTexture = makeRobotTexture(0, 0);
    nadeTexture = createTexture(32);
    const g = nadeTexture.getContext('2d');
    fillCircle(g, 16, 18, 9, '#2a3a2a');
    fillCircle(g, 13, 15, 3, '#5a7a5a');
    g.fillStyle = '#9a9a9a'; g.fillRect(14, 4, 4, 6);
    fillCircle(g, 16, 20, 2.5, '#ff3333');
}

/* --- Colisiones ----------------------------------------------------------- */

function cornersAt(x, y, r) {
    return [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
}

function collides(x, y, radius) {
    return cornersAt(x, y, radius).some(([cx, cy]) => getTile(cx, cy) !== TILE.EMPTY);
}

function findDoor(x, y) {
    for (const [cx, cy] of cornersAt(x, y, CONFIG.playerRadius)) {
        if (getTile(cx, cy) === TILE.DOOR) {
            return { x: Math.floor(cx), y: Math.floor(cy) };
        }
    }
    return null;
}

/** Comprueba si hay paredes entre dos puntos. */
function hasLineOfSight(x0, y0, x1, y1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.2);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        if (getTile(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) !== TILE.EMPTY) return false;
    }
    return true;
}

/* --- Jugador -------------------------------------------------------------- */

function rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const { dirX, planeX } = player;

    player.dirX = dirX * cos - player.dirY * sin;
    player.dirY = dirX * sin + player.dirY * cos;
    player.planeX = planeX * cos - player.planeY * sin;
    player.planeY = planeX * sin + player.planeY * cos;
}

function movePlayer(dx, dy) {
    const door = findDoor(player.x + dx, player.y + dy);
    if (door) {
        if (!state.pvp) openRoom(door);                        // en PVP las puertas son paredes
        return;
    }
    // Ejes por separado: permite "deslizarse" a lo largo de las paredes
    if (!collides(player.x + dx, player.y, CONFIG.playerRadius)) player.x += dx;
    if (!collides(player.x, player.y + dy, CONFIG.playerRadius)) player.y += dy;
}

function hurtPlayer(now, amount) {
    const damage = Math.round(amount * CONFIG.damageMultiplier);
    state.lastHurtAt = now;
    if (damage <= 0) return;

    state.health = Math.max(0, state.health - damage);
    state.hurtUntil = now + 200;
    flashFace(FACES.hurt);
    if (state.health === 0) endGame(false);
}

/* --- Cámara --------------------------------------------------------------- */

/** Primera persona: la cámara está siempre en el jugador. */
function updateCamera() {
    camera.x = player.x;
    camera.y = player.y;
}

/** Proyecta un punto del mundo a coordenadas de cámara: x (lateral) y depth (profundidad). */
function project(worldX, worldY) {
    const invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY);
    const dx = worldX - camera.x;
    const dy = worldY - camera.y;
    return {
        x: invDet * (player.dirY * dx - player.dirX * dy),
        depth: invDet * (-player.planeY * dx + player.planeX * dy),
    };
}

/* --- Partículas (chispas de los disparos) --------------------------------- */

function spawnParticles(x, y, count, colors, speed, life, gravity = 260) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.3 + Math.random() * 0.7);
        const duration = life * (0.6 + Math.random() * 0.6);
        particles.push({
            x, y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity - speed * 0.25,
            gravity,
            life: duration,
            max: duration,
            size: 2 + Math.random() * 2.5,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }
    if (particles.length > CONFIG.maxParticles) {
        particles.splice(0, particles.length - CONFIG.maxParticles);
    }
}

function updateParticles(dt) {
    for (const p of particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
    }
    particles = particles.filter((p) => p.life > 0);
}

/* --- Disparo -------------------------------------------------------------- */

/** Recarga (tecla R): tras un momento sin poder disparar, las balas suben hasta CONFIG.reloadAmmo. */
function startReload(now) {
    if (state.reloadUntil > now || state.ammo >= CONFIG.reloadAmmo) return;
    state.reloadUntil = now + CONFIG.reloadMs;
}

function updateReload(now) {
    if (state.reloadUntil && now >= state.reloadUntil) {
        state.ammo = Math.max(state.ammo, CONFIG.reloadAmmo);
        state.reloadUntil = 0;
        flashFace(FACES.win);
    }
}

function tryFire(now) {
    const weapon = WEAPONS[settings.weapon];
    if (state.reloadUntil > now) return;                       // recargando
    if (state.ammo < weapon.cost) {                            // sin balas: recarga sola
        startReload(now);
        return;
    }
    if (now - state.lastFireAt < weapon.cooldownMs) return;
    state.lastFireAt = now;
    state.firingUntil = now + CONFIG.muzzleFlashMs;
    state.tracerUntil = now + CONFIG.tracerMs;
    state.ammo -= weapon.cost;

    const { width, height } = canvas;
    spawnParticles(width / 2, height - weapon.muzzleY, 10, weapon.sparks, 230, 0.35, 200);
    shoot(now, weapon);
}

/** Dispara todos los rayos del arma (la escopeta lanza varios con dispersión). */
function shoot(now, weapon) {
    for (let i = 0; i < weapon.pellets; i++) {
        const offX = weapon.spread ? (Math.random() * 2 - 1) * weapon.spread : 0;
        const offY = weapon.spread ? (Math.random() * 2 - 1) * weapon.spread : 0;
        fireRay(now, weapon, offX, offY);
    }
}

/**
 * Disparo "hitscan" hacia la mira (el centro de la pantalla, más la dispersión del arma).
 * Impacta al enemigo más cercano que tenga el rayo encima, tanto en horizontal como en vertical,
 * siempre que no haya una pared en el medio.
 */
function fireRay(now, weapon, offX, offY) {
    const { width, height } = canvas;
    const column = clamp(Math.floor(width / 2 + offX), 0, width - 1);
    const wallDepth = zBuffer[column] ?? Infinity;
    const aimOffsetY = Math.abs(state.lookOffset * state.zoom + offY);   // los enemigos flotan a la altura del horizonte
    let target = null;
    let targetDepth = Infinity;

    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const { x: lateral, depth } = project(enemy.x, enemy.y);
        if (depth <= 0.1 || depth > wallDepth || depth >= targetDepth) continue;

        const size = ((height * state.zoom) / depth) * enemy.type.scale;
        const reach = size * CONFIG.enemyHitRadius;
        const aimOffsetX = Math.abs((width / 2) * (lateral / depth) - offX);

        if (aimOffsetX <= reach && aimOffsetY <= reach) {
            target = enemy;
            targetDepth = depth;
        }
    }

    // En PVP también se puede impactar al rival (si no hay una pared en el medio)
    let hitRival = false;
    if (state.pvp && net.remote?.seen) {
        const { x: lateral, depth } = project(net.remote.rx, net.remote.ry);
        if (depth > 0.1 && depth <= wallDepth && depth < targetDepth) {
            const reach = (((height * state.zoom) / depth) * PVP.scale) * CONFIG.enemyHitRadius;
            const aimOffsetX = Math.abs((width / 2) * (lateral / depth) - offX);
            hitRival = aimOffsetX <= reach && aimOffsetY <= reach;
        }
    }

    const px = width / 2 + offX;
    const py = height / 2 + offY;
    if (hitRival) {
        spawnParticles(px, py, weapon.pellets > 1 ? 6 : 16, ['#ff3355', '#ffffff'], 200, 0.45);
        netSend({ t: 'hit', d: weapon.damage * PVP.damageMul });
    } else if (target) {
        spawnParticles(px, py, weapon.pellets > 1 ? 6 : 16, [target.type.color, '#ffffff'], 200, 0.45);
        damageEnemy(target, now, weapon.damage);
    } else {
        // El disparo pegó en una pared (o en la nada): chispas pequeñas
        spawnParticles(px, py, weapon.pellets > 1 ? 2 : 7, ['#ffe066', COLORS.gunCore], 110, 0.3);
    }
}

function damageEnemy(enemy, now, damage = 1) {
    enemy.hp -= damage;
    enemy.hurtUntil = now + CONFIG.hitFlashMs;

    // Fase 2 del jefe: al llegar a la mitad de la vida invoca refuerzos (una sola vez)
    const type = enemy.type;
    if (type.summonAt && enemy.hp > 0 && !enemy.summoned && enemy.hp <= type.hp * type.summonAt) {
        enemy.summoned = true;
        summonMinions(enemy, now);
    }

    if (enemy.hp > 0) return;

    enemy.alive = false;
    enemy.diedAt = now;
    state.score += enemy.type.reward;
    state.ammo += enemy.type.ammo;
    checkVictory(now);
}

/**
 * Cuando caen todos los virus:
 *   - si faltan habitaciones, se avisa que hay que visitarlas (mirá el minimapa);
 *   - si ya están todas resueltas, aparece el jefe final.
 * Cuando cae el jefe, ganás.
 */
function checkVictory(now) {
    if (state.over) return;

    // Si el jefe ya cayó ganás, aunque queden sus refuerzos
    if (state.bossSpawned && !enemies.some((e) => e.alive && e.type.boss)) {
        endGame(true);
        return;
    }

    if (aliveCount() > 0) return;

    const pending = state.roomsTotal - state.roomsDone;
    if (pending > 0) {
        state.bannerUntil = now + CONFIG.bossBannerMs;
        state.bannerText = 'SECTOR SIN VIRUS';
        state.bannerSub = `FALTAN ${pending} HABITACIÓN(ES) ROJA(S) - MIRÁ EL MINIMAPA`;
        flashFace(FACES.win);
        return;
    }

    spawnBoss(now);
}

/** Una bomba que te alcanza explota: te hace daño y desaparece (sin dar puntos). */
function explodeEnemy(enemy, now) {
    enemy.alive = false;
    enemy.diedAt = now;
    hurtPlayer(now, enemy.type.damage);
    checkVictory(now);
}

/* --- Enemigos ------------------------------------------------------------- */

function createEnemy(type, x, y) {
    return {
        type,
        x, y,
        hp: type.hp,
        alive: true,
        angle: Math.random() * Math.PI * 2,
        turnAt: 0,
        hurtUntil: 0,
        diedAt: 0,
        phase: Math.random() * Math.PI * 2,   // desfasa las animaciones entre enemigos
        nextShotAt: 0,                        // próximo disparo (solo enemigos con ataque a distancia)
        summoned: false,                      // el jefe ya invocó a sus refuerzos
        aggro: false,                         // persigue desde lejos (refuerzos del jefe)
    };
}

/** Fase 2 del jefe: invoca un virus de cada tipo en las casillas libres más cercanas a él. */
function summonMinions(boss, now) {
    const spots = [];
    for (let x = 0; x < worldMap.length; x++) {
        for (let y = 0; y < worldMap[x].length; y++) {
            if (worldMap[x][y] !== TILE.EMPTY) continue;
            const cx = x + 0.5;
            const cy = y + 0.5;
            if (Math.hypot(cx - player.x, cy - player.y) < 2.5) continue;   // no aparecen encima tuyo
            spots.push({ x: cx, y: cy, d: Math.hypot(cx - boss.x, cy - boss.y) });
        }
    }
    spots.sort((a, b) => a.d - b.d);

    boss.type.summonTypes.forEach((id, i) => {
        const spot = spots[i];
        if (!spot) return;
        const minion = createEnemy(VIRUS_TYPES[id], spot.x, spot.y);
        minion.aggro = true;
        enemies.push(minion);
    });

    state.bannerUntil = now + CONFIG.bossBannerMs;
    state.bannerText = `${boss.type.name} INVOCA REFUERZOS`;
    state.bannerSub = `¡${boss.type.summonTypes.length} VIRUS NUEVOS Y EL JEFE SE ENFURECE!`;
    flashFace(FACES.hurt);
}

/* --- Partículas de virus del jefe ----------------------------------------- */

/** El jefe lanza un abanico de partículas hacia el jugador. */
function fireBossVolley(enemy, now, enraged) {
    const r = enemy.type.ranged;
    if (enemy.nextShotAt === 0) {      // primer disparo: pequeña pausa para que reacciones
        enemy.nextShotAt = now + 800;
        return;
    }
    if (now < enemy.nextShotAt) return;
    enemy.nextShotAt = now + (enraged ? r.enragedCooldownMs : r.cooldownMs);

    const shots = enraged ? r.enragedShots : r.shots;
    const speed = r.speed * (enraged ? 1.2 : 1);
    const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    for (let i = 0; i < shots; i++) {
        const angle = base + (i - (shots - 1) / 2) * r.spread;
        projectiles.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 5,
            damage: r.damage,
        });
    }
}

function updateProjectiles(dt, now) {
    for (const p of projectiles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (getTile(p.x, p.y) !== TILE.EMPTY) {     // chocó con una pared
            p.life = 0;
            continue;
        }
        if (Math.hypot(player.x - p.x, player.y - p.y) < 0.35) {
            p.life = 0;
            hurtPlayer(now, p.damage);
            // Salpicadura de partículas de virus en la pantalla
            spawnParticles(
                canvas.width * (0.2 + Math.random() * 0.6),
                canvas.height * (0.3 + Math.random() * 0.4),
                16, ['#b84dff', '#ff2b2b', '#a6ff00', '#ffffff'], 190, 0.55,
            );
        }
    }
    projectiles = projectiles.filter((p) => p.life > 0);
}

function spawnEnemies() {
    const spots = [];
    for (let x = 0; x < LEVEL.length; x++) {
        for (let y = 0; y < LEVEL[x].length; y++) {
            if (LEVEL[x][y] !== TILE.EMPTY) continue;
            const cx = x + 0.5;
            const cy = y + 0.5;
            if (Math.hypot(cx - player.x, cy - player.y) >= (currentSector.minSpawnDistance ?? CONFIG.enemyMinSpawnDistance)) {
                spots.push({ x: cx, y: cy });
            }
        }
    }
    shuffle(spots);

    // Lista con la cantidad de cada tipo; se reparten en casillas al azar
    const counts = currentSector.counts;
    const roster = Object.values(VIRUS_TYPES).flatMap((type) => Array(counts?.[type.id] ?? type.count).fill(type));

    enemies = roster
        .slice(0, spots.length)
        .map((type, index) => createEnemy(type, spots[index].x, spots[index].y));
}

/** Invoca al jefe final en la casilla libre más lejana al jugador. */
function spawnBoss(now) {
    let best = { x: 1.5, y: 1.5 };
    let bestDistance = -1;
    for (let x = 0; x < worldMap.length; x++) {
        for (let y = 0; y < worldMap[x].length; y++) {
            if (worldMap[x][y] !== TILE.EMPTY) continue;
            const distance = Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y);
            if (distance > bestDistance) {
                bestDistance = distance;
                best = { x: x + 0.5, y: y + 0.5 };
            }
        }
    }

    const bossType = currentSector.boss;
    const bonus = currentSector.bossAmmoBonus ?? CONFIG.bossAmmoBonus;
    enemies.push(createEnemy(bossType, best.x, best.y));
    state.bossSpawned = true;
    state.ammo += bonus;
    state.bannerUntil = now + CONFIG.bossBannerMs;
    state.bannerText = `${bossType.name} HA DESPERTADO`;
    state.bannerSub = `+${bonus} BALAS DE EMERGENCIA`;
    flashFace(FACES.hurt);
}

/** Los rootkits atraviesan paredes (solo los frena el borde del mapa); el resto choca. */
function blocksEnemy(enemy, x, y) {
    if (enemy.type.phasing) {
        return x < 0.5 || y < 0.5 || x > LEVEL.length - 0.5 || y > LEVEL[0].length - 0.5;
    }
    return collides(x, y, CONFIG.enemyRadius);
}

function updateEnemies(dt, now) {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const type = enemy.type;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const range = enemy.aggro ? 20 : (type.chaseRange ?? CONFIG.enemyChaseRange);
        const touch = type.touch ?? CONFIG.enemyTouchDistance;
        const chasing = dist < range
            && (type.phasing || hasLineOfSight(enemy.x, enemy.y, player.x, player.y));
        const enraged = type.enrageAt && enemy.hp <= type.hp * type.enrageAt;

        if (chasing) {
            enemy.angle = Math.atan2(dy, dx);
        } else if (now >= enemy.turnAt) {
            enemy.angle = Math.random() * Math.PI * 2;
            enemy.turnAt = now + 1000 + Math.random() * 2000;
        }

        if (!(chasing && dist < touch)) {
            const speed = (chasing ? type.chase : type.wander) * (enraged ? type.enrageSpeed : 1) * dt;
            const mx = Math.cos(enemy.angle) * speed;
            const my = Math.sin(enemy.angle) * speed;
            let blocked = false;

            if (blocksEnemy(enemy, enemy.x + mx, enemy.y)) blocked = true;
            else enemy.x += mx;

            if (blocksEnemy(enemy, enemy.x, enemy.y + my)) blocked = true;
            else enemy.y += my;

            if (blocked) enemy.turnAt = 0;   // chocó: elige otra dirección
        }

        if (type.ranged && chasing && dist <= type.ranged.range) {
            fireBossVolley(enemy, now, enraged);
        }

        if (dist < touch) {
            if (type.explodes) {
                explodeEnemy(enemy, now);
            } else if (now - state.lastHurtAt >= CONFIG.hurtCooldownMs) {
                hurtPlayer(now, type.damage);
            }
        }
    }
}

/* --- Actualización -------------------------------------------------------- */

function update(dt, now) {
    updateReload(now);
    updateZoom(dt);
    if (state.pvp) pvpTick(dt, now);

    // Giro con las flechas (el giro principal es con el mouse)
    if (isPressed('turnLeft'))  rotate(CONFIG.rotSpeed * dt);
    if (isPressed('turnRight')) rotate(-CONFIG.rotSpeed * dt);

    // Movimiento: W/S avanzan y retroceden, A/D se desplazan hacia los costados
    const forward = (isPressed('forward') ? 1 : 0) - (isPressed('backward') ? 1 : 0);
    const strafe = (isPressed('strafeRight') ? 1 : 0) - (isPressed('strafeLeft') ? 1 : 0);
    state.moving = forward !== 0 || strafe !== 0;

    if (state.moving) {
        // 'plane' apunta hacia la derecha de la pantalla
        const planeLength = Math.hypot(player.planeX, player.planeY);
        const rightX = player.planeX / planeLength;
        const rightY = player.planeY / planeLength;

        const moveX = player.dirX * forward + rightX * strafe;
        const moveY = player.dirY * forward + rightY * strafe;

        // Se normaliza para que ir en diagonal no sea más rápido que ir recto
        const speed = CONFIG.moveSpeed * (state.pvp && net.inv?.boots ? 1.3 : 1);
        const step = (speed * dt) / Math.hypot(moveX, moveY);
        movePlayer(moveX * step, moveY * step);
    }

    if (isPressed('fire') || state.mouseFiring) tryFire(now);
    updateEnemies(dt, now);
    updateProjectiles(dt, now);
}

/* --- Texturas: lluvia de código ------------------------------------------- */

function randomGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/**
 * Crea una textura de "lluvia de código". Es el doble de alta que el patrón
 * (el patrón se repite) para poder desplazarla sin cortes.
 */
function createCodeTexture(palette, background) {
    const { width, cols, rows, glyphH } = CODE_TEXTURE;
    const height = rows * glyphH;

    const el = document.createElement('canvas');
    el.width = width;
    el.height = height * 2;

    const columns = Array.from({ length: cols }, () => ({
        head: Math.floor(Math.random() * rows),          // fila donde está la "cabeza" brillante
        trail: 6 + Math.floor(Math.random() * 8),        // largo de la estela
        color: palette[Math.floor(Math.random() * palette.length)],
        speed: 25 + Math.random() * 110,                 // velocidad de caída (texels por segundo)
        phase: Math.random() * height,
        dim: Math.random() < 0.18,                       // algunas columnas quedan tenues
        glyphs: Array.from({ length: rows }, randomGlyph),
    }));

    const texture = { el, g: el.getContext('2d'), columns, height, background };
    paintCodeTexture(texture);
    return texture;
}

function paintCodeTexture({ el, g, columns, height, background }) {
    const { width, rows, glyphW, glyphH } = CODE_TEXTURE;

    g.fillStyle = background;
    g.fillRect(0, 0, width, height);
    g.font = `bold ${glyphH}px "Courier New", monospace`;
    g.textBaseline = 'top';

    columns.forEach((column, c) => {
        for (let r = 0; r < rows; r++) {
            const distance = (column.head - r + rows) % rows;    // filas por encima de la cabeza
            let level = distance <= column.trail ? 1 - distance / (column.trail + 1) : 0.12;
            if (column.dim) level *= 0.45;

            if (distance === 0 && !column.dim) {
                g.fillStyle = COLORS.codeHead;
            } else {
                const [red, green, blue] = column.color;
                g.fillStyle = `rgba(${red}, ${green}, ${blue}, ${level.toFixed(2)})`;
            }
            g.fillText(column.glyphs[r], c * glyphW + 1, r * glyphH);
        }
    });

    // Segunda copia del patrón, justo debajo, para el desplazamiento continuo
    g.drawImage(el, 0, 0, width, height, 0, height, width, height);
}

/** Cambia algunos símbolos al azar para que el código "parpadee". */
function refreshCodeTexture(texture) {
    for (const column of texture.columns) {
        for (let i = 0; i < 2; i++) {
            column.glyphs[Math.floor(Math.random() * CODE_TEXTURE.rows)] = randomGlyph();
        }
    }
    paintCodeTexture(texture);
}

function refreshCodeTextures(now) {
    if (now - lastCodeRefresh < CONFIG.codeRefreshMs) return;
    lastCodeRefresh = now;
    refreshCodeTexture(wallTexture);
    refreshCodeTexture(doorTexture);
}

/** Calcula cuánto bajó cada columna de símbolos en este instante. */
function updateScrollOffsets(texture, offsets, now, speedScale) {
    const seconds = now / 1000;
    texture.columns.forEach((column, c) => {
        const travelled = (seconds * column.speed * speedScale + column.phase) % texture.height;
        offsets[c] = texture.height - travelled;
    });
}

/* --- Texturas: sprites ---------------------------------------------------- */

function createTexture(size = SPRITE_SIZE) {
    const tex = document.createElement('canvas');
    tex.width = tex.height = size;
    return tex;
}

function fillCircle(g, x, y, radius, color) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, radius, 0, Math.PI * 2);
    g.fill();
}

/* Cada "painter" dibuja un enemigo. c(color) devuelve el color, o blanco si es el cuadro de impacto. */

function paintVirus(g, c, frame) {
    const body = c('#b84dff');
    const center = SPRITE_SIZE / 2;
    const spike = frame === 0 ? 26 : 28;                  // las púas "respiran"

    g.strokeStyle = body;
    g.lineWidth = 4;
    g.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        g.beginPath();
        g.moveTo(center + Math.cos(angle) * 16, center + Math.sin(angle) * 16);
        g.lineTo(center + Math.cos(angle) * spike, center + Math.sin(angle) * spike);
        g.stroke();
        fillCircle(g, center + Math.cos(angle) * (spike + 2), center + Math.sin(angle) * (spike + 2), 3.5, body);
    }
    fillCircle(g, center, center, 19, body);

    for (const eyeX of [center - 7, center + 7]) {
        fillCircle(g, eyeX, center - 3, 5, c('#ffffff'));
        fillCircle(g, eyeX, center - 3, 2.5, c('#c00000'));
    }

    g.strokeStyle = c('#2a0040');
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(center, center + 8, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
}

function paintWorm(g, c, frame) {
    const body = c('#a6ff00');
    const shadow = c('#3d6b00');
    const segments = 5;
    const wave = frame * Math.PI;                         // el cuerpo ondula entre cuadros

    for (let i = 0; i < segments; i++) {
        const x = 11 + i * 10;
        const y = 36 + Math.sin(i * 1.4 + wave) * 6;
        const radius = i === segments - 1 ? 10 : 6 + i * 0.8;
        fillCircle(g, x, y + 1.5, radius, shadow);
        fillCircle(g, x, y, radius, body);
    }

    // Cabeza (último segmento)
    const headX = 11 + (segments - 1) * 10;
    const headY = 36 + Math.sin((segments - 1) * 1.4 + wave) * 6;
    g.strokeStyle = body;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(headX - 3, headY - 8);
    g.lineTo(headX - 7, headY - 16);
    g.moveTo(headX + 4, headY - 8);
    g.lineTo(headX + 8, headY - 16);
    g.stroke();

    for (const eyeX of [headX - 3, headX + 4]) {
        fillCircle(g, eyeX, headY - 3, 3.2, c('#ffffff'));
        fillCircle(g, eyeX + 0.8, headY - 3, 1.6, c('#102000'));
    }
}

function paintTrojan(g, c) {
    const wood = c('#ff7a00');
    const lid = c('#ffa733');
    const ribbon = c('#ffe14d');
    const dark = c('#3a1a00');

    // Patas, cuerpo y tapa del "regalo trampa"
    g.fillStyle = dark;
    g.fillRect(15, 54, 9, 8);
    g.fillRect(40, 54, 9, 8);
    g.fillStyle = wood;
    g.fillRect(10, 24, 44, 32);
    g.fillStyle = lid;
    g.fillRect(7, 14, 50, 12);

    // Cinta y moño
    g.fillStyle = ribbon;
    g.fillRect(29, 14, 6, 42);
    fillCircle(g, 27, 10, 5, ribbon);
    fillCircle(g, 37, 10, 5, ribbon);

    // Ojos enojados
    g.fillStyle = c('#ff0033');
    g.beginPath();
    g.moveTo(14, 32);
    g.lineTo(27, 37);
    g.lineTo(14, 41);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(50, 32);
    g.lineTo(37, 37);
    g.lineTo(50, 41);
    g.closePath();
    g.fill();

    // Boca con dientes
    g.fillStyle = dark;
    g.fillRect(14, 46, 36, 8);
    g.fillStyle = c('#ffffff');
    for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(14 + i * 6, 46);
        g.lineTo(17 + i * 6, 52);
        g.lineTo(20 + i * 6, 46);
        g.closePath();
        g.fill();
    }
}

function paintRootkit(g, c, frame) {
    const body = c('#00e5ff');
    const ink = c('#00252b');

    // Silueta de fantasma: cúpula arriba y bordes ondulados abajo
    g.fillStyle = body;
    g.beginPath();
    g.arc(32, 28, 19, Math.PI, 0);
    g.lineTo(51, 56);
    const waves = 5;
    const step = 38 / waves;
    for (let i = 0; i < waves; i++) {
        const x = 51 - step * (i + 1);
        const peak = (i % 2 === 0) !== (frame === 1);     // el ondulado se invierte entre cuadros
        g.lineTo(x + step / 2, peak ? 62 : 54);
        g.lineTo(x, 56);
    }
    g.closePath();
    g.fill();

    // Cara
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(25, 28, 3.5, 5.5, 0, 0, Math.PI * 2);
    g.ellipse(39, 28, 3.5, 5.5, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(32, 40, 3, 4, 0, 0, Math.PI * 2);
    g.fill();

    // Dígitos binarios dentro del cuerpo
    g.globalAlpha = 0.5;
    g.font = 'bold 9px "Courier New", monospace';
    g.textBaseline = 'top';
    g.fillText('01', 17, 46);
    g.fillText('10', 36, 46);
    g.globalAlpha = 1;
}

function paintBomb(g, c, frame) {
    // Halo rojo que late (solo en un cuadro)
    if (frame === 1) fillCircle(g, 32, 40, 27, c('rgba(255, 43, 43, 0.28)'));

    fillCircle(g, 32, 40, 21, c('#ff2b2b'));
    fillCircle(g, 32, 40, 19, c('#1c1c24'));

    // Brillo
    g.fillStyle = c('rgba(255, 255, 255, 0.35)');
    g.beginPath();
    g.ellipse(24, 32, 5, 3, -0.6, 0, Math.PI * 2);
    g.fill();

    // Ojos en forma de X y boca en zigzag
    g.strokeStyle = c('#ff2b2b');
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    for (const eyeX of [25, 39]) {
        g.beginPath();
        g.moveTo(eyeX - 4, 36);
        g.lineTo(eyeX + 4, 44);
        g.moveTo(eyeX + 4, 36);
        g.lineTo(eyeX - 4, 44);
        g.stroke();
    }
    g.beginPath();
    g.moveTo(24, 52);
    g.lineTo(28, 49);
    g.lineTo(32, 52);
    g.lineTo(36, 49);
    g.lineTo(40, 52);
    g.stroke();

    // Mecha y chispa
    g.strokeStyle = c('#d9b36c');
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(34, 20);
    g.quadraticCurveTo(40, 10, 47, 11);
    g.stroke();
    const spark = frame === 0 ? 7 : 4;
    fillCircle(g, 48, 10, spark, c('#ff8a00'));
    fillCircle(g, 48, 10, spark * 0.55, c('#ffe066'));
}

/**
 * JEFE FINAL "KERNEL PANIC": demonio de código con cuernos, tres ojos,
 * mandíbula que se abre, colmillos, sangre y tentáculos.
 * Se dibuja en una textura de 128x128 (el doble que los demás).
 */
function paintBoss(g, c, frame) {
    const open = frame === 0 ? 0 : 7;                      // la mandíbula se abre y se cierra
    const sway = frame === 0 ? 6 : -6;                     // los tentáculos se mecen
    const glow = frame === 0 ? 0.35 : 0.6;

    // Aura roja
    const aura = g.createRadialGradient(64, 66, 8, 64, 66, 64);
    aura.addColorStop(0, c(`rgba(255, 0, 40, ${glow})`));
    aura.addColorStop(1, 'rgba(255, 0, 40, 0)');
    g.fillStyle = aura;
    g.fillRect(0, 0, 128, 128);

    // Tentáculos
    g.strokeStyle = c('#2b0a3a');
    g.lineWidth = 7;
    g.lineCap = 'round';
    for (const dir of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
            const startX = 64 + dir * (22 + i * 8);
            const tipSway = (i % 2 === 0 ? sway : -sway) / 2;
            g.beginPath();
            g.moveTo(startX, 92);
            g.bezierCurveTo(
                startX + dir * (14 + i * 6), 104 + sway,
                startX + dir * (6 + i * 10), 114 - sway,
                startX + dir * (22 + i * 10), 124 + tipSway,
            );
            g.stroke();
        }
    }

    // Túnica oscura
    g.fillStyle = c('#12041a');
    g.beginPath();
    g.moveTo(12, 128);
    g.lineTo(20, 88);
    g.lineTo(44, 80);
    g.lineTo(84, 80);
    g.lineTo(108, 88);
    g.lineTo(116, 128);
    g.closePath();
    g.fill();

    // Hombreras con púas
    g.fillStyle = c('#3a1048');
    for (const dir of [-1, 1]) {
        g.beginPath();
        g.moveTo(64 + dir * 30, 86);
        g.lineTo(64 + dir * 52, 58);
        g.lineTo(64 + dir * 54, 92);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(64 + dir * 46, 90);
        g.lineTo(64 + dir * 63, 76);
        g.lineTo(64 + dir * 60, 102);
        g.closePath();
        g.fill();
    }

    // Código binario en la túnica
    g.globalAlpha = 0.55;
    g.fillStyle = c('#ff2040');
    g.font = 'bold 10px "Courier New", monospace';
    g.textBaseline = 'top';
    g.fillText('1011 0110', 40, 100);
    g.fillText('0100 1101', 40, 112);
    g.globalAlpha = 1;

    // Cuernos
    for (const dir of [-1, 1]) {
        g.fillStyle = c('#e6dcc0');
        g.beginPath();
        g.moveTo(64 + dir * 22, 40);
        g.quadraticCurveTo(64 + dir * 54, 38, 64 + dir * 50, 3);
        g.quadraticCurveTo(64 + dir * 36, 26, 64 + dir * 14, 28);
        g.closePath();
        g.fill();

        g.strokeStyle = c('#8a7a58');
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(64 + dir * 24, 34);
        g.lineTo(64 + dir * 28, 40);
        g.moveTo(64 + dir * 33, 31);
        g.lineTo(64 + dir * 37, 37);
        g.moveTo(64 + dir * 41, 24);
        g.lineTo(64 + dir * 45, 29);
        g.stroke();
    }

    // Cabeza y mandíbula
    g.fillStyle = c('#240a2e');
    g.beginPath();
    g.ellipse(64, 50, 30, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c('#1a0722');
    g.beginPath();
    g.moveTo(38, 70);
    g.lineTo(44, 92 + open);
    g.lineTo(84, 92 + open);
    g.lineTo(90, 70);
    g.closePath();
    g.fill();

    // Grietas que brillan
    g.strokeStyle = c('#ff2040');
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(52, 20);
    g.lineTo(56, 30);
    g.lineTo(50, 38);
    g.moveTo(78, 18);
    g.lineTo(74, 28);
    g.lineTo(80, 34);
    g.stroke();

    // Tercer ojo
    fillCircle(g, 64, 28, 5.5, c('#ff1a1a'));
    fillCircle(g, 64, 28, 2, c('#ffe600'));

    // Ojos enojados (sin resplandor)
    g.fillStyle = c('#ff1a1a');
    for (const dir of [-1, 1]) {
        g.beginPath();
        g.moveTo(64 + dir * 8, 52);
        g.lineTo(64 + dir * 28, 38);
        g.lineTo(64 + dir * 24, 55);
        g.closePath();
        g.fill();
    }
    for (const dir of [-1, 1]) {
        fillCircle(g, 64 + dir * 19, 47, frame === 0 ? 2.5 : 3.5, c('#ffe600'));
    }

    // Nariz
    g.fillStyle = c('#000000');
    g.fillRect(60, 60, 2, 6);
    g.fillRect(66, 60, 2, 6);

    // Boca
    g.fillStyle = c('#000000');
    g.beginPath();
    g.moveTo(40, 72);
    g.lineTo(88, 72);
    g.lineTo(84, 88 + open);
    g.lineTo(44, 88 + open);
    g.closePath();
    g.fill();
    g.fillStyle = c('#a0001a');
    g.beginPath();
    g.ellipse(64, 86 + open, 12, 5, 0, 0, Math.PI * 2);
    g.fill();

    // Colmillos arriba y abajo
    g.fillStyle = c('#f2eddc');
    for (let i = 0; i < 7; i++) {
        const x = 42 + i * 6.5;
        g.beginPath();
        g.moveTo(x, 72);
        g.lineTo(x + 6.5, 72);
        g.lineTo(x + 3.25, 82);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(x + 1, 88 + open);
        g.lineTo(x + 7, 88 + open);
        g.lineTo(x + 4, 79 + open);
        g.closePath();
        g.fill();
    }

    // Sangre que gotea
    g.strokeStyle = c('#b00018');
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(48, 90 + open);
    g.lineTo(48, 104 + open);
    g.moveTo(66, 92 + open);
    g.lineTo(66, 110 + open);
    g.moveTo(82, 90 + open);
    g.lineTo(82, 100 + open);
    g.stroke();
}

/** Destello de explosión (bombas y muerte del jefe). */
function paintBlast(g) {
    const gradient = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.35, '#ffd23f');
    gradient.addColorStop(0.7, 'rgba(255, 80, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
}

const SPRITE_PAINTERS = {
    virus:   { paint: paintVirus,   frames: 2 },
    worm:    { paint: paintWorm,    frames: 2 },
    trojan:  { paint: paintTrojan,  frames: 1 },
    rootkit: { paint: paintRootkit, frames: 2 },
    bomb:    { paint: paintBomb,    frames: 2 },
    boss:    { paint: paintBoss,    frames: 2, size: 128 },
};

function createSpriteTexture(paint, flash, frame, size) {
    const tex = createTexture(size);
    paint(tex.getContext('2d'), (color) => (flash ? '#ffffff' : color), frame);
    return tex;
}

/** Para cada tipo: cuadros normales y cuadros "blancos" (al recibir un disparo). */
function buildEnemyTextures() {
    enemyTextures = {};
    for (const [id, { paint, frames, size = SPRITE_SIZE }] of Object.entries(SPRITE_PAINTERS)) {
        enemyTextures[id] = { normal: [], hurt: [] };
        for (let frame = 0; frame < frames; frame++) {
            enemyTextures[id].normal.push(createSpriteTexture(paint, false, frame, size));
            enemyTextures[id].hurt.push(createSpriteTexture(paint, true, frame, size));
        }
    }
    blastTexture = createTexture();
    paintBlast(blastTexture.getContext('2d'));

    // Partículas de virus del jefe: dos cuadros que alternan (rojo y violeta)
    projectileTextures = [0, 1].map((frame) => {
        const tex = createTexture(32);
        const g = tex.getContext('2d');
        const glow = g.createRadialGradient(16, 16, 1, 16, 16, 15);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.4, frame === 0 ? '#ff2b2b' : '#b84dff');
        glow.addColorStop(1, 'rgba(184, 77, 255, 0)');
        g.fillStyle = glow;
        g.fillRect(0, 0, 32, 32);
        g.fillStyle = '#12001a';
        g.font = 'bold 9px "Courier New", monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(frame === 0 ? '01' : '10', 16, 16);
        return tex;
    });
}

/* --- Raycasting y dibujo -------------------------------------------------- */

function castRay(column, width) {
    const screenPos = (2 * column) / width - 1;
    const rayDirX = player.dirX + player.planeX * screenPos;
    const rayDirY = player.dirY + player.planeY * screenPos;

    let mapX = Math.floor(camera.x);
    let mapY = Math.floor(camera.y);

    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);

    const stepX = rayDirX < 0 ? -1 : 1;
    const stepY = rayDirY < 0 ? -1 : 1;
    let sideDistX = (rayDirX < 0 ? camera.x - mapX : mapX + 1 - camera.x) * deltaDistX;
    let sideDistY = (rayDirY < 0 ? camera.y - mapY : mapY + 1 - camera.y) * deltaDistY;

    let side = 0;
    let tile = TILE.EMPTY;

    while (tile === TILE.EMPTY) {
        if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            side = 0;
        } else {
            sideDistY += deltaDistY;
            mapY += stepY;
            side = 1;
        }
        tile = getTile(mapX, mapY);
    }

    const distance = side === 0
        ? (mapX - camera.x + (1 - stepX) / 2) / rayDirX
        : (mapY - camera.y + (1 - stepY) / 2) / rayDirY;

    // Punto exacto de la pared donde pegó el rayo (0 a 1): sirve para elegir la columna de la textura
    const hit = side === 0 ? camera.y + distance * rayDirY : camera.x + distance * rayDirX;
    const wallX = hit - Math.floor(hit);

    return { distance, side, tile, wallX, rayDirX, rayDirY };
}

/**
 * Techo y piso en franjas planas (como los juegos de 1993): cada franja es un
 * poco más oscura que la anterior al alejarse del horizonte, sin degradados suaves.
 */
function drawBackdrop(width, height, horizon) {
    const bands = CONFIG.backdropBands;

    ctx.fillStyle = currentSector.theme.ceiling;
    ctx.fillRect(0, 0, width, horizon);
    ctx.fillStyle = currentSector.theme.floor;
    ctx.fillRect(0, horizon, width, height - horizon);

    for (let i = 1; i < bands; i++) {
        const shade = `rgba(0, 0, 0, ${(i / bands * 0.92).toFixed(2)})`;
        const ceilingSpan = horizon / bands;
        const floorSpan = (height - horizon) / bands;
        ctx.fillStyle = shade;

        // Techo: la franja i queda a i bloques del horizonte hacia arriba
        const ceilTop = horizon - ceilingSpan * (i + 1);
        ctx.fillRect(0, Math.max(0, ceilTop), width, Math.ceil(ceilingSpan));

        // Piso: la franja i queda a i bloques del horizonte hacia abajo
        const floorTop = horizon + floorSpan * i;
        ctx.fillRect(0, floorTop, width, Math.ceil(floorSpan));
    }
}

function drawWallColumn(x, ray, height, horizon, now) {
    const lineHeight = (height * state.zoom) / ray.distance;
    const wallTop = horizon - lineHeight / 2;
    const drawStart = Math.max(0, Math.floor(wallTop));
    const drawEnd = Math.min(height, Math.ceil(wallTop + lineHeight));
    const drawHeight = drawEnd - drawStart;
    if (drawHeight <= 0) return;

    const isDoor = ray.tile === TILE.DOOR;
    const texture = isDoor ? doorTexture : wallTexture;
    const offsets = isDoor ? doorOffsets : wallOffsets;
    const texW = CODE_TEXTURE.width;

    // Columna de la textura que corresponde a este rayo (se espeja según la cara para que no quede al revés)
    let texX = Math.min(texW - 1, Math.floor(ray.wallX * texW));
    if ((ray.side === 0 && ray.rayDirX > 0) || (ray.side === 1 && ray.rayDirY < 0)) {
        texX = texW - 1 - texX;
    }

    // Solo se toma de la textura la parte que se ve en pantalla
    const texPerPixel = texture.height / lineHeight;
    const srcY = offsets[Math.floor(texX / CODE_TEXTURE.glyphW)] + (drawStart - wallTop) * texPerPixel;
    const srcH = Math.max(0.01, Math.min(drawHeight * texPerPixel, texture.el.height - srcY));

    ctx.drawImage(texture.el, texX, srcY, 1, srcH, x, drawStart, 1, drawHeight);

    // Niebla: lo lejano se oscurece (las puertas se mantienen más brillantes)
    const fog = Math.min(1, ray.distance / CONFIG.fogDistance);
    const shade = Math.min(0.92, isDoor ? fog * 0.5 : fog * 0.85 + (ray.side === 1 ? 0.18 : 0));
    if (shade > 0.01) {
        ctx.fillStyle = `rgba(0, 0, 0, ${shade.toFixed(2)})`;
        ctx.fillRect(x, drawStart, 1, drawHeight);
    }

    // Las puertas laten con un brillo rojo
    if (isDoor) {
        const pulse = 0.1 + 0.1 * Math.sin(now / 180);
        ctx.fillStyle = `rgba(255, 60, 60, ${pulse.toFixed(2)})`;
        ctx.fillRect(x, drawStart, 1, drawHeight);
    }

    // Bordes: arriba, abajo y en las juntas verticales
    ctx.globalAlpha = 1 - fog * 0.75;
    ctx.fillStyle = isDoor ? COLORS.doorEdge : currentSector.theme.wallEdge;
    if (wallTop >= 0) ctx.fillRect(x, drawStart, 1, 2);
    if (wallTop + lineHeight <= height) ctx.fillRect(x, drawEnd - 2, 1, 2);
    if (texX <= 1 || texX >= texW - 2) {
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(x, drawStart, 1, drawHeight);
    }
    ctx.globalAlpha = 1;
}

/** Lista de todo lo que se dibuja como sprite este cuadro (los enemigos). */
function collectSprites(now) {
    const sprites = [];

    for (const enemy of enemies) {
        const type = enemy.type;
        const set = enemyTextures[type.id];
        const age = enemy.alive ? 0 : (now - enemy.diedAt) / (type.deathMs ?? CONFIG.deathAnimMs);
        if (age >= 1) continue;

        let texture;
        let scale;
        let alpha;
        if (enemy.alive) {
            const frames = now < enemy.hurtUntil ? set.hurt : set.normal;
            texture = frames[Math.floor(now / type.frameMs + enemy.phase) % frames.length];
            scale = type.scale;
            alpha = type.alpha ?? 1;
        } else if (type.explodes || type.boss) {
            // Bombas y jefe se convierten en una bola de fuego que crece y se desvanece
            texture = blastTexture;
            scale = type.scale * (1 + (type.boss ? 1 : 2.2) * age);
            alpha = 1 - age;
        } else {
            // El resto se encoge y se desvanece
            texture = set.hurt[0];
            scale = type.scale * (1 - age);
            alpha = (type.alpha ?? 1) * (1 - age);
        }

        sprites.push({
            x: enemy.x,
            y: enemy.y,
            texture,
            scale,
            alpha,
            bobAmount: 0.06,
            bobSpeed: 250,
            bobPhase: enemy.phase,
        });
    }

    if (state.pvp && net.remote?.seen) {
        sprites.push({
            x: net.remote.rx, y: net.remote.ry, texture: remoteTexture, scale: PVP.scale,
            alpha: 1, bobAmount: 0.04, bobSpeed: 250, bobPhase: 0,
        });
    }

    for (const n of nades) {
        sprites.push({ x: n.x, y: n.y, texture: nadeTexture, scale: 0.16, alpha: 1, bobAmount: 0, bobSpeed: 250, bobPhase: 0 });
    }
    for (const b of blasts) {
        const age = (now - b.at) / 500;
        if (age >= 1) continue;
        sprites.push({ x: b.x, y: b.y, texture: blastTexture, scale: 1.2 + 1.4 * age, alpha: 1 - age, bobAmount: 0, bobSpeed: 250, bobPhase: 0 });
    }

    for (const p of projectiles) {
        sprites.push({
            x: p.x,
            y: p.y,
            texture: projectileTextures[Math.floor(now / 120) % 2],
            scale: 0.34,
            alpha: 1,
            bobAmount: 0,
            bobSpeed: 250,
            bobPhase: 0,
        });
    }

    return sprites;
}

function drawSprites(now, width, height, horizon) {
    // Del más lejano al más cercano, para que los cercanos tapen a los lejanos
    const sorted = collectSprites(now)
        .map((sprite) => ({
            ...sprite,
            dist2: (sprite.x - camera.x) ** 2 + (sprite.y - camera.y) ** 2,
        }))
        .sort((a, b) => b.dist2 - a.dist2);

    for (const sprite of sorted) {
        const { x: lateral, depth } = project(sprite.x, sprite.y);
        if (depth <= 0.1) continue;                                // detrás de la cámara

        const size = Math.floor(((height * state.zoom) / depth) * sprite.scale);
        if (size < 1) continue;

        const texSize = sprite.texture.width;                      // los sprites pueden tener distinto tamaño
        const screenX = (width / 2) * (1 + lateral / depth);
        const bob = Math.sin(now / sprite.bobSpeed + sprite.bobPhase) * size * sprite.bobAmount;
        const left = screenX - size / 2;
        const top = Math.floor(horizon - size / 2 + bob);

        const startX = Math.max(0, Math.floor(left));
        const endX = Math.min(width - 1, Math.floor(left + size));

        ctx.globalAlpha = sprite.alpha;
        for (let stripe = startX; stripe <= endX; stripe++) {
            if (depth >= zBuffer[stripe]) continue;                 // una pared lo tapa
            const texX = Math.min(texSize - 1, Math.floor(((stripe - left) * texSize) / size));
            ctx.drawImage(sprite.texture, texX, 0, 1, texSize, stripe, top, 1, size);
        }
    }
    ctx.globalAlpha = 1;
}

/** Destello de la boca del arma: halo, núcleo blanco y rayos. */
function drawMuzzleFlash(x, y, power) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const radius = 24 + power * 42;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${power.toFixed(2)})`);
    glow.addColorStop(0.35, `rgba(255, 220, 80, ${(0.8 * power).toFixed(2)})`);
    glow.addColorStop(1, 'rgba(255, 160, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 240, 150, ${power.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + 0.2;
        const length = radius * (i % 2 === 0 ? 1.5 : 1.05);
        ctx.moveTo(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    }
    ctx.stroke();
    ctx.restore();
}

/** Pistola: cuerpo metálico, tres cañones, núcleo de energía y pantalla de balas. */
function drawPistol(cx, base, recoil, pulse) {
    const metal = ctx.createLinearGradient(cx - 54, 0, cx + 54, 0);
    metal.addColorStop(0, COLORS.gunDark);
    metal.addColorStop(0.5, COLORS.gunLight);
    metal.addColorStop(1, COLORS.gunDark);

    // Culata
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(cx - 54, base);
    ctx.lineTo(cx - 34, base - 74);
    ctx.lineTo(cx + 34, base - 74);
    ctx.lineTo(cx + 54, base);
    ctx.closePath();
    ctx.fill();

    // Bloque superior y cañones laterales
    ctx.fillStyle = COLORS.gunDark;
    ctx.fillRect(cx - 22, base - 128, 44, 58);
    ctx.fillStyle = metal;
    ctx.fillRect(cx - 34, base - 118, 10, 52);
    ctx.fillRect(cx + 24, base - 118, 10, 52);

    // Canal del núcleo y celdas de energía que laten (sin resplandor)
    ctx.fillStyle = '#021008';
    ctx.fillRect(cx - 8, base - 124, 16, 54);
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.fillStyle = recoil > 0 ? '#ffffff' : COLORS.gunCore;
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 5, base - 120 + i * 13, 10, 9);
    ctx.restore();

    // Anillo de la boca y bordes
    ctx.fillStyle = COLORS.gunLight;
    ctx.fillRect(cx - 26, base - 134, 52, 9);
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 26.5, base - 134.5, 53, 10);
    ctx.strokeRect(cx - 22.5, base - 125.5, 45, 56);
    ctx.beginPath();
    ctx.moveTo(cx - 54, base);
    ctx.lineTo(cx - 34, base - 74);
    ctx.moveTo(cx + 54, base);
    ctx.lineTo(cx + 34, base - 74);
    ctx.stroke();

    // Rejillas de ventilación
    ctx.fillStyle = COLORS.gunDark;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx - 44 + i * 4, base - 24 - i * 10, 12 - i * 2, 3);
        ctx.fillRect(cx + 32 - i * 2 + i * 4 - 4, base - 24 - i * 10, 12 - i * 2, 3);
    }

    // Pantallita con las balas (se pone roja cuando quedan pocas)
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 18, base - 55, 36, 18);
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = state.ammo <= 30 ? COLORS.danger : COLORS.crosshair;
    ctx.fillText(String(state.ammo), cx, base - 46);
}

function drawShotgun(cx, base) {
    ctx.fillStyle = '#4a2c12';                                   // culata
    ctx.beginPath();
    ctx.moveTo(cx - 46, base);
    ctx.lineTo(cx - 26, base - 64);
    ctx.lineTo(cx + 26, base - 64);
    ctx.lineTo(cx + 46, base);
    ctx.closePath();
    ctx.fill();

    const metal = ctx.createLinearGradient(cx - 26, 0, cx + 26, 0);
    metal.addColorStop(0, COLORS.gunDark);
    metal.addColorStop(0.5, COLORS.gunLight);
    metal.addColorStop(1, COLORS.gunDark);
    ctx.fillStyle = metal;                                       // cañones dobles
    ctx.fillRect(cx - 26, base - 150, 22, 90);
    ctx.fillRect(cx + 4, base - 150, 22, 90);
    ctx.fillStyle = '#000000';                                   // bocas
    ctx.fillRect(cx - 22, base - 150, 14, 5);
    ctx.fillRect(cx + 8, base - 150, 14, 5);

    ctx.fillStyle = '#6b4220';                                   // guardamanos de madera
    ctx.fillRect(cx - 30, base - 100, 60, 34);
    ctx.fillStyle = '#3a2410';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 30, base - 94 + i * 8, 60, 2);

    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 26.5, base - 150.5, 22, 90);
    ctx.strokeRect(cx + 3.5, base - 150.5, 22, 90);
    ctx.strokeRect(cx - 30.5, base - 100.5, 61, 34);
}

function drawSmg(cx, base) {
    ctx.fillStyle = COLORS.gunDark;                              // cuerpo
    ctx.fillRect(cx - 18, base - 140, 36, 100);
    ctx.fillStyle = COLORS.gunLight;
    ctx.fillRect(cx - 18, base - 140, 6, 100);
    ctx.fillRect(cx - 5, base - 162, 10, 24);                    // cañón corto
    ctx.fillStyle = COLORS.gunDark;
    ctx.fillRect(cx + 18, base - 92, 14, 52);                    // cargador
    ctx.beginPath();                                             // empuñadura
    ctx.moveTo(cx - 22, base);
    ctx.lineTo(cx - 14, base - 44);
    ctx.lineTo(cx + 14, base - 44);
    ctx.lineTo(cx + 22, base);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.gunFiring;                            // franja de color y ventilas
    ctx.fillRect(cx - 3, base - 130, 6, 44);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 14, base - 124 + i * 10, 8, 3);

    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 18.5, base - 140.5, 37, 101);
    ctx.strokeRect(cx - 5.5, base - 162.5, 11, 25);
}

function drawPlasma(cx, base, pulse) {
    const metal = ctx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    metal.addColorStop(0, COLORS.gunDark);
    metal.addColorStop(0.5, COLORS.gunLight);
    metal.addColorStop(1, COLORS.gunDark);
    ctx.fillStyle = metal;                                       // base ancha
    ctx.beginPath();
    ctx.moveTo(cx - 56, base);
    ctx.lineTo(cx - 38, base - 70);
    ctx.lineTo(cx + 38, base - 70);
    ctx.lineTo(cx + 56, base);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.gunDark;                              // tubo del cañón
    ctx.fillRect(cx - 28, base - 146, 56, 80);

    ctx.save();                                                  // bobinas de plasma que laten
    ctx.globalAlpha = 0.45 + 0.5 * pulse;
    ctx.fillStyle = '#00e5ff';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 24, base - 138 + i * 19, 48, 9);
    ctx.restore();

    ctx.fillStyle = COLORS.gunLight;                             // boca
    ctx.fillRect(cx - 34, base - 154, 68, 10);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 34.5, base - 154.5, 69, 11);
    ctx.strokeRect(cx - 28.5, base - 146.5, 57, 81);
}

/** Dibuja el arma elegida con su movimiento, retroceso y destello. */
function drawSniper(cx, base) {
    ctx.fillStyle = '#2b2b2b';                                   // cañón largo
    ctx.fillRect(cx - 5, base - 190, 10, 150);
    ctx.fillStyle = '#555555';
    ctx.fillRect(cx - 5, base - 190, 3, 150);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 7, base - 194, 14, 6);                     // freno de boca

    ctx.fillStyle = COLORS.gunDark;                              // cuerpo
    ctx.fillRect(cx - 14, base - 60, 28, 60);
    ctx.fillStyle = COLORS.gunLight;
    ctx.fillRect(cx - 14, base - 60, 5, 60);

    ctx.fillStyle = '#1a1a1a';                                   // mira telescópica
    ctx.fillRect(cx - 9, base - 120, 18, 44);
    ctx.fillRect(cx - 12, base - 124, 24, 8);
    ctx.fillRect(cx - 12, base - 80, 20, 6);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(cx - 5, base - 124, 10, 3);                     // lente

    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 5.5, base - 190.5, 11, 151);
    ctx.strokeRect(cx - 9.5, base - 120.5, 19, 45);
}

/** Mira telescópica: todo se oscurece salvo un círculo con la cruz de puntería. */
function drawScope(width, height, amount) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * (0.95 - 0.5 * amount);

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();

    if (amount < 0.6) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (amount - 0.6) / 0.4);
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';                       // cruz fina
    ctx.fillRect(cx - radius, cy - 1, radius * 2, 2);
    ctx.fillRect(cx - 1, cy - radius, 2, radius * 2);
    ctx.fillStyle = COLORS.crosshair;
    for (let i = -4; i <= 4; i++) {                              // marcas de distancia
        if (i === 0) continue;
        ctx.fillRect(cx + i * 22 - 1, cy - 4, 2, 8);
        ctx.fillRect(cx - 4, cy + i * 22 - 1, 8, 2);
    }
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);                          // punto rojo central
    ctx.restore();
}

function drawGun(now, width, height) {
    const weapon = WEAPONS[settings.weapon];
    const recoil = clamp((state.firingUntil - now) / CONFIG.muzzleFlashMs, 0, 1);
    const cx = width / 2 + (state.moving ? Math.sin(now / 130) * 7 : 0);
    const base = height + 8
        + (state.moving ? Math.abs(Math.cos(now / 130)) * 6 : Math.sin(now / 700) * 1.5)
        + recoil * 18;                                               // el retroceso la empuja hacia abajo
    const pulse = 0.55 + 0.45 * Math.sin(now / 160);

    if (weapon.id === 'shotgun') drawShotgun(cx, base);
    else if (weapon.id === 'smg') drawSmg(cx, base);
    else if (weapon.id === 'plasma') drawPlasma(cx, base, pulse);
    else if (weapon.id === 'sniper') drawSniper(cx, base);
    else drawPistol(cx, base, recoil, pulse);

    if (recoil > 0) drawMuzzleFlash(cx, base - weapon.flashY, recoil);
}

/** Rayo de energía desde el arma hasta la mira. */
function drawTracer(now, width, height) {
    const weapon = WEAPONS[settings.weapon];
    if (!weapon.tracer || now >= state.tracerUntil) return;
    const t = (state.tracerUntil - now) / CONFIG.tracerMs;
    const fromY = height - weapon.muzzleY;
    const toY = height / 2;
    const x = width / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(x, fromY, x, toY);
    beam.addColorStop(0, `rgba(255, 255, 255, ${t.toFixed(2)})`);
    beam.addColorStop(1, `rgba(${weapon.rgb}, ${(t * 0.5).toFixed(2)})`);
    ctx.strokeStyle = beam;
    ctx.lineWidth = 2 + weapon.tracerWidth * t;
    ctx.beginPath();
    ctx.moveTo(x, fromY);
    ctx.lineTo(x, toY);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${t.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
}

function drawCrosshair(width, height) {
    ctx.fillStyle = COLORS.crosshair;
    ctx.fillRect(width / 2 - 8, height / 2 - 1, 5, 2);
    ctx.fillRect(width / 2 + 3, height / 2 - 1, 5, 2);
    ctx.fillRect(width / 2 - 1, height / 2 - 8, 2, 5);
    ctx.fillRect(width / 2 - 1, height / 2 + 3, 2, 5);
}

function drawMouseHint(width) {
    const text = 'CLIC PARA USAR EL MOUSE';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxWidth = ctx.measureText(text).width + 24;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect((width - boxWidth) / 2, 12, boxWidth, 28);
    ctx.fillStyle = COLORS.crosshair;
    ctx.fillText(text, width / 2, 26);
}

/**
 * Minimapa (arriba a la derecha): paredes, habitaciones rojas pendientes,
 * virus (puntos de colores según el tipo) y el jugador (flecha blanca).
 * Está girado para que coincida con la vista: avanzar = ir hacia la derecha del mapa
 * al empezar, y girar a la derecha = girar en el sentido de las agujas del reloj.
 * Debajo se dibujan los datos del jugador (drawHud).
 */
function drawMinimap(now) {
    const cols = worldMap.length;
    const rows = worldMap[0].length;
    const cs = currentSector.minimapCell ?? CONFIG.minimapCell;
    const w = cols * cs;
    const h = rows * cs;
    const ox = canvas.width - w - 14;      // pegado al lado derecho
    const oy = 10;

    // Convierten coordenadas del mundo a coordenadas del minimapa (el eje Y se invierte)
    const mapX = (x) => ox + x * cs;
    const mapY = (y) => oy + (rows - y) * cs;

    ctx.save();
    ctx.textBaseline = 'middle';

    // Fondo y marco
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(ox - 4, oy - 4, w + 8, h + 8);
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 3.5, oy - 3.5, w + 7, h + 7);

    // Casillas
    const blink = Math.floor(now / 350) % 2 === 0;     // las puertas parpadean (sin brillo suave)
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const tile = worldMap[x][y];
            const left = ox + x * cs;
            const top = oy + (rows - 1 - y) * cs;

            if (tile === TILE.WALL) ctx.fillStyle = currentSector.theme.minimapWall;
            else if (tile === TILE.DOOR) ctx.fillStyle = blink ? COLORS.minimapDoor : '#8a1c1c';
            else ctx.fillStyle = COLORS.minimapFloor;
            ctx.fillRect(left, top, cs, cs);
        }
    }

    // Virus (y jefe): un punto del color de cada tipo
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const radius = enemy.type.boss ? 5 : 2.6;
        ctx.fillStyle = enemy.type.color;
        ctx.beginPath();
        ctx.arc(mapX(enemy.x), mapY(enemy.y), radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Jugador: flecha blanca que apunta hacia donde mirás
    ctx.save();
    ctx.translate(mapX(player.x), mapY(player.y));
    ctx.rotate(Math.atan2(-player.dirY, player.dirX));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawHud(ox + w, oy + h + 18);
    ctx.restore();
}

/** Texto con contorno negro para que se lea sin necesidad de cuadros. */
function hudLine(text, x, y, color) {
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

/** Datos del jugador, debajo del minimapa, alineados a la derecha y transparentes. */
function drawHud(right, top) {
    const weapon = WEAPONS[settings.weapon];
    const virusLeft = enemies.filter((e) => e.alive && !e.type.boss).length;
    const pendingRooms = state.roomsTotal - state.roomsDone;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px "Courier New", monospace';

    const lines = [
        [currentSector.name, '#ffe066'],
        [state.face, COLORS.crosshair],
        [`SALUD: ${state.health}%`, state.health <= 30 ? COLORS.danger : COLORS.crosshair],
        state.reloadUntil > performance.now()
            ? ['RECARGANDO...', '#ffe066']
            : [state.ammo < weapon.cost ? 'SIN BALAS - [R]' : `BALAS: ${state.ammo}`,
                state.ammo <= 30 ? COLORS.danger : COLORS.crosshair],
        [`PUNTOS: ${state.score}`, COLORS.crosshair],
        [`ARMA: ${weapon.name}`, state.ammo < weapon.cost ? COLORS.danger : '#ffe066'],
    ];

    if (state.pvp) {
        const scoreLine = lines.findIndex((line) => line[0].startsWith('PUNTOS'));
        if (scoreLine >= 0) lines.splice(scoreLine, 1);
        lines.push([`${settings.name}: ${net.myKills}/${PVP.kills}`, '#ffe066']);
        lines.push([`${net.rival?.name ?? 'RIVAL'}: ${net.rivalKills}/${PVP.kills}`, COLORS.danger]);
        lines.push([`GRANADAS [G]: ${net.inv.nade}`, '#ffb347']);
        lines.push([`BOTIQUÍN [H]: ${net.inv.medkit}`, '#66ff99']);
        lines.push([`ESCUDO [F]: ${net.inv.shield}`, '#66ccff']);
        if (performance.now() < net.shieldUntil) lines.push(['PROTEGIDO', '#66ccff']);
    } else if (state.bossSpawned) {
        lines.push(['¡MATÁ AL JEFE!', COLORS.danger]);
    } else {
        lines.push([`${virusLeft === 0 ? '[X]' : '[ ]'} VIRUS: ${virusLeft}`,
            virusLeft === 0 ? COLORS.crosshair : '#d9b3ff']);
        lines.push([`${pendingRooms === 0 ? '[X]' : '[ ]'} SALAS: ${state.roomsDone}/${state.roomsTotal}`,
            pendingRooms === 0 ? COLORS.crosshair : COLORS.minimapDoor]);
    }

    lines.forEach(([text, color], i) => hudLine(text, right, top + i * 16, color));
}

/** Barra de vida del jefe, arriba en la pantalla. */
function drawBossBar(width) {
    const boss = enemies.find((e) => e.alive && e.type.boss);
    if (!boss) return;

    const ratio = clamp(boss.hp / boss.type.hp, 0, 1);
    const barWidth = width * 0.44;
    const x = (width - barWidth) / 2;
    const y = 58;

    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.danger;
    ctx.fillText(`** ${boss.type.name} **`, width / 2, y - 10);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x - 3, y - 3, barWidth + 6, 16);
    ctx.fillStyle = ratio > boss.type.enrageAt ? '#c4001a' : '#ff5a00';   // naranja cuando se enfurece
    ctx.fillRect(x, y, barWidth * ratio, 10);
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 3.5, y - 3.5, barWidth + 7, 17);
}

/** Cartel de aviso (despierta el jefe, faltan habitaciones...). */
function drawBanner(now, width, height) {
    if (now >= state.bannerUntil) return;
    const blink = Math.floor(now / 180) % 2 === 0;
    const top = height * 0.22;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, top, width, 72);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillStyle = blink ? COLORS.danger : '#ffb3b3';
    ctx.fillText(`!! ${state.bannerText} !!`, width / 2, top + 28);
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#ffcccc';
    ctx.fillText(state.bannerSub, width / 2, top + 54);
}

function render(now) {
    const { width, height } = canvas;

    updateCamera();
    refreshCodeTextures(now);
    updateScrollOffsets(wallTexture, wallOffsets, now, 1);
    updateScrollOffsets(doorTexture, doorOffsets, now, 2);

    const horizon = Math.round(height / 2 + state.lookOffset * state.zoom);
    drawBackdrop(width, height, horizon);

    for (let x = 0; x < width; x++) {
        const ray = castRay(x, width);
        zBuffer[x] = ray.distance;
        drawWallColumn(x, ray, height, horizon, now);
    }

    drawSprites(now, width, height, horizon);
    drawRivalName(width, height, horizon);

    // Mientras el jefe está vivo, el ambiente se tiñe de rojo que late
    if (state.bossSpawned && enemies.some((e) => e.alive && e.type.boss)) {
        ctx.fillStyle = `rgba(120, 0, 0, ${(0.07 + 0.04 * Math.sin(now / 280)).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
    }

    drawParticles();
    const scopeAmount = clamp((state.zoom - 1) / (CONFIG.sniperZoom - 1), 0, 1);
    if (scopeAmount < 0.5) {
        drawTracer(now, width, height);
        drawGun(now, width, height);
    }

    // Luz del disparo sobre toda la escena
    const flash = clamp((state.firingUntil - now) / CONFIG.muzzleFlashMs, 0, 1);
    if (flash > 0) {
        ctx.fillStyle = `rgba(160, 255, 200, ${(0.07 * flash).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
    }

    if (scopeAmount > 0.02) drawScope(width, height, scopeAmount);
    else drawCrosshair(width, height);
    if (state.started) drawMinimap(now);
    drawBossBar(width);
    drawBanner(now, width, height);

    if (state.started && !state.paused && !state.pointerLocked && now < state.hintUntil) {
        drawMouseHint(width);
    }

    if (state.pvp && now < net.shieldUntil) {
        ctx.fillStyle = 'rgba(80, 160, 255, 0.14)';
        ctx.fillRect(0, 0, width, height);
    }

    if (now < state.hurtUntil) {
        ctx.fillStyle = COLORS.hurtOverlay;
        ctx.fillRect(0, 0, width, height);
    }
}

/* --- Cara del jugador (se muestra en el HUD del canvas) ------------------- */

function flashFace(face) {
    state.face = face;
    clearTimeout(faceTimer);
    faceTimer = setTimeout(() => { state.face = FACES.idle; }, CONFIG.faceResetMs);
}

/* --- Fin de la partida ---------------------------------------------------- */

function endGame(won) {
    if (state.over) return;
    state.over = true;
    state.paused = true;
    releaseInputs();
    releasePointer();
    applyMusic();                // detiene la música
    dom.settingsBtn.hidden = true;
    if (won) flashFace(FACES.win);

    const hasNextSector = won && state.sector < SECTORS.length - 1;
    dom.modalTitle.textContent = won ? `[OK] ${currentSector.name} LIMPIO: JEFE ELIMINADO` : '[!] SISTEMA INFECTADO';
    dom.modalText.textContent = `${currentSector.name} - Nivel ${LEVELS[state.level].label} - Puntuación final: ${state.score} - Tiempo: ${formatTime(state.playTime)}`
        + (won && !hasNextSector ? ' - ¡COMPLETASTE TODOS LOS SECTORES!' : '');
    dom.bestiary.hidden = true;
    dom.levelBadge.hidden = true;
    dom.startBtn.hidden = false;
    dom.startBtn.textContent = 'JUGAR DE NUEVO';
    dom.endMenuBtn.hidden = false;
    dom.nextSectorBtn.hidden = !hasNextSector;

    setTimeout(() => {
        dom.modal.hidden = false;
        (hasNextSector ? dom.nextSectorBtn : dom.startBtn).focus();
    }, CONFIG.endScreenDelayMs);
}

/* --- Video de introducción ------------------------------------------------ */

/** Cierra el video (terminó, se saltó o falló) y muestra la historia. */
function showStory() {
    dom.videoModal.hidden = true;
    dom.introVideo.pause();
    dom.introModal.hidden = false;
    dom.introBtn.focus();
}

/** Clic en JUGAR de la portada: oculta la imagen y arranca el video de introducción. */
function onTitlePlay() {
    dom.titleModal.hidden = true;
    try { dom.introVideo.currentTime = 0; } catch { /* el video aún no cargó */ }
    dom.videoPlay.hidden = true;
    dom.videoModal.hidden = false;
    playIntroVideo();
}

/** Se llama desde el clic en "VER INTRODUCCIÓN": el navegador permite sonido y pantalla completa. */
function playIntroVideo() {
    enterFullscreen();
    dom.videoPlay.hidden = true;
    dom.videoSkip.hidden = false;
    dom.videoSkip.focus();

    const started = dom.introVideo.play();
    if (started && typeof started.catch === 'function') started.catch(showStory);
}

/* --- Introducción y selección de nivel ------------------------------------ */

function onIntroContinue() {
    enterFullscreen();           // viene de un clic, así que el navegador lo permite
    dom.introModal.hidden = true;
    dom.levelModal.hidden = false;
    dom.levelBtns[0]?.focus();
}

function chooseLevel(levelId) {
    if (!LEVELS[levelId]) return;
    state.pvp = false;
    state.level = levelId;

    const level = LEVELS[levelId];
    dom.levelBadge.textContent = `NIVEL: ${level.label}`;

    // Se omite la pantalla de instrucciones: el clic en el nivel arranca la partida directamente
    dom.levelModal.hidden = true;
    startGame();
}

/** Elige el sector (mapa) y marca el botón correspondiente en el menú de nivel. */
function selectSector(index) {
    if (!SECTORS[index]) return;
    state.sector = index;
    dom.sectorBtns.forEach((button) => {
        const on = Number(button.dataset.sector) === index;
        button.classList.toggle('is-selected', on);
        button.setAttribute('aria-pressed', String(on));
    });
}

/* --- Habitaciones / minijuegos -------------------------------------------- */

/**
 * Reparte las preguntas sin repetir hasta usarlas todas, mezcla el orden de las opciones
 * y elige el idioma según el nivel:
 *   FÁCIL = pregunta y respuestas en español
 *   INTERMEDIO = pregunta en inglés, respuestas en español
 *   DIFÍCIL = pregunta y respuestas en inglés
 */
function nextChallenge() {
    if (challengeDeck.length === 0) {
        challengeDeck = shuffle(CHALLENGES.map((_, index) => index));
    }
    const source = CHALLENGES[challengeDeck.pop()];
    const level = LEVELS[state.level];
    const options = shuffle(source.options.map((text, index) => ({
        text: text[level.answerLang],
        correct: index === 0,
    })));

    return {
        question: source.question[level.questionLang],
        explanation: source.explanation[level.answerLang],
        options,
        ui: ROOM_TEXT[level.answerLang],
    };
}

function openRoom(door) {
    const challenge = nextChallenge();
    state.activeChallenge = challenge;
    state.activeDoor = door;
    state.paused = true;
    releaseInputs();
    releasePointer();            // hace falta el cursor para elegir una respuesta
    dom.settingsBtn.hidden = true;

    dom.roomTitle.textContent = `[!] ${challenge.ui.room} [${door.x}, ${door.y}]`;
    dom.roomDesc.textContent = challenge.question;

    const buttons = challenge.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'room-btn';
        button.dataset.index = index;
        button.textContent = `${String.fromCharCode(65 + index)}) ${option.text}`;
        return button;
    });

    dom.roomFeedback = document.createElement('p');
    dom.roomFeedback.className = 'room-feedback';
    dom.roomFeedback.setAttribute('role', 'status');

    dom.roomContent.replaceChildren(...buttons, dom.roomFeedback);
    dom.room.hidden = false;
    buttons[0].focus();
}

function onRoomClick(e) {
    const button = e.target.closest('.room-btn');
    if (!button || !state.activeChallenge) return;

    if (button.classList.contains('room-continue')) {
        closeRoom();
        return;
    }

    const challenge = state.activeChallenge;
    const option = challenge.options[Number(button.dataset.index)];

    if (option.correct) {
        dom.roomContent.querySelectorAll('.room-btn').forEach((b) => { b.disabled = true; });
        button.classList.add('is-correct');
        dom.roomFeedback.textContent = `${challenge.ui.correct} ${challenge.explanation}`;

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'room-btn room-continue';
        next.textContent = challenge.ui.next;
        dom.roomContent.append(next);
        next.focus();

        state.score += CONFIG.doorReward;
        state.ammo += CONFIG.doorAmmo;
        state.health = Math.min(CONFIG.startHealth, state.health + CONFIG.doorHeal);
        flashFace(FACES.win);
    } else {
        button.classList.add('is-wrong');
        button.disabled = true;
        dom.roomFeedback.textContent = challenge.ui.wrong;
        flashFace(FACES.hurt);
    }
}

function closeRoom() {
    setTile(state.activeDoor.x, state.activeDoor.y, TILE.EMPTY);
    state.roomsDone++;           // esta habitación ya está resuelta
    state.activeChallenge = null;
    state.activeDoor = null;
    dom.room.hidden = true;
    dom.settingsBtn.hidden = false;
    state.paused = false;
    document.activeElement?.blur();
    flashMouseHint();
    enterFullscreen();           // se llama desde el clic en CONTINUE: si salió de pantalla completa, vuelve
    capturePointer();            // idem: el navegador lo permite porque viene de un clic
    checkVictory(performance.now());   // si ya no quedan virus ni habitaciones, despierta el jefe
}

/* --- Bucle principal ------------------------------------------------------ */

function frame(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05); // evita saltos si la pestaña se pausa
    lastFrameTime = now;

    if (state.paused) {
        state.moving = false;
    } else {
        update(dt, now);
    }
    // El tiempo corre mientras se juega (no en el menú de configuración ni al terminar)
    if (state.started && !state.over && !state.settingsOpen) state.playTime += dt;
    updateTimerDisplay();

    updateParticles(dt);
    render(now);
    requestAnimationFrame(frame);
}

/* --- Inicio --------------------------------------------------------------- */

let inputsBound = false;         // los listeners se registran una sola vez
let loopRunning = false;         // el bucle de dibujo se arranca una sola vez

/** Deja todo como al principio: mapa con sus puertas, jugador, vida, balas, enemigos y jefe. */
function resetGame() {
    // Carga el mapa, la posición inicial y los colores del sector elegido
    currentSector = SECTORS[state.sector];
    LEVEL = currentSector.map;
    worldMap.length = 0;
    LEVEL.forEach((row) => worldMap.push([...row]));
    wallTexture = createCodeTexture(currentSector.theme.wallPalette, currentSector.theme.codeBg);

    Object.assign(player, { x: currentSector.start.x, y: currentSector.start.y, dirX: 1, dirY: 0, planeX: 0, planeY: -0.66 });

    Object.assign(state, {
        paused: false,
        settingsOpen: false,
        over: false,
        moving: false,
        mouseFiring: false,
        scoped: false,
        zoom: 1,
        prevWeapon: null,
        lookOffset: 0,
        score: 0,
        ammo: currentSector.startAmmo ?? CONFIG.startAmmo,
        health: CONFIG.startHealth,
        face: FACES.idle,
        lastFireAt: 0,
        firingUntil: 0,
        tracerUntil: 0,
        lastHurtAt: -Infinity,
        hurtUntil: 0,
        roomsDone: 0,
        bossSpawned: false,
        bannerUntil: 0,
        activeChallenge: null,
        activeDoor: null,
        playTime: 0,
        reloadUntil: 0,
    });
    lastTimerText = '';

    enemies = [];
    particles = [];
    projectiles = [];
    keys.clear();
    dom.room.hidden = true;
    dom.settings.hidden = true;
}

function startGame() {
    resetGame();
    dom.modal.hidden = true;
    dom.endMenuBtn.hidden = true;
    dom.nextSectorBtn.hidden = true;
    dom.startBtn.hidden = false;
    dom.settingsBtn.hidden = false;
    dom.timer.hidden = false;
    state.started = true;

    if (!inputsBound) {
        inputsBound = true;
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onHotkey);
        window.addEventListener('blur', releaseInputs);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('wheel', onWheel);
        window.addEventListener('contextmenu', (e) => { if (state.started) e.preventDefault(); });
        document.addEventListener('pointerlockchange', onPointerLockChange);
        canvas.addEventListener('click', onCanvasClick);
        dom.roomContent.addEventListener('click', onRoomClick);
    }

    // Cuenta las habitaciones (puertas rojas) que hay que resolver
    state.roomsTotal = worldMap.flat().filter((tile) => tile === TILE.DOOR).length;

    if (state.pvp) {
        const [spawnA, spawnB] = pvpSpawns();
        const spot = net.role === 'host' ? spawnA : spawnB;
        player.x = spot.x;
        player.y = spot.y;
        state.roomsTotal = 0;
        enemies = [];
    } else {
        spawnEnemies();
    }
    flashMouseHint();
    enterFullscreen();           // pantalla completa permanente
    applyMusic();                // arranca la música (viene de un clic, así que el navegador lo permite)
    capturePointer();            // se llama desde el clic en el nivel elegido
    lastFrameTime = performance.now();
    if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(frame);
    }
}

function init() {
    canvas = $('raycasterCanvas');
    if (!canvas) {
        console.error('No se encontró el canvas #raycasterCanvas');
        return;
    }
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    zBuffer = new Float32Array(canvas.width);

    wallTexture = createCodeTexture(CODE_PALETTES.wall, COLORS.codeBgWall);
    doorTexture = createCodeTexture(CODE_PALETTES.door, COLORS.codeBgDoor);
    buildEnemyTextures();
    drawRemoteTexture();

    Object.assign(dom, {
        titleModal: $('screen-title'),
        titlePlay: $('btn-title-play'),
        videoModal: $('modal-video'),
        introVideo: $('intro-video'),
        videoPlay: $('btn-video-play'),
        videoSkip: $('btn-video-skip'),
        introModal: $('modal-intro'),
        introBtn: $('btn-intro'),
        levelModal: $('modal-level'),
        levelBtns: document.querySelectorAll('.level-btn'),
        levelBadge: $('level-badge'),
        sectorBtns: document.querySelectorAll('.sector-btn'),
        nextSectorBtn: $('btn-next-sector'),
        modal: $('modal-alert'),
        modalTitle: $('modal-title'),
        modalText: $('modal-alert').querySelector('p'),
        bestiary: $('bestiary'),
        startBtn: $('btn-start'),
        settings: $('modal-settings'),
        settingsBtn: $('btn-settings'),
        settingsClose: $('btn-settings-close'),
        settingsMenu: $('btn-settings-menu'),
        endMenuBtn: $('btn-end-menu'),
        timer: $('game-timer'),
        weaponInputs: document.querySelectorAll('input[name="weapon"]'),
        sensitivity: $('mouse-sensitivity'),
        sensitivityValue: $('mouse-sensitivity-value'),
        verticalLook: $('mouse-vertical'),
        musicBtn: $('btn-music'),
        musicOn: $('music-on'),
        musicVolume: $('music-volume'),
        musicVolumeValue: $('music-volume-value'),
        room: $('room-2d'),
        roomTitle: $('room-title'),
        roomDesc: $('room-desc'),
        roomContent: $('room-content'),
    });

    loadSettings();
    syncSettingsUi();

    // Video de introducción -> historia -> nivel -> juego
    dom.videoPlay.addEventListener('click', playIntroVideo);
    dom.videoSkip.addEventListener('click', showStory);
    dom.introVideo.addEventListener('ended', showStory);
    dom.introVideo.addEventListener('error', showStory);   // si no encuentra el video, sigue con la historia
    // Portada -> JUGAR -> video de introducción (arranca solo, el clic permite sonido y pantalla completa)
    dom.titlePlay.addEventListener('click', onTitlePlay);
    dom.titlePlay.focus();

    dom.introBtn.addEventListener('click', onIntroContinue);

    dom.levelBtns.forEach((button) => {
        button.addEventListener('click', () => chooseLevel(button.dataset.level));
    });

    // Fin de partida: jugar de nuevo (directo a elegir nivel) o volver al menú principal
    dom.startBtn.addEventListener('click', () => {
        enterFullscreen();
        dom.modal.hidden = true;
        dom.levelModal.hidden = false;
        dom.levelBtns[0]?.focus();
    });
    dom.endMenuBtn.addEventListener('click', goToMenu);

    // Selector de sector (en el menú de nivel) y botón "SIGUIENTE SECTOR" del final de partida
    dom.sectorBtns.forEach((button) => {
        button.addEventListener('click', () => selectSector(Number(button.dataset.sector)));
    });
    dom.nextSectorBtn.addEventListener('click', () => {
        enterFullscreen();
        selectSector(state.sector + 1);
        dom.modal.hidden = true;
        startGame();             // mismo nivel de dificultad, sector siguiente
    });
    dom.settingsMenu.addEventListener('click', goToMenu);

    dom.settingsBtn.addEventListener('click', openSettings);
    dom.settingsClose.addEventListener('click', () => closeSettings(true));
    dom.weaponInputs.forEach((input) => {
        input.addEventListener('change', () => selectWeapon(input.value));
    });
    dom.sensitivity.addEventListener('input', onSensitivityInput);
    dom.verticalLook.addEventListener('change', onVerticalLookChange);
    dom.musicBtn.addEventListener('click', onMusicButton);
    $('btn-pvp').addEventListener('click', openPvpMenu);
    $('btn-pvp-host').addEventListener('click', pvpHost);
    $('btn-pvp-join').addEventListener('click', pvpJoin);
    $('btn-pvp-back').addEventListener('click', closePvpMenu);
    $('pvp-colors').addEventListener('click', onProfileClick);
    $('pvp-styles').addEventListener('click', onProfileClick);
    $('pvp-name').addEventListener('change', commitName);
    $('shop-list').addEventListener('click', onShopClick);
    $('btn-shop-ready').addEventListener('click', shopReady);
    $('btn-shop-cancel').addEventListener('click', cancelShop);
    dom.musicOn.addEventListener('change', () => setMusic(dom.musicOn.checked));
    dom.musicVolume.addEventListener('input', onMusicVolumeInput);
}

init();