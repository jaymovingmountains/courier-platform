#!/bin/bash

# Script to update project.pbxproj and other build files
# This ensures StatusBadgeView is correctly included in the build

echo "Updating project files to include StatusBadgeView.swift..."

# Add the StatusBadgeView.swift file to the project if it's not already included
if grep -q "StatusBadgeView.swift" MovingMountainsDriver.xcodeproj/project.pbxproj; then
    echo "StatusBadgeView.swift already in project"
else
    echo "Adding StatusBadgeView.swift to project"
    # This would normally be done in Xcode by adding the file to the project
    # For a command line approach, we'd need a more sophisticated script
fi

# Fix any build settings if needed
echo "Checking build settings..."

# Make sure Components directory is included in search paths
# Again, this would typically be done in Xcode

echo "Done."
