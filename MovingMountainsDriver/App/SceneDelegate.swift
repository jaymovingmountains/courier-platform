import UIKit
import SwiftUI

class SceneDelegate: NSObject, UIWindowSceneDelegate {
    
    var window: UIWindow?
    
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let _ = (scene as? UIWindowScene) else { return }
        
        // Handle any deep links that were used to launch the app
        if let userActivity = connectionOptions.userActivities.first {
            self.scene(scene, continue: userActivity)
        }
        
        // Handle any URL that was used to launch the app
        if let url = connectionOptions.urlContexts.first?.url {
            handleDeepLink(url: url)
        }
    }
    
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        // Handle universal links
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let incomingURL = userActivity.webpageURL {
            print("Universal link received in scene: \(incomingURL)")
            handleDeepLink(url: incomingURL)
        }
    }
    
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Handle custom URL schemes
        guard let url = URLContexts.first?.url else { return }
        print("URL scheme received in scene: \(url)")
        handleDeepLink(url: url)
    }
    
    private func handleDeepLink(url: URL) {
        // Parse the URL to determine where to navigate
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return
        }
        
        // Extract path components
        let path = components.path
        
        // Same logic as in AppDelegate
        if path.starts(with: "/jobs/") {
            let jobId = String(path.dropFirst(6))
            print("Scene should navigate to job details for job ID: \(jobId)")
            // TODO: Set up navigation to the job details screen
        }
    }
    
    // Handle state restoration
    func stateRestorationActivity(for scene: UIScene) -> NSUserActivity? {
        // Return an activity that represents the current state of the app
        // This helps in restoring state when the app is relaunched
        let activity = NSUserActivity(activityType: "com.movingmountains.driver.restoration")
        activity.title = "State Restoration"
        // Add relevant state information to the activity's userInfo dictionary
        
        return activity
    }
} 