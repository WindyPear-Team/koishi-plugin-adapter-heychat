// src/index.ts
import { Adapter, Context, Logger, Bot, SessionError, h, Schema, Universal, Binary } from 'koishi'
import * as Hey from './types'
import { adaptSession } from './utils'
import { } from '@koishijs/plugin-server'
import Internal from './internal'
import { HeyMessageEncoder } from './message'

export const logger = new Logger('adapter-heychat')
export const name = 'adapter-mc'  // 插件名称

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
    })
    this.internal = new Internal(http, config.token, `${this.config.endpoint}`)
    ctx.plugin(HeyAdapter, this)
  }
}

export class HeyAdapter<C extends Context> extends Adapter<C, HeyBot<C>> {
  async connect(bot: HeyBot) {
    await this.initialize(bot)

    bot.ctx.server.post(bot.config.webhookPath, async (ctx) => {
      const payload: Hey.Event = ctx.request.body

      if (bot.status !== Universal.Status.ONLINE) {
        await this.initialize(bot)
      }

      const session = adaptSession(bot, payload)  //使用adaptSession
      if (session) {
        bot.dispatch(session)
        //logger.info('有的兄弟，session有的')
      }

      ctx.status = 200
      ctx.body = 'OK';
    })
  }

  async initialize(bot: HeyBot) {
    try {
      bot.online()
    } catch (e) {
      bot.logger.warn(e)
      bot.offline()
    }
  }
}
namespace HeyBot {
  export interface Config {
    botid: string;
    endpoint: string;
    token: string;
    webhookPath: string;
  }

  export const Config: Schema<Config> = Schema.object({
    botid: Schema.string().required().description('机器人ID'),
    endpoint: Schema.string().required().description('API地址').default('https://chat.xiaoheihe.cn/chatroom'),
    token: Schema.string().required().description('API密钥'),
    webhookPath: Schema.string().default('/heychat').description('Webhook 的路径'),

  })
}

export default HeyBot