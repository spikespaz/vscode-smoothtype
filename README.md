# SmoothType for Visual Studio Code

**This extension adds a smooth typing animation,
similar to MS Office and the Windows 10 Mail app.**

[![Downloads](https://img.shields.io/vscode-marketplace/d/spikespaz.vscode-smoothtype.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=spikespaz.vscode-smoothtype)
[![Rating](https://img.shields.io/vscode-marketplace/r/spikespaz.vscode-smoothtype.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=spikespaz.vscode-smoothtype)

**Get it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=spikespaz.vscode-smoothtype).**

## Preview

![Preview #1 GIF](images/preview.gif)

## Commands

 * `Enable Smooth Typing`
 * `Disable Smooth Typing`
 * `Reload Smooth Typing`

If you're on linux, you will need to run VS Code as superuser.

To do this, use the following command (replacing `<username>` with your user home folder):

```bash
sudo code --user-data-dir=/home/<username>/.config/Code
```

On Windows, you can easily just right-click the VS Code launch icon or executable and select "Run as Administrator".

After starting the program with elevated priveleges, run the `Enable Smooth Typing` command from the Command Pallete.

## Configuration

```js
{
  // Duration in milliseconds for the cursor to travel from one character position (or line) to the next.
  "smoothtype.duration": 80,
  // Ask before restarting after a command is successfully run.
  "smoothtype.autoReload": false
}
```

After changing `smoothtype.duration`, you must run `Reload Smooth Typing`.

## Important

**After every update, the extension must either be reloaded or enabled again.**

You also have to restart Visual Studio Code after every reload or change.
