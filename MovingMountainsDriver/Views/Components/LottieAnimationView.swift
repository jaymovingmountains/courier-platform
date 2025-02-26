import SwiftUI

// This is a placeholder for a real Lottie implementation
// In a real app, you would use the lottie-ios package
struct LottieAnimationView: View {
    let name: String
    let loopMode: LoopMode
    
    @State private var isAnimating = false
    
    enum LoopMode {
        case loop
        case playOnce
        case autoReverse
    }
    
    var body: some View {
        ZStack {
            // Placeholder animation using SwiftUI
            Circle()
                .fill(Color("PrimaryColor").opacity(0.2))
                .frame(width: 120, height: 120)
            
            // Animated elements
            ZStack {
                // Pulsing circle
                Circle()
                    .stroke(Color("PrimaryColor"), lineWidth: 3)
                    .frame(width: isAnimating ? 100 : 80, height: isAnimating ? 100 : 80)
                    .opacity(isAnimating ? 0.2 : 0.8)
                    .animation(
                        Animation.easeInOut(duration: 1.5)
                            .repeatForever(autoreverses: false),
                        value: isAnimating
                    )
                
                // Rotating elements
                ForEach(0..<8) { i in
                    Rectangle()
                        .fill(Color("PrimaryColor"))
                        .frame(width: 8, height: 20)
                        .cornerRadius(4)
                        .offset(y: -40)
                        .rotationEffect(.degrees(Double(i) * 45 + (isAnimating ? 45 : 0)))
                        .opacity(0.7)
                }
                .rotationEffect(.degrees(isAnimating ? 360 : 0))
                .animation(
                    Animation.linear(duration: 2)
                        .repeatForever(autoreverses: false),
                    value: isAnimating
                )
                
                // Icon in the center
                if name == "truck-loading" {
                    Image(systemName: "truck.box.fill")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundColor(Color("PrimaryColor"))
                        .offset(x: isAnimating ? 5 : -5)
                        .animation(
                            Animation.easeInOut(duration: 0.5)
                                .repeatForever(autoreverses: true),
                            value: isAnimating
                        )
                } else {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundColor(Color("PrimaryColor"))
                        .rotationEffect(.degrees(isAnimating ? 360 : 0))
                        .animation(
                            Animation.linear(duration: 2)
                                .repeatForever(autoreverses: false),
                            value: isAnimating
                        )
                }
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

struct LottieAnimationView_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.opacity(0.2)
                .edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 30) {
                LottieAnimationView(name: "truck-loading", loopMode: .loop)
                
                LottieAnimationView(name: "loading", loopMode: .loop)
            }
        }
    }
} 