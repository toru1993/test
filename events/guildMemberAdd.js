const { Events, EmbedBuilder } = require('discord.js');
const { sendLineMessage } = require('../utils/line');

function resolveNotifyChannel(guild) {
  const channelId = process.env.EVENT_NOTIFY_CHANNEL_ID || process.env.DEFAULT_NOTIFY_CHANNEL_ID;
  return guild.channels.cache.get(channelId);
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (process.env.GUILD_ID && member.guild.id !== process.env.GUILD_ID) return;

    const channel = resolveNotifyChannel(member.guild);
    if (!channel) {
      console.error('EVENT_NOTIFY_CHANNEL_ID / DEFAULT_NOTIFY_CHANNEL_ID が見つかりません。');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('👋 メンバー参加')
      .setDescription(`${member} さんがサーバーに参加しました。`)
      .addFields({ name: 'メンバー数', value: `${member.guild.memberCount}人` })
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x57f287)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    try {
      await sendLineMessage(`👋 ${member.user.tag} さんがサーバーに参加しました。(メンバー数: ${member.guild.memberCount}人)`);
    } catch (error) {
      console.error('LINEへの通知送信に失敗しました:', error.message);
    }
  },
};
