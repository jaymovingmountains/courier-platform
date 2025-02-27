#!/usr/bin/swift

import Foundation

// Get the project file
let projectPath = "project.pbxproj"
guard let projectData = try? String(contentsOfFile: projectPath) else {
    print("Could not read project file")
    exit(1)
}

// This will be our updated project file content
var updatedProject = projectData

// Generate a unique ID (using a simple hash function for demonstration)
func generateUniqueID(from string: String) -> String {
    var hash = 0
    for char in string.utf8 {
        hash = ((hash << 5) &- hash) &+ Int(char)
    }
    let hexString = String(format: "%08X", abs(hash))
    return "1B\(hexString.prefix(6))1B\(hexString.suffix(6))"
}

// Get all Swift files in the project
let process = Process()
process.executableURL = URL(fileURLWithPath: "/usr/bin/find")
process.arguments = [".", "-name", "*.swift", "-not", "-path", "./.build/*", "-not", "-path", "./Package.swift"]

let pipe = Pipe()
process.standardOutput = pipe
try process.run()
process.waitUntilExit()

let data = pipe.fileHandleForReading.readDataToEndOfFile()
let output = String(data: data, encoding: .utf8)!
let swiftFiles = output.split(separator: "\n").filter { !$0.isEmpty }.map { String($0.dropFirst(2)) } // Remove the "./" prefix

// Files already in the project
let existingFiles = ["App/MovingMountainsDriverApp.swift", "App/AppDelegate.swift", "App/SceneDelegate.swift"]
let newFiles = swiftFiles.filter { !existingFiles.contains($0) }

// Find sections in the project file
guard let fileRefSection = projectData.range(of: "/* Begin PBXFileReference section */"),
      let endFileRefSection = projectData.range(of: "/* End PBXFileReference section */"),
      let sourceBuildSection = projectData.range(of: "/* Begin PBXSourcesBuildPhase section */"),
      let endSourceBuildSection = projectData.range(of: "/* End PBXSourcesBuildPhase section */"),
      let modelGroup = projectData.range(of: "1A1A1A0C1A1A1A1A1A1A1A0C /* Models */ = {"),
      let viewsGroup = projectData.range(of: "1A1A1A0D1A1A1A1A1A1A1A0D /* Views */ = {"),
      let viewModelsGroup = projectData.range(of: "1A1A1A0E1A1A1A1A1A1A0E /* ViewModels */ = {"),
      let servicesGroup = projectData.range(of: "1A1A1A0F1A1A1A1A1A1A0F /* Services */ = {"),
      let utilitiesGroup = projectData.range(of: "1A1A1A101A1A1A1A1A1A10 /* Utilities */ = {"),
      let coreDataGroup = projectData.range(of: "1A1A1A111A1A1A1A1A1A11 /* CoreData */ = {")
else {
    print("Could not find required sections in project file")
    exit(1)
}

// Find the closing braces for each group
func findClosingBrace(for startRange: Range<String.Index>, in string: String) -> String.Index? {
    var depth = 0
    var index = startRange.upperBound
    
    while index < string.endIndex {
        let char = string[index]
        if char == "{" {
            depth += 1
        } else if char == "}" {
            if depth == 0 {
                return index
            }
            depth -= 1
        }
        index = string.index(after: index)
    }
    
    return nil
}

guard let modelsGroupEnd = findClosingBrace(for: modelGroup, in: projectData),
      let viewsGroupEnd = findClosingBrace(for: viewsGroup, in: projectData),
      let viewModelsGroupEnd = findClosingBrace(for: viewModelsGroup, in: projectData),
      let servicesGroupEnd = findClosingBrace(for: servicesGroup, in: projectData),
      let utilitiesGroupEnd = findClosingBrace(for: utilitiesGroup, in: projectData),
      let coreDataGroupEnd = findClosingBrace(for: coreDataGroup, in: projectData)
else {
    print("Could not find closing braces for groups")
    exit(1)
}

// Find the appropriate group for each file
func groupForFile(_ file: String) -> (range: Range<String.Index>, end: String.Index) {
    if file.hasPrefix("Models/") {
        return (modelGroup, modelsGroupEnd)
    } else if file.hasPrefix("Views/") {
        return (viewsGroup, viewsGroupEnd)
    } else if file.hasPrefix("ViewModels/") {
        return (viewModelsGroup, viewModelsGroupEnd)
    } else if file.hasPrefix("Services/") {
        return (servicesGroup, servicesGroupEnd)
    } else if file.hasPrefix("Utilities/") {
        return (utilitiesGroup, utilitiesGroupEnd)
    } else if file.hasPrefix("CoreData/") {
        return (coreDataGroup, coreDataGroupEnd)
    } else {
        // Default to models group if no match
        return (modelGroup, modelsGroupEnd)
    }
}

// Generate file reference entries
var fileReferences = ""
var buildFiles = ""
var groupEntries: [Range<String.Index>: [String]] = [:]

for file in newFiles {
    let fileID = generateUniqueID(from: file)
    let buildID = generateUniqueID(from: "build-\(file)")
    
    // File reference entry
    fileReferences += "\t\t\(fileID) /* \(file) */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = \(file.components(separatedBy: "/").last!); sourceTree = \"<group>\"; };\n"
    
    // Build file entry
    buildFiles += "\t\t\(buildID) /* \(file) in Sources */ = {isa = PBXBuildFile; fileRef = \(fileID) /* \(file) */; };\n"
    
    // Group entry
    let group = groupForFile(file)
    if groupEntries[group.range] == nil {
        groupEntries[group.range] = []
    }
    groupEntries[group.range]?.append("\t\t\t\t\(fileID) /* \(file) */,\n")
}

// Update file references section
let fileReferencesInsertionPoint = endFileRefSection.lowerBound
updatedProject.insert(contentsOf: fileReferences, at: fileReferencesInsertionPoint)

// Update build files section
let buildFilesInsertionPoint = endSourceBuildSection.lowerBound
if let sourceBuildPhaseRange = updatedProject.range(of: "1A1A1A051A1A1A1A1A1A1A05 /* Sources */ = {", range: sourceBuildSection.lowerBound..<endSourceBuildSection.upperBound) {
    if let closingBrace = findClosingBrace(for: sourceBuildPhaseRange, in: updatedProject) {
        let insertionPoint = updatedProject.index(before: closingBrace)
        updatedProject.insert(contentsOf: buildFiles, at: insertionPoint)
    }
}

// Update group entries
for (groupRange, entries) in groupEntries {
    if let closingBrace = findClosingBrace(for: groupRange, in: updatedProject) {
        let insertionPoint = updatedProject.index(before: closingBrace)
        for entry in entries {
            updatedProject.insert(contentsOf: entry, at: insertionPoint)
        }
    }
}

// Write the updated project file
do {
    try updatedProject.write(toFile: projectPath, atomically: true, encoding: .utf8)
    print("Successfully updated project file with \(newFiles.count) new files")
} catch {
    print("Error writing updated project file: \(error)")
    exit(1)
} 