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
		template: string;
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
	autoCreateYesterday: boolean;
}

const DEFAULT_SETTINGS: YesterdayNoteSettings = {
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

	getDailyNotesSettings(): {
		format: string;
		folder: string;
		template: string;
	} {
		const dailyNotes = (this.app as ObsidianApp).internalPlugins.plugins[
			"daily-notes"
		];
		if (!dailyNotes?.enabled) {
			new Notice("Daily Notes plugin is not enabled");
			throw new Error("Daily Notes plugin is not enabled");
		}

		return {
			format: dailyNotes.instance.options.format || "YYYY-MM-DD",
			folder: dailyNotes.instance.options.folder || "",
			template: dailyNotes.instance.options.template || "",
		};
	}

	async createNote(path: string, date: moment.Moment): Promise<TFile> {
		const { template } = this.getDailyNotesSettings();
		let content = "";

		if (template) {
			const templateFile = this.app.vault.getAbstractFileByPath(
				`${template}.md`
			);
			if (templateFile instanceof TFile) {
				content = await this.app.vault.cachedRead(templateFile);
				content = content.replace(/{{date:([^}]*)}}/g, (_, format) =>
					date.format(format)
				);
			}
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

	async openYesterdayNote() {
		try {
			const yesterday = moment().subtract(1, "day");
			const { format, folder } = this.getDailyNotesSettings();
			const formattedDate = yesterday.format(format);

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
				const leaf = this.app.workspace.getLeaf(false);
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

		new Setting(containerEl)
			.setName("Auto-create yesterday's note")
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
