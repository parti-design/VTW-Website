// Which commit this build came from, for <meta name="edit:commit">: the visual editor
// compares it with the commit it published to tell when the change is live.
//
// Coolify passes SOURCE_COMMIT as a Docker build argument when the resource has
// "Include Source Commit in Build" switched on (the Dockerfile forwards it). The Docker
// build has no .git (.dockerignore), so without it the tag is empty and the editor
// falls back to its typical deploy time. Local builds ask git.
import { execSync } from 'node:child_process'

function fromGit(): string {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

export const commit = process.env.SOURCE_COMMIT?.trim() || fromGit()
