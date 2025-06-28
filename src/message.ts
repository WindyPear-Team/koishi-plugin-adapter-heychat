import HeyBot from './'
import * as Hey from './types'
import { Context, h, Dict, MessageEncoder } from 'koishi'
// import { logger } from './'

export class HeyMessageEncoder<C extends Context> extends MessageEncoder<C, HeyBot<C>> {
  private content: string
  private imageUrl: string | null = null;
  private imageWidth: number = 0;
  private imageHeight: number = 0;

  private payload: Hey.SendMessagePayload;

  // 在 prepare 中初始化 payload
  async prepare() {
    this.content = ''
    this.imageUrl = null;
    this.imageWidth = 0;
    this.imageHeight = 0;

    this.payload = {
      msg: '',
      msg_type: 4,
      heychat_ack_id: this.session.messageId,
      reply_id: '',
      room_id: this.channelId.split(':')[0],
      addition: '{"img_files_info":[]}',
      at_user_id: '',
      at_role_id: '',
      mention_channel_id: '',
      channel_id: this.channelId.split(':')[1],
      channel_type: 1,
    };
  }

  // 将发送好的消息添加到 results 中
  async addResult(data: any) {
    const message = data
    this.results.push(message)
    const session = this.bot.session()
    session.event.message = message
    session.app.emit(session, 'send', session)
    //logger.info(this.results)
  }

  // 发送缓冲区内的消息
  async flush() {
    if (this.imageUrl && this.content.length === 0) {
      this.payload.msg_type = 3;
      this.payload.img = this.imageUrl;
      delete this.payload.addition;
      delete this.payload.msg;

      const message = await this.bot.internal.sendMessage(this.payload);
      await this.addResult(message);
    } else if (this.content.length > 0) {
      this.payload.msg = this.content;

      if (this.imageUrl) {
        this.payload.addition = JSON.stringify({
          img_files_info: [{
            url: this.imageUrl,
            width: this.imageWidth,
            height: this.imageHeight,
          }],
        });
      } else {
        this.payload.addition = '{"img_files_info":[]}';
      }

      const message = await this.bot.internal.sendMessage(this.payload);
      await this.addResult(message);
    }
    this.content = '';
    this.imageUrl = null;
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.payload.msg = '';
    this.payload.at_user_id = '';
    this.payload.at_role_id = '';
    this.payload.mention_channel_id = '';
    this.payload.msg_type = 4;
  }

  // 遍历消息元素
  async visit(element: h) {
    const { type, attrs, children } = element
    if (type === 'text') {
      const lines = attrs.content.split('\n');
      for (const line of lines) {
        if (this.content) this.content += '\n\n';
        this.content += h.escape(line);
      }
    } else if (type === 'at') {
      if (attrs.id) {
        this.content += `@{id:${attrs.id}}`;
        this.payload.at_user_id = this.payload.at_user_id ? `${this.payload.at_user_id},${attrs.id}` : attrs.id;
        this.payload.msg_type = 10;
      } else if (attrs.role) {
        this.content += `@{id:${attrs.role}}`;
        this.payload.at_role_id = this.payload.at_role_id ? `${this.payload.at_role_id},${attrs.role}` : attrs.role;
      }
    } else if (type === 'sharp') {
      if (attrs.id) {
        this.content += ` #{id:${attrs.id}} `;
        this.payload.mention_channel_id = this.payload.mention_channel_id ? `${this.payload.mention_channel_id},${attrs.id}` : attrs.id;
        this.payload.channel_id = attrs.id;
      }
    } else if (type === 'image' && attrs.url) {
      const uploadedImage = await this.bot.internal.uploadImage(attrs.url);
      if (uploadedImage) {
        this.imageUrl = uploadedImage.url;
        this.imageWidth = uploadedImage.width || 0;
        this.imageHeight = uploadedImage.height || 0;
      }
      this.content += `![]( ${attrs.url} )`;
    } else if (type === 'p' || type === 'br') {
      this.content += '\n\n';
      await this.render(children);
    } else {
      await this.render(children);
    }
  }
}