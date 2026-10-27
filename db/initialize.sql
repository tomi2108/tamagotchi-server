BEGIN;

DROP TABLE IF EXISTS wallet;
DROP TABLE IF EXISTS shop_items;
DROP TABLE IF EXISTS shop_rotations;
DROP TABLE IF EXISTS garden_plots;
DROP TABLE IF EXISTS pet_status_effect;
DROP TABLE IF EXISTS pet_inventory;
DROP TABLE IF EXISTS pet_equipment;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS pet_state;
DROP TABLE IF EXISTS mission_definitions;
DROP TABLE IF EXISTS daily_missions;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS game_scores;
DROP TABLE IF EXISTS game_definitions;

CREATE TABLE pet_status_effect (
    pet_id INTEGER NOT NULL REFERENCES pet_state(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (pet_id, type)
);

CREATE INDEX idx_pet_status_effect_expires_at
    ON pet_status_effect (expires_at);

CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO players (name)
VALUES
    ('Tomi'),
    ('Rochi');

CREATE TABLE game_definitions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE game_scores (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL
        REFERENCES game_definitions(id),
    player_id INTEGER NOT NULL
        REFERENCES players(id),
    score INTEGER NOT NULL CHECK (score >= 0),
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_scores_leaderboard
    ON game_scores (game_id, score DESC, played_at ASC);

INSERT INTO game_definitions (
    code,
    name,
    description
)
VALUES
    (
        'memory',
        'Memoria Tamagotchi',
        '¡Tu mascota necesita una mente despierta! Encontrá las parejas de cartas iguales para demostrar que tenés una memoria increíble.'
    ),
    (
        'reaction',
        '¡Reacción relámpago!',
        '¡Tu mascota quiere jugar con vos! Prestá atención y reaccioná lo más rápido posible cuando llegue el momento. ¡Cada milisegundo cuenta!'
    );
    INSERT INTO game_definitions (code, name, description)
VALUES (
    'sudoku',
    'Sudoku 4x4',
    '¡Poné a prueba tu lógica! Completá la cuadrícula con números del 1 al 4, sin repetirlos en ninguna fila, columna ni subcuadrícula de 2x2.'
);
INSERT INTO game_definitions (code, name, description)
VALUES (
    'nonogram',
    'Nonograma 6x6',
    '¡Descubrí la imagen oculta! Usá las pistas numéricas de cada fila y columna para completar la cuadrícula de 6x6 y revelar el dibujo.'
);
    INSERT INTO game_definitions (code, name, description)
VALUES (
    'rps',
    'Piedra, papel o tijera',
    '¡Desafiá a tu mascota a un duelo! Elegí piedra, papel o tijera, ganá dos de tres rondas y demostrá quién manda en este clásico.'
);

CREATE TABLE mission_definitions (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    type TEXT NOT NULL CHECK (
        type IN ('automatic', 'manual')
    ),

    event_type TEXT,
    target INTEGER NOT NULL CHECK (target > 0),
    conditions JSONB NOT NULL DEFAULT '{}',

    reward_coins INTEGER NOT NULL DEFAULT 0
        CHECK (reward_coins >= 0)
);

CREATE TABLE daily_missions (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER NOT NULL
        REFERENCES mission_definitions(id),
    mission_date DATE NOT NULL,
    target INTEGER NOT NULL CHECK (target > 0),
    progress INTEGER NOT NULL DEFAULT 0
        CHECK (progress >= 0),
    reward_coins INTEGER NOT NULL DEFAULT 0
        CHECK (reward_coins >= 0),
    completed_at TIMESTAMPTZ,

    UNIQUE (mission_id, mission_date)
);

-- Items catalog
CREATE TABLE items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,

    type TEXT NOT NULL CHECK (
        type IN ('consumable', 'seed', 'equippable')
    ),

    slot TEXT CHECK (
        slot IN ('head', 'body', 'accessory')
    ),

    price INTEGER NOT NULL CHECK (price > 0),

    rarity TEXT NOT NULL DEFAULT 'common' CHECK (
        rarity IN ('common', 'uncommon', 'rare', 'legendary')
    ),

    growth_time_seconds INTEGER
        CHECK (growth_time_seconds IS NULL OR growth_time_seconds > 0),
    harvest_item_id INTEGER REFERENCES items(id),
    harvest_quantity INTEGER
        CHECK (harvest_quantity IS NULL OR harvest_quantity > 0),

    CHECK (
        (type = 'equippable' AND slot IS NOT NULL)
        OR (type IN ('consumable', 'seed') AND slot IS NULL)
    )
);

-- Garden plots. Each plot is either empty or has one growing plant.
CREATE TABLE garden_plots (
    plot_number INTEGER PRIMARY KEY CHECK (plot_number > 0),
    seed_item_id INTEGER REFERENCES items(id),
    planted_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,

    CHECK (
        (seed_item_id IS NULL AND planted_at IS NULL AND ready_at IS NULL)
        OR
        (seed_item_id IS NOT NULL AND planted_at IS NOT NULL AND ready_at IS NOT NULL)
    )
);

INSERT INTO garden_plots (plot_number)
SELECT generate_series(1, 6);

-- Pet state
CREATE TABLE pet_state (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    energy REAL NOT NULL,
    hunger REAL NOT NULL,
    hydration REAL NOT NULL,
    cleanliness REAL NOT NULL,
    happiness REAL NOT NULL,
    is_dead BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (
        status IN ('idle', 'sleeping')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL DEFAULT 'Tamagotchi',
    hunger_zero_since TIMESTAMPTZ,
    hydration_zero_since TIMESTAMPTZ
);
ALTER TABLE pet_state
ADD COLUMN species VARCHAR(20) NOT NULL DEFAULT 'cat';

CREATE UNIQUE INDEX one_alive_pet
ON pet_state ((is_dead))
WHERE is_dead = false;

-- Shared inventory
CREATE TABLE pet_inventory (
    item_id INTEGER PRIMARY KEY REFERENCES items(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

-- Currently equipped items
CREATE TABLE pet_equipment (
    slot TEXT PRIMARY KEY CHECK (
        slot IN ('head', 'body', 'accessory')
    ),
    item_id INTEGER NOT NULL UNIQUE REFERENCES items(id)
);

-- Shared wallet
CREATE TABLE wallet (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0)
);

-- Shop rotations
CREATE TABLE shop_rotations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    starts_at TIMESTAMPTZ NOT NULL UNIQUE,
    ends_at TIMESTAMPTZ NOT NULL,
    CHECK (ends_at > starts_at)
);

CREATE TABLE shop_items (
    rotation_id BIGINT NOT NULL
        REFERENCES shop_rotations(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    PRIMARY KEY (rotation_id, item_id)
);

-- Item catalog. Explicit IDs preserve references used by mission conditions.
INSERT INTO items (id, code, name, type, slot, price, rarity, growth_time_seconds, harvest_item_id, harvest_quantity)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'strawberry', 'Frutilla', 'consumable', NULL, 5, 'common', NULL, NULL, NULL),
    (2, 'apple', 'Manzana', 'consumable', NULL, 5, 'common', NULL, NULL, NULL),
    (3, 'banana', 'Banana', 'consumable', NULL, 5, 'common', NULL, NULL, NULL),
    (4, 'cookie', 'Galletita', 'consumable', NULL, 8, 'common', NULL, NULL, NULL),
    (5, 'carrot', 'Zanahoria', 'consumable', NULL, 8, 'common', NULL, NULL, NULL),
    (6, 'fish', 'Pescado', 'consumable', NULL, 15, 'uncommon', NULL, NULL, NULL),
    (7, 'cake', 'Torta', 'consumable', NULL, 20, 'uncommon', NULL, NULL, NULL),
    (8, 'candy', 'Caramelo', 'consumable', NULL, 10, 'common', NULL, NULL, NULL),
    (9, 'sandwich', 'Sandwich', 'consumable', NULL, 15, 'uncommon', NULL, NULL, NULL),
    (10, 'energy_potion', 'Poción de energía', 'consumable', NULL, 20, 'uncommon', NULL, NULL, NULL),
    (11, 'healing_potion', 'Poción curativa', 'consumable', NULL, 30, 'rare', NULL, NULL, NULL),
    (12, 'medicine', 'Remedio', 'consumable', NULL, 15, 'common', NULL, NULL, NULL),
    (13, 'vitamin', 'Vitamina', 'consumable', NULL, 21, 'uncommon', NULL, NULL, NULL),
    (14, 'syrup', 'Jarabe', 'consumable', NULL, 15, 'common', NULL, NULL, NULL),
    (15, 'strawberry_seed', 'Semillas de frutilla', 'seed', NULL, 10, 'common', 1800, 1, 5),
    (16, 'carrot_seed', 'Semillas de zanahoria', 'seed', NULL, 8, 'common', 1200, 5, 2),
    (17, 'tomato_seed', 'Semillas de tomate', 'seed', NULL, 12, 'common', 2400, 40, 3),
    (18, 'lettuce_seed', 'Semillas de lechuga', 'seed', NULL, 8, 'common', 900, 41, 2),
    (19, 'pumpkin_seed', 'Semillas de calabaza', 'seed', NULL, 20, 'uncommon', 3600, 42, 1),
    (20, 'straw_hat', 'Sombrero de paja', 'equippable', 'head', 20, 'common', NULL, NULL, NULL),
    (21, 'crown', 'Corona', 'equippable', 'head', 150, 'legendary', NULL, NULL, NULL),
    (22, 'wool_hat', 'Gorro de lana', 'equippable', 'head', 25, 'uncommon', NULL, NULL, NULL),
    (23, 'cap', 'Gorra', 'equippable', 'head', 20, 'common', NULL, NULL, NULL),
    (24, 'wizard_hood', 'Capucha de mago', 'equippable', 'head', 80, 'rare', NULL, NULL, NULL),
    (25, 'cat_ears', 'Orejas de gato', 'equippable', 'head', 60, 'rare', NULL, NULL, NULL),
    (26, 'blue_shirt', 'Remera azul', 'equippable', 'body', 20, 'common', NULL, NULL, NULL),
    (27, 'yellow_raincoat', 'Piloto amarillo', 'equippable', 'body', 40, 'uncommon', NULL, NULL, NULL),
    (28, 'cozy_sweater', 'Buzo cómodo', 'equippable', 'body', 30, 'uncommon', NULL, NULL, NULL),
    (29, 'frog_costume', 'Disfraz de rana', 'equippable', 'body', 80, 'rare', NULL, NULL, NULL),
    (30, 'armor', 'Armadura', 'equippable', 'body', 120, 'legendary', NULL, NULL, NULL),
    (31, 'apron', 'Delantal', 'equippable', 'body', 25, 'common', NULL, NULL, NULL),
    (32, 'bell_collar', 'Collar con cascabel', 'equippable', 'accessory', 30, 'uncommon', NULL, NULL, NULL),
    (33, 'lucky_charm', 'Amuleto de la suerte', 'equippable', 'accessory', 100, 'rare', NULL, NULL, NULL),
    (34, 'red_bow', 'Moño rojo', 'equippable', 'accessory', 15, 'common', NULL, NULL, NULL),
    (35, 'glasses', 'Anteojos', 'equippable', 'accessory', 35, 'uncommon', NULL, NULL, NULL),
    (36, 'scarf', 'Bufanda', 'equippable', 'accessory', 25, 'common', NULL, NULL, NULL),
    (37, 'backpack', 'Mochila', 'equippable', 'accessory', 50, 'uncommon', NULL, NULL, NULL),
    (38, 'fairy_wings', 'Alas de hada', 'equippable', 'accessory', 150, 'legendary', NULL, NULL, NULL),
    (39, 'bandana', 'Pañuelo', 'equippable', 'accessory', 15, 'common', NULL, NULL, NULL),
    (40, 'tomato', 'Tomate', 'consumable', NULL, 8, 'common', NULL, NULL, NULL),
    (41, 'lettuce', 'Lechuga', 'consumable', NULL, 8, 'common', NULL, NULL, NULL),
    (42, 'pumpkin', 'Calabaza', 'consumable', NULL, 15, 'uncommon', NULL, NULL, NULL);

-- Keep the identity sequence in sync with the explicit item IDs.
SELECT setval(pg_get_serial_sequence('items', 'id'), (SELECT MAX(id) FROM items));

ALTER TABLE items
ADD CONSTRAINT seed_growth_and_harvest_config_check
CHECK (
    (
        type = 'seed'
        AND growth_time_seconds IS NOT NULL
        AND harvest_item_id IS NOT NULL
        AND harvest_quantity IS NOT NULL
    )
    OR
    (
        type <> 'seed'
        AND growth_time_seconds IS NULL
        AND harvest_item_id IS NULL
        AND harvest_quantity IS NULL
    )
);

-- Initialize the shared wallet
INSERT INTO wallet (id, coins)
VALUES (1, 200)
ON CONFLICT (id) DO NOTHING;

-- Mission catalog
INSERT INTO mission_definitions (
    code,
    title,
    description,
    type,
    event_type,
    target,
    conditions,
    reward_coins
)
VALUES
    -- Manual missions: hydration
    (
        'manual_drink_water',
        'Un vaso de agua',
        'Tomá 1 vaso de agua.',
        'manual', NULL, 1, '{}', 5
    ),
    (
        'manual_water_3',
        'Hidratación consciente',
        'Tomá al menos 3 vasos de agua durante el día.',
        'manual', NULL, 3, '{}', 10
    ),
    (
        'manual_water_break',
        'Pausa para hidratarse',
        'Tomá 1 vaso de agua durante una pausa.',
        'manual', NULL, 1, '{}', 5
    ),

    -- Manual missions: walking and stretching
    (
        'manual_walk_500',
        'Primeros pasos',
        'Caminá al menos 500 metros.',
        'manual', NULL, 500, '{}', 10
    ),
    (
        'manual_walk_1000',
        'Una vuelta más',
        'Caminá al menos 1.000 metros (1 km).',
        'manual', NULL, 1000, '{}', 15
    ),
    (
        'manual_walk_2000',
        'A paso firme',
        'Caminá al menos 2.000 metros (2 km).',
        'manual', NULL, 2000, '{}', 20
    ),
    (
        'manual_walk_break',
        'Despegate de la silla',
        'Levantate y caminá durante al menos 2 minutos.',
        'manual', NULL, 2, '{}', 8
    ),
    (
        'manual_stretch_2',
        'Aflojá los hombros',
        'Estirá el cuerpo durante 2 minutos.',
        'manual', NULL, 2, '{}', 8
    ),
    (
        'manual_stretch_5',
        'Momento de elongar',
        'Estirá el cuerpo durante 5 minutos.',
        'manual', NULL, 5, '{}', 12
    ),
    (
        'manual_neck_stretch',
        'Cuello relajado',
        'Estirá suavemente el cuello durante 1 minuto.',
        'manual', NULL, 1, '{}', 8
    ),
    (
        'manual_back_stretch',
        'Espalda agradecida',
        'Cambiá de postura y estirá la espalda durante 2 minutos.',
        'manual', NULL, 2, '{}', 8
    ),

    -- Manual missions: mindfulness and breaks
    (
        'manual_meditate_2',
        'Un momento de calma',
        'Meditá durante 2 minutos.',
        'manual', NULL, 2, '{}', 10
    ),
    (
        'manual_meditate_5',
        'Cinco minutos para vos',
        'Meditá durante 5 minutos.',
        'manual', NULL, 5, '{}', 15
    ),
    (
        'manual_breathing',
        'Respirá profundo',
        'Respirá lenta y profundamente durante 1 minuto.',
        'manual', NULL, 1, '{}', 8
    ),
    (
        'manual_quiet_break',
        'Silencio por un rato',
        'Pasá 5 minutos sin pantallas ni distracciones.',
        'manual', NULL, 5, '{}', 12
    ),
    (
        'manual_sun_5',
        'Un ratito al aire libre',
        'Pasá 5 minutos al aire libre, con protección solar adecuada.',
        'manual', NULL, 5, '{}', 10
    ),
    (
        'manual_outside_10',
        'A tomar aire',
        'Pasá 10 minutos al aire libre.',
        'manual', NULL, 10, '{}', 12
    ),
    (
        'manual_nature',
        'Conectá con la naturaleza',
        'Pasá al menos 5 minutos observando la naturaleza.',
        'manual', NULL, 5, '{}', 10
    ),
    (
        'manual_rest_5',
        'Pausa merecida',
        'Descansá durante 5 minutos.',
        'manual', NULL, 5, '{}', 8
    ),
    (
        'manual_rest_15',
        'Desconexión breve',
        'Descansá durante 15 minutos.',
        'manual', NULL, 15, '{}', 15
    ),
    (
        'manual_screen_break',
        'Descanso para los ojos',
        'Descansá la vista durante al menos 2 minutos sin mirar pantallas.',
        'manual', NULL, 2, '{}', 8
    ),
    (
        'manual_sleep_routine',
        'Prepararse para dormir',
        'Dedicale al menos 10 minutos a prepararte para dormir.',
        'manual', NULL, 10, '{}', 10
    ),

    -- Manual missions: food
    (
        'manual_eat_fruit',
        'Algo fresco',
        'Comé al menos 1 fruta.',
        'manual', NULL, 1, '{}', 8
    ),
    (
        'manual_meal_away_screen',
        'Comé con tranquilidad',
        'Comé 1 comida sin mirar pantallas.',
        'manual', NULL, 1, '{}', 12
    ),
    (
        'manual_healthy_snack',
        'Una pausa rica',
        'Prepará y comé 1 comida o algo rico que disfrutes.',
        'manual', NULL, 1, '{}', 8
    ),

    -- Manual missions: personal well-being
    (
        'manual_gratitude',
        'Tres cosas buenas',
        'Pensá en 3 cosas por las que estés agradecido hoy.',
        'manual', NULL, 3, '{}', 10
    ),
    (
        'manual_journal',
        'Unas líneas para vos',
        'Escribí durante al menos 5 minutos cómo te sentís o cómo estuvo tu día.',
        'manual', NULL, 5, '{}', 10
    ),
    (
        'manual_connect',
        'Conectá con alguien',
        'Hablá o intercambiá mensajes con alguien importante durante al menos 5 minutos.',
        'manual', NULL, 5, '{}', 10
    ),
    (
        'manual_hobby',
        'Tiempo para lo que te gusta',
        'Dedicá 10 minutos a una actividad que disfrutes.',
        'manual', NULL, 10, '{}', 12
    ),
    (
        'manual_tidy',
        'Un pequeño orden',
        'Ordená un espacio pequeño durante 5 minutos.',
        'manual', NULL, 5, '{}', 10
    ),
    (
        'manual_kindness',
        'Un gesto amable',
        'Hacé al menos 1 gesto amable por vos o por otra persona.',
        'manual', NULL, 1, '{}', 10
    ),

    -- Automatic missions: feeding
    (
        'auto_feed_any_3',
        'Hora de comer',
        'Dale de comer a tu mascota 3 veces.',
        'automatic', 'pet_fed', 3, '{}', 10
    ),
    (
        'auto_feed_strawberry',
        'Fan de las frutillas',
        'Dale 3 frutillas a tu mascota.',
        'automatic', 'pet_fed', 3, '{"itemId": 1}', 12
    ),
    (
        'auto_feed_apple',
        'Una manzana al día',
        'Dale 3 manzanas a tu mascota.',
        'automatic', 'pet_fed', 3, '{"itemId": 2}', 12
    ),
    (
        'auto_feed_variety',
        'Menú variado',
        'Dale de comer a tu mascota 5 veces.',
        'automatic', 'pet_fed', 5, '{}', 18
    ),

    -- Automatic missions: minigames
    (
        'auto_play_any_2',
        'Tiempo de jugar',
        'Jugá 2 partidas de cualquier minijuego.',
        'automatic', 'game_played', 2, '{}', 10
    ),
    (
        'auto_play_any_5',
        '¡Una más!',
        'Jugá 5 partidas de cualquier minijuego.',
        'automatic', 'game_played', 5, '{}', 20
    ),
    (
        'auto_play_game_1',
        'Especialista en juegos I',
        'Jugá 3 partidas del minijuego con ID 1.',
        'automatic', 'game_played', 3, '{"gameId": 1}', 15
    ),
    (
        'auto_play_game_2',
        'Especialista en juegos II',
        'Jugá 3 partidas del minijuego con ID 2.',
        'automatic', 'game_played', 3, '{"gameId": 2}', 15
    ),

    -- Automatic missions: item usage
    (
        'auto_use_item_2',
        'Pequeña ayuda',
        'Usá 2 objetos.',
        'automatic', 'item_used', 2, '{}', 10
    ),
    (
        'auto_use_energy_potion',
        'Un empujoncito',
        'Usá 2 pociones de energía.',
        'automatic', 'item_used', 2, '{"itemId": 10}', 15
    ),
    (
        'auto_use_healing_potion',
        'Primeros auxilios',
        'Usá 1 poción curativa.',
        'automatic', 'item_used', 1, '{"itemId": 11}', 12
    ),
    (
        'auto_use_medicine_3',
        'Botiquín en acción',
        'Usá 3 objetos medicinales.',
        'automatic', 'item_used', 3, '{}', 18
    ),

    -- Automatic missions: equipment
    (
        'auto_equip_any',
        'Un nuevo look',
        'Equipá 1 objeto a tu mascota.',
        'automatic', 'item_equipped', 1, '{}', 10
    ),
    (
        'auto_equip_straw_hat',
        'Estilo veraniego',
        'Equipá el sombrero de paja a tu mascota.',
        'automatic', 'item_equipped', 1, '{"itemId": 20}', 12
    ),
    (
        'auto_equip_blue_shirt',
        'Un toque de color',
        'Equipá la remera azul a tu mascota.',
        'automatic', 'item_equipped', 1, '{"itemId": 26}', 12
    ),
    (
        'auto_equip_three',
        'Cambio de vestuario',
        'Equipá objetos a tu mascota 3 veces.',
        'automatic', 'item_equipped', 3, '{}', 20
    ),

    -- Automatic missions: bathing
    (
        'auto_bathe_once',
        'Baño calentito',
        'Bañá a tu mascota 1 vez.',
        'automatic', 'pet_bathed', 1, '{}', 10
    ),
    (
        'auto_bathe_twice',
        'Siempre impecable',
        'Bañá a tu mascota 2 veces.',
        'automatic', 'pet_bathed', 2, '{}', 15
    ),
    (
        'auto_bathe_three',
        'Spa para mascotas',
        'Bañá a tu mascota 3 veces.',
        'automatic', 'pet_bathed', 3, '{}', 20
    ),

    -- Automatic missions: sleep
    (
        'auto_sleep_1_minute',
        'A descansar',
        'Hacé que tu mascota duerma durante al menos 1 minuto.',
        'automatic', 'pet_slept', 1, '{"minutes": 1}', 10
    ),
    (
        'auto_sleep_5_minutes',
        'Dulces sueños',
        'Hacé que tu mascota duerma durante al menos 5 minutos en total.',
        'automatic', 'pet_slept', 5, '{"minutes": 5}', 15
    ),
    (
        'auto_sleep_10_minutes',
        'Experta en siestas',
        'Hacé que tu mascota duerma durante al menos 10 minutos en total.',
        'automatic', 'pet_slept', 10, '{"minutes": 10}', 20
    ),

    -- Automatic missions: happiness
    (
        'auto_happiness_50',
        'Una mascota contenta',
        'Alcanzá al menos 50 puntos de felicidad.',
        'automatic', 'happiness_reached', 1, '{"happiness": 50}', 10
    ),
    (
        'auto_happiness_75',
        'Pura alegría',
        'Alcanzá al menos 75 puntos de felicidad.',
        'automatic', 'happiness_reached', 1, '{"happiness": 75}', 15
    ),
    (
        'auto_happiness_100',
        'Felicidad total',
        'Alcanzá 100 puntos de felicidad.',
        'automatic', 'happiness_reached', 1, '{"happiness": 100}', 20
    ),

    -- Automatic missions: energy
    (
        'auto_energy_50',
        'Energía renovada',
        'Alcanzá al menos 50 puntos de energía.',
        'automatic', 'energy_reached', 1, '{"energy": 50}', 10
    ),
    (
        'auto_energy_75',
        'A toda pila',
        'Alcanzá al menos 75 puntos de energía.',
        'automatic', 'energy_reached', 1, '{"energy": 75}', 15
    )
ON CONFLICT (code) DO NOTHING;

COMMIT;
