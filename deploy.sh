#!/bin/bash

echo "🚀 Health App Deployment Helper"
echo "================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Run: git init"
    exit 1
fi

# Check if remote exists
if ! git remote | grep -q "origin"; then
    echo "⚠️  No remote repository configured."
    echo ""
    echo "Please run:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/hyunsook-health-app.git"
    echo ""
    echo "Replace YOUR_USERNAME with your GitHub username"
    exit 1
fi

# Add all files
echo "📦 Adding files..."
git add .

# Ask for commit message
echo ""
read -p "💬 Commit message (or press Enter for default): " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Update health app"
fi

# Commit
echo "💾 Committing changes..."
git commit -m "$commit_msg"

# Push
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Done! Railway will automatically deploy your changes."
echo "🌐 Check your Railway dashboard for deployment status."
