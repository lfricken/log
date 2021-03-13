"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const io = __importStar(require("socket.io"));
const path = __importStar(require("path"));
const pg = __importStar(require("pg"));
const express_1 = __importDefault(require("express"));
const expWrap = express_1.default();
const httpServer = http.createServer(expWrap);
const ioWrap = new io.Server(httpServer);
ioWrap.on('connection', (socket) => {
    console.log(`a user connected ${0}`);
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
// pools will use environment variables
// for connection information
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SKIPSSL ? undefined : { rejectUnauthorized: false },
});
// Serve static files from the React app
expWrap.use(express_1.default.static(path.join(__dirname, 'client/build')));
// Put all API endpoints under '/api'
expWrap.get('/api/passwords', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let data = [];
    let databaseRes = yield pool.query('SELECT * FROM horses;'); //, (err, res) => 
    for (let row of databaseRes.rows) {
        data.push(JSON.stringify(row));
    }
    res.json(data);
    console.log(`Sent data back to client`);
}));
// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
expWrap.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/client/build/index.html'));
});
const port = process.env.PORT || 3001;
httpServer.listen(port);
console.log(`Server listening on ${port}`);
