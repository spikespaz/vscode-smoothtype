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
    console.info("Index File Path: ", indexPath);

    context.subscriptions.push(vscode.commands.registerCommand("extension.enableAnimation", enableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.disableAnimation", disableAnimation));
    context.subscriptions.push(vscode.commands.registerCommand("extension.reloadAnimation", reloadAnimation));
}

// Writes text to a file, after requesting elevated permissions, and return success.
function writeFileAdmin(filePath, writeString) {
    let tempFilePath = tmp.fileSync().name;

    fs.writeFileSync(tempFilePath, writeString, "utf-8");

    sudo.exec(process.platform === "win32" ? "copy " : "cp " +
        tempFilePath + " " + filePath, { name: "Visual Studio Code" }
    );

    if (fs.readFileSync(filePath, "utf-8") === writeString)
        return true;
    else return false;
}

// Function to reload the window, asks and displays a message if "message" is provided.
function reloadWindow(message = null) {
    if (message === null) {
        console.info("Reloading window.");

        vscode.commands.executeCommand("workbench.action.reloadWindow");
    } else {
        console.info("Requesting to reload window.");

        vscode.window.showInformationMessage(message, {
            title: "Reload Window"
        }).then(clicked => {
            if (clicked !== undefined) reloadWindow();
        });
    }
}

// Injects the template string into the VS Code index file, and returns true if successful.
function injectCursorStyle(duration) {
    console.info("Injecting Smooth Typing style.");

    let indexHTML = fs.readFileSync(indexPath, "utf-8");
    indexHTML = indexHTML.replace("</head>",
        injectionTemplate.replace("{duration}", duration) + "\n\t</head>"
    );

    return writeFileAdmin(indexPath, indexHTML);
}

// Uses "injectionPattern" to remove the injected template from the index file.
function removeCursorStyle() {
    console.info("Removing Smooth Typing style.");

    let indexHTML = fs.readFileSync(indexPath, "utf-8");
    indexHTML = indexHTML.replace(injectionPattern, "");

    return writeFileAdmin(indexPath, indexHTML);
}

// Checks if the "injectionPattern" is present in the index file.
function checkInjection() {
    console.info("Checking if Smooth Typing styles are already injected.");

    let indexHTML = fs.readFileSync(indexPath, "utf-8");
    return injectionPattern.test(indexHTML);
}

// Command to enable Smooth Typing by injecting code into the index file.
function enableAnimation() {
    console.info("Enabling Smooth Typing animation.");

    if (checkInjection()) {
        console.warn(messages.alreadyEnabled);

        vscode.window.showWarningMessage(messages.alreadyEnabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");

    if (injectCursorStyle()) {
        console.info(messages.enabled);
        reloadWindow(config.autoReload ? null : messages.enabled);
    } else {
        console.error(messages.enableFailed);
        vscode.window.showErrorMessage(messages.enableFailed);
    }
}

// Command to reverse "enableAnimation".
function disableAnimation() {
    console.info("Disabling Smooth Typing animation.");

    if (!checkInjection()) {
        console.warn(messages.alreadyDisabled);

        vscode.window.showWarningMessage(messages.alreadyDisabled);
        return;
    }

    let config = vscode.workspace.getConfiguration("smoothtype");

    if (removeCursorStyle()) {
        console.info(messages.disabled);
        reloadWindow(config.autoReload ? null : messages.disabled);
    } else {
        console.error(messages.disableFailed);
        vscode.window.showErrorMessage(messages.disableFailed);
    }
}

// Disable and re-enable Smooth Typing, useful for after VS Code updates.
function reloadAnimation() {
    console.info("Reloading Smooth Typing animation.");

    let config = vscode.workspace.getConfiguration("smoothtype");

    if (checkInjection())
        if (!removeCursorStyle()) {
            console.error(messages.reloadFailed);
            vscode.window.showErrorMessage(messages.reloadFailed);

            return;
        }


    if (injectCursorStyle(config.duration)) {
        console.info(messages.reloaded);
        reloadWindow(config.autoReload ? null : messages.reloaded);
    } else {
        console.error(messages.reloadFailed);
        vscode.window.showErrorMessage(messages.reloadFailed);
    }

}
