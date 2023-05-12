#! /usr/bin/env node

import 'suppress-experimental-warnings';

import enquirer from 'enquirer'
import { exec, execSync } from 'child_process'
import path from 'path'

const __dirname = process.cwd()
const { prompt } = enquirer

/* List pnpm workspaces - https://github.com/pnpm/pnpm/issues/1519#issuecomment-1299922699 */
const workspacesObjects = await new Promise((resolve, reject) => {
  exec('pnpm m ls --json --depth=-1', (error, stdout, stderr) => {
    if (error) {
      reject(error)
      return;
    }
    if (stderr) {
      reject(error)
      return;
    }
    resolve(JSON.parse(stdout));
  });
})
const workspacesPath = workspacesObjects.map(object => path.relative(__dirname, object.path))

const workspacesGroups = workspacesPath.reduce((acc, path) => {
  if (!path.includes('/')) {
    if (path === '') {
      acc['root'] = ['']
    } else {
      acc[path] = ['']
    }
  } else {
    let [folder, name] = path.split('/');
    if (acc[folder]) {
      acc[folder].push(name);
    } else
      acc[folder] = [name];
  }
  return acc
}, {})

const workspaceChoices = Object.keys(workspacesGroups).reduce((acc, group, i, arr) => {
  if (i !== 0) {
    acc.push({ message: ` --- ${group.charAt(0).toUpperCase() + group.slice(1)} --- `, role: 'separator' })
  }
  if (group === 'root') {
    acc.push({ message: 'Root', value: '/' })
  } else {
    workspacesGroups[group].forEach(el => acc.push({ message: el, value: `/${group}/${el}` }))
  }
  return acc
}, [])

const { workspace } = await prompt({
  type: 'select',
  name: 'workspace',
  message: 'Select workspace to run',
  choices: workspaceChoices
})

let isRoot = false
if (workspace === '/') {
  isRoot = true
}

const pkg = await import(`${__dirname}${workspace}/package.json`, { assert: { type: 'json' } });


const { script } = await prompt({
  type: 'select',
  name: 'script',
  message: 'Select script to run',
  choices: Object.keys(pkg.default.scripts)
})

let cmd = `pnpm ${isRoot ? '' : `-F ${pkg.default.name}`} ${script}`

try {
  execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
} catch (err) {
  /* Not output error from this script */
}
