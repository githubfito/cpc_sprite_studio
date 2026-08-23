const cardsPerPlayer = 6;

let deck = [];
const suits = ['Oros', 'Copas', 'Espadas', 'Bastos'];
const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const suitSymbols = { 'Oros': '🟡', 'Copas': '🍷', 'Espadas': '🗡️', 'Bastos': '🪵' };
let currentTurn = null; // Guardará el ID del jugador que tiene el turno actual
let activePlayers = []; // Jugadores que participan en la partida actual

const playerNames = {
    'player-top': 'JugArriba',
    'player-bottom': 'Player',
    'player-left': 'JugLeft',
    'player-right': 'JugRight'
};

// Jerarquía de cartas para el guiñote (la Sota 10 es mayor que el Caballo 11)
const cardHierarchy = { 1: 10, 3: 9, 12: 8, 10: 7, 11: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
let trumpSuit = null; // Palo que pinta
let trumpCardObj = null; // Guardaremos la carta física del triunfo para el último robo
let currentTrick = []; // Cartas echadas a la mesa en la ronda actual
let playerScores = {}; // Puntuación acumulada de cada jugador
let sungSuits = {}; // Qué palos ha cantado ya cada jugador
let isSingingMode = false; // Controla si el jugador está seleccionando carta para cantar
let cheatNextDraw = false; // Truco para forzar la siguiente carta
let tricksWon = {}; // Cuenta las bazas que ha ganado cada jugador

function createDeck(numPlayers) {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            // Si son 3 jugadores, quitamos el 2 de Bastos para que el reparto cuadre matemáticamente (39 cartas)
            if (numPlayers === 3 && suit === 'Bastos' && value === 2) continue;
            deck.push({ suit, value });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Intercambio de posiciones
    }
}

// Actualiza el texto del marcador sobre la baraja con las cartas restantes
function updateDeckCount() {
    const deckCountEl = document.getElementById('deck-count');
    if (deckCountEl) {
        deckCountEl.textContent = deck.length;
        if (deck.length > 0) {
            deckCountEl.style.display = 'flex'; // Lo mostramos si hay cartas
        } else {
            deckCountEl.style.display = 'none'; // Lo ocultamos si el mazo se acaba
        }
    }
}

// Comprueba si un jugador tiene las cartas necesarias para cantar y devuelve un array con los palos válidos
function canSing(playerId) {
    const container = document.getElementById(playerId);
    const cards = container.querySelectorAll(playerId === 'player-bottom' ? '.card-faceup' : '.card-facedown');
    
    let suitsInHand = { 'Oros': [], 'Copas': [], 'Espadas': [], 'Bastos': [] };
    
    cards.forEach(c => {
        const s = c.dataset.suit;
        const v = parseInt(c.dataset.value);
        if (v === 10 || v === 12) { // 10 = Sota, 12 = Rey
            suitsInHand[s].push(v);
        }
    });

    let singable = [];
    for (let s in suitsInHand) {
        // Tiene Sota y Rey, y aún no ha cantado este palo en toda la partida
        if (suitsInHand[s].includes(10) && suitsInHand[s].includes(12) && !sungSuits[playerId].includes(s)) {
            singable.push(s);
        }
    }
    return singable;
}

// Busca una Sota o Rey en el mazo que complete un canto para el jugador
function findCheatCardIndex(playerId) {
    const container = document.getElementById(playerId);
    const cards = container.querySelectorAll(playerId === 'player-bottom' ? '.card-faceup' : '.card-facedown');
    let suitsInHand = { 'Oros': [], 'Copas': [], 'Espadas': [], 'Bastos': [] };
    
    cards.forEach(c => {
        const s = c.dataset.suit;
        const v = parseInt(c.dataset.value);
        if (v === 10 || v === 12) { // 10 = Sota, 12 = Rey
            suitsInHand[s].push(v);
        }
    });

    for (let s in suitsInHand) {
        if (suitsInHand[s].length === 1 && !sungSuits[playerId].includes(s)) {
            let missingValue = suitsInHand[s][0] === 10 ? 12 : 10;
            let idx = deck.findIndex(c => c.suit === s && c.value === missingValue);
            if (idx !== -1) return idx; // Hemos encontrado la carta exacta
        }
    }
    // Si no hay medias parejas, buscar un 10 o 12 cualquiera que quede en el mazo
    return deck.findIndex(c => c.value === 10 || c.value === 12);
}

// Lógica visual y de puntuación al cantar
function showCanto(playerId, suit) {
    sungSuits[playerId].push(suit);
    const points = (suit === trumpSuit) ? 40 : 20;
    playerScores[playerId] += points;
    updateScoreboard(); // Se reflejan los puntos en tiempo real

    const msgEl = document.getElementById('canto-msg');
    msgEl.textContent = `${points === 40 ? '¡Canto las CUARENTA!' : '¡Canto VEINTE!'}`;
    msgEl.className = 'canto-msg canto-' + playerId; // Lo posiciona frente al jugador
    
    msgEl.style.opacity = 1;
    
    // Ocultar el mensaje después de 2 segundos
    setTimeout(() => { 
        msgEl.style.opacity = 0; 
    }, 2000);
}

// Determina si un jugador puede cambiar el triunfo
function canSwapTrump(playerId) {
    if (!trumpCardObj || deck.length === 0) return null; // No hay mazo o ya no hay carta abajo
    if (tricksWon[playerId] === 0 || currentTrick.length !== 0) return null; // Debe liderar la baza y haber ganado alguna

    const container = document.getElementById(playerId);
    const cards = Array.from(container.querySelectorAll(playerId === 'player-bottom' ? '.card-faceup' : '.card-facedown'));

    let neededValue = null;
    if (trumpCardObj.value === 7) {
        neededValue = 6;
    } else if (cardHierarchy[trumpCardObj.value] > cardHierarchy[7]) {
        neededValue = 7;
    } else {
        return null; // La carta boca arriba no es intercambiable por 7 (es menor) ni es el 7
    }

    const cardToSwap = cards.find(c => parseInt(c.dataset.value) === neededValue && c.dataset.suit === trumpSuit);
    return cardToSwap ? { cardEl: cardToSwap, neededValue: neededValue } : null;
}

// Ejecuta el cambio de triunfo visual y lógico
function doSwapTrump(playerId, swapInfo) {
    const cardEl = swapInfo.cardEl;
    const oldTrumpValue = trumpCardObj.value;
    
    // Actualizar el objeto físico
    trumpCardObj.value = swapInfo.neededValue;
    
    // Actualizar la carta de la mesa
    const trumpEl = document.querySelector('.trump-card');
    trumpEl.textContent = trumpCardObj.value + suitSymbols[trumpCardObj.suit];
    trumpEl.title = `${trumpCardObj.value} de ${trumpCardObj.suit}`;
    
    // Actualizar la carta en la mano del jugador
    cardEl.dataset.value = oldTrumpValue;
    if (playerId === 'player-bottom') {
        cardEl.textContent = oldTrumpValue + suitSymbols[trumpCardObj.suit];
    }
    
    // Mostrar mensaje flotante reutilizando el de cantos
    const msgEl = document.getElementById('canto-msg');
    msgEl.textContent = '¡Cambio el triunfo!';
    msgEl.className = 'canto-msg canto-' + playerId;
    msgEl.style.opacity = 1;
    
    setTimeout(() => { 
        msgEl.style.opacity = 0; 
    }, 2000);
}

// Determina qué cartas son legales para jugar según las reglas de arrastre
function getValidCards(playerId) {
    const container = document.getElementById(playerId);
    const cardsElements = Array.from(container.querySelectorAll(playerId === 'player-bottom' ? '.card-faceup' : '.card-facedown'));
    
    // Si hay cartas en el mazo (fase normal), se puede tirar cualquier carta
    if (deck.length > 0 || trumpCardObj !== null) {
        return cardsElements;
    }

    // Si somos los primeros en tirar en la baza, podemos salir con cualquiera
    if (currentTrick.length === 0) {
        return cardsElements;
    }

    const leadingSuit = currentTrick[0].suit;
    
    // Identificar la carta que va ganando actualmente la baza
    let winningPlay = currentTrick[0];
    for (let i = 1; i < currentTrick.length; i++) {
        const play = currentTrick[i];
        if (play.suit === trumpSuit && winningPlay.suit !== trumpSuit) winningPlay = play;
        else if (play.suit === trumpSuit && winningPlay.suit === trumpSuit && cardHierarchy[play.value] > cardHierarchy[winningPlay.value]) winningPlay = play;
        else if (play.suit === leadingSuit && winningPlay.suit !== trumpSuit && cardHierarchy[play.value] > cardHierarchy[winningPlay.value]) winningPlay = play;
    }

    const hand = cardsElements.map(el => ({
        el: el, suit: el.dataset.suit, value: parseInt(el.dataset.value), rank: cardHierarchy[parseInt(el.dataset.value)]
    }));

    const cardsOfLeadSuit = hand.filter(c => c.suit === leadingSuit);
    const cardsOfTrump = hand.filter(c => c.suit === trumpSuit);

    if (cardsOfLeadSuit.length > 0) {
        // OBLIGACIÓN DE ASISTIR Y MONTAR
        if (winningPlay.suit === leadingSuit) {
            const higherLeadCards = cardsOfLeadSuit.filter(c => c.rank > cardHierarchy[winningPlay.value]);
            if (higherLeadCards.length > 0) return higherLeadCards.map(c => c.el); // Tiene para montar
        }
        return cardsOfLeadSuit.map(c => c.el); // Asiste aunque no pueda montar
    } else if (cardsOfTrump.length > 0) {
        // OBLIGACIÓN DE FALLAR
        if (winningPlay.suit === trumpSuit) {
            const higherTrumps = cardsOfTrump.filter(c => c.rank > cardHierarchy[winningPlay.value]);
            if (higherTrumps.length > 0) return higherTrumps.map(c => c.el); // Tiene para pisar (sobre-fallar)
        }
        return cardsOfTrump.map(c => c.el); // Falla aunque no supere
    }

    // Si no tiene el palo de salida ni triunfos, tira lo que quiera
    return cardsElements;
}

// Asigna el turno a un jugador específico y actualiza la interfaz
function setTurn(playerId) {
    currentTurn = playerId;
    isSingingMode = false;
    
    const cantarBtn = document.getElementById('cantar-btn');
    if (cantarBtn) cantarBtn.style.display = 'none';
    
    // Eliminamos la clase del turno activo a todos los jugadores
    const allZones = document.querySelectorAll('.player-zone');
    allZones.forEach(zone => zone.classList.remove('active-turn'));
    
    // Añadimos la clase al jugador al que le toca
    const activeZone = document.getElementById(playerId);
    if (activeZone) {
        activeZone.classList.add('active-turn');
    }

    // Habilitar o deshabilitar clic en tus cartas dependiendo del turno
    const playerCards = document.querySelectorAll('#player-bottom .card-faceup');
    let validPlayerCards = [];
    if (playerId === 'player-bottom') {
        validPlayerCards = getValidCards('player-bottom');
    }
    
    playerCards.forEach(card => {
        card.classList.remove('sing-mode-active');
        if (playerId === 'player-bottom' && validPlayerCards.includes(card)) {
            card.classList.add('playable');
        } else {
            card.classList.remove('playable');
        }
    });

    if (playerId === 'player-bottom') {
        // Solo puedes cantar si te toca jugar primero en la baza (arrastre) y has ganado alguna baza
        if (currentTrick.length === 0 && canSing('player-bottom').length > 0 && tricksWon['player-bottom'] > 0) {
            if (cantarBtn) cantarBtn.style.display = 'block';
        }
    } else {
        setTimeout(playBotTurn, 1000); // 1 segundo de retraso para simular que piensa
    }
}

// Función para que los bots jueguen una carta aleatoria
function playBotTurn() {
    // Doble comprobación de seguridad
    if (currentTurn === 'player-bottom') return;

    // Comprobar si puede cambiar el triunfo primero
    if (currentTrick.length === 0 && tricksWon[currentTurn] > 0) {
        const swapInfo = canSwapTrump(currentTurn);
        if (swapInfo) {
            doSwapTrump(currentTurn, swapInfo);
            setTimeout(botCheckSing, 1500); // Esperar que pase el cartel y comprobar si puede cantar
            return;
        }
    }
    botCheckSing();
}

function botCheckSing() {
    if (currentTurn === 'player-bottom') return;
    if (currentTrick.length === 0 && tricksWon[currentTurn] > 0) {
        const singable = canSing(currentTurn);
        if (singable.length > 0) {
            showCanto(currentTurn, singable[0]);
            setTimeout(doBotPlayAction, 1500); // Espera un poco a que se lea el cartel antes de tirar carta
            return;
        }
    }
    doBotPlayAction();
}

// Función auxiliar para que los bots jueguen su carta tras pensar/cantar
function doBotPlayAction() {
    if (currentTurn === 'player-bottom') return;
    
    const validCardsElements = getValidCards(currentTurn);
    
    if (validCardsElements.length > 0) {
        // Seleccionar una carta aleatoria de su mano
        const randomIndex = Math.floor(Math.random() * validCardsElements.length);
        const cardToPlay = validCardsElements[randomIndex];
        
        // Revelar la carta (cambiar de boca abajo a boca arriba)
        cardToPlay.className = 'card-faceup';
        cardToPlay.textContent = cardToPlay.dataset.value + suitSymbols[cardToPlay.dataset.suit];
        
        executePlay(cardToPlay, currentTurn);
    }
}

// Función que se ejecuta al hacer click en tu carta
function playCard(cardElement) {
    if (currentTurn !== 'player-bottom') return;

    if (isSingingMode) {
        const s = cardElement.dataset.suit;
        const v = parseInt(cardElement.dataset.value);
        const singable = canSing('player-bottom');
        
        // Comprobar que hacemos click en una Sota (10) o Rey (12) de un palo cantable
        if (singable.includes(s) && (v === 10 || v === 12)) {
            showCanto('player-bottom', s);
            isSingingMode = false;
            
            // Quitamos el resplandor a las cartas
            document.querySelectorAll('#player-bottom .card-faceup').forEach(c => c.classList.remove('sing-mode-active'));
        }
        return; // Retornamos para que no se tire la carta, el turno sigue siendo tuyo
    }

    // Si se juega carta normalmente, desactivamos el modo cantar por si estaba el botón
    const cantarBtn = document.getElementById('cantar-btn');
    if (cantarBtn) cantarBtn.style.display = 'none';
    
    if (!cardElement.classList.contains('playable')) {
        if (deck.length === 0 && trumpCardObj === null && currentTrick.length > 0) {
            alert("Fase de arrastre: Estás obligado a asistir (y montar si puedes) o fallar con triunfo.");
        }
        return;
    }
    
    executePlay(cardElement, 'player-bottom');
}

// Procesa la jugada, la añade a la mesa y evalúa la ronda si todos han jugado
function executePlay(cardElement, playerId) {
    cardElement.classList.remove('playable');
    cardElement.classList.add('played-' + playerId); // Posiciona la carta enfrente del jugador
    document.getElementById('play-area').appendChild(cardElement); // Mueve la carta a la mesa

    // Guardamos la carta jugada para saber quién gana luego
    currentTrick.push({
        player: playerId,
        suit: cardElement.dataset.suit,
        value: parseInt(cardElement.dataset.value)
    });

    // Si todos han jugado, evaluamos la baza
    if (currentTrick.length === activePlayers.length) {
        currentTurn = null; // Detenemos los turnos temporalmente
        setTimeout(evaluateTrick, 1000); // 1 segundo de pausa para ver la última carta que se echó
    } else {
        // Pasa el turno al siguiente jugador
        const nextTurnIndex = (activePlayers.indexOf(playerId) + 1) % activePlayers.length;
        setTurn(activePlayers[nextTurnIndex]);
    }
}

// Evalúa qué carta gana la mano
function evaluateTrick() {
    const leadingSuit = currentTrick[0].suit; // Palo del que se salió primero (Arrastre)
    let winningPlay = currentTrick[0];

    for (let i = 1; i < currentTrick.length; i++) {
        const play = currentTrick[i];
        const isTrump = play.suit === trumpSuit;
        const winningIsTrump = winningPlay.suit === trumpSuit;
        const isLeading = play.suit === leadingSuit;
        
        const playRank = cardHierarchy[play.value];
        const winningRank = cardHierarchy[winningPlay.value];

        // Comprobación estricta de reglas para ganar
        if (isTrump && !winningIsTrump) {
            winningPlay = play; // Tirar triunfo gana al arrastre
        } else if (isTrump && winningIsTrump) {
            if (playRank > winningRank) winningPlay = play; // Gana el triunfo más alto
        } else if (isLeading && !winningIsTrump) {
            if (playRank > winningRank) winningPlay = play; // Gana la carta de arrastre más alta
        }
    }

    // Calcular los puntos que vale la baza (la Sota 10 vale 3, el Caballo 11 vale 2)
    const cardPoints = { 1: 11, 3: 10, 12: 4, 10: 3, 11: 2 };
    let points = currentTrick.reduce((acc, play) => acc + (cardPoints[play.value] || 0), 0);

    // Comprobar si es la última baza (si ya no quedan cartas en la mesa de los jugadores)
    const cardsLeft = document.querySelectorAll('.player-zone .card-faceup, .player-zone .card-facedown').length;
    const isGameOver = (cardsLeft === 0);

    if (isGameOver) {
        points += 10; // Las 10 de últimas
    }

    // Mostrar el cartel brillante con el ganador de la mano
    const winnerBanner = document.getElementById('winner-banner');
    winnerBanner.innerHTML = `¡Gana la baza ${playerNames[winningPlay.player]}!<br><span style="font-size: 16px;">(Haz click en la pantalla para continuar)</span>`;
    winnerBanner.style.display = 'block';
    
    // Crear una capa invisible que cubra toda la pantalla para capturar el click
    const clickOverlay = document.createElement('div');
    clickOverlay.style.position = 'fixed';
    clickOverlay.style.top = '0';
    clickOverlay.style.left = '0';
    clickOverlay.style.width = '100vw';
    clickOverlay.style.height = '100vh';
    clickOverlay.style.zIndex = '9999';
    document.body.appendChild(clickOverlay);

    // Al hacer click en cualquier parte, continuamos el juego
    clickOverlay.onclick = function() {
        winnerBanner.style.display = 'none';
        document.body.removeChild(clickOverlay);
        
        playerScores[winningPlay.player] += points; // Sumamos los puntos al ganador
        tricksWon[winningPlay.player] += 1; // Sumamos la baza ganada al contador
        
        // Mostrar montón de bazas ganadas para este jugador
        const wonPile = document.getElementById('won-' + winningPlay.player);
        if (wonPile) wonPile.style.display = 'block';

        // Actualizar panel de puntos (si es la última baza pintará los colores)
        updateScoreboard(winningPlay.player, isGameOver);
        
        if (isGameOver) {
            showGameWinner();
        } else {
            endTrick(winningPlay.player);
        }
    };
}

// Muestra el ganador final de la partida al acabar todas las cartas
function showGameWinner() {
    // Buscar el jugador con más puntos
    let winner = activePlayers.reduce((a, b) => playerScores[a] > playerScores[b] ? a : b);
    
    const banner = document.getElementById('winner-banner');
    banner.innerHTML = `¡FIN DE LA PARTIDA!<br>Gana ${playerNames[winner]} con ${playerScores[winner]} puntos<br><span style="font-size:16px">Haz click en "Comenzar partida" para jugar de nuevo</span>`;
    banner.style.display = 'block';
    banner.style.cursor = 'default';
    banner.onclick = null; // Desactiva el clic en el cartel, forzando a usar el botón
}

// Actualiza el panel lateral de puntuaciones en tiempo real
function updateScoreboard(lastTrickWinner = null, isGameOver = false) {
    // Ocultamos todos los marcadores primero por si hay menos de 4 jugadores
    document.querySelectorAll('.player-score').forEach(el => el.style.display = 'none');

    activePlayers.forEach(playerId => {
        const scoreEl = document.getElementById('score-' + playerId);
        if (!scoreEl) return;

        let colorClass = '';
        if (isGameOver) {
            colorClass = (playerId === lastTrickWinner) ? 'score-yellow' : 'score-green';
        }
        scoreEl.innerHTML = `${playerNames[playerId]}: <span class="${colorClass}">${playerScores[playerId]}</span>`;
        scoreEl.style.display = 'block';
    });
}

// Limpia el tapete central e inicia un nuevo turno
function endTrick(winnerId) {
    document.getElementById('play-area').innerHTML = ''; // Limpiamos las cartas de la mesa
    document.getElementById('winner-banner').style.display = 'none'; // Ocultamos el cartel
    currentTrick = []; // Vaciamos la lista de la baza actual
    
    // Robar nueva carta del mazo (si quedan)
    drawCards(winnerId);

    setTurn(winnerId); // Le pasamos el primer turno de la baza a quien acaba de ganar
}

// Reparte una carta nueva a cada jugador desde el mazo tras cada baza
function drawCards(winnerId) {
    // El orden de robo empieza por el ganador y va hacia la derecha
    const winnerIndex = activePlayers.indexOf(winnerId);
    const drawOrder = [];
    for (let i = 0; i < activePlayers.length; i++) {
        drawOrder.push(activePlayers[(winnerIndex + i) % activePlayers.length]);
    }

    drawOrder.forEach(playerId => {
        let cardToDraw = null;

        if (deck.length > 0) {
            if (playerId === 'player-bottom' && cheatNextDraw) {
                let cheatIdx = findCheatCardIndex('player-bottom');
                if (cheatIdx !== -1) {
                    cardToDraw = deck.splice(cheatIdx, 1)[0]; // Saca la carta trampa del mazo
                } else {
                    cardToDraw = deck.pop(); // Si no hay cartas posibles, roba normal
                }
                cheatNextDraw = false; // Desactivar truco
            } else {
                cardToDraw = deck.pop(); // Roba del mazo normal
            }
        } else if (trumpCardObj !== null) {
            cardToDraw = trumpCardObj; // Si no hay mazo, roba el triunfo
            trumpCardObj = null;
            // Ocultar la carta de triunfo visual y el mazo de la mesa
            document.querySelector('.trump-card').style.display = 'none';
            document.querySelector('.deck').style.display = 'none';
        }

        if (cardToDraw) {
            // Buscamos un hueco vacío en la zona de este jugador
            const container = document.getElementById(playerId);
            const emptySlot = Array.from(container.querySelectorAll('.card-slot')).find(slot => slot.children.length === 0);

            if (emptySlot) {
                if (playerId === 'player-bottom') {
                    // Carta boca arriba para el jugador
                    const cardFaceup = document.createElement('div');
                    cardFaceup.className = 'card-faceup';
                    cardFaceup.dataset.suit = cardToDraw.suit;
                    cardFaceup.dataset.value = cardToDraw.value;
                    cardFaceup.textContent = cardToDraw.value + suitSymbols[cardToDraw.suit];
                    cardFaceup.addEventListener('click', function() {
                        playCard(this);
                    });
                    emptySlot.appendChild(cardFaceup);
                } else {
                    // Carta boca abajo para los rivales
                    const cardFacedown = document.createElement('div');
                    cardFacedown.className = 'card-facedown';
                    cardFacedown.dataset.suit = cardToDraw.suit;
                    cardFacedown.dataset.value = cardToDraw.value;
                    emptySlot.appendChild(cardFacedown);
                }
            }
        }
    });

    updateDeckCount();
}

function initEmptySlots() {
    const allZones = ['player-top', 'player-bottom', 'player-left', 'player-right'];
    allZones.forEach(zoneId => {
        const container = document.getElementById(zoneId);
        container.innerHTML = ''; // Limpiamos la zona de cartas previas
        container.classList.remove('active-turn'); // Quitamos turnos anteriores si los hay
        
        for (let i = 0; i < cardsPerPlayer; i++) {
            const slot = document.createElement('div');
            slot.className = 'card-slot';
            container.appendChild(slot);
        }
    });

    // Limpiar también las cartas jugadas en el tapete central
    document.getElementById('play-area').innerHTML = '';
}

function startGame() {
    let numPlayers = prompt("¿Cuántos jugadores van a jugar? (2 a 4)", "4");
    numPlayers = parseInt(numPlayers);

    if (isNaN(numPlayers) || numPlayers < 2 || numPlayers > 4) {
        alert("Por favor, introduce un número válido entre 2 y 4.");
        return;
    }

    // Inicializamos la baraja, la mezclamos y limpiamos el tapete
    createDeck(numPlayers);
    shuffleDeck();
    initEmptySlots();

    // Asignamos las posiciones según el número de jugadores (turnos hacia la derecha / antihorario)
    if (numPlayers === 2) {
        activePlayers = ['player-bottom', 'player-top'];
    } else if (numPlayers === 3) {
        activePlayers = ['player-bottom', 'player-right', 'player-top'];
    } else {
        activePlayers = ['player-bottom', 'player-right', 'player-top', 'player-left'];
    }

    // Ocultar los montones de cartas de bazas ganadas al comenzar
    document.querySelectorAll('.won-tricks').forEach(pile => pile.style.display = 'none');

    // Reiniciamos las puntuaciones para la nueva partida
    activePlayers.forEach(p => {
        playerScores[p] = 0;
        tricksWon[p] = 0; // Reiniciamos bazas ganadas
        sungSuits[p] = []; // Vaciamos los registros de cantos de anteriores partidas
    });
    updateScoreboard();

    // Repartir 6 cartas a cada jugador boca abajo
    activePlayers.forEach(zoneId => {
        const container = document.getElementById(zoneId);
        const slots = container.querySelectorAll('.card-slot');
        
        slots.forEach(slot => {
            const card = deck.pop(); // Sacar la última carta de la baraja mezclada
            
            if (zoneId === 'player-bottom') {
                // Si es el jugador local (abajo), la mostramos boca arriba
                const cardFaceup = document.createElement('div');
                cardFaceup.className = 'card-faceup';
                cardFaceup.dataset.suit = card.suit;
                cardFaceup.dataset.value = card.value;
                cardFaceup.textContent = card.value + suitSymbols[card.suit];
                
                // Añadimos el evento para poder jugar la carta
                cardFaceup.addEventListener('click', function() {
                    playCard(this);
                });
                
                slot.appendChild(cardFaceup);
            } else {
                // Para el resto de jugadores, las cartas van boca abajo
                const cardFacedown = document.createElement('div');
                cardFacedown.className = 'card-facedown';
                cardFacedown.dataset.suit = card.suit;
                cardFacedown.dataset.value = card.value;
                slot.appendChild(cardFacedown);
            }
        });
    });

    // Sacar la carta del triunfo (la pinta) y actualizar su apariencia visual
    const trumpCard = deck.pop();
    const trumpEl = document.querySelector('.trump-card');
    trumpCardObj = trumpCard; // Guardamos el objeto para cuando toque robarla
    
    // Asegurarnos de que el mazo y el triunfo son visibles (por si se ocultaron en la partida anterior)
    trumpEl.style.display = '';
    document.querySelector('.deck').style.display = '';
    
    trumpSuit = trumpCard.suit; // Guardamos el palo de triunfo para poder evaluar luego
    currentTrick = []; // Nos aseguramos de empezar con la baza limpia
    document.getElementById('winner-banner').style.display = 'none'; // Ocultamos el cartel en la nueva partida

    trumpEl.textContent = trumpCard.value + suitSymbols[trumpCard.suit];
    trumpEl.title = `${trumpCard.value} de ${trumpCard.suit}`;
    trumpEl.style.fontSize = '20px'; // Ajustamos la fuente para que el texto encaje

    // Actualizamos y mostramos el indicador de triunfo tipo botón
    const trumpReminder = document.getElementById('trump-reminder');
    const trumpIcon = document.getElementById('trump-icon');
    if (trumpReminder && trumpIcon) {
        trumpIcon.textContent = suitSymbols[trumpCard.suit];
        trumpReminder.style.display = 'block';
    }

    // Actualizamos el contador visual de cartas restantes
    updateDeckCount();

    // Al comenzar la partida, le damos la mano (el primer turno) al jugador
    setTurn('player-bottom');
}

document.addEventListener('DOMContentLoaded', () => {
    initEmptySlots(); // Prepara la mesa vacía al principio
    
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    const cantarBtn = document.getElementById('cantar-btn');
    if (cantarBtn) {
        cantarBtn.addEventListener('click', () => {
            isSingingMode = true;
            cantarBtn.style.display = 'none'; // Ocultamos el botón
            
            // Iluminamos de morado las Sotas y Reyes de la mano que forman parejas válidas
            const singable = canSing('player-bottom');
            const cards = document.querySelectorAll('#player-bottom .card-faceup');
            cards.forEach(c => {
                const s = c.dataset.suit;
                const v = parseInt(c.dataset.value);
                if (singable.includes(s) && (v === 10 || v === 12)) {
                    c.classList.add('sing-mode-active');
                }
            });
        });
    }

    const cheatBtn = document.getElementById('cheat-btn');
    if (cheatBtn) {
        cheatBtn.addEventListener('click', () => {
            alert("truco");
            cheatNextDraw = true;
        });
    }

    const trumpEl = document.querySelector('.trump-card');
    if (trumpEl) {
        trumpEl.addEventListener('click', () => {
            if (currentTurn === 'player-bottom') {
                const swapInfo = canSwapTrump('player-bottom');
                if (swapInfo) {
                    doSwapTrump('player-bottom', swapInfo);
                }
            }
        });
    }
});
