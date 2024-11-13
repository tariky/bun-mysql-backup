interface TelegramMessage {
	chat_id: string | number;
	text: string;
	parse_mode?: "MarkdownV2" | "HTML";
}

interface TelegramUpdate {
	message?: {
		chat: {
			id: number;
		};
	};
}

export async function getSubscribedUsers(): Promise<number[]> {
	const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
	const apiUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;

	try {
		const response = await fetch(apiUrl, {
			cache: "no-store",
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		const updates: TelegramUpdate[] = data.result;

		// Extract unique chat IDs
		const chatIds = new Set(
			updates
				.filter((update) => update.message?.chat.id)
				.map((update) => update.message!.chat.id)
		);

		return Array.from(chatIds);
	} catch (error) {
		console.error("Failed to get subscribed users:", error);
		throw error;
	}
}

export async function broadcastMessage(
	message: string,
	parseMode?: "MarkdownV2" | "HTML"
) {
	const users = await getSubscribedUsers();
	const results = [];

	for (const chatId of users) {
		try {
			const result = await sendTelegramMessage(message, parseMode, chatId);
			results.push({ chatId, success: true, result });
		} catch (error) {
			results.push({ chatId, success: false, error });
		}
	}

	return results;
}

export async function sendTelegramMessage(
	message: string,
	parseMode?: "MarkdownV2" | "HTML",
	overrideChatId?: number
) {
	const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
	const defaultChatId = process.env.TELEGRAM_CHAT_ID || "";
	const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

	// Use override chat ID if provided, otherwise use default
	const chatId = overrideChatId || defaultChatId;

	const processedMessage =
		parseMode === "MarkdownV2"
			? message.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&")
			: message;

	const payload: TelegramMessage = {
		chat_id: chatId,
		text: processedMessage,
		parse_mode: parseMode,
	};

	try {
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Telegram API Error:", errorData);
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Failed to send Telegram message:", error);
		throw error;
	}
}
