const vscode = require("vscode");
const sudo = require("sudo-prompt");
const path = require("path");
const tmp = require("tmp");
const fs = require("fs");


// Predefined to be used for errors and information.
const messages = {
    enableSuccess: "Smooth Typing has been enabled. Please restart the window.",
    disableSuccess: "Smooth Typing has been disabled. Please restart the window.",
    reloadSuccess: "Smooth Typing has been reloaded. Please restart the window.",
    enabledAlready: "Smooth Typing is already enabled.",
    disabledAlready: "Smooth Typing is not enabled.",
    enableFailed: "Failed to enable Smooth Typing.",
    disableFailed: "Failed to disable Smooth Typing.",
    reloadFailed: "Failed to reload Smooth Typing."
};


// Paths and directoies to VS Code itself.
const appDirectory = path.dirname(require.main.filename);
const cssPath = path.join(appDirectory, "/vs/workbench/workbench.main.css");

// Comments to indicate where the injected code begins and ends.
const beginComment = "/* Begin SmoothType */";
const endComment = "/* End SmoothType */";

// Template for the injected code. "{duration}" is replaced with the user preference.
const injectionTemplate =
    "\n" + beginComment +
    "\n.cursor { transition: all {duration}ms }" +
    "\n" + endComment;

// Pattern to check if the code is injected.
const injectionPattern = new RegExp("\\s*" + escapeRegExp(beginComment) + "(?:.|\\s)*" + escapeRegExp(endComment));


// Export the activate function to be called whenever the extension is initialized.
exports.activate = activate;

// Subscribe all of the command functions to the corresponding contributions.
function activate(context) {
    console.info("Application Directory: ", appDirectory);
    console.info("Application Main CSS: ", cssPath);

    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}


function enableAnimation() {
    if (!checkInjection()) {
        let config = vscode.workspace.getConfiguration("smoothtype");

        injectCursorStyle(config.duration).then(() => {
            if (config.autoReload) reloadWindow();
            else reloadWindow(messages.enableSuccess);
        }, (reason) => {
            vscode.window.showWarningMessage(messages.enableFailed);
            console.error(messages.enableFailed, "\n", reason);
        });
    } else {
        vscode.window.showInformationMessage(messages.enabledAlready);
        console.info(messages.enabledAlready);
    }
}


function disableAnimation() {
    if (checkInjection()) {
        let config = vscode.workspace.getConfiguration("smoothtype");

        removeCursorStyle().then(() => {
            if (config.autoReload) reloadWindow();
            else reloadWindow(messages.disableSuccess);
        }, (reason) => {
            vscode.window.showWarningMessage(messages.disableFailed);
            console.error(messages.disableFailed, "\n", reason);
        });
    } else {
        vscode.window.showInformationMessage(messages.disabledAlready);
        console.info(messages.disabledAlready);
    }
}


function reloadAnimation() {
    let config = vscode.workspace.getConfiguration("smoothtype");

    reloadCursorStyle(config.duration).then(() => {
        if (config.autoReload) reloadWindow();
        else reloadWindow(messages.reloadSuccess);
    }, (reason) => {
        vscode.window.showWarningMessage(messages.reloadFailed);
        console.error(messages.reloadFailed, "\n", reason);
    });
}

function injectCursorStyle(duration) {
    console.info("Injecting cursor styles.");

    return new Promise((resolve, reject) => {
        fs.readFile(cssPath, "utf-8", (error, css) => {
            if (error) reject(error);
            else {
                css += "\n" + injectionTemplate.replace("{duration}", duration);

                writeFileAdmin(
                    cssPath, css, "utf-8", "Visual Studio Code"
                ).then(resolve, reject);
            }
        });
    });
}


function removeCursorStyle() {
    console.info("Removing cursor styles.");

    return new Promise((resolve, reject) => {
        fs.readFile(cssPath, "utf-8", (error, css) => {
            if (error) reject(error);
            else {
                css = css.replace(injectionPattern, "");

                writeFileAdmin(
                    cssPath, css, "utf-8", "Visual Studio Code"
                ).then(resolve, reject);
            }
        });
    });
}


function reloadCursorStyle(duration) {
    console.info("Reloading cursor styles.");

    return new Promise((resolve, reject) => {
        fs.readFile(cssPath, "utf-8", (error, css) => {
            if (error) reject(error);

            if (checkInjection())
                css = css.replace(injectionPattern, "");

            css += "\n" + injectionTemplate.replace("{duration}", duration);

            writeFileAdmin(
                cssPath, css, "utf-8", "Visual Studio Code"
            ).then(resolve, reject);
        });
    });
}


function checkInjection() {
    console.info("Check if cursor styles are injected.");

    let mainCSS = fs.readFileSync(cssPath, "utf-8");
    let injected = injectionPattern.test(mainCSS);

    console.info(injected ? "Cursor styles are present." : "Cursor styles are missing.");

    return injected;
}


function writeFileAdmin(filePath, writeString, encoding = "utf-8", promptName = "File Writer") {
    console.info("Writing file with administrator priveleges.");

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


// https://stackoverflow.com/a/6969486/2512078
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
