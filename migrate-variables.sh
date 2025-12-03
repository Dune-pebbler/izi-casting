#!/bin/bash

# Script to migrate old SCSS variables to new semantic system
# Usage: ./migrate-variables.sh

FILES=$(find src/styles/components -name "*.scss")

for file in $FILES; do
  echo "Processing: $file"

  # Replace $black with var(--foreground)
  sed -i '' 's/\$black/var(--foreground)/g' "$file"

  # Replace $white with var(--surface)
  sed -i '' 's/\$white/var(--surface)/g' "$file"

  # Replace $gray-* with semantic equivalents (contextual replacement)
  sed -i '' 's/\$gray-50/var(--muted)/g' "$file"
  sed -i '' 's/\$gray-100/var(--muted)/g' "$file"
  sed -i '' 's/\$gray-200/var(--border)/g' "$file"
  sed -i '' 's/\$gray-300/var(--border)/g' "$file"
  sed -i '' 's/\$gray-400/var(--muted-foreground)/g' "$file"
  sed -i '' 's/\$gray-500/var(--foreground-muted)/g' "$file"
  sed -i '' 's/\$gray-600/var(--foreground-secondary)/g' "$file"
  sed -i '' 's/\$gray-700/var(--foreground)/g' "$file"
  sed -i '' 's/\$gray-800/var(--foreground)/g' "$file"
  sed -i '' 's/\$gray-900/var(--foreground)/g' "$file"

  # Replace $red-* with var(--destructive)
  sed -i '' 's/\$red-500/var(--destructive)/g' "$file"
  sed -i '' 's/\$red-600/var(--destructive)/g' "$file"
  sed -i '' 's/\$red-700/var(--destructive-active)/g' "$file"
done

echo "Migration complete!"
echo "Please review the changes and test the build."
