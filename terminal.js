const root = query(".root");
const ENV_ROOT = "/";

function toPath(path_components) {
  return ENV_ROOT + path_components.join("/");
}

const DEFAULT_USER = "user";
const ROOT_HOME = toPath(["root"]);
const USER_HOME = toPath(["home", DEFAULT_USER]);
const versionInfo = {
  major: 1,
  minor: 0,
  revision: 1,
  beta: true,
  debug: true,
};

const fs = {
  root: ENV_ROOT,
  files: [
    ".",
    "secrets",
    "system",
    "bin",
    "shared",
    ".donotdeletethis"
  ]
}

const aliasMap = {
  "cls": "clear"
}

const env = {
  cwd: ROOT_HOME,
  username: "root",
  hostname: "web",
};

const state = {
  line: 0,
  history: [],
  running: true,
  exitCode: 0,
};

function buildVersionString() {
  let debug = versionInfo.debug ? "(DEBUG)" : "";
  let beta = versionInfo.beta ? "BETA" : "";
  let major = versionInfo.major;
  let minor = versionInfo.minor;
  let revision = versionInfo.revision;

  return `BlockTerm ${major}.${minor}.${revision} ${beta} ${debug}`;
}

function buildPromptString() {
  return `${env.username}@${env.hostname}:${env.cwd}#`;
}

function result(type, value) {
  return { type: type, value: value };
}

function formatDate(date) {
  let datePart = [date.getMonth() + 1, date.getDate(), date.getFullYear()]
    .map((n, i) => n.toString().padStart(i === 2 ? 4 : 2, "0"))
    .join("/");
  let timePart = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((n, _i) => n.toString().padStart(2, "0"))
    .join(":");
  return datePart + " " + timePart;
}

function newLine() {
  state.line++;
  root.appendChild(createInputBlock(buildPromptString(), "", state.line));
  disablePrevInput();

  fromId(`input-${state.line}`).focus();
}

function clearTerminal() {
  state.line = 0;
  root.innerHTML = "";
}

function scrollToBottom() {
  root.scrollTo(0, root.scrollHeight);
}

function createInputBlock(prompt, initial_value, input_id) {
  const html = `
        <div class="input-block block">
            <span class="prompt">${prompt}</span>
            <input type="text" class="user-input" id="input-${input_id}" placeholder="..." value="${initial_value}" onkeypress="handleInputKeyPress(event)">
        </div>
        `;

  return new DOMParser().parseFromString(html, "text/html").body
    .firstElementChild;
}

function createImageBlock(url) {
  const html = `
        <div class="image-block block">
            <img src="${url}" alt="[Image Block]">            
        </div>
        `;

  return new DOMParser().parseFromString(html, "text/html").body
    .firstElementChild;
}

function createTextBlock(type, value) {
  let html = `<div class="text-block block">`;

  switch (type) {
    case "error":
      html += `<span class="error">${value}</span>`;
      break;
    default:
      html += `<span class="text">${value}</span>`;
      break;
  }

  html += "</div>";
  return new DOMParser().parseFromString(html, "text/html").body
    .firstElementChild;
}

function handleInputKeyPress(event) {
  scrollToBottom();

  let input = fromId(`input-${state.line}`);
  if (event.key === "Enter") {
    let result = handleCommand(input.value);

    if (result == undefined) {
      appendBlock(createTextBlock("error", "Faulty command"));
      newLine();
      scrollToBottom();
      return;
    }

    if (result.type == "block") {
      appendBlock(result.value);
    } else {
      appendBlock(createTextBlock(result.type, result.value));
    }

    if (state.running) newLine();
    else postExit();

    scrollToBottom();
  }
}

function appendBlock(block) {
  root.appendChild(block);
}

function postExit() {
  fromId(`input-${state.line}`).disabled = true;
  document.title += ` [Exited with code ${state.exitCode}]`;
  document.body.classList.add("exited");
  root.classList.add("exited");
}

function disablePrevInput() {
  let prevInput = fromId(`input-${state.line - 1}`);
  if (prevInput && state.line > 0) prevInput.disabled = true;
}

const commands = {
  echo: {
    exec: args => {
      return result("text", args.join(" "));
    },
    desc: "Echoes back specified string",
    args: {
      string: "string to echo",
    },
  },
  eval: {
    exec: args => {
      try {
        let value = eval(args.join(" "));
        return result("text", value);
      } catch (error) {
        return result("error", error);
      }
    },
    desc: "Evaluates specified JavaScript",
    args: {
      code: "js code",
    },
  },
  exit: {
    exec: args => {
      state.running = false;
      state.exitCode = parseInt(args[0]) === NaN ? -1 : parseInt(args[0]);
      return result("text", `[Exit ${state.exitCode}]`);
    },
    desc: "Exits shell with specified code",
    args: {
      code: "exit code",
    },
  },
  loadimg: {
    exec: args => {
      return result("block", createImageBlock(args[0]));
    },
    desc: "Loads image from specified URL",
    args: {
      url: "URL to load",
    },
  },
  clear: {
    exec: _args => {
      clearTerminal();
      return result("success", "");
    },
    desc: "Clears the screen",
    args: {},
  },
  date: {
    exec: _args => {
      return result("text", formatDate(new Date()));
    },
    desc: "Shows the date",
    args: {},
  },
  flipcoin: {
    exec: _args => {
      const side = Math.random() < 0.5 ? "Tails" : "Heads";

      return result("text", side);
    },
    desc: "Toss a coin",
    args: {},
  },
  pwd: {
    exec: _args => {
      return result("text", env.cwd);
    },
    desc: "Prints the working directory",
    args: {},
  },
  cd: {
    exec: args => {
      env.cwd = toPath(args);
      return result("empty", "");
    },
    desc: "Navigates to specified directory",
    args: {
      directory: "path to navigate to",
    },
  },
  ls: {
    exec: args => {
      if (args[0] == "-l") {
        return result("text", fs.files.join("\n".htmlString()));
      }

      return result("text", fs.files.join(" "));
    },
    desc: "Lists the files in the current directory",
    args: {},
  },
  mkdir: {
    exec: args => {
      fs.files.push(args)
      return result("empty", "");
    },
    desc: "Creates a directory",
    args: {
      directory: "path to create"
    },
  },
  rmdir: {
    exec: args => {
      fs.files = fs.files.filter(value => value !== args[0]);
      return result("empty", "");
    },
    desc: "Removes a directory",
    args: {
      directory: "path to remove"
    },
  },
  alias: {
    exec: args => {
      aliasMap[args[0]] = args[1];
      return result("text", `@!i ${args[0]} -> ${args[1]} @/i`.htmlString());
    },
    desc: "Creates an alias for the specified command",
    args: {
      "command": "target command",
      "alias": "command alias"
    },
  },
  dummy: {
    exec: _args => {
      return result("empty", "");
    },
    desc: "Dummy command used as a template to create new commands",
    args: {},
  },
  help: {
    exec: _args => {
      let help_string = `@!b ${buildVersionString()} @/b\n`.htmlString();

      for (const [key, _] of Object.entries(commands)) {
        let command = commands[key];
        let arguments = [];

        for (const [argument, argument_desc] of Object.entries(command.args)) {
          arguments.push(`[${argument}: ${argument_desc}]`);
        }

        let argument_str = arguments.join(" ")
        help_string += `\t@!b ${key} @/b ${argument_str}: ${command.desc}\n`.htmlString(2);
      }

      return result("text", help_string);
    },
    desc: "Shows this help info",
    args: {},
  },
};

function handleCommand(input) {
  let tokens = input.split(" ");
  let command = tokens[0];
  let args_length = tokens.length;

  if (aliasMap.hasOwnProperty(command)) {
    command = aliasMap[command];
  }

  if (input === "") return result("cancel", "");
  if (!(command in commands))
    return result("error", `Invalid command @!b ${command} @/b`.htmlString());

  if (command in commands) {
    let command_args_length = Object.keys(commands[command].args).length;

    if (command_args_length > 0 && args_length < 2) {
      const command_args = [];
      for (const [key, value] of Object.entries(commands[command].args)) {
        console.log(key, value);
        command_args.push(`@!b ${key} @/b: ${value}`.htmlString());
      }

      const required_args = command_args.join("\n\t".htmlString());
      return result(
        "error",
        `@!large@!white ${command} @/white@/large\n requires @!b ${command_args_length} @/b argument${command_args_length>1?"s":""}: \n\t${required_args}`.htmlString()
      );
    }

    let args = [...tokens];
    args.shift();

    return commands[command].exec(args);
  }

  return result("cancel", "");
}

newLine();
