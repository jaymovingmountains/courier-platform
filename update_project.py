#!/usr/bin/env python3
import os
import re
import hashlib
import subprocess

def generate_unique_id(s):
    """Generate a unique ID for a file path"""
    h = hashlib.md5(s.encode()).hexdigest()
    return f"1B{h[:6]}1B{h[6:12]}"

# Find all Swift files in the project excluding .build directory and Package.swift
output = subprocess.check_output(["find", ".", "-name", "*.swift", "-not", "-path", "./.build/*", "-not", "-path", "./Package.swift"])
swift_files = [f.strip()[2:] for f in output.decode().split("\n") if f.strip()]  # Remove "./" prefix

# Files already in the project
existing_files = ["App/MovingMountainsDriverApp.swift", "App/AppDelegate.swift", "App/SceneDelegate.swift"]
new_files = [f for f in swift_files if f not in existing_files]

# Read the project file
with open("project.pbxproj", "r") as f:
    project_data = f.read()

# New content to be added
file_references = []
build_files = []
model_files = []
view_files = []
viewmodel_files = []
service_files = []
utility_files = []
coredata_files = []

# Process all new files
for file_path in new_files:
    file_id = generate_unique_id(file_path)
    build_id = generate_unique_id(f"build-{file_path}")
    file_name = file_path.split("/")[-1]
    
    # Add file reference
    file_references.append(f'\t\t{file_id} /* {file_path} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = {file_name}; path = {file_path}; sourceTree = "<group>"; }};')
    
    # Add build file reference
    build_files.append(f'\t\t{build_id} /* {file_path} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_id} /* {file_path} */; }};')
    
    # Add to appropriate group
    group_entry = f'\t\t\t\t{file_id} /* {file_path} */,'
    if file_path.startswith("Models/"):
        model_files.append(group_entry)
    elif file_path.startswith("Views/"):
        view_files.append(group_entry)
    elif file_path.startswith("ViewModels/"):
        viewmodel_files.append(group_entry)
    elif file_path.startswith("Services/"):
        service_files.append(group_entry)
    elif file_path.startswith("Utilities/"):
        utility_files.append(group_entry)
    elif file_path.startswith("CoreData/"):
        coredata_files.append(group_entry)

# Update the project file content
modified_project = project_data

# Insert file references
file_ref_insertion_point = re.search(r'\/\* End PBXFileReference section \*\/', modified_project).start()
file_refs_text = "\n" + "\n".join(file_references)
modified_project = modified_project[:file_ref_insertion_point] + file_refs_text + modified_project[file_ref_insertion_point:]

# Insert build files
build_files_insertion_point = re.search(r'\/\* Begin PBXSourcesBuildPhase section \*\/', modified_project).start()
sources_section = re.search(r'1A1A1A051A1A1A1A1A1A1A05 \/\* Sources \*\/ = {[^}]+};', modified_project[build_files_insertion_point:])
if sources_section:
    sources_end = build_files_insertion_point + sources_section.end() - 2  # -2 to position before the closing bracket
    build_files_text = "\n" + "\n".join(build_files)
    modified_project = modified_project[:sources_end] + build_files_text + modified_project[sources_end:]

# Insert group files
def insert_group_files(group_identifier, files):
    global modified_project
    group_match = re.search(f'{group_identifier} \/\* [^*]+ \*\/ = {{[^}}]*}}', modified_project)
    if group_match and files:
        group_end = group_match.end() - 1  # -1 to position before the closing bracket
        files_text = "\n" + "\n".join(files)
        modified_project = modified_project[:group_end] + files_text + modified_project[group_end:]

# Insert files in each group
insert_group_files("1A1A1A0C1A1A1A1A1A1A1A0C", model_files)
insert_group_files("1A1A1A0D1A1A1A1A1A1A1A0D", view_files)
insert_group_files("1A1A1A0E1A1A1A1A1A1A0E", viewmodel_files)
insert_group_files("1A1A1A0F1A1A1A1A1A1A0F", service_files)
insert_group_files("1A1A1A101A1A1A1A1A1A10", utility_files)
insert_group_files("1A1A1A111A1A1A1A1A1A11", coredata_files)

# Write the updated project file
with open("project.pbxproj", "w") as f:
    f.write(modified_project)

print(f"Successfully updated project file with {len(new_files)} new files") 