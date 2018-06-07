const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const messages = {
    enabled: "Smooth Typing has been enabled. Please restart the window.",
    disabled: "Smooth Typing has been disabled. Please restart the window.",
    alreadyEnabled: "Smooth Typing is already enabled.",
    alreadyDisabled: "Smooth Typing is not enabled.",
    enableFailed: "Enabling Smooth Typing failed. Check the debug console for details.",
    disableFailed: "Disabling Smooth Typing failed. Check the debug console for details.",
    needsAdmin: "VS Code needs to be started with Administrator permissions to enable Smooth Typing.",
};

const appDirectory = path.dirname(require.main.filename);
const indexPath = appDirectory + "/vs/workbench/electron-browser/bootstrap/index.html";

const beginComment = "<!-- Begin SmoothType -->";
const endComment = "<!-- End SmoothType -->";


const insertTemplate =
    "\n\t\t" + beginComment +
    "\n\t\t<style>.cursor { transition: all {duration}ms }</style>" +
    "\n\t\t" + endComment;
const removePattern = new RegExp("\\s*" + beginComment + "(?:.|\\s)*" + endComment);

function reloadWindow(message = null) {
    if (message)
        vscode.window.showInformationMessage(message, {
            title: "Reload Window"
        }).then(() => vscode.commands.executeCommand("workbench.action.reloadWindow"));
    else
        vscode.commands.executeCommand("workbench.action.reloadWindow");
}

function injectCursorStyle(duration) {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");
        indexHTML = indexHTML.replace("</head>",
            insertTemplate.replace("{duration}", duration) + "\n\t</head>"
        );

        fs.writeFileSync(indexPath, indexHTML, "utf-8");

        return true;
    } catch (error) {
        console.warn(error);
        return false;
    }
}

function removeCursorStyle() {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");
        indexHTML = indexHTML.replace(removePattern, "");

        fs.writeFileSync(indexPath, indexHTML, "utf-8");

        return true;
    } catch (error) {
        console.warn(error);
        return false;
    }
}

function checkEnabled() {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");
        return removePattern.test(indexHTML);
    } catch (error) {
        console.warn(error);
    }
}

function enableAnimation(check = true) {
    if (check && checkEnabled()) {
        vscode.window.showInformationMessage(messages.alreadyEnabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");
    let success = injectCursorStyle(config.duration);

    if (success) reloadWindow(config.autoReload ? null : messages.enabled);
    else vscode.window.showErrorMessage(messages.enableFailed);
}

function disableAnimation(check = true) {
    // if (check && !checkEnabled()) {
    //     vscode.window.showInformationMessage(messages.alreadyDisabled);
    //     return;
    // }

    let config = vscode.workspace.getConfiguration("smoothtype");
    let success = removeCursorStyle();

    if (success) reloadWindow(config.autoReload ? null : messages.enabled);
    else vscode.window.showErrorMessage(messages.disableFailed);
}

function reloadAnimation(check = false) {
    disableAnimation(check);
    enableAnimation(check);
}

function activate(context) {
    process.on("uncaughtException", error => {
        if (/ENOENT|EACCESS|EPERM/.test(error.code)) {
            vscode.window.showInformationMessage(messages.needsAdmin);
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}

exports.activate = activate;
