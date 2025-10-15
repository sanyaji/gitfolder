import * as vscode from 'vscode';
import { StorageManager } from './storageManager';
import { GitService } from './gitService';
import { GitFolderSCMProvider } from './scmProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('GitFolder extension is now active');

	const gitService = new GitService();
	const storageManager = new StorageManager(context);
	
	// Hide git SCM provider
	setTimeout(() => {
		const gitRepo = gitService.getRepository();
		if (gitRepo) {
			// Try to hide the default git SCM
			const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
			if (gitExtension) {
				const api = gitExtension.getAPI(1);
				// We can't actually remove it, but we can create our own that shows first
			}
		}
	}, 1000);
	
	// Create SCM provider (replaces git changes view)
	const scmProvider = new GitFolderSCMProvider(storageManager, gitService);
	context.subscriptions.push(scmProvider);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.createGroup', async () => {
			const groupName = await vscode.window.showInputBox({
				prompt: 'Enter group name',
				placeHolder: 'e.g., Local Changes, Feature A'
			});

			if (groupName) {
				await storageManager.createGroup(groupName);
				scmProvider.refresh();
				vscode.window.showInformationMessage(`Group "${groupName}" created`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.deleteGroup', async (item: any) => {
			if (item && item.type === 'group') {
				const confirm = await vscode.window.showWarningMessage(
					`Delete group "${item.label}"?`,
					'Yes', 'No'
				);

				if (confirm === 'Yes') {
					await storageManager.deleteGroup(item.groupId);
					scmProvider.refresh();
					vscode.window.showInformationMessage(`Group "${item.label}" deleted`);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.renameGroup', async (item: any) => {
			if (item && item.type === 'group') {
				const newName = await vscode.window.showInputBox({
					prompt: 'Enter new name',
					value: item.label
				});

				if (newName && newName !== item.label) {
					await storageManager.renameGroup(item.groupId, newName);
					scmProvider.refresh();
					vscode.window.showInformationMessage(`Group renamed to "${newName}"`);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.addFilesToGroup', async (item: any) => {
			if (item && item.type === 'group') {
				// Get git changes
				const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
				const git = gitExtension?.getAPI(1);

				if (!git || git.repositories.length === 0) {
					vscode.window.showErrorMessage('No git repository found');
					return;
				}

				const repo = git.repositories[0];
				const changes = repo.state.workingTreeChanges.concat(repo.state.indexChanges);

				if (changes.length === 0) {
					vscode.window.showInformationMessage('No changes to add');
					return;
				}

				// Show quick pick for file selection
				const items = changes.map((change: any) => ({
					label: change.uri.fsPath.replace(repo.rootUri.fsPath + '/', ''),
					uri: change.uri.fsPath,
					picked: false
				}));

				interface FileItem {
					label: string;
					uri: string;
					picked: boolean;
				}

				const selected = await vscode.window.showQuickPick(items, {
					canPickMany: true,
					placeHolder: 'Select files to add to group'
				}) as FileItem[] | undefined;

				if (selected && selected.length > 0) {
					for (const file of selected) {
						await storageManager.addFileToGroup(item.groupId, file.uri);
					}
					scmProvider.refresh();
					vscode.window.showInformationMessage(`Added ${selected.length} file(s) to "${item.label}"`);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.removeFileFromGroup', async (item: any) => {
			if (item && (item.type === 'file' || item.type === 'file-local')) {
				await storageManager.removeFileFromGroup(item.groupId, item.filePath);
				scmProvider.refresh();
				vscode.window.showInformationMessage('File removed from group');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.markAsLocal', async (item: any) => {
			if (item && item.type === 'file') {
				await storageManager.markFileAsLocal(item.groupId, item.filePath, true);
				scmProvider.refresh();
				vscode.window.showInformationMessage('Marked as local-only');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.unmarkAsLocal', async (item: any) => {
			if (item && item.type === 'file-local') {
				await storageManager.markFileAsLocal(item.groupId, item.filePath, false);
				scmProvider.refresh();
				vscode.window.showInformationMessage('Unmarked as local');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.openFile', async (item: any) => {
			if (item && (item.type === 'file' || item.type === 'file-local')) {
				const uri = vscode.Uri.file(item.filePath);
				await vscode.window.showTextDocument(uri);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.refresh', () => {
			scmProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.addToGroup', async (...args: any[]) => {
			const groups = await storageManager.getGroups();
			
			if (groups.length === 0) {
				const createNew = await vscode.window.showInformationMessage(
					'No groups exist. Create one?',
					'Yes', 'No'
				);
				if (createNew === 'Yes') {
					await vscode.commands.executeCommand('gitfolder.createGroup');
					return;
				}
				return;
			}

			// Get file URI from either tree item or SCM resource
			let fileUri: vscode.Uri | undefined;
			
			if (args[0]?.resourceUri) {
				// From SCM resource
				fileUri = args[0].resourceUri;
			} else if (args[0]?.filePath) {
				// From tree view item
				fileUri = vscode.Uri.file(args[0].filePath);
			}

			if (!fileUri) {
				return;
			}

			interface GroupItem {
				label: string;
				groupId: string;
			}

			const groupItems: GroupItem[] = groups.map((g: any) => ({
				label: g.name,
				groupId: g.id
			}));

			const selected = await vscode.window.showQuickPick(groupItems, {
				placeHolder: 'Select group to add file to'
			});

			if (selected) {
				await storageManager.addFileToGroup(selected.groupId, fileUri.fsPath);
				scmProvider.refresh();
				vscode.window.showInformationMessage(`Added to "${selected.label}"`);
			}
		})
	);

	// Add stage/unstage commands for SCM resources
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stage', async (...args: any[]) => {
			// Handle both array of resources and individual resources
			let resourceStates: vscode.SourceControlResourceState[] = [];
			
			if (args.length > 0) {
				if (Array.isArray(args[0])) {
					resourceStates = args[0];
				} else if (args[0]?.resourceUri) {
					resourceStates = args;
				}
			}

			if (resourceStates.length === 0) {
				vscode.window.showErrorMessage('No files to stage');
				return;
			}

			const uris = resourceStates.map(r => r.resourceUri);
			await gitService.stageFiles(uris);
			scmProvider.refresh();
			vscode.window.showInformationMessage(`Staged ${uris.length} file(s)`);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stageFile', async (item: any) => {
			if (item && (item.type === 'file' || item.type === 'file-local')) {
				await gitService.stageFile(vscode.Uri.file(item.filePath));
				vscode.window.showInformationMessage('File staged');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stageGroup', async (item: any) => {
			if (item && item.type === 'group') {
				const groups = await storageManager.getGroups();
				const group = groups.find((g: { id: string; name: string; files: any[] }) => g.id === item.groupId);
				if (group) {
					// Only stage non-local files
					const filesToStage = group.files
						.filter((f: { path: string; isLocal: boolean }) => !f.isLocal)
						.map((f: { path: string; isLocal: boolean }) => vscode.Uri.file(f.path));
					
					if (filesToStage.length > 0) {
						await gitService.stageFiles(filesToStage);
						vscode.window.showInformationMessage(`Staged ${filesToStage.length} file(s) from "${item.label}"`);
					} else {
						vscode.window.showInformationMessage('No files to stage (all marked as local-only)');
					}
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stageAll', async (resourceGroup: vscode.SourceControlResourceGroup) => {
			// Get group id from resource group
			const groupId = resourceGroup.id;
			
			if (groupId === '__ungrouped__') {
				// Stage all ungrouped
				const uris = resourceGroup.resourceStates.map(r => r.resourceUri);
				if (uris.length > 0) {
					await gitService.stageFiles(uris);
					scmProvider.refresh();
					vscode.window.showInformationMessage(`Staged ${uris.length} file(s)`);
				}
			} else {
				// Stage group (excluding local-only)
				const groups = await storageManager.getGroups();
				const group = groups.find((g: { id: string; name: string; files: any[] }) => g.id === groupId);
				if (group) {
					const filesToStage = group.files
						.filter((f: { path: string; isLocal: boolean }) => !f.isLocal)
						.map((f: { path: string; isLocal: boolean }) => vscode.Uri.file(f.path));
					
					if (filesToStage.length > 0) {
						await gitService.stageFiles(filesToStage);
						scmProvider.refresh();
						vscode.window.showInformationMessage(`Staged ${filesToStage.length} file(s) from group`);
					} else {
						vscode.window.showInformationMessage('No files to stage (all marked as local-only)');
					}
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.commit', async () => {
			const repo = gitService.getRepository();
			if (repo) {
				await vscode.commands.executeCommand('git.commit');
			}
		})
	);

	// Remove from group - back to Changes
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.removeFromGroup', async (...args: any[]) => {
			let resourceState = args[0];
			
			if (!resourceState?.resourceUri) {
				return;
			}

			const filePath = resourceState.resourceUri.fsPath;
			const groups = await storageManager.getGroups();
			
			// Find which group contains this file
			for (const group of groups) {
				const fileInGroup = group.files.find((f: any) => f.path === filePath);
				if (fileInGroup) {
					await storageManager.removeFileFromGroup(group.id, filePath);
					scmProvider.refresh();
					vscode.window.showInformationMessage(`Removed from "${group.name}"`);
					return;
				}
			}
		})
	);

	// Move to another group (drag & drop alternative)
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.moveToGroup', async (...args: any[]) => {
			let resourceState = args[0];
			
			if (!resourceState?.resourceUri) {
				return;
			}

			const filePath = resourceState.resourceUri.fsPath;
			const groups = await storageManager.getGroups();
			
			if (groups.length === 0) {
				vscode.window.showInformationMessage('No groups available');
				return;
			}

			// Find current group
			let currentGroupId: string | undefined;
			for (const group of groups) {
				if (group.files.find((f: any) => f.path === filePath)) {
					currentGroupId = group.id;
					break;
				}
			}

			// Show group picker (exclude current group)
			interface GroupItem {
				label: string;
				groupId: string;
			}

			const groupItems: GroupItem[] = groups
				.filter((g: any) => g.id !== currentGroupId)
				.map((g: any) => ({
					label: g.name,
					groupId: g.id
				}));

			if (groupItems.length === 0) {
				vscode.window.showInformationMessage('No other groups available');
				return;
			}

			const selected = await vscode.window.showQuickPick(groupItems, {
				placeHolder: 'Move to which group?'
			});

			if (selected) {
				// Remove from current group (if any)
				if (currentGroupId) {
					await storageManager.removeFileFromGroup(currentGroupId, filePath);
				}
				
				// Add to new group
				await storageManager.addFileToGroup(selected.groupId, filePath);
				scmProvider.refresh();
				vscode.window.showInformationMessage(`Moved to "${selected.label}"`);
			}
		})
	);
}

export function deactivate() {}
