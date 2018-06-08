const vscode = require("vscode");
const sudo = require("sudo-prompt");
const path = require("path");
const tmp = require("tmp");
const fs = require("fs");


// Predefined to be used for errors and information.
const messages = {
    enabled: "Smooth Typing has been enabled. Please restart the window.",
    disabled: "Smooth Typing has been disabled. Please restart the window.",
    reloaded: "Smooth Typing has been reloaded. Please restart the window.",
    alreadyEnabled: "Smooth Typing is already enabled.",
    alreadyDisabled: "Smooth Typing is not enabled.",
    enableFailed: "Failed to enable Smooth Typing.",
    disableFailed: "Failed to disable Smooth Typing.",
    reloadFailed: "Failed to reload Smooth Typing."
};


// Paths and directoies to VS Code itself.
const appDirectory = path.dirname(require.main.filename);
const indexPath = path.join(appDirectory, "/vs/workbench/electron-browser/bootstrap/index.html");

// Comments to indicate where the injected code begins and ends.
const beginComment = "<!-- Begin SmoothType -->";
const endComment = "<!-- End SmoothType -->";

// Template for the injected code. "{duration}" is replaced with the user preference.
const injectionTemplate =
    "\n\t\t" + beginComment +
    "\n\t\t<style>.cursor { transition: all {duration}ms }</style>" +
    "\n\t\t" + endComment;

// Pattern to check if the code is injected.
const injectionPattern = new RegExp("\\s*" + beginComment + "(?:.|\\s)*" + endComment);


// Export the activate function to be called whenever the extension is initialized.
exports.activate = activate;

// Subscribe all of the command functions to the corresponding contributions.
function activate(context) {
    console.info("Application Directory: ", appDirectory);
    console.info("Application Index: ", indexPath);

    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}


function enableAnimation() {
    let config = vscode.workspace.getConfiguration("smoothtype");

    injectCursorStyle(config.duration).then(() => {
        if (config.autoReload) reloadWindow();
        else reloadWindow(messages.enabled);
    }, (reason) => {
        vscode.window.showWarningMessage(messages.enableFailed);
        console.error(messages.enableFailed, "\n", reason);
    });
}


function disableAnimation() {
    let config = vscode.workspace.getConfiguration("smoothtype");

    removeCursorStyle().then(() => {
        if (config.autoReload) reloadWindow();
        else reloadWindow(messages.disabled);
    }, (reason) => {
        vscode.window.showWarningMessage(messages.disableFailed);
        console.error(messages.disableFailed, "\n", reason);
    });
}


function reloadAnimation() { }


function injectCursorStyle(duration) {
    return new Promise((resolve, reject) => {
        fs.readFile(indexPath, "utf-8", (error, html) => {
            if (error) reject(error);
            else {
                html = html.replace("</head>",
                    injectionTemplate.replace("{duration}", duration) + "\n\t</head>");

                writeFileAdmin(
                    indexPath, html, "utf-8", "Visual Studio Code"
                ).then(resolve, reject);
            }
        });
    });
}


function removeCursorStyle() {
    return new Promise((resolve, reject) => {
        fs.readFile(indexPath, "utf-8", (error, html) => {
            if (error) reject(error);
            else {
                html = html.replace(injectionPattern, "");

                writeFileAdmin(
                    indexPath, html, "utf-8", "Visual Studio Code"
                ).then(resolve, reject);
            }
        });
    });
}


function writeFileAdmin(filePath, writeString, encoding = "utf-8", promptName = "File Writer") {
    return new Promise((resolve, reject) => {
        tmp.file((error, tempFilePath) => {
            if (error) reject(error);
            else fs.writeFile(tempFilePath, writeString, encoding, (error) => {
                if (error) reject(error);
                else sudo.exec(
                    (process.platform === "win32" ? "copy " : "cp ") +
                    "\"" + tempFilePath + "\" \"" + filePath + "\"",
                    { name: promptName },
                    (error) => {
                        if (error) reject(error);
                        else resolve(error);
                    }
                );
            });
        });
    });
}


function reloadWindow(message) {
    if (message === undefined) {
        console.info("Reloading window.");

        vscode.commands.executeCommand("workbench.action.reloadWindow");
    } else {
        console.info("Requesting to reload window.");

        vscode.window.showInformationMessage(message, {
            title: "Reload Window"
        }).then(clicked => {
            if (clicked) reloadWindow();
        });
    }
}
