const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const moment = require("moment");
const helmet = require("helmet");
const {
  THREAD_MESSAGE_TYPE,
  COLOURS,
  THREAD_MESSAGE_TYPE_MAPPING,
} = require("./constants");

const TEMPLATE_FILENAME = "template.ejs";
const CONFIG_KEY = "formatterPlugin";

// Defaults are here
const COLOUR_MAPPINGS = {
  [THREAD_MESSAGE_TYPE.TO_USER]: COLOURS.grey,
  [THREAD_MESSAGE_TYPE.SYSTEM_TO_USER]: COLOURS.grey,
  [THREAD_MESSAGE_TYPE.REPLY_EDITED]: COLOURS.grey,
  [THREAD_MESSAGE_TYPE.REPLY_DELETED]: COLOURS.grey,
  [THREAD_MESSAGE_TYPE.FROM_USER]: COLOURS.dark,
  [THREAD_MESSAGE_TYPE.CHAT]: COLOURS.green,
  [THREAD_MESSAGE_TYPE.COMMAND]: COLOURS.blue,
  [THREAD_MESSAGE_TYPE.SYSTEM]: COLOURS.blue,
  [THREAD_MESSAGE_TYPE.LEGACY]: COLOURS.red,
};

module.exports = function ({ formats, webserver, config }) {
  const plaintextFormatter = formats.formatters.formatLog;
  const converter = new showdown.Converter();
  const sanitize = (string) => {
    return string
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  const convertCamelToTitleCase = (string) => {
    try {
      string = string.replace(/([A-Z])/g, " $1").trim();
      string = string.charAt(0).toUpperCase() + string.slice(1);
      return string;
    } catch (e) {
      return string;
    }
  };

  if (CONFIG_KEY in config) {
    for (const [messageType, colour] of Object.entries(
      config.formatterPlugin
    )) {
      let validMapping = true;
      if (!(messageType in THREAD_MESSAGE_TYPE_MAPPING)) {
        validMapping = false;
        console.log(
          `[Formatter Plugin] ${messageType} isn't a valid message type.`
        );
      }
      if (!(colour in COLOURS)) {
        validMapping = false;
        console.log(`[Formatter Plugin] ${colour} isn't a valid colour.`);
      }
      if (validMapping) {
        THREAD_MESSAGE_TYPE_MAPPING[messageType].forEach((mt) => {
          COLOUR_MAPPINGS[mt] = COLOURS[colour];
        });
      }
    }
  }

  const messageTypeMapping = {};

  for (const [humanReadableMessageType, messageTypeArray] of Object.entries(
    THREAD_MESSAGE_TYPE_MAPPING
  )) {
    messageTypeArray.forEach((messageType) => {
      messageTypeMapping[messageType] = convertCamelToTitleCase(
        humanReadableMessageType
      );
    });
  }

  // Rewrite the previous helmet instance so it's less restrictive
  // This is probably not recommended but we're rewriting the route stack
  // manually, so this could break in future updates. If issues arise, look here first.
  webserver.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  let helmetMiddleware = webserver._router.stack.pop();
  let oldHelmetIndex = webserver._router.stack.findIndex(
    (e) => e.name === helmetMiddleware.name
  );
  if (oldHelmetIndex !== -1) {
    webserver._router.stack[oldHelmetIndex] = helmetMiddleware;
  }

  formats.setLogFormatter((thread, threadMessages, opts = {}) => {
    try {
      if (Object.keys(opts).length === 0 || opts.verbose) {
        // We purposely avoid passing in the verbose flag since we're repurposing
        // it to return the plaintext log instead of the fancy one
        return plaintextFormatter(thread, threadMessages, {
          simple: opts.simple,
        });
      } else {
        const data = {
          title: `Modmail thread ${thread.thread_number} with ${thread.user_name}`,
          timestamp: `${moment.utc(thread.created_at).toISOString()}`,
        };

        const metadata = {
          "User ID": `${thread.user_id}`,
          "Account Age": null,
          Nickname: null,
          Joined: null,
          Roles: null,
        };
        const messageTypes = new Set();

        let ageRegex = /(?:account age[\s]*)(?:\*\*)(?<age>.+?)(?:\*\*)/gi;
        let nicknameRegex =
          /(?:nickname[\s]*)(?:\*\*)(?<nickname>.+?)(?:\*\*)/gi;
        let joinedRegex = /(?:joined[\s]*)(?:\*\*)(?<joined>.+?)(?:\*\*)/gi;
        let rolesRegex = /(?:roles[\s]*)(?:\*\*)(?<roles>.+?)(?:\*\*)/gi;

        // Logic borrowed from https://github.com/Dragory/modmailbot/blob/ab501871ec569cc679c47bc1c82128c16864dfcf/src/formatters.js#L213-L306
        let messages = threadMessages.map((message) => {
          messageTypes.add(messageTypeMapping[message.message_type]);

          if (message.message_type === THREAD_MESSAGE_TYPE.LEGACY) {
            return {
              content: message.body,
              header: "[LEGACY]",
              colour: COLOUR_MAPPINGS[message.message_type],
              type: message.message_type,
              type_mapping: messageTypeMapping[message.message_type],
            };
          }
          let payload = {
            header: "",
            content: "",
            colour: COLOUR_MAPPINGS[message.message_type],
            attachments: [],
            message_type: message.message_type,
            timestamp: `${moment.utc(message.created_at).toISOString()}`,
          };

          if (message.message_type === THREAD_MESSAGE_TYPE.FROM_USER) {
            payload.header += ` [FROM USER] ${message.user_name}`;
            payload.content += message.body;
          } else if (message.message_type === THREAD_MESSAGE_TYPE.TO_USER) {
            payload.header += ` [TO USER] ${message.user_name}`;

            if (message.use_legacy_format) {
              // Legacy format (from pre-2.31.0) includes the role and username in the message body, so serve that as is
              payload.content += message.body;
            } else if (message.is_anonymous) {
              if (message.role_name) {
                payload.header += `: (Anonymous) ${message.role_name}`;
                payload.content += message.body;
              } else {
                payload.header += ": (Anonymous) Moderator";
                payload.content += message.body;
              }
            } else {
              if (message.role_name) {
                payload.header += `: (${message.role_name}) ${message.user_name}`;
                payload.content += message.body;
              } else {
                payload.header += `: ${message.user_name}`;
                payload.content += message.body;
              }
            }
          } else if (message.message_type === THREAD_MESSAGE_TYPE.SYSTEM) {
            payload.header += " [BOT]";
            payload.content += message.body;
            if (metadata["Account Age"] === null) {
              let match = ageRegex.exec(message.body);
              if (match && match.groups) {
                metadata["Account Age"] = match.groups.age;
              }
            }
            if (metadata["Nickname"] === null) {
              let match = nicknameRegex.exec(message.body);
              if (match && match.groups) {
                metadata["Nickname"] = match.groups.nickname;
              }
            }
            if (metadata["Joined"] === null) {
              let match = joinedRegex.exec(message.body);
              if (match && match.groups) {
                metadata["Joined"] = match.groups.joined;
              }
            }
            if (metadata["Roles"] === null) {
              let match = rolesRegex.exec(message.body);
              if (match && match.groups) {
                metadata["Roles"] = match.groups.roles.split(", ");
              }
            }
          } else if (
            message.message_type === THREAD_MESSAGE_TYPE.SYSTEM_TO_USER
          ) {
            payload.header += " [BOT TO USER]";
            payload.content += message.body;
          } else if (message.message_type === THREAD_MESSAGE_TYPE.CHAT) {
            payload.header += ` [CHAT] ${message.user_name}`;
            payload.content += message.body;
          } else if (message.message_type === THREAD_MESSAGE_TYPE.COMMAND) {
            payload.header += ` [COMMAND] ${message.user_name}`;
            payload.content += message.body;
          } else if (
            message.message_type === THREAD_MESSAGE_TYPE.REPLY_EDITED
          ) {
            const originalThreadMessage = message.getMetadataValue(
              "originalThreadMessage"
            );
            payload.header += ` [REPLY EDITED] ${originalThreadMessage.user_name} edited reply ${originalThreadMessage.message_number}`;
            payload.content += `**Before:**\n${originalThreadMessage.body}`;
            payload.content += `\n\n**After:**\n${message.getMetadataValue(
              "newBody"
            )}`;
          } else if (
            message.message_type === THREAD_MESSAGE_TYPE.REPLY_DELETED
          ) {
            const originalThreadMessage = message.getMetadataValue(
              "originalThreadMessage"
            );
            payload.header += ` [REPLY DELETED] ${originalThreadMessage.user_name} deleted reply ${originalThreadMessage.message_number}`;
            payload.content += `${originalThreadMessage.body}`;
          } else {
            payload.header += ` [${message.user_name}]`;
            payload.content += message.body;
          }

          if (message.attachments.length) {
            payload.attachments = message.attachments;
          }

          if (message.small_attachments && message.small_attachments.length) {
            let deduplicatedSet = new Set([
              ...payload.attachments,
              ...message.small_attachments,
            ]);
            payload.attachments = [...deduplicatedSet];
          }

          payload.content = sanitize(payload.content);
          payload.content = converter.makeHtml(payload.content);
          payload.type_mapping = messageTypeMapping[message.message_type];

          return payload;
        });
        if (opts.simple) {
          messages = messages.filter((message) => {
            return (
              message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM &&
              message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM_TO_USER &&
              message.message_type !== THREAD_MESSAGE_TYPE.CHAT &&
              message.message_type !== THREAD_MESSAGE_TYPE.COMMAND
            );
          });
        }
        data.messages = messages;
        data.messageTypes = [...messageTypes];
        data.metadata = {};

        for (const [key, value] of Object.entries(metadata)) {
          if (value !== null) {
            data.metadata[key] = value;
          }
        }
        const templateContents = fs.readFileSync(
          path.join(__dirname, TEMPLATE_FILENAME),
          { encoding: "utf8" }
        );
        const fullResult = ejs.render(templateContents, data);
        return {
          content: fullResult,
          extra: {
            contentType: "text/html; charset=UTF-8",
          },
        };
      }
    } catch (e) {
      console.log(e);
      return plaintextFormatter(thread, threadMessages, opts);
    }
  });
};
