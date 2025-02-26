import SwiftUI

struct SettingsView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var isDarkMode = false
    @State private var notificationsEnabled = true
    @State private var locationTrackingEnabled = true
    @State private var useMetricSystem = false
    @State private var showLogoutConfirmation = false
    @State private var selectedLanguage = "English"
    @State private var cacheSize = "23.5 MB"
    
    let languages = ["English", "Spanish", "French", "Chinese"]
    
    var body: some View {
        NavigationView {
            List {
                // Profile section
                Section(header: Text("Profile")) {
                    if let user = authViewModel.currentUser {
                        HStack(spacing: 15) {
                            // Profile image
                            if let imageURL = user.profileImageURL {
                                AsyncImage(url: URL(string: imageURL)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Image(systemName: "person.crop.circle.fill")
                                        .resizable()
                                        .foregroundColor(.gray)
                                }
                                .frame(width: 60, height: 60)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.crop.circle.fill")
                                    .resizable()
                                    .frame(width: 60, height: 60)
                                    .foregroundColor(.gray)
                            }
                            
                            // User info
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.fullName)
                                    .font(.headline)
                                
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                
                                Text(user.role.rawValue.capitalized)
                                    .font(.caption)
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(4)
                            }
                        }
                        .padding(.vertical, 8)
                        
                        NavigationLink(destination: ProfileDetailView(user: user)) {
                            Text("Edit Profile")
                                .foregroundColor(.blue)
                        }
                    }
                }
                
                // App settings
                Section(header: Text("App Settings")) {
                    Toggle(isOn: $isDarkMode) {
                        Label {
                            Text("Dark Mode")
                        } icon: {
                            Image(systemName: "moon.fill")
                                .foregroundColor(.purple)
                        }
                    }
                    
                    Picker(selection: $selectedLanguage, label: Label {
                        Text("Language")
                    } icon: {
                        Image(systemName: "globe")
                            .foregroundColor(.blue)
                    }) {
                        ForEach(languages, id: \.self) { language in
                            Text(language).tag(language)
                        }
                    }
                    
                    Toggle(isOn: $notificationsEnabled) {
                        Label {
                            Text("Notifications")
                        } icon: {
                            Image(systemName: "bell.fill")
                                .foregroundColor(.red)
                        }
                    }
                    
                    Toggle(isOn: $locationTrackingEnabled) {
                        Label {
                            Text("Location Tracking")
                        } icon: {
                            Image(systemName: "location.fill")
                                .foregroundColor(.blue)
                        }
                    }
                    
                    Toggle(isOn: $useMetricSystem) {
                        Label {
                            Text("Use Metric System")
                        } icon: {
                            Image(systemName: "ruler")
                                .foregroundColor(.orange)
                        }
                    }
                }
                
                // App info
                Section(header: Text("App")) {
                    HStack {
                        Label {
                            Text("Version")
                        } icon: {
                            Image(systemName: "info.circle")
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                        
                        Text("1.0.0 (Build 42)")
                            .foregroundColor(.secondary)
                    }
                    
                    NavigationLink(destination: EmptyView()) {
                        Label {
                            Text("Legal & Privacy")
                        } icon: {
                            Image(systemName: "doc.text")
                                .foregroundColor(.gray)
                        }
                    }
                    
                    NavigationLink(destination: EmptyView()) {
                        Label {
                            Text("Help & Support")
                        } icon: {
                            Image(systemName: "questionmark.circle")
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Button(action: {
                        // Clear cache action
                    }) {
                        HStack {
                            Label {
                                Text("Clear Cache")
                            } icon: {
                                Image(systemName: "trash")
                                    .foregroundColor(.red)
                            }
                            
                            Spacer()
                            
                            Text(cacheSize)
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)
                }
                
                // Logout button
                Section {
                    Button(action: {
                        showLogoutConfirmation = true
                    }) {
                        HStack {
                            Spacer()
                            
                            Text("Log Out")
                                .foregroundColor(.red)
                                .fontWeight(.medium)
                            
                            Spacer()
                        }
                    }
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Settings")
            .alert(isPresented: $showLogoutConfirmation) {
                Alert(
                    title: Text("Log Out"),
                    message: Text("Are you sure you want to log out?"),
                    primaryButton: .destructive(Text("Log Out")) {
                        authViewModel.logout()
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }
}

struct ProfileDetailView: View {
    let user: User
    @State private var firstName: String
    @State private var lastName: String
    @State private var email: String
    @State private var phone: String
    
    init(user: User) {
        self.user = user
        _firstName = State(initialValue: user.firstName)
        _lastName = State(initialValue: user.lastName)
        _email = State(initialValue: user.email)
        _phone = State(initialValue: user.phone)
    }
    
    var body: some View {
        Form {
            Section(header: Text("Personal Information")) {
                TextField("First Name", text: $firstName)
                TextField("Last Name", text: $lastName)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
            }
            
            Section(header: Text("Driver Information")) {
                HStack {
                    Text("License Number")
                    Spacer()
                    Text(user.licenseNumber)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("License Expiry")
                    Spacer()
                    Text(user.licenseExpiryDate.formattedString())
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Hired Date")
                    Spacer()
                    Text(user.hireDate.formattedString())
                        .foregroundColor(.secondary)
                }
            }
            
            Section {
                Button(action: {
                    // Save profile changes
                }) {
                    Text("Save Changes")
                        .frame(maxWidth: .infinity)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .cornerRadius(10)
                .listRowInsets(EdgeInsets())
            }
        }
        .navigationTitle("Edit Profile")
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        let viewModel = AuthViewModel()
        // Sample user for preview
        viewModel.currentUser = User(
            id: "driver-123",
            firstName: "Jane",
            lastName: "Driver",
            email: "jane@example.com",
            phone: "5551234567",
            role: .driver,
            profileImageURL: nil,
            hireDate: Date().addingTimeInterval(-86400 * 365), // 1 year ago
            assignedVehicleId: "vehicle-1",
            licenseNumber: "DL12345678",
            licenseExpiryDate: Date().addingTimeInterval(86400 * 365) // 1 year from now
        )
        
        return SettingsView(authViewModel: viewModel)
    }
}