let vscode = require("vscode");
let fs = require("fs");
let path = require("path");

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

const injectionPattern = /\s*<!-- \[Begin SmoothType] -->(?:.|\s)*<!-- \[End SmoothType] -->/;
const injectionTemplate =
    "$1\t<!-- [Begin SmoothType] -->" +
    "$1\t<style>.cursor { transition: all {duration}ms; }</style>" +
    "$1\t<!-- [End SmoothType] -->$1</head>";

function reloadWindow(request = true) {
    if (request)
        vscode.window.showInformationMessage(messages.enabled, {
            title: "Reload Window"
        }).then(() => reloadWindow(false));
    else {
        vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
}

function injectCursorStyle(duration) {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");

        indexHTML = indexHTML.replace(/^(\s*)<\/head>/m,
            injectionTemplate.replace("{duration}", duration));

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
        indexHTML = indexHTML.replace(injectionPattern, "");
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
        return injectionPattern.test(indexHTML);
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

    if (success) reloadWindow(!config.autoReload);
    else vscode.window.showErrorMessage(messages.enableFailed);
}

function disableAnimation(check = true) {
    if (check && !checkEnabled()) {
        vscode.window.showInformationMessage(messages.alreadyDisabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");
    let success = removeCursorStyle();

    if (success) reloadWindow(!config.autoReload);
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
