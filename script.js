// script.js
let ws = null;
let currentRoom = null;
let isRoomOwner = false;
let gameState = {
    participants: [],
    raceDistance: 500,
    gameType: 'patinho'
};
let raceAnimation = null;
let ducks = [];

// Conectar ao WebSocket
function connectWebSocket() {
    // Altere a URL para o seu servidor WebSocket
    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = function() {
        console.log('Conectado ao servidor');
        updateConnectionStatus(true);
    };
    
    ws.onmessage = function(event) {
        handleServerMessage(JSON.parse(event.data));
    };
    
    ws.onclose = function() {
        console.log('Desconectado do servidor');
        updateConnectionStatus(false);
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = function(error) {
        console.error('Erro no WebSocket:', error);
        updateConnectionStatus(false);
    };
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.textContent = 'Conectado ao servidor';
        statusEl.className = 'connection-status connected';
    } else {
        statusEl.textContent = 'Desconectado do servidor - Tentando reconectar...';
        statusEl.className = 'connection-status disconnected';
    }
}

// Enviar mensagem para o servidor
function sendMessage(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...data }));
    } else {
        alert('Não conectado ao servidor. Tente novamente.');
    }
}

// Lidar com mensagens do servidor
function handleServerMessage(data) {
    switch (data.type) {
        case 'roomCreated':
            currentRoom = data.roomCode;
            isRoomOwner = true;
            document.getElementById('roomCodeDisplay').textContent = data.roomCode;
            showGameScreen();
            break;
            
        case 'roomJoined':
            currentRoom = data.roomCode;
            isRoomOwner = false;
            gameState = data.gameState;
            document.getElementById('roomCodeDisplay').textContent = data.roomCode;
            showGameScreen();
            updateGameDisplay();
            break;
            
        case 'playerJoined':
            console.log('joined', data);
            alert(`${data.playerName} entrou na sala!`);
            break;
            
        case 'raceStarted':
            startRaceAnimation(data.participants, data.raceDistance);
            break;
            
        case 'error':
            alert('Erro: ' + data.message);
            break;
    }
}

// Mostrar tela específica
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Configuração do jogo
function showGameConfig() {
    const gameType = document.getElementById('gameSelect').value;
    
    // Esconder todas as configurações
    document.getElementById('patinhoConfig').style.display = 'none';
    document.getElementById('morangninhoConfig').style.display = 'none';
    
    // Mostrar configuração específica
    if (gameType === 'patinho') {
        document.getElementById('patinhoConfig').style.display = 'block';
    } else if (gameType === 'moranguinho') {
        document.getElementById('morangninhoConfig').style.display = 'block';
    }
}

// Adicionar participante
function addParticipant() {
    const participantsList = document.getElementById('participantsList');
    
    // Remover o botão "+" do input anterior
    const lastInput = participantsList.lastElementChild;
    const addBtn = lastInput.querySelector('.add-btn');
    if (addBtn) {
        addBtn.remove();
    }
    
    // Criar novo input com botão "+"
    const newInput = document.createElement('div');
    newInput.className = 'participant-input';
    newInput.innerHTML = `
        <input type="text" placeholder="🏁 Nome do piloto" maxlength="15">
        <button class="add-btn" onclick="addParticipant()">+</button>
    `;
    participantsList.appendChild(newInput);
}

// Criar sala
function createRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        alert('Por favor, digite seu nome!');
        return;
    }
    
    showScreen('configScreen');
}

// Iniciar sala do jogo
function startGameRoom() {
    const gameType = document.getElementById('gameSelect').value;
    if (!gameType) {
        alert('Selecione um minigame!');
        return;
    }
    
    if (gameType === 'patinho') {
        const raceDistance = parseInt(document.getElementById('raceDistance').value);
        const participantInputs = document.querySelectorAll('#participantsList input');
        const participants = [];
        
        participantInputs.forEach(input => {
            if (input.value.trim()) {
                participants.push(input.value.trim());
            }
        });
        
        if (participants.length < 2) {
            alert('Adicione pelo menos 2 participantes!');
            return;
        }
        
        gameState = {
            participants: participants,
            raceDistance: raceDistance,
            gameType: 'patinho'
        };
        
        const playerName = document.getElementById('playerName').value.trim();
        sendMessage('createRoom', {
            playerName: playerName,
            gameState: gameState
        });
    }
    if (gameType === 'moranguinho') {
        const raceDistance = parseInt(document.getElementById('raceDistance2').value);
        console.log(raceDistance);
        const playerName = document.getElementById('playerName').value.trim();
        const participants = [playerName];
        
        gameState = {
            participants: participants,
            raceDistance: raceDistance,
            gameType: 'moranguinho'
        };
        
        sendMessage('createRoom', {
            playerName: playerName,
            gameState: gameState
        });
    }
}

// Mostrar popup para entrar na sala
function showJoinPopup() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        alert('Por favor, digite seu nome!');
        return;
    }
    
    document.getElementById('joinPopup').classList.add('active');
}

function hideJoinPopup() {
    document.getElementById('joinPopup').classList.remove('active');
    document.getElementById('roomCodeInput').value = '';
}

// Mostrar popup de resultado
function showResultPopup(winnerName, finalPositions) {
    document.getElementById('winnerName').textContent = `${winnerName} venceu!`;
    
    // Criar placar de classificação
    const rankingList = document.getElementById('rankingList');
    rankingList.innerHTML = '';
    
    finalPositions.forEach((participant, index) => {
        const position = index + 1;
        const rankingItem = document.createElement('div');
        rankingItem.className = 'ranking-item';
        
        // Adicionar classes especiais para os 3 primeiros
        if (position === 1) rankingItem.classList.add('first');
        else if (position === 2) rankingItem.classList.add('second');
        else if (position === 3) rankingItem.classList.add('third');
        
        // Emoji para as posições
        let positionEmoji = '';
        if (position === 1) positionEmoji = '🥇';
        else if (position === 2) positionEmoji = '🥈';
        else if (position === 3) positionEmoji = '🥉';
        else positionEmoji = `${position}º`;
        
        rankingItem.innerHTML = `
            <div class="position-number ${position <= 3 ? ['first', 'second', 'third'][position-1] : ''}">${positionEmoji}</div>
            <div class="participant-name">${participant.name}</div>
        `;
        
        rankingList.appendChild(rankingItem);
    });
    
    document.getElementById('resultPopup').classList.add('active');
}

function hideResultPopup() {
    document.getElementById('resultPopup').classList.remove('active');
}

// Entrar na sala
function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!roomCode || roomCode.length !== 6) {
        alert('Digite um código válido de 6 caracteres!');
        return;
    }
    
    sendMessage('joinRoom', {
        roomCode: roomCode,
        playerName: playerName
    });
    
    hideJoinPopup();
}

// Mostrar tela do jogo
function showGameScreen() {
    showScreen('gameScreen');
    updateGameDisplay();
    document.getElementById('liveRanking').style.display = 'block';
    createDucks(gameState.participants);
    
    // Mostrar botão de iniciar apenas para o criador da sala
    if (isRoomOwner) {
        document.getElementById('startRaceBtn').style.display = 'inline-block';
    }
}

// Atualizar display do jogo
function updateGameDisplay() {
    // Converter distância para texto amigável
    const distanceNames = {
        50: '50 metros',
        100: '100 metros', 
        150: '150 metros', 
        200: '200 metros', 
        250: '250 metros', 
        300: '300 metros', 
        400: '400 metros', 
        500: '500 metros',
        750: '750 metros',
        1000: '1 km',
        2000: '2 km'
    };
    
    document.getElementById('raceDistanceDisplay').textContent = distanceNames[gameState.raceDistance] || 'DESCUBRA';
    document.getElementById('participantsDisplay').textContent = gameState.participants.join(', ');
}

// Iniciar corrida
function startRace() {
    if (!isRoomOwner) return;
    sendMessage('startRace', {
        roomCode: currentRoom,
        participants: gameState.participants,
        raceDistance: gameState.raceDistance
    });    
}

// Animação da corrida
function startRaceAnimation(participants, raceDistance) {
    document.getElementById('startRaceBtn').style.display = 'none';
    document.getElementById('liveRanking').style.display = 'block';
    
    // Countdown
    showCountdown(() => {
        
        animateRace(raceDistance);
    });
}

function showCountdown(callback) {
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.display = 'block';
    
    let count = 3;
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            countdownEl.innerHTML = `<div class="countdown">${count}</div>`;
            count--;
        } else {
            countdownEl.innerHTML = '<div class="countdown">VAI!</div>';
            setTimeout(() => {
                countdownEl.style.display = 'none';
                callback();
            }, 1000);
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function createDucks(participants) {
    const track = document.getElementById('raceTrack');
    const trackHeight = track.offsetHeight;
    const laneHeight = trackHeight / participants.length;
    
    // Margem de segurança para evitar que saia da pista
    const topMargin = 30; // Margem superior
    const bottomMargin = 30; // Margem inferior
    const usableHeight = trackHeight - topMargin - bottomMargin;
    const adjustedLaneHeight = usableHeight / participants.length;
    
    // Lista de emojis aleatórios para os participantes
    const availableEmojis = ['🦆', '🐸', '🐢', '🐰', '🐱', '🐶', '🐺', '🦊', '🐹', '🐭', '🐨', '🐼', '🦁', '🐯', '🐷', '🐮', '🐙', '🐠', '🐟', '🦈', '🐳', '🐬', '🐊', '🦎', '🐍', '🐧', '🦅', '🦆', '🐥', '🐤', '🐣', '🐝', '🐛', '🦋', '🐌', '🐒', '🦍', '🐘', '🦏', '🦒', '🐫', '🐪', '🐎', '🦓', '🐄', '🐂', '🐃', '🦌', '🐖', '🐏', '🐑', '🐐', '🦙', '🦘', '🐿️', '🦔', '🦇', '🐻', '🐨', '🐼'];
    
    // Cores de fundo aleatórias
    const availableColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#0ABDE3', '#10AC84', '#EE5A24', '#9C88FF', '#FFC312', '#C4E538', '#12CBC4', '#FDA7DF', '#ED4C67', '#F79F1F', '#A3CB38', '#1289A7', '#D63031', '#74B9FF', '#00B894', '#FDCB6E', '#6C5CE7', '#FD79A8', '#E17055', '#81ECEC', '#00CEC9', '#55A3FF', '#FF7675', '#DDA0DD', '#98FB98', '#F0E68C', '#FFB347', '#87CEEB', '#DEB887', '#F5DEB3'];
    
    // Limpar patinhos anteriores
    ducks.forEach(duck => duck.element.remove());
    ducks = [];
    
    participants.forEach((name, index) => {
        // Escolher emoji e cor aleatórios
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        
        const duck = document.createElement('div');
        duck.className = 'duck';
        // Posição Y ajustada com margens de segurança
        duck.style.top = (topMargin + index * adjustedLaneHeight + adjustedLaneHeight / 2 - 25) + 'px';
        duck.style.left = '15px'; // Todos começam na posição inicial
        duck.style.backgroundColor = randomColor; // Cor de fundo aleatória
        duck.innerHTML = `<div class="duck-name">${name}</div>`;
        
        // Remover o emoji padrão do CSS e adicionar o emoji aleatório
        duck.style.fontSize = '28px';
        duck.style.display = 'flex';
        duck.style.alignItems = 'center';
        duck.style.justifyContent = 'center';
        duck.textContent = randomEmoji; // Emoji aleatório
        
        // Adicionar o nome como elemento separado na lateral esquerda
        const nameElement = document.createElement('div');
        nameElement.className = 'duck-name';
        nameElement.textContent = name;
        nameElement.style.position = 'absolute';
        nameElement.style.top = '50%';
        nameElement.style.left = '-90px'; // Posiciona mais próximo do emoji
        nameElement.style.transform = 'translateY(-50%)'; // Centraliza verticalmente
        nameElement.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.7))';
        nameElement.style.color = '#4099ff';
        nameElement.style.padding = '8px 15px';
        nameElement.style.borderRadius = '12px';
        nameElement.style.fontSize = '13px';
        nameElement.style.whiteSpace = 'nowrap';
        nameElement.style.fontWeight = '600';
        nameElement.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
        nameElement.style.backdropFilter = 'blur(15px)';
        nameElement.style.border = '1px solid rgba(64, 153, 255, 0.3)';
        nameElement.style.textShadow = '0 0 10px rgba(64, 153, 255, 0.8)';
        nameElement.style.textAlign = 'center';
        nameElement.style.minWidth = '80px';
        
        duck.appendChild(nameElement);
        track.appendChild(duck);
        
        ducks.push({
            element: duck,
            name: name,
            position: 15,
            targetPosition: track.offsetWidth - 80,
            finished: false,
            emoji: randomEmoji,
            color: randomColor
        });
        
        console.log(`🎨 ${name}: ${randomEmoji} (cor: ${randomColor})`);
    });
}

function updateLiveRanking(duckData, raceFinished = false) {
    const rankingList = document.getElementById('liveRankingList');
    const raceStatus = document.getElementById('raceStatus');
    
    let sortedDucks;
    
    if (raceFinished) {
        // Quando a corrida termina, ordenar por ordem de chegada (finishOrder)
        console.log('Corrida finalizada - ordenando por finishOrder');
        sortedDucks = [...duckData].sort((a, b) => {
            if (a.finishOrder && b.finishOrder) {
                return a.finishOrder - b.finishOrder;
            }
            if (a.finished && b.finished) {
                return a.finishTime - b.finishTime;
            }
            return 0;
        });
        
        console.log('Ordem final:', sortedDucks.map(d => `${d.name} (${d.finishOrder}º)`));
    } else {
        // Durante a corrida, ordenar SEMPRE por distância percorrida (posição atual)
        sortedDucks = [...duckData].sort((a, b) => {
            // Quem já terminou mantém sua posição final
            if (a.finished && b.finished) {
                return a.finishOrder - b.finishOrder;
            }
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            
            // Ambos ainda correndo: ordenar por distância percorrida (quem está mais à frente)
            return b.distanceMeters - a.distanceMeters;
        });
    }
    
    rankingList.innerHTML = '';
    
    sortedDucks.forEach((duck, index) => {
        const position = index + 1;
        const rankingItem = document.createElement('div');
        rankingItem.className = 'live-ranking-item';
        
        // Adicionar classes especiais
        if (duck.finished) {
            rankingItem.classList.add('finished');
            if (position === 1) rankingItem.classList.add('first-place');
            else if (position === 2) rankingItem.classList.add('second-place');
            else if (position === 3) rankingItem.classList.add('third-place');
        }
        
        // Emoji para as posições dos que terminaram
        let positionDisplay = `${position}º`;
        if (duck.finished) {
            if (position === 1) positionDisplay = '🥇';
            else if (position === 2) positionDisplay = '🥈';
            else if (position === 3) positionDisplay = '🥉';
        }
        
        // Status mais detalhado durante a corrida
        let statusText;
        if (duck.finished) {
            statusText = `${duck.finishTime/1000}s`;
        } else {
            statusText = `${duck.distanceMeters.toFixed(1)}m`;
        }
        
        rankingItem.innerHTML = `
            <div class="live-position">${positionDisplay}</div>
            <div class="live-name">${duck.name}</div>
            <div class="finish-status">${statusText}</div>
        `;
        
        rankingList.appendChild(rankingItem);
    });
    
    // Atualizar status da corrida
    const finishedCount = duckData.filter(duck => duck.finished).length;
    const totalCount = duckData.length;
    
    if (raceFinished) {
        raceStatus.innerHTML = '🏁 Corrida Finalizada!';
        raceStatus.style.background = '#d4edda';
        raceStatus.style.color = '#155724';
    } else if (finishedCount > 0) {
        raceStatus.innerHTML = `${finishedCount}/${totalCount} participantes chegaram`;
        raceStatus.style.background = '#fff3cd';
        raceStatus.style.color = '#856404';
    } else {
        raceStatus.innerHTML = 'Corrida em andamento...';
        raceStatus.style.background = '#cce5ff';
        raceStatus.style.color = '#004085';
    }
}

function animateRace(raceDistance) {
    const startTime = Date.now();
    
    console.log(`🏁 Corrida iniciada - Distancia: ${raceDistance})`);
    
    // Distâncias em metros
    const RACE_DISTANCE = raceDistance;
    const TRACK_WIDTH = ducks[0].targetPosition - 10; // Largura visual da pista
    
    // Inicializar dados para cada patinho - velocidades completamente dinâmicas
    const duckData = ducks.map((duck, index) => ({
        element: duck.element,
        name: duck.name,
        distanceMeters: 0, // Todos começam no metro 0
        visualPosition: 10, // Posição visual na tela
        targetVisualPosition: duck.targetPosition,
        finished: false,
        finishTime: null,
        finishOrder: null,
        currentSpeedMPS: (3.0 + Math.random() * 4.0), // Velocidade inicial 3-7 m/s
        speedPhase: Math.random() * Math.PI * 2,
        lastSpeedChange: startTime // Última vez que a velocidade mudou
    }));
    
    let finishedCount = 0;
    let lastUpdateTime = startTime;
    
    function updateRace() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const deltaTime = (currentTime - lastUpdateTime) / 1000; // Delta em segundos
        lastUpdateTime = currentTime;
        
        // Verificar se há patinhos ainda correndo
        const stillRunning = duckData.filter(duck => !duck.finished);
        
        if (stillRunning.length === 0) {
            // Todos terminaram
            console.log('🏁 Corrida finalizada! Todos cruzaram a linha de chegada.');
            updateLiveRanking(duckData, true);
            setTimeout(() => {
                if (isRoomOwner) {
                    document.getElementById('startRaceBtn').style.display = 'inline-block';
                }
            }, 2000);
            return;
        }
        
        // Atualizar posição de cada patinho que ainda está correndo
        stillRunning.forEach((duck) => {
            // Mudar velocidade a cada 500ms (meio segundo)
            if (currentTime - duck.lastSpeedChange >= 300) {
                // Nova velocidade completamente aleatória entre 3.0 e 7.0 m/s
                duck.currentSpeedMPS = (3.0 + Math.random() * 4.0);
                duck.lastSpeedChange = currentTime;
            }
            
            // Usar a velocidade atual (que muda a cada 0.5s)
            const currentSpeedMPS = duck.currentSpeedMPS;
            
            // Calcular distância percorrida neste frame (em metros)
            const distanceMoved = currentSpeedMPS * deltaTime;
            duck.distanceMeters += distanceMoved;
            
            // Converter metros para posição visual na tela
            const progressPercent = Math.min(duck.distanceMeters / RACE_DISTANCE, 1.0);
            duck.visualPosition = 10 + (progressPercent * TRACK_WIDTH);
            
            // Verificar se cruzou a linha de chegada (distância configurável)
            if (duck.distanceMeters >= RACE_DISTANCE) {
                duck.finished = true;
                duck.finishTime = elapsed;
                finishedCount++;
                duck.finishOrder = finishedCount; // Ordem real de chegada
                duck.distanceMeters = RACE_DISTANCE; // Fixar exatamente nos 100m
                duck.visualPosition = duck.targetVisualPosition;
                
                // Log da chegada REAL
                if (finishedCount === 1) {
                    console.log(`🥇 ${duck.name} VENCEU! Primeiro lugar em ${(elapsed/1000).toFixed(1)}s`);
                } else if (finishedCount === 2) {
                    console.log(`🥈 ${duck.name} chegou em 2º lugar em ${(elapsed/1000).toFixed(1)}s`);
                } else if (finishedCount === 3) {
                    console.log(`🥉 ${duck.name} chegou em 3º lugar em ${(elapsed/1000).toFixed(1)}s`);
                } else {
                    console.log(`${duck.name} chegou em ${finishedCount}º lugar em ${(elapsed/1000).toFixed(1)}s`);
                }
            }
            
            // Atualizar posição visual
            duck.element.style.left = duck.visualPosition + 'px';
        });
        
        // Atualizar placar em tempo real
        updateLiveRanking(duckData, false);
        
        // Continuar corrida
        requestAnimationFrame(updateRace);
    }
    
    // Inicializar placar
    updateLiveRanking(duckData, false);
    
    // Iniciar corrida
    updateRace();
}

// Sair da sala
function leaveRoom() {
    if (currentRoom) {
        sendMessage('leaveRoom', { roomCode: currentRoom });
    }
    
    currentRoom = null;
    isRoomOwner = false;
    gameState = { participants: [], raceDistance: 500, gameType: 'patinho' };
    
    // Limpar patinhos
    ducks.forEach(duck => duck.element.remove());
    ducks = [];
    
    // Esconder placar
    document.getElementById('liveRanking').style.display = 'none';
    
    showScreen('homeScreen');
}

// Conectar ao servidor quando a página carregar
window.addEventListener('load', () => {
    connectWebSocket();
});