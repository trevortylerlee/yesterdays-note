import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	normalizePath,
	Notice,
	moment,
} from "obsidian";

interface DailyNotesPlugin {
	options: {
		format: string;
		folder: string;
	};
}

interface InternalPlugins {
	plugins: {
		"daily-notes": {
			instance: DailyNotesPlugin;
			enabled: boolean;
		};
	};
}

interface ObsidianApp extends App {
	internalPlugins: InternalPlugins;
}

interface YesterdayNoteSettings {
	dateFormat: string | null;
	folder: string;
	template: string;
	autoCreateYesterday: boolean;
}

const DEFAULT_SETTINGS: YesterdayNoteSettings = {
	dateFormat: null,
	folder: "",
	template: "",
	autoCreateYesterday: true,
};

export default class YesterdayNotePlugin extends Plugin {
	settings: YesterdayNoteSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(
			new YesterdayNoteSettingTab(this.app as ObsidianApp, this)
		);

		this.addRibbonIcon(
			"calendar-minus",
			"Open yesterday's daily note",
			() => {
				this.openYesterdayNote();
			}
		);

		this.addCommand({
			id: "open-yesterday-note",
			name: "Open yesterday's daily note",
			callback: () => {
				this.openYesterdayNote();
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getDailyNotesFormat(): string {
		const dailyNotes = (this.app as ObsidianApp).internalPlugins.plugins[
			"daily-notes"
		];
		if (!dailyNotes?.enabled) {
			new Notice("Daily Notes plugin is not enabled");
			throw new Error("Daily Notes plugin is not enabled");
		}

		return dailyNotes.instance.options.format || "YYYY-MM-DD";
	}

	getDateFormat(): string {
		return this.settings.dateFormat || this.getDailyNotesFormat();
	}

	getDailyNotesFolder(): string {
		if (this.settings.folder) return this.settings.folder;

		const dailyNotes = (this.app as ObsidianApp).internalPlugins.plugins[
			"daily-notes"
		];
		return dailyNotes?.instance.options.folder || "";
	}

	async createNote(path: string, date: moment.Moment): Promise<TFile> {
		let content = (await this.getTemplateContents()) || "";

		if (content) {
			content = content.replace(/{{date:([^}]*)}}/g, (_, format) =>
				date.format(format)
			);
		}

		const dirPath = path.substring(0, path.lastIndexOf("/"));
		if (dirPath) {
			try {
				await this.app.vault.createFolder(dirPath);
			} catch (e) {
				if (!e.message.includes("Folder already exists")) {
					throw e;
				}
			}
		}

		return await this.app.vault.create(path, content);
	}

	async getTemplateContents(): Promise<string | null> {
		const templatePath = this.settings.template;
		if (!templatePath) return null;

		const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
		if (!templateFile) {
			new Notice(`Template file not found: ${templatePath}`);
			return null;
		}

		if (!(templateFile instanceof TFile)) {
			new Notice(`Template path is not a file: ${templatePath}`);
			return null;
		}

		return await this.app.vault.read(templateFile);
	}

	async openYesterdayNote() {
		try {
			const yesterday = moment().subtract(1, "day");
			const dateFormat = this.getDateFormat();
			const formattedDate = yesterday.format(dateFormat);

			const folder = this.getDailyNotesFolder();
			const fullPath = normalizePath(
				folder ? `${folder}/${formattedDate}.md` : `${formattedDate}.md`
			);

			let file = this.app.vault.getAbstractFileByPath(fullPath);

			if (!file && this.settings.autoCreateYesterday) {
				new Notice("Creating yesterday's note...");
				file = await this.createNote(fullPath, yesterday);
			}

			if (file) {
				if (!(file instanceof TFile)) {
					new Notice(`Path does not point to a file: ${fullPath}`);
					return;
				}
				const leaf = this.app.workspace.getUnpinnedLeaf();
				await leaf.openFile(file);
			} else {
				new Notice(`No note found at: ${fullPath}`);
			}
		} catch (error) {
			new Notice(`Error: ${error.message}`);
			console.error("Failed to open yesterday's note:", error);
		}
	}
}

class YesterdayNoteSettingTab extends PluginSettingTab {
	plugin: YesterdayNotePlugin;
	app: ObsidianApp;

	constructor(app: ObsidianApp, plugin: YesterdayNotePlugin) {
		super(app, plugin);
		this.app = app;
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const dailyNotesFormat = this.plugin.getDailyNotesFormat();

		new Setting(containerEl)
			.setName("Date format")
			.setDesc(`Your current syntax looks like this: ${dailyNotesFormat}`)
			.addText((text) =>
				text
					.setPlaceholder(dailyNotesFormat)
					.setValue(this.plugin.settings.dateFormat || "")
					.onChange(async (value) => {
						const trimmedValue = value.trim();
						if (trimmedValue === "") {
							this.plugin.settings.dateFormat = null;
							await this.plugin.saveSettings();
							return;
						}

						if (moment().format(trimmedValue)) {
							this.plugin.settings.dateFormat = trimmedValue;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("File location")
			.setDesc("If created, yesterday's note will be placed here.")
			.addText((text) =>
				text
					.setPlaceholder("daily-notes/")
					.setValue(this.plugin.settings.folder)
					.onChange(async (value) => {
						this.plugin.settings.folder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template file location")
			.setDesc(
				"The path to the file you want to use as the template. Case sensitive and must be set manually."
			)
			.addText((text) =>
				text
					.setPlaceholder("templates/daily.md")
					.setValue(this.plugin.settings.template)
					.onChange(async (value) => {
						this.plugin.settings.template = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-create Yesterday's Note")
			.setDesc(
				"Automatically create yesterday's daily note if it doesn't exist."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCreateYesterday)
					.onChange(async (value) => {
						this.plugin.settings.autoCreateYesterday = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
