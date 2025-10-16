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

	// Helper function: Generate commit message using Copilot
	async function generateCommitMessage(): Promise<string | undefined> {
		try {
			const repo = gitService.getRepository();
			if (!repo) {
				return undefined;
			}

			// Get staged changes diff
			const stagedChanges = repo.state.indexChanges;
			if (stagedChanges.length === 0) {
				vscode.window.showWarningMessage('No staged changes to generate commit message');
				return undefined;
			}

			// Build a summary of changes
			const fileList = stagedChanges.map((c: any) => {
				const fileName = c.uri.fsPath.split('/').pop();
				return `- ${fileName}`;
			}).join('\n');

			// Use language model API (Copilot)
			const models = await vscode.lm.selectChatModels({
				vendor: 'copilot',
				family: 'gpt-4o'
			});

			if (models.length === 0) {
				vscode.window.showWarningMessage('Copilot is not available');
				return undefined;
			}

			const model = models[0];
			
			const messages = [
				vscode.LanguageModelChatMessage.User(
					`Generate a concise git commit message for these file changes:\n${fileList}\n\nFollow conventional commit format (feat:, fix:, docs:, etc.). Be specific but brief. Return only the commit message, no explanations.`
				)
			];

			const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
			
			let commitMessage = '';
			for await (const chunk of response.text) {
				commitMessage += chunk;
			}

			return commitMessage.trim();
		} catch (error) {
			console.error('Error generating commit message:', error);
			vscode.window.showErrorMessage('Failed to generate commit message with Copilot');
			return undefined;
		}
	}

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
			try {
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
			} catch (error) {
				console.error('Error in gitfolder.stage:', error);
				vscode.window.showErrorMessage(`Failed to stage files: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stageFile', async (item: any) => {
			try {
				if (item && (item.type === 'file' || item.type === 'file-local')) {
					await gitService.stageFile(vscode.Uri.file(item.filePath));
					vscode.window.showInformationMessage('File staged');
				}
			} catch (error) {
				console.error('Error in gitfolder.stageFile:', error);
				vscode.window.showErrorMessage(`Failed to stage file: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stageGroup', async (item: any) => {
			try {
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
			} catch (error) {
				console.error('Error in gitfolder.stageGroup:', error);
				vscode.window.showErrorMessage(`Failed to stage group: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.stageAll', async (resourceGroup: vscode.SourceControlResourceGroup) => {
			try {
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
			} catch (error) {
				console.error('Error in gitfolder.stageAll:', error);
				vscode.window.showErrorMessage(`Failed to stage files: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.commit', async () => {
			try {
				const repo = gitService.getRepository();
				if (!repo) {
					vscode.window.showErrorMessage('No git repository found');
					return;
				}

				// Check if there are staged changes
				const stagedChanges = gitService.getStagedChanges();
				if (stagedChanges.length === 0) {
					vscode.window.showInformationMessage('No staged changes to commit');
					return;
				}

				// Get commit message from SCM input box
				const scmInputBox = scmProvider.sourceControl.inputBox;
				const commitMessage = scmInputBox.value.trim();

				if (!commitMessage) {
					vscode.window.showWarningMessage('Please enter a commit message');
					await vscode.commands.executeCommand('workbench.view.scm');
					return;
				}

				// Perform commit
				await repo.commit(commitMessage);
				
				// Clear input box after successful commit
				scmInputBox.value = '';
				
				// Refresh to show updated state
				scmProvider.refresh();
				
				vscode.window.showInformationMessage(`Successfully committed ${stagedChanges.length} file(s)`);
			} catch (error) {
				console.error('Error in gitfolder.commit:', error);
				vscode.window.showErrorMessage(`Failed to commit: ${error}`);
			}
		})
	);

	// Generate commit message with Copilot
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.generateCommitMessage', async () => {
			try {
				const repo = gitService.getRepository();
				if (!repo) {
					vscode.window.showErrorMessage('No git repository found');
					return;
				}

				const stagedChanges = gitService.getStagedChanges();
				if (stagedChanges.length === 0) {
					vscode.window.showInformationMessage('No staged changes to generate commit message for');
					return;
				}

				// Show progress
				const generatedMessage = await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: "Generating commit message with AI...",
					cancellable: false
				}, async (progress) => {
					try {
						// Try to use Language Model API (Copilot)
						const message = await generateCommitMessage();
						if (message) {
							return message;
						}
						
						// Fallback to smart generation
						return await generateSmartCommitMessage(stagedChanges);
					} catch (error) {
						console.error('Error generating commit message:', error);
						// Fallback to smart generation
						return await generateSmartCommitMessage(stagedChanges);
					}
				});

				if (generatedMessage) {
					// Set the commit message in SCM input
					scmProvider.sourceControl.inputBox.value = generatedMessage;
					await vscode.commands.executeCommand('workbench.view.scm');
					vscode.window.showInformationMessage(`Generated: "${generatedMessage}"`);
				}

			} catch (error) {
				console.error('Error in gitfolder.generateCommitMessage:', error);
				vscode.window.showErrorMessage(`Failed to generate commit message: ${error}`);
			}
		})
	);

	// Helper function for smart commit message generation
	async function generateSmartCommitMessage(stagedChanges: any[]): Promise<string> {
		let commitType = 'feat';
		let description = '';

		// Analyze file patterns to determine commit type
		const hasTests = stagedChanges.some(c => c.uri.fsPath.includes('test') || c.uri.fsPath.includes('spec'));
		const hasDocs = stagedChanges.some(c => c.uri.fsPath.includes('README') || c.uri.fsPath.includes('.md'));
		const hasConfig = stagedChanges.some(c => c.uri.fsPath.includes('config') || c.uri.fsPath.includes('.json'));
		const hasPackage = stagedChanges.some(c => c.uri.fsPath.includes('package.json'));
		
		if (hasTests) {
			commitType = 'test';
		} else if (hasDocs) {
			commitType = 'docs';
		} else if (hasConfig || hasPackage) {
			commitType = 'chore';
		} else if (stagedChanges.length === 1) {
			const fileName = stagedChanges[0].uri.fsPath.split('/').pop()?.toLowerCase() || '';
			if (fileName.includes('fix') || fileName.includes('bug')) {
				commitType = 'fix';
			} else if (fileName.includes('style') || fileName.includes('css')) {
				commitType = 'style';
			}
		}

		// Generate description based on number of files
		if (stagedChanges.length === 1) {
			const fileName = stagedChanges[0].uri.fsPath.split('/').pop();
			description = `update ${fileName}`;
		} else if (hasTests) {
			description = `add/update tests`;
		} else if (hasDocs) {
			description = `update documentation`;
		} else if (hasPackage) {
			description = `update dependencies`;
		} else {
			description = `update ${stagedChanges.length} files`;
		}

		return `${commitType}: ${description}`;
	}

	// Unstage commands
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.unstage', async (...args: any[]) => {
			try {
				let resourceStates: vscode.SourceControlResourceState[] = [];
				
				if (args.length > 0) {
					if (Array.isArray(args[0])) {
						resourceStates = args[0];
					} else if (args[0]?.resourceUri) {
						resourceStates = args;
					}
				}

				if (resourceStates.length === 0) {
					vscode.window.showErrorMessage('No files to unstage');
					return;
				}

				const uris = resourceStates.map(r => r.resourceUri);
				await gitService.unstageFiles(uris);
				scmProvider.refresh();
				vscode.window.showInformationMessage(`Unstaged ${uris.length} file(s)`);
			} catch (error) {
				console.error('Error in gitfolder.unstage:', error);
				vscode.window.showErrorMessage(`Failed to unstage files: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.unstageAll', async (resourceGroup: vscode.SourceControlResourceGroup) => {
			try {
				if (resourceGroup.id === '__staged__') {
					const uris = resourceGroup.resourceStates.map(r => r.resourceUri);
					if (uris.length > 0) {
						await gitService.unstageFiles(uris);
						scmProvider.refresh();
						vscode.window.showInformationMessage(`Unstaged ${uris.length} file(s)`);
					}
				}
			} catch (error) {
				console.error('Error in gitfolder.unstageAll:', error);
				vscode.window.showErrorMessage(`Failed to unstage files: ${error}`);
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

	// Open changes (diff view)
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.openChanges', async (...args: any[]) => {
			try {
				let resourceState = args[0];
				
				if (!resourceState?.resourceUri) {
					return;
				}

				const uri = resourceState.resourceUri;
				const repo = gitService.getRepository();
				
				if (!repo) {
					return;
				}

				// Get the git extension to use its URI helper
				const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
				if (!gitExtension) {
					vscode.window.showErrorMessage('Git extension not available');
					return;
				}

				const git = gitExtension.getAPI(1);
				
				// Create proper git URI for HEAD version
				const headUri = uri.with({
					scheme: 'git',
					path: uri.path,
					query: JSON.stringify({
						path: uri.fsPath,
						ref: 'HEAD'
					})
				});

				// Open diff view
				const title = `${uri.fsPath.split('/').pop()} (Working Tree)`;
				await vscode.commands.executeCommand('vscode.diff', 
					headUri,
					uri,
					title
				);
			} catch (error) {
				console.error('Error opening changes:', error);
				vscode.window.showErrorMessage(`Failed to open changes: ${error}`);
			}
		})
	);

	// Open file (override default to open in editor)
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.openFile', async (...args: any[]) => {
			try {
				let resourceState = args[0];
				
				if (!resourceState?.resourceUri) {
					return;
				}

				await vscode.window.showTextDocument(resourceState.resourceUri);
			} catch (error) {
				console.error('Error opening file:', error);
				vscode.window.showErrorMessage(`Failed to open file: ${error}`);
			}
		})
	);

	// Discard changes
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.discardChanges', async (...args: any[]) => {
			try {
				let resourceStates: vscode.SourceControlResourceState[] = [];
				
				if (args.length > 0) {
					if (Array.isArray(args[0])) {
						resourceStates = args[0];
					} else if (args[0]?.resourceUri) {
						resourceStates = args;
					}
				}

				if (resourceStates.length === 0) {
					vscode.window.showErrorMessage('No files to discard');
					return;
				}

				// Confirm discard
				const fileNames = resourceStates.map(r => r.resourceUri.fsPath.split('/').pop()).join(', ');
				const confirm = await vscode.window.showWarningMessage(
					`Are you sure you want to discard changes in ${resourceStates.length} file(s)?\n${fileNames}`,
					{ modal: true },
					'Discard Changes'
				);

				if (confirm !== 'Discard Changes') {
					return;
				}

				const uris = resourceStates.map(r => r.resourceUri);
				await gitService.discardAllChanges(uris);
				scmProvider.refresh();
				vscode.window.showInformationMessage(`Discarded changes in ${uris.length} file(s)`);
			} catch (error) {
				console.error('Error discarding changes:', error);
				vscode.window.showErrorMessage(`Failed to discard changes: ${error}`);
			}
		})
	);

	// Show branch picker
	context.subscriptions.push(
		vscode.commands.registerCommand('gitfolder.showBranchPicker', async () => {
			try {
				const repo = gitService.getRepository();
				if (!repo) {
					vscode.window.showErrorMessage('No git repository found');
					return;
				}

				// Get all branches
				const branches = repo.state.refs || [];
				const currentBranch = repo.state.HEAD?.name;

				if (branches.length === 0) {
					vscode.window.showInformationMessage('No branches found');
					return;
				}

				interface BranchItem {
					label: string;
					description?: string;
					branchName: string;
				}

				const branchItems: BranchItem[] = branches.map((ref: any) => ({
					label: ref.name === currentBranch ? `$(check) ${ref.name}` : ref.name || 'unknown',
					description: ref.name === currentBranch ? 'Current branch' : ref.commit?.substring(0, 7),
					branchName: ref.name || ''
				}));

				const selected = await vscode.window.showQuickPick(branchItems, {
					placeHolder: `Current: ${currentBranch}. Select branch to checkout`
				});

				if (selected && selected.branchName !== currentBranch) {
					await repo.checkout(selected.branchName);
					vscode.window.showInformationMessage(`Switched to branch: ${selected.branchName}`);
					scmProvider.refresh();
				}
			} catch (error) {
				console.error('Error in branch picker:', error);
				vscode.window.showErrorMessage(`Failed to switch branch: ${error}`);
			}
		})
	);
}

export function deactivate() {}
