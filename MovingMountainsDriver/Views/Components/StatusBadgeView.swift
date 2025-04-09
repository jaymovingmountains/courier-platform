import SwiftUI

struct StatusBadgeView: View {
    let status: String
    
    var body: some View {
        Text(status.replacingOccurrences(of: "_", with: " ").capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(backgroundColor)
            .foregroundColor(.white)
            .cornerRadius(8)
    }
    
    private var backgroundColor: Color {
        switch status.lowercased() {
        case "pending":
            return .orange
        case "picked_up", "pickup_started", "pickup_complete":
            return .blue
        case "in_transit", "in_progress", "out_for_delivery":
            return .purple
        case "delivered", "complete", "completed":
            return .green
        case "cancelled", "canceled", "failed":
            return .red
        default:
            return .gray
        }
    }
}

// For backward compatibility, alias StatusBadge to StatusBadgeView
typealias StatusBadge = StatusBadgeView 