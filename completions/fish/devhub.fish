# DevHub fish completion script

complete -c devhub -f

# Main commands
complete -c devhub -n '__fish_use_subcommand' -a list -d 'List all projects'
complete -c devhub -n '__fish_use_subcommand' -a info -d 'Show project details'
complete -c devhub -n '__fish_use_subcommand' -a open -d 'Open project in editor'
complete -c devhub -n '__fish_use_subcommand' -a git -d 'Git operations'
complete -c devhub -n '__fish_use_subcommand' -a deps -d 'Dependency management'
complete -c devhub -n '__fish_use_subcommand' -a batch -d 'Batch operations'
complete -c devhub -n '__fish_use_subcommand' -a export -d 'Export projects to file'
complete -c devhub -n '__fish_use_subcommand' -a import -d 'Import projects from file'
complete -c devhub -n '__fish_use_subcommand' -a check -d 'Health check'
complete -c devhub -n '__fish_use_subcommand' -a snapshot -d 'Environment snapshots'
complete -c devhub -n '__fish_use_subcommand' -a create -d 'Create new project'

# list options
complete -c devhub -n '__fish_seen_subcommand_from list' -l json -d 'JSON output'
complete -c devhub -n '__fish_seen_subcommand_from list' -l filter -d 'Filter by name'

# open options
complete -c devhub -n '__fish_seen_subcommand_from open' -l editor -d 'Specify editor' -xa 'cursor code webstorm'

# git actions
complete -c devhub -n '__fish_seen_subcommand_from git' -a pull -d 'Pull from remote'
complete -c devhub -n '__fish_seen_subcommand_from git' -a fetch -d 'Fetch all remotes'
complete -c devhub -n '__fish_seen_subcommand_from git' -a status -d 'Show git status'
complete -c devhub -n '__fish_seen_subcommand_from git' -a log -d 'Show recent commits'
complete -c devhub -n '__fish_seen_subcommand_from git' -a stash -d 'Stash changes'
complete -c devhub -n '__fish_seen_subcommand_from git' -a checkout -d 'Switch branch'

# deps actions
complete -c devhub -n '__fish_seen_subcommand_from deps' -a install -d 'Install dependencies'
complete -c devhub -n '__fish_seen_subcommand_from deps' -a update -d 'Update packages'
complete -c devhub -n '__fish_seen_subcommand_from deps' -a audit -d 'Security audit'

# batch actions
complete -c devhub -n '__fish_seen_subcommand_from batch' -a install -d 'Install all dependencies'
complete -c devhub -n '__fish_seen_subcommand_from batch' -a pull -d 'Pull all projects'
complete -c devhub -n '__fish_seen_subcommand_from batch' -a clean -d 'Clean all projects'
complete -c devhub -n '__fish_seen_subcommand_from batch' -a check -d 'Health check'

# export options
complete -c devhub -n '__fish_seen_subcommand_from export' -l output -d 'Output file' -r
complete -c devhub -n '__fish_seen_subcommand_from export' -l no-hooks -d 'Exclude hooks'

# import options
complete -c devhub -n '__fish_seen_subcommand_from import' -l file -d 'Input file' -r
complete -c devhub -n '__fish_seen_subcommand_from import' -l directory -d 'Target directory' -r
complete -c devhub -n '__fish_seen_subcommand_from import' -l parallel -d 'Parallel jobs' -r
complete -c devhub -n '__fish_seen_subcommand_from import' -l skip-hooks -d 'Skip hooks'
complete -c devhub -n '__fish_seen_subcommand_from import' -l dry-run -d 'Preview mode'

# snapshot actions
complete -c devhub -n '__fish_seen_subcommand_from snapshot' -a save -d 'Save snapshot'
complete -c devhub -n '__fish_seen_subcommand_from snapshot' -a restore -d 'Restore snapshot'
complete -c devhub -n '__fish_seen_subcommand_from snapshot' -a list -d 'List snapshots'
complete -c devhub -n '__fish_seen_subcommand_from snapshot' -a delete -d 'Delete snapshot'
complete -c devhub -n '__fish_seen_subcommand_from snapshot' -l name -d 'Snapshot name' -r

# create templates
complete -c devhub -n '__fish_seen_subcommand_from create' -a nextjs-app -d 'Next.js App Router'
complete -c devhub -n '__fish_seen_subcommand_from create' -a nextjs-pages -d 'Next.js Pages Router'
complete -c devhub -n '__fish_seen_subcommand_from create' -a vite-react -d 'Vite + React'
complete -c devhub -n '__fish_seen_subcommand_from create' -a vite-vue -d 'Vite + Vue'
complete -c devhub -n '__fish_seen_subcommand_from create' -a express -d 'Express API'
complete -c devhub -n '__fish_seen_subcommand_from create' -a hono -d 'Hono API'