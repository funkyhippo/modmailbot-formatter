# Modmail Bot Formatter

This is a formatter for the generated logs, using [ejs](https://ejs.co/) and [Bulma](https://bulma.io/) for templating and styling.

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

## Caveats

In order to maintain some backward compatability, the `verbose=true` query parameter has been hijacked. If you ever use that view, **do not** use this plugin.

Setting your storage type as `attachment` will also nullify this plugin, returning the original plaintext.
