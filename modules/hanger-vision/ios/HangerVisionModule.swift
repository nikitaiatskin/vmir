import CoreImage
import ExpoModulesCore
import UIKit
import Vision

/// Thin bridge to Apple frameworks (CLAUDE.md: no business logic here).
/// Exposed to JavaScript as `requireNativeModule('HangerVision')`.
public class HangerVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HangerVision")

    /// "available" | "notSupported" | "turnedOff" | "notReady"
    AsyncFunction("aiAvailability") { () -> String in
      return ItemTagger.availability()
    }

    /// Removes the background with Vision subject lifting. Returns a file URI of a cropped PNG.
    AsyncFunction("cutout") { (uri: String) -> String in
      let image = try ImageLoader.load(uri)
      return try Cutout.run(image)
    }

    /// Returns up to `size * size` RGB samples from non-transparent pixels: [r, g, b, r, g, b, ...].
    /// Colour clustering happens in TypeScript (src/features/color.ts) so it can be unit tested.
    AsyncFunction("samplePixels") { (uri: String, size: Int) -> [Int] in
      let image = try ImageLoader.load(uri)
      return try PixelSampler.sample(image, size: max(8, min(size, 128)))
    }

    /// Vision image classification labels with confidence ≥ 0.1, best first.
    AsyncFunction("classify") { (uri: String) -> [String] in
      let image = try ImageLoader.load(uri)
      return try Classifier.labels(image)
    }

    /// Recognised text lines (Vision OCR, accurate), top to bottom.
    AsyncFunction("recognizeText") { (uri: String) -> [String] in
      let image = try ImageLoader.load(uri)
      return try TextReader.lines(image)
    }

    /// Apple Intelligence: structured item suggestion from Vision labels and colour names.
    AsyncFunction("tagItem") { (labels: [String], colorNames: [String]) async throws -> [String: Any] in
      return try await ItemTagger.tag(labels: labels, colorNames: colorNames)
    }

    /// Apple Intelligence: brand / name / price from OCR lines of a shop screenshot.
    AsyncFunction("readScreenshot") { (lines: [String]) async throws -> [String: Any] in
      return try await ItemTagger.readScreenshot(lines: lines)
    }
  }
}

// MARK: - Errors

final class ImageLoadException: Exception {
  override var reason: String { "Could not load the image" }
}

final class NoSubjectException: Exception {
  override var reason: String { "No subject found in the photo" }
}

final class AIUnavailableException: Exception {
  override var reason: String { "AI_UNAVAILABLE" }
}

// MARK: - Image loading

enum ImageLoader {
  struct Loaded {
    let cgImage: CGImage
    let orientation: CGImagePropertyOrientation
  }

  static func load(_ uri: String) throws -> Loaded {
    let path = URL(string: uri)?.path ?? uri
    guard let ui = UIImage(contentsOfFile: path), let cg = ui.cgImage else {
      throw ImageLoadException()
    }
    return Loaded(cgImage: cg, orientation: CGImagePropertyOrientation(ui.imageOrientation))
  }

  static func writePNG(_ image: CIImage) throws -> String {
    let context = CIContext()
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
      let data = context.pngRepresentation(of: image, format: .RGBA8, colorSpace: colorSpace)
    else { throw ImageLoadException() }
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("cutout-\(UUID().uuidString).png")
    try data.write(to: url)
    return url.absoluteString
  }
}

extension CGImagePropertyOrientation {
  init(_ o: UIImage.Orientation) {
    switch o {
    case .up: self = .up
    case .down: self = .down
    case .left: self = .left
    case .right: self = .right
    case .upMirrored: self = .upMirrored
    case .downMirrored: self = .downMirrored
    case .leftMirrored: self = .leftMirrored
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}

// MARK: - Background removal (iOS 17+)

enum Cutout {
  static func run(_ image: ImageLoader.Loaded) throws -> String {
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: image.cgImage, orientation: image.orientation)
    try handler.perform([request])
    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
      throw NoSubjectException()
    }
    let buffer = try observation.generateMaskedImage(
      ofInstances: observation.allInstances,
      from: handler,
      croppedToInstancesExtent: true
    )
    return try ImageLoader.writePNG(CIImage(cvPixelBuffer: buffer))
  }
}

// MARK: - Pixel sampling

enum PixelSampler {
  static func sample(_ image: ImageLoader.Loaded, size: Int) throws -> [Int] {
    let bytesPerRow = size * 4
    var pixels = [UInt8](repeating: 0, count: size * size * 4)
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else { throw ImageLoadException() }
    // The context must only use the buffer while the pointer is valid.
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let ctx = CGContext(
          data: buffer.baseAddress, width: size, height: size, bitsPerComponent: 8,
          bytesPerRow: bytesPerRow, space: colorSpace,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      ctx.interpolationQuality = .medium
      ctx.draw(image.cgImage, in: CGRect(x: 0, y: 0, width: size, height: size))
      return true
    }
    guard drawn else { throw ImageLoadException() }

    var out: [Int] = []
    out.reserveCapacity(size * size * 3)
    for i in stride(from: 0, to: pixels.count, by: 4) {
      let a = Int(pixels[i + 3])
      guard a >= 200 else { continue }  // skip transparent background
      // un-premultiply
      out.append(Int(pixels[i]) * 255 / a)
      out.append(Int(pixels[i + 1]) * 255 / a)
      out.append(Int(pixels[i + 2]) * 255 / a)
    }
    return out
  }
}

// MARK: - Classification and OCR

enum Classifier {
  static func labels(_ image: ImageLoader.Loaded) throws -> [String] {
    let request = VNClassifyImageRequest()
    let handler = VNImageRequestHandler(cgImage: image.cgImage, orientation: image.orientation)
    try handler.perform([request])
    return (request.results ?? [])
      .filter { $0.confidence >= 0.1 }
      .sorted { $0.confidence > $1.confidence }
      .prefix(12)
      .map { $0.identifier.replacingOccurrences(of: "_", with: " ") }
  }
}

enum TextReader {
  static func lines(_ image: ImageLoader.Loaded) throws -> [String] {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(cgImage: image.cgImage, orientation: image.orientation)
    try handler.perform([request])
    return (request.results ?? [])
      .sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
      .compactMap { $0.topCandidates(1).first?.string }
  }
}
