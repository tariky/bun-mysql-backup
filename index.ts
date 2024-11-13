import { $ } from "bun";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { unlink } from "fs/promises";

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

async function createBackup() {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupFile = `komoran-backup-${timestamp}.sql`;
	const zipFile = `${backupFile}.zip`;

	try {
		// Create database backup using mysqldump
		console.log("Creating database backup...");
		await $`mysqldump --host=${config.database.host} \
			--port=${config.database.port} \
			--user=${config.database.user} \
			--password=${config.database.password} \
			${config.database.name} > ${backupFile}`;

		// Compress the backup file
		console.log("Compressing backup file...");
		await $`zip ${zipFile} ${backupFile}`;

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

		const fileBuffer = await Bun.file(zipFile).arrayBuffer();

		await s3Client.send(
			new PutObjectCommand({
				Bucket: config.spaces.bucket,
				Key: zipFile,
				Body: Buffer.from(fileBuffer),
				ContentType: "application/zip",
			})
		);

		// Clean up temporary files
		console.log("Cleaning up temporary files...");
		await unlink(backupFile);
		await unlink(zipFile);

		console.log("Backup completed successfully!");
	} catch (error) {
		console.error("Backup failed:", error);
		process.exit(1);
	}
}

createBackup();
