import { createServer } from 'node:http'
import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { DuelRoom } from './DuelRoom.js'

const port = Number(process.env.PORT ?? 2567)
const httpServer = createServer()

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
})

gameServer.define('duel', DuelRoom)
await gameServer.listen(port, '0.0.0.0')
console.log(`Duel server listening on ws://0.0.0.0:${port}`)
