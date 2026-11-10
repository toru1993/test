# Discord 通知ボット

特定のサーバー内のチャンネルに通知を送信するDiscordボットです。

- スラッシュコマンド `/notify` による手動通知
- メンバーの参加・退出イベントをトリガーにした自動通知

## セットアップ手順

### 1. Discord Developer Portal でアプリケーションを作成

1. https://discord.com/developers/applications にアクセスし、「New Application」でアプリを作成
2. 左メニューの「Bot」から Bot を作成し、「Reset Token」で表示されるトークンを控える(`DISCORD_TOKEN`)
3. 同じく「Bot」設定内の「Privileged Gateway Intents」で **SERVER MEMBERS INTENT** を有効化する(メンバー参加・退出通知に必須)
4. 左メニューの「OAuth2」→「General」で表示される **Client ID** を控える(`CLIENT_ID`)

### 2. ボットをサーバーに招待

「OAuth2」→「URL Generator」で以下を選択し、生成されたURLをブラウザで開いて対象サーバーに招待します。

- SCOPES: `bot`, `applications.commands`
- BOT PERMISSIONS: `Send Messages`, `Embed Links`

### 3. 環境変数の設定

`.env.example` を `.env` にコピーし、各値を設定します。

```
DISCORD_TOKEN=取得したボットトークン
CLIENT_ID=取得したクライアントID
GUILD_ID=通知対象サーバーのID(サーバー名を右クリック→「IDをコピー」。開発者モードを事前に有効化)
DEFAULT_NOTIFY_CHANNEL_ID=デフォルトの通知先チャンネルID(チャンネルを右クリック→「IDをコピー」)
EVENT_NOTIFY_CHANNEL_ID=メンバー参加/退出通知を送るチャンネルID(省略時はDEFAULT_NOTIFY_CHANNEL_IDを使用)
```

### 4. 依存パッケージのインストール

```
npm install
```

### 5. スラッシュコマンドの登録

```
npm run deploy-commands
```

### 6. ボットの起動

```
npm start
```

## 使い方

Discord上で以下のように実行します。

```
/notify message: メンテナンスのお知らせです channel: #お知らせ
```

- `message`: 送信するメッセージ本文(必須)
- `channel`: 送信先チャンネル(省略時は `DEFAULT_NOTIFY_CHANNEL_ID` のチャンネルに送信)

デフォルトでは「メッセージの管理」権限を持つメンバーのみ実行できます。権限範囲はサーバーの「連携サービス」設定から変更可能です。

## 自動通知(サーバーイベント)

以下のイベントが発生すると、`EVENT_NOTIFY_CHANNEL_ID`(未設定時は `DEFAULT_NOTIFY_CHANNEL_ID`)のチャンネルに自動で通知が送信されます。

- メンバー参加 (`events/guildMemberAdd.js`)
- メンバー退出 (`events/guildMemberRemove.js`)

他のイベントを追加したい場合は、`events/` フォルダに `{ name: Events.XXX, execute(...) {...} }` を export するファイルを追加するだけで `index.js` が自動で読み込みます。

## LINE通知の静かな時間帯(夜間はまとめて送信)

`/notify` やスクリプトからのLINE通知は、`LINE_QUIET_HOURS_START` 〜 `LINE_QUIET_HOURS_END`(`.env`、日本時間・24時間表記)の間は即時送信せず `line-queue.json` に溜め、`npm run flush-line-queue` を実行したタイミングでまとめて1件のLINEメッセージとして送信します。Discordへの通知はこの時間帯でも常に即時送信されます。両方の値を設定しない場合は常に即時送信されます。

### タスクスケジューラへの登録(静かな時間帯終了後に自動送信)

`LINE_QUIET_HOURS_END` に設定した時刻(例: 7:00)の直後に自動でまとめて送信させたい場合、Windowsのタスクスケジューラに登録します。

```
schtasks /create /tn "LineQueueFlush" /tr "node \"C:\Users\鈴木 徹\Desktop\zoom\flush-line-queue.js\" >> \"C:\Users\鈴木 徹\Desktop\zoom\line-flush.log\" 2>&1" /sc daily /st 07:00
```

登録済みタスクの確認・削除:

```
schtasks /query /tn "LineQueueFlush"
schtasks /delete /tn "LineQueueFlush" /f
```

## Zoom会議の要約自動化

Zoomのクラウド録画(文字起こし)を定期的にチェックし、AIで要約してGmailの下書きを自動作成する機能です。Discordボットとは独立して動作します。メールは自動送信ではなく下書き作成までです(内容を確認してから自分で送信してください)。

### 1. Zoomアカウント側の設定

1. Zoomの管理画面(Web)で「設定」→「録画」→クラウド録画を有効化し、「音声の文字起こし(Audio transcript)」をオンにする(これをオンにしないと文字起こしファイルが生成されません)
2. https://marketplace.zoom.us/ にログイン →「Develop」→「Build App」→**Server-to-Server OAuth** を選択してアプリを作成
3. 「Scopes」で以下を追加:
   - `cloud_recording:read:list_user_recordings:admin`
   - `cloud_recording:read:recording:admin`
   - `user:read:user:admin`
4. アプリを有効化(Activate)し、「App Credentials」の **Account ID / Client ID / Client Secret** を控える

### 2. Google Cloud (Gmail API) 側の設定

1. https://console.cloud.google.com/ で新規プロジェクトを作成(または既存を使用)
2. 「APIとサービス」→「ライブラリ」から **Gmail API** を有効化
3. 「APIとサービス」→「認証情報」→「OAuth クライアント ID を作成」→ アプリケーションの種類は **デスクトップアプリ**
4. 発行された **クライアント ID / クライアントシークレット** を控える
5. OAuth同意画面がテスト段階の場合は、自分のGoogleアカウント(mqph0110.ts@gmail.com)を「テストユーザー」に追加しておく

### 3. Anthropic APIキーの取得

https://console.anthropic.com/ でAPIキーを発行する(文字起こしの要約に使用)。

### 4. .env の設定

`.env.example` を参考に、上記で取得した値を `.env` に設定します(`ZOOM_*`, `GMAIL_*`, `SUMMARY_RECIPIENT`, `ANTHROPIC_API_KEY`)。

### 5. 依存パッケージのインストール

```
npm install
```

### 6. Gmailの認証(初回のみ)

```
npm run setup-gmail-auth
```

ブラウザが開くのでGoogleアカウントでログイン・同意すると、`gmail-token.json` が生成されます。

### 7. 動作確認

```
npm run check-zoom
```

Zoomに文字起こし付きの録画があれば、Gmailの下書きフォルダに要約メールが作成されます。処理済みの会議は `processed-meetings.json` に記録され、再実行しても重複作成されません。

### 8. タスクスケジューラへの登録(定期自動実行)

会議終了後に自動でチェックさせたい場合、Windowsのタスクスケジューラに登録します(例: 15分おき)。

```
schtasks /create /tn "ZoomMeetingSummary" /tr "node \"C:\Users\鈴木 徹\Desktop\zoom\check-zoom-meetings.js\" >> \"C:\Users\鈴木 徹\Desktop\zoom\zoom-check.log\" 2>&1" /sc minute /mo 15
```

登録済みタスクの確認・削除:

```
schtasks /query /tn "ZoomMeetingSummary"
schtasks /delete /tn "ZoomMeetingSummary" /f
```
