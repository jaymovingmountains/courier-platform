import SwiftUI

struct DashboardHeaderView: View {
    @Binding var searchText: String
    var onMenuTap: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            // Top bar with logo and menu button
            HStack {
                // Logo
                LogoView(height: 32)
                
                Spacer()
                
                // Menu button
                Button(action: onMenuTap) {
                    Image(systemName: "line.horizontal.3")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.primary)
                        .padding(10)
                        .background(
                            Circle()
                                .fill(Color.white)
                                .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                        )
                }
            }
            .padding(.horizontal)
            
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search jobs...", text: $searchText)
                    .font(.system(size: 16))
                
                if !searchText.isEmpty {
                    Button(action: {
                        self.searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white)
                    .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
            )
            .padding(.horizontal)
        }
        .padding(.top, 10)
    }
}

// Preview
struct DashboardHeaderView_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            DashboardHeaderView(
                searchText: .constant(""),
                onMenuTap: {}
            )
            
            Spacer()
        }
        .background(Color.gray.opacity(0.1))
    }
} 