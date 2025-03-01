import SwiftUI

/**
 * LogoView component for the Driver App
 * Displays the Moving Mountains Logo with optional branding text
 */
struct LogoView: View {
    // Size customization
    var height: CGFloat = 40
    var showText: Bool = true
    var textColor: Color = .primary
    
    var body: some View {
        HStack(spacing: 12) {
            // Logo image with system icon fallback
            Group {
                // Try UIImage to check if asset exists
                if UIImage(named: "AppLogo") != nil {
                    Image("AppLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } else if UIImage(named: "moving-mountains-logo") != nil {
                    Image("moving-mountains-logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } else {
                    // Fallback to system icon
                    Image(systemName: "mountain.2.fill")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .foregroundColor(.blue)
                }
            }
            .frame(height: height)
            
            // Optional text label
            if showText {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Moving Mountains")
                        .font(.headline)
                        .foregroundColor(textColor)
                    
                    Text("Driver App")
                        .font(.subheadline)
                        .foregroundColor(textColor.opacity(0.8))
                }
            }
        }
    }
}

/**
 * LogoHeaderView component for the Driver App
 * Used in the navigation bar with specialized styling
 */
struct LogoHeaderView: View {
    var body: some View {
        LogoView(height: 30, showText: false)
    }
}

/**
 * Large logo for Login and Splash screens
 */
struct LargeLogoView: View {
    var showText: Bool = true
    
    var body: some View {
        VStack(spacing: 16) {
            // Logo image with system icon fallback
            Group {
                // Try UIImage to check if asset exists
                if UIImage(named: "AppLogo") != nil {
                    Image("AppLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } else if UIImage(named: "moving-mountains-logo") != nil {
                    Image("moving-mountains-logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } else {
                    // Fallback to system icon
                    Image(systemName: "mountain.2.fill")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .foregroundColor(.blue)
                }
            }
            .frame(width: 200)
            
            if showText {
                Text("Moving Mountains")
                    .font(.system(size: 24, weight: .bold))
                
                Text("Driver App")
                    .font(.system(size: 18))
                    .foregroundColor(.secondary)
            }
        }
        .padding()
    }
}

// Preview for SwiftUI Canvas
struct LogoView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 30) {
            // Standard logo with text
            LogoView()
                .padding()
                .previewDisplayName("Standard Logo")
            
            // Header logo (no text)
            LogoHeaderView()
                .padding()
                .previewDisplayName("Header Logo")
            
            // Large logo for login screens
            LargeLogoView()
                .padding()
                .previewDisplayName("Large Logo")
        }
        .previewLayout(.sizeThatFits)
    }
} 