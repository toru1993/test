const { Events, EmbedBuilder } = require('discord.js');
const { sendLineMessage } = require('../utils/line');

function resolveNotifyChannel(guild) {
  const channelId = process.env.EVENT_NOTIFY_CHANNEL_ID || process.env.DEFAULT_NOTIFY_CHANNEL_ID;
  return guild.channels.cache.get(channelId);
}

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (process.env.GUILD_ID && member.guild.id !== process.env.GUILD_ID) return;

    const channel = resolveNotifyChannel(member.guild);
    if (!channel) {
      console.error('EVENT_NOTIFY_CHANNEL_ID / DEFAULT_NOTIFY_CHANNEL_ID が見つかりません。');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('👋 メンバー退出')
      .setDescription(`${member.user.tag} さんがサーバーから退出しました。`)
      .addFields({ name: 'メンバー数', value: `${member.guild.memberCount}人` })
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xed4245)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    try {
      await sendLineMessage(`👋 ${member.user.tag} さんがサーバーから退出しました。(メンバー数: ${member.guild.memberCount}人)`);
    } catch (error) {
      console.error('LINEへの通知送信に失敗しました:', error.message);
    }
  },
};
