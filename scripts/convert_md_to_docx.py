#!/usr/bin/env python3
import argparse
import os
import subprocess
import shutil
import sys
import glob

def check_pandoc():
    """Check if pandoc is installed and available in PATH."""
    if not shutil.which('pandoc'):
        print("Error: 'pandoc' is not installed or not in your PATH.")
        print("This script requires pandoc to convert Markdown to Word documents.")
        print("\nPlease install pandoc:")
        print("  macOS:   brew install pandoc")
        print("  Windows: choco install pandoc")
        print("  Linux:   sudo apt-get install pandoc")
        print("\nDownload page: https://pandoc.org/installing.html")
        sys.exit(1)

def convert_file(input_path):
    """Convert a single markdown file to docx."""
    if not input_path.lower().endswith('.md'):
        print(f"Skipping {input_path}: Not a markdown file.")
        return

    # Get directory and filename
    directory = os.path.dirname(input_path)
    filename = os.path.basename(input_path)
    filename_no_ext = os.path.splitext(filename)[0]
    
    # Create 'converted' subdirectory
    output_dir = os.path.join(directory, 'converted')
    os.makedirs(output_dir, exist_ok=True)

    # Determine output path
    output_path = os.path.join(output_dir, filename_no_ext + '.docx')
    
    print(f"Converting {input_path} -> {output_path}...")
    
    try:
        # Basic pandoc command
        # -f markdown: input format
        # -t docx: output format
        # -o: output file
        cmd = ['pandoc', input_path, '-f', 'markdown', '-t', 'docx', '-o', output_path]
        
        # Run pandoc
        subprocess.run(cmd, check=True)
        print(f"Success: Created {output_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error converting {input_path}: {e}")
    except Exception as e:
        print(f"Unexpected error on {input_path}: {e}")

def process_path(path):
    """Process a file or directory."""
    if os.path.isfile(path):
        convert_file(path)
    elif os.path.isdir(path):
        print(f"Scanning directory: {path}")
        # Find all .md files in the directory (non-recursive).
        md_files = glob.glob(os.path.join(path, "*.md"))
        if not md_files:
            print(f"No .md files found in {path}")
        for f in md_files:
            convert_file(f)
    else:
        print(f"Error: Path not found: {path}")

def main():
    parser = argparse.ArgumentParser(description="Convert Markdown files to MS Word (.docx) using pandoc.")
    parser.add_argument('paths', metavar='PATH', type=str, nargs='+',
                        help='Files or directories to convert')
    
    args = parser.parse_args()
    
    check_pandoc()
    
    for path in args.paths:
        process_path(path)

if __name__ == "__main__":
    main()
