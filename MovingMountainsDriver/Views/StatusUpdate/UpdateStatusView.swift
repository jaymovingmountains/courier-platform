import SwiftUI
import PhotosUI

struct UpdateStatusView: View {
    @StateObject var viewModel = UpdateStatusViewModel()
    @Environment(\.presentationMode) var presentationMode
    @State private var showImagePicker = false
    @State private var showCamera = false
    @State private var statusSelection: Job.JobStatus = .inProgress
    @State private var showingStatusConfirmation = false
    
    let jobId: String
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                        .foregroundColor(.blue)
                    }
                    
                    Spacer()
                    
                    Text("Update Status")
                        .font(.headline)
                    
                    Spacer()
                }
                .padding(.bottom, 8)
                
                // Status selection
                VStack(alignment: .leading, spacing: 8) {
                    Text("Job Status")
                        .font(.headline)
                    
                    Picker("Status", selection: $statusSelection) {
                        Text("Pending").tag(Job.JobStatus.pending)
                        Text("In Progress").tag(Job.JobStatus.inProgress)
                        Text("Completed").tag(Job.JobStatus.completed)
                        Text("Cancelled").tag(Job.JobStatus.cancelled)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                // Location info (automatic)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Location")
                        .font(.headline)
                    
                    HStack {
                        Image(systemName: "location.fill")
                            .foregroundColor(.blue)
                        
                        if let location = viewModel.currentLocation {
                            Text("Current location will be shared")
                                .foregroundColor(.secondary)
                        } else {
                            Text("Waiting for location...")
                                .foregroundColor(.orange)
                        }
                        
                        Spacer()
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                
                // Photo upload section
                VStack(alignment: .leading, spacing: 8) {
                    Text("Photos")
                        .font(.headline)
                    
                    if viewModel.photoURLs.isEmpty {
                        HStack {
                            Spacer()
                            
                            VStack(spacing: 12) {
                                Image(systemName: "photo.on.rectangle.angled")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                                
                                Text("Add photos to document the job")
                                    .font(.body)
                                    .multilineTextAlignment(.center)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            
                            Spacer()
                        }
                    } else {
                        // Photo grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(viewModel.photoURLs, id: \.absoluteString) { url in
                                photoThumbnail(url)
                            }
                        }
                    }
                    
                    // Add photo buttons
                    HStack {
                        Button(action: {
                            showCamera = true
                        }) {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Take Photo")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray6))
                            .foregroundColor(.blue)
                            .cornerRadius(10)
                        }
                        
                        Button(action: {
                            showImagePicker = true
                        }) {
                            HStack {
                                Image(systemName: "photo.fill")
                                Text("Choose Photo")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray6))
                            .foregroundColor(.blue)
                            .cornerRadius(10)
                        }
                    }
                }
                
                // Notes
                VStack(alignment: .leading, spacing: 8) {
                    Text("Notes")
                        .font(.headline)
                    
                    TextEditor(text: $viewModel.statusUpdateNote)
                        .frame(minHeight: 100)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )
                }
                
                // Submit button
                PrimaryButton(
                    title: "Update Job Status",
                    action: {
                        showingStatusConfirmation = true
                    },
                    isLoading: viewModel.isLoading,
                    isDisabled: viewModel.currentLocation == nil
                )
                .padding(.top, 16)
                
                if let error = viewModel.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.top, 8)
                }
            }
            .padding()
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.locationService.requestLocationPermission()
            viewModel.locationService.startUpdatingLocation()
        }
        .alert(isPresented: $showingStatusConfirmation) {
            Alert(
                title: Text("Confirm Status Update"),
                message: Text("Are you sure you want to update the job status to '\(statusTitle(statusSelection))'?"),
                primaryButton: .default(Text("Update")) {
                    viewModel.updateJobStatus(jobId: jobId, status: statusSelection)
                },
                secondaryButton: .cancel()
            )
        }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(completion: handleSelectedImage)
        }
        .sheet(isPresented: $showCamera) {
            CameraView(onImageCapture: handleCapturedImage)
        }
    }
    
    private func photoThumbnail(_ url: URL) -> some View {
        ZStack(alignment: .topTrailing) {
            AsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .foregroundColor(.gray.opacity(0.2))
                    .overlay(
                        ProgressView()
                    )
            }
            .frame(width: 100, height: 100)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            Button(action: {
                if let index = viewModel.photoURLs.firstIndex(of: url) {
                    viewModel.removePhoto(at: index)
                }
            }) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.white)
                    .background(Color.black.opacity(0.6))
                    .clipShape(Circle())
            }
            .padding(5)
        }
    }
    
    private func handleSelectedImage(_ image: UIImage?) {
        guard let image = image else { return }
        // In a real app, we would upload the image to a server and get a URL
        // For this demo, we'll save locally and create a local URL
        if let url = saveImageLocally(image, withName: "status_update_\(Date().timeIntervalSince1970)") {
            viewModel.addPhoto(url: url)
        }
    }
    
    private func handleCapturedImage(_ image: UIImage?) {
        handleSelectedImage(image)
    }
    
    private func saveImageLocally(_ image: UIImage, withName name: String) -> URL? {
        guard let data = image.jpegData(compressionQuality: 0.7) else { return nil }
        let directory = FileManager.default.temporaryDirectory
        let url = directory.appendingPathComponent("\(name).jpg")
        do {
            try data.write(to: url)
            return url
        } catch {
            print("Error saving image: \(error)")
            return nil
        }
    }
    
    private func statusTitle(_ status: Job.JobStatus) -> String {
        switch status {
        case .pending:
            return "Pending"
        case .inProgress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .cancelled:
            return "Cancelled"
        }
    }
}

// Image Picker from Photo Library
struct ImagePicker: UIViewControllerRepresentable {
    var completion: (UIImage?) -> Void
    
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var configuration = PHPickerConfiguration()
        configuration.selectionLimit = 1
        configuration.filter = .images
        
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        private let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            
            guard let provider = results.first?.itemProvider,
                  provider.canLoadObject(ofClass: UIImage.self) else {
                parent.completion(nil)
                return
            }
            
            provider.loadObject(ofClass: UIImage.self) { image, error in
                DispatchQueue.main.async {
                    self.parent.completion(image as? UIImage)
                }
            }
        }
    }
}

// Camera View for taking photos
struct CameraView: UIViewControllerRepresentable {
    var onImageCapture: (UIImage?) -> Void
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView
        
        init(_ parent: CameraView) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            let image = info[.originalImage] as? UIImage
            parent.onImageCapture(image)
            picker.dismiss(animated: true)
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.onImageCapture(nil)
            picker.dismiss(animated: true)
        }
    }
}

struct UpdateStatusView_Previews: PreviewProvider {
    static var previews: some View {
        UpdateStatusView(jobId: "1")
    }
} 