import { Adapter, Context, Logger, Bot, Schema } from 'koishi'
import { WebSocket } from '@satorijs/protocol'
import * as Hey from './types'
import { adaptSession } from './utils'
import Internal from './internal'
import { HeyMessageEncoder } from './message'

export const logger = new Logger('adapter-heychat')
export const name = 'adapter-heychat'
export const usage = `Hey Chat 黑盒适配器`

class HeyBot<C extends Context = Context> extends Bot<C> {
  static inject = ['server']
  static MessageEncoder = HeyMessageEncoder

  constructor(ctx: C, config: HeyBot.Config) {
    super(ctx, config)
    this.platform = 'heychat'
    this.selfId = config.botid
    const http = ctx.http.extend({
      baseURL: `${this.config.endpoint}`,
      headers: {
        token: config.token,
      },
    })
    this.internal = new Internal(http, config.token, `${this.config.endpoint}`)
    ctx.plugin(HeyAdapter, this)
  }
}

export class HeyAdapter<C extends Context> extends Adapter.WsClient<C, HeyBot<C>> {
  _ping: NodeJS.Timeout
  _acked = true
  prepare() {
    // logger.info(`连接地址:wss://chat.xiaoheihe.cn/chatroom/ws/connect?token=${this.bot.config.token}`)
    // this.bot.online()
    return this.ctx.http.ws(`wss://chat.xiaoheihe.cn/chatroom/ws/connect?chat_os_type=bot&client_type=heybox_chat&chat_version=999.0.0&chat_version=1.24.5&token=${this.bot.config.token}`, {
      headers: {
        token: this.bot.config.token
      }
    })
  }

  // async disconnect() {
  //   await this.connect(this.bot)
  // }
  // async connect(bot: HeyBot<C>) {
  //   this.bot = bot
  // }

  heartbeat() {
    if (!this._acked) {
      logger.warn('zombied connection')
      return this.socket.close()
    }
    this.socket.send('PING')
    this._acked = false
  }

  accept() {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.bot.online()
      this._ping = setInterval(() => this.heartbeat(), 30000)
    }
    this.socket.addEventListener('open', () => {
      logger.info('HeyChat WebSocket连接成功')
      // this.bot.online()
    })

    this.socket.addEventListener('message', ({ data }) => {
      let payload: Hey.Event
      if (data === 'PONG'){
        this._acked = true
        return
      }
      try {
        payload = JSON.parse(data.toString()) as Hey.Event
        // logger.info(payload)
      } catch (e) {
        // logger.warn('处理消息出错:', e)
        return
      }

      try {
        const session = adaptSession(this.bot, payload)
        if (session) this.bot.dispatch(session)
      }
      catch (e) {
        logger.error('处理消息出错:', e)
      }
    })

    this.socket.addEventListener('close', (e) => {
      // logger.warn(`WebSocket连接关闭，`, e)
      super.disconnect(this.bot)
      clearInterval(this._ping)
      this.bot.offline()
    })

    this.socket.addEventListener('error', (err) => {
      // this.bot.logger.error('WebSocket错误:', err)
    })
  }
}

namespace HeyBot {
  export interface Config {
    botid: string
    endpoint: string
    token: string
    retryTimes?: number
    retryInterval?: number
    retryLazy?: number
  }

  export const Config: Schema<Config> = Schema.object({
    botid: Schema.string().required().description('机器人ID'),
    endpoint: Schema.string().description('API地址').default('https://chat.xiaoheihe.cn/chatroom'),
    token: Schema.string().required().description('API密钥'),
    retryTimes: Schema.number().description('初次连接时的最大重试次数。').default(3),
    retryInterval: Schema.number().description('初次连接时的重试时间间隔。').default(1000),
    retryLazy: Schema.number().description('连接关闭后的重试时间间隔。').default(1000),
  })
}

export default HeyBot