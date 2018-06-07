const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

// Predefined to be used for errors and information.
const messages = {
    enabled: "Smooth Typing has been enabled. Please restart the window.",
    disabled: "Smooth Typing has been disabled. Please restart the window.",
    alreadyEnabled: "Smooth Typing is already enabled.",
    alreadyDisabled: "Smooth Typing is not enabled.",
    enableFailed: "Enabling Smooth Typing failed. Check the debug console for details.",
    disableFailed: "Disabling Smooth Typing failed. Check the debug console for details.",
    needsAdmin: "VS Code needs to be started with Administrator permissions to enable Smooth Typing.",
};

// Paths and directoies to VS Code itself.
const appDirectory = path.dirname(require.main.filename);
const indexPath = appDirectory + "/vs/workbench/electron-browser/bootstrap/index.html";

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

// Function to reload the window, asks and displays a message if "message" is provided.
function reloadWindow(message = null) {
    if (message === null)
        vscode.window.showInformationMessage(message, {
            title: "Reload Window"
        }).then(reloadWindow);
    else
        vscode.commands.executeCommand("workbench.action.reloadWindow");
}

// Injects the template string into the VS Code index file, and returns true if successful.
function injectCursorStyle(duration) {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");
        indexHTML = indexHTML.replace("</head>",
            injectionTemplate.replace("{duration}", duration) + "\n\t</head>"
        );

        fs.writeFileSync(indexPath, indexHTML, "utf-8");

        return true;
    } catch (error) {
        console.warn(error);
        return false;
    }
}

// Uses "injectionPattern" to remove the injected template from the index file.
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

// Checks if the "injectionPattern" is present in the index file.
function checkInjection() {
    try {
        let indexHTML = fs.readFileSync(indexPath, "utf-8");
        return injectionPattern.test(indexHTML);
    } catch (error) {
        console.warn(error);
    }
}

// Command to enable Smooth Typing by injecting code into the index file.
function enableAnimation(check = true) {
    if (check && checkInjection()) {
        vscode.window.showInformationMessage(messages.alreadyEnabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");
    let success = injectCursorStyle(config.duration);

    if (success) reloadWindow(config.autoReload ? null : messages.enabled);
    else vscode.window.showErrorMessage(messages.enableFailed);
}

// Command to reverse "enableAnimation".
function disableAnimation(check = true) {
    if (check && !checkInjection()) {
        vscode.window.showInformationMessage(messages.alreadyDisabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");
    let success = removeCursorStyle();

    if (success) reloadWindow(config.autoReload ? null : messages.disabled);
    else vscode.window.showErrorMessage(messages.disableFailed);
}

// Disable and re-enable Smooth Typing, useful for after VS Code updates.
function reloadAnimation(check = false) {
    disableAnimation(check);
    enableAnimation(check);
}

function activate(context) {
    // On uncaught permission exceptions, display a warning to the user that they need admin rights.
    process.on("uncaughtException", error => {
        if (/ENOENT|EACCESS|EPERM/.test(error.code)) {
            vscode.window.showInformationMessage(messages.needsAdmin);
        }
    });

    // Subscribe all of the command functions to the corresponding contributions.
    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}

// Export the activate function to be called whenever the extension is initialized.
exports.activate = activate;
