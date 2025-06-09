// src/utils.ts
import { Bot, Context, h, Session, Universal, Logger } from 'koishi'
import * as Hey from './types'
import HeyBot from './'

const logger = new Logger('adapter-heychat');

// 定义一个函数，用于将元素数组转换为文本元素
function transformElements(elements: any[]) {
    // 使用map方法遍历元素数组
    return elements.map(element => {
        // 判断元素类型
        if (typeof element === 'string') {
            // 如果元素是字符串，则直接返回文本元素
            return h.text(element)
        }
        else {
            // 如果元素不是字符串，则将其转换为字符串，并返回文本元素
            return h.text(String(element))
        }
    })
}

// 导出一个函数，用于适配Heychat会话
export function adaptSession<C extends Context = Context>(bot: HeyBot<C>, input: Hey.Event) {
    const session = bot.session()
    session.setInternal(bot.platform, input)
    switch (input.type) {
        case '50': {
            session.type = 'message'
            session.event.selfId = input.data.bot_id.toString()
            session.event.user.id = input.data.sender_info.user_id.toString()
            session.event.user.isBot = input.data.sender_info.bot
            session.event.user.avatar = input.data.sender_info.avatar
            session.event.user.name = input.data.sender_info.nickname
            session.event.user.nick = input.data.sender_info.nickname
            session.event.channel.id = `${input.data.room_base_info.room_id}:${input.data.channel_base_info.channel_id}`
            session.event.channel.name = input.data.channel_base_info.channel_name
            session.event.guild.id = input.data.room_base_info.room_id
            session.event.guild.name = input.data.room_base_info.room_name
            session.event.guild.avatar = input.data.room_base_info.room_avatar
            session.messageId = input.data.msg_id
            session.timestamp = input.timestamp
            session.event.message = {
                id: input.data.msg_id,
                elements: parseMessageElement(input.data.command_info),
            }
            logger.info(session)
            break;
        }
        case "3001": {
            if (input.data.state === 1) {
                session.type = 'group-member-added'
            } else {
                session.type = 'group-member-removed'
            }
            session.event.selfId = input.data.bot_id.toString()
            session.event.user.id = input.data.sender_info.user_id.toString()
            session.event.user.isBot = input.data.sender_info.bot
            session.event.user.avatar = input.data.sender_info.avatar
            session.event.user.name = input.data.sender_info.nickname
            session.event.user.nick = input.data.sender_info.nickname
            session.event.channel.id = input.data.channel_base_info.channel_id
            session.event.channel.name = input.data.channel_base_info.channel_name
            session.event.guild.id = input.data.room_base_info.room_id
            session.event.guild.name = input.data.room_base_info.room_name
            session.event.guild.avatar = input.data.room_base_info.room_avatar
        }
        default:
            return
    }
    return session
}
export function parseMessageElement(data: Hey.CommandInfo): h[] {
    let elements: h[]
    data.options.map(option => {
        switch (option.type) {
            case 5:
            case 4:
            case 3: {
                elements.push(h('text', { content: ` --${option.name}=${option.value}` }));
                break;
            }
            case 6: {
                elements.push(h('text', { content: ` --${option.name}=` }));
                elements.push(h('at', { id: option.value }));
            }
        }
    })
    return elements
}
export function parseMessage(data: Hey.CommandInfo) {
    // 将options一个个接在name后面
    const name = data.name
    const options = data.options.map(option => {
        return ` --${option.name}=${option.value}`
    }).join('')
    return `${name}${options}`
}