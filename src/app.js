let vscode = require("vscode");
let fs = require("fs");
let path = require("path");
let events = require("events");

const messages = {
    needsAdmin: "VS Code needs to be started with Administrator permissions to enable Smooth Typing.",
    enabled: "Smooth Typing has been enabled. Please restart the window.",
    disabled: "Smooth Typing has been disabled. Please restart the window.",
    reloaded: "Smooth Typing has been enabled. Please restart the window.",
    alreadyEnabled: "Smooth Typing is already enabled.",
    enableFailed: "Enabling Smooth Typing failed. Check the debug console for details."
};

const appDirectory = path.dirname(require.main.filename);
const indexPath = appDirectory + "/vs/workbench/electron-browser/bootstrap/index.html";

const injectionPattern = /\s*<!-- \[Begin SmoothType] -->(?:.|\s)+<!-- \[End SmoothType] -->/;
const injectionTemplate =
    "$1\t<!-- [Begin SmoothType] -->" +
    "$1\t<style>.cursor { transition: all {duration}ms; }</style>"+
    "$1\t<!-- [End SmoothType] -->$1</head>";

function reloadWindow(request = true) {
    if (request)
        vscode.window.showInformationMessage(messages.enabled, {
            title: messages.needsRestart
        }).then(() => reloadWindow(false));
    else vscode.commands.executeCommand("workbench.action.reloadWindow");
}

function injectCursorStyle(duration) {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");

        indexHTML = indexHTML.replace(/^(\s*)<\/head>/m,
            "\n" + injectionTemplate.replace("{duration}", duration));

        fs.writeFileSync(indexPath, indexHTML, "urf-8");

        return true;
    } catch (error) {
        console.warn(error);

        return false;
    }
}

function enableAnimation() {
    let config = vscode.workspace.getConfiguration("smoothtype");

    if (checkAdministrator()) {
        let success = injectCursorStyle(config.duration);

        if (success) reloadWindow(config.autoReload);
        else vscode.window.showErrorMessage(messages.enableFailed);
    } else vscode.window.showWarningMessage(messages.needsAdmin);
}

function disableAnimation() { }

function reloadAnimation() { }

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}

function deactivate() {
    vscode.commands.executeCommand("extension.disableAnimation");
}

exports.activate = activate;
exports.deactivate = deactivate;
