// server.js
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Criar servidor HTTP que também serve arquivos estáticos
const server = http.createServer((req, res) => {
    // Servir arquivos estáticos
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Arquivo não encontrado</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Erro interno do servidor: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ server });

// Armazenar salas e jogadores
const rooms = new Map();
const players = new Map();

// Gerar código de sala aleatório
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Broadcast para todos os jogadores de uma sala
function broadcastToRoom(roomCode, message, excludePlayer = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    room.players.forEach(playerId => {
        if (playerId !== excludePlayer) {
            const player = players.get(playerId);
            if (player && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        }
    });
}

wss.on('connection', (ws) => {
    console.log('Nova conexão estabelecida');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleClientMessage(ws, data);
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Conexão fechada');
        // Remover jogador de todas as salas
        for (const [playerId, player] of players.entries()) {
            if (player.ws === ws) {
                // Remover de salas
                for (const [roomCode, room] of rooms.entries()) {
                    const playerIndex = room.players.indexOf(playerId);
                    if (playerIndex > -1) {
                        room.players.splice(playerIndex, 1);
                        
                        // Se não há mais jogadores, remover sala
                        if (room.players.length === 0) {
                            rooms.delete(roomCode);
                        }
                    }
                }
                
                players.delete(playerId);
                break;
            }
        }
    });
});

function handleClientMessage(ws, data) {
    switch (data.type) {
        case 'createRoom':
            createRoom(ws, data);
            break;
            
        case 'joinRoom':
            joinRoom(ws, data);
            break;
            
        case 'startRace':
            startRace(ws, data);
            break;
            
        case 'leaveRoom':
            leaveRoom(ws, data);
            break;
            
        default:
            console.log('Tipo de mensagem desconhecido:', data.type);
    }
}

function createRoom(ws, data) {
    const playerId = generatePlayerId();
    const roomCode = generateRoomCode();
    
    // Verificar se o código já existe (muito improvável, mas...)
    while (rooms.has(roomCode)) {
        roomCode = generateRoomCode();
    }
    
    // Criar jogador
    players.set(playerId, {
        ws: ws,
        name: data.playerName,
        id: playerId
    });
    
    // Criar sala
    rooms.set(roomCode, {
        code: roomCode,
        owner: playerId,
        players: [playerId],
        gameState: data.gameState,
        inGame: false
    });
    
    console.log(`Sala ${roomCode} criada por ${data.playerName}`);
    
    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomCode: roomCode,
        gameState: data.gameState
    }));
}

function joinRoom(ws, data) {
    const room = rooms.get(data.roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Sala não encontrada'
        }));
        return;
    }
    
    if (room.inGame) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Jogo já em andamento'
        }));
        return;
    }
    
    const playerId = generatePlayerId();
    
    // Criar jogador
    players.set(playerId, {
        ws: ws,
        name: data.playerName,
        id: playerId
    });
    
    // Adicionar à sala
    room.players.push(playerId);
    
    console.log(`${data.playerName} entrou na sala ${data.roomCode}`);
    
    // Confirmar entrada para o jogador
    ws.send(JSON.stringify({
        type: 'roomJoined',
        roomCode: data.roomCode,
        gameState: room.gameState
    }));
    
    // Notificar outros jogadores
    broadcastToRoom(data.roomCode, {
        type: 'playerJoined',
        playerName: data.playerName
    }, playerId);
}

function startRace(ws, data) {
    const room = rooms.get(data.roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Sala não encontrada'
        }));
        return;
    }
    
    // Verificar se é o dono da sala
    const player = [...players.values()].find(p => p.ws === ws);
    if (!player || room.owner !== player.id) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Apenas o criador da sala pode iniciar a corrida'
        }));
        return;
    }
    
    room.inGame = true;
        
    // Broadcast para todos os jogadores da sala
    broadcastToRoom(data.roomCode, {
        type: 'raceStarted',
        participants: data.participants,
        raceDistance: data.raceDistance
    });
}

function leaveRoom(ws, data) {
    const player = [...players.values()].find(p => p.ws === ws);
    if (!player) return;
    
    const room = rooms.get(data.roomCode);
    if (!room) return;
    
    // Remover jogador da sala
    const playerIndex = room.players.indexOf(player.id);
    if (playerIndex > -1) {
        room.players.splice(playerIndex, 1);
        
        console.log(`${player.name} saiu da sala ${data.roomCode}`);
        
        // Se não há mais jogadores, remover sala
        if (room.players.length === 0) {
            rooms.delete(data.roomCode);
            console.log(`Sala ${data.roomCode} removida (sem jogadores)`);
        } else if (room.owner === player.id && room.players.length > 0) {
            // Se o dono saiu, transferir propriedade
            room.owner = room.players[0];
            console.log(`Propriedade da sala ${data.roomCode} transferida`);
        }
    }
    
    // Remover jogador
    players.delete(player.id);
}

function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesso local: http://localhost:${PORT}`);
    console.log(`Acesso na rede: http://192.168.68.59:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
});

// Log de status periódico
setInterval(() => {
    console.log(`Status: ${rooms.size} salas ativas, ${players.size} jogadores conectados`);
}, 30000);