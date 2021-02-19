module.exports = {
  // From https://github.com/Dragory/modmailbot/blob/ab501871ec569cc679c47bc1c82128c16864dfcf/src/data/constants.js
  // This isn't particularly portable but I would prefer not adding modmailbot as a dependency just
  // so I can extract the constants. TODO: PR into modmailbot the ability to expose constants
  THREAD_MESSAGE_TYPE: {
    SYSTEM: 1,
    CHAT: 2,
    FROM_USER: 3,
    TO_USER: 4,
    LEGACY: 5,
    COMMAND: 6,
    SYSTEM_TO_USER: 7,
    REPLY_EDITED: 8,
    REPLY_DELETED: 9,
  },
};
