const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const moment = require("moment");
const { THREAD_MESSAGE_TYPE } = require("./constants");

const TEMPLATE_FILENAME = "template.ejs";
const COLOUR_MAPPINGS = {
  [THREAD_MESSAGE_TYPE.SYSTEM]: "is-info",
  [THREAD_MESSAGE_TYPE.CHAT]: "is-success",
  [THREAD_MESSAGE_TYPE.FROM_USER]: "is-dark",
  [THREAD_MESSAGE_TYPE.TO_USER]: "is-dark",
  [THREAD_MESSAGE_TYPE.LEGACY]: "is-danger",
  [THREAD_MESSAGE_TYPE.COMMAND]: "is-info",
  [THREAD_MESSAGE_TYPE.SYSTEM_TO_USER]: "is-dark",
  [THREAD_MESSAGE_TYPE.REPLY_EDITED]: "",
  [THREAD_MESSAGE_TYPE.REPLY_DELETED]: "",
};

module.exports = function ({ formats }) {
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
          timestamp: `${moment(thread.created_at).format(
            "YYYY-MM-DD HH:mm:ss"
          )}. All times are UTC+0`,
        };
        const metadata = {
          "User ID": `${thread.user_id}`,
          "Account Age": null,
          Nickname: null,
          Joined: null,
          Roles: null,
        };
        let ageRegex = /(?:account age[\s]*)(?:\*\*)(?<age>.+?)(?:\*\*)/gi;
        let nicknameRegex = /(?:nickname[\s]*)(?:\*\*)(?<nickname>.+?)(?:\*\*)/gi;
        let joinedRegex = /(?:joined[\s]*)(?:\*\*)(?<joined>.+?)(?:\*\*)/gi;
        let rolesRegex = /(?:roles[\s]*)(?:\*\*)(?<roles>.+?)(?:\*\*)/gi;

        // Logic borrowed from https://github.com/Dragory/modmailbot/blob/ab501871ec569cc679c47bc1c82128c16864dfcf/src/formatters.js#L213-L306
        if (opts.simple) {
          threadMessages = threadMessages.filter((message) => {
            return (
              message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM &&
              message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM_TO_USER &&
              message.message_type !== THREAD_MESSAGE_TYPE.CHAT &&
              message.message_type !== THREAD_MESSAGE_TYPE.COMMAND
            );
          });
        }

        const messages = threadMessages.map((message) => {
          if (message.message_type === THREAD_MESSAGE_TYPE.LEGACY) {
            return {
              content: message.body,
              header: "[LEGACY]",
              colour: COLOUR_MAPPINGS[message.message_type],
            };
          }
          let payload = {
            header: `[${moment
              .utc(message.created_at)
              .format("YYYY-MM-DD HH:mm:ss")}]`,
            content: "",
            colour: COLOUR_MAPPINGS[message.message_type],
            attachments: [],
          };

          if (message.message_type === THREAD_MESSAGE_TYPE.FROM_USER) {
            payload.header += ` [FROM USER] [${message.user_name}]`;
            payload.content += message.body;
          } else if (message.message_type === THREAD_MESSAGE_TYPE.TO_USER) {
            payload.header += ` [TO USER] [${message.user_name}]`;

            if (message.use_legacy_format) {
              // Legacy format (from pre-2.31.0) includes the role and username in the message body, so serve that as is
              payload.content += message.body;
            } else if (message.is_anonymous) {
              if (message.role_name) {
                payload.header += ` (Anonymous) ${message.role_name}`;
                payload.content += message.body;
              } else {
                payload.header += " (Anonymous) Moderator";
                payload.content += message.body;
              }
            } else {
              if (message.role_name) {
                payload.header += ` (${message.role_name}) ${message.user_name}`;
                payload.content += message.body;
              } else {
                payload.header += ` ${message.user_name}`;
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
            payload.header += ` [CHAT] [${message.user_name}]`;
            payload.content += message.body;
          } else if (message.message_type === THREAD_MESSAGE_TYPE.COMMAND) {
            payload.header += ` [COMMAND] [${message.user_name}]`;
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

          payload.content = sanitize(payload.content);
          payload.content = converter.makeHtml(payload.content);

          return payload;
        });
        data.messages = messages;
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
