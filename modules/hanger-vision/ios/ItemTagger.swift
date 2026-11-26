import Foundation

#if canImport(FoundationModels)
  import FoundationModels
#endif

/// Apple Intelligence (Foundation Models framework, iOS 26+).
/// All output uses guided generation (`@Generable`), never free text (CLAUDE.md).
enum ItemTagger {
  static let tagInstructions = """
    You tag clothing items for a personal wardrobe app.
    You get image classification labels and colour names of ONE clothing item photo.
    Describe only what the labels support. Never guess a brand or a size.
    The name is short (max 4 words), in English, e.g. "White linen shirt".
    """

  static let screenshotInstructions = """
    You read text recognised from a screenshot of an online shop product page.
    Extract the brand, the product name and the price of the main product.
    Use an empty string when a value is not present. Never invent values.
    """

  static func availability() -> String {
    #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
          return "available"
        case .unavailable(.deviceNotEligible):
          return "notSupported"
        case .unavailable(.appleIntelligenceNotEnabled):
          return "turnedOff"
        case .unavailable(.modelNotReady):
          return "notReady"
        case .unavailable:
          return "notSupported"
        }
      }
    #endif
    return "notSupported"
  }

  static func tag(labels: [String], colorNames: [String]) async throws -> [String: Any] {
    #if canImport(FoundationModels)
      if #available(iOS 26.0, *), availability() == "available" {
        let session = LanguageModelSession(instructions: tagInstructions)
        let prompt = """
          Labels: \(labels.joined(separator: ", "))
          Colours: \(colorNames.joined(separator: ", "))
          """
        let result = try await session.respond(to: prompt, generating: ItemSuggestion.self).content
        return [
          "category": result.category.rawValue,
          "name": result.name,
          "seasons": result.seasons.map(\.rawValue),
          "material": result.material,
        ]
      }
    #endif
    throw AIUnavailableException()
  }

  static func readScreenshot(lines: [String]) async throws -> [String: Any] {
    #if canImport(FoundationModels)
      if #available(iOS 26.0, *), availability() == "available" {
        let session = LanguageModelSession(instructions: screenshotInstructions)
        let text = lines.prefix(80).joined(separator: "\n")
        let result = try await session.respond(
          to: "Screenshot text:\n\(text)", generating: WishSuggestion.self
        ).content
        return [
          "brand": result.brand,
          "name": result.name,
          "price": result.price,
          "currency": result.currency,
          "category": result.category.rawValue,
        ]
      }
    #endif
    throw AIUnavailableException()
  }
}

#if canImport(FoundationModels)
  @available(iOS 26.0, *)
  @Generable
  enum CategoryValue: String {
    case top, bottom, dress, outerwear, shoes, bag, accessory
  }

  @available(iOS 26.0, *)
  @Generable
  enum SeasonValue: String {
    case spring, summer, autumn, winter
  }

  @available(iOS 26.0, *)
  @Generable
  struct ItemSuggestion {
    @Guide(description: "The clothing category")
    var category: CategoryValue

    @Guide(description: "Short English name, max 4 words, e.g. 'White linen shirt'")
    var name: String

    @Guide(description: "1 to 4 seasons when this item is typically worn")
    var seasons: [SeasonValue]

    @Guide(description: "Material if clearly supported by the labels, otherwise empty")
    var material: String
  }

  @available(iOS 26.0, *)
  @Generable
  struct WishSuggestion {
    @Guide(description: "Brand name, or empty")
    var brand: String

    @Guide(description: "Product name, max 6 words, or empty")
    var name: String

    @Guide(description: "Price as digits with a dot, e.g. '49.99', or empty")
    var price: String

    @Guide(description: "ISO 4217 currency code like EUR or USD, or empty")
    var currency: String

    @Guide(description: "Best matching clothing category")
    var category: CategoryValue
  }
#endif
