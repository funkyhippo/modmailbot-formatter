# Modmail Bot Formatter

This is a formatter for the generated logs, using [ejs](https://ejs.co/) and [Bulma](https://bulma.io/) for templating and styling.

## Demo

[Here](https://funkyhippo.github.io/modmailbot-formatter/index.html).

## Installation

In your `config.ini`, add the following line:

```ini
plugins[] = npm:funkyhippo/modmailbot-formatter
```

Then restart your bot.

## Usage

Your logs will automatically be formatted, with colour-coded messages and formatted markdown.

### Getting plaintext logs

If you need the plaintext log for some reason (for example, to share without the extra styling), use the `verbose=true` query parameter. For example:

```
https://yourlogs.com/logs/00000c0-1111-2222-b333-112321aabbc?verbose=true
```

### Getting simple logs

This behaviour hasn't changed. You can still use `simple=true` to get the logs with just the log between the user and responder. Note that you can also combine this with `verbose=true` (`?simple=true&verbose=true`) to get the plaintext simple log.

### Changing chat colour mapping

The plugin currently recognizes the following colours:

- Red
- Yellow
- Green
- Blue
- Purple
- Teal
- Dark\*
- Grey\*

\* Dark and grey are the same in dark mode.

The message types are split into 5 different categories: `toUser`, `fromUser`, `chat`, `system`, and `legacy`. The default colours are:

| **Type** | **Colour** |
| -------- | ---------- |
| toUser   | grey       |
| fromUser | dark       |
| chat     | green      |
| system   | blue       |
| legacy   | red        |

You can change the default mappings in your `config.ini` file, under the `formatterPlugin` configuration.

For example, if you wanted to make all your messages green, your modmailbot's `config.ini` might look like this:

```ini
formatterPlugin.toUser = green
formatterPlugin.fromUser = green
formatterPlugin.chat = green
formatterPlugin.system = green
formatterPlugin.legacy = green
```

Or if you wanted to change your chat colours to red, you can add the following line to your config:

```ini
formatterPlugin.chat = red
```

And so on.

## Caveats

In order to maintain some backward compatability, the `verbose=true` query parameter has been hijacked. If you ever use that view, **do not** use this plugin.

Setting your storage type as `attachment` will also nullify this plugin, returning the original plaintext.
