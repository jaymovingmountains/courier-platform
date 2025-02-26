import SwiftUI

struct FloatingActionButton: View {
    let items: [FABItem]
    
    @State private var isExpanded = false
    @State private var animationAmount = 0.0
    
    var body: some View {
        ZStack {
            // Backdrop when expanded
            if isExpanded {
                Color.black.opacity(0.4)
                    .edgesIgnoringSafeArea(.all)
                    .onTapGesture {
                        withAnimation(.spring()) {
                            isExpanded = false
                        }
                    }
                    .transition(.opacity)
            }
            
            VStack {
                Spacer()
                
                // Action items
                if isExpanded {
                    ForEach(0..<items.count, id: \.self) { index in
                        Button(action: {
                            withAnimation(.spring()) {
                                isExpanded = false
                            }
                            items[index].action()
                        }) {
                            Circle()
                                .fill(items[index].color)
                                .frame(width: 48, height: 48)
                                .shadow(color: items[index].color.opacity(0.3), radius: 10, x: 0, y: 5)
                                .overlay(
                                    Image(systemName: items[index].icon)
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(.white)
                                )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        .transition(.scale(scale: 0, anchor: .bottom).combined(with: .opacity))
                        .offset(y: isExpanded ? 0 : 20)
                        .opacity(isExpanded ? 1 : 0)
                        .animation(
                            .spring(response: 0.3, dampingFraction: 0.7)
                                .delay(Double(items.count - index) * 0.05),
                            value: isExpanded
                        )
                        .padding(.bottom, 16)
                    }
                }
                
                // Main button
                Button(action: {
                    withAnimation(.spring()) {
                        isExpanded.toggle()
                        animationAmount += 1
                    }
                }) {
                    ZStack {
                        Circle()
                            .fill(LinearGradient(
                                gradient: Gradient(colors: [
                                    Color("PrimaryColor"),
                                    Color("PrimaryColor").opacity(0.8)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .frame(width: 60, height: 60)
                            .shadow(color: Color("PrimaryColor").opacity(0.3), radius: 10, x: 0, y: 5)
                        
                        Image(systemName: isExpanded ? "xmark" : "plus")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                            .rotationEffect(.degrees(isExpanded ? 90 : 0))
                            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isExpanded)
                    }
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 2)
                            .scaleEffect(animationAmount)
                            .opacity(2 - animationAmount)
                            .animation(
                                .easeOut(duration: 1)
                                    .repeatCount(1, autoreverses: false),
                                value: animationAmount
                            )
                    )
                }
                .buttonStyle(ScaleButtonStyle())
            }
        }
    }
}

struct FloatingActionButton_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.gray.opacity(0.3).edgesIgnoringSafeArea(.all)
            
            FloatingActionButton(items: [
                FABItem(icon: "bell.fill", color: Color.orange, action: {}),
                FABItem(icon: "arrow.clockwise", color: Color.green, action: {}),
                FABItem(icon: "map.fill", color: Color.blue, action: {})
            ])
            .padding(.trailing, 20)
            .padding(.bottom, 20)
        }
    }
} 