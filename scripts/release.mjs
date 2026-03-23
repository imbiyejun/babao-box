import { readFileSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

function readPkg() {
  return JSON.parse(readFileSync(pkgPath, 'utf-8'))
}

function writePkg(pkg) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Invalid bump type: ${type}`)
  }
}

function exec(cmd) {
  console.log(`  > ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

function hasUncommittedChanges() {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim()
  return status.length > 0
}

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
}

function prompt(rl, question) {
  return new Promise((res) => rl.question(question, res))
}

async function main() {
  const pkg = readPkg()
  const currentVersion = pkg.version
  const cliArg = process.argv[2]

  if (hasUncommittedChanges()) {
    console.error('\n✖ Working directory has uncommitted changes. Please commit or stash first.\n')
    process.exit(1)
  }

  const validTypes = ['major', 'minor', 'patch']
  let type = cliArg

  if (type && !validTypes.includes(type)) {
    console.error(`\n✖ Invalid bump type "${type}". Use: major | minor | patch\n`)
    process.exit(1)
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })

  try {
    if (!type) {
      console.log(`\n  Current version: v${currentVersion}\n`)
      console.log('  Select version bump type:\n')
      console.log(`    1) patch  → v${bump(currentVersion, 'patch')}`)
      console.log(`    2) minor  → v${bump(currentVersion, 'minor')}`)
      console.log(`    3) major  → v${bump(currentVersion, 'major')}`)
      console.log()

      const choice = await prompt(rl, '  Enter choice (1/2/3): ')
      type = { 1: 'patch', 2: 'minor', 3: 'major' }[choice.trim()]

      if (!type) {
        console.error('\n✖ Invalid choice\n')
        process.exit(1)
      }
    }

    const newVersion = bump(currentVersion, type)
    const tag = `v${newVersion}`
    const branch = getCurrentBranch()

    console.log()
    console.log(`  Bump type : ${type}`)
    console.log(`  Version   : v${currentVersion} → ${tag}`)
    console.log(`  Branch    : ${branch}`)
    console.log()

    const confirm = await prompt(rl, `  Confirm release ${tag}? (y/n): `)
    if (confirm.trim().toLowerCase() !== 'y') {
      console.log('\n  Cancelled.\n')
      process.exit(0)
    }

    console.log()

    pkg.version = newVersion
    writePkg(pkg)
    console.log(`  ✔ Updated package.json → ${newVersion}`)

    exec('git add package.json')
    exec(`git commit -m "release: ${tag}"`)
    exec(`git tag ${tag}`)
    exec(`git push origin ${branch} --tags`)

    console.log(`\n  ✔ Released ${tag} successfully!`)
    console.log(`  Tag pushed to origin. GitHub Actions will build the installers.\n`)
  } finally {
    rl.close()
  }
}

main().catch((err) => {
  console.error('\n✖ Release failed:', err.message, '\n')
  process.exit(1)
})
