const COLOURS = {
  red: "is-danger",
  yellow: "is-warning",
  green: "is-success",
  blue: "is-info",
  purple: "is-link",
  teal: "is-primary",
  dark: "is-dark",
  grey: "",
};

// From https://github.com/Dragory/modmailbot/blob/ab501871ec569cc679c47bc1c82128c16864dfcf/src/data/constants.js
// This isn't particularly portable but I would prefer not adding modmailbot as a dependency just
// so I can extract the constants. TODO: PR into modmailbot the ability to expose constants
const THREAD_MESSAGE_TYPE = {
  SYSTEM: 1,
  CHAT: 2,
  FROM_USER: 3,
  TO_USER: 4,
  LEGACY: 5,
  COMMAND: 6,
  SYSTEM_TO_USER: 7,
  REPLY_EDITED: 8,
  REPLY_DELETED: 9,
};

const THREAD_MESSAGE_TYPE_MAPPING = {
  toUser: [
    THREAD_MESSAGE_TYPE.TO_USER,
    THREAD_MESSAGE_TYPE.SYSTEM_TO_USER,
    THREAD_MESSAGE_TYPE.REPLY_EDITED,
    THREAD_MESSAGE_TYPE.REPLY_DELETED,
  ],
  fromUser: [THREAD_MESSAGE_TYPE.FROM_USER],
  chat: [THREAD_MESSAGE_TYPE.CHAT],
  system: [THREAD_MESSAGE_TYPE.SYSTEM, THREAD_MESSAGE_TYPE.COMMAND],
  legacy: [THREAD_MESSAGE_TYPE.LEGACY],
};

module.exports = {
  COLOURS,
  THREAD_MESSAGE_TYPE,
  THREAD_MESSAGE_TYPE_MAPPING,
};
