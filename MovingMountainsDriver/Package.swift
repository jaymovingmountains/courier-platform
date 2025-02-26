// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "MovingMountainsDriver",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "MovingMountainsDriver",
            targets: ["MovingMountainsDriver"]),
    ],
    dependencies: [
        .package(url: "https://github.com/evgenyneu/keychain-swift.git", from: "20.0.0")
    ],
    targets: [
        .target(
            name: "MovingMountainsDriver",
            dependencies: [
                .product(name: "KeychainSwift", package: "keychain-swift")
            ]),
        .testTarget(
            name: "MovingMountainsDriverTests",
            dependencies: ["MovingMountainsDriver"]),
    ]
) 