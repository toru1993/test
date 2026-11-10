const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { notifyLine } = require('../utils/line');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('指定したチャンネル(省略時はデフォルトチャンネル)に通知メッセージを送信します')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('送信する通知メッセージ')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('通知先チャンネル(省略時はデフォルトチャンネル)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const message = interaction.options.getString('message', true);
    const targetChannel = interaction.options.getChannel('channel')
      ?? interaction.guild.channels.cache.get(process.env.DEFAULT_NOTIFY_CHANNEL_ID);

    if (!targetChannel) {
      await interaction.reply({
        content: '通知先チャンネルが見つかりません。channelオプションを指定するか、DEFAULT_NOTIFY_CHANNEL_IDを設定してください。',
        ephemeral: true,
      });
      return;
    }

    const permissions = targetChannel.permissionsFor(interaction.client.user);
    if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: `#${targetChannel.name} にメッセージを送信する権限がありません。`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📢 通知')
      .setDescription(message)
      .setColor(0x5865f2)
      .setFooter({ text: `送信者: ${interaction.user.tag}` })
      .setTimestamp();

    await targetChannel.send({ embeds: [embed] });

    let lineQueued = false;
    try {
      const result = await notifyLine(message);
      lineQueued = result.queued;
    } catch (error) {
      console.error('LINEへの通知送信に失敗しました:', error.message);
    }

    const lineStatus = lineQueued
      ? '(LINEは静かな時間帯のため朝にまとめて送信されます)'
      : '';

    await interaction.reply({
      content: `#${targetChannel.name} に通知を送信しました。${lineStatus}`,
      ephemeral: true,
    });
  },
};
