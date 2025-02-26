import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    
    @State private var isAnimating = false
    
    var body: some View {
        VStack(spacing: 20) {
            // Animated icon
            ZStack {
                // Background circles with pulsing animation
                Circle()
                    .fill(Color.white.opacity(0.05))
                    .frame(width: 100, height: 100)
                    .scaleEffect(isAnimating ? 1.2 : 1)
                    .animation(
                        Animation.easeInOut(duration: 2)
                            .repeatForever(autoreverses: true),
                        value: isAnimating
                    )
                
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 80, height: 80)
                    .scaleEffect(isAnimating ? 1.1 : 0.9)
                    .animation(
                        Animation.easeInOut(duration: 1.5)
                            .repeatForever(autoreverses: true)
                            .delay(0.5),
                        value: isAnimating
                    )
                
                // Icon with 3D rotation
                Image(systemName: icon)
                    .font(.system(size: 36))
                    .foregroundColor(Color.white.opacity(0.8))
                    .rotationEffect(.degrees(isAnimating ? 5 : -5))
                    .animation(
                        Animation.easeInOut(duration: 2)
                            .repeatForever(autoreverses: true),
                        value: isAnimating
                    )
            }
            .padding(.bottom, 10)
            
            // Title with fade in animation
            Text(title)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(Color.white)
                .opacity(isAnimating ? 1 : 0)
                .animation(.easeIn(duration: 0.5).delay(0.3), value: isAnimating)
            
            // Message with fade in animation
            Text(message)
                .font(.system(size: 16, weight: .medium, design: .rounded))
                .foregroundColor(Color.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
                .opacity(isAnimating ? 1 : 0)
                .animation(.easeIn(duration: 0.5).delay(0.5), value: isAnimating)
        }
        .padding(.vertical, 40)
        .padding(.horizontal, 20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
        .onAppear {
            withAnimation {
                isAnimating = true
            }
        }
    }
}

struct EmptyStateView_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            EmptyStateView(
                icon: "truck.fill",
                title: "No Active Job",
                message: "You don't have any active jobs. Accept a job from the available jobs below."
            )
            .padding()
        }
    }
} 