import SwiftUI

// Rain effect
struct RainEffect: View {
    let raindrops = 100
    
    var body: some View {
        ZStack {
            ForEach(0..<raindrops, id: \.self) { i in
                RainDrop(size: .random(in: 2...6), speed: .random(in: 0.7...1.5))
                    .offset(x: .random(in: -UIScreen.main.bounds.width/2...UIScreen.main.bounds.width/2), 
                            y: .random(in: -100...UIScreen.main.bounds.height))
            }
        }
    }
}

struct RainDrop: View {
    let size: CGFloat
    let speed: Double
    
    @State private var isAnimating = false
    
    var body: some View {
        Circle()
            .fill(Color.white.opacity(0.2))
            .frame(width: size, height: size * 4)
            .offset(y: isAnimating ? UIScreen.main.bounds.height + 100 : -100)
            .animation(
                Animation.linear(duration: speed * 5)
                    .repeatForever(autoreverses: false)
                    .delay(.random(in: 0...3)),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
}

// Snow effect
struct SnowEffect: View {
    let snowflakes = 100
    
    var body: some View {
        ZStack {
            ForEach(0..<snowflakes, id: \.self) { i in
                Snowflake(size: .random(in: 3...8), speed: .random(in: 2...8))
                    .offset(x: .random(in: -UIScreen.main.bounds.width/2...UIScreen.main.bounds.width/2), 
                            y: .random(in: -100...UIScreen.main.bounds.height))
            }
        }
    }
}

struct Snowflake: View {
    let size: CGFloat
    let speed: Double
    
    @State private var isAnimating = false
    @State private var rotation = 0.0
    
    var body: some View {
        Image(systemName: "snowflake")
            .font(.system(size: size))
            .foregroundColor(.white.opacity(0.8))
            .rotationEffect(.degrees(rotation))
            .offset(y: isAnimating ? UIScreen.main.bounds.height + 100 : -100)
            .animation(
                Animation.linear(duration: speed)
                    .repeatForever(autoreverses: false)
                    .delay(.random(in: 0...3)),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
                withAnimation(Animation.linear(duration: 2).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
    }
}

// Lottie animation view for more complex animations
struct LottieView: UIViewRepresentable {
    let name: String
    let loopMode: LottieLoopMode
    
    func makeUIView(context: Context) -> some UIView {
        let view = UIView()
        // In a real implementation, this would use the Lottie library
        // For now, we'll just return a placeholder view
        view.backgroundColor = .clear
        return view
    }
    
    func updateUIView(_ uiView: UIViewType, context: Context) {
        // This would update the Lottie animation
    }
    
    enum LottieLoopMode {
        case loop
        case playOnce
        case autoReverse
    }
}

struct WeatherEffects_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                Text("Rain Effect")
                    .foregroundColor(.white)
                    .font(.headline)
                
                RainEffect()
                    .frame(height: 200)
                    .background(Color.blue.opacity(0.3))
                    .cornerRadius(20)
                
                Text("Snow Effect")
                    .foregroundColor(.white)
                    .font(.headline)
                
                SnowEffect()
                    .frame(height: 200)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(20)
            }
            .padding()
        }
    }
} 