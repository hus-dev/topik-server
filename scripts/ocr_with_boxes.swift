import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count > 1 else {
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let fileURL = URL(fileURLWithPath: imagePath)

guard let image = NSImage(contentsOf: fileURL),
      let tiffData = image.tiffRepresentation,
      let ciImage = CIImage(data: tiffData) else {
    exit(1)
}

struct Item: Codable {
    let text: String
    let x: Double
    let y: Double
    let w: Double
    let h: Double
}

var items: [Item] = []

let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for observation in observations {
        if let topCandidate = observation.topCandidates(1).first {
            let box = observation.boundingBox
            // Vision y is from bottom (0) to top (1)
            items.append(Item(
                text: topCandidate.string,
                x: Double(box.origin.x),
                y: Double(1.0 - box.origin.y - box.size.height), // convert to top-down
                w: Double(box.size.width),
                h: Double(box.size.height)
            ))
        }
    }
}

request.recognitionLevel = .accurate
request.recognitionLanguages = ["ko-KR", "en-US"]
request.usesLanguageCorrection = false

let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
try? handler.perform([request])

let data = try JSONEncoder().encode(items)
if let str = String(data: data, encoding: .utf8) {
    print(str)
}
