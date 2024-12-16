import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import axios from "axios";
import { $ } from "bun";
import { unlink } from "fs/promises";
import { Hono } from "hono";
const app = new Hono();

const databases = [
	{
		name: "komoran",
		username: "root",
		password: "56871690",
		host: "localhost",
		port: "3306",
	},
	{
		name: "sos-komoran",
		username: "root",
		password: "56871690",
		host: "localhost",
		port: "3306",
	},
	{
		name: "mojsalon",
		username: "root",
		password: "56871690",
		host: "localhost",
		port: "3306",
	},
	{
		name: "bis",
		username: "root",
		password: "56871690",
		host: "localhost",
		port: "3306",
	},
];

// Configuration
const config = {
	database: {
		host: process.env.DB_HOST || "localhost",
		port: process.env.DB_PORT || "3306",
		name: process.env.DB_NAME || "your_db_name",
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD,
	},
	spaces: {
		bucket: process.env.SPACES_BUCKET || "your-backup-bucket",
		endpoint: process.env.SPACES_ENDPOINT || "nyc3.digitaloceanspaces.com",
		region: process.env.SPACES_REGION || "nyc3",
		accessKeyId: process.env.SPACES_KEY,
		secretAccessKey: process.env.SPACES_SECRET,
	},
};

async function sendNotification(notification: string) {
	await axios.post(
		`https://ntfy.lunatik.cloud/backup?title="Backup"`,
		notification
	);
}

async function createBackup(
	name: string,
	username: string,
	password: string,
	host: string,
	port: string
) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupFile = `${name}-backup-${timestamp}.sql.gz`;

	try {
		// Create database backup using mysqldump
		console.log("Creating database backup...");
		await $`mysqldump -h ${host} -u ${username} -p'${password}' ${name} | gzip > ${backupFile}`;

		// Upload to S3
		console.log("Uploading to S3...");
		const s3Client = new S3Client({
			endpoint: `https://${config.spaces.endpoint}`,
			region: config.spaces.region,
			credentials: {
				accessKeyId: config.spaces.accessKeyId || "",
				secretAccessKey: config.spaces.secretAccessKey || "",
			},
			forcePathStyle: false,
		});

		const fileBuffer = await Bun.file(backupFile).arrayBuffer();

		await s3Client.send(
			new PutObjectCommand({
				Bucket: config.spaces.bucket,
				Key: backupFile,
				Body: Buffer.from(fileBuffer),
				ContentType: "application/zip",
			})
		);

		// Clean up temporary files
		console.log("Cleaning up temporary files...");
		await unlink(backupFile);

		console.log("Backup completed successfully!");
		return `${name} - backup je uspješno napravljen!`;
	} catch (error) {
		console.error("Backup failed:", error);
		process.exit(1);
	}
}

app.get("/backup", async (c) => {
	const sattledData = await Promise.all(
		databases.map(async (database) => {
			await createBackup(
				database.name,
				database.username,
				database.password,
				database.host,
				database.port
			);
		})
	);

	// array of string display as list of strings
	const message = sattledData.join("\n");
	await sendNotification(message);

	return c.json({ message: "Backup created successfully" });
});

console.log("Server is running on port 3010");

export default {
	port: 3010,
	fetch: app.fetch,
};
