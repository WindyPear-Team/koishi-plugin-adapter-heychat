import { Context, h, HTTP, Dict, Logger } from 'koishi'
import HeyBot from './'
import * as Hey from './types'
import * as Util from './utils'
import { FormData, File } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path';
import * as mime from 'mime-types';
import path from 'path';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const logger = new Logger('adapter-heychat')
export default class Internal {
    constructor(private http: HTTP, private token: string, private endpoint: string) { }
    async sendMessage(payload: Dict) {
        return this.http.post(`${this.endpoint}/v2/channel_msg/send`, payload, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        })
    }
    async sendPrivateMessage(payload: Dict) {
        return this.http.post(`${this.endpoint}/v3/msg/user`, payload, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        })
    }
    async uploadImage(image: string | Buffer | any): Promise<string> {
        const form = new FormData()
        let fileName = 'image.png';
        let mimeType = 'image/png';

        if (image && typeof image === 'object' && image.type === 'image') {
            fileName = image.attrs?.filename || fileName;
            mimeType = image.attrs?.mime || mimeType;
            if (image.attrs?.url) {
                const response = await this.http.get(image.attrs.url, { responseType: 'arraybuffer' });
                const file = new File([Buffer.from(response)], fileName, { type: mimeType });
                form.append('image', file);
            } else if (image.attrs?.data) {
                const file = new File([image.attrs.data], fileName, { type: mimeType });
                form.append('image', file);
            } else {
                throw new Error('图片元素缺少 url 或 data 属性');
            }
        } else if (Buffer.isBuffer(image)) {
            const file = new File([image], fileName, { type: mimeType });
            form.append('image', file);
        } else if (typeof image === 'string') {
            if (image.startsWith('data:image/')) {
                const parts = image.split(',');
                const base64Data = parts[1];
                const inferredMime = parts[0].match(/data:(.*?);base64/)?.[1];
                if (inferredMime) {
                    mimeType = inferredMime;
                    fileName = `image.${mime.extension(inferredMime) || 'png'}`;
                }
                const buffer = Buffer.from(base64Data, 'base64');
                const file = new File([buffer], fileName, { type: mimeType });
                form.append('image', file);
            } else if (image.startsWith('http://') || image.startsWith('https://')) {
                const response = await this.http.get(image, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(new Uint8Array(response));
                const urlParts = image.split('/');
                fileName = urlParts[urlParts.length - 1].split('?')[0];
                const ext = path.extname(fileName);
                if (ext) {
                    const inferredMime = mime.lookup(ext);
                    if (inferredMime) {
                        mimeType = inferredMime;
                    }
                }
                if (fileName.indexOf('.') === -1 && mime.extension(mimeType)) {
                    fileName += `.${mime.extension(mimeType)}`;
                } else if (fileName.indexOf('.') === -1) {
                    fileName = `image.png`;
                }
                const file = new File([buffer], fileName, { type: mimeType });
                form.append('image', file);
            } else { // 本地文件路径
                const resolvedPath = path.resolve(image);
                fileName = path.basename(resolvedPath);
                const inferredMime = mime.lookup(resolvedPath);
                if (inferredMime) {
                    mimeType = inferredMime;
                }
                const file = await fileFromPath(resolvedPath);
                form.append('image', file);
            }
        } else {
            throw new Error('上传图片只支持路径、URL、base64、Buffer 或 h.Element 类型');
        }
        try {
            for (const [key, value] of form.entries()) {
                // logger.info('图片字段:', key);
                // logger.info('图片值:', value);
            }

            const uploadUrl = 'https://chat-upload.xiaoheihe.cn/upload';
            // logger.info(`尝试使用 axios 发送图片请求到: ${uploadUrl}`);

            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    token: this.token,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            };

            const response = await axios.post(uploadUrl, form, axiosConfig);
            const res = response.data;

            if (res.code !== 1) {
                throw new Error(`图片上传失败：${res.msg}，响应码${res.code}`);
            }
            return res.data.result.url;

        } catch (error: any) {
            logger.error(`图片上传请求失败: ${error.message}`);
            if (axios.isAxiosError(error) && error.response) {
                logger.error(`Axios 响应状态: ${error.response.status}`);
                logger.error(`Axios 响应体:`, error.response.data);
                logger.error(`Axios 响应头:`, error.response.headers);
            }
            for (const [key, value] of form.entries()) {
                logger.info(key, value);
            }
            throw new Error(`图片上传失败：${error.message}`);
        }
    }
}