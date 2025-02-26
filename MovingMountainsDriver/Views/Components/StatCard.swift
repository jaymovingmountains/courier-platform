import SwiftUI

struct StatCard: View {
    let icon: String
    let title: String
    let value: String
    let trend: String
    let trendPositive: Bool
    let gradientColors: [Color]
    
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            // Background with glass effect
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient(
                    gradient: Gradient(colors: [
                        Color.white.opacity(0.1),
                        Color.white.opacity(0.05)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
            
            // Content
            VStack(alignment: .leading, spacing: 12) {
                // Icon with gradient background
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            gradient: Gradient(colors: gradientColors),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 40, height: 40)
                        .shadow(color: gradientColors[0].opacity(0.5), radius: 5, x: 0, y: 3)
                    
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                }
                
                // Title
                Text(title)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(Color("SecondaryText"))
                
                // Value with animation
                Text(value)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(Color("PrimaryText"))
                    .scaleEffect(isAnimating ? 1 : 0.8)
                    .opacity(isAnimating ? 1 : 0)
                    .animation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.1), value: isAnimating)
                
                // Trend indicator
                HStack(spacing: 4) {
                    Image(systemName: trendPositive ? "arrow.up" : "arrow.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(trendPositive ? Color("GreenText") : Color("OrangeText"))
                    
                    Text(trend)
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundColor(trendPositive ? Color("GreenText") : Color("OrangeText"))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(trendPositive ? Color("GreenBackground").opacity(0.3) : Color("OrangeBackground").opacity(0.3))
                )
                .opacity(isAnimating ? 1 : 0)
                .offset(y: isAnimating ? 0 : 10)
                .animation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.2), value: isAnimating)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onAppear {
            withAnimation {
                isAnimating = true
            }
        }
    }
}

struct StatCard_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                StatCard(
                    icon: "shippingbox.fill",
                    title: "Deliveries",
                    value: "24",
                    trend: "+6% this week",
                    trendPositive: true,
                    gradientColors: [Color("OrangeGradientStart"), Color("OrangeGradientEnd")]
                )
                
                StatCard(
                    icon: "dollarsign.circle.fill",
                    title: "Earnings",
                    value: "$840",
                    trend: "+12% this week",
                    trendPositive: true,
                    gradientColors: [Color("GreenGradientStart"), Color("GreenGradientEnd")]
                )
                
                StatCard(
                    icon: "star.fill",
                    title: "Rating",
                    value: "4.8",
                    trend: "-0.2 this month",
                    trendPositive: false,
                    gradientColors: [Color("BlueText"), Color("PurpleText")]
                )
            }
            .padding()
        }
    }
} 