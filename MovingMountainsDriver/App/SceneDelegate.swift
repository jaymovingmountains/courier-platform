import UIKit
import SwiftUI

class SceneDelegate: NSObject, UIWindowSceneDelegate {
    var window: UIWindow?
    
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        print("Scene will connect")
    }
    
    func sceneDidDisconnect(_ scene: UIScene) {
        print("Scene did disconnect")
    }
    
    func sceneDidBecomeActive(_ scene: UIScene) {
        print("Scene did become active")
    }
    
    func sceneWillResignActive(_ scene: UIScene) {
        print("Scene will resign active")
    }
    
    func sceneWillEnterForeground(_ scene: UIScene) {
        print("Scene will enter foreground")
    }
    
    func sceneDidEnterBackground(_ scene: UIScene) {
        print("Scene did enter background")
    }
} 