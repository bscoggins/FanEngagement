import os
import glob
import subprocess
import re
import sys

# Configuration
DOCS_DIR = "docs/product"
BACKLOG_FILE = "backlog.md"

def parse_frontmatter(content):
    """
    Parses the YAML-like frontmatter from the file content.
    Returns a tuple (metadata_dict, body_text).
    """
    # Match content between the first two '---' lines
    match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
    if not match:
        # No frontmatter found, return empty metadata and full content as body
        return {}, content
    
    frontmatter_raw = match.group(1)
    body = match.group(2).strip()
    
    metadata = {}
    for line in frontmatter_raw.split('\n'):
        line = line.strip()
        if not line or ':' not in line:
            continue
            
        key, value = line.split(':', 1)
        key = key.strip()
        value = value.strip()
        
        # Handle list values like labels: ["a", "b"]
        if value.startswith('[') and value.endswith(']'):
            # Remove brackets
            inner = value[1:-1]
            # Split by comma, handle quotes
            items = []
            if inner:
                parts = inner.split(',')
                for part in parts:
                    part = part.strip()
                    # Remove surrounding quotes
                    if (part.startswith('"') and part.endswith('"')) or \
                       (part.startswith("'") and part.endswith("'")):
                        part = part[1:-1]
                    items.append(part)
            metadata[key] = items
        else:
            # Remove surrounding quotes for string values
            if (value.startswith('"') and value.endswith('"')) or \
               (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            metadata[key] = value
                
    return metadata, body

def check_gh_installed():
    try:
        subprocess.run(["gh", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def issue_exists(title):
    """
    Checks if an issue with the exact title already exists.
    """
    try:
        # Search for issues with the title in the subject
        # Use a high limit to ensure we find it if it exists
        result = subprocess.run(
            ["gh", "issue", "list", "--search", f"{title} in:title", "--state", "all", "--json", "title", "--limit", "100"],
            capture_output=True, text=True, check=True
        )
        import json
        issues = json.loads(result.stdout)
        for issue in issues:
            if issue['title'] == title:
                return True
        return False
    except Exception as e:
        print(f"Warning: Could not check if issue exists: {e}")
        return False

def main():
    # Check for gh CLI
    if not check_gh_installed():
        print("Error: GitHub CLI ('gh') is not installed or not in PATH.")
        print("Please install it: https://cli.github.com/")
        sys.exit(1)

    # Get absolute path to docs dir
    # Assuming script is run from workspace root or scripts/ dir
    # We'll try to find the workspace root
    
    # If script is in scripts/, go up one level
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.dirname(script_dir)
    
    # Verify we are in the right place
    target_dir = os.path.join(workspace_root, DOCS_DIR)
    if not os.path.exists(target_dir):
        # Fallback: maybe we are running from root
        if os.path.exists(DOCS_DIR):
            target_dir = os.path.abspath(DOCS_DIR)
        else:
            print(f"Error: Could not find directory {DOCS_DIR}")
            sys.exit(1)

    print(f"Scanning {target_dir} for markdown files...")
    
    files = sorted(glob.glob(os.path.join(target_dir, "*.md")))
    
    count = 0
    skipped = 0
    
    for file_path in files:
        filename = os.path.basename(file_path)
        if filename == BACKLOG_FILE:
            continue
            
        print(f"Processing {filename}...")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"  Error reading file: {e}")
            continue
            
        metadata, body = parse_frontmatter(content)
        
        if not metadata or 'title' not in metadata:
            print(f"  Skipping: No 'title' found in frontmatter.")
            continue
            
        title = metadata['title']
        labels = metadata.get('labels', [])
        
        # Check for duplicates
        if issue_exists(title):
            print(f"  Skipping: Issue with title '{title}' already exists.")
            skipped += 1
            continue
            
        # Create issue
        cmd = ['gh', 'issue', 'create', '--title', title, '--body', body]
        for label in labels:
            cmd.extend(['--label', label])
            
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"  Success: Created issue {result.stdout.strip()}")
            count += 1
        except subprocess.CalledProcessError as e:
            print(f"  Error creating issue: {e.stderr}")

    print(f"\nDone. Created {count} issues. Skipped {skipped} existing issues.")

if __name__ == "__main__":
    main()
