# Yesterday's note

![yesterdays-note-thumbnail](https://github.com/user-attachments/assets/5f32374d-9efa-4e72-a306-4b267fb038a1)

This plugin adds a command to [Obsidian](https://obsidian.md) to open yesterday's daily note. If the note does not exist, the plugin can create it for you.

## Features
- Adds a ribbon icon which opens yesterday's daily note when clicked.
- Adds a command "Yesterday's note" which opens yesterday's daily note.
- Includes settings to:
	- Set a custom date format.
 	- Set the file location where yesterday's daily note is placed.
    - Use a template file for yesterday's daily note.
    - Toggle whether a new note should be created if yesterday's daily note does not exist.

## FAQ

**Why don't you use the "Open previous daily note" command?**

The `Open previous daily note` command is only available when a daily note is focused in the editor. This means to open yesterday's daily note, you must enter two commands: `Open today's daily note` -> `Open previous daily note`. Also, the two commands aren't exactly the same—one references the note for yesterday's date and the other references the note that comes before the current note.

**Why do I have to set the template file manually?**

Obsidian doesn't offer a way to directly retrieve the template file used for creating daily notes. Due to this limitation, the plugin can't automatically detect the template file so you need to set it manually.

**Yesterday's note isn't using the correct template file**

The Template file location is case sensitive. If the file you want to use is `templates/Daily.md`, `templates/daily.md` will throw an error. Please ensure the path and file name are correct.

## Issues

Open an issue in the [repository on GitHub](https://github.com/trevortylerlee/yesterdays-note/issues) or [get in touch](https://trevortylerlee.com).
