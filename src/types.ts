export interface Event {
    sequence: number;
    type: string;
    data: EventData;
    notify_type: number;
    timestamp: number;
}

export interface UserInfo {
    avatar: string;
    avatar_decoration: {
        src_type: string;
        src_url: string;
    };
    bot: boolean;
    level: number;
    medals: Array<{
        name: string;
        name_short: string;
        description: string;
        color: string;
        img_url: string;
        medal_id: number;
    }>;
    nickname: string;
    tag: {
        bg_color: string;
        text_color: string;
        text: string;
    };
    user_id: number;
}

interface ChannelBaseInfo {
    channel_id: string;
    channel_name: string;
    channel_type: number;
}

interface CommandOption {
    name: string;
    type: number;
    value: any;
}

export interface CommandInfo {
    id: string;
    name: string;
    options?: CommandOption[];
    type: number;
}

interface RoomBaseInfo {
    room_avatar: string;
    room_id: string;
    room_name: string;
}

interface EventData {
    bot_id: number;
    channel_base_info: ChannelBaseInfo;
    command_info: CommandInfo;
    msg_id: string;
    room_base_info: RoomBaseInfo;
    send_time?: number;
    sender_info?: UserInfo;
    user_info?: UserInfo;
    state?: number;
}

export interface SendMessagePayload {
  msg?: string;
  msg_type: number;
  heychat_ack_id: string;
  reply_id: string;
  room_id: string;
  addition?: string;
  at_user_id: string;
  at_role_id: string;
  mention_channel_id: string;
  channel_id: string;
  channel_type: number;
  img?: string;
}