const config = require("./config.json");
const usage = require("./usage.js");
const checks = require("./checks");
const gets = require("./gets");
const post = require("./post");
const discord = require("./discord");
const twitter = require("./twitter");
const users = require("./users");

const tweet = (args, channel) => {
  const screenName = args[0];
  console.log(screenName);
  twitter
    .userTimeline({ screen_name: screenName })
    .then(function(tweets, error) {
      if (tweets.length < 1) {
        post.message(
          channel,
          "It doesn't look like " + screenName + " has any tweets... "
        );
        return;
      }
      let tweet = tweets[0];
      post.tweet(channel, tweet, true);
    })
    .catch(function(error) {
      post.message(
        channel,
        "Something went wrong fetching this user's last tweet, sorry! :c"
      );
      console.error(error);
    });
};

const start = (args, channel) => {
  let options = users.defaultOptions();
  let screenName = null;
  for (let arg of args) {
    if (arg.substring(0, 2) == "--") {
      let option = arg.substring(2);
      if (option === "notext") options.text = false;
    } else if (screenName == null) {
      screenName = arg;
    } else {
      post.message(channel, "Invalid argument: " + arg);
      return;
    }
  }
  if (!screenName) {
    post.message(channel, usage["start"]);
    return;
  }
  twitter
    .userLookup({ screen_name: screenName })
    .then(function(data) {
      post.message(
        channel,
        "I'm starting to get tweets from " +
          screenName +
          ", remember you can stop me at any time with `" +
          config.prefix +
          "stop " +
          screenName +
          "`"
      );
      let userId = data[0].id_str;
      // Re-register the stream if we didn't know the user before
      let redoStream = !users.collection.hasOwnProperty(userId);
      gets.add(channel, userId, screenName, options);
      if (redoStream) {
        twitter.createStream();
      }
      users.save();
    })
    .catch(function(error) {
      console.error(
        new Date() +
          ": Failed to find the user a client specified (" +
          screenName +
          "):"
      );
      console.error(error);
      post.message(channel, "I can't find a user by the name of " + screenName);
      return;
    });
};

const leave = (args, channel) => {
  let guild = null;
  if (args.length >= 1 && checks.isDm(null, channel)) {
    guild = discord.getGuild(args[0]);
  } else if (!checks.isDm(null, channel)) {
    guild = channel.guild;
  } else {
    post.message(channel, "No valid guild ID provided");
    return;
  }
  if (guild == undefined) {
    post.message(channel, "I couldn't find guild: " + args[0]);
    return;
  }
  // Leave the guild
  guild
    .leave()
    .then(g => {
      console.log(`Left the guild ${g}`);
      if (checks.isDm(author, channel))
        post.message(channel, `Left the guild ${g}`);
    })
    .catch(console.error);
};

const stop = (args, channel) => {
  const screenName = args[0];
  gets.rm(channel, screenName);
};

const list = (args, channel) => {
  users.list(channel);
};

const adminList = (args, channel) => {
  users.adminList(channel);
};

module.exports = {
  start: {
    function: start,
    checks: [
      {
        f: checks.isMod,
        badB: "You're not authorized to start fetching tweets!"
      },
      {
        f: checks.isNotDm,
        badB: "I can't post tweets automatically to DMs, I'm very sorry!"
      }
    ],
    minArgs: 1
  },
  stop: {
    function: stop,
    checks: [
      {
        f: checks.isMod,
        badB: "You're not authorized to stop fetching tweets!"
      }
    ],
    minArgs: 1
  },
  list: {
    function: list,
    checks: [],
    minArgs: 0
  },
  adminList: {
    function: adminList,
    checks: [
      {
        f: checks.isAdmin,
        badB: "Sorry, only my owner can use the adminList command!"
      },
      {
        f: checks.isDm,
        badB: "For user privacy reasons, this command is only allowed in DMs."
      }
    ]
  },
  tweet: {
    function: tweet,
    checks: [],
    minArgs: 1
  },
  leave: {
    function: leave,
    checks: [
      {
        f: checks.isAdmin,
        badB: "Sorry, only my owner can force me off a server"
      }
    ],
    minArgs: 0
  }
};