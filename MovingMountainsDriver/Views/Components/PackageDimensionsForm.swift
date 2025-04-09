import SwiftUI

struct PackageDimensionsForm: View {
    @Binding var weight: String
    @Binding var length: String
    @Binding var width: String
    @Binding var height: String
    @Binding var dimensionUnit: String
    @Binding var description: String
    @State private var showingUnitPicker = false
    
    let units = ["cm", "in"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Package Dimensions")
                .font(.headline)
                .padding(.bottom, 4)
            
            // Weight input
            HStack {
                Text("Weight:")
                    .frame(width: 80, alignment: .leading)
                TextField("Enter weight", text: $weight)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                Text("kg")
            }
            
            // Length, width, height inputs with unit selector
            Group {
                HStack {
                    Text("Length:")
                        .frame(width: 80, alignment: .leading)
                    TextField("Enter length", text: $length)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Menu {
                        ForEach(units, id: \.self) { unit in
                            Button(unit) {
                                dimensionUnit = unit
                            }
                        }
                    } label: {
                        Text(dimensionUnit.isEmpty ? "cm" : dimensionUnit)
                            .frame(width: 40)
                            .padding(.horizontal, 8)
                            .background(Color.secondary.opacity(0.1))
                            .cornerRadius(5)
                    }
                }
                
                HStack {
                    Text("Width:")
                        .frame(width: 80, alignment: .leading)
                    TextField("Enter width", text: $width)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    Text(dimensionUnit.isEmpty ? "cm" : dimensionUnit)
                        .frame(width: 40)
                }
                
                HStack {
                    Text("Height:")
                        .frame(width: 80, alignment: .leading)
                    TextField("Enter height", text: $height)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    Text(dimensionUnit.isEmpty ? "cm" : dimensionUnit)
                        .frame(width: 40)
                }
            }
            
            // Package description
            VStack(alignment: .leading) {
                Text("Description:")
                    .padding(.bottom, 4)
                TextField("Package description (optional)", text: $description)
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(8)
                    .frame(height: 100)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct PackageDimensionsFormPreview: PreviewProvider {
    static var previews: some View {
        PackageDimensionsForm(
            weight: .constant(""),
            length: .constant(""),
            width: .constant(""),
            height: .constant(""),
            dimensionUnit: .constant("cm"),
            description: .constant("")
        )
        .padding()
        .previewLayout(.sizeThatFits)
    }
} 