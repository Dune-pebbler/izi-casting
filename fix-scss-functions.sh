#!/bin/bash

# Fix SCSS functions that can't work with CSS custom properties
FILES=$(find src/styles/components -name "*.scss")

for file in $FILES; do
  echo "Processing: $file"

  # Replace darken($primary, X%) with appropriate hover/active states
  sed -i '' 's/darken(\$primary, 5%)/var(--primary-hover)/g' "$file"
  sed -i '' 's/darken(\$primary, 8%)/var(--primary-hover)/g' "$file"
  sed -i '' 's/darken(\$primary, 10%)/var(--primary-active)/g' "$file"
  sed -i '' 's/darken(\$primary, 12%)/var(--primary-active)/g' "$file"
  sed -i '' 's/darken(\$primary, 15%)/var(--primary-active)/g' "$file"

  # Replace darken with color aliases
  sed -i '' 's/darken(\$primary-color, 10%)/var(--primary-active)/g' "$file"
  sed -i '' 's/darken(\$danger, [0-9]*%)/var(--destructive-hover)/g' "$file"
  sed -i '' 's/darken(\$error, [0-9]*%)/var(--destructive-hover)/g' "$file"

  # Replace rgba($danger, ...) and rgba($error, ...)
  sed -i '' 's/rgba(\$danger, 0\.1)/var(--destructive-light)/g' "$file"
  sed -i '' 's/rgba(\$danger, 0\.15)/var(--destructive-light)/g' "$file"
  sed -i '' 's/rgba(\$danger, 0\.2)/var(--destructive-light)/g' "$file"
  sed -i '' 's/rgba(\$error, 0\.1)/var(--destructive-light)/g' "$file"
  sed -i '' 's/rgba(\$error, 0\.15)/var(--destructive-light)/g' "$file"
  sed -i '' 's/rgba(\$error, 0\.2)/var(--destructive-light)/g' "$file"
done

echo "SCSS functions fixed!"
