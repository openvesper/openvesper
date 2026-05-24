# Tools

## Access policy

Read access to GitHub via the bundled `github` plugin (uses `GITHUB_TOKEN`).
Mutating actions (commenting, closing, merging) require explicit user
approval through the gateway approval queue.

## Primary tools

- `github_list_prs` — open PRs on a repo
- `github_get_pr` — full PR detail (diff summary, reviews, CI)
- `github_list_issues` — open issues with filters
- `github_get_issue` — issue body + comments
- `github_list_commits` — recent commit history
- `github_compare_branches` — diff between two refs
- `github_list_workflows` — CI status
- `github_user_activity` — what a user has been doing
- `apply_patch` — propose local code changes after reviewing PR (read-only
  by default, requires approval to write)
- `web_search` — look up referenced linked issues, libraries, or errors

## Out of scope

- Merging, force-pushing, deleting branches — these are user decisions
- Pushing commits without approval
- Anything that requires a token with broader scope than read+issues
