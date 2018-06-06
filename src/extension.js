var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var events = require("events");
var msg = require("./messages").messages;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var fileUrl = require("file-url");

function activate(context) {
	console.log("SmoothType is active!");

	process.on("uncaughtException", function (err) {
		if (/ENOENT|EACCES|EPERM/.test(err.code)) {
			vscode.window.showInformationMessage(msg.admin);
			return;
		}
	});

	var eventEmitter = new events.EventEmitter();
	var isWin = /^win/.test(process.platform);
	var appDir = path.dirname(require.main.filename);

	var base = appDir + (isWin ? "\\vs\\workbench" : "/vs/workbench");

	var htmlFile = base + (isWin ? "\\electron-browser\\bootstrap\\index.html" : "/electron-browser/bootstrap/index.html");
	var htmlFileBack = base + (isWin ? "\\electron-browser\\bootstrap\\index.html.bak-smoothtype" : "/electron-browser/bootstrap/index.bak-smoothtype");

	function httpGet(theUrl) {
		var xmlHttp = null;

		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", theUrl, false);
		xmlHttp.send(null);
		return xmlHttp.responseText;
	}

	function replaceCss() {
		var config = vscode.workspace.getConfiguration("vscode_smoothtype");
		console.log(config);
		if (!config || !config.duration) {
			vscode.window.showInformationMessage(msg.notconfigured);
			console.log(msg.notconfigured);
			fUninstall();
			return;
		};
		var injectHTML = "<style> .cursor { transition: all " + config.duration + "ms; } </style>";
		try {
			var html = fs.readFileSync(htmlFile, "utf-8");
			html = html.replace(/<!-- !! SmoothType CSS Start !! -->[\s\S]*?<!-- !! SmoothType CSS End !! -->/, "");

			if (config.policy) {
				html = html.replace(/<meta.*http-equiv="Content-Security-Policy".*>/, "");
			}

			html = html.replace(/(<\/html>)/,
				"<!-- !! SmoothType CSS Start !! -->" + injectHTML + "<!-- !! SmoothType CSS End !! --></html>");
			fs.writeFileSync(htmlFile, html, "utf-8");
			enabledRestart();
		} catch (e) {
			console.log(e);
		}
	}

	function timeDiff(d1, d2) {
		var timeDiff = Math.abs(d2.getTime() - d1.getTime());
		return timeDiff;
	}

	function hasBeenUpdated(stats1, stats2) {
		var dbak = new Date(stats1.ctime);
		var dor = new Date(stats2.ctime);
		var segs = timeDiff(dbak, dor) / 1000;
		return segs > 60;
	}

	function cleanCssInstall() {
		var c = fs.createReadStream(htmlFile).pipe(fs.createWriteStream(htmlFileBack));
		c.on("finish", function () {
			replaceCss();
		});
	}

	function installItem(bakfile, orfile, cleanInstallFunc) {
		fs.stat(bakfile, function (errBak, statsBak) {
			if (errBak) {
				// clean installation
				cleanInstallFunc();
			} else {
				// check htmlFileBack"s timestamp and compare it to the htmlFile"s.
				fs.stat(orfile, function (errOr, statsOr) {
					if (errOr) {
						vscode.window.showInformationMessage(msg.smthingwrong + errOr);
					} else {
						var updated = hasBeenUpdated(statsBak, statsOr);
						if (updated) {
							// some update has occurred. clean install
							cleanInstallFunc();
						}
					}
				});
			}
		});
	}

	function emitEndUninstall() {
		eventEmitter.emit("endUninstall");
	}

	function restoredAction(isRestored, willReinstall) {
		if (isRestored >= 1) {
			if (willReinstall) {
				emitEndUninstall();
			} else {
				disabledRestart();
			}
		}
	}

	function restoreBak(willReinstall) {
		var restore = 0;
		fs.unlink(htmlFile, function (err) {
			if (err) {
				vscode.window.showInformationMessage(msg.admin);
				return;
			}
			var c = fs.createReadStream(htmlFileBack).pipe(fs.createWriteStream(htmlFile));
			c.on("finish", function () {
				fs.unlink(htmlFileBack);
				restore++;
				restoredAction(restore, willReinstall);
			});
		});
	}

	function reloadWindow() {
		// reload vscode-window
		vscode.commands.executeCommand("workbench.action.reloadWindow");
	}

	function enabledRestart() {
		vscode.window.showInformationMessage(msg.enabled, { title: msg.restartIde })
			.then(function (msg) {
				reloadWindow();
			});
	}
	function disabledRestart() {
		vscode.window.showInformationMessage(msg.disabled, { title: msg.restartIde })
			.then(function (msg) {
				reloadWindow();
			});
	}

	// ####  main commands ######################################################

	function fInstall() {
		installItem(htmlFileBack, htmlFile, cleanCssInstall);
	}

	function fUninstall(willReinstall) {
		fs.stat(htmlFileBack, function (errBak, statsBak) {
			if (errBak) {
				if (willReinstall) {
					emitEndUninstall();
				}
				return;
			}
			fs.stat(htmlFile, function (errOr, statsOr) {
				if (errOr) {
					vscode.window.showInformationMessage(msg.smthingwrong + errOr);
				} else {
					restoreBak(willReinstall);
				}
			});
		});
	}

	function fUpdate() {
		eventEmitter.once("endUninstall", fInstall);
		fUninstall(true);
	}

	var installCustomCSS = vscode.commands.registerCommand("extension.enableAnimation", fInstall);
	var uninstallCustomCSS = vscode.commands.registerCommand("extension.disableAnimation", fUninstall);
	var updateCustomCSS = vscode.commands.registerCommand("extension.reloadAnimation", fUpdate);

	context.subscriptions.push(installCustomCSS);
	context.subscriptions.push(uninstallCustomCSS);
	context.subscriptions.push(updateCustomCSS);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
