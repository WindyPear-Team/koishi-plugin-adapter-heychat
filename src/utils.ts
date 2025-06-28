// src/utils.ts
import { Bot, Context, h, Session, Universal, Logger } from 'koishi'
import * as Hey from './types'
import HeyBot from './'

// 导出一个函数，用于适配Heychat会话
export function adaptSession<C extends Context = Context>(bot: HeyBot<C>, input: Hey.Event) {
    const session = bot.session()
    session.setInternal(bot.platform, input)
    switch (input.type) {
        case '50': {
            session.type = 'message'
            // if(input.data.bot_id.toString()){session.event.selfId = input.data.bot_id.toString()}
            session.event.user = {
                id: input.data.sender_info.user_id.toString(),
                isBot: input.data.sender_info.bot,
                avatar: input.data.sender_info.avatar,
                name: input.data.sender_info.nickname,
                nick: input.data.sender_info.nickname,
            }
            // 定义const type，当input.data.channel_base_info.channel_type=1时为0，0时为3，其它为1
            const type = input.data.channel_base_info.channel_type === 1 ? 0 : input.data.channel_base_info.channel_type === 0 ? 3 : 1
            session.event.channel = {
                id: `${input.data.room_base_info.room_id}:${input.data.channel_base_info.channel_id}`,
                name: input.data.channel_base_info.channel_name,
                type,
            }
            session.event.guild = {
                id: input.data.room_base_info.room_id,
                name: input.data.room_base_info.room_name,
                avatar: input.data.room_base_info.room_avatar,
            }
            // session.userId = input.data.sender_info.user_id.toString()
            // session.event.user.isBot = input.data.sender_info.bot
            // session.event.user.avatar = input.data.sender_info.avatar
            // session.event.user.name = input.data.sender_info.nickname
            // session.event.user.nick = input.data.sender_info.nickname
            // session.event.channel.id = `${input.data.room_base_info.room_id}:${input.data.channel_base_info.channel_id}`
            // session.event.channel.name = input.data.channel_base_info.channel_name
            // session.event.guild.id = input.data.room_base_info.room_id
            // session.event.guild.name = input.data.room_base_info.room_name
            // session.event.guild.avatar = input.data.room_base_info.room_avatar
            session.messageId = input.data.msg_id
            session.timestamp = input.timestamp
            session.event.message = {
                id: input.data.msg_id,
                elements: parseMessageElement(input.data.command_info, bot.config.optionname, bot.config.option1),
            }
            // logger.info(session)
            break;
        }
        case "3001": {
            if (input.data.state === 1) {
                session.type = 'group-member-added'
            } else {
                session.type = 'group-member-removed'
            }
            // session.event.selfId = input.data.bot_id.toString()
            // session.event.user.id = input.data.sender_info.user_id.toString()
            // session.event.user.isBot = input.data.sender_info.bot
            // session.event.user.avatar = input.data.sender_info.avatar
            // session.event.user.name = input.data.sender_info.nickname
            // session.event.user.nick = input.data.sender_info.nickname
            // session.event.channel.id = input.data.channel_base_info.channel_id
            // session.event.channel.name = input.data.channel_base_info.channel_name
            // session.event.guild.id = input.data.room_base_info.room_id
            // session.event.guild.name = input.data.room_base_info.room_name
            // session.event.guild.avatar = input.data.room_base_info.room_avatar
            session.event.user = {
                id: input.data.sender_info.user_id.toString(),
                isBot: input.data.sender_info.bot,
                avatar: input.data.sender_info.avatar,
                name: input.data.sender_info.nickname,
                nick: input.data.sender_info.nickname,
            }
            const type = input.data.channel_base_info.channel_type === 1 ? 0 : input.data.channel_base_info.channel_type === 0 ? 3 : 1
            session.event.channel = {
                id: input.data.channel_base_info.channel_id,
                name: input.data.channel_base_info.channel_name,
                type,
            }
            session.event.guild = {
                id: input.data.room_base_info.room_id,
                name: input.data.room_base_info.room_name,
                avatar: input.data.room_base_info.room_avatar,
            }
        }
        default:
            return
    }
    return session
}
export function parseMessageElement(data: Hey.CommandInfo, optionname: string, optionname1: string): h[] {
    let elements: h[] = []
    elements.push(h.text(data.name))
    const lastoption = data.options?.find(item => item.name === optionname);
    if (lastoption) {
        elements.push(h.text(` ${lastoption.value}`))
    }
    const lastoption1 = data.options?.find(item => item.name === optionname1);
    if (lastoption1) {
        elements.push(h.text(`${lastoption.value}`))
    }
    if (data.options) {
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
    }
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