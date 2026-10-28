import { createServer } from 'node:http'
import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { DuelRoom } from './DuelRoom.js'

const port = Number(process.env.PORT ?? 2567)
const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok', service: 'duel-element-server' }))
    return
  }

  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end("Serveur multijoueur de Duel d'Élément")
})

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
})

gameServer.define('duel', DuelRoom)
await gameServer.listen(port)
console.log(`Duel server listening on ws://127.0.0.1:${port}`)
