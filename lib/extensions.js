/**
 * Replaces `\n` with `<br>`, `\t` with `&nbsp;&nbsp;`,
 * `@!element` with `<element>` and `@/element` with `</element>`
 * @returns string with replaced values
 */
String.prototype.htmlString = function (tabs = 2) {
  let formattedString = this;
  let spaces = [];

  for (let i = 0; i < tabs; i++) {
    spaces.push("&nbsp;")
  }

  const replacements = {
    "@!(\\w+)": "<$1>",
    "@/(\\w+)": "</$1>",
    "\t": spaces.join(""),
    "\n": "<br>"
  };

  for (const pattern in replacements) {
    const regex = new RegExp(pattern, "g");
    formattedString = formattedString.replace(regex, replacements[pattern]);
  }

  return formattedString;
};
