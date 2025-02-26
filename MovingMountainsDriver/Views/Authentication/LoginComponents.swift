import SwiftUI

// MARK: - GlassCard
struct GlassCard<Content: View>: View {
    var content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 25)
                .fill(Color.white.opacity(0.15))
            
            RoundedRectangle(cornerRadius: 25)
                .stroke(Color.white.opacity(0.3), lineWidth: 1)
            
            content
                .padding()
        }
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
    }
}

// MARK: - AnimatedTextField
struct AnimatedTextField: View {
    var title: String
    var icon: String
    @Binding var text: String
    var isSecure: Bool = false
    @State private var isEditing = false
    @State private var showPassword = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(Color.white.opacity(0.7))
                .padding(.leading, 4)
            
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .foregroundColor(isEditing ? .white : .white.opacity(0.7))
                    .frame(width: 20)
                
                if isSecure && !showPassword {
                    SecureField("", text: $text)
                        .foregroundColor(.white)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .onTapGesture {
                            isEditing = true
                        }
                } else {
                    TextField("", text: $text)
                        .foregroundColor(.white)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .onTapGesture {
                            isEditing = true
                        }
                }
                
                if isSecure {
                    Button(action: {
                        showPassword.toggle()
                    }) {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 15)
                    .fill(Color.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 15)
                            .stroke(
                                isEditing ? Color.white.opacity(0.5) : Color.white.opacity(0.2),
                                lineWidth: 1
                            )
                    )
            )
            .animation(.easeInOut(duration: 0.2), value: isEditing)
        }
        .onAppear {
            isEditing = false
        }
    }
}

// MARK: - GradientButton
struct GradientButton: View {
    var title: String
    var action: () -> Void
    var isLoading: Bool
    
    var body: some View {
        Button(action: {
            if !isLoading {
                action()
            }
        }) {
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [Color("AccentColor"), Color("AccentColor").opacity(0.8)]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .clipShape(RoundedRectangle(cornerRadius: 15))
                .shadow(color: Color("AccentColor").opacity(0.5), radius: 5, x: 0, y: 3)
                
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                }
            }
            .frame(height: 56)
        }
        .disabled(isLoading)
    }
}

// MARK: - ShakeEffect
struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 10
    var shakesPerUnit = 3
    var animatableData: CGFloat
    
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX:
            amount * sin(animatableData * .pi * CGFloat(shakesPerUnit)),
            y: 0))
    }
}

// MARK: - FloatingCircle
struct FloatingCircle: View {
    var size: CGFloat
    var offset: CGPoint
    var color: Color
    var blurRadius: CGFloat
    
    @State private var isAnimating = false
    
    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .offset(x: offset.x, y: offset.y)
            .blur(radius: blurRadius)
            .offset(y: isAnimating ? -20 : 20)
            .animation(
                Animation.easeInOut(duration: Double.random(in: 4...6))
                    .repeatForever(autoreverses: true)
                    .delay(Double.random(in: 0...2)),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
} 