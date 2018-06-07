const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

// Predefined to be used for errors and information.
const messages = {
    enabled: "Smooth Typing has been enabled. Please restart the window.",
    disabled: "Smooth Typing has been disabled. Please restart the window.",
    reloaded: "Smooth Typing has been reloaded. Please restart the window.",
    alreadyEnabled: "Smooth Typing is already enabled.",
    alreadyDisabled: "Smooth Typing is not enabled.",
    enableFailed: "Failed to enable Smooth Typing. Make sure that VS Code is running as Administrator.",
    disableFailed: "Failed to disable Smooth Typing. Make sure that VS Code is running as Administrator.",
    reloadFailed: "Failed to reload Smooth Typing. Make sure that VS Code is running as Administrator."
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
    console.log(appDirectory);
    console.log(indexPath);

    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}

// Function to reload the window, asks and displays a message if "message" is provided.
function reloadWindow(message = null) {
    if (message === null)
        vscode.commands.executeCommand("workbench.action.reloadWindow");
    else vscode.window.showInformationMessage(message, {
        title: "Reload Window"
    }).then(clicked => {
        if (clicked !== undefined) reloadWindow();
    });
}

// Injects the template string into the VS Code index file, and returns true if successful.
function injectCursorStyle(duration) {
    let indexHTML = fs.readFileSync(indexPath, "utf-8");
    indexHTML = indexHTML.replace("</head>",
        injectionTemplate.replace("{duration}", duration) + "\n\t</head>"
    );

    fs.writeFileSync(indexPath, indexHTML, "utf-8");
}

// Uses "injectionPattern" to remove the injected template from the index file.
function removeCursorStyle() {
    let indexHTML = fs.readFileSync(indexPath, "utf-8");
    indexHTML = indexHTML.replace(injectionPattern, "");

    fs.writeFileSync(indexPath, indexHTML, "utf-8");
}

// Checks if the "injectionPattern" is present in the index file.
function checkInjection() {
    let indexHTML = fs.readFileSync(indexPath, "utf-8");
    return injectionPattern.test(indexHTML);
}

// Command to enable Smooth Typing by injecting code into the index file.
function enableAnimation() {
    if (checkInjection()) {
        vscode.window.showWarningMessage(messages.alreadyEnabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");

    try {
        injectCursorStyle(config.duration);
        reloadWindow(config.autoReload ? null : messages.enabled);
    } catch (error) {
        console.warn(error);
        vscode.window.showErrorMessage(messages.enableFailed);
    }
}

// Command to reverse "enableAnimation".
function disableAnimation() {
    if (!checkInjection()) {
        vscode.window.showWarningMessage(messages.alreadyDisabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");

    try {
        removeCursorStyle();
        reloadWindow(config.autoReload ? null : messages.disabled);
    } catch (error) {
        console.warn(error);
        vscode.window.showErrorMessage(messages.disableFailed);
    }
}

// Disable and re-enable Smooth Typing, useful for after VS Code updates.
function reloadAnimation() {
    let config = vscode.workspace.getConfiguration("smoothtype");

    try {
        if (checkInjection()) removeCursorStyle();
        injectCursorStyle(config.duration);
        reloadWindow(config.autoReload ? null : messages.reloaded);
    } catch (error) {
        console.warn(error);
        vscode.window.showErrorMessage(messages.reloadFailed);
    }
}
