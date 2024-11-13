# bun-backup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.34. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# env example
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_db_name
DB_USER=your_username
DB_PASSWORD=your_password

SPACES_BUCKET=your-bucket-name
SPACES_ENDPOINT=fra1.digitaloceanspaces.com
SPACES_REGION=fra1
SPACES_KEY=your-api-key
SPACES_SECRET=your-api-secret

TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

## how to setup cronjob
find out bun executable
```bash
which bun
```
update cron
```bash
crontab -e
```
add cron job to end of file - cron will run script every day at 16:00h
```bash
0 16 * * * /usr/local/bin/bun /home/user/backup/index.ts
```